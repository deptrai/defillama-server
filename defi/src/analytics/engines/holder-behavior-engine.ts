/**
 * Holder Behavior Engine
 * Story: 2.2.2 - Holder Distribution Analysis
 * 
 * Analyzes holder behavior including churn rate, loyalty score,
 * and holder age distribution
 */

import { query } from '../db/connection';

export interface HolderBehavior {
  tokenAddress: string;
  chainId: string;
  timeRange: string;
  behavior: {
    avgHoldingPeriod: number; // days
    holderChurnRate: number; // %
    newHolders: number;
    exitedHolders: number;
    loyaltyScore: number; // 0-100
  };
  ageDistribution: Array<{
    ageRange: string;
    holderCount: number;
    percentage: number;
  }>;
  trends: {
    holderGrowth: Array<{ timestamp: Date; count: number }>;
    whaleActivity: Array<{ timestamp: Date; accumulation: number; distribution: number }>;
  };
}

export interface DistributionHistory {
  tokenAddress: string;
  chainId: string;
  history: Array<{
    timestamp: Date;
    totalHolders: number;
    giniCoefficient: number;
    concentrationScore: number;
    top10Percentage: number;
    whaleCount: number;
    whalePercentage: number;
  }>;
  trends: {
    holderGrowthRate: number; // %
    concentrationTrend: 'increasing' | 'decreasing' | 'stable';
    whaleActivityTrend: 'accumulating' | 'distributing' | 'neutral';
  };
}

export class HolderBehaviorEngine {
  private static instance: HolderBehaviorEngine;

  private constructor() {}

  public static getInstance(): HolderBehaviorEngine {
    if (!HolderBehaviorEngine.instance) {
      HolderBehaviorEngine.instance = new HolderBehaviorEngine();
    }
    return HolderBehaviorEngine.instance;
  }

