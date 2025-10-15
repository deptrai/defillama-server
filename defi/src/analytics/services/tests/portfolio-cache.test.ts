/**
 * Unit Tests: PortfolioCache Service
 * Enhancement 2: Redis Caching Layer
 */

import { PortfolioCache } from '../portfolio-cache';
import type {
  CrossChainPortfolio,
  CrossChainAsset,
} from '../../engines/cross-chain-aggregation-engine';

// Mock ioredis
jest.mock('ioredis', () => {
  const RedisMock = require('ioredis-mock');
  return RedisMock;
});

describe('PortfolioCache', () => {
  let cache: PortfolioCache;

  beforeEach(async () => {
    cache = PortfolioCache.getInstance();
    // Clear all cache before each test
    const stats = await cache.getCacheStats();
    if (stats.totalKeys > 0) {
      await cache.invalidateUser('user-001');
      await cache.invalidateUser('user-002');
    }
  });

  afterAll(async () => {
    await cache.close();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PortfolioCache.getInstance();
      const instance2 = PortfolioCache.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Portfolio Caching', () => {
    it('should cache and retrieve portfolio', async () => {
      const mockPortfolio: CrossChainPortfolio = {
        userId: 'user-001',
        walletAddresses: { ethereum: ['0xWallet1'] },
        totalNetWorthUsd: 100000,
        netWorthChange24h: 5.5,
        netWorthChange7d: 10.2,
        netWorthChange30d: 15.8,
        totalAssets: 10,
        totalChains: 2,
        totalWallets: 1,
        assetBreakdown: { ETH: 50000, USDC: 50000 },
        chainBreakdown: { ethereum: 100000 },
        categoryBreakdown: { defi: 50000, stablecoins: 50000 },
        totalPnl: 10000,
        totalRoi: 0.11,
        lastUpdated: '2025-01-15T10:00:00Z',
      };

      // Set portfolio
      await cache.setPortfolio('user-001', mockPortfolio);

      // Get portfolio
      const retrieved = await cache.getPortfolio('user-001');

      expect(retrieved).toEqual(mockPortfolio);
    });

    it('should return null for non-existent portfolio', async () => {
      const retrieved = await cache.getPortfolio('nonexistent-user');
      expect(retrieved).toBeNull();
    });

    it('should invalidate portfolio cache', async () => {
      const mockPortfolio: CrossChainPortfolio = {
        userId: 'user-001',
        walletAddresses: {},
        totalNetWorthUsd: 100000,
        netWorthChange24h: 0,
        netWorthChange7d: 0,
        netWorthChange30d: 0,
        totalAssets: 0,
        totalChains: 0,
        totalWallets: 0,
        assetBreakdown: {},
        chainBreakdown: {},
        categoryBreakdown: {},
        totalPnl: 0,
        totalRoi: 0,
        lastUpdated: '2025-01-15T10:00:00Z',
      };

      // Set portfolio
      await cache.setPortfolio('user-001', mockPortfolio);

      // Verify it's cached
      let retrieved = await cache.getPortfolio('user-001');
      expect(retrieved).toEqual(mockPortfolio);

      // Invalidate
      await cache.invalidatePortfolio('user-001');

      // Verify it's gone
      retrieved = await cache.getPortfolio('user-001');
      expect(retrieved).toBeNull();
    });
  });

  describe('Assets Caching', () => {
    it('should cache and retrieve assets', async () => {
      const mockAssets: CrossChainAsset[] = [
        {
          chainId: 'ethereum',
          walletAddress: '0xWallet1',
          tokenAddress: null,
          tokenSymbol: 'ETH',
          tokenName: 'Ethereum',
          balance: 10.0,
          balanceUsd: 18000.0,
          priceUsd: 1800.0,
          category: 'native',
          isNative: true,
          isWrapped: false,
          isBridged: false,
          costBasisUsd: 15000.0,
          unrealizedPnl: 3000.0,
          roi: 0.2,
        },
      ];

      // Set assets
      await cache.setAssets('user-001', mockAssets);

      // Get assets
      const retrieved = await cache.getAssets('user-001');

      expect(retrieved).toEqual(mockAssets);
    });

    it('should cache assets with filter key', async () => {
      const mockAssets: CrossChainAsset[] = [
        {
          chainId: 'ethereum',
          walletAddress: '0xWallet1',
          tokenAddress: null,
          tokenSymbol: 'ETH',
          tokenName: 'Ethereum',
          balance: 10.0,
          balanceUsd: 18000.0,
          priceUsd: 1800.0,
          category: 'native',
          isNative: true,
          isWrapped: false,
          isBridged: false,
          costBasisUsd: 15000.0,
          unrealizedPnl: 3000.0,
          roi: 0.2,
        },
      ];

      // Set assets with filter
      await cache.setAssets('user-001', mockAssets, 'chain:ethereum');

      // Get assets with filter
      const retrieved = await cache.getAssets('user-001', 'chain:ethereum');

      expect(retrieved).toEqual(mockAssets);

      // Get assets without filter should return null
      const retrievedNoFilter = await cache.getAssets('user-001');
      expect(retrievedNoFilter).toBeNull();
    });
  });

  describe('Performance Caching', () => {
    it('should cache and retrieve performance metrics', async () => {
      const mockPerformance = {
        totalPnl: 10000,
        totalRoi: 0.11,
        pnlByChain: { ethereum: 8000, polygon: 2000 },
        pnlByToken: { ETH: 5000, USDC: 5000 },
        bestPerformers: [{ tokenSymbol: 'ETH', roi: 0.2 }],
        worstPerformers: [{ tokenSymbol: 'USDC', roi: 0.0 }],
      };

      // Set performance
      await cache.setPerformance('user-001', mockPerformance);

      // Get performance
      const retrieved = await cache.getPerformance('user-001');

      expect(retrieved).toEqual(mockPerformance);
    });
  });

  describe('Transactions Caching', () => {
    it('should cache and retrieve transactions', async () => {
      const mockTransactions = {
        transactions: [
          {
            chainId: 'ethereum',
            txHash: '0xTx1',
            type: 'transfer',
            tokenSymbol: 'ETH',
            valueUsd: 1800.0,
            timestamp: '2025-01-15T10:00:00Z',
          },
        ],
        total: 1,
      };

      // Set transactions
      await cache.setTransactions('user-001', mockTransactions);

      // Get transactions
      const retrieved = await cache.getTransactions('user-001');

      expect(retrieved).toEqual(mockTransactions);
    });

    it('should cache transactions with filter key', async () => {
      const mockTransactions = {
        transactions: [
          {
            chainId: 'ethereum',
            txHash: '0xTx1',
            type: 'transfer',
            tokenSymbol: 'ETH',
            valueUsd: 1800.0,
            timestamp: '2025-01-15T10:00:00Z',
          },
        ],
        total: 1,
      };

      // Set transactions with filter
      await cache.setTransactions('user-001', mockTransactions, 'chain:ethereum');

      // Get transactions with filter
      const retrieved = await cache.getTransactions('user-001', 'chain:ethereum');

      expect(retrieved).toEqual(mockTransactions);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all cache for a user', async () => {
      const mockPortfolio: CrossChainPortfolio = {
        userId: 'user-001',
        walletAddresses: {},
        totalNetWorthUsd: 100000,
        netWorthChange24h: 0,
        netWorthChange7d: 0,
        netWorthChange30d: 0,
        totalAssets: 0,
        totalChains: 0,
        totalWallets: 0,
        assetBreakdown: {},
        chainBreakdown: {},
        categoryBreakdown: {},
        totalPnl: 0,
        totalRoi: 0,
        lastUpdated: '2025-01-15T10:00:00Z',
      };

      const mockAssets: CrossChainAsset[] = [];
      const mockPerformance = { totalPnl: 0, totalRoi: 0 };
      const mockTransactions = { transactions: [], total: 0 };

      // Set all cache types
      await cache.setPortfolio('user-001', mockPortfolio);
      await cache.setAssets('user-001', mockAssets);
      await cache.setPerformance('user-001', mockPerformance);
      await cache.setTransactions('user-001', mockTransactions);

      // Invalidate all
      const deletedCount = await cache.invalidateUser('user-001');

      expect(deletedCount).toBeGreaterThan(0);

      // Verify all are gone
      expect(await cache.getPortfolio('user-001')).toBeNull();
      expect(await cache.getAssets('user-001')).toBeNull();
      expect(await cache.getPerformance('user-001')).toBeNull();
      expect(await cache.getTransactions('user-001')).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should return cache statistics', async () => {
      const mockPortfolio: CrossChainPortfolio = {
        userId: 'user-001',
        walletAddresses: {},
        totalNetWorthUsd: 100000,
        netWorthChange24h: 0,
        netWorthChange7d: 0,
        netWorthChange30d: 0,
        totalAssets: 0,
        totalChains: 0,
        totalWallets: 0,
        assetBreakdown: {},
        chainBreakdown: {},
        categoryBreakdown: {},
        totalPnl: 0,
        totalRoi: 0,
        lastUpdated: '2025-01-15T10:00:00Z',
      };

      // Set some cache
      await cache.setPortfolio('user-001', mockPortfolio);
      await cache.setAssets('user-001', []);

      // Get stats
      const stats = await cache.getCacheStats();

      expect(stats.portfolioKeys).toBeGreaterThanOrEqual(1);
      expect(stats.assetsKeys).toBeGreaterThanOrEqual(1);
      expect(stats.totalKeys).toBeGreaterThanOrEqual(2);
    });
  });
});

