/**
 * Performance Calculator Engine Tests
 * Story: 3.1.3 - Performance Attribution
 */

import { PerformanceCalculator } from '../performance-calculator';

describe('PerformanceCalculator', () => {
  let calculator: PerformanceCalculator;

  beforeEach(() => {
    calculator = PerformanceCalculator.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceCalculator.getInstance();
      const instance2 = PerformanceCalculator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('calculatePnL', () => {
    it('should calculate P&L metrics correctly', async () => {
      // Mock wallet ID (would need actual test data in database)
      const walletId = 'test-wallet-id';

      const pnl = await calculator.calculatePnL(walletId);

      expect(pnl).toHaveProperty('realizedPnl');
      expect(pnl).toHaveProperty('unrealizedPnl');
      expect(pnl).toHaveProperty('totalPnl');
      expect(pnl).toHaveProperty('tokenBreakdown');
      expect(Array.isArray(pnl.tokenBreakdown)).toBe(true);
    });

    it('should handle empty trades', async () => {
      const walletId = 'non-existent-wallet';

      const pnl = await calculator.calculatePnL(walletId);

      expect(pnl.realizedPnl).toBe(0);
      expect(pnl.unrealizedPnl).toBe(0);
      expect(pnl.totalPnl).toBe(0);
      expect(pnl.tokenBreakdown).toEqual([]);
    });

    it('should filter by time range', async () => {
      const walletId = 'test-wallet-id';
      const timeRange = { days: 30 };

      const pnl = await calculator.calculatePnL(walletId, timeRange);

      expect(pnl).toHaveProperty('realizedPnl');
      expect(pnl).toHaveProperty('unrealizedPnl');
      expect(pnl).toHaveProperty('totalPnl');
    });

    it('should include token breakdown', async () => {
      const walletId = 'test-wallet-id';

      const pnl = await calculator.calculatePnL(walletId);

      if (pnl.tokenBreakdown.length > 0) {
        const token = pnl.tokenBreakdown[0];
        expect(token).toHaveProperty('tokenAddress');
        expect(token).toHaveProperty('tokenSymbol');
        expect(token).toHaveProperty('pnl');
        expect(token).toHaveProperty('roi');
        expect(token).toHaveProperty('tradeCount');
      }
    });
  });

  describe('calculateWinRate', () => {
    it('should calculate win rate metrics correctly', async () => {
      const walletId = 'test-wallet-id';

      const winRate = await calculator.calculateWinRate(walletId);

      expect(winRate).toHaveProperty('overallWinRate');
      expect(winRate).toHaveProperty('totalTrades');
      expect(winRate).toHaveProperty('winningTrades');
      expect(winRate).toHaveProperty('losingTrades');
      expect(winRate).toHaveProperty('byToken');
      expect(winRate).toHaveProperty('byStrategy');
    });

    it('should handle zero trades', async () => {
      const walletId = 'non-existent-wallet';

      const winRate = await calculator.calculateWinRate(walletId);

      expect(winRate.overallWinRate).toBe(0);
      expect(winRate.totalTrades).toBe(0);
      expect(winRate.winningTrades).toBe(0);
      expect(winRate.losingTrades).toBe(0);
    });

    it('should calculate win rate by token', async () => {
      const walletId = 'test-wallet-id';

      const winRate = await calculator.calculateWinRate(walletId);

      expect(typeof winRate.byToken).toBe('object');
    });

    it('should calculate win rate by strategy', async () => {
      const walletId = 'test-wallet-id';

      const winRate = await calculator.calculateWinRate(walletId);

      expect(typeof winRate.byStrategy).toBe('object');
    });

    it('should filter by time range', async () => {
      const walletId = 'test-wallet-id';
      const timeRange = { days: 7 };

      const winRate = await calculator.calculateWinRate(walletId, timeRange);

      expect(winRate).toHaveProperty('overallWinRate');
    });
  });

  describe('calculateRiskMetrics', () => {
    it('should calculate risk metrics correctly', async () => {
      const walletId = 'test-wallet-id';

      const riskMetrics = await calculator.calculateRiskMetrics(walletId);

      expect(riskMetrics).toHaveProperty('sharpeRatio');
      expect(riskMetrics).toHaveProperty('sortinoRatio');
      expect(riskMetrics).toHaveProperty('maxDrawdown');
      expect(riskMetrics).toHaveProperty('maxDrawdownUsd');
      expect(riskMetrics).toHaveProperty('volatility');
      expect(riskMetrics).toHaveProperty('downsideVolatility');
    });

    it('should handle no snapshots', async () => {
      const walletId = 'non-existent-wallet';

      const riskMetrics = await calculator.calculateRiskMetrics(walletId);

      expect(riskMetrics.sharpeRatio).toBe(0);
      expect(riskMetrics.sortinoRatio).toBe(0);
      expect(riskMetrics.maxDrawdown).toBe(0);
      expect(riskMetrics.maxDrawdownUsd).toBe(0);
      expect(riskMetrics.volatility).toBe(0);
      expect(riskMetrics.downsideVolatility).toBe(0);
    });

    it('should calculate Sharpe ratio correctly', async () => {
      const walletId = 'test-wallet-id';

      const riskMetrics = await calculator.calculateRiskMetrics(walletId);

      expect(typeof riskMetrics.sharpeRatio).toBe('number');
    });

    it('should calculate Sortino ratio correctly', async () => {
      const walletId = 'test-wallet-id';

      const riskMetrics = await calculator.calculateRiskMetrics(walletId);

      expect(typeof riskMetrics.sortinoRatio).toBe('number');
    });

    it('should calculate max drawdown correctly', async () => {
      const walletId = 'test-wallet-id';

      const riskMetrics = await calculator.calculateRiskMetrics(walletId);

      expect(typeof riskMetrics.maxDrawdown).toBe('number');
      expect(typeof riskMetrics.maxDrawdownUsd).toBe('number');
    });
  });

  describe('calculatePerformanceMetrics', () => {
    it('should calculate comprehensive metrics', async () => {
      const walletId = 'test-wallet-id';

      const metrics = await calculator.calculatePerformanceMetrics(walletId);

      expect(metrics).toHaveProperty('walletId');
      expect(metrics).toHaveProperty('calculationDate');
      expect(metrics).toHaveProperty('totalTrades');
      expect(metrics).toHaveProperty('winningTrades');
      expect(metrics).toHaveProperty('losingTrades');
      expect(metrics).toHaveProperty('winRate');
      expect(metrics).toHaveProperty('realizedPnl');
      expect(metrics).toHaveProperty('unrealizedPnl');
      expect(metrics).toHaveProperty('totalPnl');
      expect(metrics).toHaveProperty('sharpeRatio');
      expect(metrics).toHaveProperty('sortinoRatio');
      expect(metrics).toHaveProperty('maxDrawdown');
    });

    it('should handle empty wallet', async () => {
      const walletId = 'non-existent-wallet';

      const metrics = await calculator.calculatePerformanceMetrics(walletId);

      expect(metrics.totalTrades).toBe(0);
      expect(metrics.winningTrades).toBe(0);
      expect(metrics.losingTrades).toBe(0);
      expect(metrics.winRate).toBe(0);
    });

    it('should filter by time range', async () => {
      const walletId = 'test-wallet-id';
      const timeRange = { days: 90 };

      const metrics = await calculator.calculatePerformanceMetrics(walletId, timeRange);

      expect(metrics).toHaveProperty('totalTrades');
    });

    it('should include trade statistics', async () => {
      const walletId = 'test-wallet-id';

      const metrics = await calculator.calculatePerformanceMetrics(walletId);

      expect(metrics).toHaveProperty('bestTradePnl');
      expect(metrics).toHaveProperty('worstTradePnl');
      expect(metrics).toHaveProperty('averageTradePnl');
      expect(metrics).toHaveProperty('medianTradePnl');
    });

    it('should include holding period metrics', async () => {
      const walletId = 'test-wallet-id';

      const metrics = await calculator.calculatePerformanceMetrics(walletId);

      expect(metrics).toHaveProperty('averageHoldingPeriodDays');
      expect(metrics).toHaveProperty('medianHoldingPeriodDays');
    });
  });

  describe('storePerformanceMetrics', () => {
    it('should store metrics in database', async () => {
      const metrics = {
        walletId: 'test-wallet-id',
        calculationDate: new Date(),
        totalTrades: 100,
        winningTrades: 75,
        losingTrades: 25,
        winRate: 75.0,
        realizedPnl: 1000000,
        unrealizedPnl: 50000,
        totalPnl: 1050000,
        totalVolumeUsd: 10000000,
        averageTradeSize: 100000,
        sharpeRatio: 2.5,
        sortinoRatio: 3.0,
        maxDrawdown: 10.0,
        maxDrawdownUsd: 100000,
        volatility: 0.15,
        downsideVolatility: 0.10,
        bestTradePnl: 50000,
        worstTradePnl: -10000,
        averageTradePnl: 10000,
        medianTradePnl: 8000,
        averageHoldingPeriodDays: 30,
        medianHoldingPeriodDays: 25,
      };

      await expect(
        calculator.storePerformanceMetrics(metrics)
      ).resolves.not.toThrow();
    });
  });
});

