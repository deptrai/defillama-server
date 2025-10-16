/**
 * Enhanced Confidence Scorer
 * Multi-factor confidence scoring for MEV opportunities
 * 
 * Features:
 * - Gas price factor scoring
 * - Timing factor scoring
 * - Volume factor scoring
 * - Liquidity factor scoring
 * - Historical factor scoring
 * - Weighted confidence calculation
 * - Adaptive thresholds
 */

import { DEFAULT_CONFIDENCE_WEIGHTS, ConfidenceWeights } from './detector-config';

// ============================================================================
// Types
// ============================================================================

export interface MultiFactorConfidenceInput {
  // Gas price factors
  transaction_gas_price_gwei: number;
  network_avg_gas_price_gwei: number;
  gas_premium_percentage: number;
  
  // Timing factors
  time_difference_seconds: number;
  block_position: number; // Position in block (0 = first)
  mempool_time_seconds?: number;
  
  // Volume factors
  transaction_value_usd: number;
  pool_liquidity_usd: number;
  volume_to_liquidity_ratio: number;
  
  // Liquidity factors
  pool_depth_usd: number;
  estimated_slippage_percentage: number;
  liquidity_concentration: number; // 0-1, higher = more concentrated
  
  // Historical factors
  bot_success_rate?: number; // 0-1
  bot_total_transactions?: number;
  pattern_historical_accuracy?: number; // 0-1
}

export interface MultiFactorConfidenceOutput {
  overall_confidence: number;
  gas_price_score: number;
  timing_score: number;
  volume_score: number;
  liquidity_score: number;
  historical_score: number;
  confidence_level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  factors_breakdown: string[];
}

// ============================================================================
// Enhanced Confidence Scorer
// ============================================================================

export class EnhancedConfidenceScorer {
  private static instance: EnhancedConfidenceScorer;
  private weights: ConfidenceWeights;

  private constructor(weights?: ConfidenceWeights) {
    this.weights = weights || DEFAULT_CONFIDENCE_WEIGHTS;
  }

  public static getInstance(weights?: ConfidenceWeights): EnhancedConfidenceScorer {
    if (!EnhancedConfidenceScorer.instance) {
      EnhancedConfidenceScorer.instance = new EnhancedConfidenceScorer(weights);
    }
    return EnhancedConfidenceScorer.instance;
  }

  /**
   * Calculate multi-factor confidence score
   */
  public calculateConfidence(input: MultiFactorConfidenceInput): MultiFactorConfidenceOutput {
    const gasPriceScore = this.calculateGasPriceScore(input);
    const timingScore = this.calculateTimingScore(input);
    const volumeScore = this.calculateVolumeScore(input);
    const liquidityScore = this.calculateLiquidityScore(input);
    const historicalScore = this.calculateHistoricalScore(input);

    // Weighted average
    const overallConfidence = 
      gasPriceScore * this.weights.gas_price_factor +
      timingScore * this.weights.timing_factor +
      volumeScore * this.weights.volume_factor +
      liquidityScore * this.weights.liquidity_factor +
      historicalScore * this.weights.historical_factor;

    const confidenceLevel = this.getConfidenceLevel(overallConfidence);
    const factorsBreakdown = this.generateFactorsBreakdown({
      gasPriceScore,
      timingScore,
      volumeScore,
      liquidityScore,
      historicalScore,
    });

    return {
      overall_confidence: Math.round(overallConfidence),
      gas_price_score: Math.round(gasPriceScore),
      timing_score: Math.round(timingScore),
      volume_score: Math.round(volumeScore),
      liquidity_score: Math.round(liquidityScore),
      historical_score: Math.round(historicalScore),
      confidence_level: confidenceLevel,
      factors_breakdown: factorsBreakdown,
    };
  }

  /**
   * Calculate gas price factor score (0-100)
   * Higher gas price relative to network = higher confidence
   */
  private calculateGasPriceScore(input: MultiFactorConfidenceInput): number {
    let score = 0;

    // Gas premium score (0-60 points)
    // 0% premium = 0 points, 50%+ premium = 60 points
    const premiumScore = Math.min(60, input.gas_premium_percentage * 1.2);
    score += premiumScore;

    // Absolute gas price score (0-40 points)
    // Higher absolute gas = more serious intent
    const gasPriceRatio = input.transaction_gas_price_gwei / input.network_avg_gas_price_gwei;
    const absoluteScore = Math.min(40, gasPriceRatio * 20);
    score += absoluteScore;

    return Math.min(100, score);
  }

