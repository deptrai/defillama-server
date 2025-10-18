/**
 * Rate Limiter Middleware
 * Story 1.1.1: Configure Whale Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 * 
 * Implements token bucket algorithm with Redis backend
 * 
 * Features:
 * - Per-user rate limiting
 * - Per-endpoint rate limiting
 * - Configurable limits
 * - Redis-backed for distributed systems
 * - Automatic cleanup of expired keys
 */

import Redis from 'ioredis';

// Redis connection
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD;
    const redisDb = parseInt(process.env.REDIS_DB || '1', 10);

    redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      db: redisDb,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }
  return redisClient;
}

// Rate limit configurations
export interface RateLimitConfig {
  maxRequests: number;  // Maximum requests allowed
  windowMs: number;     // Time window in milliseconds
  keyPrefix: string;    // Redis key prefix
}

// Default rate limit configurations
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Global rate limit (per user)
  global: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:global',
  },
  
  // Create whale alert
  createWhaleAlert: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:create',
  },
  
  // Get whale alerts (list)
  getWhaleAlerts: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:get',
  },
  
  // Get whale alert by ID
  getWhaleAlertById: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:getById',
  },
  
  // Update whale alert
  updateWhaleAlert: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:update',
  },
  
  // Delete whale alert
  deleteWhaleAlert: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:delete',
  },
  
  // Toggle whale alert
  toggleWhaleAlert: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:toggle',
  },
};

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check rate limit using token bucket algorithm
 * 
 * @param userId - User ID
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const key = `${config.keyPrefix}:${userId}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Remove old entries outside the time window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in the window
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiration
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline failed');
    }
    
    // Get count after removing old entries
    const count = (results[1][1] as number) || 0;
    
    // Check if rate limit exceeded
    const allowed = count < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count - 1);
    const resetAt = now + config.windowMs;
    
    if (!allowed) {
      // Remove the request we just added since it's not allowed
      await redis.zrem(key, `${now}-${Math.random()}`);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil(config.windowMs / 1000),
      };
    }
    
    return {
      allowed: true,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: now + config.windowMs,
    };
  }
}

/**
 * Rate limiter middleware for Lambda functions
 * 
 * @param userId - User ID
 * @param endpoint - Endpoint name (e.g., 'createWhaleAlert')
 * @returns Rate limit result
 */
export async function rateLimiter(
  userId: string,
  endpoint: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint];
  
  if (!config) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }
  
  // Check endpoint-specific rate limit
  const endpointResult = await checkRateLimit(userId, config);
  
  if (!endpointResult.allowed) {
    return endpointResult;
  }
  
  // Check global rate limit
  const globalResult = await checkRateLimit(userId, RATE_LIMITS.global);
  
  if (!globalResult.allowed) {
    return globalResult;
  }
  
  // Return the more restrictive result
  return {
    allowed: true,
    remaining: Math.min(endpointResult.remaining, globalResult.remaining),
    resetAt: Math.max(endpointResult.resetAt, globalResult.resetAt),
  };
}

/**
 * Format rate limit headers for HTTP response
 * 
 * @param result - Rate limit result
 * @returns HTTP headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(RATE_LIMITS.global.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }
  
  return headers;
}

/**
 * Create rate limit error response
 * 
 * @param result - Rate limit result
 * @returns HTTP response
 */
export function createRateLimitErrorResponse(result: RateLimitResult) {
  return {
    statusCode: 429,
    headers: {
      'Content-Type': 'application/json',
      ...getRateLimitHeaders(result),
    },
    body: JSON.stringify({
      success: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: result.retryAfter,
      resetAt: result.resetAt,
    }),
  };
}

/**
 * Reset rate limit for a user (admin function)
 * 
 * @param userId - User ID
 * @param endpoint - Optional endpoint name (if not provided, resets all)
 */
export async function resetRateLimit(
  userId: string,
  endpoint?: keyof typeof RATE_LIMITS
): Promise<void> {
  const redis = getRedisClient();
  
  if (endpoint) {
    const config = RATE_LIMITS[endpoint];
    const key = `${config.keyPrefix}:${userId}`;
    await redis.del(key);
  } else {
    // Reset all rate limits for user
    const keys = Object.values(RATE_LIMITS).map(
      (config) => `${config.keyPrefix}:${userId}`
    );
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

/**
 * Get current rate limit status for a user
 * 
 * @param userId - User ID
 * @param endpoint - Endpoint name
 * @returns Current status
 */
export async function getRateLimitStatus(
  userId: string,
  endpoint: keyof typeof RATE_LIMITS
): Promise<{ current: number; limit: number; remaining: number }> {
  const redis = getRedisClient();
  const config = RATE_LIMITS[endpoint];
  const key = `${config.keyPrefix}:${userId}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  try {
    // Remove old entries and count current
    await redis.zremrangebyscore(key, 0, windowStart);
    const current = await redis.zcard(key);
    
    return {
      current,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - current),
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return {
      current: 0,
      limit: config.maxRequests,
      remaining: config.maxRequests,
    };
  }
}

