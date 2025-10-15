/**
 * Monitoring Service
 * Story: 3.1.1 - Smart Money Identification (Enhancement 4)
 * 
 * Real-time monitoring for smart money analytics
 * - Cache hit rate tracking
 * - Job execution statistics
 * - API performance metrics
 * - Data volatility tracking
 */

import Redis from 'ioredis';

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  lastUpdated: Date;
}

interface JobMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgDuration: number;
  lastRunTimestamp: Date;
  lastRunStats: {
    walletsProcessed: number;
    walletsUpdated: number;
    walletsFailed: number;
    duration: number;
  } | null;
}

interface APIMetrics {
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
  lastUpdated: Date;
}

interface DataVolatilityMetrics {
  walletAddress: string;
  changeFrequency: number; // Changes per hour
  lastChanged: Date;
  recommendedTTL: number; // Seconds
}

interface MonitoringDashboard {
  cache: CacheMetrics;
  job: JobMetrics;
  api: APIMetrics;
  volatility: {
    avgChangeFrequency: number;
    topVolatileWallets: DataVolatilityMetrics[];
  };
  timestamp: Date;
}

/**
 * MonitoringService - Collect and track metrics for smart money analytics
 */
export class MonitoringService {
  private static instance: MonitoringService;
  private redis: Redis;

  // Redis key prefixes
  private readonly CACHE_METRICS_KEY = 'smart_money:monitoring:cache';
  private readonly JOB_METRICS_KEY = 'smart_money:monitoring:job';
  private readonly API_METRICS_KEY = 'smart_money:monitoring:api';
  private readonly VOLATILITY_PREFIX = 'smart_money:monitoring:volatility';

  // Metrics retention (7 days)
  private readonly METRICS_TTL = 7 * 24 * 60 * 60;

