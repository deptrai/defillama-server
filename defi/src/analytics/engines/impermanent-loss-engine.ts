/**
 * Impermanent Loss Engine
 * Story: 2.1.3 - Liquidity Analysis Tools
 * 
 * Calculates impermanent loss for different pool types (Uniswap V2/V3, Curve, Balancer),
 * compares IL vs fees, scores IL risk, and projects IL under different scenarios.
 */

import { query } from '../db/connection';

// ============================================================================
// Types
// ============================================================================

export interface ILCalculation {
  lpId: string;
  poolType: string;
  entryPrice: number;
  currentPrice: number;
  priceRatio: number;
  impermanentLoss: number; // USD
  impermanentLossPct: number; // Percentage
  hodlValue: number; // What position would be worth if held
  currentValue: number; // Actual position value
  ilVsHodl: number; // Difference
}

export interface ILComparison {
  lpId: string;
  impermanentLoss: number;
  feesEarned: number;
  netProfit: number;
  isProfitable: boolean;
  breakEvenFees: number; // Fees needed to offset IL
}

export interface ILRiskScore {
  poolId: string;
  poolType: string;
  riskScore: number; // 0-100
  volatility: number;
  priceDeviation: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ILProjection {
  priceChange: number; // Percentage
  projectedPrice: number;
  projectedIL: number;
  projectedILPct: number;
}

export interface ILHistory {
  timestamp: Date;
  impermanentLoss: number;
  impermanentLossPct: number;
  hodlValue: number;
  positionValue: number;
  feesEarned: number;
}

// ============================================================================
// Impermanent Loss Engine
// ============================================================================

export class ImpermanentLossEngine {
  private static instance: ImpermanentLossEngine;

  private constructor() {}

  public static getInstance(): ImpermanentLossEngine {
    if (!ImpermanentLossEngine.instance) {
      ImpermanentLossEngine.instance = new ImpermanentLossEngine();
    }
    return ImpermanentLossEngine.instance;
  }

  /**
   * Calculate current IL for a position
   */
  public async calculateIL(lpId: string): Promise<ILCalculation> {
    // Get LP position data
    const result = await query<any>(
      `SELECT 
        lp.id as "lpId",
        p.pool_type as "poolType",
        lp.entry_token0_price_usd::FLOAT as "entryToken0Price",
        lp.entry_token1_price_usd::FLOAT as "entryToken1Price",
        lp.entry_token0_amount::FLOAT as "entryToken0Amount",
        lp.entry_token1_amount::FLOAT as "entryToken1Amount",
        lp.entry_value_usd::FLOAT as "entryValue",
        p.token0_price_usd::FLOAT as "currentToken0Price",
        p.token1_price_usd::FLOAT as "currentToken1Price",
        lp.token0_amount::FLOAT as "currentToken0Amount",
        lp.token1_amount::FLOAT as "currentToken1Amount",
        lp.position_value_usd::FLOAT as "currentValue",
        lp.tick_lower as "tickLower",
        lp.tick_upper as "tickUpper",
        p.current_tick as "currentTick"
      FROM liquidity_providers lp
      JOIN liquidity_pools p ON lp.pool_id = p.id
      WHERE lp.id = $1`,
      [lpId]
    );

    if (result.rows.length === 0) {
      throw new Error(`LP position not found: ${lpId}`);
    }

    const position = result.rows[0];

    // Calculate price ratio (using token1/token0 price)
    const entryPrice = position.entryToken1Price / position.entryToken0Price;
    const currentPrice = position.currentToken1Price / position.currentToken0Price;
    const priceRatio = currentPrice / entryPrice;

    // Calculate HODL value (what position would be worth if held)
    const hodlValue = 
      position.entryToken0Amount * position.currentToken0Price +
      position.entryToken1Amount * position.currentToken1Price;

    // Calculate IL based on pool type
    const ilPct = this.calculateILForPoolType(
      priceRatio,
      position.poolType,
      position.tickLower,
      position.tickUpper,
      position.currentTick
    );

    const impermanentLoss = position.entryValue * (ilPct / 100);
    const ilVsHodl = position.currentValue - hodlValue;

    return {
      lpId,
      poolType: position.poolType,
      entryPrice,
      currentPrice,
      priceRatio,
      impermanentLoss,
      impermanentLossPct: ilPct,
      hodlValue,
      currentValue: position.currentValue,
      ilVsHodl,
    };
  }

  /**
   * Calculate IL percentage based on pool type
   */
  private calculateILForPoolType(
    priceRatio: number,
    poolType: string,
    tickLower?: number,
    tickUpper?: number,
    currentTick?: number
  ): number {
    if (poolType === 'uniswap_v2') {
      return this.calculateV2IL(priceRatio);
    } else if (poolType === 'uniswap_v3') {
      return this.calculateV3IL(priceRatio, tickLower, tickUpper, currentTick);
    } else if (poolType === 'curve_stable') {
      return this.calculateCurveIL(priceRatio);
    } else if (poolType === 'balancer_weighted') {
      return this.calculateBalancerIL(priceRatio);
    }
    // Default to V2 formula
    return this.calculateV2IL(priceRatio);
  }

  /**
   * Uniswap V2 Constant Product IL Formula
   * IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
   */
  private calculateV2IL(priceRatio: number): number {
    const il = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
    return il * 100; // Convert to percentage
  }

