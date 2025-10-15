/**
 * Portfolio Valuation Engine Tests
 * Story: 2.2.1 - Wallet Portfolio Tracking
 */

import { PortfolioValuationEngine } from '../portfolio-valuation-engine';

describe('PortfolioValuationEngine', () => {
  let engine: PortfolioValuationEngine;

  beforeAll(() => {
    engine = PortfolioValuationEngine.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PortfolioValuationEngine.getInstance();
      const instance2 = PortfolioValuationEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getPortfolioSummary', () => {
    it('should get portfolio summary for whale wallet', async () => {
      const summary = await engine.getPortfolioSummary(
        '0x1234567890123456789012345678901234567890'
      );

      expect(summary.walletAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(summary.totalValueUsd).toBeGreaterThan(0);
      expect(summary.chains.length).toBeGreaterThan(0);
      expect(summary.performance).toBeDefined();
      expect(summary.risk).toBeDefined();
    });

    it('should aggregate across multiple chains', async () => {
      const summary = await engine.getPortfolioSummary(
        '0x1234567890123456789012345678901234567890'
      );

      expect(summary.chains.length).toBe(3); // Ethereum, Arbitrum, Optimism
      expect(summary.totalValueUsd).toBeCloseTo(7500000, -5); // ~7.5M total
    });

    it('should filter by specific chains', async () => {
      const summary = await engine.getPortfolioSummary(
        '0x1234567890123456789012345678901234567890',
        ['ethereum']
      );

      expect(summary.chains.length).toBe(1);
      expect(summary.chains[0].chainId).toBe('ethereum');
    });

    it('should calculate performance metrics', async () => {
      const summary = await engine.getPortfolioSummary(
        '0x1234567890123456789012345678901234567890'
      );

      expect(summary.performance.pnl24h).toBeDefined();
      expect(summary.performance.pnl7d).toBeDefined();
      expect(summary.performance.pnl30d).toBeDefined();
      expect(summary.performance.pnlAllTime).toBeGreaterThan(0);
      expect(summary.performance.roiAllTime).toBeGreaterThan(0);
    });

    it('should calculate risk metrics', async () => {
      const summary = await engine.getPortfolioSummary(
        '0x1234567890123456789012345678901234567890'
      );

      expect(summary.risk.concentrationScore).toBeGreaterThan(0);
      expect(summary.risk.concentrationScore).toBeLessThanOrEqual(100);
      expect(summary.risk.diversificationScore).toBeGreaterThan(0);
      expect(summary.risk.diversificationScore).toBeLessThanOrEqual(100);
      expect(summary.risk.topHoldingPct).toBeGreaterThan(0);
      expect(summary.risk.topHoldingPct).toBeLessThanOrEqual(100);
    });

    it('should throw error for non-existent wallet', async () => {
      await expect(
        engine.getPortfolioSummary('0xNonExistent')
      ).rejects.toThrow('No portfolio found');
    });
  });

  describe('getChainPortfolios', () => {
    it('should get portfolios for all chains', async () => {
      const portfolios = await engine.getChainPortfolios(
        '0x1234567890123456789012345678901234567890'
      );

      expect(portfolios.length).toBe(3);
      expect(portfolios[0].chainId).toBeDefined();
      expect(portfolios[0].totalValueUsd).toBeGreaterThan(0);
    });

    it('should order by value descending', async () => {
      const portfolios = await engine.getChainPortfolios(
        '0x1234567890123456789012345678901234567890'
      );

      for (let i = 1; i < portfolios.length; i++) {
        expect(portfolios[i - 1].totalValueUsd).toBeGreaterThanOrEqual(
          portfolios[i].totalValueUsd
        );
      }
    });

    it('should filter by specific chains', async () => {
      const portfolios = await engine.getChainPortfolios(
        '0x1234567890123456789012345678901234567890',
        ['ethereum', 'arbitrum']
      );

      expect(portfolios.length).toBe(2);
      expect(portfolios.every(p => ['ethereum', 'arbitrum'].includes(p.chainId))).toBe(true);
    });
  });

  describe('getTopHoldingPercentage', () => {
    it('should calculate top holding percentage', async () => {
      const pct = await engine.getTopHoldingPercentage(
        '0x1234567890123456789012345678901234567890'
      );

      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThanOrEqual(100);
    });

    it('should return 0 for wallet with no holdings', async () => {
      const pct = await engine.getTopHoldingPercentage('0xNonExistent');
      expect(pct).toBe(0);
    });

    it('should filter by chains', async () => {
      const pct = await engine.getTopHoldingPercentage(
        '0x1234567890123456789012345678901234567890',
        ['ethereum']
      );

      expect(pct).toBeGreaterThan(0);
    });
  });

  describe('getTotalValue', () => {
    it('should get total portfolio value', async () => {
      const value = await engine.getTotalValue(
        '0x1234567890123456789012345678901234567890'
      );

      expect(value).toBeGreaterThan(0);
      expect(value).toBeCloseTo(7500000, -5);
    });

    it('should filter by chains', async () => {
      const value = await engine.getTotalValue(
        '0x1234567890123456789012345678901234567890',
        ['ethereum']
      );

      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(7500000); // Less than total
    });
  });

  describe('getPortfolioCount', () => {
    it('should count portfolios across chains', async () => {
      const count = await engine.getPortfolioCount(
        '0x1234567890123456789012345678901234567890'
      );

      expect(count).toBe(3); // Ethereum, Arbitrum, Optimism
    });

    it('should return 0 for non-existent wallet', async () => {
      const count = await engine.getPortfolioCount('0xNonExistent');
      expect(count).toBe(0);
    });
  });

  describe('hasPortfolio', () => {
    it('should return true for wallet with portfolio', async () => {
      const has = await engine.hasPortfolio(
        '0x1234567890123456789012345678901234567890'
      );

      expect(has).toBe(true);
    });

    it('should return false for wallet without portfolio', async () => {
      const has = await engine.hasPortfolio('0xNonExistent');
      expect(has).toBe(false);
    });
  });

  describe('Stablecoin Holder', () => {
    it('should have low concentration score', async () => {
      const summary = await engine.getPortfolioSummary(
        '0x4567890123456789012345678901234567890123'
      );

      expect(summary.risk.concentrationScore).toBeGreaterThan(60); // High concentration in stablecoins
    });

    it('should have low ROI', async () => {
      const summary = await engine.getPortfolioSummary(
        '0x4567890123456789012345678901234567890123'
      );

      expect(summary.performance.roiAllTime).toBeLessThan(0.1); // <10% ROI
    });
  });

  describe('Active Trader', () => {
    it('should have high diversification', async () => {
      const summary = await engine.getPortfolioSummary(
        '0x5678901234567890123456789012345678901234'
      );

      expect(summary.risk.diversificationScore).toBeGreaterThan(70);
    });

    it('should have many tokens', async () => {
      const summary = await engine.getPortfolioSummary(
        '0x5678901234567890123456789012345678901234'
      );

      expect(summary.chains[0].tokenCount).toBeGreaterThan(15);
    });
  });
});

