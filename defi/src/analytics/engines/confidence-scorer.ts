/**
 * Confidence Scorer Utility
 * Story: 4.1.1 - MEV Opportunity Detection
 * 
 * Reusable confidence scoring functions for MEV opportunities
 * 
 * Features:
 * - Score pattern strength
 * - Score historical accuracy
 * - Score data quality
 * - Score execution feasibility
 * - Calculate overall confidence (0-100)
 */

import { ConfidenceFactors, ConfidenceScore } from './mev-types';

// ============================================================================
// Confidence Scorer
// ============================================================================

export class ConfidenceScorer {
  private static instance: ConfidenceScorer;

  // Scoring weights (total = 100%)
  private readonly WEIGHTS = {
    pattern_strength: 0.30,      // 30%
    historical_accuracy: 0.25,   // 25%
    data_quality: 0.25,          // 25%
    execution_feasibility: 0.20, // 20%
  };

  private constructor() {}

  public static getInstance(): ConfidenceScorer {
    if (!ConfidenceScorer.instance) {
      ConfidenceScorer.instance = new ConfidenceScorer();
    }
    return ConfidenceScorer.instance;
  }

  /**
   * Calculate overall confidence score
   */
  public calculateConfidence(factors: ConfidenceFactors): ConfidenceScore {
    const patternScore = this.scorePatternStrength(factors);
    const historicalScore = this.scoreHistoricalAccuracy(factors);
    const dataQualityScore = this.scoreDataQuality(factors);
    const feasibilityScore = this.scoreExecutionFeasibility(factors);

    // Weighted average
    const overallScore = 
      patternScore * this.WEIGHTS.pattern_strength +
      historicalScore * this.WEIGHTS.historical_accuracy +
      dataQualityScore * this.WEIGHTS.data_quality +
      feasibilityScore * this.WEIGHTS.execution_feasibility;

    return {
      overall_score: Math.round(overallScore),
      pattern_strength_score: Math.round(patternScore),
      historical_accuracy_score: Math.round(historicalScore),
      data_quality_score: Math.round(dataQualityScore),
      execution_feasibility_score: Math.round(feasibilityScore),
      confidence_level: this.getConfidenceLevel(overallScore),
    };
  }

  /**
   * Score pattern strength (0-100)
   */
  private scorePatternStrength(factors: ConfidenceFactors): number {
    let score = 0;

    // Pattern match quality (40 points)
    if (factors.pattern_match_quality === 'exact') score += 40;
    else if (factors.pattern_match_quality === 'strong') score += 30;
    else if (factors.pattern_match_quality === 'moderate') score += 20;
    else score += 10;

    // Number of confirming signals (30 points)
    const signalScore = Math.min(30, (factors.confirming_signals || 0) * 10);
    score += signalScore;

    // Pattern complexity (30 points)
    if (factors.pattern_complexity === 'simple') score += 30;
    else if (factors.pattern_complexity === 'moderate') score += 20;
    else score += 10;

    return Math.min(100, score);
  }

  /**
   * Score historical accuracy (0-100)
   */
  private scoreHistoricalAccuracy(factors: ConfidenceFactors): number {
    let score = 0;

    // Historical success rate (50 points)
    const successRate = factors.historical_success_rate || 0;
    score += successRate * 0.5;

    // Sample size (30 points)
    const sampleSize = factors.historical_sample_size || 0;
    if (sampleSize >= 100) score += 30;
    else if (sampleSize >= 50) score += 20;
    else if (sampleSize >= 10) score += 10;

    // Recency of data (20 points)
    const daysSinceLastUpdate = factors.days_since_last_update || 999;
    if (daysSinceLastUpdate <= 1) score += 20;
    else if (daysSinceLastUpdate <= 7) score += 15;
    else if (daysSinceLastUpdate <= 30) score += 10;
    else score += 5;

    return Math.min(100, score);
  }

  /**
   * Score data quality (0-100)
   */
  private scoreDataQuality(factors: ConfidenceFactors): number {
    let score = 0;

    // Data completeness (40 points)
    const completeness = factors.data_completeness_pct || 0;
    score += completeness * 0.4;

    // Data source reliability (30 points)
    if (factors.data_source_reliability === 'high') score += 30;
    else if (factors.data_source_reliability === 'medium') score += 20;
    else score += 10;

    // Data freshness (30 points)
    const dataAgeSeconds = factors.data_age_seconds || 999999;
    if (dataAgeSeconds <= 60) score += 30;        // < 1 minute
    else if (dataAgeSeconds <= 300) score += 20;  // < 5 minutes
    else if (dataAgeSeconds <= 3600) score += 10; // < 1 hour
    else score += 5;

    return Math.min(100, score);
  }

