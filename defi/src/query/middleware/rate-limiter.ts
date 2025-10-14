/**
 * Rate Limiter Middleware
 * Redis-based rate limiting with sliding window algorithm
 */

import { getRedisClient } from '../../utils/shared/redis';

// Rate limits by tier (requests per minute)
const RATE_LIMITS = {
  anonymous: 10,
  free: 100,
  pro: 1000,
  enterprise: 10000,
};

/**
 * Check rate limit for user
 */
export async function checkRateLimit(userId: string, requestId: string): Promise<void> {
  const redis = await getRedisClient();

  // Determine tier from userId
  const tier = getUserTier(userId);
  const limit = RATE_LIMITS[tier];

  // Generate rate limit key
  const key = `rate_limit:${userId}`;
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window

  try {
    // Add current request to sorted set
    await redis.zadd(key, now, requestId);

    // Remove old requests outside window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in window
    const count = await redis.zcard(key);

    // Set expiry on key (2 minutes)
    await redis.expire(key, 120);

    // Check if limit exceeded
    if (count > limit) {
      throw new Error(`Rate limit exceeded. Limit: ${limit} requests per minute`);
    }
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      throw error;
    }
    // If Redis error, allow request (fail open)
    console.error('Rate limit check error:', error);
  }
}

/**
 * Get user tier from userId
 */
function getUserTier(userId: string): 'anonymous' | 'free' | 'pro' | 'enterprise' {
  if (userId === 'anonymous') {
    return 'anonymous';
  }

  // TODO: Fetch tier from database
  // For now, return free tier
  return 'free';
}

/**
 * Get remaining requests for user
 */
export async function getRemainingRequests(userId: string): Promise<number> {
  const redis = await getRedisClient();
  const tier = getUserTier(userId);
  const limit = RATE_LIMITS[tier];

  const key = `rate_limit:${userId}`;
  const now = Date.now();
  const windowStart = now - 60000;

  try {
    // Remove old requests
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in window
    const count = await redis.zcard(key);

    return Math.max(0, limit - count);
  } catch (error) {
    console.error('Get remaining requests error:', error);
    return limit;
  }
}

