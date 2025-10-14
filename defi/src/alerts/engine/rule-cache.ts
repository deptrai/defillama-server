/**
 * Rule Cache Manager
 * Redis cache for alert rules
 * Story 1.3: Alert Engine and Notification System - Task 4
 */

import Redis from 'ioredis';
import { AlertRule } from '../types';
import { BaseEvent } from '../../events/event-types';
import { extractEventTargets } from './rule-matcher';

// ============================================================================
// Redis Connection
// ============================================================================

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 100, 2000); // Exponential backoff
      },
    });
  }
  return redisClient;
}

// ============================================================================
// Cache Keys
// ============================================================================

const CACHE_PREFIX = 'alert:rules';
const CACHE_TTL = 300; // 5 minutes

export function getRuleCacheKey(target: {
  protocolId?: string;
  tokenId?: string;
  chainId?: number;
}): string[] {
  const keys: string[] = [];
  
  if (target.protocolId) {
    keys.push(`${CACHE_PREFIX}:protocol:${target.protocolId}`);
  }
  
  if (target.tokenId) {
    keys.push(`${CACHE_PREFIX}:token:${target.tokenId}`);
  }
  
  if (target.chainId) {
    keys.push(`${CACHE_PREFIX}:chain:${target.chainId}`);
  }
  
  return keys;
}

export function getRuleCacheKeyForEvent(event: BaseEvent): string[] {
  const targets = extractEventTargets(event);
  return getRuleCacheKey(targets);
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get cached rules for target
 */
export async function getCachedRules(
  target: {
    protocolId?: string;
    tokenId?: string;
    chainId?: number;
  }
): Promise<AlertRule[] | null> {
  const redis = getRedisClient();
  const keys = getRuleCacheKey(target);
  
  if (keys.length === 0) {
    return null;
  }
  
  // Get all cached rule IDs for all target keys
  const ruleIdSets = await Promise.all(
    keys.map(key => redis.smembers(key))
  );
  
  // Combine all rule IDs (union)
  const allRuleIds = new Set<string>();
  ruleIdSets.forEach(ruleIds => {
    ruleIds.forEach(id => allRuleIds.add(id));
  });
  
  if (allRuleIds.size === 0) {
    return null;
  }
  
  // Get rule data for all IDs
  const ruleKeys = Array.from(allRuleIds).map(id => `${CACHE_PREFIX}:data:${id}`);
  const ruleData = await redis.mget(...ruleKeys);
  
  // Parse and return rules
  const rules: AlertRule[] = [];
  ruleData.forEach(data => {
    if (data) {
      try {
        rules.push(JSON.parse(data));
      } catch (error) {
        console.error('Failed to parse cached rule:', error);
      }
    }
  });
  
  return rules.length > 0 ? rules : null;
}

/**
 * Cache rules for target
 */
export async function cacheRules(
  target: {
    protocolId?: string;
    tokenId?: string;
    chainId?: number;
  },
  rules: AlertRule[]
): Promise<void> {
  const redis = getRedisClient();
  const keys = getRuleCacheKey(target);
  
  if (keys.length === 0) {
    return;
  }
  
  // Use pipeline for atomic operations
  const pipeline = redis.pipeline();
  
  // Store rule data
  rules.forEach(rule => {
    const dataKey = `${CACHE_PREFIX}:data:${rule.id}`;
    pipeline.setex(dataKey, CACHE_TTL, JSON.stringify(rule));
  });
  
  // Store rule IDs in sets for each target key
  keys.forEach(key => {
    // Delete existing set
    pipeline.del(key);
    
    // Add rule IDs to set
    if (rules.length > 0) {
      const ruleIds = rules.map(r => r.id);
      pipeline.sadd(key, ...ruleIds);
      pipeline.expire(key, CACHE_TTL);
    }
  });
  
  await pipeline.exec();
}

/**
 * Invalidate cache for specific rule
 */
export async function invalidateRuleCache(ruleId: string): Promise<void> {
  const redis = getRedisClient();
  
  // Delete rule data
  const dataKey = `${CACHE_PREFIX}:data:${ruleId}`;
  await redis.del(dataKey);
  
  // Note: We don't delete from target sets because it's complex
  // and cache will expire in 5 minutes anyway
}

/**
 * Invalidate all rule caches
 */
export async function invalidateAllRuleCaches(): Promise<void> {
  const redis = getRedisClient();
  
  // Get all cache keys
  const keys = await redis.keys(`${CACHE_PREFIX}:*`);
  
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// ============================================================================
// Cache Statistics
// ============================================================================

export interface CacheStats {
  totalKeys: number;
  dataKeys: number;
  targetKeys: number;
  memoryUsage: number;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  const redis = getRedisClient();
  
  // Get all cache keys
  const allKeys = await redis.keys(`${CACHE_PREFIX}:*`);
  const dataKeys = allKeys.filter(k => k.includes(':data:'));
  const targetKeys = allKeys.filter(k => !k.includes(':data:'));
  
  // Get memory usage (approximate)
  let memoryUsage = 0;
  if (allKeys.length > 0) {
    const memoryResults = await Promise.all(
      allKeys.map(key => redis.memory('USAGE', key))
    );
    memoryUsage = memoryResults.reduce((sum, usage) => sum + (usage || 0), 0);
  }
  
  return {
    totalKeys: allKeys.length,
    dataKeys: dataKeys.length,
    targetKeys: targetKeys.length,
    memoryUsage,
  };
}

// ============================================================================
// Cache Warming
// ============================================================================

/**
 * Warm cache with rules
 */
export async function warmCache(rules: AlertRule[]): Promise<void> {
  const redis = getRedisClient();
  const pipeline = redis.pipeline();
  
  // Group rules by target
  const rulesByTarget = new Map<string, AlertRule[]>();
  
  rules.forEach(rule => {
    const targets = [];
    
    if (rule.protocol_id) {
      targets.push(`protocol:${rule.protocol_id}`);
    }
    if (rule.token_id) {
      targets.push(`token:${rule.token_id}`);
    }
    if (rule.chain_id) {
      targets.push(`chain:${rule.chain_id}`);
    }
    
    targets.forEach(target => {
      if (!rulesByTarget.has(target)) {
        rulesByTarget.set(target, []);
      }
      rulesByTarget.get(target)!.push(rule);
    });
  });
  
  // Cache rules for each target
  for (const [target, targetRules] of rulesByTarget) {
    const [type, id] = target.split(':');
    const cacheTarget: any = {};
    
    if (type === 'protocol') {
      cacheTarget.protocolId = id;
    } else if (type === 'token') {
      cacheTarget.tokenId = id;
    } else if (type === 'chain') {
      cacheTarget.chainId = parseInt(id);
    }
    
    await cacheRules(cacheTarget, targetRules);
  }
}