  private constructor() {
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
      console.error('Monitoring Redis connection error:', error);
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Record cache hit
   */
  public async recordCacheHit(): Promise<void> {
    try {
      await this.redis.hincrby(this.CACHE_METRICS_KEY, 'hits', 1);
      await this.redis.hincrby(this.CACHE_METRICS_KEY, 'totalRequests', 1);
      await this.redis.hset(this.CACHE_METRICS_KEY, 'lastUpdated', new Date().toISOString());
      await this.redis.expire(this.CACHE_METRICS_KEY, this.METRICS_TTL);
    } catch (error: any) {
      console.error('Error recording cache hit:', error.message);
    }
  }

  /**
   * Record cache miss
   */
  public async recordCacheMiss(): Promise<void> {
    try {
      await this.redis.hincrby(this.CACHE_METRICS_KEY, 'misses', 1);
      await this.redis.hincrby(this.CACHE_METRICS_KEY, 'totalRequests', 1);
      await this.redis.hset(this.CACHE_METRICS_KEY, 'lastUpdated', new Date().toISOString());
      await this.redis.expire(this.CACHE_METRICS_KEY, this.METRICS_TTL);
    } catch (error: any) {
      console.error('Error recording cache miss:', error.message);
    }
  }

  /**
   * Get cache metrics
   */
  public async getCacheMetrics(): Promise<CacheMetrics> {
    try {
      const metrics = await this.redis.hgetall(this.CACHE_METRICS_KEY);
      
      const hits = parseInt(metrics.hits || '0', 10);
      const misses = parseInt(metrics.misses || '0', 10);
      const totalRequests = hits + misses;
      const hitRate = totalRequests > 0 ? (hits / totalRequests) * 100 : 0;

      return {
        hits,
        misses,
        hitRate,
        totalRequests,
        lastUpdated: metrics.lastUpdated ? new Date(metrics.lastUpdated) : new Date(),
      };
    } catch (error: any) {
      console.error('Error getting cache metrics:', error.message);
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Record job execution
   */
  public async recordJobExecution(stats: {
    success: boolean;
    duration: number;
    walletsProcessed: number;
    walletsUpdated: number;
    walletsFailed: number;
  }): Promise<void> {
    try {
      await this.redis.hincrby(this.JOB_METRICS_KEY, 'totalRuns', 1);
      
      if (stats.success) {
        await this.redis.hincrby(this.JOB_METRICS_KEY, 'successfulRuns', 1);
      } else {
        await this.redis.hincrby(this.JOB_METRICS_KEY, 'failedRuns', 1);
      }

      // Update average duration
      const totalRuns = parseInt(await this.redis.hget(this.JOB_METRICS_KEY, 'totalRuns') || '1', 10);
      const currentAvg = parseFloat(await this.redis.hget(this.JOB_METRICS_KEY, 'avgDuration') || '0');
      const newAvg = ((currentAvg * (totalRuns - 1)) + stats.duration) / totalRuns;
      await this.redis.hset(this.JOB_METRICS_KEY, 'avgDuration', newAvg.toString());

      // Store last run stats
      await this.redis.hset(this.JOB_METRICS_KEY, 'lastRunTimestamp', new Date().toISOString());
      await this.redis.hset(this.JOB_METRICS_KEY, 'lastRunStats', JSON.stringify({
        walletsProcessed: stats.walletsProcessed,
        walletsUpdated: stats.walletsUpdated,
        walletsFailed: stats.walletsFailed,
        duration: stats.duration,
      }));

      await this.redis.expire(this.JOB_METRICS_KEY, this.METRICS_TTL);
    } catch (error: any) {
      console.error('Error recording job execution:', error.message);
    }
  }

  /**
   * Get job metrics
   */
  public async getJobMetrics(): Promise<JobMetrics> {
    try {
      const metrics = await this.redis.hgetall(this.JOB_METRICS_KEY);

      return {
        totalRuns: parseInt(metrics.totalRuns || '0', 10),
        successfulRuns: parseInt(metrics.successfulRuns || '0', 10),
        failedRuns: parseInt(metrics.failedRuns || '0', 10),
        avgDuration: parseFloat(metrics.avgDuration || '0'),
        lastRunTimestamp: metrics.lastRunTimestamp ? new Date(metrics.lastRunTimestamp) : new Date(),
        lastRunStats: metrics.lastRunStats ? JSON.parse(metrics.lastRunStats) : null,
      };
    } catch (error: any) {
      console.error('Error getting job metrics:', error.message);
      return {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        avgDuration: 0,
        lastRunTimestamp: new Date(),
        lastRunStats: null,
      };
    }
  }

  /**
   * Record API request
   */
  public async recordAPIRequest(responseTime: number, isError: boolean = false): Promise<void> {
    try {
      await this.redis.hincrby(this.API_METRICS_KEY, 'totalRequests', 1);
      
      if (isError) {
        await this.redis.hincrby(this.API_METRICS_KEY, 'errors', 1);
      }

      // Update average response time
      const totalRequests = parseInt(await this.redis.hget(this.API_METRICS_KEY, 'totalRequests') || '1', 10);
      const currentAvg = parseFloat(await this.redis.hget(this.API_METRICS_KEY, 'avgResponseTime') || '0');
      const newAvg = ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;
      await this.redis.hset(this.API_METRICS_KEY, 'avgResponseTime', newAvg.toString());

      await this.redis.hset(this.API_METRICS_KEY, 'lastUpdated', new Date().toISOString());
      await this.redis.expire(this.API_METRICS_KEY, this.METRICS_TTL);
    } catch (error: any) {
      console.error('Error recording API request:', error.message);
    }
  }

  /**
   * Get API metrics
   */
  public async getAPIMetrics(): Promise<APIMetrics> {
    try {
      const metrics = await this.redis.hgetall(this.API_METRICS_KEY);

      const totalRequests = parseInt(metrics.totalRequests || '0', 10);
      const errors = parseInt(metrics.errors || '0', 10);
      const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;

      return {
        totalRequests,
        avgResponseTime: parseFloat(metrics.avgResponseTime || '0'),
        errorRate,
        requestsPerMinute: 0, // TODO: Calculate from time-series data
        lastUpdated: metrics.lastUpdated ? new Date(metrics.lastUpdated) : new Date(),
      };
    } catch (error: any) {
      console.error('Error getting API metrics:', error.message);
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        requestsPerMinute: 0,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Record data change (for volatility tracking)
   */
  public async recordDataChange(walletAddress: string): Promise<void> {
    try {
      const key = `${this.VOLATILITY_PREFIX}:${walletAddress}`;
      await this.redis.hincrby(key, 'changes', 1);
      await this.redis.hset(key, 'lastChanged', new Date().toISOString());
      await this.redis.expire(key, this.METRICS_TTL);
    } catch (error: any) {
      console.error('Error recording data change:', error.message);
    }
  }

  /**
   * Get monitoring dashboard
   */
  public async getDashboard(): Promise<MonitoringDashboard> {
    const [cache, job, api] = await Promise.all([
      this.getCacheMetrics(),
      this.getJobMetrics(),
      this.getAPIMetrics(),
    ]);

    return {
      cache,
      job,
      api,
      volatility: {
        avgChangeFrequency: 0, // TODO: Calculate from volatility data
        topVolatileWallets: [],
      },
      timestamp: new Date(),
    };
  }

  /**
   * Reset all metrics
   */
  public async resetMetrics(): Promise<void> {
    try {
      await this.redis.del(this.CACHE_METRICS_KEY);
      await this.redis.del(this.JOB_METRICS_KEY);
      await this.redis.del(this.API_METRICS_KEY);
      
      const volatilityKeys = await this.redis.keys(`${this.VOLATILITY_PREFIX}:*`);
      if (volatilityKeys.length > 0) {
        await this.redis.del(...volatilityKeys);
      }
    } catch (error: any) {
      console.error('Error resetting metrics:', error.message);
    }
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    await this.redis.quit();
  }
}

