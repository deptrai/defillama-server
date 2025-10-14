import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

/**
 * Redis client configuration for WebSocket services
 * Supports both AWS ElastiCache and local Redis instances
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      // Connection pool settings
      family: 4,
      // Cluster support for production
      ...(process.env.REDIS_CLUSTER_ENDPOINT && {
        host: undefined,
        port: undefined,
        // Use cluster configuration
        enableOfflineQueue: false,
      })
    };

    // Create Redis client
    if (process.env.REDIS_CLUSTER_ENDPOINT) {
      // ElastiCache cluster mode
      redisClient = new Redis.Cluster([{
        host: process.env.REDIS_CLUSTER_ENDPOINT,
        port: parseInt(process.env.REDIS_PORT || '6379')
      }], {
        redisOptions: {
          password: process.env.REDIS_PASSWORD,
          connectTimeout: 10000,
          commandTimeout: 5000,
        },
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
      });
    } else {
      // Single Redis instance
      redisClient = new Redis(redisConfig);
    }

    // Event handlers
    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis client ready');
    });

    redisClient.on('error', (error) => {
      console.error('Redis client error:', error);
    });

    redisClient.on('close', () => {
      console.log('Redis client connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      if (redisClient) {
        console.log('Closing Redis connection...');
        await redisClient.quit();
        redisClient = null;
      }
    });

    process.on('SIGTERM', async () => {
      if (redisClient) {
        console.log('Closing Redis connection...');
        await redisClient.quit();
        redisClient = null;
      }
    });
  }

  return redisClient;
}

/**
 * Close Redis connection (for testing)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (pubSubClient) {
    await pubSubClient.quit();
    pubSubClient = null;
  }
}

/**
 * Redis pub/sub client for message broadcasting
 * Separate client to avoid blocking main Redis operations
 */
let pubSubClient: Redis | null = null;

export function getPubSubClient(): Redis {
  if (!pubSubClient) {
    // Use same configuration as main client
    const mainClient = getRedisClient();
    pubSubClient = mainClient.duplicate();

    pubSubClient.on('connect', () => {
      console.log('Redis pub/sub client connected');
    });

    pubSubClient.on('error', (error) => {
      console.error('Redis pub/sub client error:', error);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      if (pubSubClient) {
        console.log('Closing Redis pub/sub connection...');
        await pubSubClient.quit();
        pubSubClient = null;
      }
    });

    process.on('SIGTERM', async () => {
      if (pubSubClient) {
        console.log('Closing Redis pub/sub connection...');
        await pubSubClient.quit();
        pubSubClient = null;
      }
    });
  }

  return pubSubClient;
}

/**
 * Redis key utilities for consistent key naming
 */
export const RedisKeys = {
  // WebSocket connections
  connection: (connectionId: string) => `ws:connection:${connectionId}`,
  connections: () => 'ws:connections',
  
  // Rooms and subscriptions
  room: (channel: string) => `ws:room:${channel}`,
  rooms: () => 'ws:rooms',
  subscription: (connectionId: string, channel: string) => `ws:sub:${connectionId}:${channel}`,
  
  // Message queuing
  messageQueue: (connectionId: string) => `ws:queue:${connectionId}`,
  failedMessage: (connectionId: string, timestamp: number) => `ws:failed:${connectionId}:${timestamp}`,
  
  // Statistics and monitoring
  stats: () => 'ws:stats',
  metrics: (metric: string) => `ws:metrics:${metric}`,
  
  // Rate limiting
  rateLimit: (connectionId: string) => `ws:rate:${connectionId}`,
  
  // Session management
  session: (sessionId: string) => `ws:session:${sessionId}`,
  
  // Heartbeat tracking
  heartbeat: (connectionId: string) => `ws:heartbeat:${connectionId}`,
};

/**
 * Redis utilities for common operations
 */
export class RedisUtils {
  private redis: Redis;

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Set key with expiration
   */
  async setWithExpiry(key: string, value: string, expirySeconds: number): Promise<void> {
    await this.redis.setex(key, expirySeconds, value);
  }

  /**
   * Increment counter with expiration
   */
  async incrementWithExpiry(key: string, expirySeconds: number): Promise<number> {
    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, expirySeconds);
    const results = await multi.exec();
    return results?.[0]?.[1] as number || 0;
  }

  /**
   * Add to sorted set with score
   */
  async addToSortedSet(key: string, score: number, member: string): Promise<void> {
    await this.redis.zadd(key, score, member);
  }

  /**
   * Get sorted set members by score range
   */
  async getSortedSetByScore(key: string, min: number, max: number): Promise<string[]> {
    return await this.redis.zrangebyscore(key, min, max);
  }

  /**
   * Remove expired members from sorted set
   */
  async removeExpiredFromSortedSet(key: string, maxScore: number): Promise<number> {
    return await this.redis.zremrangebyscore(key, '-inf', maxScore);
  }

  /**
   * Batch operations using pipeline
   */
  async batchOperations(operations: Array<{ command: string; args: any[] }>): Promise<any[]> {
    const pipeline = this.redis.pipeline();
    
    operations.forEach(({ command, args }) => {
      (pipeline as any)[command](...args);
    });
    
    const results = await pipeline.exec();
    return results?.map(result => result[1]) || [];
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

/**
 * Redis connection health monitoring
 */
export async function monitorRedisHealth(): Promise<void> {
  const utils = new RedisUtils();
  
  setInterval(async () => {
    const health = await utils.healthCheck();
    
    if (health.status === 'unhealthy') {
      console.error('Redis health check failed:', health.error);
    } else {
      console.log(`Redis health check passed (${health.latency}ms)`);
    }
  }, 30000); // Check every 30 seconds
}

// Export singleton instances
export const redisUtils = new RedisUtils();