  /**
   * Get holder behavior analysis
   */
  async getBehavior(
    tokenAddress: string,
    chainId: string = 'ethereum',
    timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<HolderBehavior> {
    const behavior = await this.calculateBehaviorMetrics(tokenAddress, chainId, timeRange);
    const ageDistribution = await this.getAgeDistribution(tokenAddress, chainId);
    const trends = await this.getTrends(tokenAddress, chainId, timeRange);

    return {
      tokenAddress,
      chainId,
      timeRange,
      behavior,
      ageDistribution,
      trends,
    };
  }

  /**
   * Calculate behavior metrics
   */
  private async calculateBehaviorMetrics(
    tokenAddress: string,
    chainId: string,
    timeRange: string
  ): Promise<HolderBehavior['behavior']> {
    // Get average holding period
    const avgHoldingResult = await query<{ avg_holding_period: string }>(
      `SELECT AVG(holding_period_days) as avg_holding_period
       FROM token_holders
       WHERE token_address = $1 AND chain_id = $2`,
      [tokenAddress, chainId]
    );
    const avgHoldingPeriod = parseFloat(avgHoldingResult.rows[0].avg_holding_period || '0');

    // Get churn rate from latest snapshot
    const churnResult = await query<{ holder_churn_rate: string }>(
      `SELECT holder_churn_rate
       FROM holder_distribution_snapshots
       WHERE token_address = $1 AND chain_id = $2
       ORDER BY timestamp DESC
       LIMIT 1`,
      [tokenAddress, chainId]
    );
    const holderChurnRate = parseFloat(churnResult.rows[0]?.holder_churn_rate || '0');

    // Get new holders count based on time range
    const days = this.timeRangeToDays(timeRange);
    const newHoldersResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM token_holders
       WHERE token_address = $1 
         AND chain_id = $2
         AND first_seen >= NOW() - INTERVAL '${days} days'`,
      [tokenAddress, chainId]
    );
    const newHolders = parseInt(newHoldersResult.rows[0].count);

    // Estimate exited holders (simplified - would need historical data)
    const exitedHolders = Math.round(newHolders * (holderChurnRate / 100));

    // Calculate loyalty score (0-100)
    // Based on: avg holding period, low churn rate, high transaction count
    const loyaltyScore = this.calculateLoyaltyScore(avgHoldingPeriod, holderChurnRate);

    return {
      avgHoldingPeriod,
      holderChurnRate,
      newHolders,
      exitedHolders,
      loyaltyScore,
    };
  }

  /**
   * Calculate loyalty score (0-100)
   */
  private calculateLoyaltyScore(avgHoldingPeriod: number, churnRate: number): number {
    // Normalize holding period (0-365 days -> 0-50 points)
    const holdingScore = Math.min(50, (avgHoldingPeriod / 365) * 50);

    // Normalize churn rate (0-10% -> 50-0 points)
    const churnScore = Math.max(0, 50 - (churnRate / 10) * 50);

    return Math.round(holdingScore + churnScore);
  }

  /**
   * Get holder age distribution
   */
  private async getAgeDistribution(
    tokenAddress: string,
    chainId: string
  ): Promise<HolderBehavior['ageDistribution']> {
    const ageRanges = [
      { range: '0-7d', min: 0, max: 7 },
      { range: '7-30d', min: 7, max: 30 },
      { range: '30-90d', min: 30, max: 90 },
      { range: '90-180d', min: 90, max: 180 },
      { range: '180-365d', min: 180, max: 365 },
      { range: '>365d', min: 365, max: 100000 },
    ];

    const totalHoldersResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM token_holders
       WHERE token_address = $1 AND chain_id = $2`,
      [tokenAddress, chainId]
    );
    const totalHolders = parseInt(totalHoldersResult.rows[0].count);

    const distribution: HolderBehavior['ageDistribution'] = [];

    for (const { range, min, max } of ageRanges) {
      const result = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM token_holders
         WHERE token_address = $1 
           AND chain_id = $2
           AND holding_period_days >= $3 
           AND holding_period_days < $4`,
        [tokenAddress, chainId, min, max]
      );

      const holderCount = parseInt(result.rows[0].count);
      distribution.push({
        ageRange: range,
        holderCount,
        percentage: totalHolders > 0 ? (holderCount / totalHolders) * 100 : 0,
      });
    }

    return distribution;
  }

  /**
   * Get holder growth and whale activity trends
   */
  private async getTrends(
    tokenAddress: string,
    chainId: string,
    timeRange: string
  ): Promise<HolderBehavior['trends']> {
    const days = this.timeRangeToDays(timeRange);

    // Get holder growth from snapshots
    const holderGrowthResult = await query<{ timestamp: Date; total_holders: number }>(
      `SELECT timestamp, total_holders
       FROM holder_distribution_snapshots
       WHERE token_address = $1 
         AND chain_id = $2
         AND timestamp >= NOW() - INTERVAL '${days} days'
       ORDER BY timestamp ASC`,
      [tokenAddress, chainId]
    );

    const holderGrowth = holderGrowthResult.rows.map(row => ({
      timestamp: row.timestamp,
      count: row.total_holders,
    }));

    // Get whale activity (simplified - calculate from snapshots)
    const whaleActivityResult = await query<{
      timestamp: Date;
      whale_count: number;
      whale_percentage: string;
    }>(
      `SELECT timestamp, whale_count, whale_percentage
       FROM holder_distribution_snapshots
       WHERE token_address = $1 
         AND chain_id = $2
         AND timestamp >= NOW() - INTERVAL '${days} days'
       ORDER BY timestamp ASC`,
      [tokenAddress, chainId]
    );

    const whaleActivity = whaleActivityResult.rows.map((row, index, arr) => {
      const prevPercentage = index > 0 ? parseFloat(arr[index - 1].whale_percentage) : parseFloat(row.whale_percentage);
      const currentPercentage = parseFloat(row.whale_percentage);
      const change = currentPercentage - prevPercentage;

      return {
        timestamp: row.timestamp,
        accumulation: change > 0 ? change : 0,
        distribution: change < 0 ? Math.abs(change) : 0,
      };
    });

    return {
      holderGrowth,
      whaleActivity,
    };
  }

  /**
   * Get distribution history
   */
  async getHistory(
    tokenAddress: string,
    chainId: string = 'ethereum',
    timeRange: '7d' | '30d' | '90d' | '1y' = '30d',
    granularity: 'daily' | 'weekly' = 'daily'
  ): Promise<DistributionHistory> {
    const days = this.timeRangeToDays(timeRange);

    // Get historical snapshots
    const historyResult = await query<{
      timestamp: Date;
      total_holders: number;
      gini_coefficient: string;
      concentration_score: string;
      top10_percentage: string;
      whale_count: number;
      whale_percentage: string;
    }>(
      `SELECT 
         timestamp, total_holders, gini_coefficient, concentration_score,
         top10_percentage, whale_count, whale_percentage
       FROM holder_distribution_snapshots
       WHERE token_address = $1 
         AND chain_id = $2
         AND timestamp >= NOW() - INTERVAL '${days} days'
       ORDER BY timestamp ASC`,
      [tokenAddress, chainId]
    );

    const history = historyResult.rows.map(row => ({
      timestamp: row.timestamp,
      totalHolders: row.total_holders,
      giniCoefficient: parseFloat(row.gini_coefficient),
      concentrationScore: parseFloat(row.concentration_score),
      top10Percentage: parseFloat(row.top10_percentage),
      whaleCount: row.whale_count,
      whalePercentage: parseFloat(row.whale_percentage),
    }));

    // Calculate trends
    const trends = this.calculateTrends(history);

    return {
      tokenAddress,
      chainId,
      history,
      trends,
    };
  }

  /**
   * Calculate trends from history
   */
  private calculateTrends(
    history: DistributionHistory['history']
  ): DistributionHistory['trends'] {
    if (history.length < 2) {
      return {
        holderGrowthRate: 0,
        concentrationTrend: 'stable',
        whaleActivityTrend: 'neutral',
      };
    }

    const first = history[0];
    const last = history[history.length - 1];

    // Holder growth rate
    const holderGrowthRate = ((last.totalHolders - first.totalHolders) / first.totalHolders) * 100;

    // Concentration trend
    const concentrationChange = last.concentrationScore - first.concentrationScore;
    const concentrationTrend =
      concentrationChange > 2 ? 'increasing' : concentrationChange < -2 ? 'decreasing' : 'stable';

    // Whale activity trend
    const whaleChange = last.whalePercentage - first.whalePercentage;
    const whaleActivityTrend =
      whaleChange > 0.5 ? 'accumulating' : whaleChange < -0.5 ? 'distributing' : 'neutral';

    return {
      holderGrowthRate,
      concentrationTrend,
      whaleActivityTrend,
    };
  }

  /**
   * Convert time range to days
   */
  private timeRangeToDays(timeRange: string): number {
    const map: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    return map[timeRange] || 30;
  }
}

