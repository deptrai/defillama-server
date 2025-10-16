/**
 * Sandwich Risk Calculator
 * Story: 4.1.2 - MEV Protection Insights
 * 
 * Calculates sandwich attack risk based on transaction characteristics
 * 
 * Risk Factors:
 * - Size Risk (40%): Transaction size relative to pool liquidity
 * - Slippage Risk (30%): Slippage tolerance setting
 * - Liquidity Risk (20%): Pool liquidity depth
 * - Congestion Risk (10%): Network congestion level
 * 
 * Output: Risk score 0-100
 */

// ============================================================================
// Types
// ============================================================================

export interface SandwichRiskInput {
  // Transaction details
  amount_in_usd: number;
  slippage_tolerance_pct: number;
  
  // Pool details
  pool_liquidity_usd: number;
  pool_volume_24h_usd: number;
  
  // Network details
  gas_price_gwei: number;
  mempool_pending_txs: number;
  
  // Optional
  chain_id?: string;
}

export interface SandwichRiskFactors {
  size_risk: number;           // 0-100
  slippage_risk: number;       // 0-100
  liquidity_risk: number;      // 0-100
  congestion_risk: number;     // 0-100
}

export interface SandwichRiskResult {
  overall_risk: number;        // 0-100
  risk_factors: SandwichRiskFactors;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
}

// ============================================================================
// Sandwich Risk Calculator
// ============================================================================

export class SandwichRiskCalculator {
  private static instance: SandwichRiskCalculator;

  // Risk weights (total = 100%)
  private readonly WEIGHTS = {
    size: 0.40,        // 40%
    slippage: 0.30,    // 30%
    liquidity: 0.20,   // 20%
    congestion: 0.10,  // 10%
  };

  // Risk thresholds
  private readonly THRESHOLDS = {
    // Size risk: transaction size as % of pool liquidity
    size_low: 0.01,      // <1% of pool = low risk
    size_medium: 0.05,   // 1-5% of pool = medium risk
    size_high: 0.10,     // 5-10% of pool = high risk
    // >10% of pool = critical risk
    
    // Slippage risk: slippage tolerance %
    slippage_low: 0.50,     // <0.5% = low risk
    slippage_medium: 1.00,  // 0.5-1% = medium risk
    slippage_high: 2.00,    // 1-2% = high risk
    // >2% = critical risk
    
    // Liquidity risk: pool liquidity USD
    liquidity_high: 10000000,  // >$10M = low risk
    liquidity_medium: 1000000, // $1M-$10M = medium risk
    liquidity_low: 100000,     // $100K-$1M = high risk
    // <$100K = critical risk
    
    // Congestion risk: gas price gwei
    congestion_low: 50,      // <50 gwei = low risk
    congestion_medium: 100,  // 50-100 gwei = medium risk
    congestion_high: 200,    // 100-200 gwei = high risk
    // >200 gwei = critical risk
  };

  private constructor() {}

  public static getInstance(): SandwichRiskCalculator {
    if (!SandwichRiskCalculator.instance) {
      SandwichRiskCalculator.instance = new SandwichRiskCalculator();
    }
    return SandwichRiskCalculator.instance;
  }

  /**
   * Calculate sandwich attack risk
   */
  public calculateRisk(input: SandwichRiskInput): SandwichRiskResult {
    // Calculate individual risk factors
    const sizeRisk = this.calculateSizeRisk(input);
    const slippageRisk = this.calculateSlippageRisk(input);
    const liquidityRisk = this.calculateLiquidityRisk(input);
    const congestionRisk = this.calculateCongestionRisk(input);

    // Calculate weighted overall risk
    const overallRisk = 
      sizeRisk * this.WEIGHTS.size +
      slippageRisk * this.WEIGHTS.slippage +
      liquidityRisk * this.WEIGHTS.liquidity +
      congestionRisk * this.WEIGHTS.congestion;

    // Determine risk level
    const riskLevel = this.getRiskLevel(overallRisk);

    // Generate explanation
    const explanation = this.generateExplanation(
      overallRisk,
      { size_risk: sizeRisk, slippage_risk: slippageRisk, liquidity_risk: liquidityRisk, congestion_risk: congestionRisk }
    );

    return {
      overall_risk: Math.round(overallRisk * 100) / 100,
      risk_factors: {
        size_risk: Math.round(sizeRisk * 100) / 100,
        slippage_risk: Math.round(slippageRisk * 100) / 100,
        liquidity_risk: Math.round(liquidityRisk * 100) / 100,
        congestion_risk: Math.round(congestionRisk * 100) / 100,
      },
      risk_level: riskLevel,
      explanation,
    };
  }