  /**
   * Score execution feasibility (0-100)
   */
  private scoreExecutionFeasibility(factors: ConfidenceFactors): number {
    let score = 0;

    // Liquidity availability (30 points)
    if (factors.liquidity_sufficient === true) score += 30;
    else if (factors.liquidity_sufficient === undefined) score += 15;

    // Gas price feasibility (25 points)
    if (factors.gas_price_acceptable === true) score += 25;
    else if (factors.gas_price_acceptable === undefined) score += 12;

    // Timing window (25 points)
    const timingWindowSeconds = factors.timing_window_seconds || 0;
    if (timingWindowSeconds >= 60) score += 25;
    else if (timingWindowSeconds >= 30) score += 20;
    else if (timingWindowSeconds >= 10) score += 15;
    else score += 10;

    // Competition level (20 points)
    if (factors.competition_level === 'low') score += 20;
    else if (factors.competition_level === 'medium') score += 12;
    else score += 5;

    return Math.min(100, score);
  }

  /**
   * Get confidence level label
   */
  private getConfidenceLevel(score: number): string {
    if (score >= 90) return 'very_high';
    if (score >= 75) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'low';
    return 'very_low';
  }

  /**
   * Score sandwich attack confidence
   */
  public scoreSandwichConfidence(
    patternMatch: boolean,
    gasOrdering: boolean,
    tokenMatch: boolean,
    timingMatch: boolean,
    profitSufficient: boolean
  ): number {
    let score = 0;

    if (patternMatch) score += 30;
    if (gasOrdering) score += 20;
    if (tokenMatch) score += 20;
    if (timingMatch) score += 15;
    if (profitSufficient) score += 15;

    return Math.min(100, score);
  }

  /**
   * Score frontrun confidence
   */
  public scoreFrontrunConfidence(
    highValueTarget: boolean,
    priceImpactSignificant: boolean,
    gasPremium: boolean,
    timingAdvantage: boolean,
    profitSufficient: boolean
  ): number {
    let score = 0;

    if (highValueTarget) score += 25;
    if (priceImpactSignificant) score += 25;
    if (gasPremium) score += 20;
    if (timingAdvantage) score += 15;
    if (profitSufficient) score += 15;

    return Math.min(100, score);
  }

  /**
   * Score arbitrage confidence
   */
  public scoreArbitrageConfidence(
    priceDifferenceSufficient: boolean,
    liquiditySufficient: boolean,
    routeValid: boolean,
    slippageAcceptable: boolean,
    profitSufficient: boolean
  ): number {
    let score = 0;

    if (priceDifferenceSufficient) score += 30;
    if (liquiditySufficient) score += 25;
    if (routeValid) score += 20;
    if (slippageAcceptable) score += 15;
    if (profitSufficient) score += 10;

    return Math.min(100, score);
  }

  /**
   * Score liquidation confidence
   */
  public scoreLiquidationConfidence(
    healthFactorBelowThreshold: boolean,
    liquidationProfitable: boolean,
    positionSizeSufficient: boolean,
    protocolSupported: boolean
  ): number {
    let score = 0;

    if (healthFactorBelowThreshold) score += 30;
    if (liquidationProfitable) score += 25;
    if (positionSizeSufficient) score += 25;
    if (protocolSupported) score += 20;

    return Math.min(100, score);
  }

  /**
   * Score backrun confidence
   */
  public scoreBackrunConfidence(
    priceMovementDetected: boolean,
    timingMatch: boolean,
    profitThresholdMet: boolean,
    liquidityAvailable: boolean
  ): number {
    let score = 0;

    if (priceMovementDetected) score += 30;
    if (timingMatch) score += 25;
    if (profitThresholdMet) score += 25;
    if (liquidityAvailable) score += 20;

    return Math.min(100, score);
  }

  /**
   * Adjust confidence based on risk factors
   */
  public adjustConfidenceForRisk(
    baseConfidence: number,
    riskFactors: {
      high_competition?: boolean;
      volatile_market?: boolean;
      low_liquidity?: boolean;
      high_gas_price?: boolean;
    }
  ): number {
    let adjustedScore = baseConfidence;

    // Reduce confidence for each risk factor
    if (riskFactors.high_competition) adjustedScore *= 0.9;
    if (riskFactors.volatile_market) adjustedScore *= 0.85;
    if (riskFactors.low_liquidity) adjustedScore *= 0.8;
    if (riskFactors.high_gas_price) adjustedScore *= 0.95;

    return Math.max(0, Math.min(100, adjustedScore));
  }

  /**
   * Check if confidence meets minimum threshold
   */
  public meetsMinimumConfidence(
    score: number,
    minThreshold: number = 75
  ): boolean {
    return score >= minThreshold;
  }

  /**
   * Calculate confidence trend
   */
  public calculateConfidenceTrend(
    historicalScores: number[]
  ): {
    trend: 'increasing' | 'decreasing' | 'stable';
    average: number;
    volatility: number;
  } {
    if (historicalScores.length < 2) {
      return {
        trend: 'stable',
        average: historicalScores[0] || 0,
        volatility: 0,
      };
    }

    const average = historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length;
    
    // Calculate trend
    const recentAvg = historicalScores.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, historicalScores.length);
    const olderAvg = historicalScores.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, historicalScores.length - 3);
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvg > olderAvg * 1.1) trend = 'increasing';
    else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';

    // Calculate volatility (standard deviation)
    const variance = historicalScores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / historicalScores.length;
    const volatility = Math.sqrt(variance);

    return { trend, average, volatility };
  }
}

// Export singleton instance
export const confidenceScorer = ConfidenceScorer.getInstance();

