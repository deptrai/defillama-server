/**
 * Utility Functions for Protocol Performance Collectors
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 2 - Data Collection Pipeline
 */

import { DateRange, TimeRange, MetricCalculationResult } from './types';

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Get date N days ago from now
 */
export function getDaysAgo(days: number, from: Date = new Date()): Date {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Get start of day (00:00:00)
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day (23:59:59)
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get date range for a time period
 */
export function getDateRange(timeRange: TimeRange, endDate: Date = new Date()): DateRange {
  const end = new Date(endDate);
  let start: Date;
  
  switch (timeRange) {
    case '1d':
      start = getDaysAgo(1, end);
      break;
    case '7d':
      start = getDaysAgo(7, end);
      break;
    case '30d':
      start = getDaysAgo(30, end);
      break;
    case '90d':
      start = getDaysAgo(90, end);
      break;
    case '1y':
      start = getDaysAgo(365, end);
      break;
    default:
      start = getDaysAgo(7, end);
  }
  
  return { start, end };
}

/**
 * Convert Unix timestamp to Date
 */
export function unixToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Convert Date to Unix timestamp
 */
export function dateToUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

// ============================================================================
// Metric Calculation Utilities
// ============================================================================

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number | null {
  if (previous === 0 || previous === null || previous === undefined) {
    return null;
  }
  
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate APY from TVL changes
 * Formula: APY = ((current_tvl / previous_tvl) ^ (365 / days)) - 1
 */
export function calculateAPY(
  currentTVL: number,
  previousTVL: number,
  days: number
): MetricCalculationResult {
  if (previousTVL === 0 || previousTVL === null || previousTVL === undefined) {
    return {
      value: null,
      confidence: 0,
      data_points: 0,
      method: 'insufficient_data',
    };
  }
  
  if (currentTVL <= 0 || previousTVL <= 0) {
    return {
      value: null,
      confidence: 0,
      data_points: 2,
      method: 'invalid_data',
    };
  }
  
  const ratio = currentTVL / previousTVL;
  const apy = (Math.pow(ratio, 365 / days) - 1) * 100;
  
  // Confidence based on data quality
  let confidence = 1.0;
  if (days < 7) confidence = 0.5; // Less confident with short time periods
  if (Math.abs(apy) > 1000) confidence = 0.3; // Very high APY is suspicious
  
  return {
    value: apy,
    confidence,
    data_points: 2,
    method: 'tvl_ratio',
  };
}

/**
 * Calculate average
 */
export function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate median
 */
export function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * Calculate sum
 */
export function calculateSum(values: number[]): number {
  return values.reduce((acc, val) => acc + val, 0);
}

/**
 * Calculate growth rate
 * Formula: ((current - previous) / previous) * 100
 */
export function calculateGrowthRate(
  current: number,
  previous: number
): number | null {
  return calculatePercentageChange(current, previous);
}

// ============================================================================
// Data Aggregation Utilities
// ============================================================================

/**
 * Aggregate values by key
 */
export function aggregateByKey<T>(
  data: T[],
  keyFn: (item: T) => string,
  valueFn: (item: T) => number
): Record<string, number> {
  const result: Record<string, number> = {};
  
  for (const item of data) {
    const key = keyFn(item);
    const value = valueFn(item);
    
    if (result[key] === undefined) {
      result[key] = 0;
    }
    
    result[key] += value;
  }
  
  return result;
}

/**
 * Group data by key
 */
export function groupByKey<T>(
  data: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  
  for (const item of data) {
    const key = keyFn(item);
    
    if (result[key] === undefined) {
      result[key] = [];
    }
    
    result[key].push(item);
  }
  
  return result;
}

/**
 * Filter data by date range
 */
export function filterByDateRange<T>(
  data: T[],
  dateFn: (item: T) => Date,
  range: DateRange
): T[] {
  return data.filter(item => {
    const date = dateFn(item);
    return date >= range.start && date <= range.end;
  });
}

// ============================================================================
// Data Validation Utilities
// ============================================================================

/**
 * Validate number is positive
 */
export function isPositiveNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && value > 0;
}

/**
 * Validate number is non-negative
 */
export function isNonNegativeNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

/**
 * Validate percentage (0-100)
 */
export function isValidPercentage(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 100;
}

/**
 * Sanitize numeric value from PostgreSQL
 * PostgreSQL NUMERIC type comes as string
 */
export function sanitizeNumeric(value: any): number | null {
  if (value === null || value === undefined) return null;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return null;
  
  return num;
}

/**
 * Sanitize array of numeric values
 */
export function sanitizeNumericArray(values: any[]): number[] {
  return values
    .map(sanitizeNumeric)
    .filter((v): v is number => v !== null);
}

// ============================================================================
// Logging Utilities
// ============================================================================

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format percentage
 */
export function formatPercentage(num: number, decimals: number = 2): string {
  return `${num.toFixed(decimals)}%`;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Safely execute async function with error handling
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  errorMessage: string = 'Error executing function'
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(errorMessage, error);
    return defaultValue;
  }
}

/**
 * Retry async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

