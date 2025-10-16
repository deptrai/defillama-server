/**
 * Unit Tests for RugPullDetector
 * Story: 3.2.2 - Suspicious Activity Detection
 */

import { RugPullDetector, LiquidityRemovalEvidence, TokenDumpEvidence, ContractManipulationEvidence } from '../rug-pull-detector';

describe('RugPullDetector', () => {
  let detector: RugPullDetector;

  beforeAll(() => {
    detector = RugPullDetector.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RugPullDetector.getInstance();
      const instance2 = RugPullDetector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('calculateLiquidityRemovalConfidence', () => {
    it('should return high confidence for >90% removal in <15 minutes', () => {
      const evidence: LiquidityRemovalEvidence = {
        percentage: 0.95,
        timeframe: 600, // 10 minutes
        removed_amount_usd: 950000,
        remaining_amount_usd: 50000,
        wallet_address: '0x1234...5678',
      };

      const confidence = detector.calculateLiquidityRemovalConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return medium confidence for 70-90% removal', () => {
      const evidence: LiquidityRemovalEvidence = {
        percentage: 0.75,
        timeframe: 1200, // 20 minutes
        removed_amount_usd: 750000,
        remaining_amount_usd: 250000,
        wallet_address: '0x1234...5678',
      };

      const confidence = detector.calculateLiquidityRemovalConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(75);
      expect(confidence).toBeLessThan(90);
    });

    it('should return lower confidence for 50-70% removal', () => {
      const evidence: LiquidityRemovalEvidence = {
        percentage: 0.55,
        timeframe: 2400, // 40 minutes
        removed_amount_usd: 550000,
        remaining_amount_usd: 450000,
        wallet_address: '0x1234...5678',
      };

      const confidence = detector.calculateLiquidityRemovalConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(60);
      expect(confidence).toBeLessThan(80);
    });

    it('should increase confidence for shorter timeframes', () => {
      const evidence1: LiquidityRemovalEvidence = {
        percentage: 0.8,
        timeframe: 600, // 10 minutes
        removed_amount_usd: 800000,
        remaining_amount_usd: 200000,
        wallet_address: '0x1234...5678',
      };

      const evidence2: LiquidityRemovalEvidence = {
        percentage: 0.8,
        timeframe: 2400, // 40 minutes
        removed_amount_usd: 800000,
        remaining_amount_usd: 200000,
        wallet_address: '0x1234...5678',
      };

      const confidence1 = detector.calculateLiquidityRemovalConfidence(evidence1);
      const confidence2 = detector.calculateLiquidityRemovalConfidence(evidence2);

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it('should cap confidence at 100', () => {
      const evidence: LiquidityRemovalEvidence = {
        percentage: 0.99,
        timeframe: 300, // 5 minutes
        removed_amount_usd: 990000,
        remaining_amount_usd: 10000,
        wallet_address: '0x1234...5678',
      };

      const confidence = detector.calculateLiquidityRemovalConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateTokenDumpConfidence', () => {
    it('should return high confidence for >50% dump with high price impact', () => {
      const evidence: TokenDumpEvidence = {
        percentage: 0.6,
        timeframe: 600, // 10 minutes
        sold_amount: 600000000,
        total_supply: 1000000000,
        price_impact: 0.8,
        wallet_address: '0x1234...5678',
      };

      const confidence = detector.calculateTokenDumpConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(85);
    });

    it('should return medium confidence for 30-50% dump', () => {
      const evidence: TokenDumpEvidence = {
        percentage: 0.4,
        timeframe: 1200, // 20 minutes
        sold_amount: 400000000,
        total_supply: 1000000000,
        price_impact: 0.6,
        wallet_address: '0x1234...5678',
      };

      const confidence = detector.calculateTokenDumpConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(70);
      expect(confidence).toBeLessThan(90);
    });

    it('should increase confidence for higher price impact', () => {
      const evidence1: TokenDumpEvidence = {
        percentage: 0.4,
        timeframe: 1200,
        sold_amount: 400000000,
        total_supply: 1000000000,
        price_impact: 0.8,
        wallet_address: '0x1234...5678',
      };

      const evidence2: TokenDumpEvidence = {
        percentage: 0.4,
        timeframe: 1200,
        sold_amount: 400000000,
        total_supply: 1000000000,
        price_impact: 0.3,
        wallet_address: '0x1234...5678',
      };

      const confidence1 = detector.calculateTokenDumpConfidence(evidence1);
      const confidence2 = detector.calculateTokenDumpConfidence(evidence2);

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it('should increase confidence for shorter timeframes', () => {
      const evidence1: TokenDumpEvidence = {
        percentage: 0.5,
        timeframe: 600, // 10 minutes
        sold_amount: 500000000,
        total_supply: 1000000000,
        price_impact: 0.7,
        wallet_address: '0x1234...5678',
      };

      const evidence2: TokenDumpEvidence = {
        percentage: 0.5,
        timeframe: 2400, // 40 minutes
        sold_amount: 500000000,
        total_supply: 1000000000,
        price_impact: 0.7,
        wallet_address: '0x1234...5678',
      };

      const confidence1 = detector.calculateTokenDumpConfidence(evidence1);
      const confidence2 = detector.calculateTokenDumpConfidence(evidence2);

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it('should cap confidence at 100', () => {
      const evidence: TokenDumpEvidence = {
        percentage: 0.9,
        timeframe: 300, // 5 minutes
        sold_amount: 900000000,
        total_supply: 1000000000,
        price_impact: 0.95,
        wallet_address: '0x1234...5678',
      };

      const confidence = detector.calculateTokenDumpConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateManipulationConfidence', () => {
    it('should return 0 for no manipulation', () => {
      const evidence: ContractManipulationEvidence = {
        detected: false,
        action: 'ownership_transfer',
      };

      const confidence = detector.calculateManipulationConfidence(evidence);
      expect(confidence).toBe(0);
    });

    it('should return high confidence for ownership transfer', () => {
      const evidence: ContractManipulationEvidence = {
        detected: true,
        action: 'ownership_transfer',
        from_address: '0x1234...old',
        to_address: '0x5678...new',
      };

      const confidence = detector.calculateManipulationConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return high confidence for emergency pause', () => {
      const evidence: ContractManipulationEvidence = {
        detected: true,
        action: 'emergency_pause',
        from_address: '0x1234...admin',
      };

      const confidence = detector.calculateManipulationConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(85);
    });

    it('should return lower confidence for contract upgrade with timelock', () => {
      const evidence1: ContractManipulationEvidence = {
        detected: true,
        action: 'contract_upgrade',
        from_address: '0x1234...admin',
        timelock_delay: 86400, // 24 hours
      };

      const evidence2: ContractManipulationEvidence = {
        detected: true,
        action: 'contract_upgrade',
        from_address: '0x1234...admin',
        timelock_delay: 0,
      };

      const confidence1 = detector.calculateManipulationConfidence(evidence1);
      const confidence2 = detector.calculateManipulationConfidence(evidence2);

      expect(confidence1).toBeLessThan(confidence2);
    });

    it('should return medium confidence for mint function call', () => {
      const evidence: ContractManipulationEvidence = {
        detected: true,
        action: 'mint_function_call',
        from_address: '0x1234...minter',
      };

      const confidence = detector.calculateManipulationConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(80);
      expect(confidence).toBeLessThan(95);
    });

    it('should cap confidence at 100', () => {
      const evidence: ContractManipulationEvidence = {
        detected: true,
        action: 'ownership_transfer',
        from_address: '0x1234...old',
        to_address: '0x5678...new',
      };

      const confidence = detector.calculateManipulationConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0% liquidity removal', () => {
      const evidence: LiquidityRemovalEvidence = {
        percentage: 0,
        timeframe: 3600,
        removed_amount_usd: 0,
        remaining_amount_usd: 1000000,
        wallet_address: '0x1234...5678',
      };

      const confidence = detector.calculateLiquidityRemovalConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle 100% liquidity removal', () => {
      const evidence: LiquidityRemovalEvidence = {
        percentage: 1.0,
        timeframe: 300,
        removed_amount_usd: 1000000,
        remaining_amount_usd: 0,
        wallet_address: '0x1234...5678',
      };

      const confidence = detector.calculateLiquidityRemovalConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('should handle very short timeframes', () => {
      const evidence: LiquidityRemovalEvidence = {
        percentage: 0.8,
        timeframe: 60, // 1 minute
        removed_amount_usd: 800000,
        remaining_amount_usd: 200000,
        wallet_address: '0x1234...5678',
      };

      const confidence = detector.calculateLiquidityRemovalConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(85);
    });

    it('should handle very long timeframes', () => {
      const evidence: LiquidityRemovalEvidence = {
        percentage: 0.8,
        timeframe: 86400, // 24 hours
        removed_amount_usd: 800000,
        remaining_amount_usd: 200000,
        wallet_address: '0x1234...5678',
      };

      const confidence = detector.calculateLiquidityRemovalConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Realistic Scenarios', () => {
    it('should detect critical rug pull: 92% liquidity removal in 15 minutes', () => {
      const evidence: LiquidityRemovalEvidence = {
        percentage: 0.92,
        timeframe: 900,
        removed_amount_usd: 1380000,
        remaining_amount_usd: 120000,
        wallet_address: '0x1234...scam',
      };

      const confidence = detector.calculateLiquidityRemovalConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should detect high rug pull: 45% token dump in 30 minutes with 78% price drop', () => {
      const evidence: TokenDumpEvidence = {
        percentage: 0.45,
        timeframe: 1800,
        sold_amount: 450000000,
        total_supply: 1000000000,
        price_impact: 0.78,
        wallet_address: '0xaaaa...dev',
      };

      const confidence = detector.calculateTokenDumpConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(80);
    });

    it('should detect critical contract manipulation: ownership transfer', () => {
      const evidence: ContractManipulationEvidence = {
        detected: true,
        action: 'ownership_transfer',
        from_address: '0xcccc...owner',
        to_address: '0xdddd...new',
      };

      const confidence = detector.calculateManipulationConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });
  });
});

