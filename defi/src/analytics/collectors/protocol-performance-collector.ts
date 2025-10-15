/**
 * Protocol Performance Collector
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 2 - Data Collection Pipeline
 * 
 * This collector aggregates protocol performance metrics from existing data sources:
 * - TVL data from protocol_tvl table
 * - User data from dailyUsers table
 * - Calculates derived metrics (APY, user growth, etc.)
 * - Stores in protocol_performance_metrics table
 */

import { query, upsert } from '../db/connection';
import {
  ProtocolPerformanceMetrics,
  TVLData,
  TVLQueryResult,
  UserData,
  UserQueryResult,
  AggregatedProtocolData,
  CollectorResult,
  CollectorOptions,
  CollectorError,
} from './types';
import {
  getDaysAgo,
  getStartOfDay,
  calculateAPY,
  calculateSum,
  aggregateByKey,
  sanitizeNumeric,
  formatDuration,
} from './utils';

/**
 * Protocol Performance Collector Class
 */
export class ProtocolPerformanceCollector {
  private startTime: number = 0;
  
  /**
   * Collect metrics for all protocols or specific protocols
   */
  async collect(options: CollectorOptions = {}): Promise<CollectorResult[]> {
    this.startTime = Date.now();
    
    console.log('Starting protocol performance collection...');
    console.log('Options:', options);
    
    try {
      // Get list of protocols to collect
      const protocolIds = await this.getProtocolIds(options.protocol_ids);
      
      console.log(`Collecting metrics for ${protocolIds.length} protocols`);
      
      // Collect metrics for each protocol
      const results: CollectorResult[] = [];
      
      for (const protocolId of protocolIds) {
        try {
          const result = await this.collectForProtocol(protocolId, options);
          results.push(result);
        } catch (error) {
          console.error(`Error collecting metrics for ${protocolId}:`, error);
          results.push({
            success: false,
            protocol_id: protocolId,
            timestamp: new Date(),
            metrics_collected: [],
            errors: [error instanceof Error ? error.message : String(error)],
            duration_ms: Date.now() - this.startTime,
          });
        }
      }
      
      const duration = Date.now() - this.startTime;
      console.log(`Collection complete in ${formatDuration(duration)}`);
      console.log(`Success: ${results.filter(r => r.success).length}/${results.length}`);
      
      return results;
    } catch (error) {
      console.error('Fatal error during collection:', error);
      throw error;
    }
  }
  
  /**
   * Collect metrics for a single protocol
   */
  private async collectForProtocol(
    protocolId: string,
    options: CollectorOptions
  ): Promise<CollectorResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const metricsCollected: string[] = [];
    const errors: string[] = [];
    
