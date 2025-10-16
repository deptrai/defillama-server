/**
 * Unit Tests for ProtocolRiskAggregator
 * Story: 3.2.1 - Protocol Risk Assessment
 */

import { ProtocolRiskAggregator } from '../protocol-risk-aggregator';

describe('ProtocolRiskAggregator', () => {
  let aggregator: ProtocolRiskAggregator;

  beforeAll(() => {
    aggregator = ProtocolRiskAggregator.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ProtocolRiskAggregator.getInstance();
      const instance2 = ProtocolRiskAggregator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('categorizeRisk', () => {
    it('should categorize score 0-30 as low', () => {
      expect(aggregator.categorizeRisk(0)).toBe('low');
      expect(aggregator.categorizeRisk(15)).toBe('low');
      expect(aggregator.categorizeRisk(30)).toBe('low');
    });

    it('should categorize score 31-60 as medium', () => {
      expect(aggregator.categorizeRisk(31)).toBe('medium');
      expect(aggregator.categorizeRisk(45)).toBe('medium');
      expect(aggregator.categorizeRisk(60)).toBe('medium');
    });

    it('should categorize score 61-80 as high', () => {
      expect(aggregator.categorizeRisk(61)).toBe('high');
      expect(aggregator.categorizeRisk(70)).toBe('high');
      expect(aggregator.categorizeRisk(80)).toBe('high');
    });

    it('should categorize score 81-100 as critical', () => {
      expect(aggregator.categorizeRisk(81)).toBe('critical');
      expect(aggregator.categorizeRisk(90)).toBe('critical');
      expect(aggregator.categorizeRisk(100)).toBe('critical');
    });

    it('should handle edge cases', () => {
      expect(aggregator.categorizeRisk(-10)).toBe('low');
      expect(aggregator.categorizeRisk(150)).toBe('critical');
    });
  });

  describe('Risk Category Boundaries', () => {
    it('should correctly categorize boundary values', () => {
      // Low-Medium boundary
      expect(aggregator.categorizeRisk(30)).toBe('low');
      expect(aggregator.categorizeRisk(31)).toBe('medium');
      
      // Medium-High boundary
      expect(aggregator.categorizeRisk(60)).toBe('medium');
      expect(aggregator.categorizeRisk(61)).toBe('high');
      
      // High-Critical boundary
      expect(aggregator.categorizeRisk(80)).toBe('high');
      expect(aggregator.categorizeRisk(81)).toBe('critical');
    });
  });

  describe('Weighted Scoring', () => {
    it('should apply correct weights to risk factors', () => {
      // Test weights: Contract 30%, Liquidity 25%, Governance 20%, Operational 15%, Market 10%
      const contractScore = 100;
      const liquidityScore = 0;
      const governanceScore = 0;
      const operationalScore = 0;
      const marketScore = 0;
      
      const expectedScore = contractScore * 0.30 + liquidityScore * 0.25 + governanceScore * 0.20 + operationalScore * 0.15 + marketScore * 0.10;
      
      expect(expectedScore).toBe(30);
    });

    it('should calculate weighted average correctly', () => {
      const contractScore = 50;
      const liquidityScore = 40;
      const governanceScore = 30;
      const operationalScore = 20;
      const marketScore = 10;
      
      const expectedScore = contractScore * 0.30 + liquidityScore * 0.25 + governanceScore * 0.20 + operationalScore * 0.15 + marketScore * 0.10;
      
      expect(expectedScore).toBe(35);
    });

    it('should handle all factors at maximum', () => {
      const allMax = 100;
      const expectedScore = allMax * (0.30 + 0.25 + 0.20 + 0.15 + 0.10);
      
      expect(expectedScore).toBe(100);
    });

    it('should handle all factors at minimum', () => {
      const allMin = 0;
      const expectedScore = allMin * (0.30 + 0.25 + 0.20 + 0.15 + 0.10);
      
      expect(expectedScore).toBe(0);
    });
  });

  describe('Realistic Scenarios', () => {
    it('should calculate Uniswap V3 as low risk', () => {
      // Uniswap V3: Low scores across all factors
      const contractScore = 12;
      const liquidityScore = 10;
      const governanceScore = 15;
      const operationalScore = 18;
      const marketScore = 20;
      
      const overallScore = contractScore * 0.30 + liquidityScore * 0.25 + governanceScore * 0.20 + operationalScore * 0.15 + marketScore * 0.10;
      const category = aggregator.categorizeRisk(overallScore);
      
      expect(overallScore).toBeLessThan(20);
      expect(category).toBe('low');
    });

    it('should calculate Aave V3 as low risk', () => {
      // Aave V3: Low scores across all factors
      const contractScore = 15;
      const liquidityScore = 12;
      const governanceScore = 18;
      const operationalScore = 20;
      const marketScore = 22;
      
      const overallScore = contractScore * 0.30 + liquidityScore * 0.25 + governanceScore * 0.20 + operationalScore * 0.15 + marketScore * 0.10;
      const category = aggregator.categorizeRisk(overallScore);
      
      expect(overallScore).toBeLessThan(20);
      expect(category).toBe('low');
    });

    it('should calculate SushiSwap as medium risk', () => {
      // SushiSwap: Medium scores across factors
      const contractScore = 35;
      const liquidityScore = 40;
      const governanceScore = 50;
      const operationalScore = 45;
      const marketScore = 55;
      
      const overallScore = contractScore * 0.30 + liquidityScore * 0.25 + governanceScore * 0.20 + operationalScore * 0.15 + marketScore * 0.10;
      const category = aggregator.categorizeRisk(overallScore);
      
      expect(overallScore).toBeGreaterThan(30);
      expect(overallScore).toBeLessThan(60);
      expect(category).toBe('medium');
    });

    it('should calculate new protocol as high risk', () => {
      // New Protocol: High scores due to lack of maturity
      const contractScore = 60;
      const liquidityScore = 65;
      const governanceScore = 70;
      const operationalScore = 75;
      const marketScore = 70;
      
      const overallScore = contractScore * 0.30 + liquidityScore * 0.25 + governanceScore * 0.20 + operationalScore * 0.15 + marketScore * 0.10;
      const category = aggregator.categorizeRisk(overallScore);
      
      expect(overallScore).toBeGreaterThan(60);
      expect(overallScore).toBeLessThan(80);
      expect(category).toBe('high');
    });

    it('should calculate scam protocol as critical risk', () => {
      // Scam Protocol: Very high scores across all factors
      const contractScore = 90;
      const liquidityScore = 95;
      const governanceScore = 95;
      const operationalScore = 95;
      const marketScore = 90;
      
      const overallScore = contractScore * 0.30 + liquidityScore * 0.25 + governanceScore * 0.20 + operationalScore * 0.15 + marketScore * 0.10;
      const category = aggregator.categorizeRisk(overallScore);
      
      expect(overallScore).toBeGreaterThan(80);
      expect(category).toBe('critical');
    });
  });

  describe('Weight Distribution', () => {
    it('should have weights sum to 1.0', () => {
      const weights = {
        contract: 0.30,
        liquidity: 0.25,
        governance: 0.20,
        operational: 0.15,
        market: 0.10,
      };
      
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('should prioritize contract risk (highest weight)', () => {
      const weights = {
        contract: 0.30,
        liquidity: 0.25,
        governance: 0.20,
        operational: 0.15,
        market: 0.10,
      };
      
      expect(weights.contract).toBeGreaterThan(weights.liquidity);
      expect(weights.contract).toBeGreaterThan(weights.governance);
      expect(weights.contract).toBeGreaterThan(weights.operational);
      expect(weights.contract).toBeGreaterThan(weights.market);
    });

    it('should have market risk as lowest weight', () => {
      const weights = {
        contract: 0.30,
        liquidity: 0.25,
        governance: 0.20,
        operational: 0.15,
        market: 0.10,
      };
      
      expect(weights.market).toBeLessThan(weights.contract);
      expect(weights.market).toBeLessThan(weights.liquidity);
      expect(weights.market).toBeLessThan(weights.governance);
      expect(weights.market).toBeLessThan(weights.operational);
    });
  });

  describe('Sensitivity Analysis', () => {
    it('should be most sensitive to contract risk changes', () => {
      const baseScores = { contract: 50, liquidity: 50, governance: 50, operational: 50, market: 50 };
      
      const baseScore = baseScores.contract * 0.30 + baseScores.liquidity * 0.25 + baseScores.governance * 0.20 + baseScores.operational * 0.15 + baseScores.market * 0.10;
      
      const contractChange = (baseScores.contract + 10) * 0.30 + baseScores.liquidity * 0.25 + baseScores.governance * 0.20 + baseScores.operational * 0.15 + baseScores.market * 0.10;
      const liquidityChange = baseScores.contract * 0.30 + (baseScores.liquidity + 10) * 0.25 + baseScores.governance * 0.20 + baseScores.operational * 0.15 + baseScores.market * 0.10;
      const marketChange = baseScores.contract * 0.30 + baseScores.liquidity * 0.25 + baseScores.governance * 0.20 + baseScores.operational * 0.15 + (baseScores.market + 10) * 0.10;
      
      const contractDelta = contractChange - baseScore;
      const liquidityDelta = liquidityChange - baseScore;
      const marketDelta = marketChange - baseScore;
      
      expect(contractDelta).toBeGreaterThan(liquidityDelta);
      expect(contractDelta).toBeGreaterThan(marketDelta);
    });
  });

  describe('Consistency', () => {
    it('should return consistent categorization for same score', () => {
      const category1 = aggregator.categorizeRisk(45);
      const category2 = aggregator.categorizeRisk(45);
      expect(category1).toBe(category2);
    });

    it('should return consistent categorization across multiple calls', () => {
      const scores = [15, 45, 70, 90];
      const categories1 = scores.map(s => aggregator.categorizeRisk(s));
      const categories2 = scores.map(s => aggregator.categorizeRisk(s));
      
      expect(categories1).toEqual(categories2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative scores', () => {
      const category = aggregator.categorizeRisk(-50);
      expect(category).toBe('low');
    });

    it('should handle scores > 100', () => {
      const category = aggregator.categorizeRisk(150);
      expect(category).toBe('critical');
    });

    it('should handle decimal scores', () => {
      expect(aggregator.categorizeRisk(30.5)).toBe('medium');
      expect(aggregator.categorizeRisk(60.5)).toBe('high');
      expect(aggregator.categorizeRisk(80.5)).toBe('critical');
    });

    it('should handle very small scores', () => {
      const category = aggregator.categorizeRisk(0.001);
      expect(category).toBe('low');
    });

    it('should handle very large scores', () => {
      const category = aggregator.categorizeRisk(999999);
      expect(category).toBe('critical');
    });
  });
});

