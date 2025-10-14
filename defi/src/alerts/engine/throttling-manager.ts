/**
 * Throttling Manager
 * Manages alert throttling to prevent spam
 * Story 1.3: Alert Engine and Notification System - Task 5
 */

import { getRedisClient } from './rule-cache';
import { getAlertsDBConnection } from '../db';
import { AlertRule } from '../types';

// ============================================================================
// Throttling Cache Keys
// ============================================================================

const THROTTLE_PREFIX = 'alert:throttle';

export function getThrottleCacheKey(ruleId: string): string {
  return `${THROTTLE_PREFIX}:${ruleId}`;
}

// ============================================================================
// Throttling Check
// ============================================================================

/**
 * Check if rule is throttled
 */
export async function isRuleThrottled(rule: AlertRule): Promise<boolean> {
  const redis = getRedisClient();
  const cacheKey = getThrottleCacheKey(rule.id);
  
  // Check Redis cache first
  const cachedTimestamp = await redis.get(cacheKey);
  if (cachedTimestamp) {
    const lastTriggered = parseInt(cachedTimestamp);
    const now = Date.now();
    const throttleMs = rule.throttle_minutes * 60 * 1000;
    const nextAllowedTime = lastTriggered + throttleMs;
    
    return now < nextAllowedTime;
  }
  
  // Fallback to database
  if (rule.last_triggered_at) {
    const lastTriggered = new Date(rule.last_triggered_at).getTime();
    const now = Date.now();
    const throttleMs = rule.throttle_minutes * 60 * 1000;
    const nextAllowedTime = lastTriggered + throttleMs;
    
    // Update cache
    if (now < nextAllowedTime) {
      const ttl = Math.ceil((nextAllowedTime - now) / 1000);
      await redis.setex(cacheKey, ttl, lastTriggered.toString());
      return true;
    }
  }
  
  return false;
}

/**
 * Check multiple rules for throttling
 */
export async function filterThrottledRules(rules: AlertRule[]): Promise<{
  allowed: AlertRule[];
  throttled: AlertRule[];
}> {
  const results = await Promise.all(
    rules.map(async rule => ({
      rule,
      isThrottled: await isRuleThrottled(rule),
    }))
  );
  
  const allowed = results.filter(r => !r.isThrottled).map(r => r.rule);
  const throttled = results.filter(r => r.isThrottled).map(r => r.rule);
  
  return { allowed, throttled };
}

// ============================================================================
// Throttling Update
// ============================================================================

/**
 * Update rule throttling state
 */
export async function updateRuleThrottling(
  ruleId: string,
  throttleMinutes: number
): Promise<void> {
  const redis = getRedisClient();
  const sql = getAlertsDBConnection();
  const now = Date.now();
  
  // Update database
  const query = `
    UPDATE alert_rules
    SET last_triggered_at = NOW()
    WHERE id = $1
  `;
  await sql.unsafe(query, [ruleId]);
  
  // Update Redis cache
  const cacheKey = getThrottleCacheKey(ruleId);
  const ttl = throttleMinutes * 60;
  await redis.setex(cacheKey, ttl, now.toString());
}

/**
 * Batch update rule throttling
 */
export async function batchUpdateRuleThrottling(
  rules: { ruleId: string; throttleMinutes: number }[]
): Promise<void> {
  if (rules.length === 0) {
    return;
  }
  
  const redis = getRedisClient();
  const sql = getAlertsDBConnection();
  const now = Date.now();
  
  // Update database in batch
  const ruleIds = rules.map(r => r.ruleId);
  const query = `
    UPDATE alert_rules
    SET last_triggered_at = NOW()
    WHERE id = ANY($1)
  `;
  await sql.unsafe(query, [ruleIds]);
  
  // Update Redis cache in pipeline
  const pipeline = redis.pipeline();
  rules.forEach(({ ruleId, throttleMinutes }) => {
    const cacheKey = getThrottleCacheKey(ruleId);
    const ttl = throttleMinutes * 60;
    pipeline.setex(cacheKey, ttl, now.toString());
  });
  await pipeline.exec();
}

// ============================================================================
// Throttling Reset
// ============================================================================

/**
 * Reset throttling for rule
 */
export async function resetRuleThrottling(ruleId: string): Promise<void> {
  const redis = getRedisClient();
  const cacheKey = getThrottleCacheKey(ruleId);
  await redis.del(cacheKey);
}

/**
 * Reset all throttling
 */
export async function resetAllThrottling(): Promise<void> {
  const redis = getRedisClient();
  const keys = await redis.keys(`${THROTTLE_PREFIX}:*`);
  
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// ============================================================================
// Throttling Statistics
// ============================================================================

export interface ThrottlingStats {
  totalRules: number;
  throttledRules: number;
  allowedRules: number;
  cacheHits: number;
  cacheMisses: number;
}

let statsCache = {
  cacheHits: 0,
  cacheMisses: 0,
};

/**
 * Get throttling statistics
 */
export async function getThrottlingStats(rules: AlertRule[]): Promise<ThrottlingStats> {
  const { allowed, throttled } = await filterThrottledRules(rules);
  
  return {
    totalRules: rules.length,
    throttledRules: throttled.length,
    allowedRules: allowed.length,
    cacheHits: statsCache.cacheHits,
    cacheMisses: statsCache.cacheMisses,
  };
}

/**
 * Reset statistics
 */
export function resetStats(): void {
  statsCache = {
    cacheHits: 0,
    cacheMisses: 0,
  };
}

// ============================================================================
// Throttling Info
// ============================================================================

export interface ThrottlingInfo {
  ruleId: string;
  isThrottled: boolean;
  lastTriggeredAt?: Date;
  nextAllowedAt?: Date;
  remainingSeconds?: number;
}

/**
 * Get throttling info for rule
 */
export async function getThrottlingInfo(rule: AlertRule): Promise<ThrottlingInfo> {
  const isThrottled = await isRuleThrottled(rule);
  
  if (!isThrottled) {
    return {
      ruleId: rule.id,
      isThrottled: false,
    };
  }
  
  const lastTriggered = rule.last_triggered_at
    ? new Date(rule.last_triggered_at)
    : undefined;
  
  if (!lastTriggered) {
    return {
      ruleId: rule.id,
      isThrottled: false,
    };
  }
  
  const throttleMs = rule.throttle_minutes * 60 * 1000;
  const nextAllowedAt = new Date(lastTriggered.getTime() + throttleMs);
  const remainingSeconds = Math.ceil((nextAllowedAt.getTime() - Date.now()) / 1000);
  
  return {
    ruleId: rule.id,
    isThrottled: true,
    lastTriggeredAt: lastTriggered,
    nextAllowedAt,
    remainingSeconds: Math.max(0, remainingSeconds),
  };
}

/**
 * Get throttling info for multiple rules
 */
export async function batchGetThrottlingInfo(
  rules: AlertRule[]
): Promise<ThrottlingInfo[]> {
  return Promise.all(rules.map(rule => getThrottlingInfo(rule)));
}

