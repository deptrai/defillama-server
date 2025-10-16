/**
 * Frontrun Risk Calculator
 * Story: 4.1.2 - MEV Protection Insights
 * 
 * Calculates frontrunning risk based on transaction characteristics
 * 
 * Risk Factors:
 * - Gas Price Risk (40%): Gas price relative to network average
 * - Timing Risk (30%): Transaction timing sensitivity
 * - Value Risk (20%): Transaction value attractiveness
 * - Mempool Risk (10%): Mempool visibility and congestion
 * 
 * Output: Risk score 0-100
 */

// ============================================================================
// Types
// ============================================================================

export interface FrontrunRiskInput {
  // Transaction details
  tx_value_usd: number;
  gas_price_gwei: number;
  is_time_sensitive: boolean;
  
  // Network details
  network_avg_gas_price_gwei: number;
  mempool_pending_txs: number;
  block_time_seconds: number;
  
  // Optional
  chain_id?: string;
  use_private_mempool?: boolean;
}

export interface FrontrunRiskFactors {
  gas_price_risk: number;      // 0-100
  timing_risk: number;         // 0-100
  value_risk: number;          // 0-100
  mempool_risk: number;        // 0-100
}

export interface FrontrunRiskResult {
  overall_risk: number;        // 0-100
  risk_factors: FrontrunRiskFactors;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
}

// ============================================================================
// Frontrun Risk Calculator
// ============================================================================

export class FrontrunRiskCalculator {
  private static instance: FrontrunRiskCalculator;

  // Risk weights (total = 100%)
  private readonly WEIGHTS = {
    gas_price: 0.40,   // 40%
    timing: 0.30,      // 30%
    value: 0.20,       // 20%
    mempool: 0.10,     // 10%
  };

  // Risk thresholds
  private readonly THRESHOLDS = {
    // Gas price risk: ratio to network average
    gas_price_low: 1.10,      // <10% above avg = low risk
    gas_price_medium: 1.25,   // 10-25% above avg = medium risk
    gas_price_high: 1.50,     // 25-50% above avg = high risk
    // >50% above avg = critical risk
    
    // Value risk: transaction value USD
    value_low: 1000,          // <$1K = low risk
    value_medium: 10000,      // $1K-$10K = medium risk
    value_high: 50000,        // $10K-$50K = high risk
    // >$50K = critical risk
    
    // Mempool risk: pending transactions
    mempool_low: 1000,        // <1K pending = low risk
    mempool_medium: 5000,     // 1K-5K pending = medium risk
    mempool_high: 10000,      // 5K-10K pending = high risk
    // >10K pending = critical risk
  };

  private constructor() {}

  public static getInstance(): FrontrunRiskCalculator {
    if (!FrontrunRiskCalculator.instance) {
      FrontrunRiskCalculator.instance = new FrontrunRiskCalculator();
    }
    return FrontrunRiskCalculator.instance;
  }

  /**
   * Calculate frontrunning risk
   */
  public calculateRisk(input: FrontrunRiskInput): FrontrunRiskResult {
    // If using private mempool, risk is significantly reduced
    if (input.use_private_mempool) {
      return this.calculatePrivateMempoolRisk(input);
    }

    // Calculate individual risk factors
    const gasPriceRisk = this.calculateGasPriceRisk(input);
    const timingRisk = this.calculateTimingRisk(input);
    const valueRisk = this.calculateValueRisk(input);
    const mempoolRisk = this.calculateMempoolRisk(input);

    // Calculate weighted overall risk
    const overallRisk = 
      gasPriceRisk * this.WEIGHTS.gas_price +
      timingRisk * this.WEIGHTS.timing +
      valueRisk * this.WEIGHTS.value +
      mempoolRisk * this.WEIGHTS.mempool;

    // Determine risk level
    const riskLevel = this.getRiskLevel(overallRisk);

    // Generate explanation
    const explanation = this.generateExplanation(
      overallRisk,
      { gas_price_risk: gasPriceRisk, timing_risk: timingRisk, value_risk: valueRisk, mempool_risk: mempoolRisk }
    );

    return {
      overall_risk: Math.round(overallRisk * 100) / 100,
      risk_factors: {
        gas_price_risk: Math.round(gasPriceRisk * 100) / 100,
        timing_risk: Math.round(timingRisk * 100) / 100,
        value_risk: Math.round(valueRisk * 100) / 100,
        mempool_risk: Math.round(mempoolRisk * 100) / 100,
      },
      risk_level: riskLevel,
      explanation,
    };
  }

