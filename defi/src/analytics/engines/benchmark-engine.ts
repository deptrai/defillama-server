/**
 * Benchmark Engine
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 3 - Analytics Engine
 * 
 * Performs competitive benchmarking and market share analysis
 */

import { query } from '../db/connection';
import {
  ProtocolMetrics,
  BenchmarkResult,
  MarketShareAnalysis,
  CompetitiveAnalysis,
  RankedMetric,
  CalculationResult,
} from './types';

/**
 * Benchmark Engine
 * Calculates protocol rankings, market share, and competitive analysis
 */
export class BenchmarkEngine {
  /**
   * Get protocol metrics for benchmarking
   * Note: Aggregates TVL across all chains for each protocol
   */
  async getProtocolMetrics(
    protocolIds: string[],
    date: Date = new Date()
  ): Promise<ProtocolMetrics[]> {
    // First, get latest timestamp for each protocol
    const latestTvl = await query<{
      protocol_id: string;
      tvl: number;
      dau: number;
      daily_revenue: number;
      apy_7d: number;
    }>(
      `WITH latest_tvl AS (
         SELECT
           protocol_id,
           MAX(timestamp) as latest_timestamp
         FROM protocol_tvl
         WHERE protocol_id = ANY($1)
           AND timestamp <= $2
         GROUP BY protocol_id
       )
       SELECT
         p.protocol_id,
         SUM(p.tvl) as tvl,
         m.dau as users,
         m.daily_revenue as revenue,
         m.apy_7d as apy
       FROM protocol_tvl p
       INNER JOIN latest_tvl lt
         ON p.protocol_id = lt.protocol_id
         AND p.timestamp = lt.latest_timestamp
       LEFT JOIN protocol_performance_metrics m
         ON p.protocol_id = m.protocol_id
         AND m.timestamp = (
           SELECT MAX(timestamp)
           FROM protocol_performance_metrics
           WHERE protocol_id = p.protocol_id
         )
       GROUP BY p.protocol_id, m.dau, m.daily_revenue, m.apy_7d`,
      [protocolIds, date]
    );

    return latestTvl.map(m => ({
      protocolId: m.protocol_id,
      protocolName: m.protocol_id, // TODO: Get actual protocol name from metadata
      tvl: m.tvl || 0,
      volume24h: 0, // TODO: Add volume data from dimension adapters
      users: m.users || 0,
      revenue: m.revenue || 0,
      apy: m.apy || 0,
    }));
  }

  /**
   * Rank protocols by a specific metric
   */
  rankByMetric(
    protocols: ProtocolMetrics[],
    metric: keyof Pick<ProtocolMetrics, 'tvl' | 'volume24h' | 'users' | 'revenue' | 'apy'>
  ): Array<{ protocolId: string; value: number; rank: number }> {
    // Sort by metric (descending)
    const sorted = [...protocols].sort((a, b) => b[metric] - a[metric]);

    // Assign ranks
    return sorted.map((protocol, index) => ({
      protocolId: protocol.protocolId,
      value: protocol[metric],
      rank: index + 1,
    }));
  }

  /**
   * Calculate ranked metric with change and percentile
   */
  calculateRankedMetric(
    currentValue: number,
    rank: number,
    totalProtocols: number,
    previousValue?: number
  ): RankedMetric {
    const change = previousValue && previousValue > 0
      ? ((currentValue - previousValue) / previousValue) * 100
      : 0;

    const percentile = totalProtocols > 0
      ? ((totalProtocols - rank + 1) / totalProtocols) * 100
      : 0;

    return {
      value: currentValue,
      rank,
      change,
      percentile,
    };
  }

  /**
   * Calculate overall score for a protocol
   */
  calculateOverallScore(metrics: {
    tvl: RankedMetric;
    volume: RankedMetric;
    users: RankedMetric;
    revenue: RankedMetric;
    apy: RankedMetric;
  }): number {
    // Weighted average of percentiles
    const weights = {
      tvl: 0.30,
      volume: 0.20,
      users: 0.20,
      revenue: 0.20,
      apy: 0.10,
    };

    return (
      metrics.tvl.percentile * weights.tvl +
      metrics.volume.percentile * weights.volume +
      metrics.users.percentile * weights.users +
      metrics.revenue.percentile * weights.revenue +
      metrics.apy.percentile * weights.apy
    );
  }

