/**
 * Unit Tests for LiquidityRiskAnalyzer
 * Story: 3.2.1 - Protocol Risk Assessment
 */

import { LiquidityRiskAnalyzer } from '../liquidity-risk-analyzer';

describe('LiquidityRiskAnalyzer', () => {
  let analyzer: LiquidityRiskAnalyzer;

  beforeAll(() => {
    analyzer = LiquidityRiskAnalyzer.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LiquidityRiskAnalyzer.getInstance();
      const instance2 = LiquidityRiskAnalyzer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('calculateTVLScore', () => {
    it('should return low score for TVL > $1B', () => {
      const score = analyzer.calculateTVLScore(5000000000, null, null, null);
      expect(score).toBeLessThanOrEqual(20);
    });

    it('should return medium score for TVL $100M-$1B', () => {
      const score = analyzer.calculateTVLScore(500000000, null, null, null);
      expect(score).toBeGreaterThanOrEqual(20);
      expect(score).toBeLessThanOrEqual(30);
    });

    it('should return high score for TVL < $1M', () => {
      const score = analyzer.calculateTVLScore(500000, null, null, null);
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('should apply growth bonus for positive 30d change', () => {
      const stableScore = analyzer.calculateTVLScore(1000000000, null, null, 0);
      const growthScore = analyzer.calculateTVLScore(1000000000, null, null, 20);
      expect(growthScore).toBeLessThan(stableScore);
    });

    it('should apply decline penalty for negative 30d change', () => {
      const stableScore = analyzer.calculateTVLScore(1000000000, null, null, 0);
      const declineScore = analyzer.calculateTVLScore(1000000000, null, null, -30);
      expect(declineScore).toBeGreaterThan(stableScore);
    });

    it('should cap score at 100', () => {
      const score = analyzer.calculateTVLScore(100, null, null, -90);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should not go below 0', () => {
      const score = analyzer.calculateTVLScore(10000000000, null, null, 100);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateDepthScore', () => {
    it('should return low score for high depth', () => {
      const score = analyzer.calculateDepthScore(90, 100);
      expect(score).toBeLessThan(20);
    });

    it('should return high score for low depth', () => {
      const score = analyzer.calculateDepthScore(20, 5);
      expect(score).toBeGreaterThan(60);
    });

    it('should apply provider count bonus', () => {
      const fewProvidersScore = analyzer.calculateDepthScore(70, 10);
      const manyProvidersScore = analyzer.calculateDepthScore(70, 100);
      expect(manyProvidersScore).toBeLessThan(fewProvidersScore);
    });

    it('should cap score at 100', () => {
      const score = analyzer.calculateDepthScore(0, 1);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should not go below 0', () => {
      const score = analyzer.calculateDepthScore(100, 1000);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateConcentrationScore', () => {
    it('should return low score for low concentration', () => {
      const score = analyzer.calculateConcentrationScore(20, 40);
      expect(score).toBe(15);
    });

    it('should return medium score for medium concentration', () => {
      const score = analyzer.calculateConcentrationScore(45, 65);
      expect(score).toBe(35);
    });

    it('should return high score for high concentration', () => {
      const score = analyzer.calculateConcentrationScore(75, 90);
      expect(score).toBe(75);
    });

    it('should return very high score for very high concentration', () => {
      const score = analyzer.calculateConcentrationScore(92, 98);
      expect(score).toBe(90);
    });

    it('should handle edge case: 0% concentration', () => {
      const score = analyzer.calculateConcentrationScore(0, 0);
      expect(score).toBe(15);
    });

    it('should handle edge case: 100% concentration', () => {
      const score = analyzer.calculateConcentrationScore(100, 100);
      expect(score).toBe(90);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null TVL changes', () => {
      const score = analyzer.calculateTVLScore(1000000000, null, null, null);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle negative TVL', () => {
      const score = analyzer.calculateTVLScore(-1000000, null, null, null);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle zero depth score', () => {
      const score = analyzer.calculateDepthScore(0, 0);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle very large provider count', () => {
      const score = analyzer.calculateDepthScore(50, 10000);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle concentration > 100%', () => {
      const score = analyzer.calculateConcentrationScore(150, 200);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Score Ranges', () => {
    it('should return TVL scores in valid range [0, 100]', () => {
      const testCases = [
        [10000000000, null, null, 10],
        [1000000000, null, null, 0],
        [100000000, null, null, -20],
        [10000000, null, null, 5],
        [1000000, null, null, -50],
        [100000, null, null, -80],
      ];

      testCases.forEach(([tvl, change24h, change7d, change30d]) => {
        const score = analyzer.calculateTVLScore(tvl, change24h, change7d, change30d);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should return depth scores in valid range [0, 100]', () => {
      const testCases = [
        [90, 100],
        [70, 50],
        [50, 20],
        [30, 10],
        [10, 5],
      ];

      testCases.forEach(([depth, providers]) => {
        const score = analyzer.calculateDepthScore(depth, providers);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should return concentration scores in valid range [0, 100]', () => {
      const testCases = [
        [10, 20],
        [25, 45],
        [40, 60],
        [55, 75],
        [70, 85],
        [85, 95],
      ];

      testCases.forEach(([top10, top50]) => {
        const score = analyzer.calculateConcentrationScore(top10, top50);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Realistic Scenarios', () => {
    it('should score Uniswap V3 as low risk', () => {
      // Uniswap V3: $5B TVL, high depth, low concentration
      const tvlScore = analyzer.calculateTVLScore(5000000000, null, null, 5);
      const depthScore = analyzer.calculateDepthScore(85, 150);
      const concScore = analyzer.calculateConcentrationScore(18.5, 42);
      
      const overallScore = tvlScore * 0.5 + depthScore * 0.3 + concScore * 0.2;
      
      expect(overallScore).toBeLessThan(20);
    });

    it('should score small DEX as high risk', () => {
      // Small DEX: $10M TVL, low depth, high concentration
      const tvlScore = analyzer.calculateTVLScore(10000000, null, null, -20);
      const depthScore = analyzer.calculateDepthScore(30, 8);
      const concScore = analyzer.calculateConcentrationScore(75, 90);
      
      const overallScore = tvlScore * 0.5 + depthScore * 0.3 + concScore * 0.2;
      
      expect(overallScore).toBeGreaterThan(60);
    });

    it('should score scam protocol as critical risk', () => {
      // Scam: $1M TVL, very low depth, very high concentration
      const tvlScore = analyzer.calculateTVLScore(1000000, null, null, -60);
      const depthScore = analyzer.calculateDepthScore(10, 2);
      const concScore = analyzer.calculateConcentrationScore(92, 98);
      
      const overallScore = tvlScore * 0.5 + depthScore * 0.3 + concScore * 0.2;
      
      expect(overallScore).toBeGreaterThan(80);
    });
  });

  describe('Consistency', () => {
    it('should return consistent TVL scores for same inputs', () => {
      const score1 = analyzer.calculateTVLScore(1000000000, null, null, 10);
      const score2 = analyzer.calculateTVLScore(1000000000, null, null, 10);
      expect(score1).toBe(score2);
    });

    it('should return consistent depth scores', () => {
      const score1 = analyzer.calculateDepthScore(70, 50);
      const score2 = analyzer.calculateDepthScore(70, 50);
      expect(score1).toBe(score2);
    });

    it('should return consistent concentration scores', () => {
      const score1 = analyzer.calculateConcentrationScore(45, 65);
      const score2 = analyzer.calculateConcentrationScore(45, 65);
      expect(score1).toBe(score2);
    });
  });

  describe('Monotonicity', () => {
    it('should increase score as TVL decreases', () => {
      const score1 = analyzer.calculateTVLScore(10000000000, null, null, null);
      const score2 = analyzer.calculateTVLScore(1000000000, null, null, null);
      const score3 = analyzer.calculateTVLScore(100000000, null, null, null);
      const score4 = analyzer.calculateTVLScore(10000000, null, null, null);
      
      expect(score2).toBeGreaterThan(score1);
      expect(score3).toBeGreaterThan(score2);
      expect(score4).toBeGreaterThan(score3);
    });

    it('should increase score as depth decreases', () => {
      const score1 = analyzer.calculateDepthScore(90, 100);
      const score2 = analyzer.calculateDepthScore(70, 100);
      const score3 = analyzer.calculateDepthScore(50, 100);
      const score4 = analyzer.calculateDepthScore(30, 100);
      
      expect(score2).toBeGreaterThan(score1);
      expect(score3).toBeGreaterThan(score2);
      expect(score4).toBeGreaterThan(score3);
    });

    it('should increase score as concentration increases', () => {
      const score1 = analyzer.calculateConcentrationScore(20, 40);
      const score2 = analyzer.calculateConcentrationScore(40, 60);
      const score3 = analyzer.calculateConcentrationScore(60, 80);
      const score4 = analyzer.calculateConcentrationScore(80, 95);
      
      expect(score2).toBeGreaterThan(score1);
      expect(score3).toBeGreaterThan(score2);
      expect(score4).toBeGreaterThan(score3);
    });
  });
});

