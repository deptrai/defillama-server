/**
 * Redis Cache Manager
 * Handles Redis cache operations for event data
 */

import Redis from 'ioredis';
import {
  BaseEvent,
  PriceUpdateEvent,
  TvlChangeEvent,
  EventType,
  CachedPriceData,
  CachedTvlData,
  CACHE_KEYS,
  TTL_CONFIG,
} from '../events/event-types';

let redisClient: Redis | null = null;

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 2000);
        return delay;
      },
    });

    redisClient.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Get previous value from cache
 */
export async function getPreviousValue(
  pk: string
): Promise<number | null> {
  try {
    const redis = getRedisClient();
    const key = `cache:${pk}`;
    const value = await redis.get(key);
    return value ? parseFloat(value) : null;
  } catch (error) {
    console.error(`Error getting previous value for ${pk}:`, error);
    return null;
  }
}

/**
 * Get multiple previous values
 */
export async function getBatchPreviousValues(
  pks: string[]
): Promise<Map<string, number>> {
  const values = new Map<string, number>();
  
  try {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();
    
    for (const pk of pks) {
      const key = `cache:${pk}`;
      pipeline.get(key);
    }
    
    const results = await pipeline.exec();
    
    if (results) {
      results.forEach((result, index) => {
        const [error, value] = result;
        if (!error && value) {
          values.set(pks[index], parseFloat(value as string));
        }
      });
    }
  } catch (error) {
    console.error('Error getting batch previous values:', error);
  }
  
  return values;
}

/**
 * Update cache with new value
 */
export async function updateCacheValue(
  pk: string,
  value: number,
  ttl: number = TTL_CONFIG.CURRENT_DATA
): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `cache:${pk}`;
    await redis.setex(key, ttl, value.toString());
  } catch (error) {
    console.error(`Error updating cache for ${pk}:`, error);
  }
}

/**
 * Update cache from price event
 */
export async function updatePriceCache(
  event: PriceUpdateEvent
): Promise<void> {
  try {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();
    
    const priceKey = CACHE_KEYS.PRICE(event.data.tokenId);
    const priceData: CachedPriceData = {
      price: event.data.currentPrice,
      symbol: event.data.symbol,
      timestamp: event.timestamp,
      change24h: event.data.changePercent,
      volume24h: event.data.volume24h,
      marketCap: event.data.marketCap,
    };
    
    // Update current price (1 hour TTL)
    pipeline.setex(priceKey, TTL_CONFIG.CURRENT_DATA, JSON.stringify(priceData));
    
    // Add to history (24 hour TTL)
    const historyKey = CACHE_KEYS.PRICE_HISTORY(event.data.tokenId);
    pipeline.zadd(historyKey, event.timestamp, JSON.stringify(priceData));
    pipeline.expire(historyKey, TTL_CONFIG.HISTORY_DATA);
    
    // Update cache value for change detection
    await updateCacheValue(`asset#${event.data.tokenId}`, event.data.currentPrice);
    
    await pipeline.exec();
  } catch (error) {
    console.error('Error updating price cache:', error);
  }
}

/**
 * Update cache from TVL event
 */
export async function updateTvlCache(
  event: TvlChangeEvent
): Promise<void> {
  try {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();
    
    const tvlKey = CACHE_KEYS.TVL(event.data.protocolId);
    const tvlData: CachedTvlData = {
      tvl: event.data.currentTvl,
      timestamp: event.timestamp,
      change24h: event.data.changePercent,
      breakdown: event.data.breakdown,
    };
    
    // Update current TVL (1 hour TTL)
    pipeline.setex(tvlKey, TTL_CONFIG.CURRENT_DATA, JSON.stringify(tvlData));
    
    // Update chain-specific TVL if available
    if (event.data.chain) {
      const chainKey = CACHE_KEYS.TVL_CHAIN(event.data.protocolId, event.data.chain);
      pipeline.setex(chainKey, TTL_CONFIG.CURRENT_DATA, JSON.stringify(tvlData));
    }
    
    // Add to history (24 hour TTL)
    const historyKey = CACHE_KEYS.TVL_HISTORY(event.data.protocolId);
    pipeline.zadd(historyKey, event.timestamp, JSON.stringify(tvlData));
    pipeline.expire(historyKey, TTL_CONFIG.HISTORY_DATA);
    
    // Update cache value for change detection
    const pk = `hourlyTvl#${event.data.protocolId}`;
    await updateCacheValue(pk, event.data.currentTvl);
    
    await pipeline.exec();
  } catch (error) {
    console.error('Error updating TVL cache:', error);
  }
}

/**
 * Update cache from event
 */
export async function updateCacheFromEvent(
  event: BaseEvent
): Promise<void> {
  switch (event.eventType) {
    case EventType.PRICE_UPDATE:
      await updatePriceCache(event as PriceUpdateEvent);
      break;
    case EventType.TVL_CHANGE:
      await updateTvlCache(event as TvlChangeEvent);
      break;
    default:
      // Other event types don't need cache updates
      break;
  }
}

/**
 * Batch update cache from events
 */
export async function batchUpdateCache(
  events: BaseEvent[]
): Promise<void> {
  await Promise.all(events.map(event => updateCacheFromEvent(event)));
}

/**
 * Check if event is duplicate
 */
export async function isEventDuplicate(
  eventId: string
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const key = CACHE_KEYS.EVENT_DEDUP(eventId);
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('Error checking event duplicate:', error);
    return false;
  }
}

/**
 * Mark event as processed
 */
export async function markEventProcessed(
  eventId: string
): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = CACHE_KEYS.EVENT_DEDUP(eventId);
    await redis.setex(key, TTL_CONFIG.EVENT_DEDUP, '1');
  } catch (error) {
    console.error('Error marking event as processed:', error);
  }
}

/**
 * Get last processed timestamp
 */
export async function getLastProcessedTimestamp(): Promise<number> {
  try {
    const redis = getRedisClient();
    const key = CACHE_KEYS.LAST_PROCESSED;
    const value = await redis.get(key);
    return value ? parseInt(value) : 0;
  } catch (error) {
    console.error('Error getting last processed timestamp:', error);
    return 0;
  }
}

/**
 * Update last processed timestamp
 */
export async function updateLastProcessedTimestamp(
  timestamp: number
): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = CACHE_KEYS.LAST_PROCESSED;
    await redis.set(key, timestamp.toString());
  } catch (error) {
    console.error('Error updating last processed timestamp:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  priceKeys: number;
  tvlKeys: number;
  memoryUsage: string;
}> {
  try {
    const redis = getRedisClient();
    
    const [dbSize, info] = await Promise.all([
      redis.dbsize(),
      redis.info('memory'),
    ]);
    
    // Parse memory usage from info
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';
    
    // Count keys by pattern
    const [priceKeys, tvlKeys] = await Promise.all([
      redis.keys('price:*').then(keys => keys.length),
      redis.keys('tvl:*').then(keys => keys.length),
    ]);
    
    return {
      totalKeys: dbSize,
      priceKeys,
      tvlKeys,
      memoryUsage,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalKeys: 0,
      priceKeys: 0,
      tvlKeys: 0,
      memoryUsage: 'unknown',
    };
  }
}

/**
 * Clear cache (use with caution!)
 */
export async function clearCache(pattern?: string): Promise<number> {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern || '*');
    
    if (keys.length === 0) return 0;
    
    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return 0;
  }
}

