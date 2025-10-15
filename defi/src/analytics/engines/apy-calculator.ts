/**
 * APY Calculator Engine
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 3 - Analytics Engine
 * 
 * Calculates APY/APR metrics for protocols across different time periods
 */

import { query } from '../db/connection';
import {
  APYCalculationInput,
  APYResult,
  APYAnalysis,
  APYTimeSeriesPoint,
  CalculationResult,
  TimeRange,
  TrendAnalysis,
} from './types';

/**
 * APY Calculator Engine
 * Calculates Annual Percentage Yield and Annual Percentage Rate
 */
export class APYCalculator {
  /**
   * Calculate APY from start and end values
   * APY = ((1 + periodic_rate)^periods - 1) * 100
   */
  calculateAPY(input: APYCalculationInput): APYResult {
    const { startValue, endValue, startDate, endDate, compoundingPeriods = 365 } = input;

    // Validate inputs
    if (startValue <= 0 || endValue <= 0) {
      throw new Error('Start and end values must be positive');
    }

    // Calculate period in days
    const periodMs = endDate.getTime() - startDate.getTime();
    const periodDays = periodMs / (1000 * 60 * 60 * 24);

    if (periodDays <= 0) {
      throw new Error('End date must be after start date');
    }

    // Calculate periodic return
    const periodicReturn = (endValue - startValue) / startValue;

    // Calculate number of periods in a year
    const periodsPerYear = 365 / periodDays;

    // Calculate APY (with compounding)
    const apy = (Math.pow(1 + periodicReturn, periodsPerYear) - 1) * 100;

    // Calculate APR (simple interest, no compounding)
    const apr = periodicReturn * periodsPerYear * 100;

    // Calculate annualized return
    const annualizedReturn = periodicReturn * periodsPerYear;

    return {
      apy,
      apr,
      periodDays,
      annualizedReturn,
    };
  }

  /**
   * Calculate APY for a specific time range (7d, 30d, 90d, 1y)
   */
  async calculateAPYForTimeRange(
    protocolId: string,
    timeRange: '7d' | '30d' | '90d' | '1y'
  ): Promise<CalculationResult<APYResult>> {
    const startTime = Date.now();

    try {
      // Map time range to days
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const days = daysMap[timeRange];

      // Get TVL data for the time range
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Aggregate TVL across all chains for protocol-level calculation
      const tvlData = await query<{ tvl: number; timestamp: Date }>(
        `SELECT SUM(tvl) as tvl, timestamp
         FROM protocol_tvl
         WHERE protocol_id = $1
           AND timestamp >= $2
           AND timestamp <= $3
         GROUP BY timestamp
         ORDER BY timestamp ASC`,
        [protocolId, startDate, endDate]
      );

      if (tvlData.length < 2) {
        throw new Error(`Insufficient data for ${timeRange} APY calculation`);
      }

      // Get first and last data points
      const startPoint = tvlData[0];
      const endPoint = tvlData[tvlData.length - 1];

      // Calculate APY
      const result = this.calculateAPY({
        protocolId,
        startValue: startPoint.tvl,
        endValue: endPoint.tvl,
        startDate: new Date(startPoint.timestamp),
        endDate: new Date(endPoint.timestamp),
      });

      return {
        success: true,
        data: result,
        calculatedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APY_CALCULATION_ERROR',
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
   * Calculate comprehensive APY analysis for all time ranges
   */
  async calculateComprehensiveAPY(protocolId: string): Promise<CalculationResult<APYAnalysis>> {
    const startTime = Date.now();

    try {
      // Calculate APY for all time ranges
      const [apy7dResult, apy30dResult, apy90dResult, apy1yResult] = await Promise.all([
        this.calculateAPYForTimeRange(protocolId, '7d'),
        this.calculateAPYForTimeRange(protocolId, '30d'),
        this.calculateAPYForTimeRange(protocolId, '90d'),
        this.calculateAPYForTimeRange(protocolId, '1y'),
      ]);

      // Check if all calculations succeeded
      if (!apy7dResult.success || !apy30dResult.success || !apy90dResult.success || !apy1yResult.success) {
        throw new Error('Failed to calculate APY for one or more time ranges');
      }

      // Get time series data for trend analysis
      const timeSeries = await this.getAPYTimeSeries(protocolId, 90); // Last 90 days

      // Analyze trend
      const trend = this.analyzeTrend(timeSeries);

      // Calculate volatility (standard deviation of APY)
      const apyValues = timeSeries.map(point => point.apy);
      const volatility = this.calculateStandardDeviation(apyValues);

      const analysis: APYAnalysis = {
        protocolId,
        current: apy7dResult.data!,
        apy7d: apy7dResult.data!.apy,
        apy30d: apy30dResult.data!.apy,
        apy90d: apy90dResult.data!.apy,
        apy1y: apy1yResult.data!.apy,
        apr7d: apy7dResult.data!.apr,
        apr30d: apy30dResult.data!.apr,
        timeSeries,
        trend: trend.direction,
        volatility,
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
          code: 'COMPREHENSIVE_APY_ERROR',
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
   * Get APY time series data
   */
  private async getAPYTimeSeries(protocolId: string, days: number): Promise<APYTimeSeriesPoint[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Aggregate TVL across all chains for protocol-level time series
    const tvlData = await query<{ tvl: number; timestamp: Date }>(
      `SELECT SUM(tvl) as tvl, timestamp
       FROM protocol_tvl
       WHERE protocol_id = $1
         AND timestamp >= $2
         AND timestamp <= $3
       GROUP BY timestamp
       ORDER BY timestamp ASC`,
      [protocolId, startDate, endDate]
    );

    // Calculate rolling 7-day APY for each point
    const timeSeries: APYTimeSeriesPoint[] = [];

    for (let i = 7; i < tvlData.length; i++) {
      const startPoint = tvlData[i - 7];
      const endPoint = tvlData[i];

      const apyResult = this.calculateAPY({
        protocolId,
        startValue: startPoint.tvl,
        endValue: endPoint.tvl,
        startDate: new Date(startPoint.timestamp),
        endDate: new Date(endPoint.timestamp),
      });

      timeSeries.push({
        timestamp: new Date(endPoint.timestamp),
        apy: apyResult.apy,
        apr: apyResult.apr,
        tvl: endPoint.tvl,
      });
    }

    return timeSeries;
  }

  /**
   * Analyze trend direction
   */
  private analyzeTrend(timeSeries: APYTimeSeriesPoint[]): TrendAnalysis {
    if (timeSeries.length < 2) {
      return {
        direction: 'stable',
        slope: 0,
        rSquared: 0,
        confidence: 0,
      };
    }

    // Simple linear regression
    const n = timeSeries.length;
    const x = timeSeries.map((_, i) => i);
    const y = timeSeries.map(point => point.apy);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const rSquared = 1 - ssResidual / ssTotal;

    // Determine direction
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.1) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    return {
      direction,
      slope,
      rSquared,
      confidence: rSquared,
    };
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
export const apyCalculator = new APYCalculator();

