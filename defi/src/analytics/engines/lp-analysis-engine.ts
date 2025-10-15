/**
 * LP Analysis Engine
 * Story: 2.1.3 - Liquidity Analysis Tools
 * 
 * Analyzes liquidity provider positions, profitability, patterns,
 * rankings, and concentration metrics.
 */

import { query } from '../db/connection';

// ============================================================================
// Types
// ============================================================================

export interface LPPosition {
  id: string;
  poolId: string;
  poolName: string;
  walletAddress: string;
  liquidityAmount: number;
  token0Amount: number;
  token1Amount: number;
  positionValueUsd: number;
  feesEarned: number;
  impermanentLoss: number;
  impermanentLossPct: number;
  netProfit: number;
  roi: number;
  entryTimestamp: Date;
  exitTimestamp?: Date;
  positionAgeDays: number;
  isActive: boolean;
}

export interface LPProfitability {
  walletAddress: string;
  totalPositions: number;
  activePositions: number;
  totalValueUsd: number;
  totalFeesEarned: number;
  totalImpermanentLoss: number;
  totalNetProfit: number;
  averageRoi: number;
  annualizedRoi: number;
  averagePositionAgeDays: number;
}

export interface LPPatterns {
  poolId?: string;
  walletAddress?: string;
  totalPositions: number;
  activePositions: number;
  exitedPositions: number;
  averagePositionSize: number;
  averageHoldingPeriod: number; // days
  entryFrequency: number; // positions per month
  exitFrequency: number;
  churnRate: number; // exits / total positions
}

export interface LPRanking {
  rank: number;
  walletAddress: string;
  value: number; // The metric being ranked by
  positionCount: number;
}

export interface ConcentrationMetrics {
  poolId: string;
  totalLPs: number;
  giniCoefficient: number; // 0-1, higher = more concentrated
  hhi: number; // Herfindahl-Hirschman Index (0-10000 scale)
  top10PercentShare: number; // % of total liquidity
  top1PercentShare: number;
  medianPositionSize: number;
  averagePositionSize: number;
}

export interface LPFilters {
  poolId?: string;
  walletAddress?: string;
  isActive?: boolean;
  sortBy?: 'value' | 'fees' | 'roi' | 'age';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ============================================================================
// LP Analysis Engine
// ============================================================================

export class LPAnalysisEngine {
  private static instance: LPAnalysisEngine;

  private constructor() {}

  public static getInstance(): LPAnalysisEngine {
    if (!LPAnalysisEngine.instance) {
      LPAnalysisEngine.instance = new LPAnalysisEngine();
    }
    return LPAnalysisEngine.instance;
  }

