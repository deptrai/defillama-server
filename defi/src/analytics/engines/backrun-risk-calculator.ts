/**
 * Backrun Risk Calculator
 * Story: 4.1.2 - MEV Protection Insights
 * 
 * Calculates backrunning risk based on transaction characteristics
 * 
 * Risk Factors:
 * - Price Impact Risk (50%): Transaction price impact on pool
 * - Liquidity Risk (30%): Pool liquidity depth
 * - Timing Risk (20%): Transaction timing and block position
 * 
 * Output: Risk score 0-100
 */

// ============================================================================
// Types
// ============================================================================

export interface BackrunRiskInput {
  // Transaction details
  amount_in_usd: number;
  expected_price_impact_pct: number;
  
  // Pool details
  pool_liquidity_usd: number;
  pool_volume_24h_usd: number;
  
  // Network details
  gas_price_gwei: number;
  block_time_seconds: number;
  
  // Optional
  chain_id?: string;
}

export interface BackrunRiskFactors {
  price_impact_risk: number;   // 0-100
  liquidity_risk: number;      // 0-100
  timing_risk: number;         // 0-100
}

export interface BackrunRiskResult {
  overall_risk: number;        // 0-100
  risk_factors: BackrunRiskFactors;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
}

// ============================================================================
// Backrun Risk Calculator
// ============================================================================

export class BackrunRiskCalculator {
  private static instance: BackrunRiskCalculator;

  // Risk weights (total = 100%)
  private readonly WEIGHTS = {
    price_impact: 0.50,  // 50%
    liquidity: 0.30,     // 30%
    timing: 0.20,        // 20%
  };

  // Risk thresholds
  private readonly THRESHOLDS = {
    // Price impact risk: expected price impact %
    price_impact_low: 0.50,      // <0.5% = low risk
    price_impact_medium: 1.00,   // 0.5-1% = medium risk
    price_impact_high: 2.00,     // 1-2% = high risk
    // >2% = critical risk
    
    // Liquidity risk: pool liquidity USD
    liquidity_high: 10000000,    // >$10M = low risk
    liquidity_medium: 1000000,   // $1M-$10M = medium risk
    liquidity_low: 100000,       // $100K-$1M = high risk
    // <$100K = critical risk
    
    // Timing risk: block time seconds
    timing_fast: 5,              // <5s = critical risk
    timing_medium: 12,           // 5-12s = high risk
    timing_slow: 30,             // 12-30s = medium risk
    // >30s = low risk
  };

  private constructor() {}

  public static getInstance(): BackrunRiskCalculator {
    if (!BackrunRiskCalculator.instance) {
      BackrunRiskCalculator.instance = new BackrunRiskCalculator();
    }
    return BackrunRiskCalculator.instance;
  }

  /**
   * Calculate backrunning risk
   */
  public calculateRisk(input: BackrunRiskInput): BackrunRiskResult {
    // Calculate individual risk factors
    const priceImpactRisk = this.calculatePriceImpactRisk(input);
    const liquidityRisk = this.calculateLiquidityRisk(input);
    const timingRisk = this.calculateTimingRisk(input);

    // Calculate weighted overall risk
    const overallRisk = 
      priceImpactRisk * this.WEIGHTS.price_impact +
      liquidityRisk * this.WEIGHTS.liquidity +
      timingRisk * this.WEIGHTS.timing;

    // Determine risk level
    const riskLevel = this.getRiskLevel(overallRisk);

    // Generate explanation
    const explanation = this.generateExplanation(
      overallRisk,
      { price_impact_risk: priceImpactRisk, liquidity_risk: liquidityRisk, timing_risk: timingRisk }
    );

    return {
      overall_risk: Math.round(overallRisk * 100) / 100,
      risk_factors: {
        price_impact_risk: Math.round(priceImpactRisk * 100) / 100,
        liquidity_risk: Math.round(liquidityRisk * 100) / 100,
        timing_risk: Math.round(timingRisk * 100) / 100,
      },
      risk_level: riskLevel,
      explanation,
    };
  }

  /**
   * Calculate price impact risk (0-100)
   * Based on expected price impact on pool
   */
  private calculatePriceImpactRisk(input: BackrunRiskInput): number {
    const { expected_price_impact_pct } = input;

    if (expected_price_impact_pct < this.THRESHOLDS.price_impact_low) return 15;      // <0.5% = low risk
    if (expected_price_impact_pct < this.THRESHOLDS.price_impact_medium) return 45;   // 0.5-1% = medium risk
    if (expected_price_impact_pct < this.THRESHOLDS.price_impact_high) return 75;     // 1-2% = high risk
    return 95;                                                                         // >2% = critical risk
  }

  /**
   * Calculate liquidity risk (0-100)
   * Based on pool liquidity depth
   */
  private calculateLiquidityRisk(input: BackrunRiskInput): number {
    const { pool_liquidity_usd } = input;

    if (pool_liquidity_usd >= this.THRESHOLDS.liquidity_high) return 10;       // >$10M = low risk
    if (pool_liquidity_usd >= this.THRESHOLDS.liquidity_medium) return 40;     // $1M-$10M = medium risk
    if (pool_liquidity_usd >= this.THRESHOLDS.liquidity_low) return 70;        // $100K-$1M = high risk
    return 95;                                                                  // <$100K = critical risk
  }

  /**
   * Calculate timing risk (0-100)
   * Based on block time and transaction timing
   */
  private calculateTimingRisk(input: BackrunRiskInput): number {
    const { block_time_seconds } = input;

    // Faster block times = higher risk (more opportunity for backrunning)
    if (block_time_seconds < this.THRESHOLDS.timing_fast) return 90;       // <5s = critical risk
    if (block_time_seconds < this.THRESHOLDS.timing_medium) return 70;     // 5-12s = high risk
    if (block_time_seconds < this.THRESHOLDS.timing_slow) return 40;       // 12-30s = medium risk
    return 15;                                                              // >30s = low risk
  }

  /**
   * Determine risk level from overall risk score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 30) return 'low';
    if (score < 60) return 'medium';
    if (score < 80) return 'high';
    return 'critical';
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(overallRisk: number, factors: BackrunRiskFactors): string {
    const parts: string[] = [];

    // Overall risk
    const riskLevel = this.getRiskLevel(overallRisk);
    parts.push(`Overall backrun risk: ${riskLevel.toUpperCase()} (${Math.round(overallRisk)}/100)`);

    // Dominant factors
    const dominantFactors: string[] = [];
    if (factors.price_impact_risk >= 70) dominantFactors.push('high price impact');
    if (factors.liquidity_risk >= 70) dominantFactors.push('low pool liquidity');
    if (factors.timing_risk >= 70) dominantFactors.push('fast block times');

    if (dominantFactors.length > 0) {
      parts.push(`High risk due to: ${dominantFactors.join(', ')}`);
    }

    // Recommendations
    if (overallRisk >= 60) {
      const recommendations: string[] = [];
      if (factors.price_impact_risk >= 60) recommendations.push('reduce transaction size');
      if (factors.liquidity_risk >= 60) recommendations.push('use higher liquidity pools');
      if (factors.timing_risk >= 60) recommendations.push('use private mempool');
      
      if (recommendations.length > 0) {
        parts.push(`Recommendations: ${recommendations.join(', ')}`);
      }
    }

    return parts.join('. ');
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const backrunRiskCalculator = BackrunRiskCalculator.getInstance();