  /**
   * Calculate size risk (0-100)
   * Based on transaction size relative to pool liquidity
   */
  private calculateSizeRisk(input: SandwichRiskInput): number {
    const { amount_in_usd, pool_liquidity_usd } = input;

    if (pool_liquidity_usd === 0) return 100; // Critical risk if no liquidity

    const sizeRatio = amount_in_usd / pool_liquidity_usd;

    if (sizeRatio < this.THRESHOLDS.size_low) return 10;        // <1% = low risk
    if (sizeRatio < this.THRESHOLDS.size_medium) return 40;     // 1-5% = medium risk
    if (sizeRatio < this.THRESHOLDS.size_high) return 70;       // 5-10% = high risk
    return 95;                                                   // >10% = critical risk
  }

  /**
   * Calculate slippage risk (0-100)
   * Based on slippage tolerance setting
   */
  private calculateSlippageRisk(input: SandwichRiskInput): number {
    const { slippage_tolerance_pct } = input;

    if (slippage_tolerance_pct < this.THRESHOLDS.slippage_low) return 15;      // <0.5% = low risk
    if (slippage_tolerance_pct < this.THRESHOLDS.slippage_medium) return 45;   // 0.5-1% = medium risk
    if (slippage_tolerance_pct < this.THRESHOLDS.slippage_high) return 75;     // 1-2% = high risk
    return 95;                                                                  // >2% = critical risk
  }

  /**
   * Calculate liquidity risk (0-100)
   * Based on pool liquidity depth
   */
  private calculateLiquidityRisk(input: SandwichRiskInput): number {
    const { pool_liquidity_usd } = input;

    if (pool_liquidity_usd >= this.THRESHOLDS.liquidity_high) return 10;       // >$10M = low risk
    if (pool_liquidity_usd >= this.THRESHOLDS.liquidity_medium) return 40;     // $1M-$10M = medium risk
    if (pool_liquidity_usd >= this.THRESHOLDS.liquidity_low) return 70;        // $100K-$1M = high risk
    return 95;                                                                  // <$100K = critical risk
  }

  /**
   * Calculate congestion risk (0-100)
   * Based on network congestion level
   */
  private calculateCongestionRisk(input: SandwichRiskInput): number {
    const { gas_price_gwei } = input;

    if (gas_price_gwei < this.THRESHOLDS.congestion_low) return 10;        // <50 gwei = low risk
    if (gas_price_gwei < this.THRESHOLDS.congestion_medium) return 40;     // 50-100 gwei = medium risk
    if (gas_price_gwei < this.THRESHOLDS.congestion_high) return 70;       // 100-200 gwei = high risk
    return 95;                                                              // >200 gwei = critical risk
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
  private generateExplanation(overallRisk: number, factors: SandwichRiskFactors): string {
    const parts: string[] = [];

    // Overall risk
    const riskLevel = this.getRiskLevel(overallRisk);
    parts.push(`Overall sandwich risk: ${riskLevel.toUpperCase()} (${Math.round(overallRisk)}/100)`);

    // Dominant factors
    const dominantFactors: string[] = [];
    if (factors.size_risk >= 70) dominantFactors.push('large transaction size');
    if (factors.slippage_risk >= 70) dominantFactors.push('high slippage tolerance');
    if (factors.liquidity_risk >= 70) dominantFactors.push('low pool liquidity');
    if (factors.congestion_risk >= 70) dominantFactors.push('high network congestion');

    if (dominantFactors.length > 0) {
      parts.push(`High risk due to: ${dominantFactors.join(', ')}`);
    }

    // Recommendations
    if (overallRisk >= 60) {
      const recommendations: string[] = [];
      if (factors.slippage_risk >= 60) recommendations.push('reduce slippage tolerance');
      if (factors.size_risk >= 60) recommendations.push('split into smaller transactions');
      if (factors.congestion_risk >= 60) recommendations.push('wait for lower gas prices');
      
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

export const sandwichRiskCalculator = SandwichRiskCalculator.getInstance();

