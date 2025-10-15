/**
 * Smart Money Cache Service
 * Story: 3.1.1 - Smart Money Identification (Enhancement 1)
 * Enhancement 2: Adaptive TTL based on data volatility
 * Enhancement 4: Integrated with MonitoringService
 *
 * Redis caching layer for smart money wallets API
 * - Cache wallet lists with filters
 * - Cache individual wallet data
 * - Cache invalidation strategy
 * - Adaptive TTL based on data volatility
 * - Target: API response <50ms (cached), reduce DB queries by 90%
 */

import Redis from 'ioredis';
import { MonitoringService } from './monitoring-service';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

interface SmartMoneyWallet {
  walletAddress: string;
  chainId: string;
  walletName: string;
  walletType: string;
  discoveryMethod: string;
  verified: boolean;
  smartMoneyScore: number;
  confidenceLevel: string;
  totalPnl: number;
  roiAllTime: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  avgTradeSize: number;
  avgHoldingPeriodDays: number;
  lastTradeTimestamp: Date;
  tradingStyle: string;
  riskProfile: string;
  preferredTokens: string[];
  preferredProtocols: string[];
  firstSeen: Date;
  lastUpdated: Date;
}

interface WalletListResponse {
  data: SmartMoneyWallet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * SmartMoneyCache - Redis caching service for smart money data
 */
export class SmartMoneyCache {
  private static instance: SmartMoneyCache;
  private redis: Redis;
  private monitoring: MonitoringService;

  // Base Cache TTL (Time To Live) in seconds
  private readonly WALLET_LIST_BASE_TTL = 5 * 60; // 5 minutes
  private readonly WALLET_DETAIL_BASE_TTL = 10 * 60; // 10 minutes
  private readonly STATS_BASE_TTL = 5 * 60; // 5 minutes

  // Adaptive TTL configuration
  private readonly ENABLE_ADAPTIVE_TTL = true;
  private readonly MIN_TTL = 2 * 60; // 2 minutes (volatile data)
  private readonly MAX_TTL = 15 * 60; // 15 minutes (stable data)
  private readonly VOLATILITY_TRACKING_KEY = 'smart_money:volatility:tracking';

  // Cache key prefixes
  private readonly WALLET_LIST_PREFIX = 'smart_money:wallets:list';
  private readonly WALLET_DETAIL_PREFIX = 'smart_money:wallets:detail';
  private readonly STATS_PREFIX = 'smart_money:stats';

