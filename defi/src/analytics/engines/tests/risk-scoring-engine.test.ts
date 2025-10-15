/**
 * Risk Scoring Engine Tests
 * Story: 2.1.2 - Yield Opportunity Scanner
 */

import { RiskScoringEngine, RiskFactors } from '../risk-scoring-engine';

describe('RiskScoringEngine', () => {
  let engine: RiskScoringEngine;

  beforeEach(() => {
    engine = RiskScoringEngine.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RiskScoringEngine.getInstance();
      const instance2 = RiskScoringEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('TVL Scoring', () => {
    it('should score $10B+ TVL as lowest risk (0)', () => {
      const factors: RiskFactors = {
        tvl: 15_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.tvlScore).toBe(0);
    });

    it('should score $1B-$10B TVL as very low risk (10)', () => {
      const factors: RiskFactors = {
        tvl: 5_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.tvlScore).toBe(10);
    });

    it('should score $100M-$1B TVL as low risk (20)', () => {
      const factors: RiskFactors = {
        tvl: 500_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.tvlScore).toBe(20);
    });

    it('should score $10M-$100M TVL as medium risk (40)', () => {
      const factors: RiskFactors = {
        tvl: 50_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.tvlScore).toBe(40);
    });

    it('should score $1M-$10M TVL as medium-high risk (60)', () => {
      const factors: RiskFactors = {
        tvl: 5_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.tvlScore).toBe(60);
    });

    it('should score <$100K TVL as highest risk (100)', () => {
      const factors: RiskFactors = {
        tvl: 50_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.tvlScore).toBe(100);
    });

    it('should handle zero TVL', () => {
      const factors: RiskFactors = {
        tvl: 0,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.tvlScore).toBe(100);
    });
  });

  describe('Audit Scoring', () => {
    it('should score audited protocols as lowest risk (0)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.auditScore).toBe(0);
    });

    it('should score in-progress audits as medium-low risk (40)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'in-progress',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.auditScore).toBe(40);
    });

    it('should score unaudited protocols as high risk (80)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'unaudited',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.auditScore).toBe(80);
    });

    it('should score unknown audit status as highest risk (100)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'unknown',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.auditScore).toBe(100);
    });
  });

  describe('Age Scoring', () => {
    it('should score 5+ year protocols as lowest risk (0)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 2000,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.ageScore).toBe(0);
    });

    it('should score 3-5 year protocols as very low risk (15)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1460,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.ageScore).toBe(15);
    });

    it('should score 2-3 year protocols as low risk (30)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 900,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.ageScore).toBe(30);
    });

    it('should score 1-2 year protocols as medium risk (50)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 500,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.ageScore).toBe(50);
    });

    it('should score <3 month protocols as highest risk (100)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 60,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.ageScore).toBe(100);
    });

    it('should handle zero age', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 0,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.ageScore).toBe(100);
    });
  });

  describe('Volatility Scoring', () => {
    it('should score very low volatility (<1%) as lowest risk (0)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 0.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.volatilityScore).toBe(0);
    });

    it('should score low volatility (1-2%) as low risk (20)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 1.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.volatilityScore).toBe(20);
    });

    it('should score medium volatility (2-3%) as medium risk (40)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 2.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.volatilityScore).toBe(40);
    });

    it('should score high volatility (5-10%) as high risk (80)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 7.5,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.volatilityScore).toBe(80);
    });

    it('should score very high volatility (>10%) as highest risk (100)', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 15,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.factors.volatilityScore).toBe(100);
    });
  });

  describe('Overall Risk Score', () => {
    it('should calculate low risk for blue-chip protocol', () => {
      const factors: RiskFactors = {
        tvl: 18_500_000_000, // Lido-like
        auditStatus: 'audited',
        protocolAgeDays: 1460,
        yieldVolatility: 0.45,
      };
      const result = engine.calculateRiskScore(factors);
      expect(result.totalScore).toBeLessThanOrEqual(33);
      expect(result.category).toBe('low');
    });

    it('should calculate low-medium risk for established DeFi protocol', () => {
      const factors: RiskFactors = {
        tvl: 285_000_000, // Uniswap V3 pool
        auditStatus: 'audited',
        protocolAgeDays: 1825,
        yieldVolatility: 3.25,
      };
      const result = engine.calculateRiskScore(factors);
      // Score is 20 (low risk) due to good TVL, audit, and age
      expect(result.totalScore).toBeLessThanOrEqual(33);
      expect(result.category).toBe('low');
    });

    it('should calculate medium-high risk for new/unaudited protocol', () => {
      const factors: RiskFactors = {
        tvl: 28_500_000,
        auditStatus: 'unaudited',
        protocolAgeDays: 365,
        yieldVolatility: 8.5,
      };
      const result = engine.calculateRiskScore(factors);
      // Score is 64 (medium-high) - just below high threshold
      expect(result.totalScore).toBeGreaterThan(50);
      expect(result.totalScore).toBeLessThanOrEqual(66);
      expect(result.category).toBe('medium');
    });

    it('should include all factor scores and weights', () => {
      const factors: RiskFactors = {
        tvl: 1_000_000_000,
        auditStatus: 'audited',
        protocolAgeDays: 1095,
        yieldVolatility: 2.0,
      };
      const result = engine.calculateRiskScore(factors);
      
      expect(result.factors.tvlScore).toBeDefined();
      expect(result.factors.auditScore).toBeDefined();
      expect(result.factors.ageScore).toBeDefined();
      expect(result.factors.volatilityScore).toBeDefined();
      
      expect(result.weights.tvl).toBe(0.25);
      expect(result.weights.audit).toBe(0.30);
      expect(result.weights.age).toBe(0.20);
      expect(result.weights.volatility).toBe(0.25);
    });
  });

  describe('Risk-Adjusted Yield', () => {
    it('should calculate Sharpe ratio correctly', () => {
      const result = engine.calculateRiskAdjustedYield(12.5, 35, 2.85);
      
      // Sharpe = (12.5 - 4.5) / 2.85 = 2.81
      expect(result.sharpeRatio).toBeCloseTo(2.81, 1);
    });

    it('should calculate risk-adjusted yield correctly', () => {
      const result = engine.calculateRiskAdjustedYield(12.5, 35, 2.85);
      
      // Risk-adjusted = 12.5 * (1 - 35/100) = 8.125
      expect(result.riskAdjustedYield).toBeCloseTo(8.13, 1);
    });

    it('should handle zero volatility', () => {
      const result = engine.calculateRiskAdjustedYield(5.0, 15, 0);
      expect(result.sharpeRatio).toBe(0);
    });

    it('should return all metrics', () => {
      const result = engine.calculateRiskAdjustedYield(10.0, 25, 1.5);
      
      expect(result.apy).toBe(10.0);
      expect(result.riskScore).toBe(25);
      expect(result.sharpeRatio).toBeDefined();
      expect(result.riskAdjustedYield).toBeDefined();
    });
  });

  describe('Batch Calculations', () => {
    it('should calculate risk scores for multiple opportunities', () => {
      const opportunities = [
        {
          id: 'opp1',
          tvl: 1_000_000_000,
          auditStatus: 'audited' as const,
          protocolAgeDays: 1825,
          yieldVolatility: 0.85,
          apy: 4.25,
        },
        {
          id: 'opp2',
          tvl: 285_000_000,
          auditStatus: 'audited' as const,
          protocolAgeDays: 1825,
          yieldVolatility: 3.25,
          apy: 18.75,
        },
      ];

      const results = engine.batchCalculateRiskScores(opportunities);
      
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('opp1');
      expect(results[1].id).toBe('opp2');
      expect(results[0].riskScore.totalScore).toBeLessThan(results[1].riskScore.totalScore);
    });
  });

  describe('Configuration', () => {
    it('should return risk-free rate', () => {
      const rate = engine.getRiskFreeRate();
      expect(rate).toBe(4.5);
    });

    it('should return scoring weights', () => {
      const weights = engine.getWeights();
      expect(weights.tvl).toBe(0.25);
      expect(weights.audit).toBe(0.30);
      expect(weights.age).toBe(0.20);
      expect(weights.volatility).toBe(0.25);
      
      // Weights should sum to 1.0
      const sum = weights.tvl + weights.audit + weights.age + weights.volatility;
      expect(sum).toBe(1.0);
    });
  });
});

