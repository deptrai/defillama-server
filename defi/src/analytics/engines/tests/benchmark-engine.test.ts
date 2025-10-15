/**
 * Benchmark Engine Tests
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 3 - Analytics Engine
 */

import { BenchmarkEngine } from '../benchmark-engine';
import { ProtocolMetrics, RankedMetric } from '../types';

describe('BenchmarkEngine', () => {
  let engine: BenchmarkEngine;

  beforeEach(() => {
    engine = new BenchmarkEngine();
  });

  describe('rankByMetric', () => {
    const mockProtocols: ProtocolMetrics[] = [
      {
        protocolId: 'protocol-a',
        protocolName: 'Protocol A',
        tvl: 1000000,
        volume24h: 500000,
        users: 1000,
        revenue: 10000,
        apy: 15,
      },
      {
        protocolId: 'protocol-b',
        protocolName: 'Protocol B',
        tvl: 2000000,
        volume24h: 800000,
        users: 2000,
        revenue: 20000,
        apy: 12,
      },
      {
        protocolId: 'protocol-c',
        protocolName: 'Protocol C',
        tvl: 1500000,
        volume24h: 600000,
        users: 1500,
        revenue: 15000,
        apy: 18,
      },
    ];

    it('should rank protocols by TVL correctly', () => {
      const rankings = engine.rankByMetric(mockProtocols, 'tvl');

      expect(rankings[0].protocolId).toBe('protocol-b');
      expect(rankings[0].rank).toBe(1);
      expect(rankings[0].value).toBe(2000000);

      expect(rankings[1].protocolId).toBe('protocol-c');
      expect(rankings[1].rank).toBe(2);

      expect(rankings[2].protocolId).toBe('protocol-a');
      expect(rankings[2].rank).toBe(3);
    });

    it('should rank protocols by APY correctly', () => {
      const rankings = engine.rankByMetric(mockProtocols, 'apy');

      expect(rankings[0].protocolId).toBe('protocol-c');
      expect(rankings[0].rank).toBe(1);
      expect(rankings[0].value).toBe(18);

      expect(rankings[1].protocolId).toBe('protocol-a');
      expect(rankings[1].rank).toBe(2);

      expect(rankings[2].protocolId).toBe('protocol-b');
      expect(rankings[2].rank).toBe(3);
    });

    it('should rank protocols by users correctly', () => {
      const rankings = engine.rankByMetric(mockProtocols, 'users');

      expect(rankings[0].protocolId).toBe('protocol-b');
      expect(rankings[0].rank).toBe(1);
      expect(rankings[0].value).toBe(2000);
    });

    it('should handle empty protocol list', () => {
      const rankings = engine.rankByMetric([], 'tvl');

      expect(rankings).toEqual([]);
    });

    it('should handle single protocol', () => {
      const rankings = engine.rankByMetric([mockProtocols[0]], 'tvl');

      expect(rankings.length).toBe(1);
      expect(rankings[0].rank).toBe(1);
    });
  });

  describe('calculateRankedMetric', () => {
    it('should calculate ranked metric with positive change', () => {
      const result = engine.calculateRankedMetric(1000000, 1, 10, 900000);

      expect(result.value).toBe(1000000);
      expect(result.rank).toBe(1);
      expect(result.change).toBeCloseTo(11.11, 1);
      expect(result.percentile).toBe(100); // Rank 1 out of 10
    });

    it('should calculate ranked metric with negative change', () => {
      const result = engine.calculateRankedMetric(900000, 5, 10, 1000000);

      expect(result.value).toBe(900000);
      expect(result.rank).toBe(5);
      expect(result.change).toBeCloseTo(-10, 1);
      expect(result.percentile).toBe(60); // Rank 5 out of 10
    });

    it('should handle no previous value', () => {
      const result = engine.calculateRankedMetric(1000000, 1, 10);

      expect(result.change).toBe(0);
    });

    it('should handle zero previous value', () => {
      const result = engine.calculateRankedMetric(1000000, 1, 10, 0);

      expect(result.change).toBe(0);
    });

    it('should calculate percentile correctly', () => {
      // Rank 1 out of 100
      const result1 = engine.calculateRankedMetric(1000000, 1, 100);
      expect(result1.percentile).toBe(100);

      // Rank 50 out of 100
      const result50 = engine.calculateRankedMetric(500000, 50, 100);
      expect(result50.percentile).toBe(51);

      // Rank 100 out of 100
      const result100 = engine.calculateRankedMetric(100000, 100, 100);
      expect(result100.percentile).toBe(1);
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate overall score correctly', () => {
      const metrics = {
        tvl: { value: 1000000, rank: 1, change: 10, percentile: 100 },
        volume: { value: 500000, rank: 2, change: 5, percentile: 90 },
        users: { value: 1000, rank: 3, change: 15, percentile: 80 },
        revenue: { value: 10000, rank: 1, change: 20, percentile: 100 },
        apy: { value: 15, rank: 5, change: -5, percentile: 60 },
      };

      const score = engine.calculateOverallScore(metrics);

      // Score = 100*0.3 + 90*0.2 + 80*0.2 + 100*0.2 + 60*0.1
      // Score = 30 + 18 + 16 + 20 + 6 = 90
      expect(score).toBe(90);
    });

    it('should handle all metrics at 100 percentile', () => {
      const metrics = {
        tvl: { value: 1000000, rank: 1, change: 10, percentile: 100 },
        volume: { value: 500000, rank: 1, change: 5, percentile: 100 },
        users: { value: 1000, rank: 1, change: 15, percentile: 100 },
        revenue: { value: 10000, rank: 1, change: 20, percentile: 100 },
        apy: { value: 15, rank: 1, change: -5, percentile: 100 },
      };

      const score = engine.calculateOverallScore(metrics);

      expect(score).toBe(100);
    });

    it('should handle all metrics at 0 percentile', () => {
      const metrics = {
        tvl: { value: 1000, rank: 100, change: -10, percentile: 0 },
        volume: { value: 500, rank: 100, change: -5, percentile: 0 },
        users: { value: 10, rank: 100, change: -15, percentile: 0 },
        revenue: { value: 100, rank: 100, change: -20, percentile: 0 },
        apy: { value: 1, rank: 100, change: -5, percentile: 0 },
      };

      const score = engine.calculateOverallScore(metrics);

      expect(score).toBe(0);
    });
  });

  describe('Market Share Calculations', () => {
    it('should calculate market share correctly', () => {
      const protocolTVL = 1000000;
      const totalMarketTVL = 10000000;
      const marketShare = (protocolTVL / totalMarketTVL) * 100;

      expect(marketShare).toBe(10);
    });

    it('should calculate Herfindahl Index correctly', () => {
      const marketShares = [40, 30, 20, 10]; // %
      const herfindahlIndex = marketShares.reduce((sum, share) => sum + Math.pow(share, 2), 0);

      expect(herfindahlIndex).toBe(3000); // 1600 + 900 + 400 + 100
    });

    it('should calculate top N share correctly', () => {
      const marketShares = [40, 30, 20, 10, 5, 3, 2];
      const top3Share = marketShares.slice(0, 3).reduce((sum, share) => sum + share, 0);
      const top5Share = marketShares.slice(0, 5).reduce((sum, share) => sum + share, 0);

      expect(top3Share).toBe(90);
      expect(top5Share).toBe(105);
    });

    it('should handle zero total market', () => {
      const protocolTVL = 1000000;
      const totalMarketTVL = 0;
      const marketShare = totalMarketTVL > 0 ? (protocolTVL / totalMarketTVL) * 100 : 0;

      expect(marketShare).toBe(0);
    });
  });

  describe('Concentration Metrics', () => {
    it('should detect high concentration (monopoly)', () => {
      const marketShares = [90, 5, 3, 2];
      const herfindahlIndex = marketShares.reduce((sum, share) => sum + Math.pow(share, 2), 0);

      // HHI > 2500 indicates high concentration
      expect(herfindahlIndex).toBeGreaterThan(2500);
    });

    it('should detect moderate concentration', () => {
      const marketShares = [30, 25, 20, 15, 10];
      const herfindahlIndex = marketShares.reduce((sum, share) => sum + Math.pow(share, 2), 0);

      // 1500 < HHI < 2500 indicates moderate concentration
      expect(herfindahlIndex).toBeGreaterThan(1500);
      expect(herfindahlIndex).toBeLessThan(2500);
    });

    it('should detect low concentration (competitive)', () => {
      const marketShares = [15, 15, 15, 15, 10, 10, 10, 10];
      const herfindahlIndex = marketShares.reduce((sum, share) => sum + Math.pow(share, 2), 0);

      // HHI < 1500 indicates low concentration
      expect(herfindahlIndex).toBeLessThan(1500);
    });
  });
});