  private constructor() {
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    // Initialize monitoring service
    this.monitoring = MonitoringService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SmartMoneyCache {
    if (!SmartMoneyCache.instance) {
      SmartMoneyCache.instance = new SmartMoneyCache();
    }
    return SmartMoneyCache.instance;
  }

  /**
   * Generate cache key for wallet list
   */
  private getWalletListKey(params: {
    chains?: string[];
    minScore?: number;
    verified?: boolean;
    walletType?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): string {
    const keyParts = [
      this.WALLET_LIST_PREFIX,
      params.chains?.sort().join(',') || 'all',
      params.minScore?.toString() || 'any',
      params.verified?.toString() || 'any',
      params.walletType || 'any',
      params.sortBy || 'score',
      params.sortOrder || 'desc',
      params.page?.toString() || '1',
      params.limit?.toString() || '20',
    ];
    return keyParts.join(':');
  }

  /**
   * Generate cache key for wallet detail
   */
  private getWalletDetailKey(walletAddress: string): string {
    return `${this.WALLET_DETAIL_PREFIX}:${walletAddress}`;
  }

  /**
   * Generate cache key for stats
   */
  private getStatsKey(): string {
    return this.STATS_PREFIX;
  }

  /**
   * Get cached wallet list
   */
  public async getWalletList(params: {
    chains?: string[];
    minScore?: number;
    verified?: boolean;
    walletType?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): Promise<WalletListResponse | null> {
    try {
      const key = this.getWalletListKey(params);
      const cached = await this.redis.get(key);

      if (cached) {
        // Record cache hit
        await this.monitoring.recordCacheHit();
        return JSON.parse(cached);
      }

      // Record cache miss
      await this.monitoring.recordCacheMiss();
      return null;
    } catch (error: any) {
      console.error('Error getting cached wallet list:', error.message);
      return null;
    }
  }

  /**
   * Set cached wallet list
   * Enhancement 2: Uses adaptive TTL
   */
  public async setWalletList(
    params: {
      chains?: string[];
      minScore?: number;
      verified?: boolean;
      walletType?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      limit?: number;
    },
    data: WalletListResponse,
    options?: CacheOptions
  ): Promise<void> {
    try {
      const key = this.getWalletListKey(params);
      const baseTTL = options?.ttl || this.WALLET_LIST_BASE_TTL;

      // Calculate adaptive TTL
      const ttl = await this.calculateAdaptiveTTL(key, baseTTL);

      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error: any) {
      console.error('Error setting cached wallet list:', error.message);
    }
  }

  /**
   * Get cached wallet detail
   */
  public async getWalletDetail(walletAddress: string): Promise<SmartMoneyWallet | null> {
    try {
      const key = this.getWalletDetailKey(walletAddress);
      const cached = await this.redis.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error: any) {
      console.error('Error getting cached wallet detail:', error.message);
      return null;
    }
  }

  /**
   * Set cached wallet detail
   */
  public async setWalletDetail(
    walletAddress: string,
    data: SmartMoneyWallet,
    options?: CacheOptions
  ): Promise<void> {
    try {
      const key = this.getWalletDetailKey(walletAddress);
      const ttl = options?.ttl || this.WALLET_DETAIL_TTL;
      
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error: any) {
      console.error('Error setting cached wallet detail:', error.message);
    }
  }

  /**
   * Invalidate all wallet list caches
   * Enhancement 2: Track invalidation for volatility
   */
  public async invalidateWalletLists(): Promise<void> {
    try {
      const pattern = `${this.WALLET_LIST_PREFIX}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        // Track invalidation for each key
        for (const key of keys) {
          await this.trackCacheInvalidation(key);
        }

        await this.redis.del(...keys);
        console.log(`Invalidated ${keys.length} wallet list cache entries`);
      }
    } catch (error: any) {
      console.error('Error invalidating wallet list caches:', error.message);
    }
  }

  /**
   * Invalidate specific wallet detail cache
   */
  public async invalidateWalletDetail(walletAddress: string): Promise<void> {
    try {
      const key = this.getWalletDetailKey(walletAddress);
      await this.redis.del(key);
    } catch (error: any) {
      console.error('Error invalidating wallet detail cache:', error.message);
    }
  }

  /**
   * Invalidate all caches
   */
  public async invalidateAll(): Promise<void> {
    try {
      const patterns = [
        `${this.WALLET_LIST_PREFIX}:*`,
        `${this.WALLET_DETAIL_PREFIX}:*`,
        `${this.STATS_PREFIX}*`,
      ];
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
      
      console.log('Invalidated all smart money caches');
    } catch (error: any) {
      console.error('Error invalidating all caches:', error.message);
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    walletListKeys: number;
    walletDetailKeys: number;
    totalKeys: number;
  }> {
    try {
      const walletListKeys = await this.redis.keys(`${this.WALLET_LIST_PREFIX}:*`);
      const walletDetailKeys = await this.redis.keys(`${this.WALLET_DETAIL_PREFIX}:*`);
      
      return {
        walletListKeys: walletListKeys.length,
        walletDetailKeys: walletDetailKeys.length,
        totalKeys: walletListKeys.length + walletDetailKeys.length,
      };
    } catch (error: any) {
      console.error('Error getting cache stats:', error.message);
      return {
        walletListKeys: 0,
        walletDetailKeys: 0,
        totalKeys: 0,
      };
    }
  }

  /**
   * Calculate adaptive TTL based on data volatility
   * Enhancement 2: Adaptive TTL
   *
   * @param cacheKey - Cache key to calculate TTL for
   * @param baseTTL - Base TTL in seconds
   * @returns Adaptive TTL in seconds
   */
  private async calculateAdaptiveTTL(cacheKey: string, baseTTL: number): Promise<number> {
    if (!this.ENABLE_ADAPTIVE_TTL) {
      return baseTTL;
    }

    try {
      // Get volatility data for this cache key
      const volatilityKey = `${this.VOLATILITY_TRACKING_KEY}:${cacheKey}`;
      const volatilityData = await this.redis.hgetall(volatilityKey);

      if (!volatilityData || Object.keys(volatilityData).length === 0) {
        // No volatility data yet, use base TTL
        return baseTTL;
      }

      const changes = parseInt(volatilityData.changes || '0', 10);
      const lastChanged = volatilityData.lastChanged ? new Date(volatilityData.lastChanged) : new Date();
      const now = new Date();
      const hoursSinceLastChange = (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60);

      // Calculate change frequency (changes per hour)
      const changeFrequency = hoursSinceLastChange > 0 ? changes / hoursSinceLastChange : 0;

      // Adaptive TTL logic:
      // - High volatility (>10 changes/hour): MIN_TTL (2 minutes)
      // - Medium volatility (5-10 changes/hour): baseTTL (5 minutes)
      // - Low volatility (<5 changes/hour): MAX_TTL (15 minutes)
      let adaptiveTTL: number;

      if (changeFrequency > 10) {
        // High volatility - short TTL
        adaptiveTTL = this.MIN_TTL;
      } else if (changeFrequency > 5) {
        // Medium volatility - base TTL
        adaptiveTTL = baseTTL;
      } else {
        // Low volatility - long TTL
        adaptiveTTL = this.MAX_TTL;
      }

      return adaptiveTTL;
    } catch (error: any) {
      console.error('Error calculating adaptive TTL:', error.message);
      return baseTTL;
    }
  }

  /**
   * Track cache invalidation for volatility calculation
   * Enhancement 2: Adaptive TTL
   *
   * @param cacheKey - Cache key that was invalidated
   */
  private async trackCacheInvalidation(cacheKey: string): Promise<void> {
    if (!this.ENABLE_ADAPTIVE_TTL) {
      return;
    }

    try {
      const volatilityKey = `${this.VOLATILITY_TRACKING_KEY}:${cacheKey}`;
      await this.redis.hincrby(volatilityKey, 'changes', 1);
      await this.redis.hset(volatilityKey, 'lastChanged', new Date().toISOString());

      // Expire volatility tracking after 24 hours
      await this.redis.expire(volatilityKey, 24 * 60 * 60);
    } catch (error: any) {
      console.error('Error tracking cache invalidation:', error.message);
    }
  }

  /**
   * Get volatility metrics for a cache key
   * Enhancement 2: Adaptive TTL
   *
   * @param cacheKey - Cache key to get volatility for
   * @returns Volatility metrics
   */
  public async getVolatilityMetrics(cacheKey: string): Promise<{
    changes: number;
    lastChanged: Date | null;
    changeFrequency: number;
    recommendedTTL: number;
  }> {
    try {
      const volatilityKey = `${this.VOLATILITY_TRACKING_KEY}:${cacheKey}`;
      const volatilityData = await this.redis.hgetall(volatilityKey);

      if (!volatilityData || Object.keys(volatilityData).length === 0) {
        return {
          changes: 0,
          lastChanged: null,
          changeFrequency: 0,
          recommendedTTL: this.WALLET_LIST_BASE_TTL,
        };
      }

      const changes = parseInt(volatilityData.changes || '0', 10);
      const lastChanged = volatilityData.lastChanged ? new Date(volatilityData.lastChanged) : null;
      const now = new Date();
      const hoursSinceLastChange = lastChanged ? (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60) : 0;
      const changeFrequency = hoursSinceLastChange > 0 ? changes / hoursSinceLastChange : 0;
      const recommendedTTL = await this.calculateAdaptiveTTL(cacheKey, this.WALLET_LIST_BASE_TTL);

      return {
        changes,
        lastChanged,
        changeFrequency,
        recommendedTTL,
      };
    } catch (error: any) {
      console.error('Error getting volatility metrics:', error.message);
      return {
        changes: 0,
        lastChanged: null,
        changeFrequency: 0,
        recommendedTTL: this.WALLET_LIST_BASE_TTL,
      };
    }
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    await this.redis.quit();
  }
}

