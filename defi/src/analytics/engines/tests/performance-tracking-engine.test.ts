/**
 * Performance Tracking Engine Tests
 * Story: 2.2.1 - Wallet Portfolio Tracking
 */

import { PerformanceTrackingEngine } from '../performance-tracking-engine';

describe('PerformanceTrackingEngine', () => {
  let engine: PerformanceTrackingEngine;

  beforeAll(() => {
    engine = PerformanceTrackingEngine.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceTrackingEngine.getInstance();
      const instance2 = PerformanceTrackingEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getPerformance', () => {
    it('should get performance data for 7d', async () => {
      const performance = await engine.getPerformance(
        '0x1234567890123456789012345678901234567890',
        '7d'
      );

      expect(performance.walletAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(performance.timeRange).toBe('7d');
      expect(performance.history.length).toBeGreaterThan(0);
      expect(performance.statistics).toBeDefined();
      expect(performance.bestPerformers.length).toBeGreaterThan(0);
      expect(performance.worstPerformers.length).toBeGreaterThan(0);
    });

    it('should get performance data for 30d', async () => {
      const performance = await engine.getPerformance(
        '0x1234567890123456789012345678901234567890',
        '30d'
      );

      expect(performance.timeRange).toBe('30d');
      expect(performance.history.length).toBeGreaterThan(0);
    });

    it('should include benchmark when requested', async () => {
      const performance = await engine.getPerformance(
        '0x1234567890123456789012345678901234567890',
        '30d',
        'daily',
        'eth'
      );

      expect(performance.benchmark).toBeDefined();
      expect(performance.benchmark!.length).toBeGreaterThan(0);
    });

    it('should not include benchmark when none', async () => {
      const performance = await engine.getPerformance(
        '0x1234567890123456789012345678901234567890',
        '30d',
        'daily',
        'none'
      );

      expect(performance.benchmark).toBeUndefined();
    });
  });

  describe('getPerformanceHistory', () => {
    it('should get historical snapshots', async () => {
      const history = await engine.getPerformanceHistory(
        '0x1234567890123456789012345678901234567890',
        '30d',
        'daily'
      );

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].timestamp).toBeDefined();
      expect(history[0].totalValueUsd).toBeGreaterThan(0);
    });

    it('should calculate PnL relative to first snapshot', async () => {
      const history = await engine.getPerformanceHistory(
        '0x1234567890123456789012345678901234567890',
        '30d',
        'daily'
      );

      // First snapshot should have 0 PnL
      expect(history[0].pnl).toBe(0);
      expect(history[0].roi).toBe(0);

      // Later snapshots should have PnL
      if (history.length > 1) {
        expect(history[history.length - 1].pnl).not.toBe(0);
      }
    });

    it('should order by timestamp ascending', async () => {
      const history = await engine.getPerformanceHistory(
        '0x1234567890123456789012345678901234567890',
        '30d',
        'daily'
      );

      for (let i = 1; i < history.length; i++) {
        const prev = new Date(history[i - 1].timestamp);
        const curr = new Date(history[i].timestamp);
        expect(curr.getTime()).toBeGreaterThanOrEqual(prev.getTime());
      }
    });

    it('should handle different time ranges', async () => {
      const history7d = await engine.getPerformanceHistory(
        '0x1234567890123456789012345678901234567890',
        '7d',
        'daily'
      );

      const history30d = await engine.getPerformanceHistory(
        '0x1234567890123456789012345678901234567890',
        '30d',
        'daily'
      );

      expect(history7d.length).toBeLessThanOrEqual(history30d.length);
    });
  });

  describe('calculateStatistics', () => {
    it('should calculate statistics from history', async () => {
      const history = await engine.getPerformanceHistory(
        '0x1234567890123456789012345678901234567890',
        '30d',
        'daily'
      );

      const stats = engine.calculateStatistics(history);

      expect(stats.maxValue).toBeGreaterThan(0);
      expect(stats.minValue).toBeGreaterThan(0);
      expect(stats.avgValue).toBeGreaterThan(0);
      expect(stats.maxValue).toBeGreaterThanOrEqual(stats.avgValue);
      expect(stats.avgValue).toBeGreaterThanOrEqual(stats.minValue);
    });

    it('should calculate volatility', async () => {
      const history = await engine.getPerformanceHistory(
        '0x1234567890123456789012345678901234567890',
        '30d',
        'daily'
      );

      const stats = engine.calculateStatistics(history);

      expect(stats.volatility).toBeGreaterThanOrEqual(0);
    });

    it('should calculate Sharpe ratio', async () => {
      const history = await engine.getPerformanceHistory(
        '0x1234567890123456789012345678901234567890',
        '30d',
        'daily'
      );

      const stats = engine.calculateStatistics(history);

      expect(stats.sharpeRatio).toBeDefined();
    });

    it('should calculate max drawdown', async () => {
      const history = await engine.getPerformanceHistory(
        '0x1234567890123456789012345678901234567890',
        '30d',
        'daily'
      );

      const stats = engine.calculateStatistics(history);

      expect(stats.maxDrawdown).toBeGreaterThanOrEqual(0);
      expect(stats.maxDrawdown).toBeLessThanOrEqual(100);
    });

    it('should handle empty history', () => {
      const stats = engine.calculateStatistics([]);

      expect(stats.maxValue).toBe(0);
      expect(stats.minValue).toBe(0);
      expect(stats.avgValue).toBe(0);
      expect(stats.volatility).toBe(0);
      expect(stats.sharpeRatio).toBe(0);
      expect(stats.maxDrawdown).toBe(0);
    });
  });

  describe('getTopPerformers', () => {
    it('should get best and worst performers', async () => {
      const performers = await engine.getTopPerformers(
        '0x1234567890123456789012345678901234567890',
        5
      );

      expect(performers.best.length).toBeGreaterThan(0);
      expect(performers.worst.length).toBeGreaterThan(0);
    });

    it('should order best performers by ROI descending', async () => {
      const performers = await engine.getTopPerformers(
        '0x1234567890123456789012345678901234567890',
        5
      );

      for (let i = 1; i < performers.best.length; i++) {
        expect(performers.best[i - 1].roi).toBeGreaterThanOrEqual(
          performers.best[i].roi
        );
      }
    });

    it('should include token details', async () => {
      const performers = await engine.getTopPerformers(
        '0x1234567890123456789012345678901234567890',
        5
      );

      const performer = performers.best[0];
      expect(performer.tokenSymbol).toBeDefined();
      expect(performer.roi).toBeDefined();
      expect(performer.pnl).toBeDefined();
      expect(performer.valueUsd).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const performers = await engine.getTopPerformers(
        '0x1234567890123456789012345678901234567890',
        3
      );

      expect(performers.best.length).toBeLessThanOrEqual(3);
      expect(performers.worst.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getBenchmarkHistory', () => {
    it('should generate ETH benchmark', async () => {
      const benchmark = await engine.getBenchmarkHistory('eth', '30d', 'daily');

      expect(benchmark.length).toBeGreaterThan(0);
      expect(benchmark[0].totalValueUsd).toBeGreaterThan(1000); // ETH price > $1000
    });

    it('should generate BTC benchmark', async () => {
      const benchmark = await engine.getBenchmarkHistory('btc', '30d', 'daily');

      expect(benchmark.length).toBeGreaterThan(0);
      expect(benchmark[0].totalValueUsd).toBeGreaterThan(20000); // BTC price > $20000
    });

    it('should have correct time range', async () => {
      const benchmark7d = await engine.getBenchmarkHistory('eth', '7d', 'daily');
      const benchmark30d = await engine.getBenchmarkHistory('eth', '30d', 'daily');

      expect(benchmark7d.length).toBeLessThanOrEqual(benchmark30d.length);
    });
  });

  describe('compareWallets', () => {
    it('should compare multiple wallets', async () => {
      const comparison = await engine.compareWallets(
        [
          '0x1234567890123456789012345678901234567890',
          '0x2345678901234567890123456789012345678901',
        ],
        '30d'
      );

      expect(comparison.wallets.length).toBe(2);
      expect(comparison.comparison.bestPerformer).toBeDefined();
      expect(comparison.comparison.avgRoi).toBeDefined();
      expect(comparison.comparison.correlationMatrix.length).toBe(2);
    });

    it('should identify best performer', async () => {
      const comparison = await engine.compareWallets(
        [
          '0x1234567890123456789012345678901234567890',
          '0x4567890123456789012345678901234567890123', // Stablecoin holder (lower ROI)
        ],
        '30d'
      );

      expect(comparison.comparison.bestPerformer).toBe(
        '0x1234567890123456789012345678901234567890'
      );
    });

    it('should calculate average ROI', async () => {
      const comparison = await engine.compareWallets(
        [
          '0x1234567890123456789012345678901234567890',
          '0x2345678901234567890123456789012345678901',
        ],
        '30d'
      );

      const avgRoi = comparison.wallets.reduce((sum, w) => sum + w.performance.roi, 0) / 2;
      expect(comparison.comparison.avgRoi).toBeCloseTo(avgRoi, 2);
    });

    it('should include correlation matrix', async () => {
      const comparison = await engine.compareWallets(
        [
          '0x1234567890123456789012345678901234567890',
          '0x2345678901234567890123456789012345678901',
        ],
        '30d'
      );

      const matrix = comparison.comparison.correlationMatrix;
      expect(matrix.length).toBe(2);
      expect(matrix[0].length).toBe(2);

      // Diagonal should be 1.0 (perfect correlation with self)
      expect(matrix[0][0]).toBe(1.0);
      expect(matrix[1][1]).toBe(1.0);
    });

    it('should throw error for too many wallets', async () => {
      await expect(
        engine.compareWallets(
          [
            '0x1234567890123456789012345678901234567890',
            '0x2345678901234567890123456789012345678901',
            '0x3456789012345678901234567890123456789012',
            '0x4567890123456789012345678901234567890123',
            '0x5678901234567890123456789012345678901234',
            '0x6789012345678901234567890123456789012345', // 6 wallets
          ],
          '30d'
        )
      ).rejects.toThrow('Must provide 1-5 wallet addresses');
    });

    it('should throw error for empty array', async () => {
      await expect(
        engine.compareWallets([], '30d')
      ).rejects.toThrow('Must provide 1-5 wallet addresses');
    });
  });
});

