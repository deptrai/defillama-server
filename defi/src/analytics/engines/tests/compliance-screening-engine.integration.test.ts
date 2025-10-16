/**
 * Compliance Screening Engine Integration Tests
 * Story: 3.2.3 - Compliance Monitoring
 * Phase 8: Testing
 */

import { ComplianceScreeningEngine } from '../compliance-screening-engine';
import { SanctionsScreener } from '../sanctions-screener';
import { AMLMonitor } from '../aml-monitor';
import { KYCVerifier } from '../kyc-verifier';
import { PEPScreener } from '../pep-screener';
import { AdverseMediaScreener } from '../adverse-media-screener';

describe('ComplianceScreeningEngine Integration Tests', () => {
  let engine: ComplianceScreeningEngine;

  beforeAll(() => {
    engine = ComplianceScreeningEngine.getInstance();
  });

  describe('Comprehensive Screening', () => {
    it('should screen wallet with no issues (clear)', async () => {
      const result = await engine.screenWallet('0x1111111111111111111111111111111111111111');

      expect(result.walletAddress).toBe('0x1111111111111111111111111111111111111111');
      expect(result.screeningResult).toBe('clear');
      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBeLessThan(25);
      expect(result.sanctions.match).toBe(false);
      expect(result.aml.riskScore).toBeLessThan(25);
      expect(result.kyc.status).toBe('unverified');
      expect(result.pep.match).toBe(false);
      expect(result.adverseMedia.match).toBe(false);
    });

    it('should screen wallet with sanctions match (flagged)', async () => {
      const result = await engine.screenWallet('0x1234567890123456789012345678901234567890');

      expect(result.walletAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(result.screeningResult).toBe('flagged');
      expect(result.riskLevel).toBe('critical');
      expect(result.riskScore).toBeGreaterThanOrEqual(75);
      expect(result.sanctions.match).toBe(true);
      expect(result.sanctions.list).toBe('OFAC SDN');
    });

    it('should screen wallet with PEP match (review required)', async () => {
      const result = await engine.screenWallet('0x5678901234567890123456789012345678901234');

      expect(result.walletAddress).toBe('0x5678901234567890123456789012345678901234');
      expect(result.screeningResult).toBe('review_required');
      expect(result.pep.match).toBe(true);
      expect(result.pep.category).toBe('government');
      expect(result.pep.confidence).toBeGreaterThan(0);
    });

    it('should screen wallet with adverse media (review required)', async () => {
      const result = await engine.screenWallet('0x7890123456789012345678901234567890123456');

      expect(result.walletAddress).toBe('0x7890123456789012345678901234567890123456');
      expect(result.screeningResult).toBe('review_required');
      expect(result.adverseMedia.match).toBe(true);
      expect(result.adverseMedia.count).toBeGreaterThan(0);
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate risk score correctly for sanctions match', async () => {
      const result = await engine.screenWallet('0x1234567890123456789012345678901234567890');

      // Sanctions weight: 40%
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
      expect(result.riskLevel).toBe('critical');
    });

    it('should calculate risk score correctly for multiple issues', async () => {
      const result = await engine.screenWallet('0x8901234567890123456789012345678901234567');

      // Multiple issues should increase risk score
      expect(result.riskScore).toBeGreaterThan(0);
    });
  });

  describe('Batch Screening', () => {
    it('should screen multiple wallets', async () => {
      const addresses = [
        '0x1111111111111111111111111111111111111111',
        '0x1234567890123456789012345678901234567890',
        '0x5678901234567890123456789012345678901234',
      ];

      const results = await engine.screenWallets(addresses);

      expect(results).toHaveLength(3);
      expect(results[0].screeningResult).toBe('clear');
      expect(results[1].screeningResult).toBe('flagged');
      expect(results[2].screeningResult).toBe('review_required');
    });

    it('should handle empty array', async () => {
      const results = await engine.screenWallets([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    it('should return statistics from all engines', () => {
      const stats = engine.getStatistics();

      expect(stats).toHaveProperty('sanctions');
      expect(stats).toHaveProperty('aml');
      expect(stats).toHaveProperty('kyc');
      expect(stats).toHaveProperty('pep');
      expect(stats).toHaveProperty('adverseMedia');
    });
  });

  describe('Edge Cases', () => {
    it('should handle uppercase addresses', async () => {
      const result = await engine.screenWallet('0X1234567890123456789012345678901234567890');

      expect(result.walletAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(result.screeningResult).toBe('flagged');
    });

    it('should handle mixed case addresses', async () => {
      const result = await engine.screenWallet('0x1234567890ABCDEF1234567890abcdef12345678');

      expect(result.walletAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });
  });

  describe('Integration with Individual Engines', () => {
    it('should integrate with SanctionsScreener', async () => {
      const sanctionsScreener = SanctionsScreener.getInstance();
      const sanctionsResult = await sanctionsScreener.screenWallet('0x1234567890123456789012345678901234567890');
      const complianceResult = await engine.screenWallet('0x1234567890123456789012345678901234567890');

      expect(complianceResult.sanctions.match).toBe(sanctionsResult.match);
      expect(complianceResult.sanctions.list).toBe(sanctionsResult.sanctionsList);
    });

    it('should integrate with AMLMonitor', async () => {
      const amlMonitor = AMLMonitor.getInstance();
      const amlResult = await amlMonitor.monitorWallet('0x1111111111111111111111111111111111111111');
      const complianceResult = await engine.screenWallet('0x1111111111111111111111111111111111111111');

      expect(complianceResult.aml.riskScore).toBe(amlResult.riskScore);
      expect(complianceResult.aml.structuring).toBe(amlResult.structuring);
      expect(complianceResult.aml.layering).toBe(amlResult.layering);
    });

    it('should integrate with KYCVerifier', async () => {
      const kycVerifier = KYCVerifier.getInstance();
      const kycResult = await kycVerifier.verifyWallet('0x1111111111111111111111111111111111111111');
      const complianceResult = await engine.screenWallet('0x1111111111111111111111111111111111111111');

      expect(complianceResult.kyc.status).toBe(kycResult.status);
      expect(complianceResult.kyc.level).toBe(kycResult.level);
    });

    it('should integrate with PEPScreener', async () => {
      const pepScreener = PEPScreener.getInstance();
      const pepResult = await pepScreener.screenWallet('0x5678901234567890123456789012345678901234');
      const complianceResult = await engine.screenWallet('0x5678901234567890123456789012345678901234');

      expect(complianceResult.pep.match).toBe(pepResult.match);
      expect(complianceResult.pep.category).toBe(pepResult.category);
      expect(complianceResult.pep.confidence).toBe(pepResult.confidence);
    });

    it('should integrate with AdverseMediaScreener', async () => {
      const adverseMediaScreener = AdverseMediaScreener.getInstance();
      const adverseMediaResult = await adverseMediaScreener.screenWallet('0x7890123456789012345678901234567890123456');
      const complianceResult = await engine.screenWallet('0x7890123456789012345678901234567890123456');

      expect(complianceResult.adverseMedia.match).toBe(adverseMediaResult.match);
      expect(complianceResult.adverseMedia.count).toBe(adverseMediaResult.matchCount);
      expect(complianceResult.adverseMedia.severity).toBe(adverseMediaResult.overallSeverity);
    });
  });

  describe('Performance', () => {
    it('should complete screening within 5 seconds', async () => {
      const startTime = Date.now();
      await engine.screenWallet('0x1111111111111111111111111111111111111111');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should complete batch screening within 10 seconds', async () => {
      const addresses = Array(10).fill(0).map((_, i) => 
        `0x${i.toString().padStart(40, '0')}`
      );

      const startTime = Date.now();
      await engine.screenWallets(addresses);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000);
    });
  });
});

