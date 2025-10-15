/**
 * Analytics API Types
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Phase: 2 - API Implementation
 */

/**
 * Time range options for analytics queries
 */
export type TimeRange = '7d' | '30d' | '90d' | '1y';

/**
 * Protocol category for filtering
 */
export type ProtocolCategory = 
  | 'dex' 
  | 'lending' 
  | 'yield' 
  | 'derivatives' 
  | 'bridge' 
  | 'liquid-staking'
  | 'all';

/**
 * Benchmark metric types
 */
export type BenchmarkMetric = 'tvl' | 'volume24h' | 'users' | 'revenue' | 'apy';

/**
 * Error codes for API responses
 */
export enum ErrorCode {
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Request query parameters for performance endpoint
 */
export interface PerformanceQueryParams {
  timeRange?: TimeRange;
  includeHistory?: boolean;
}

/**
 * Request query parameters for APY endpoint
 */
export interface APYQueryParams {
  timeRange?: TimeRange;
}

/**
 * Request query parameters for users endpoint
 */
export interface UsersQueryParams {
  date?: string; // ISO date or Unix timestamp
  periods?: number; // For cohort analysis
}

/**
 * Request query parameters for revenue endpoint
 */
export interface RevenueQueryParams {
  timeRange?: TimeRange;
}

/**
 * Request query parameters for benchmark endpoint
 */
export interface BenchmarkQueryParams {
  protocolIds: string; // Comma-separated list
  category?: ProtocolCategory;
  metric?: BenchmarkMetric;
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  details?: any;
  timestamp: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: ErrorResponse;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  key: string; // Cache key
}

