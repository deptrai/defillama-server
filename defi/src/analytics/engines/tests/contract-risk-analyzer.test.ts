/**
 * Unit Tests for ContractRiskAnalyzer
 * Story: 3.2.1 - Protocol Risk Assessment
 */

import { ContractRiskAnalyzer } from '../contract-risk-analyzer';

describe('ContractRiskAnalyzer', () => {
  let analyzer: ContractRiskAnalyzer;

  beforeAll(() => {
    analyzer = ContractRiskAnalyzer.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ContractRiskAnalyzer.getInstance();
      const instance2 = ContractRiskAnalyzer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('calculateAuditScore', () => {
    it('should return low score for audited protocol with high reputation', () => {
      const score = analyzer.calculateAuditScore('audited', 95, 1000);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(20);
    });

    it('should return medium score for audited protocol with medium reputation', () => {
      const score = analyzer.calculateAuditScore('audited', 60, 500);
      expect(score).toBeGreaterThanOrEqual(20);
      expect(score).toBeLessThanOrEqual(40);
    });

    it('should return high score for unaudited protocol', () => {
      const score = analyzer.calculateAuditScore('unaudited', null, null);
      expect(score).toBe(75);
    });

    it('should return very high score for no audit', () => {
      const score = analyzer.calculateAuditScore('none', null, null);
      expect(score).toBe(90);
    });

    it('should apply age penalty for old audits', () => {
      const recentScore = analyzer.calculateAuditScore('audited', 90, 365);
      const oldScore = analyzer.calculateAuditScore('audited', 90, 1095); // 3 years
      expect(oldScore).toBeGreaterThan(recentScore);
    });
  });

  describe('calculateVulnerabilityScore', () => {
    it('should return 0 for no vulnerabilities', () => {
      const score = analyzer.calculateVulnerabilityScore(0, 0, 0, 0);
      expect(score).toBe(0);
    });

    it('should return high score for critical vulnerabilities', () => {
      const score = analyzer.calculateVulnerabilityScore(1, 0, 0, 0);
      expect(score).toBeGreaterThanOrEqual(20);
      expect(score).toBeLessThanOrEqual(30);
    });

    it('should return very high score for multiple critical vulnerabilities', () => {
      const score = analyzer.calculateVulnerabilityScore(3, 2, 1, 0);
      expect(score).toBeGreaterThan(50);
    });

    it('should cap score at 100', () => {
      const score = analyzer.calculateVulnerabilityScore(10, 10, 10, 10);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should weight critical vulnerabilities highest', () => {
      const criticalScore = analyzer.calculateVulnerabilityScore(1, 0, 0, 0);
      const highScore = analyzer.calculateVulnerabilityScore(0, 1, 0, 0);
      const mediumScore = analyzer.calculateVulnerabilityScore(0, 0, 1, 0);
      const lowScore = analyzer.calculateVulnerabilityScore(0, 0, 0, 1);
      
      expect(criticalScore).toBeGreaterThan(highScore);
      expect(highScore).toBeGreaterThan(mediumScore);
      expect(mediumScore).toBeGreaterThan(lowScore);
    });
  });

  describe('calculateCodeQualityScore', () => {
    it('should return low score for low complexity and mature contract', () => {
      const score = analyzer.calculateCodeQualityScore(30, 1000);
      expect(score).toBeLessThan(40);
    });

    it('should return high score for high complexity', () => {
      const score = analyzer.calculateCodeQualityScore(90, 100);
      expect(score).toBeGreaterThan(70);
    });

    it('should apply maturity bonus for old contracts', () => {
      const newScore = analyzer.calculateCodeQualityScore(50, 100);
      const oldScore = analyzer.calculateCodeQualityScore(50, 1000);
      expect(oldScore).toBeLessThan(newScore);
    });

    it('should cap score at 100', () => {
      const score = analyzer.calculateCodeQualityScore(100, 0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should not go below 0', () => {
      const score = analyzer.calculateCodeQualityScore(0, 10000);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined auditor reputation', () => {
      const score = analyzer.calculateAuditScore('audited', null as any, 500);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle negative contract age', () => {
      const score = analyzer.calculateCodeQualityScore(50, -100);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle very large vulnerability counts', () => {
      const score = analyzer.calculateVulnerabilityScore(100, 100, 100, 100);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle complexity score > 100', () => {
      const score = analyzer.calculateCodeQualityScore(150, 500);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Score Ranges', () => {
    it('should return scores in valid range [0, 100]', () => {
      const testCases = [
        { status: 'audited', rep: 95, age: 1000 },
        { status: 'audited', rep: 50, age: 500 },
        { status: 'unaudited', rep: null, age: null },
        { status: 'none', rep: null, age: null },
      ];

      testCases.forEach(({ status, rep, age }) => {
        const score = analyzer.calculateAuditScore(status as any, rep, age);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should return vulnerability scores in valid range [0, 100]', () => {
      const testCases = [
        [0, 0, 0, 0],
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
        [2, 3, 2, 1],
      ];

      testCases.forEach(([critical, high, medium, low]) => {
        const score = analyzer.calculateVulnerabilityScore(critical, high, medium, low);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should return code quality scores in valid range [0, 100]', () => {
      const testCases = [
        [0, 0],
        [50, 500],
        [100, 1000],
        [30, 100],
        [90, 2000],
      ];

      testCases.forEach(([complexity, age]) => {
        const score = analyzer.calculateCodeQualityScore(complexity, age);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Realistic Scenarios', () => {
    it('should score Uniswap V3 as low risk', () => {
      // Uniswap V3: audited by top-tier, no critical vulns, mature
      const auditScore = analyzer.calculateAuditScore('audited', 95, 1675);
      const vulnScore = analyzer.calculateVulnerabilityScore(0, 0, 0, 0);
      const codeScore = analyzer.calculateCodeQualityScore(45, 1675);
      
      const overallScore = auditScore * 0.4 + vulnScore * 0.4 + codeScore * 0.2;
      
      expect(overallScore).toBeLessThan(20);
    });

    it('should score unaudited new protocol as high risk', () => {
      // New protocol: unaudited, 1 critical vuln, high complexity
      const auditScore = analyzer.calculateAuditScore('unaudited', null, null);
      const vulnScore = analyzer.calculateVulnerabilityScore(1, 0, 0, 0);
      const codeScore = analyzer.calculateCodeQualityScore(80, 90);
      
      const overallScore = auditScore * 0.4 + vulnScore * 0.4 + codeScore * 0.2;
      
      expect(overallScore).toBeGreaterThan(60);
    });

    it('should score scam protocol as critical risk', () => {
      // Scam: no audit, multiple critical vulns, high complexity
      const auditScore = analyzer.calculateAuditScore('none', null, null);
      const vulnScore = analyzer.calculateVulnerabilityScore(5, 3, 2, 1);
      const codeScore = analyzer.calculateCodeQualityScore(95, 15);
      
      const overallScore = auditScore * 0.4 + vulnScore * 0.4 + codeScore * 0.2;
      
      expect(overallScore).toBeGreaterThan(80);
    });
  });

  describe('Consistency', () => {
    it('should return consistent scores for same inputs', () => {
      const score1 = analyzer.calculateAuditScore('audited', 90, 1000);
      const score2 = analyzer.calculateAuditScore('audited', 90, 1000);
      expect(score1).toBe(score2);
    });

    it('should return consistent vulnerability scores', () => {
      const score1 = analyzer.calculateVulnerabilityScore(2, 3, 1, 0);
      const score2 = analyzer.calculateVulnerabilityScore(2, 3, 1, 0);
      expect(score1).toBe(score2);
    });

    it('should return consistent code quality scores', () => {
      const score1 = analyzer.calculateCodeQualityScore(60, 800);
      const score2 = analyzer.calculateCodeQualityScore(60, 800);
      expect(score1).toBe(score2);
    });
  });
});

