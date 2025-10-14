/**
 * Integration Tests for Cache Manager
 * Tests Redis caching operations with real Redis instance
 */

import { CacheManager } from '../cache-manager';
import { QueryRequest, QueryResponse } from '../types';
import { getRedisClient } from '../../utils/shared/redis';

describe('CacheManager Integration Tests', () => {
  let cacheManager: CacheManager;
  let redis: any;

  beforeAll(async () => {
    // Initialize Redis client
    redis = await getRedisClient();
    cacheManager = new CacheManager(300); // 5 minutes TTL
  });

  afterAll(async () => {
    // Clean up Redis
    if (redis) {
      await redis.quit();
    }
  });

  beforeEach(async () => {
    // Clear all cache keys before each test
    const keys = await redis.keys('query:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for same query', () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
          ],
        },
      };

      const key1 = cacheManager.generateCacheKey(query);
      const key2 = cacheManager.generateCacheKey(query);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^query:protocols:[a-f0-9]{64}$/);
    });

    it('should generate different cache keys for different queries', () => {
      const query1: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
          ],
        },
      };

      const query2: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'bsc' },
          ],
        },
      };

      const key1 = cacheManager.generateCacheKey(query1);
      const key2 = cacheManager.generateCacheKey(query2);

      expect(key1).not.toBe(key2);
    });

    it('should generate same key regardless of property order', () => {
      const query1: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
          ],
        },
      };

      const query2: QueryRequest = {
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
          ],
        },
        table: 'protocols',
      };

      const key1 = cacheManager.generateCacheKey(query1);
      const key2 = cacheManager.generateCacheKey(query2);

      expect(key1).toBe(key2);
    });
  });

  describe('Cache Set and Get', () => {
    it('should cache and retrieve query results', async () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
          ],
        },
      };

      const response: QueryResponse = {
        data: [
          { id: 'protocol-1', name: 'Protocol 1', chain: 'ethereum' },
          { id: 'protocol-2', name: 'Protocol 2', chain: 'ethereum' },
        ],
        count: 2,
        executionTime: 150,
        cacheHit: false,
      };

      // Set cache
      await cacheManager.set(query, response);

      // Get from cache
      const cached = await cacheManager.get(query);

      expect(cached).not.toBeNull();
      expect(cached?.data).toEqual(response.data);
      expect(cached?.count).toBe(response.count);
      expect(cached?.cacheHit).toBe(true);
    });

    it('should return null for non-existent cache key', async () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'nonexistent' },
          ],
        },
      };

      const cached = await cacheManager.get(query);

      expect(cached).toBeNull();
    });

    it('should respect TTL and expire cache', async () => {
      const cacheManagerShortTTL = new CacheManager(1); // 1 second TTL

      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
          ],
        },
      };

      const response: QueryResponse = {
        data: [{ id: 'protocol-1', name: 'Protocol 1' }],
        count: 1,
        executionTime: 100,
        cacheHit: false,
      };

      // Set cache
      await cacheManagerShortTTL.set(query, response);

      // Get immediately (should exist)
      const cached1 = await cacheManagerShortTTL.get(query);
      expect(cached1).not.toBeNull();

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get after expiry (should be null)
      const cached2 = await cacheManagerShortTTL.get(query);
      expect(cached2).toBeNull();
    }, 10000);
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific cache key', async () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
          ],
        },
      };

      const response: QueryResponse = {
        data: [{ id: 'protocol-1', name: 'Protocol 1' }],
        count: 1,
        executionTime: 100,
        cacheHit: false,
      };

      // Set cache
      await cacheManager.set(query, response);

      // Verify cache exists
      const cached1 = await cacheManager.get(query);
      expect(cached1).not.toBeNull();

      // Invalidate cache
      const cacheKey = cacheManager.generateCacheKey(query);
      await cacheManager.delete(cacheKey);

      // Verify cache is gone
      const cached2 = await cacheManager.get(query);
      expect(cached2).toBeNull();
    });

    it('should invalidate cache by pattern', async () => {
      const query1: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
          ],
        },
      };

      const query2: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'bsc' },
          ],
        },
      };

      const response: QueryResponse = {
        data: [{ id: 'protocol-1', name: 'Protocol 1' }],
        count: 1,
        executionTime: 100,
        cacheHit: false,
      };

      // Set both caches
      await cacheManager.set(query1, response);
      await cacheManager.set(query2, response);

      // Verify both exist
      const cached1 = await cacheManager.get(query1);
      const cached2 = await cacheManager.get(query2);
      expect(cached1).not.toBeNull();
      expect(cached2).not.toBeNull();

      // Invalidate all protocols queries
      const invalidated = await cacheManager.invalidate('query:protocols:*');
      expect(invalidated).toBeGreaterThanOrEqual(2);

      // Verify both are gone
      const cached3 = await cacheManager.get(query1);
      const cached4 = await cacheManager.get(query2);
      expect(cached3).toBeNull();
      expect(cached4).toBeNull();
    });

    it('should invalidate all cache for a table', async () => {
      const query1: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
          ],
        },
      };

      const query2: QueryRequest = {
        table: 'protocol_tvl',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
          ],
        },
      };

      const response: QueryResponse = {
        data: [{ id: 'protocol-1', name: 'Protocol 1' }],
        count: 1,
        executionTime: 100,
        cacheHit: false,
      };

      // Set both caches
      await cacheManager.set(query1, response);
      await cacheManager.set(query2, response);

      // Invalidate only protocols table
      const invalidated = await cacheManager.invalidateTable('protocols');
      expect(invalidated).toBeGreaterThanOrEqual(1);

      // Verify protocols cache is gone
      const cached1 = await cacheManager.get(query1);
      expect(cached1).toBeNull();

      // Verify protocol_tvl cache still exists
      const cached2 = await cacheManager.get(query2);
      expect(cached2).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Create cache manager with invalid Redis connection
      const badCacheManager = new CacheManager(300);
      
      // Mock Redis to throw error
      const originalGet = redis.get;
      redis.get = jest.fn().mockRejectedValue(new Error('Redis connection error'));

      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
          ],
        },
      };

      // Should return null instead of throwing
      const cached = await badCacheManager.get(query);
      expect(cached).toBeNull();

      // Restore original function
      redis.get = originalGet;
    });
  });
});

