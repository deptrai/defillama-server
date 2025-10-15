/**
 * Risk Scoring Engine
 * Story: 2.1.2 - Yield Opportunity Scanner
 * 
 * Calculates risk scores for yield opportunities based on:
 * - TVL (25% weight): Higher TVL = lower risk
 * - Audit Status (30% weight): Audited = lower risk
 * - Protocol Age (20% weight): Older = lower risk
 * - Yield Volatility (25% weight): Lower volatility = lower risk
 * 
 * Risk Score: 0-100 (lower = lower risk)
 * Risk Categories: low (0-33), medium (34-66), high (67-100)
 */

export interface RiskFactors {
  tvl: number;
  auditStatus: 'audited' | 'unaudited' | 'in-progress' | 'unknown';
  protocolAgeDays: number;
  yieldVolatility: number; // Standard deviation of APY
}

export interface RiskScore {
  totalScore: number; // 0-100
  category: 'low' | 'medium' | 'high';
  factors: {
    tvlScore: number;
    auditScore: number;
    ageScore: number;
    volatilityScore: number;
  };
  weights: {
    tvl: number;
    audit: number;
    age: number;
    volatility: number;
  };
}

export interface RiskAdjustedYield {
  apy: number;
  riskScore: number;
  sharpeRatio: number; // (APY - riskFreeRate) / volatility
  riskAdjustedYield: number; // APY * (1 - riskScore/100)
}

export class RiskScoringEngine {
  private static instance: RiskScoringEngine;

  // Risk scoring weights (must sum to 1.0)
  private readonly weights = {
    tvl: 0.25,
    audit: 0.30,
    age: 0.20,
    volatility: 0.25,
  };

  // Risk-free rate for Sharpe ratio calculation (e.g., US Treasury rate)
  private readonly riskFreeRate = 4.5; // 4.5% APY

  private constructor() {}

  public static getInstance(): RiskScoringEngine {
    if (!RiskScoringEngine.instance) {
      RiskScoringEngine.instance = new RiskScoringEngine();
    }
    return RiskScoringEngine.instance;
  }

  /**
   * Calculate comprehensive risk score
   */
  public calculateRiskScore(factors: RiskFactors): RiskScore {
    const tvlScore = this.calculateTVLScore(factors.tvl);
    const auditScore = this.calculateAuditScore(factors.auditStatus);
    const ageScore = this.calculateAgeScore(factors.protocolAgeDays);
    const volatilityScore = this.calculateVolatilityScore(factors.yieldVolatility);

    // Weighted sum
    const totalScore = Math.round(
      tvlScore * this.weights.tvl +
      auditScore * this.weights.audit +
      ageScore * this.weights.age +
      volatilityScore * this.weights.volatility
    );

    const category = this.getRiskCategory(totalScore);

    return {
      totalScore,
      category,
      factors: {
        tvlScore,
        auditScore,
        ageScore,
        volatilityScore,
      },
      weights: this.weights,
    };
  }

  /**
   * Calculate TVL risk score (0-100, lower = lower risk)
   * Higher TVL = more liquidity = lower risk
   */
  private calculateTVLScore(tvl: number): number {
    if (tvl <= 0) return 100;

    // Logarithmic scale: $1M = 80, $10M = 60, $100M = 40, $1B = 20, $10B+ = 0
    const logTVL = Math.log10(tvl);
    
    if (logTVL >= 10) return 0;   // $10B+
    if (logTVL >= 9) return 10;   // $1B-$10B
    if (logTVL >= 8) return 20;   // $100M-$1B
    if (logTVL >= 7) return 40;   // $10M-$100M
    if (logTVL >= 6) return 60;   // $1M-$10M
    if (logTVL >= 5) return 80;   // $100K-$1M
    return 100;                    // <$100K
  }

