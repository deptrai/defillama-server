/**
 * Portfolio Cache Service
 * Enhancement 2: Redis Caching Layer for Cross-chain Portfolio
 * 
 * Provides Redis caching for portfolio data, asset data, and price data
 * Implements cache invalidation strategy to ensure data freshness
 */

import Redis from 'ioredis';
import type {
  CrossChainPortfolio,
  CrossChainAsset,
} from '../engines/cross-chain-aggregation-engine';

// Cache TTL configuration (in seconds)
const CACHE_TTL = {
  PORTFOLIO: 5 * 60, // 5 minutes
  ASSETS: 5 * 60, // 5 minutes
  PRICES: 5 * 60, // 5 minutes
  PERFORMANCE: 5 * 60, // 5 minutes
  TRANSACTIONS: 10 * 60, // 10 minutes (less frequently updated)
};

// Cache key prefixes
const CACHE_PREFIX = {
  PORTFOLIO: 'portfolio:cross-chain',
  ASSETS: 'assets:cross-chain',
  PRICES: 'prices:cross-chain',
  PERFORMANCE: 'performance:cross-chain',
  TRANSACTIONS: 'transactions:cross-chain',
};

/**
 * PortfolioCache - Redis caching service for cross-chain portfolio data
 */
export class PortfolioCache {
  private static instance: PortfolioCache;
  private redis: Redis | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): PortfolioCache {
    if (!PortfolioCache.instance) {
      PortfolioCache.instance = new PortfolioCache();
    }
    return PortfolioCache.instance;
  }

  /**
   * Initialize Redis connection
   */
  private async getRedis(): Promise<Redis> {
    if (this.redis) {
      return this.redis;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 2000);
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      console.error('Portfolio Cache Redis error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Portfolio Cache Redis connected');
    });

    return this.redis;
  }

  /**
   * Get portfolio from cache
   */
  public async getPortfolio(userId: string): Promise<CrossChainPortfolio | null> {
    try {
      const redis = await this.getRedis();
      const key = `${CACHE_PREFIX.PORTFOLIO}:${userId}`;
      const data = await redis.get(key);

      if (!data) return null;

      return JSON.parse(data) as CrossChainPortfolio;
    } catch (error) {
      console.error('Error getting portfolio from cache:', error);
      return null;
    }
  }

  /**
   * Set portfolio in cache
   */
  public async setPortfolio(
    userId: string,
    portfolio: CrossChainPortfolio
  ): Promise<void> {
    try {
      const redis = await this.getRedis();
      const key = `${CACHE_PREFIX.PORTFOLIO}:${userId}`;
      await redis.setex(key, CACHE_TTL.PORTFOLIO, JSON.stringify(portfolio));
    } catch (error) {
      console.error('Error setting portfolio in cache:', error);
    }
  }

  /**
   * Get assets from cache
   */
  public async getAssets(
    userId: string,
    filterKey?: string
  ): Promise<CrossChainAsset[] | null> {
    try {
      const redis = await this.getRedis();
      const key = filterKey
        ? `${CACHE_PREFIX.ASSETS}:${userId}:${filterKey}`
        : `${CACHE_PREFIX.ASSETS}:${userId}`;
      const data = await redis.get(key);

      if (!data) return null;

      return JSON.parse(data) as CrossChainAsset[];
    } catch (error) {
      console.error('Error getting assets from cache:', error);
      return null;
    }
  }

  /**
   * Set assets in cache
   */
  public async setAssets(
    userId: string,
    assets: CrossChainAsset[],
    filterKey?: string
  ): Promise<void> {
    try {
      const redis = await this.getRedis();
      const key = filterKey
        ? `${CACHE_PREFIX.ASSETS}:${userId}:${filterKey}`
        : `${CACHE_PREFIX.ASSETS}:${userId}`;
      await redis.setex(key, CACHE_TTL.ASSETS, JSON.stringify(assets));
    } catch (error) {
      console.error('Error setting assets in cache:', error);
    }
  }

  /**
   * Get performance metrics from cache
   */
  public async getPerformance(userId: string): Promise<any | null> {
    try {
      const redis = await this.getRedis();
      const key = `${CACHE_PREFIX.PERFORMANCE}:${userId}`;
      const data = await redis.get(key);

      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting performance from cache:', error);
      return null;
    }
  }

  /**
   * Set performance metrics in cache
   */
  public async setPerformance(userId: string, performance: any): Promise<void> {
    try {
      const redis = await this.getRedis();
      const key = `${CACHE_PREFIX.PERFORMANCE}:${userId}`;
      await redis.setex(key, CACHE_TTL.PERFORMANCE, JSON.stringify(performance));
    } catch (error) {
      console.error('Error setting performance in cache:', error);
    }
  }

  /**
   * Get transactions from cache
   */
  public async getTransactions(
    userId: string,
    filterKey?: string
  ): Promise<any | null> {
    try {
      const redis = await this.getRedis();
      const key = filterKey
        ? `${CACHE_PREFIX.TRANSACTIONS}:${userId}:${filterKey}`
        : `${CACHE_PREFIX.TRANSACTIONS}:${userId}`;
      const data = await redis.get(key);

      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting transactions from cache:', error);
      return null;
    }
  }

  /**
   * Set transactions in cache
   */
  public async setTransactions(
    userId: string,
    transactions: any,
    filterKey?: string
  ): Promise<void> {
    try {
      const redis = await this.getRedis();
      const key = filterKey
        ? `${CACHE_PREFIX.TRANSACTIONS}:${userId}:${filterKey}`
        : `${CACHE_PREFIX.TRANSACTIONS}:${userId}`;
      await redis.setex(key, CACHE_TTL.TRANSACTIONS, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error setting transactions in cache:', error);
    }
  }

  /**
   * Invalidate all cache for a user
   */
  public async invalidateUser(userId: string): Promise<number> {
    try {
      const redis = await this.getRedis();
      const patterns = [
        `${CACHE_PREFIX.PORTFOLIO}:${userId}*`,
        `${CACHE_PREFIX.ASSETS}:${userId}*`,
        `${CACHE_PREFIX.PERFORMANCE}:${userId}*`,
        `${CACHE_PREFIX.TRANSACTIONS}:${userId}*`,
      ];

      let deletedCount = 0;
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          deletedCount += await redis.del(...keys);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error invalidating user cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate portfolio cache for a user
   */
  public async invalidatePortfolio(userId: string): Promise<void> {
    try {
      const redis = await this.getRedis();
      const key = `${CACHE_PREFIX.PORTFOLIO}:${userId}`;
      await redis.del(key);
    } catch (error) {
      console.error('Error invalidating portfolio cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    totalKeys: number;
    portfolioKeys: number;
    assetsKeys: number;
    performanceKeys: number;
    transactionsKeys: number;
  }> {
    try {
      const redis = await this.getRedis();
      const [portfolioKeys, assetsKeys, performanceKeys, transactionsKeys] =
        await Promise.all([
          redis.keys(`${CACHE_PREFIX.PORTFOLIO}:*`),
          redis.keys(`${CACHE_PREFIX.ASSETS}:*`),
          redis.keys(`${CACHE_PREFIX.PERFORMANCE}:*`),
          redis.keys(`${CACHE_PREFIX.TRANSACTIONS}:*`),
        ]);

      return {
        totalKeys:
          portfolioKeys.length +
          assetsKeys.length +
          performanceKeys.length +
          transactionsKeys.length,
        portfolioKeys: portfolioKeys.length,
        assetsKeys: assetsKeys.length,
        performanceKeys: performanceKeys.length,
        transactionsKeys: transactionsKeys.length,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        portfolioKeys: 0,
        assetsKeys: 0,
        performanceKeys: 0,
        transactionsKeys: 0,
      };
    }
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