  /**
   * Calculate risk for private mempool transactions
   */
  private calculatePrivateMempoolRisk(input: FrontrunRiskInput): FrontrunRiskResult {
    // Private mempool significantly reduces frontrun risk
    const baseRisk = 15; // Base risk even with private mempool
    
    return {
      overall_risk: baseRisk,
      risk_factors: {
        gas_price_risk: 10,
        timing_risk: 15,
        value_risk: 20,
        mempool_risk: 5,
      },
      risk_level: 'low',
      explanation: 'Using private mempool significantly reduces frontrunning risk',
    };
  }

  /**
   * Calculate gas price risk (0-100)
   * Based on gas price relative to network average
   */
  private calculateGasPriceRisk(input: FrontrunRiskInput): number {
    const { gas_price_gwei, network_avg_gas_price_gwei } = input;

    if (network_avg_gas_price_gwei === 0) return 50; // Unknown network conditions

    const gasPriceRatio = gas_price_gwei / network_avg_gas_price_gwei;

    if (gasPriceRatio < this.THRESHOLDS.gas_price_low) return 15;      // <10% above avg = low risk
    if (gasPriceRatio < this.THRESHOLDS.gas_price_medium) return 45;   // 10-25% above avg = medium risk
    if (gasPriceRatio < this.THRESHOLDS.gas_price_high) return 75;     // 25-50% above avg = high risk
    return 95;                                                          // >50% above avg = critical risk
  }

  /**
   * Calculate timing risk (0-100)
   * Based on transaction timing sensitivity
   */
  private calculateTimingRisk(input: FrontrunRiskInput): number {
    const { is_time_sensitive, block_time_seconds } = input;

    if (!is_time_sensitive) return 20; // Low risk if not time-sensitive

    // Time-sensitive transactions are high risk
    // Faster block times = higher risk (more opportunity for frontrunning)
    if (block_time_seconds < 5) return 90;   // <5s blocks = critical risk
    if (block_time_seconds < 12) return 70;  // 5-12s blocks = high risk
    if (block_time_seconds < 30) return 50;  // 12-30s blocks = medium risk
    return 30;                               // >30s blocks = low-medium risk
  }

  /**
   * Calculate value risk (0-100)
   * Based on transaction value attractiveness
   */
  private calculateValueRisk(input: FrontrunRiskInput): number {
    const { tx_value_usd } = input;

    if (tx_value_usd < this.THRESHOLDS.value_low) return 10;        // <$1K = low risk
    if (tx_value_usd < this.THRESHOLDS.value_medium) return 40;     // $1K-$10K = medium risk
    if (tx_value_usd < this.THRESHOLDS.value_high) return 70;       // $10K-$50K = high risk
    return 95;                                                       // >$50K = critical risk
  }

  /**
   * Calculate mempool risk (0-100)
   * Based on mempool visibility and congestion
   */
  private calculateMempoolRisk(input: FrontrunRiskInput): number {
    const { mempool_pending_txs } = input;

    if (mempool_pending_txs < this.THRESHOLDS.mempool_low) return 15;      // <1K pending = low risk
    if (mempool_pending_txs < this.THRESHOLDS.mempool_medium) return 45;   // 1K-5K pending = medium risk
    if (mempool_pending_txs < this.THRESHOLDS.mempool_high) return 75;     // 5K-10K pending = high risk
    return 95;                                                              // >10K pending = critical risk
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
  private generateExplanation(overallRisk: number, factors: FrontrunRiskFactors): string {
    const parts: string[] = [];

    // Overall risk
    const riskLevel = this.getRiskLevel(overallRisk);
    parts.push(`Overall frontrun risk: ${riskLevel.toUpperCase()} (${Math.round(overallRisk)}/100)`);

    // Dominant factors
    const dominantFactors: string[] = [];
    if (factors.gas_price_risk >= 70) dominantFactors.push('high gas price');
    if (factors.timing_risk >= 70) dominantFactors.push('time-sensitive transaction');
    if (factors.value_risk >= 70) dominantFactors.push('high transaction value');
    if (factors.mempool_risk >= 70) dominantFactors.push('congested mempool');

    if (dominantFactors.length > 0) {
      parts.push(`High risk due to: ${dominantFactors.join(', ')}`);
    }

    // Recommendations
    if (overallRisk >= 60) {
      const recommendations: string[] = [];
      if (factors.gas_price_risk >= 60) recommendations.push('reduce gas price');
      if (factors.timing_risk >= 60) recommendations.push('use private mempool');
      if (factors.value_risk >= 60) recommendations.push('split into smaller transactions');
      if (factors.mempool_risk >= 60) recommendations.push('wait for lower congestion');
      
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

export const frontrunRiskCalculator = FrontrunRiskCalculator.getInstance();

