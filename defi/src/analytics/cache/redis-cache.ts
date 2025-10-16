/**
 * Redis Cache Manager
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * This module provides Redis caching for bot enrichment data to reduce
 * database query load and improve API response times.
 */

import Redis from 'ioredis';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false'; // Enabled by default

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  BOT_ENRICHMENT: 300, // 5 minutes
  BOT_PERFORMANCE: 300, // 5 minutes
  BOT_STRATEGY: 300, // 5 minutes
  BOT_SOPHISTICATION: 300, // 5 minutes
  PROTOCOL_LEAKAGE: 600, // 10 minutes
  MARKET_TRENDS: 600, // 10 minutes
};

// Cache key prefixes
export const CACHE_PREFIX = {
  BOT_ENRICHMENT: 'mev:bot:enrichment',
  BOT_PERFORMANCE: 'mev:bot:performance',
  BOT_STRATEGY: 'mev:bot:strategy',
  BOT_SOPHISTICATION: 'mev:bot:sophistication',
  PROTOCOL_LEAKAGE: 'mev:protocol:leakage',
  MARKET_TRENDS: 'mev:market:trends',
};

/**
 * Redis Cache Manager Class
 */
class RedisCacheManager {
  private client: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    if (REDIS_ENABLED) {
      this.connect();
    }
  }

  /**
   * Connect to Redis
   */
  private connect() {
    try {
      this.client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('Redis connection failed after 3 retries, disabling cache');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 2000); // Exponential backoff
        },
        lazyConnect: true, // Don't connect immediately
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.warn('⚠️  Redis connection closed');
        this.isConnected = false;
      });

      // Attempt to connect
      this.client.connect().catch((err) => {
        console.warn('⚠️  Redis connection failed:', err.message);
        console.warn('⚠️  Continuing without cache');
      });
    } catch (error: any) {
      console.error('❌ Failed to initialize Redis:', error.message);
      this.client = null;
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error: any) {
      console.error('Redis get error:', error.message);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl: number): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      return true;
    } catch (error: any) {
      console.error('Redis set error:', error.message);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error: any) {
      console.error('Redis del error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.client.del(...keys);
      return keys.length;
    } catch (error: any) {
      console.error('Redis delPattern error:', error.message);
      return 0;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
  }> {
    if (!this.isConnected || !this.client) {
      return {
        connected: false,
        keys: 0,
        memory: '0',
      };
    }

    try {
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memory = memoryMatch ? memoryMatch[1] : '0';

      const dbSize = await this.client.dbsize();

      return {
        connected: true,
        keys: dbSize,
        memory,
      };
    } catch (error: any) {
      console.error('Redis getStats error:', error.message);
      return {
        connected: false,
        keys: 0,
        memory: '0',
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
}

// Singleton instance
const cacheManager = new RedisCacheManager();

/**
 * Helper function to generate cache key
 */
export function getCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`;
}

/**
 * Helper function to cache a function result
 */
export async function cacheFunction<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = await cacheManager.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute function
  const result = await fn();

  // Store in cache (fire and forget)
  cacheManager.set(key, result, ttl).catch((err) => {
    console.error('Failed to cache result:', err);
  });

  return result;
}

// Export singleton instance
export default cacheManager;

