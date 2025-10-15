/**
 * Yield History Engine
 * Story: 2.1.2 - Yield Opportunity Scanner
 * 
 * Retrieves historical yield data and calculates statistics
 */

import { query } from '../db/connection';

export interface YieldHistoryPoint {
  timestamp: Date;
  apy: number;
  apr?: number;
  tvl?: number;
  volume24h?: number;
}

export interface YieldHistoryStats {
  avgApy: number;
  maxApy: number;
  minApy: number;
  currentApy: number;
  volatility: number; // Standard deviation
  stabilityScore: number; // 0-100, higher = more stable
  bestPeriod: { start: Date; end: Date; avgApy: number };
  worstPeriod: { start: Date; end: Date; avgApy: number };
  trend: 'up' | 'down' | 'stable';
}

export type TimeRange = '7d' | '30d' | '90d' | '1y';
export type Granularity = 'hourly' | 'daily' | 'weekly';

export class YieldHistoryEngine {
  private static instance: YieldHistoryEngine;

  private constructor() {}

  public static getInstance(): YieldHistoryEngine {
    if (!YieldHistoryEngine.instance) {
      YieldHistoryEngine.instance = new YieldHistoryEngine();
    }
    return YieldHistoryEngine.instance;
  }

  /**
   * Get historical yield data for an opportunity
   */
  public async getHistory(
    opportunityId: string,
    timeRange: TimeRange = '30d',
    granularity: Granularity = 'daily'
  ): Promise<YieldHistoryPoint[]> {
    const days = this.getTimeRangeDays(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await query<any>(
      `SELECT timestamp, apy, apr, tvl, volume_24h
       FROM yield_history
       WHERE opportunity_id = $1
         AND timestamp >= $2
       ORDER BY timestamp ASC`,
      [opportunityId, startDate]
    );

    return result.rows.map(row => ({
      timestamp: new Date(row.timestamp),
      apy: parseFloat(row.apy),
      apr: row.apr ? parseFloat(row.apr) : undefined,
      tvl: row.tvl ? parseFloat(row.tvl) : undefined,
      volume24h: row.volume_24h ? parseFloat(row.volume_24h) : undefined,
    }));
  }

  /**
   * Calculate statistics from historical data
   */
  public async getHistoryStats(
    opportunityId: string,
    timeRange: TimeRange = '30d'
  ): Promise<YieldHistoryStats> {
    const history = await this.getHistory(opportunityId, timeRange);

    if (history.length === 0) {
      throw new Error('No historical data available');
    }

    const apys = history.map(h => h.apy);
    const avgApy = apys.reduce((sum, apy) => sum + apy, 0) / apys.length;
    const maxApy = Math.max(...apys);
    const minApy = Math.min(...apys);
    const currentApy = apys[apys.length - 1];

    // Calculate volatility (standard deviation)
    const variance = apys.reduce((sum, apy) => sum + Math.pow(apy - avgApy, 2), 0) / apys.length;
    const volatility = Math.sqrt(variance);

    // Calculate stability score (inverse of coefficient of variation)
    const coefficientOfVariation = avgApy > 0 ? volatility / avgApy : 1;
    const stabilityScore = Math.max(0, Math.min(100, 100 * (1 - coefficientOfVariation)));

    // Find best and worst 7-day periods
    const windowSize = Math.min(7, history.length);
    let bestPeriod = { start: history[0].timestamp, end: history[0].timestamp, avgApy: 0 };
    let worstPeriod = { start: history[0].timestamp, end: history[0].timestamp, avgApy: Infinity };

    for (let i = 0; i <= history.length - windowSize; i++) {
      const window = history.slice(i, i + windowSize);
      const windowAvg = window.reduce((sum, h) => sum + h.apy, 0) / window.length;

      if (windowAvg > bestPeriod.avgApy) {
        bestPeriod = {
          start: window[0].timestamp,
          end: window[window.length - 1].timestamp,
          avgApy: windowAvg,
        };
      }

      if (windowAvg < worstPeriod.avgApy) {
        worstPeriod = {
          start: window[0].timestamp,
          end: window[window.length - 1].timestamp,
          avgApy: windowAvg,
        };
      }
    }

    // Determine trend (compare first half vs second half)
    const midpoint = Math.floor(history.length / 2);
    const firstHalfAvg = history.slice(0, midpoint).reduce((sum, h) => sum + h.apy, 0) / midpoint;
    const secondHalfAvg = history.slice(midpoint).reduce((sum, h) => sum + h.apy, 0) / (history.length - midpoint);
    const trendThreshold = avgApy * 0.05; // 5% change

    let trend: 'up' | 'down' | 'stable';
    if (secondHalfAvg > firstHalfAvg + trendThreshold) {
      trend = 'up';
    } else if (secondHalfAvg < firstHalfAvg - trendThreshold) {
      trend = 'down';
    } else {
      trend = 'stable';
    }

    return {
      avgApy: Math.round(avgApy * 100) / 100,
      maxApy: Math.round(maxApy * 100) / 100,
      minApy: Math.round(minApy * 100) / 100,
      currentApy: Math.round(currentApy * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      stabilityScore: Math.round(stabilityScore * 100) / 100,
      bestPeriod: {
        ...bestPeriod,
        avgApy: Math.round(bestPeriod.avgApy * 100) / 100,
      },
      worstPeriod: {
        ...worstPeriod,
        avgApy: Math.round(worstPeriod.avgApy * 100) / 100,
      },
      trend,
    };
  }

  private getTimeRangeDays(timeRange: TimeRange): number {
    switch (timeRange) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  }
}

// Export singleton instance
export const yieldHistoryEngine = YieldHistoryEngine.getInstance();

