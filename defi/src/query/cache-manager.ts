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
  private initialized: boolean = false;

  constructor(ttl: number = DEFAULT_CACHE_TTL) {
    this.ttl = ttl;
  }

  /**
   * Initialize Redis connection
   */
  private async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.redis = await getRedisClient();
    this.initialized = true;
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
      await this.scanAndDelete(pattern);
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
      await this.scanAndDelete(pattern);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Scan and delete keys matching pattern (uses SCAN instead of KEYS)
   */
  private async scanAndDelete(pattern: string): Promise<void> {
    let cursor = '0';

    do {
      const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
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
      let cursor = '0';
      let totalKeys = 0;
      let totalSize = 0;
      let expiredCount = 0;

      do {
        const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];

        totalKeys += keys.length;

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
      } while (cursor !== '0');

      return {
        totalKeys,
        totalSize,
        expiredCount,
        avgSize: totalKeys > 0 ? Math.round(totalSize / totalKeys) : 0,
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

