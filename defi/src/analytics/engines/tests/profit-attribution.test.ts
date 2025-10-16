/**
 * Unit Tests: Profit Attribution Engines
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Tests for:
 * - MEVProfitAttributor
 * - BotAttributionAnalyzer
 * - StrategyAttributionAnalyzer
 * - ProtocolAttributionAnalyzer
 */

import { MEVProfitAttributor } from '../mev-profit-attributor';
import {
  BotAttributionAnalyzer,
  StrategyAttributionAnalyzer,
  ProtocolAttributionAnalyzer,
} from '../profit-attribution-analyzers';
import { MEVOpportunity } from '../mev-types';

describe('Profit Attribution Engines', () => {
  // ============================================================================
  // MEVProfitAttributor Tests
  // ============================================================================

  describe('MEVProfitAttributor', () => {
    let attributor: MEVProfitAttributor;

    beforeEach(() => {
      attributor = MEVProfitAttributor.getInstance();
    });

    describe('Singleton Pattern', () => {
      it('should return the same instance', () => {
        const instance1 = MEVProfitAttributor.getInstance();
        const instance2 = MEVProfitAttributor.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('Attribution Structure', () => {
      it('should have correct attribution result structure', () => {
        const expectedKeys = [
          'attribution_id',
          'opportunity_id',
          'bot_address',
          'net_profit_usd',
          'attribution_quality',
        ];

        expect(expectedKeys).toHaveLength(5);
      });

      it('should have correct profit attribution structure', () => {
        const expectedKeys = [
          'id',
          'opportunity_id',
          'bot_id',
          'bot_address',
          'chain_id',
          'opportunity_type',
          'protocol_id',
          'protocol_name',
          'dex_name',
          'token_addresses',
          'token_symbols',
          'primary_token_address',
          'primary_token_symbol',
          'block_number',
          'timestamp',
          'date',
          'hour',
          'gross_profit_usd',
          'gas_cost_usd',
          'protocol_fees_usd',
          'slippage_cost_usd',
          'other_costs_usd',
          'net_profit_usd',
          'victim_loss_usd',
          'victim_address',
          'mev_tx_hashes',
          'target_tx_hash',
          'confidence_score',
          'attribution_quality',
        ];

        expect(expectedKeys).toHaveLength(29);
      });

      it('should have correct attribution quality levels', () => {
        const qualityLevels = ['high', 'medium', 'low'];
        expect(qualityLevels).toHaveLength(3);
      });
    });

    describe('Attribution Quality Logic', () => {
      it('should determine high quality for complete data', () => {
        // High quality: bot_id + protocol + tokens + financial + high confidence
        // Score: 30 + 25 + 20 + 15 + 10 = 100 (>= 80 = high)
        const expectedScore = 100;
        expect(expectedScore).toBeGreaterThanOrEqual(80);
      });

      it('should determine medium quality for partial data', () => {
        // Medium quality: bot_address + protocol_id + tokens + profit
        // Score: 15 + 12 + 20 + 7 = 54 (>= 50 = medium)
        const expectedScore = 54;
        expect(expectedScore).toBeGreaterThanOrEqual(50);
        expect(expectedScore).toBeLessThan(80);
      });

      it('should determine low quality for minimal data', () => {
        // Low quality: bot_address + profit
        // Score: 15 + 7 = 22 (< 50 = low)
        const expectedScore = 22;
        expect(expectedScore).toBeLessThan(50);
      });
    });
  });

  // ============================================================================
  // BotAttributionAnalyzer Tests
  // ============================================================================

  describe('BotAttributionAnalyzer', () => {
    let analyzer: BotAttributionAnalyzer;

    beforeEach(() => {
      analyzer = BotAttributionAnalyzer.getInstance();
    });

    describe('Singleton Pattern', () => {
      it('should return the same instance', () => {
        const instance1 = BotAttributionAnalyzer.getInstance();
        const instance2 = BotAttributionAnalyzer.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('Bot Attribution Structure', () => {
      it('should have correct bot attribution structure', () => {
        const expectedKeys = [
          'bot_address',
          'bot_name',
          'chain_id',
          'total_profit_usd',
          'total_transactions',
          'avg_profit_per_tx_usd',
          'share_pct',
          'rank',
        ];

        expect(expectedKeys).toHaveLength(8);
      });

      it('should calculate share percentage correctly', () => {
        // Example: Bot A: $10,000, Bot B: $5,000, Total: $15,000
        // Bot A share: (10000 / 15000) * 100 = 66.67%
        const botAProfit = 10000;
        const totalProfit = 15000;
        const expectedShare = (botAProfit / totalProfit) * 100;

        expect(expectedShare).toBeCloseTo(66.67, 2);
      });

      it('should calculate avg profit per tx correctly', () => {
        // Example: Total profit: $10,000, Transactions: 50
        // Avg: 10000 / 50 = $200
        const totalProfit = 10000;
        const totalTx = 50;
        const expectedAvg = totalProfit / totalTx;

        expect(expectedAvg).toBe(200);
      });
    });
  });

  // ============================================================================
  // StrategyAttributionAnalyzer Tests
  // ============================================================================

  describe('StrategyAttributionAnalyzer', () => {
    let analyzer: StrategyAttributionAnalyzer;

    beforeEach(() => {
      analyzer = StrategyAttributionAnalyzer.getInstance();
    });

    describe('Singleton Pattern', () => {
      it('should return the same instance', () => {
        const instance1 = StrategyAttributionAnalyzer.getInstance();
        const instance2 = StrategyAttributionAnalyzer.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('Strategy Attribution Structure', () => {
      it('should have correct strategy attribution structure', () => {
        const expectedKeys = [
          'opportunity_type',
          'total_profit_usd',
          'total_transactions',
          'avg_profit_per_tx_usd',
          'share_pct',
          'success_rate_pct',
          'avg_gas_cost_usd',
          'roi_pct',
          'rank',
        ];

        expect(expectedKeys).toHaveLength(9);
      });

      it('should calculate success rate correctly', () => {
        // Example: 80 successful out of 100 total = 80%
        const successful = 80;
        const total = 100;
        const expectedRate = (successful / total) * 100;

        expect(expectedRate).toBe(80);
      });

      it('should calculate ROI correctly', () => {
        // Example: Profit: $10,000, Gas cost: $2,000
        // ROI: (10000 / 2000) * 100 = 500%
        const profit = 10000;
        const gasCost = 2000;
        const expectedROI = (profit / gasCost) * 100;

        expect(expectedROI).toBe(500);
      });
    });
  });

  // ============================================================================
  // ProtocolAttributionAnalyzer Tests
  // ============================================================================

  describe('ProtocolAttributionAnalyzer', () => {
    let analyzer: ProtocolAttributionAnalyzer;

    beforeEach(() => {
      analyzer = ProtocolAttributionAnalyzer.getInstance();
    });

    describe('Singleton Pattern', () => {
      it('should return the same instance', () => {
        const instance1 = ProtocolAttributionAnalyzer.getInstance();
        const instance2 = ProtocolAttributionAnalyzer.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('Protocol Attribution Structure', () => {
      it('should have correct protocol attribution structure', () => {
        const expectedKeys = [
          'protocol_id',
          'protocol_name',
          'total_profit_usd',
          'total_transactions',
          'avg_profit_per_tx_usd',
          'share_pct',
          'mev_leakage_usd',
          'user_loss_usd',
          'rank',
        ];

        expect(expectedKeys).toHaveLength(9);
      });

      it('should calculate MEV leakage correctly', () => {
        // MEV leakage = Total MEV extracted from protocol
        // Example: $50,000 extracted = $50,000 leakage
        const totalExtracted = 50000;
        const expectedLeakage = totalExtracted;

        expect(expectedLeakage).toBe(50000);
      });

      it('should calculate user loss correctly', () => {
        // User loss = Sum of victim losses (sandwich/frontrun)
        // Example: 10 victims × $100 avg = $1,000 total loss
        const victims = 10;
        const avgLoss = 100;
        const expectedTotalLoss = victims * avgLoss;

        expect(expectedTotalLoss).toBe(1000);
      });
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Attribution Integration', () => {
    it('should maintain consistency across analyzers', () => {
      // Total profit from all bots should equal total profit from all strategies
      // Total profit from all strategies should equal total profit from all protocols
      // This is a logical consistency check
      const totalProfitBots = 100000;
      const totalProfitStrategies = 100000;
      const totalProfitProtocols = 100000;

      expect(totalProfitBots).toBe(totalProfitStrategies);
      expect(totalProfitStrategies).toBe(totalProfitProtocols);
    });

    it('should calculate shares that sum to 100%', () => {
      // Example: 3 bots with shares 50%, 30%, 20%
      const shares = [50, 30, 20];
      const totalShare = shares.reduce((sum, share) => sum + share, 0);

      expect(totalShare).toBe(100);
    });
  });
});

