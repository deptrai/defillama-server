/**
 * Analytics API Caching
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Phase: 2 - API Implementation
 * 
 * Implements HTTP caching with configurable TTL
 */

import { CacheConfig } from './types';

/**
 * Cache TTL configurations (in seconds)
 */
export const CACHE_TTL = {
  PERFORMANCE: 300, // 5 minutes
  APY: 300, // 5 minutes
  USERS: 300, // 5 minutes
  REVENUE: 300, // 5 minutes
  BENCHMARK: 600, // 10 minutes (less volatile)
} as const;

/**
 * Generate cache key for performance endpoint
 */
export function getPerformanceCacheKey(
  protocolId: string,
  timeRange: string,
  includeHistory: boolean
): string {
  return `analytics:performance:${protocolId}:${timeRange}:${includeHistory}`;
}

/**
 * Generate cache key for APY endpoint
 */
export function getAPYCacheKey(protocolId: string, timeRange: string): string {
  return `analytics:apy:${protocolId}:${timeRange}`;
}

/**
 * Generate cache key for users endpoint
 */
export function getUsersCacheKey(
  protocolId: string,
  date: string,
  periods: number
): string {
  return `analytics:users:${protocolId}:${date}:${periods}`;
}

/**
 * Generate cache key for revenue endpoint
 */
export function getRevenueCacheKey(protocolId: string, timeRange: string): string {
  return `analytics:revenue:${protocolId}:${timeRange}`;
}

/**
 * Generate cache key for benchmark endpoint
 */
export function getBenchmarkCacheKey(
  protocolIds: string[],
  category?: string,
  metric?: string
): string {
  const sortedIds = [...protocolIds].sort().join(',');
  return `analytics:benchmark:${sortedIds}:${category || 'all'}:${metric || 'all'}`;
}

/**
 * Get cache configuration for performance endpoint
 */
export function getPerformanceCacheConfig(
  protocolId: string,
  timeRange: string,
  includeHistory: boolean
): CacheConfig {
  return {
    ttl: CACHE_TTL.PERFORMANCE,
    key: getPerformanceCacheKey(protocolId, timeRange, includeHistory),
  };
}

/**
 * Get cache configuration for APY endpoint
 */
export function getAPYCacheConfig(protocolId: string, timeRange: string): CacheConfig {
  return {
    ttl: CACHE_TTL.APY,
    key: getAPYCacheKey(protocolId, timeRange),
  };
}

/**
 * Get cache configuration for users endpoint
 */
export function getUsersCacheConfig(
  protocolId: string,
  date: string,
  periods: number
): CacheConfig {
  return {
    ttl: CACHE_TTL.USERS,
    key: getUsersCacheKey(protocolId, date, periods),
  };
}

/**
 * Get cache configuration for revenue endpoint
 */
export function getRevenueCacheConfig(protocolId: string, timeRange: string): CacheConfig {
  return {
    ttl: CACHE_TTL.REVENUE,
    key: getRevenueCacheKey(protocolId, timeRange),
  };
}

/**
 * Get cache configuration for benchmark endpoint
 */
export function getBenchmarkCacheConfig(
  protocolIds: string[],
  category?: string,
  metric?: string
): CacheConfig {
  return {
    ttl: CACHE_TTL.BENCHMARK,
    key: getBenchmarkCacheKey(protocolIds, category, metric),
  };
}

/**
 * Calculate time range in days
 */
export function getTimeRangeDays(timeRange: string): number {
  switch (timeRange) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '1y':
      return 365;
    default:
      return 30; // Default to 30 days
  }
}

/**
 * Get start and end dates for time range
 */
export function getTimeRangeDates(timeRange: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const days = getTimeRangeDays(timeRange);
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  return { startDate, endDate };
}

/**
 * Parse date parameter to Date object
 */
export function parseDate(dateStr?: string): Date {
  if (!dateStr) {
    return new Date();
  }

  // Try parsing as Unix timestamp
  const timestamp = parseInt(dateStr, 10);
  if (!isNaN(timestamp)) {
    return new Date(timestamp * 1000);
  }

  // Parse as ISO date
  return new Date(dateStr);
}

/**
 * Parse periods parameter
 */
export function parsePeriods(periodsStr?: string): number {
  if (!periodsStr) {
    return 12; // Default to 12 periods
  }

  const periods = parseInt(periodsStr, 10);
  return isNaN(periods) ? 12 : periods;
}

/**
 * Parse boolean parameter
 */
export function parseBoolean(value?: string): boolean {
  return value === 'true';
}

