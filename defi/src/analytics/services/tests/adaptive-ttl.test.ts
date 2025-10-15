/**
 * Unit Tests: Adaptive TTL
 * Story: 3.1.1 - Smart Money Identification (Enhancement 2)
 */

import { SmartMoneyCache } from '../smart-money-cache';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

// Mock MonitoringService
jest.mock('../monitoring-service', () => ({
  MonitoringService: {
    getInstance: jest.fn(() => ({
      recordCacheHit: jest.fn(),
      recordCacheMiss: jest.fn(),
    })),
  },
}));

describe('Adaptive TTL', () => {
  let cache: SmartMoneyCache;
  let mockRedis: jest.Mocked<Redis>;

  beforeAll(() => {
    // Create mock Redis instance
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      hgetall: jest.fn(),
      hincrby: jest.fn(),
      hset: jest.fn(),
      expire: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cache = SmartMoneyCache.getInstance();
  });

  describe('calculateAdaptiveTTL', () => {
    it('should use base TTL when no volatility data exists', async () => {
      mockRedis.hgetall.mockResolvedValue({});
      mockRedis.setex.mockResolvedValue('OK');

      const params = {
        sortBy: 'score',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      };

      const data = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      await cache.setWalletList(params, data);

      // Verify setex was called with base TTL (5 minutes = 300 seconds)
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        300, // Base TTL
        expect.any(String)
      );
    });

    it('should use MIN_TTL for high volatility data', async () => {
      // Mock high volatility (>10 changes/hour)
      const lastChanged = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      mockRedis.hgetall.mockResolvedValue({
        changes: '15', // 15 changes in 1 hour = 15 changes/hour
        lastChanged: lastChanged.toISOString(),
      });
      mockRedis.setex.mockResolvedValue('OK');

      const params = {
        sortBy: 'score',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      };

      const data = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      await cache.setWalletList(params, data);

      // Verify setex was called with MIN_TTL (2 minutes = 120 seconds)
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        120, // MIN_TTL
        expect.any(String)
      );
    });

    it('should use base TTL for medium volatility data', async () => {
      // Mock medium volatility (5-10 changes/hour)
      const lastChanged = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      mockRedis.hgetall.mockResolvedValue({
        changes: '7', // 7 changes in 1 hour = 7 changes/hour
        lastChanged: lastChanged.toISOString(),
      });
      mockRedis.setex.mockResolvedValue('OK');

      const params = {
        sortBy: 'score',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      };

      const data = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      await cache.setWalletList(params, data);

      // Verify setex was called with base TTL (5 minutes = 300 seconds)
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        300, // Base TTL
        expect.any(String)
      );
    });

    it('should use MAX_TTL for low volatility data', async () => {
      // Mock low volatility (<5 changes/hour)
      const lastChanged = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      mockRedis.hgetall.mockResolvedValue({
        changes: '3', // 3 changes in 1 hour = 3 changes/hour
        lastChanged: lastChanged.toISOString(),
      });
      mockRedis.setex.mockResolvedValue('OK');

      const params = {
        sortBy: 'score',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      };

      const data = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      await cache.setWalletList(params, data);

      // Verify setex was called with MAX_TTL (15 minutes = 900 seconds)
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        900, // MAX_TTL
        expect.any(String)
      );
    });
  });

  describe('trackCacheInvalidation', () => {
    it('should track invalidation when invalidating wallet lists', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2']);
      mockRedis.hincrby.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(2);

      await cache.invalidateWalletLists();

      // Verify tracking was called for each key
      expect(mockRedis.hincrby).toHaveBeenCalledTimes(2);
      expect(mockRedis.hset).toHaveBeenCalledTimes(2);
      expect(mockRedis.expire).toHaveBeenCalledTimes(2);
    });
  });

  describe('getVolatilityMetrics', () => {
    it('should return volatility metrics for a cache key', async () => {
      const lastChanged = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      mockRedis.hgetall
        .mockResolvedValueOnce({
          changes: '10',
          lastChanged: lastChanged.toISOString(),
        })
        .mockResolvedValueOnce({
          changes: '10',
          lastChanged: lastChanged.toISOString(),
        });

      const metrics = await cache.getVolatilityMetrics('test-key');

      expect(metrics.changes).toBe(10);
      expect(metrics.lastChanged).toBeInstanceOf(Date);
      expect(metrics.changeFrequency).toBeGreaterThan(0);
      expect(metrics.recommendedTTL).toBeGreaterThan(0);
    });

    it('should return default metrics when no volatility data exists', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const metrics = await cache.getVolatilityMetrics('test-key');

      expect(metrics.changes).toBe(0);
      expect(metrics.lastChanged).toBeNull();
      expect(metrics.changeFrequency).toBe(0);
      expect(metrics.recommendedTTL).toBe(300); // Base TTL
    });
  });

  describe('Adaptive TTL Integration', () => {
    it('should adapt TTL based on invalidation frequency', async () => {
      // Simulate multiple invalidations
      mockRedis.keys.mockResolvedValue(['key1']);
      mockRedis.hincrby.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      // Invalidate 3 times
      await cache.invalidateWalletLists();
      await cache.invalidateWalletLists();
      await cache.invalidateWalletLists();

      // Verify tracking was called 3 times
      expect(mockRedis.hincrby).toHaveBeenCalledTimes(3);
    });
  });
});

