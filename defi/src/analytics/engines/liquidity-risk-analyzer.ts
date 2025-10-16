/**
 * Liquidity Risk Analyzer Engine
 * Story: 3.2.1 - Protocol Risk Assessment
 * 
 * Analyzes liquidity risk based on:
 * - TVL and TVL changes
 * - Liquidity depth
 * - Holder concentration
 */

import { query } from '../db/connection';

export interface LiquidityRiskMetrics {
  protocolId: string;
  currentTvlUsd: number;
  tvlChange24hPct: number | null;
  tvlChange7dPct: number | null;
  tvlChange30dPct: number | null;
  liquidityDepthScore: number | null;
  top10HoldersConcentrationPct: number | null;
  top50HoldersConcentrationPct: number | null;
  liquidityProviderCount: number | null;
  liquidityRiskScore: number;
  breakdown: {
    tvlScore: number;
    depthScore: number;
    concentrationScore: number;
  };
}

export class LiquidityRiskAnalyzer {
  private static instance: LiquidityRiskAnalyzer;

  private constructor() {}

  public static getInstance(): LiquidityRiskAnalyzer {
    if (!LiquidityRiskAnalyzer.instance) {
      LiquidityRiskAnalyzer.instance = new LiquidityRiskAnalyzer();
    }
    return LiquidityRiskAnalyzer.instance;
  }

  /**
   * Analyze liquidity risk for a protocol
   */
  public async analyzeLiquidityRisk(protocolId: string): Promise<LiquidityRiskMetrics> {
    // Fetch liquidity risk data
    const result = await query<any>(
      `SELECT * FROM protocol_liquidity_risks WHERE protocol_id = $1`,
      [protocolId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Liquidity risk data not found for protocol: ${protocolId}`);
    }

    const data = result.rows[0];

    // Calculate individual scores
    const tvlScore = this.calculateTVLScore(
      data.current_tvl_usd,
      data.tvl_change_24h_pct,
      data.tvl_change_7d_pct,
      data.tvl_change_30d_pct
    );

    const depthScore = this.calculateDepthScore(
      data.liquidity_depth_score,
      data.liquidity_provider_count
    );

    const concentrationScore = this.calculateConcentrationScore(
      data.top_10_holders_concentration_pct,
      data.top_50_holders_concentration_pct
    );

    // Calculate overall liquidity risk score (weighted average)
    const liquidityRiskScore = this.calculateOverallScore(
      tvlScore,
      depthScore,
      concentrationScore
    );

    return {
      protocolId: data.protocol_id,
      currentTvlUsd: parseFloat(data.current_tvl_usd),
      tvlChange24hPct: data.tvl_change_24h_pct ? parseFloat(data.tvl_change_24h_pct) : null,
      tvlChange7dPct: data.tvl_change_7d_pct ? parseFloat(data.tvl_change_7d_pct) : null,
      tvlChange30dPct: data.tvl_change_30d_pct ? parseFloat(data.tvl_change_30d_pct) : null,
      liquidityDepthScore: data.liquidity_depth_score ? parseFloat(data.liquidity_depth_score) : null,
      top10HoldersConcentrationPct: data.top_10_holders_concentration_pct ? parseFloat(data.top_10_holders_concentration_pct) : null,
      top50HoldersConcentrationPct: data.top_50_holders_concentration_pct ? parseFloat(data.top_50_holders_concentration_pct) : null,
      liquidityProviderCount: data.liquidity_provider_count,
      liquidityRiskScore: Math.round(liquidityRiskScore * 100) / 100,
      breakdown: {
        tvlScore: Math.round(tvlScore * 100) / 100,
        depthScore: Math.round(depthScore * 100) / 100,
        concentrationScore: Math.round(concentrationScore * 100) / 100,
      },
    };
  }

  /**
   * Calculate TVL score (0-100, lower is better)
   */
  public calculateTVLScore(
    currentTvl: number,
    change24h: number | null,
    change7d: number | null,
    change30d: number | null
  ): number {
    let score = 0;

    // Base score from TVL size
    if (currentTvl >= 1_000_000_000) score = 10; // >$1B
    else if (currentTvl >= 100_000_000) score = 25; // $100M-$1B
    else if (currentTvl >= 10_000_000) score = 45; // $10M-$100M
    else if (currentTvl >= 1_000_000) score = 65; // $1M-$10M
    else score = 85; // <$1M

    // Penalty for negative TVL changes
    if (change30d !== null && change30d < 0) {
      const changePenalty = Math.min(Math.abs(change30d) / 2, 20);
      score += changePenalty;
    }

    // Bonus for positive TVL growth
    if (change30d !== null && change30d > 20) {
      const growthBonus = Math.min(change30d / 4, 10);
      score = Math.max(score - growthBonus, 0);
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate depth score (0-100, lower is better)
   */
  public calculateDepthScore(
    depthScore: number | null,
    providerCount: number | null
  ): number {
    if (depthScore === null) {
      // No data, assume medium risk
      return 50;
    }

    // Depth score is 0-100 (higher is better), so invert it
    let score = 100 - depthScore;

    // Bonus for many liquidity providers
    if (providerCount !== null) {
      if (providerCount >= 100000) score = Math.max(score - 15, 0);
      else if (providerCount >= 50000) score = Math.max(score - 10, 0);
      else if (providerCount >= 10000) score = Math.max(score - 5, 0);
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate concentration score (0-100, lower is better)
   */
  public calculateConcentrationScore(
    top10Concentration: number | null,
    top50Concentration: number | null
  ): number {
    if (top10Concentration === null) {
      // No data, assume medium risk
      return 50;
    }

    let score = 0;

    // Score based on top 10 holders concentration
    if (top10Concentration < 30) score = 15;
    else if (top10Concentration < 50) score = 35;
    else if (top10Concentration < 70) score = 55;
    else if (top10Concentration < 90) score = 75;
    else score = 90;

    // Additional penalty if top 50 is also highly concentrated
    if (top50Concentration !== null && top50Concentration > 80) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate overall liquidity risk score
   * Weights: TVL 50%, Depth 30%, Concentration 20%
   */
  private calculateOverallScore(
    tvlScore: number,
    depthScore: number,
    concentrationScore: number
  ): number {
    const weights = {
      tvl: 0.5,
      depth: 0.3,
      concentration: 0.2,
    };

    return (
      tvlScore * weights.tvl +
      depthScore * weights.depth +
      concentrationScore * weights.concentration
    );
  }

  /**
   * Store liquidity risk metrics in database
   */
  public async storeLiquidityRisk(metrics: LiquidityRiskMetrics): Promise<void> {
    await query(
      `UPDATE protocol_liquidity_risks 
       SET liquidity_risk_score = $1, updated_at = NOW()
       WHERE protocol_id = $2`,
      [metrics.liquidityRiskScore, metrics.protocolId]
    );
  }
}

