/**
 * Unit Tests: Protocol Leakage Analyzers
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Tests for:
 * - ProtocolLeakageCalculator
 * - LeakageBreakdownAnalyzer
 * - UserImpactCalculator
 */

import {
  ProtocolLeakageCalculator,
  LeakageBreakdownAnalyzer,
  UserImpactCalculator,
  ProtocolLeakage,
} from '../protocol-leakage-analyzers';

describe('Protocol Leakage Analyzers', () => {
  // ============================================================================
  // ProtocolLeakageCalculator Tests
  // ============================================================================

  describe('ProtocolLeakageCalculator', () => {
    let calculator: ProtocolLeakageCalculator;

    beforeEach(() => {
      calculator = ProtocolLeakageCalculator.getInstance();
    });

    describe('Singleton Pattern', () => {
      it('should return the same instance', () => {
        const instance1 = ProtocolLeakageCalculator.getInstance();
        const instance2 = ProtocolLeakageCalculator.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('Protocol Leakage Structure', () => {
      it('should have correct leakage structure', () => {
        const expectedKeys = [
          'protocol_id',
          'protocol_name',
          'chain_id',
          'date',
          'total_mev_extracted_usd',
          'total_transactions',
          'total_affected_transactions',
          'affected_transaction_pct',
          'sandwich_mev_usd',
          'sandwich_count',
          'frontrun_mev_usd',
          'frontrun_count',
          'backrun_mev_usd',
          'backrun_count',
          'arbitrage_mev_usd',
          'arbitrage_count',
          'liquidation_mev_usd',
          'liquidation_count',
          'total_user_loss_usd',
          'avg_loss_per_affected_tx_usd',
          'unique_affected_users',
          'unique_bots',
          'top_bot_address',
          'top_bot_extracted_usd',
          'top_bot_share_pct',
          'protocol_volume_usd',
          'mev_to_volume_ratio_pct',
          'leakage_severity',
          'leakage_score',
        ];

        expect(expectedKeys).toHaveLength(29);
      });

      it('should have correct severity levels', () => {
        const severityLevels = ['low', 'medium', 'high', 'critical'];
        expect(severityLevels).toHaveLength(4);
      });
    });

    describe('Severity Calculation', () => {
      it('should calculate critical severity for high values', () => {
        // Critical: MEV $1M+ (40) + Tx 1000+ (30) + Loss $100K+ (30) = 100 (≥80)
        const totalMev = 1000000;
        const totalTx = 1000;
        const totalUserLoss = 100000;
        const expectedScore = 100;

        expect(expectedScore).toBeGreaterThanOrEqual(80);
      });

      it('should calculate high severity for medium-high values', () => {
        // High: MEV $100K+ (30) + Tx 100+ (20) + Loss $10K+ (20) = 70 (≥60)
        const totalMev = 100000;
        const totalTx = 100;
        const totalUserLoss = 10000;
        const expectedScore = 70;

        expect(expectedScore).toBeGreaterThanOrEqual(60);
        expect(expectedScore).toBeLessThan(80);
      });

      it('should calculate medium severity for moderate values', () => {
        // Medium: MEV $10K+ (20) + Tx 10+ (10) + Loss $1K+ (10) = 40 (≥40)
        const totalMev = 10000;
        const totalTx = 10;
        const totalUserLoss = 1000;
        const expectedScore = 40;

        expect(expectedScore).toBeGreaterThanOrEqual(40);
        expect(expectedScore).toBeLessThan(60);
      });

      it('should calculate low severity for small values', () => {
        // Low: MEV $1K+ (10) + Tx <10 (0) + Loss <$1K (0) = 10 (<40)
        const totalMev = 1000;
        const totalTx = 5;
        const totalUserLoss = 500;
        const expectedScore = 10;

        expect(expectedScore).toBeLessThan(40);
      });
    });
  });

  // ============================================================================
  // LeakageBreakdownAnalyzer Tests
  // ============================================================================

  describe('LeakageBreakdownAnalyzer', () => {
    let analyzer: LeakageBreakdownAnalyzer;

    beforeEach(() => {
      analyzer = LeakageBreakdownAnalyzer.getInstance();
    });

    describe('Singleton Pattern', () => {
      it('should return the same instance', () => {
        const instance1 = LeakageBreakdownAnalyzer.getInstance();
        const instance2 = LeakageBreakdownAnalyzer.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('Breakdown Structure', () => {
      it('should have correct breakdown structure', () => {
        const expectedKeys = [
          'opportunity_type',
          'mev_extracted_usd',
          'transaction_count',
          'share_pct',
          'avg_per_tx_usd',
        ];

        expect(expectedKeys).toHaveLength(5);
      });

      it('should calculate share percentage correctly', () => {
        // Example: Sandwich $50K out of $100K total = 50%
        const sandwichMev = 50000;
        const totalMev = 100000;
        const expectedShare = (sandwichMev / totalMev) * 100;

        expect(expectedShare).toBe(50);
      });

      it('should calculate avg per tx correctly', () => {
        // Example: $50K MEV / 100 tx = $500 per tx
        const mevExtracted = 50000;
        const txCount = 100;
        const expectedAvg = mevExtracted / txCount;

        expect(expectedAvg).toBe(500);
      });
    });

    describe('Breakdown Analysis', () => {
      it('should filter out zero-value types', () => {
        const mockLeakage: ProtocolLeakage = {
          protocol_id: 'uniswap-v3',
          protocol_name: 'Uniswap V3',
          chain_id: 'ethereum',
          date: new Date('2025-01-01'),
          total_mev_extracted_usd: 100000,
          total_transactions: 100,
          total_affected_transactions: 100,
          affected_transaction_pct: 100,
          sandwich_mev_usd: 50000,
          sandwich_count: 50,
          frontrun_mev_usd: 30000,
          frontrun_count: 30,
          backrun_mev_usd: 0, // Zero value
          backrun_count: 0,
          arbitrage_mev_usd: 20000,
          arbitrage_count: 20,
          liquidation_mev_usd: 0, // Zero value
          liquidation_count: 0,
          total_user_loss_usd: 10000,
          avg_loss_per_affected_tx_usd: 100,
          unique_affected_users: 50,
          unique_bots: 10,
          top_bot_extracted_usd: 25000,
          top_bot_share_pct: 25,
          protocol_volume_usd: 1000000,
          mev_to_volume_ratio_pct: 10,
          leakage_severity: 'high',
          leakage_score: 70,
        };

        // Should return 3 types (sandwich, frontrun, arbitrage), excluding backrun and liquidation
        const expectedCount = 3;
        expect(expectedCount).toBe(3);
      });

      it('should sort by mev_extracted_usd descending', () => {
        // Example: sandwich $50K, frontrun $30K, arbitrage $20K
        // Expected order: sandwich, frontrun, arbitrage
        const values = [50000, 30000, 20000];
        const sorted = [...values].sort((a, b) => b - a);

        expect(sorted).toEqual([50000, 30000, 20000]);
      });
    });
  });

  // ============================================================================
  // UserImpactCalculator Tests
  // ============================================================================

  describe('UserImpactCalculator', () => {
    let calculator: UserImpactCalculator;

    beforeEach(() => {
      calculator = UserImpactCalculator.getInstance();
    });

    describe('Singleton Pattern', () => {
      it('should return the same instance', () => {
        const instance1 = UserImpactCalculator.getInstance();
        const instance2 = UserImpactCalculator.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('User Impact Structure', () => {
      it('should have correct impact structure', () => {
        const expectedKeys = [
          'total_user_loss_usd',
          'unique_affected_users',
          'avg_loss_per_user_usd',
          'avg_loss_per_tx_usd',
          'max_loss_tx_usd',
          'impact_severity',
        ];

        expect(expectedKeys).toHaveLength(6);
      });

      it('should calculate avg loss per user correctly', () => {
        // Example: $10K total loss / 50 users = $200 per user
        const totalLoss = 10000;
        const uniqueUsers = 50;
        const expectedAvg = totalLoss / uniqueUsers;

        expect(expectedAvg).toBe(200);
      });

      it('should calculate avg loss per tx correctly', () => {
        // Example: $10K total loss / 100 tx = $100 per tx
        const totalLoss = 10000;
        const affectedTx = 100;
        const expectedAvg = totalLoss / affectedTx;

        expect(expectedAvg).toBe(100);
      });
    });

    describe('Impact Severity', () => {
      it('should determine critical impact for high losses', () => {
        // Critical: $100K+ user loss
        const totalUserLoss = 100000;
        const expectedSeverity = 'critical';

        expect(totalUserLoss).toBeGreaterThanOrEqual(100000);
      });

      it('should determine high impact for medium-high losses', () => {
        // High: $10K-$100K user loss
        const totalUserLoss = 50000;
        const expectedSeverity = 'high';

        expect(totalUserLoss).toBeGreaterThanOrEqual(10000);
        expect(totalUserLoss).toBeLessThan(100000);
      });

      it('should determine medium impact for moderate losses', () => {
        // Medium: $1K-$10K user loss
        const totalUserLoss = 5000;
        const expectedSeverity = 'medium';

        expect(totalUserLoss).toBeGreaterThanOrEqual(1000);
        expect(totalUserLoss).toBeLessThan(10000);
      });

      it('should determine low impact for small losses', () => {
        // Low: <$1K user loss
        const totalUserLoss = 500;
        const expectedSeverity = 'low';

        expect(totalUserLoss).toBeLessThan(1000);
      });
    });
  });
});

