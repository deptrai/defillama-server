/**
 * Cache Manager
 * Manages Redis caching for query results
 */

import crypto from 'crypto';
import { QueryRequest, QueryResponse, CachedResult, DEFAULT_CACHE_TTL } from './types';
import { getRedisClient } from '../utils/shared/redis';

// ============================================================================
// Cache Manager Class
// ============================================================================

export class CacheManager {
  private redis: any;
  private ttl: number;

  constructor(ttl: number = DEFAULT_CACHE_TTL) {
    this.ttl = ttl;
  }

  /**
   * Initialize Redis connection
   */
  async init(): Promise<void> {
    this.redis = await getRedisClient();
  }

  /**
   * Generate cache key from query
   */
  generateCacheKey(query: QueryRequest): string {
    // Normalize query (sort keys)
    const normalized = JSON.stringify(query, Object.keys(query).sort());

    // Generate SHA-256 hash
    const hash = crypto.createHash('sha256').update(normalized).digest('hex');

    // Prefix with table name for easier debugging
    return `query:${query.table}:${hash}`;
  }

  /**
   * Get cached result
   */
  async get(query: QueryRequest): Promise<QueryResponse | null> {
    if (!this.redis) {
      await this.init();
    }

    const cacheKey = this.generateCacheKey(query);

    try {
      const cached = await this.redis.get(cacheKey);

      if (!cached) {
        return null;
      }

      const cachedResult: CachedResult = JSON.parse(cached);

      // Check if cache is expired
      if (Date.now() > cachedResult.expiresAt) {
        await this.delete(cacheKey);
        return null;
      }

      // Return cached response
      return {
        data: cachedResult.data,
        count: cachedResult.count,
        executionTime: cachedResult.executionTime,
        cacheHit: true,
      };
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached result
   */
  async set(query: QueryRequest, response: QueryResponse): Promise<void> {
    if (!this.redis) {
      await this.init();
    }

    const cacheKey = this.generateCacheKey(query);

    const cachedResult: CachedResult = {
      data: response.data,
      count: response.count,
      executionTime: response.executionTime,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.ttl * 1000,
    };

    try {
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(cachedResult));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached result
   */
  async delete(cacheKey: string): Promise<void> {
    if (!this.redis) {
      await this.init();
    }

    try {
      await this.redis.del(cacheKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Invalidate cache by table
   */
  async invalidateByTable(table: string): Promise<void> {
    if (!this.redis) {
      await this.init();
    }

    try {
      const pattern = `query:${table}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (!this.redis) {
      await this.init();
    }

    try {
      const pattern = 'query:*';
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.redis) {
      await this.init();
    }

    try {
      const pattern = 'query:*';
      const keys = await this.redis.keys(pattern);

      let totalSize = 0;
      let expiredCount = 0;

      for (const key of keys) {
        const cached = await this.redis.get(key);
        if (cached) {
          totalSize += cached.length;

          const cachedResult: CachedResult = JSON.parse(cached);
          if (Date.now() > cachedResult.expiresAt) {
            expiredCount++;
          }
        }
      }

      return {
        totalKeys: keys.length,
        totalSize,
        expiredCount,
        avgSize: keys.length > 0 ? Math.round(totalSize / keys.length) : 0,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        totalKeys: 0,
        totalSize: 0,
        expiredCount: 0,
        avgSize: 0,
      };
    }
  }

  /**
   * Warm up cache with common queries
   */
  async warmUp(queries: QueryRequest[], executor: (query: QueryRequest) => Promise<QueryResponse>): Promise<void> {
    for (const query of queries) {
      try {
        const response = await executor(query);
        await this.set(query, response);
      } catch (error) {
        console.error('Cache warm-up error:', error);
      }
    }
  }
}

// ============================================================================
// Cache Stats Interface
// ============================================================================

export interface CacheStats {
  totalKeys: number;
  totalSize: number;
  expiredCount: number;
  avgSize: number;
}

// ============================================================================
// Exports
// ============================================================================

export const cacheManager = new CacheManager();

