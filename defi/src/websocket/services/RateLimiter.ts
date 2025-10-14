/**
 * Rate Limiter Service for WebSocket Connections
 * Implements sliding window rate limiting using Redis
 */

import { getRedisClient } from '../utils/redis';
import { Redis } from 'ioredis';

export interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Maximum requests per window
  blockDurationMs: number; // Block duration when limit exceeded
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface RateLimitStats {
  requestCount: number;
  windowStart: number;
  windowEnd: number;
  isBlocked: boolean;
  blockExpiresAt?: number;
}

export class RateLimiter {
  private redis: Redis;
  private readonly RATE_LIMIT_PREFIX = 'ws:ratelimit:';
  private readonly BLOCK_PREFIX = 'ws:block:';
  
  // Default configuration
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60000,        // 1 minute
    maxRequests: 100,       // 100 requests per minute
    blockDurationMs: 300000 // 5 minutes block
  };

  constructor(private config: RateLimitConfig = {} as RateLimitConfig) {
    this.redis = getRedisClient();
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(connectionId: string): Promise<RateLimitResult> {
    try {
      // Check if connection is blocked
      const isBlocked = await this.isBlocked(connectionId);
      if (isBlocked) {
        const blockExpiry = await this.getBlockExpiry(connectionId);
        return {
          allowed: false,
          remaining: 0,
          resetAt: blockExpiry,
          retryAfter: blockExpiry - Date.now(),
        };
      }

      const now = Date.now();
      const windowStart = now - this.config.windowMs;
      const key = `${this.RATE_LIMIT_PREFIX}${connectionId}`;

      // Remove old entries outside the window
      await this.redis.zremrangebyscore(key, '-inf', windowStart);

      // Count requests in current window
      const requestCount = await this.redis.zcard(key);

      // Check if limit exceeded
      if (requestCount >= this.config.maxRequests) {
        // Block the connection
        await this.blockConnection(connectionId, this.config.blockDurationMs);

        return {
          allowed: false,
          remaining: 0,
          resetAt: now + this.config.blockDurationMs,
          retryAfter: this.config.blockDurationMs,
        };
      }

      // Calculate remaining requests
      const remaining = this.config.maxRequests - requestCount;

      // Get oldest request timestamp to calculate reset time
      const oldestRequest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldestRequest.length > 0
        ? parseInt(oldestRequest[1]) + this.config.windowMs
        : now + this.config.windowMs;

      return {
        allowed: true,
        remaining,
        resetAt,
      };
    } catch (error) {
      console.error(`Error checking rate limit for ${connectionId}:`, error);
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: Date.now() + this.config.windowMs,
      };
    }
  }

  /**
   * Record a request
   */
  async recordRequest(connectionId: string): Promise<void> {
    try {
      const now = Date.now();
      const key = `${this.RATE_LIMIT_PREFIX}${connectionId}`;

      // Add request timestamp to sorted set
      await this.redis.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiration on the key
      const expirySeconds = Math.ceil(this.config.windowMs / 1000) + 60; // Add buffer
      await this.redis.expire(key, expirySeconds);

      console.log(`Recorded request for connection ${connectionId}`);
    } catch (error) {
      console.error(`Error recording request for ${connectionId}:`, error);
    }
  }

  /**
   * Check and record request in one operation
   */
  async checkAndRecord(connectionId: string): Promise<RateLimitResult> {
    const result = await this.checkLimit(connectionId);
    
    if (result.allowed) {
      await this.recordRequest(connectionId);
    }

    return result;
  }

  /**
   * Get remaining requests for a connection
   */
  async getRemainingRequests(connectionId: string): Promise<number> {
    try {
      const now = Date.now();
      const windowStart = now - this.config.windowMs;
      const key = `${this.RATE_LIMIT_PREFIX}${connectionId}`;

      // Remove old entries
      await this.redis.zremrangebyscore(key, '-inf', windowStart);

      // Count requests
      const requestCount = await this.redis.zcard(key);

      return Math.max(0, this.config.maxRequests - requestCount);
    } catch (error) {
      console.error(`Error getting remaining requests for ${connectionId}:`, error);
      return this.config.maxRequests;
    }
  }

  /**
   * Reset rate limit for a connection
   */
  async resetLimit(connectionId: string): Promise<void> {
    try {
      const key = `${this.RATE_LIMIT_PREFIX}${connectionId}`;
      await this.redis.del(key);
      console.log(`Reset rate limit for connection ${connectionId}`);
    } catch (error) {
      console.error(`Error resetting rate limit for ${connectionId}:`, error);
    }
  }

  /**
   * Block a connection temporarily
   */
  async blockConnection(connectionId: string, durationMs: number): Promise<void> {
    try {
      const key = `${this.BLOCK_PREFIX}${connectionId}`;
      const expirySeconds = Math.ceil(durationMs / 1000);
      const blockUntil = Date.now() + durationMs;

      await this.redis.set(key, blockUntil.toString(), 'EX', expirySeconds);
      console.log(`Blocked connection ${connectionId} for ${durationMs}ms`);
    } catch (error) {
      console.error(`Error blocking connection ${connectionId}:`, error);
    }
  }

  /**
   * Unblock a connection
   */
  async unblockConnection(connectionId: string): Promise<void> {
    try {
      const key = `${this.BLOCK_PREFIX}${connectionId}`;
      await this.redis.del(key);
      console.log(`Unblocked connection ${connectionId}`);
    } catch (error) {
      console.error(`Error unblocking connection ${connectionId}:`, error);
    }
  }

  /**
   * Check if connection is blocked
   */
  async isBlocked(connectionId: string): Promise<boolean> {
    try {
      const key = `${this.BLOCK_PREFIX}${connectionId}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`Error checking if connection ${connectionId} is blocked:`, error);
      return false;
    }
  }

  /**
   * Get block expiry timestamp
   */
  async getBlockExpiry(connectionId: string): Promise<number> {
    try {
      const key = `${this.BLOCK_PREFIX}${connectionId}`;
      const blockUntil = await this.redis.get(key);
      return blockUntil ? parseInt(blockUntil) : 0;
    } catch (error) {
      console.error(`Error getting block expiry for ${connectionId}:`, error);
      return 0;
    }
  }

  /**
   * Get rate limit statistics for a connection
   */
  async getStats(connectionId: string): Promise<RateLimitStats> {
    try {
      const now = Date.now();
      const windowStart = now - this.config.windowMs;
      const key = `${this.RATE_LIMIT_PREFIX}${connectionId}`;

      // Remove old entries
      await this.redis.zremrangebyscore(key, '-inf', windowStart);

      // Get request count
      const requestCount = await this.redis.zcard(key);

      // Check if blocked
      const isBlocked = await this.isBlocked(connectionId);
      const blockExpiresAt = isBlocked ? await this.getBlockExpiry(connectionId) : undefined;

      return {
        requestCount,
        windowStart,
        windowEnd: now,
        isBlocked,
        blockExpiresAt,
      };
    } catch (error) {
      console.error(`Error getting stats for ${connectionId}:`, error);
      return {
        requestCount: 0,
        windowStart: Date.now() - this.config.windowMs,
        windowEnd: Date.now(),
        isBlocked: false,
      };
    }
  }

  /**
   * Clean up expired rate limit data
   */
  async cleanup(): Promise<number> {
    try {
      const pattern = `${this.RATE_LIMIT_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      
      let cleaned = 0;
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      for (const key of keys) {
        // Remove old entries
        const removed = await this.redis.zremrangebyscore(key, '-inf', windowStart);
        
        // Delete key if empty
        const count = await this.redis.zcard(key);
        if (count === 0) {
          await this.redis.del(key);
          cleaned++;
        }
      }

      console.log(`Cleaned up ${cleaned} expired rate limit keys`);
      return cleaned;
    } catch (error) {
      console.error('Error cleaning up rate limit data:', error);
      return 0;
    }
  }
}

