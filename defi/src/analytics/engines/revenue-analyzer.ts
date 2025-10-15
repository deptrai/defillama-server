/**
 * Revenue Analyzer Engine
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 3 - Analytics Engine
 *
 * Analyzes protocol revenue, fees, trends, and projections
 *
 * DATA SOURCE DEPENDENCY:
 * This engine reads revenue data from protocol_performance_metrics table.
 * Revenue data must be pre-populated by the protocol-performance-collector.
 *
 * Revenue sources (collected by dimension adapters):
 * - Trading fees (from DEX adapters)
 * - Withdrawal fees (from protocol-specific adapters)
 * - Performance fees (from yield/lending adapters)
 * - Other protocol-specific fees
 *
 * The collector aggregates this data and stores it in protocol_performance_metrics.
 * This analyzer then calculates trends, projections, and breakdowns.
 */

import { query } from '../db/connection';
import {
  RevenueData,
  RevenueMetrics,
  RevenueAnalysis,
  CalculationResult,
} from './types';

/**
 * Revenue Analyzer Engine
 * Analyzes revenue breakdown, trends, and projections
 */
export class RevenueAnalyzer {
  /**
   * Get revenue data for a time range
   * Note: Expects revenue data to be pre-populated in protocol_performance_metrics
   */
  async getRevenueData(
    protocolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RevenueData[]> {
    const result = await query<{
      timestamp: Date;
      daily_revenue: number;
      trading_fees: number;
      withdrawal_fees: number;
      performance_fees: number;
    }>(
      `SELECT
         timestamp,
         daily_revenue,
         trading_fees,
         withdrawal_fees,
         performance_fees
       FROM protocol_performance_metrics
       WHERE protocol_id = $1
         AND timestamp >= $2
         AND timestamp <= $3
       ORDER BY timestamp ASC`,
      [protocolId, startDate, endDate]
    );

    const data = result.rows;

    return data.map(d => ({
      protocolId,
      timestamp: new Date(d.timestamp),
      totalRevenue: d.daily_revenue || 0,
      tradingFees: d.trading_fees || 0,
      withdrawalFees: d.withdrawal_fees || 0,
      performanceFees: d.performance_fees || 0,
      otherFees: Math.max(0, (d.daily_revenue || 0) - (d.trading_fees || 0) - (d.withdrawal_fees || 0) - (d.performance_fees || 0)),
    }));
  }

  /**
   * Calculate revenue metrics for a time range
   */
  async calculateRevenueMetrics(
    protocolId: string,
    timeRange: '7d' | '30d' | '90d' | '1y'
  ): Promise<CalculationResult<RevenueMetrics>> {
    const startTime = Date.now();

    try {
      // Map time range to days
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const days = daysMap[timeRange];

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Get revenue data
      const revenueData = await this.getRevenueData(protocolId, startDate, endDate);

      if (revenueData.length === 0) {
        throw new Error(`No revenue data available for ${timeRange}`);
      }

      // Calculate total revenue
      const totalRevenue = revenueData.reduce((sum, d) => sum + d.totalRevenue, 0);

      // Calculate fee breakdown
      const totalTradingFees = revenueData.reduce((sum, d) => sum + d.tradingFees, 0);
      const totalWithdrawalFees = revenueData.reduce((sum, d) => sum + d.withdrawalFees, 0);
      const totalPerformanceFees = revenueData.reduce((sum, d) => sum + d.performanceFees, 0);
      const totalOtherFees = revenueData.reduce((sum, d) => sum + d.otherFees, 0);

      // Calculate trend (compare first half vs second half)
      const midPoint = Math.floor(revenueData.length / 2);
      const firstHalfRevenue = revenueData.slice(0, midPoint).reduce((sum, d) => sum + d.totalRevenue, 0);
      const secondHalfRevenue = revenueData.slice(midPoint).reduce((sum, d) => sum + d.totalRevenue, 0);
      const trend = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;

      // Get user count for revenue per user calculation
      const userCount = await this.getActiveUserCount(protocolId, endDate);
      const revenuePerUser = userCount > 0 ? totalRevenue / userCount : 0;

      // Get TVL for revenue per TVL calculation
      const tvl = await this.getCurrentTVL(protocolId, endDate);
      const revenuePerTVL = tvl > 0 ? (totalRevenue / tvl) * 100 : 0;

      // Calculate projections
      const projections = this.calculateProjections(revenueData, trend);

      // Build history
      const history = revenueData.map(d => ({
        timestamp: d.timestamp.toISOString(),
        total: d.totalRevenue,
        tradingFees: d.tradingFees,
        withdrawalFees: d.withdrawalFees,
        performanceFees: d.performanceFees,
      }));

      const metrics: RevenueMetrics = {
        protocolId,
        timeRange,
        revenue: {
          total: totalRevenue,
          trend,
          history,
        },
        revenuePerUser,
        revenuePerTVL,
        feeBreakdown: {
          tradingFees: totalTradingFees,
          withdrawalFees: totalWithdrawalFees,
          performanceFees: totalPerformanceFees,
          other: totalOtherFees,
        },
        projections,
      };

      return {
        success: true,
        data: metrics,
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REVENUE_METRICS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          protocolId,
          timestamp: new Date(),
        },
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Calculate comprehensive revenue analysis
   */
  async calculateRevenueAnalysis(protocolId: string): Promise<CalculationResult<RevenueAnalysis>> {
    const startTime = Date.now();

    try {
      // Calculate metrics for all time ranges
      const [dailyResult, weeklyResult, monthlyResult] = await Promise.all([
        this.calculateRevenueMetrics(protocolId, '7d'),
        this.calculateRevenueMetrics(protocolId, '30d'),
        this.calculateRevenueMetrics(protocolId, '90d'),
      ]);

      if (!dailyResult.success || !weeklyResult.success || !monthlyResult.success) {
        throw new Error('Failed to calculate revenue metrics for one or more time ranges');
      }

      // Calculate growth rate (30d vs 90d)
      const growthRate = weeklyResult.data!.revenue.trend;

      // Calculate seasonality
      const seasonality = await this.calculateSeasonality(protocolId);

      const analysis: RevenueAnalysis = {
        protocolId,
        daily: dailyResult.data!,
        weekly: weeklyResult.data!,
        monthly: monthlyResult.data!,
        growthRate,
        seasonality,
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
          code: 'REVENUE_ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          protocolId,
          timestamp: new Date(),
        },
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Calculate revenue projections
   */
  private calculateProjections(
    revenueData: RevenueData[],
    trendPercent: number
  ): { next7d: number; next30d: number; confidence: number } {
    if (revenueData.length === 0) {
      return { next7d: 0, next30d: 0, confidence: 0 };
    }

    // Calculate average daily revenue
    const avgDailyRevenue = revenueData.reduce((sum, d) => sum + d.totalRevenue, 0) / revenueData.length;

    // Apply trend to projections
    const growthFactor = 1 + (trendPercent / 100);

    const next7d = avgDailyRevenue * 7 * growthFactor;
    const next30d = avgDailyRevenue * 30 * growthFactor;

    // Calculate confidence based on data consistency
    const stdDev = this.calculateStandardDeviation(revenueData.map(d => d.totalRevenue));
    const coefficientOfVariation = avgDailyRevenue > 0 ? stdDev / avgDailyRevenue : 1;
    const confidence = Math.max(0, Math.min(1, 1 - coefficientOfVariation));

    return { next7d, next30d, confidence };
  }

  /**
   * Calculate seasonality patterns
   */
  private async calculateSeasonality(
    protocolId: string
  ): Promise<{ dayOfWeek: number[]; monthOfYear: number[] }> {
    // Get last 90 days of data
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const revenueData = await this.getRevenueData(protocolId, startDate, endDate);

    // Group by day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeekRevenue = new Array(7).fill(0);
    const dayOfWeekCount = new Array(7).fill(0);

    for (const data of revenueData) {
      const dayOfWeek = data.timestamp.getDay();
      dayOfWeekRevenue[dayOfWeek] += data.totalRevenue;
      dayOfWeekCount[dayOfWeek]++;
    }

    const dayOfWeek = dayOfWeekRevenue.map((total, i) => 
      dayOfWeekCount[i] > 0 ? total / dayOfWeekCount[i] : 0
    );

    // For month of year, we need more data (ideally 1 year)
    // For now, return zeros as placeholder
    const monthOfYear = new Array(12).fill(0);

    return { dayOfWeek, monthOfYear };
  }

  /**
   * Get active user count
   */
  private async getActiveUserCount(protocolId: string, date: Date): Promise<number> {
    const result = await query<{ mau: number }>(
      `SELECT mau
       FROM protocol_performance_metrics
       WHERE protocol_id = $1
         AND timestamp <= $2
       ORDER BY timestamp DESC
       LIMIT 1`,
      [protocolId, date]
    );

    return result[0]?.mau || 0;
  }

  /**
   * Get current TVL
   */
  private async getCurrentTVL(protocolId: string, date: Date): Promise<number> {
    const result = await query<{ tvl: number }>(
      `SELECT tvl
       FROM protocol_tvl
       WHERE protocol_id = $1
         AND timestamp <= $2
       ORDER BY timestamp DESC
       LIMIT 1`,
      [protocolId, date]
    );

    return result[0]?.tvl || 0;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

// Export singleton instance
export const revenueAnalyzer = new RevenueAnalyzer();