    try {
      console.log(`Collecting metrics for ${protocolId}...`);
      
      // Check if data already exists (if skip_existing is true)
      if (options.skip_existing) {
        const exists = await this.checkDataExists(protocolId, timestamp);
        if (exists) {
          console.log(`Data already exists for ${protocolId}, skipping`);
          return {
            success: true,
            protocol_id: protocolId,
            timestamp,
            metrics_collected: ['skipped'],
            duration_ms: Date.now() - startTime,
          };
        }
      }
      
      // Collect TVL metrics
      let tvlData: AggregatedProtocolData | null = null;
      try {
        tvlData = await this.collectTVLMetrics(protocolId);
        metricsCollected.push('tvl');
      } catch (error) {
        errors.push(`TVL collection failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Collect user metrics
      let userData: Partial<ProtocolPerformanceMetrics> | null = null;
      try {
        userData = await this.collectUserMetrics(protocolId);
        metricsCollected.push('users');
      } catch (error) {
        errors.push(`User collection failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Aggregate all metrics
      const metrics = this.aggregateMetrics(protocolId, timestamp, tvlData, userData);
      
      // Store metrics in database
      await this.storeMetrics(metrics);
      metricsCollected.push('stored');
      
      const duration = Date.now() - startTime;
      console.log(`✓ ${protocolId} collected in ${formatDuration(duration)}`);
      
      return {
        success: true,
        protocol_id: protocolId,
        timestamp,
        metrics_collected: metricsCollected,
        errors: errors.length > 0 ? errors : undefined,
        duration_ms: duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`✗ ${protocolId} failed in ${formatDuration(duration)}:`, error);
      
      throw new CollectorError(
        `Failed to collect metrics for ${protocolId}`,
        protocolId,
        'tvl',
        error as Error
      );
    }
  }
  
  /**
   * Get list of protocol IDs to collect
   */
  private async getProtocolIds(specificIds?: string[]): Promise<string[]> {
    if (specificIds && specificIds.length > 0) {
      return specificIds;
    }
    
    // Query all protocols from protocols table
    const result = await query<{ id: string }>(`
      SELECT DISTINCT id FROM protocols
      ORDER BY id
      LIMIT 100
    `);
    
    return result.rows.map(row => row.id);
  }
  
  /**
   * Check if data already exists for protocol and timestamp
   */
  private async checkDataExists(protocolId: string, timestamp: Date): Promise<boolean> {
    const startOfDay = getStartOfDay(timestamp);
    
    const result = await query<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM protocol_performance_metrics
      WHERE protocol_id = $1
        AND timestamp >= $2
        AND timestamp < $2 + INTERVAL '1 day'
    `, [protocolId, startOfDay]);
    
    return parseInt(result.rows[0]?.count || '0', 10) > 0;
  }
  
  /**
   * Collect TVL metrics for a protocol
   */
  private async collectTVLMetrics(protocolId: string): Promise<AggregatedProtocolData> {
    // Query latest TVL data for protocol
    const result = await query<TVLQueryResult>(`
      SELECT 
        protocol_id,
        chain,
        tvl,
        tvl_prev_day,
        tvl_prev_week,
        tvl_prev_month,
        change_1d,
        change_7d,
        change_30d,
        timestamp
      FROM protocol_tvl
      WHERE protocol_id = $1
      ORDER BY timestamp DESC
      LIMIT 100
    `, [protocolId]);
    
    if (result.rows.length === 0) {
      throw new Error(`No TVL data found for protocol ${protocolId}`);
    }
    
    // Convert query results to TVLData
    const tvlData: TVLData[] = result.rows.map(row => ({
      protocol_id: row.protocol_id,
      chain: row.chain,
      tvl: sanitizeNumeric(row.tvl) || 0,
      tvl_prev_day: sanitizeNumeric(row.tvl_prev_day),
      tvl_prev_week: sanitizeNumeric(row.tvl_prev_week),
      tvl_prev_month: sanitizeNumeric(row.tvl_prev_month),
      change_1d: sanitizeNumeric(row.change_1d),
      change_7d: sanitizeNumeric(row.change_7d),
      change_30d: sanitizeNumeric(row.change_30d),
      timestamp: row.timestamp,
    }));
    
    // Aggregate TVL by chain
    const tvlByChain = aggregateByKey(
      tvlData,
      (item) => item.chain,
      (item) => item.tvl
    );
    
    // Calculate total TVL
    const totalTVL = calculateSum(tvlData.map(d => d.tvl));
    
    // Get latest TVL changes
    const latestData = tvlData[0];
    
    return {
      protocol_id: protocolId,
      timestamp: new Date(),
      total_tvl: totalTVL,
      tvl_by_chain: tvlByChain,
      tvl_change_1d: latestData.change_1d || undefined,
      tvl_change_7d: latestData.change_7d || undefined,
      tvl_change_30d: latestData.change_30d || undefined,
      total_users: 0, // Will be filled by user metrics
      users_by_chain: {},
    };
  }
  
  /**
   * Collect user metrics for a protocol
   */
  private async collectUserMetrics(protocolId: string): Promise<Partial<ProtocolPerformanceMetrics>> {
    // Query user data for last 30 days
    const thirtyDaysAgo = getDaysAgo(30);
    
    const result = await query<UserQueryResult>(`
      SELECT 
        protocolid,
        chain,
        users,
        start,
        endtime
      FROM dailyusers
      WHERE protocolid = $1
        AND start >= $2
      ORDER BY start DESC
    `, [protocolId, Math.floor(thirtyDaysAgo.getTime() / 1000)]);
    
    if (result.rows.length === 0) {
      // No user data available, return empty metrics
      return {};
    }
    
    // Convert query results to UserData
    const userData: UserData[] = result.rows.map(row => ({
      protocol_id: row.protocolid,
      chain: row.chain,
      users: row.users,
      start: row.start,
      end_time: row.endtime,
    }));
    
    // Calculate DAU (last day)
    const oneDayAgo = getDaysAgo(1);
    const dauData = userData.filter(d => d.start >= Math.floor(oneDayAgo.getTime() / 1000));
    const dau = calculateSum(dauData.map(d => d.users));
    
    // Calculate WAU (last 7 days)
    const sevenDaysAgo = getDaysAgo(7);
    const wauData = userData.filter(d => d.start >= Math.floor(sevenDaysAgo.getTime() / 1000));
    const wau = calculateSum(wauData.map(d => d.users));
    
    // Calculate MAU (last 30 days)
    const mau = calculateSum(userData.map(d => d.users));
    
    return {
      dau: dau > 0 ? dau : undefined,
      wau: wau > 0 ? wau : undefined,
      mau: mau > 0 ? mau : undefined,
    };
  }
  
  /**
   * Aggregate all metrics into final structure
   */
  private aggregateMetrics(
    protocolId: string,
    timestamp: Date,
    tvlData: AggregatedProtocolData | null,
    userData: Partial<ProtocolPerformanceMetrics> | null
  ): ProtocolPerformanceMetrics {
    const metrics: ProtocolPerformanceMetrics = {
      protocol_id: protocolId,
      timestamp,
    };
    
    // Add TVL-derived metrics
    if (tvlData) {
      // Calculate APY from TVL changes
      if (tvlData.tvl_change_7d !== undefined) {
        const apyResult = calculateAPY(tvlData.total_tvl, tvlData.total_tvl * (1 - tvlData.tvl_change_7d / 100), 7);
        if (apyResult.value !== null) {
          metrics.apy_7d = apyResult.value;
        }
      }
      
      if (tvlData.tvl_change_30d !== undefined) {
        const apyResult = calculateAPY(tvlData.total_tvl, tvlData.total_tvl * (1 - tvlData.tvl_change_30d / 100), 30);
        if (apyResult.value !== null) {
          metrics.apy_30d = apyResult.value;
        }
      }
    }
    
    // Add user metrics
    if (userData) {
      Object.assign(metrics, userData);
    }
    
    return metrics;
  }
  
  /**
   * Store metrics in database
   */
  private async storeMetrics(metrics: ProtocolPerformanceMetrics): Promise<void> {
    await upsert(
      'protocol_performance_metrics',
      metrics,
      ['protocol_id', 'timestamp']
    );
  }
}

/**
 * Create and export collector instance
 */
export const protocolPerformanceCollector = new ProtocolPerformanceCollector();