  /**
   * Calculate timing factor score (0-100)
   * Tighter timing = higher confidence
   */
  private calculateTimingScore(input: MultiFactorConfidenceInput): number {
    let score = 0;

    // Time difference score (0-50 points)
    // <1s = 50 points, 1-5s = 40 points, 5-30s = 30 points, >30s = 10 points
    if (input.time_difference_seconds < 1) {
      score += 50;
    } else if (input.time_difference_seconds < 5) {
      score += 40;
    } else if (input.time_difference_seconds < 30) {
      score += 30;
    } else {
      score += 10;
    }

    // Block position score (0-30 points)
    // First in block = 30 points, gradually decrease
    const positionScore = Math.max(0, 30 - input.block_position * 2);
    score += positionScore;

    // Mempool time score (0-20 points)
    if (input.mempool_time_seconds !== undefined) {
      // Shorter mempool time = more sophisticated bot
      if (input.mempool_time_seconds < 1) {
        score += 20;
      } else if (input.mempool_time_seconds < 5) {
        score += 15;
      } else if (input.mempool_time_seconds < 30) {
        score += 10;
      } else {
        score += 5;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Calculate volume factor score (0-100)
   * Larger volume relative to liquidity = higher confidence
   */
  private calculateVolumeScore(input: MultiFactorConfidenceInput): number {
    let score = 0;

    // Volume to liquidity ratio score (0-60 points)
    // Higher ratio = more significant trade
    const ratioScore = Math.min(60, input.volume_to_liquidity_ratio * 600);
    score += ratioScore;

    // Absolute volume score (0-40 points)
    // Larger absolute volume = more serious opportunity
    if (input.transaction_value_usd >= 1000000) {
      score += 40;
    } else if (input.transaction_value_usd >= 100000) {
      score += 30;
    } else if (input.transaction_value_usd >= 10000) {
      score += 20;
    } else if (input.transaction_value_usd >= 1000) {
      score += 10;
    } else {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate liquidity factor score (0-100)
   * Deeper liquidity + lower slippage = higher confidence
   */
  private calculateLiquidityScore(input: MultiFactorConfidenceInput): number {
    let score = 0;

    // Pool depth score (0-40 points)
    if (input.pool_depth_usd >= 10000000) {
      score += 40;
    } else if (input.pool_depth_usd >= 1000000) {
      score += 30;
    } else if (input.pool_depth_usd >= 100000) {
      score += 20;
    } else {
      score += 10;
    }

    // Slippage score (0-40 points)
    // Lower slippage = higher confidence
    if (input.estimated_slippage_percentage < 0.1) {
      score += 40;
    } else if (input.estimated_slippage_percentage < 0.5) {
      score += 30;
    } else if (input.estimated_slippage_percentage < 1.0) {
      score += 20;
    } else if (input.estimated_slippage_percentage < 3.0) {
      score += 10;
    } else {
      score += 5;
    }

    // Liquidity concentration score (0-20 points)
    // More concentrated = easier to predict
    const concentrationScore = input.liquidity_concentration * 20;
    score += concentrationScore;

    return Math.min(100, score);
  }

  /**
   * Calculate historical factor score (0-100)
   * Better historical performance = higher confidence
   */
  private calculateHistoricalScore(input: MultiFactorConfidenceInput): number {
    let score = 50; // Default score if no historical data

    // Bot success rate score (0-50 points)
    if (input.bot_success_rate !== undefined) {
      score = input.bot_success_rate * 50;
    }

    // Bot experience score (0-30 points)
    if (input.bot_total_transactions !== undefined) {
      if (input.bot_total_transactions >= 1000) {
        score += 30;
      } else if (input.bot_total_transactions >= 100) {
        score += 20;
      } else if (input.bot_total_transactions >= 10) {
        score += 10;
      } else {
        score += 5;
      }
    }

    // Pattern accuracy score (0-20 points)
    if (input.pattern_historical_accuracy !== undefined) {
      score += input.pattern_historical_accuracy * 20;
    }

    return Math.min(100, score);
  }

  /**
   * Get confidence level from score
   */
  private getConfidenceLevel(score: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (score >= 90) return 'very_high';
    if (score >= 75) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'low';
    return 'very_low';
  }

  /**
   * Generate human-readable factors breakdown
   */
  private generateFactorsBreakdown(scores: {
    gasPriceScore: number;
    timingScore: number;
    volumeScore: number;
    liquidityScore: number;
    historicalScore: number;
  }): string[] {
    const breakdown: string[] = [];

    if (scores.gasPriceScore >= 80) {
      breakdown.push('Very high gas premium indicates strong intent');
    } else if (scores.gasPriceScore >= 60) {
      breakdown.push('High gas premium suggests competitive opportunity');
    }

    if (scores.timingScore >= 80) {
      breakdown.push('Excellent timing precision');
    } else if (scores.timingScore >= 60) {
      breakdown.push('Good timing coordination');
    }

    if (scores.volumeScore >= 80) {
      breakdown.push('Large volume relative to liquidity');
    } else if (scores.volumeScore >= 60) {
      breakdown.push('Significant transaction volume');
    }

    if (scores.liquidityScore >= 80) {
      breakdown.push('Deep liquidity with low slippage');
    } else if (scores.liquidityScore >= 60) {
      breakdown.push('Adequate liquidity for execution');
    }

    if (scores.historicalScore >= 80) {
      breakdown.push('Proven bot with high success rate');
    } else if (scores.historicalScore >= 60) {
      breakdown.push('Experienced bot with good track record');
    }

    return breakdown;
  }
}