  /**
   * Uniswap V3 Concentrated Liquidity IL Formula
   * Simplified: Use V2 formula if in range, adjust if out of range
   */
  private calculateV3IL(
    priceRatio: number,
    tickLower?: number,
    tickUpper?: number,
    currentTick?: number
  ): number {
    // If tick data not available, use V2 formula
    if (tickLower === undefined || tickUpper === undefined || currentTick === undefined) {
      return this.calculateV2IL(priceRatio);
    }

    // Check if position is in range
    const inRange = currentTick >= tickLower && currentTick <= tickUpper;

    if (inRange) {
      // In range: use V2 formula
      return this.calculateV2IL(priceRatio);
    } else {
      // Out of range: position is 100% one token
      // IL is more severe as position doesn't rebalance
      // Simplified: use V2 formula with amplification factor
      const baseIL = this.calculateV2IL(priceRatio);
      return baseIL * 1.5; // Amplify IL for out-of-range positions
    }
  }

  /**
   * Curve Stable Swap IL Formula
   * For stable pairs, IL is very small
   * IL ≈ -(price_deviation)^2
   */
  private calculateCurveIL(priceRatio: number): number {
    const priceDeviation = Math.abs(priceRatio - 1);
    const il = -Math.pow(priceDeviation, 2);
    return il * 100; // Convert to percentage
  }

  /**
   * Balancer Weighted Pool IL Formula
   * Simplified: Use V2 formula with weight adjustment
   * For 80/20 pool: IL is less than 50/50
   */
  private calculateBalancerIL(priceRatio: number, weight: number = 0.5): number {
    // For 50/50 pool, use V2 formula
    // For other weights, adjust the formula
    const il = Math.pow(priceRatio, weight) / (weight * priceRatio + (1 - weight)) - 1;
    return il * 100; // Convert to percentage
  }

  /**
   * Compare IL vs fees earned
   */
  public async compareILvsFees(lpId: string): Promise<ILComparison> {
    const ilCalc = await this.calculateIL(lpId);

    const result = await query<any>(
      `SELECT 
        fees_earned::FLOAT as "feesEarned",
        net_profit::FLOAT as "netProfit"
      FROM liquidity_providers
      WHERE id = $1`,
      [lpId]
    );

    const { feesEarned, netProfit } = result.rows[0];
    const isProfitable = netProfit > 0;
    const breakEvenFees = Math.abs(ilCalc.impermanentLoss);

    return {
      lpId,
      impermanentLoss: ilCalc.impermanentLoss,
      feesEarned,
      netProfit,
      isProfitable,
      breakEvenFees,
    };
  }

  /**
   * Score IL risk for a pool
   */
  public async scoreILRisk(poolId: string): Promise<ILRiskScore> {
    const result = await query<any>(
      `SELECT 
        pool_type as "poolType",
        token0_price_usd::FLOAT as "token0Price",
        token1_price_usd::FLOAT as "token1Price",
        volume_24h::FLOAT as "volume24h",
        total_liquidity::FLOAT as "totalLiquidity"
      FROM liquidity_pools
      WHERE id = $1`,
      [poolId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Pool not found: ${poolId}`);
    }

    const pool = result.rows[0];

    // Calculate volatility proxy (volume / liquidity ratio)
    const volatility = pool.totalLiquidity > 0 
      ? pool.volume24h / pool.totalLiquidity 
      : 0;

    // Base risk score by pool type
    let baseRisk = 50;
    if (pool.poolType === 'curve_stable') {
      baseRisk = 10; // Low risk for stable pairs
    } else if (pool.poolType === 'uniswap_v3') {
      baseRisk = 40; // Medium risk (concentrated liquidity)
    } else if (pool.poolType === 'uniswap_v2') {
      baseRisk = 60; // Higher risk (full range)
    } else if (pool.poolType === 'balancer_weighted') {
      baseRisk = 50; // Medium risk
    }

    // Adjust for volatility
    const volatilityScore = Math.min(volatility * 100, 50);
    const riskScore = Math.min(baseRisk + volatilityScore, 100);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore < 30) {
      riskLevel = 'low';
    } else if (riskScore < 70) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    return {
      poolId,
      poolType: pool.poolType,
      riskScore,
      volatility,
      priceDeviation: 0, // Would need historical data
      riskLevel,
    };
  }

  /**
   * Project IL under different price scenarios
   */
  public async projectIL(lpId: string, priceChanges: number[]): Promise<ILProjection[]> {
    const ilCalc = await this.calculateIL(lpId);

    return priceChanges.map(priceChange => {
      const projectedPrice = ilCalc.currentPrice * (1 + priceChange / 100);
      const projectedRatio = projectedPrice / ilCalc.entryPrice;
      const projectedILPct = this.calculateILForPoolType(projectedRatio, ilCalc.poolType);
      const projectedIL = ilCalc.hodlValue * (projectedILPct / 100);

      return {
        priceChange,
        projectedPrice,
        projectedIL,
        projectedILPct,
      };
    });
  }

  /**
   * Get historical IL snapshots
   */
  public async getHistoricalIL(lpId: string, days: number = 30): Promise<ILHistory[]> {
    const result = await query<any>(
      `SELECT
        timestamp,
        impermanent_loss::FLOAT as "impermanentLoss",
        impermanent_loss_pct::FLOAT as "impermanentLossPct",
        hodl_value_usd::FLOAT as "hodlValue",
        position_value_usd::FLOAT as "positionValue",
        fees_earned::FLOAT as "feesEarned"
      FROM impermanent_loss_history
      WHERE provider_id = $1
        AND timestamp >= NOW() - INTERVAL '${days} days'
      ORDER BY timestamp DESC`,
      [lpId]
    );

    return result.rows;
  }
}

// Export singleton instance
export const impermanentLossEngine = ImpermanentLossEngine.getInstance();

