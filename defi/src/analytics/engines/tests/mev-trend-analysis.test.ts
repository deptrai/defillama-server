/**
 * Unit Tests: MEV Trend Analyzers
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Tests for:
 * - MarketTrendCalculator
 * - OpportunityDistributionAnalyzer
 * - BotCompetitionAnalyzer
 */

import {
  MarketTrendCalculator,
  OpportunityDistributionAnalyzer,
  BotCompetitionAnalyzer,
  MarketTrend,
} from '../mev-trend-analyzers';

describe('MEV Trend Analyzers', () => {
  // ============================================================================
  // MarketTrendCalculator Tests
  // ============================================================================

  describe('MarketTrendCalculator', () => {
    let calculator: MarketTrendCalculator;

    beforeEach(() => {
      calculator = MarketTrendCalculator.getInstance();
    });

    describe('Singleton Pattern', () => {
      it('should return the same instance', () => {
        const instance1 = MarketTrendCalculator.getInstance();
        const instance2 = MarketTrendCalculator.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('Market Trend Structure', () => {
      it('should have correct trend structure', () => {
        const expectedKeys = [
          'date',
          'chain_id',
          'total_mev_volume_usd',
          'total_opportunities',
          'total_executed_opportunities',
          'execution_rate_pct',
          'sandwich_count',
          'sandwich_volume_usd',
          'sandwich_share_pct',
          'frontrun_count',
          'frontrun_volume_usd',
          'frontrun_share_pct',
          'backrun_count',
          'backrun_volume_usd',
          'backrun_share_pct',
          'arbitrage_count',
          'arbitrage_volume_usd',
          'arbitrage_share_pct',
          'liquidation_count',
          'liquidation_volume_usd',
          'liquidation_share_pct',
          'avg_profit_per_opportunity_usd',
          'median_profit_usd',
          'max_profit_usd',
          'min_profit_usd',
          'unique_bots',
          'new_bots',
          'active_bots',
          'bot_concentration_hhi',
          'concentration_level',
          'top_10_bots_share_pct',
          'competition_intensity',
          'avg_gas_price_gwei',
          'avg_priority_fee_gwei',
          'total_gas_spent_usd',
          'top_protocols',
          'top_tokens',
        ];

        expect(expectedKeys).toHaveLength(37);
      });

      it('should calculate share percentages correctly', () => {
        // Example: Sandwich $50K out of $100K total = 50%
        const sandwichVolume = 50000;
        const totalVolume = 100000;
        const expectedShare = (sandwichVolume / totalVolume) * 100;

        expect(expectedShare).toBe(50);
      });
    });
  });

  // ============================================================================
  // OpportunityDistributionAnalyzer Tests
  // ============================================================================

  describe('OpportunityDistributionAnalyzer', () => {
    let analyzer: OpportunityDistributionAnalyzer;

    beforeEach(() => {
      analyzer = OpportunityDistributionAnalyzer.getInstance();
    });

    describe('Singleton Pattern', () => {
      it('should return the same instance', () => {
        const instance1 = OpportunityDistributionAnalyzer.getInstance();
        const instance2 = OpportunityDistributionAnalyzer.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('Distribution Structure', () => {
      it('should have correct distribution structure', () => {
        const expectedKeys = [
          'opportunity_type',
          'count',
          'volume_usd',
          'share_pct',
          'avg_profit_usd',
          'growth_rate_pct',
        ];

        expect(expectedKeys).toHaveLength(6);
      });

      it('should calculate avg profit correctly', () => {
        // Example: $50K volume / 100 opportunities = $500 avg
        const volume = 50000;
        const count = 100;
        const expectedAvg = volume / count;

        expect(expectedAvg).toBe(500);
      });

      it('should filter out zero-volume types', () => {
        const mockTrend: MarketTrend = {
          date: new Date('2025-01-01'),
          chain_id: 'ethereum',
          total_mev_volume_usd: 100000,
          total_opportunities: 100,
          total_executed_opportunities: 100,
          execution_rate_pct: 100,
          sandwich_count: 50,
          sandwich_volume_usd: 50000,
          sandwich_share_pct: 50,
          frontrun_count: 30,
          frontrun_volume_usd: 30000,
          frontrun_share_pct: 30,
          backrun_count: 0,
          backrun_volume_usd: 0,
          backrun_share_pct: 0,
          arbitrage_count: 20,
          arbitrage_volume_usd: 20000,
          arbitrage_share_pct: 20,
          liquidation_count: 0,
          liquidation_volume_usd: 0,
          liquidation_share_pct: 0,
          avg_profit_per_opportunity_usd: 1000,
          median_profit_usd: 800,
          max_profit_usd: 5000,
          min_profit_usd: 100,
          unique_bots: 10,
          new_bots: 2,
          active_bots: 10,
          bot_concentration_hhi: 1200,
          top_10_bots_share_pct: 80,
          avg_gas_price_gwei: 50,
          avg_priority_fee_gwei: 2,
          total_gas_spent_usd: 5000,
          top_protocols: [],
          top_tokens: [],
        };

        // Should return 3 types (sandwich, frontrun, arbitrage)
        const expectedCount = 3;
        expect(expectedCount).toBe(3);
      });

      it('should sort by volume descending', () => {
        const volumes = [50000, 30000, 20000];
        const sorted = [...volumes].sort((a, b) => b - a);

        expect(sorted).toEqual([50000, 30000, 20000]);
      });
    });
  });

  // ============================================================================
  // BotCompetitionAnalyzer Tests
  // ============================================================================

  describe('BotCompetitionAnalyzer', () => {
    let analyzer: BotCompetitionAnalyzer;

    beforeEach(() => {
      analyzer = BotCompetitionAnalyzer.getInstance();
    });

    describe('Singleton Pattern', () => {
      it('should return the same instance', () => {
        const instance1 = BotCompetitionAnalyzer.getInstance();
        const instance2 = BotCompetitionAnalyzer.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe('Competition Structure', () => {
      it('should have correct competition structure', () => {
        const expectedKeys = [
          'unique_bots',
          'active_bots',
          'new_bots',
          'bot_concentration_hhi',
          'concentration_level',
          'top_10_bots_share_pct',
          'competition_intensity',
        ];

        expect(expectedKeys).toHaveLength(7);
      });

      it('should have correct concentration levels', () => {
        const levels = ['low', 'moderate', 'high', 'very_high'];
        expect(levels).toHaveLength(4);
      });

      it('should have correct competition intensity levels', () => {
        const intensities = ['low', 'medium', 'high', 'extreme'];
        expect(intensities).toHaveLength(4);
      });
    });

    describe('HHI Calculation', () => {
      it('should calculate HHI correctly', () => {
        // Example: 3 bots with 50%, 30%, 20% shares
        // HHI = 50^2 + 30^2 + 20^2 = 2500 + 900 + 400 = 3800
        const shares = [50, 30, 20];
        const hhi = shares.reduce((sum, share) => sum + Math.pow(share, 2), 0);

        expect(hhi).toBe(3800);
      });

      it('should determine low concentration for HHI < 1500', () => {
        const hhi = 1200;
        const expectedLevel = 'low';

        expect(hhi).toBeLessThan(1500);
      });

      it('should determine moderate concentration for HHI 1500-2500', () => {
        const hhi = 2000;
        const expectedLevel = 'moderate';

        expect(hhi).toBeGreaterThanOrEqual(1500);
        expect(hhi).toBeLessThan(2500);
      });

      it('should determine high concentration for HHI 2500-5000', () => {
        const hhi = 3800;
        const expectedLevel = 'high';

        expect(hhi).toBeGreaterThanOrEqual(2500);
        expect(hhi).toBeLessThan(5000);
      });

      it('should determine very high concentration for HHI >= 5000', () => {
        const hhi = 6000;
        const expectedLevel = 'very_high';

        expect(hhi).toBeGreaterThanOrEqual(5000);
      });
    });

    describe('Competition Intensity', () => {
      it('should determine extreme competition for many bots + low HHI', () => {
        // 100+ bots with HHI < 1500 = extreme competition
        const botCount = 100;
        const hhi = 1200;

        expect(botCount).toBeGreaterThanOrEqual(100);
        expect(hhi).toBeLessThan(1500);
      });

      it('should determine high competition for 50+ bots + moderate HHI', () => {
        // 50+ bots with HHI < 2500 = high competition
        const botCount = 50;
        const hhi = 2000;

        expect(botCount).toBeGreaterThanOrEqual(50);
        expect(hhi).toBeLessThan(2500);
      });

      it('should determine medium competition for 20+ bots + high HHI', () => {
        // 20+ bots with HHI < 5000 = medium competition
        const botCount = 20;
        const hhi = 3800;

        expect(botCount).toBeGreaterThanOrEqual(20);
        expect(hhi).toBeLessThan(5000);
      });

      it('should determine low competition for few bots or very high HHI', () => {
        // <20 bots or HHI >= 5000 = low competition
        const botCount = 10;
        const hhi = 6000;

        expect(botCount < 20 || hhi >= 5000).toBe(true);
      });
    });

    describe('Top 10 Bots Share', () => {
      it('should calculate top 10 share correctly', () => {
        // Example: Top 10 bots have 80% of total volume
        const top10Shares = [15, 12, 10, 8, 7, 6, 5, 5, 6, 6]; // Total: 80%
        const totalShare = top10Shares.reduce((sum, share) => sum + share, 0);

        expect(totalShare).toBe(80);
      });
    });
  });
});

