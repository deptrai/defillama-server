/**
 * Redis Client Utility
 * Provides Redis connection for caching and pub/sub
 */

import Redis from 'ioredis';

let redisClient: Redis | null = null;

/**
 * Get Redis client instance (singleton)
 */
export async function getRedisClient(): Promise<Redis> {
  if (redisClient) {
    return redisClient;
  }

  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD;

  redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redisClient.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  redisClient.on('connect', () => {
    console.log('Redis connected successfully');
  });

  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

