/**
 * Unit Tests: CacheWarmer
 * Story: 3.1.1 - Smart Money Identification (Enhancement 1)
 */

import { CacheWarmer } from '../cache-warmer';
import { SmartMoneyCache } from '../smart-money-cache';
import { query } from '../../db/connection';

// Mock dependencies
jest.mock('../../db/connection');
jest.mock('../smart-money-cache');

describe('CacheWarmer', () => {
  let warmer: CacheWarmer;
  let mockCache: jest.Mocked<SmartMoneyCache>;
  let mockQuery: jest.MockedFunction<typeof query>;

  beforeAll(() => {
    // Mock SmartMoneyCache
    mockCache = {
      setWalletList: jest.fn(),
    } as any;

    (SmartMoneyCache.getInstance as jest.Mock).mockReturnValue(mockCache);

    // Mock query function
    mockQuery = query as jest.MockedFunction<typeof query>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    warmer = CacheWarmer.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CacheWarmer.getInstance();
      const instance2 = CacheWarmer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('warmCache', () => {
    it('should warm cache with default strategies', async () => {
      // Mock count query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '25' }],
      } as any);

      // Mock wallets query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            wallet_address: '0x1234',
            chain_id: 'ethereum',
            wallet_name: 'Test Wallet',
            wallet_type: 'whale',
            discovery_method: 'manual',
            verified: true,
            smart_money_score: '95.5',
            confidence_level: 'high',
            total_pnl: '1000000',
            roi_all_time: '150.5',
            win_rate: '75.5',
            sharpe_ratio: '2.5',
            max_drawdown: '-15.5',
            total_trades: '500',
            avg_trade_size: '50000',
            avg_holding_period_days: '30',
            last_trade_timestamp: new Date(),
            trading_style: 'position_trading',
            risk_profile: 'medium',
            preferred_tokens: ['ETH', 'USDC'],
            preferred_protocols: ['Uniswap', 'Aave'],
            first_seen: new Date(),
            last_updated: new Date(),
          },
        ],
      } as any);

      mockCache.setWalletList.mockResolvedValue();

      // Warm with single strategy
      const stats = await warmer.warmCache([
        {
          name: 'Test Strategy',
          params: {
            sortBy: 'score',
            sortOrder: 'desc',
            page: 1,
            limit: 20,
          },
        },
      ]);

      expect(stats.totalStrategies).toBe(1);
      expect(stats.successfulWarmings).toBe(1);
      expect(stats.failedWarmings).toBe(0);
      expect(mockCache.setWalletList).toHaveBeenCalledTimes(1);
    });

    it('should handle warming failures gracefully', async () => {
      // Mock query to throw error
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const stats = await warmer.warmCache([
        {
          name: 'Failing Strategy',
          params: {
            sortBy: 'score',
            sortOrder: 'desc',
            page: 1,
            limit: 20,
          },
        },
      ]);

      expect(stats.totalStrategies).toBe(1);
      expect(stats.successfulWarmings).toBe(0);
      expect(stats.failedWarmings).toBe(1);
    });

    it('should warm multiple strategies', async () => {
      // Mock count query (called twice)
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '25' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '10' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockCache.setWalletList.mockResolvedValue();

      const stats = await warmer.warmCache([
        {
          name: 'Strategy 1',
          params: { sortBy: 'score', sortOrder: 'desc', page: 1, limit: 20 },
        },
        {
          name: 'Strategy 2',
          params: { sortBy: 'roi', sortOrder: 'desc', page: 1, limit: 20 },
        },
      ]);

      expect(stats.totalStrategies).toBe(2);
      expect(stats.successfulWarmings).toBe(2);
      expect(stats.failedWarmings).toBe(0);
      expect(mockCache.setWalletList).toHaveBeenCalledTimes(2);
    });

    it('should warm with filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockCache.setWalletList.mockResolvedValue();

      await warmer.warmCache([
        {
          name: 'Filtered Strategy',
          params: {
            minScore: 90,
            verified: true,
            walletType: 'whale',
            sortBy: 'pnl',
            sortOrder: 'desc',
            page: 1,
            limit: 10,
          },
        },
      ]);

      // Verify query was called with correct parameters
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining([90, true, 'whale', 10, 0])
      );
    });

    it('should warm with chains filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '3' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockCache.setWalletList.mockResolvedValue();

      await warmer.warmCache([
        {
          name: 'Chains Strategy',
          params: {
            chains: ['ethereum', 'polygon'],
            sortBy: 'score',
            sortOrder: 'desc',
            page: 1,
            limit: 20,
          },
        },
      ]);

      // Verify query was called with chains filter
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('chain_id = ANY'),
        expect.arrayContaining([['ethereum', 'polygon']])
      );
    });

    it('should use default strategies if none provided', async () => {
      // Mock queries for all default strategies (8 strategies)
      for (let i = 0; i < 8; i++) {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ count: '10' }] } as any)
          .mockResolvedValueOnce({ rows: [] } as any);
      }

      mockCache.setWalletList.mockResolvedValue();

      const stats = await warmer.warmCache();

      expect(stats.totalStrategies).toBe(8); // Default strategies count
      expect(stats.successfulWarmings).toBe(8);
    });

    it('should track duration', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockCache.setWalletList.mockResolvedValue();

      const stats = await warmer.warmCache([
        {
          name: 'Test',
          params: { sortBy: 'score', sortOrder: 'desc', page: 1, limit: 20 },
        },
      ]);

      expect(stats.duration).toBeGreaterThan(0);
      expect(stats.timestamp).toBeInstanceOf(Date);
    });
  });
});