  /**
   * Get LP positions with optional filters
   */
  public async getLPPositions(filters: LPFilters = {}): Promise<LPPosition[]> {
    const {
      poolId,
      walletAddress,
      isActive,
      sortBy = 'value',
      sortOrder = 'desc',
      limit = 100,
      offset = 0,
    } = filters;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (poolId) {
      conditions.push(`lp.pool_id = $${paramIndex++}`);
      params.push(poolId);
    }

    if (walletAddress) {
      conditions.push(`lp.wallet_address = $${paramIndex++}`);
      params.push(walletAddress);
    }

    if (isActive !== undefined) {
      conditions.push(`lp.is_active = $${paramIndex++}`);
      params.push(isActive);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortColumn = {
      value: 'lp.position_value_usd',
      fees: 'lp.fees_earned',
      roi: 'lp.roi',
      age: 'lp.position_age_days',
    }[sortBy];

    const result = await query<any>(
      `SELECT 
        lp.id,
        lp.pool_id as "poolId",
        p.pool_name as "poolName",
        lp.wallet_address as "walletAddress",
        COALESCE(lp.liquidity_amount, 0)::FLOAT as "liquidityAmount",
        COALESCE(lp.token0_amount, 0)::FLOAT as "token0Amount",
        COALESCE(lp.token1_amount, 0)::FLOAT as "token1Amount",
        COALESCE(lp.position_value_usd, 0)::FLOAT as "positionValueUsd",
        COALESCE(lp.fees_earned, 0)::FLOAT as "feesEarned",
        COALESCE(lp.impermanent_loss, 0)::FLOAT as "impermanentLoss",
        COALESCE(lp.impermanent_loss_pct, 0)::FLOAT as "impermanentLossPct",
        COALESCE(lp.net_profit, 0)::FLOAT as "netProfit",
        COALESCE(lp.roi, 0)::FLOAT as roi,
        lp.entry_timestamp as "entryTimestamp",
        lp.exit_timestamp as "exitTimestamp",
        COALESCE(lp.position_age_days, 0) as "positionAgeDays",
        lp.is_active as "isActive"
      FROM liquidity_providers lp
      JOIN liquidity_pools p ON lp.pool_id = p.id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get profitability metrics for a wallet
   */
  public async getLPProfitability(walletAddress: string): Promise<LPProfitability> {
    const result = await query<any>(
      `SELECT 
        wallet_address as "walletAddress",
        COUNT(*)::INT as "totalPositions",
        COUNT(*) FILTER (WHERE is_active = true)::INT as "activePositions",
        COALESCE(SUM(position_value_usd) FILTER (WHERE is_active = true), 0)::FLOAT as "totalValueUsd",
        COALESCE(SUM(fees_earned), 0)::FLOAT as "totalFeesEarned",
        COALESCE(SUM(impermanent_loss), 0)::FLOAT as "totalImpermanentLoss",
        COALESCE(SUM(net_profit), 0)::FLOAT as "totalNetProfit",
        COALESCE(AVG(roi), 0)::FLOAT as "averageRoi",
        COALESCE(AVG(position_age_days), 0)::FLOAT as "averagePositionAgeDays"
      FROM liquidity_providers
      WHERE wallet_address = $1
      GROUP BY wallet_address`,
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return {
        walletAddress,
        totalPositions: 0,
        activePositions: 0,
        totalValueUsd: 0,
        totalFeesEarned: 0,
        totalImpermanentLoss: 0,
        totalNetProfit: 0,
        averageRoi: 0,
        annualizedRoi: 0,
        averagePositionAgeDays: 0,
      };
    }

    const profitability = result.rows[0];

    // Calculate annualized ROI
    const avgAgeDays = profitability.averagePositionAgeDays || 1;
    profitability.annualizedRoi = profitability.averageRoi * (365 / avgAgeDays);

    return profitability;
  }

  /**
   * Analyze LP entry/exit patterns
   */
  public async analyzeLPPatterns(filters: { poolId?: string; walletAddress?: string }): Promise<LPPatterns> {
    const { poolId, walletAddress } = filters;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (poolId) {
      conditions.push(`pool_id = $${paramIndex++}`);
      params.push(poolId);
    }

    if (walletAddress) {
      conditions.push(`wallet_address = $${paramIndex++}`);
      params.push(walletAddress);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query<any>(
      `SELECT 
        COUNT(*)::INT as "totalPositions",
        COUNT(*) FILTER (WHERE is_active = true)::INT as "activePositions",
        COUNT(*) FILTER (WHERE is_active = false)::INT as "exitedPositions",
        COALESCE(AVG(entry_value_usd), 0)::FLOAT as "averagePositionSize",
        COALESCE(AVG(position_age_days), 0)::FLOAT as "averageHoldingPeriod",
        COALESCE(COUNT(*) FILTER (WHERE exit_timestamp IS NOT NULL), 0)::INT as exits
      FROM liquidity_providers
      ${whereClause}`,
      params
    );

    const data = result.rows[0];

    // Calculate frequencies (positions per month)
    // Assume data spans from earliest entry to now
    const timeSpanResult = await query<any>(
      `SELECT 
        EXTRACT(EPOCH FROM (NOW() - MIN(entry_timestamp))) / 86400 / 30 as months
      FROM liquidity_providers
      ${whereClause}`,
      params
    );

    const months = timeSpanResult.rows[0]?.months || 1;
    const entryFrequency = data.totalPositions / months;
    const exitFrequency = data.exits / months;
    const churnRate = data.totalPositions > 0 ? data.exitedPositions / data.totalPositions : 0;

    return {
      poolId,
      walletAddress,
      totalPositions: data.totalPositions,
      activePositions: data.activePositions,
      exitedPositions: data.exitedPositions,
      averagePositionSize: data.averagePositionSize,
      averageHoldingPeriod: data.averageHoldingPeriod,
      entryFrequency,
      exitFrequency,
      churnRate,
    };
  }

  /**
   * Rank LPs by different criteria
   */
  public async rankLPs(
    poolId: string,
    criteria: 'value' | 'fees' | 'roi' = 'value',
    limit: number = 10
  ): Promise<LPRanking[]> {
    const column = {
      value: 'position_value_usd',
      fees: 'fees_earned',
      roi: 'roi',
    }[criteria];

    const result = await query<any>(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY ${column} DESC)::INT as rank,
        wallet_address as "walletAddress",
        ${column}::FLOAT as value,
        COUNT(*)::INT as "positionCount"
      FROM liquidity_providers
      WHERE pool_id = $1 AND is_active = true
      GROUP BY wallet_address, ${column}
      ORDER BY ${column} DESC
      LIMIT $2`,
      [poolId, limit]
    );

    return result.rows;
  }

  /**
   * Calculate concentration metrics for a pool
   */
  public async calculateConcentration(poolId: string): Promise<ConcentrationMetrics> {
    // Get all active LP positions for the pool
    const positionsResult = await query<any>(
      `SELECT
        wallet_address,
        position_value_usd::FLOAT as value
      FROM liquidity_providers
      WHERE pool_id = $1 AND is_active = true
      ORDER BY position_value_usd ASC`,
      [poolId]
    );

    const positions = positionsResult.rows;
    const totalLPs = positions.length;

    if (totalLPs === 0) {
      return {
        poolId,
        totalLPs: 0,
        giniCoefficient: 0,
        hhi: 0,
        top10PercentShare: 0,
        top1PercentShare: 0,
        medianPositionSize: 0,
        averagePositionSize: 0,
      };
    }

    // Calculate total liquidity
    const totalLiquidity = positions.reduce((sum, p) => sum + p.value, 0);

    // Calculate Gini coefficient
    const giniCoefficient = this.calculateGini(positions.map(p => p.value));

    // Calculate HHI (Herfindahl-Hirschman Index)
    const hhi = this.calculateHHI(positions.map(p => p.value), totalLiquidity);

    // Calculate top N% shares
    const sortedDesc = [...positions].sort((a, b) => b.value - a.value);
    const top10Count = Math.max(1, Math.ceil(totalLPs * 0.1));
    const top1Count = Math.max(1, Math.ceil(totalLPs * 0.01));

    const top10Sum = sortedDesc.slice(0, top10Count).reduce((sum, p) => sum + p.value, 0);
    const top1Sum = sortedDesc.slice(0, top1Count).reduce((sum, p) => sum + p.value, 0);

    const top10PercentShare = (top10Sum / totalLiquidity) * 100;
    const top1PercentShare = (top1Sum / totalLiquidity) * 100;

    // Calculate median and average
    const medianIndex = Math.floor(totalLPs / 2);
    const medianPositionSize = totalLPs % 2 === 0
      ? (positions[medianIndex - 1].value + positions[medianIndex].value) / 2
      : positions[medianIndex].value;
    const averagePositionSize = totalLiquidity / totalLPs;

    return {
      poolId,
      totalLPs,
      giniCoefficient,
      hhi,
      top10PercentShare,
      top1PercentShare,
      medianPositionSize,
      averagePositionSize,
    };
  }

  /**
   * Calculate Gini coefficient
   * Formula: G = (2 * Σ(i * x_i)) / (n * Σx_i) - (n + 1) / n
   */
  private calculateGini(values: number[]): number {
    const n = values.length;
    if (n === 0) return 0;
    if (n === 1) return 0; // Perfect equality with one LP

    // Sort in ascending order
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    if (sum === 0) return 0;

    // Calculate weighted sum: Σ(i * x_i) where i starts from 1
    const weightedSum = sorted.reduce((acc, val, idx) => acc + (idx + 1) * val, 0);

    const gini = (2 * weightedSum) / (n * sum) - (n + 1) / n;
    return Math.max(0, Math.min(1, gini)); // Clamp to [0, 1]
  }

  /**
   * Calculate Herfindahl-Hirschman Index (HHI)
   * Formula: HHI = Σ(s_i^2) * 10000 where s_i is market share
   */
  private calculateHHI(values: number[], total: number): number {
    if (total === 0) return 0;

    const sumOfSquares = values.reduce((sum, value) => {
      const share = value / total;
      return sum + share * share;
    }, 0);

    return sumOfSquares * 10000; // Scale to traditional HHI range (0-10000)
  }
}

// Export singleton instance
export const lpAnalysisEngine = LPAnalysisEngine.getInstance();