  /**
   * Benchmark protocols
   */
  async benchmarkProtocols(
    protocolIds: string[],
    category: string = 'DeFi'
  ): Promise<CalculationResult<BenchmarkResult[]>> {
    const startTime = Date.now();

    try {
      // Get current metrics
      const currentMetrics = await this.getProtocolMetrics(protocolIds);

      if (currentMetrics.length === 0) {
        throw new Error('No protocol metrics available');
      }

      // Get previous metrics (7 days ago) for change calculation
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const previousMetrics = await this.getProtocolMetrics(protocolIds, sevenDaysAgo);
      const previousMetricsMap = new Map(previousMetrics.map(m => [m.protocolId, m]));

      // Rank protocols by each metric
      const tvlRankings = this.rankByMetric(currentMetrics, 'tvl');
      const volumeRankings = this.rankByMetric(currentMetrics, 'volume24h');
      const userRankings = this.rankByMetric(currentMetrics, 'users');
      const revenueRankings = this.rankByMetric(currentMetrics, 'revenue');
      const apyRankings = this.rankByMetric(currentMetrics, 'apy');

      // Build benchmark results
      const results: BenchmarkResult[] = currentMetrics.map(protocol => {
        const previous = previousMetricsMap.get(protocol.protocolId);
        const totalProtocols = currentMetrics.length;

        const tvlRank = tvlRankings.find(r => r.protocolId === protocol.protocolId)!;
        const volumeRank = volumeRankings.find(r => r.protocolId === protocol.protocolId)!;
        const userRank = userRankings.find(r => r.protocolId === protocol.protocolId)!;
        const revenueRank = revenueRankings.find(r => r.protocolId === protocol.protocolId)!;
        const apyRank = apyRankings.find(r => r.protocolId === protocol.protocolId)!;

        const metrics = {
          tvl: this.calculateRankedMetric(protocol.tvl, tvlRank.rank, totalProtocols, previous?.tvl),
          volume: this.calculateRankedMetric(protocol.volume24h, volumeRank.rank, totalProtocols, previous?.volume24h),
          users: this.calculateRankedMetric(protocol.users, userRank.rank, totalProtocols, previous?.users),
          revenue: this.calculateRankedMetric(protocol.revenue, revenueRank.rank, totalProtocols, previous?.revenue),
          apy: this.calculateRankedMetric(protocol.apy, apyRank.rank, totalProtocols, previous?.apy),
        };

        return {
          protocolId: protocol.protocolId,
          protocolName: protocol.protocolName,
          metrics,
          overallScore: this.calculateOverallScore(metrics),
          category,
        };
      });

      return {
        success: true,
        data: results,
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BENCHMARK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        },
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Calculate market share analysis
   */
  async calculateMarketShare(protocolIds: string[]): Promise<CalculationResult<MarketShareAnalysis>> {
    const startTime = Date.now();

    try {
      const metrics = await this.getProtocolMetrics(protocolIds);

      if (metrics.length === 0) {
        throw new Error('No protocol metrics available');
      }

      // Calculate total market
      const totalMarket = {
        tvl: metrics.reduce((sum, m) => sum + m.tvl, 0),
        volume: metrics.reduce((sum, m) => sum + m.volume24h, 0),
        users: metrics.reduce((sum, m) => sum + m.users, 0),
        revenue: metrics.reduce((sum, m) => sum + m.revenue, 0),
      };

      // Calculate market share for each protocol
      const protocols = metrics.map(m => ({
        protocolId: m.protocolId,
        protocolName: m.protocolName,
        marketShare: {
          tvl: totalMarket.tvl > 0 ? (m.tvl / totalMarket.tvl) * 100 : 0,
          volume: totalMarket.volume > 0 ? (m.volume24h / totalMarket.volume) * 100 : 0,
          users: totalMarket.users > 0 ? (m.users / totalMarket.users) * 100 : 0,
          revenue: totalMarket.revenue > 0 ? (m.revenue / totalMarket.revenue) * 100 : 0,
        },
      }));

      // Sort by TVL market share
      protocols.sort((a, b) => b.marketShare.tvl - a.marketShare.tvl);

      // Calculate concentration metrics
      const tvlShares = protocols.map(p => p.marketShare.tvl);
      const herfindahlIndex = tvlShares.reduce((sum, share) => sum + Math.pow(share, 2), 0);
      const top3Share = tvlShares.slice(0, 3).reduce((sum, share) => sum + share, 0);
      const top5Share = tvlShares.slice(0, 5).reduce((sum, share) => sum + share, 0);

      const analysis: MarketShareAnalysis = {
        totalMarket,
        protocols,
        concentration: {
          herfindahlIndex,
          top3Share,
          top5Share,
        },
      };

      return {
        success: true,
        data: analysis,
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MARKET_SHARE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        },
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Perform comprehensive competitive analysis
   */
  async performCompetitiveAnalysis(
    protocolIds: string[],
    category: string = 'DeFi'
  ): Promise<CalculationResult<CompetitiveAnalysis>> {
    const startTime = Date.now();

    try {
      // Run benchmark and market share analysis in parallel
      const [benchmarkResult, marketShareResult] = await Promise.all([
        this.benchmarkProtocols(protocolIds, category),
        this.calculateMarketShare(protocolIds),
      ]);

      if (!benchmarkResult.success || !marketShareResult.success) {
        throw new Error('Failed to perform competitive analysis');
      }

      const protocols = benchmarkResult.data!;
      const marketShare = marketShareResult.data!;

      // Identify leaders and fast-growing protocols
      const tvlLeaders = protocols
        .sort((a, b) => b.metrics.tvl.value - a.metrics.tvl.value)
        .slice(0, 5)
        .map(p => p.protocolId);

      const volumeLeaders = protocols
        .sort((a, b) => b.metrics.volume.value - a.metrics.volume.value)
        .slice(0, 5)
        .map(p => p.protocolId);

      const userLeaders = protocols
        .sort((a, b) => b.metrics.users.value - a.metrics.users.value)
        .slice(0, 5)
        .map(p => p.protocolId);

      const revenueLeaders = protocols
        .sort((a, b) => b.metrics.revenue.value - a.metrics.revenue.value)
        .slice(0, 5)
        .map(p => p.protocolId);

      const fastestGrowing = protocols
        .sort((a, b) => b.metrics.tvl.change - a.metrics.tvl.change)
        .slice(0, 5)
        .map(p => p.protocolId);

      const analysis: CompetitiveAnalysis = {
        protocols,
        marketShare,
        trends: {
          tvlLeaders,
          volumeLeaders,
          userLeaders,
          revenueLeaders,
          fastestGrowing,
        },
      };

      return {
        success: true,
        data: analysis,
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPETITIVE_ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        },
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }
}

// Export singleton instance
export const benchmarkEngine = new BenchmarkEngine();