  /**
   * Calculate audit risk score (0-100, lower = lower risk)
   */
  private calculateAuditScore(auditStatus: string): number {
    switch (auditStatus.toLowerCase()) {
      case 'audited':
        return 0;  // Fully audited = lowest risk
      case 'in-progress':
        return 40; // Audit in progress = medium-low risk
      case 'unaudited':
        return 80; // No audit = high risk
      case 'unknown':
      default:
        return 100; // Unknown = highest risk
    }
  }

  /**
   * Calculate protocol age risk score (0-100, lower = lower risk)
   * Older protocols = more battle-tested = lower risk
   */
  private calculateAgeScore(ageDays: number): number {
    if (ageDays <= 0) return 100;

    // Age thresholds
    if (ageDays >= 1825) return 0;   // 5+ years
    if (ageDays >= 1095) return 15;  // 3-5 years
    if (ageDays >= 730) return 30;   // 2-3 years
    if (ageDays >= 365) return 50;   // 1-2 years
    if (ageDays >= 180) return 70;   // 6-12 months
    if (ageDays >= 90) return 85;    // 3-6 months
    return 100;                       // <3 months
  }

  /**
   * Calculate yield volatility risk score (0-100, lower = lower risk)
   * Lower volatility = more stable = lower risk
   */
  private calculateVolatilityScore(volatility: number): number {
    if (volatility < 0) return 100;

    // Volatility thresholds (standard deviation of APY)
    if (volatility >= 10) return 100;  // Very high volatility
    if (volatility >= 5) return 80;    // High volatility
    if (volatility >= 3) return 60;    // Medium-high volatility
    if (volatility >= 2) return 40;    // Medium volatility
    if (volatility >= 1) return 20;    // Low volatility
    return 0;                          // Very low volatility
  }

  /**
   * Get risk category from score
   */
  private getRiskCategory(score: number): 'low' | 'medium' | 'high' {
    if (score <= 33) return 'low';
    if (score <= 66) return 'medium';
    return 'high';
  }

  /**
   * Calculate risk-adjusted yield metrics
   */
  public calculateRiskAdjustedYield(
    apy: number,
    riskScore: number,
    volatility: number
  ): RiskAdjustedYield {
    // Sharpe Ratio: (Return - RiskFreeRate) / Volatility
    const excessReturn = apy - this.riskFreeRate;
    const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;

    // Risk-adjusted yield: APY discounted by risk score
    // Higher risk = lower adjusted yield
    const riskAdjustedYield = apy * (1 - riskScore / 100);

    return {
      apy,
      riskScore,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100, // 2 decimal places
      riskAdjustedYield: Math.round(riskAdjustedYield * 100) / 100,
    };
  }

  /**
   * Batch calculate risk scores for multiple opportunities
   */
  public batchCalculateRiskScores(
    opportunities: Array<{
      id: string;
      tvl: number;
      auditStatus: 'audited' | 'unaudited' | 'in-progress' | 'unknown';
      protocolAgeDays: number;
      yieldVolatility: number;
      apy: number;
    }>
  ): Array<{
    id: string;
    riskScore: RiskScore;
    riskAdjustedYield: RiskAdjustedYield;
  }> {
    return opportunities.map(opp => {
      const riskScore = this.calculateRiskScore({
        tvl: opp.tvl,
        auditStatus: opp.auditStatus,
        protocolAgeDays: opp.protocolAgeDays,
        yieldVolatility: opp.yieldVolatility,
      });

      const riskAdjustedYield = this.calculateRiskAdjustedYield(
        opp.apy,
        riskScore.totalScore,
        opp.yieldVolatility
      );

      return {
        id: opp.id,
        riskScore,
        riskAdjustedYield,
      };
    });
  }

  /**
   * Get risk-free rate (for testing/configuration)
   */
  public getRiskFreeRate(): number {
    return this.riskFreeRate;
  }

  /**
   * Get scoring weights (for testing/transparency)
   */
  public getWeights() {
    return { ...this.weights };
  }
}

// Export singleton instance
export const riskScoringEngine = RiskScoringEngine.getInstance();

