/**
 * Analytics API Validation
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Phase: 2 - API Implementation
 */

import {
  TimeRange,
  ProtocolCategory,
  BenchmarkMetric,
  ErrorCode,
  ErrorResponse,
  ValidationResult,
  PerformanceQueryParams,
  APYQueryParams,
  UsersQueryParams,
  RevenueQueryParams,
  BenchmarkQueryParams,
} from './types';

/**
 * Validate protocol ID
 */
export function validateProtocolId(protocolId: string): ValidationResult {
  if (!protocolId || typeof protocolId !== 'string') {
    return {
      valid: false,
      error: {
        error: 'Protocol ID is required and must be a string',
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'protocolId', value: protocolId },
        timestamp: Date.now(),
      },
    };
  }

  // Sanitize to prevent SQL injection
  if (!/^[a-zA-Z0-9_-]+$/.test(protocolId)) {
    return {
      valid: false,
      error: {
        error: 'Protocol ID contains invalid characters. Only alphanumeric, dash, and underscore allowed.',
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'protocolId', value: protocolId },
        timestamp: Date.now(),
      },
    };
  }

  return { valid: true };
}

/**
 * Validate time range
 */
export function validateTimeRange(timeRange?: string): ValidationResult {
  const validRanges: TimeRange[] = ['7d', '30d', '90d', '1y'];

  if (!timeRange) {
    return { valid: true }; // Optional parameter
  }

  if (!validRanges.includes(timeRange as TimeRange)) {
    return {
      valid: false,
      error: {
        error: `Invalid time range. Must be one of: ${validRanges.join(', ')}`,
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'timeRange', value: timeRange, allowed: validRanges },
        timestamp: Date.now(),
      },
    };
  }

  return { valid: true };
}

/**
 * Validate date parameter
 */
export function validateDate(dateStr?: string): ValidationResult {
  if (!dateStr) {
    return { valid: true }; // Optional parameter
  }

  // Try parsing as ISO date
  const date = new Date(dateStr);
  
  // Try parsing as Unix timestamp (if it's a number string)
  const timestamp = parseInt(dateStr, 10);
  if (!isNaN(timestamp) && dateStr === timestamp.toString()) {
    const timestampDate = new Date(timestamp * 1000);
    if (timestampDate.getTime() > 0) {
      // Valid Unix timestamp - check if future
      if (timestampDate.getTime() > Date.now()) {
        return {
          valid: false,
          error: {
            error: 'Date cannot be in the future',
            code: ErrorCode.INVALID_PARAMETER,
            details: { field: 'date', value: dateStr },
            timestamp: Date.now(),
          },
        };
      }
      return { valid: true };
    }
  }

  // Check if ISO date is valid
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: {
        error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD) or Unix timestamp',
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'date', value: dateStr },
        timestamp: Date.now(),
      },
    };
  }

  // Check if date is in the future
  if (date.getTime() > Date.now()) {
    return {
      valid: false,
      error: {
        error: 'Date cannot be in the future',
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'date', value: dateStr },
        timestamp: Date.now(),
      },
    };
  }

  return { valid: true };
}

/**
 * Validate periods parameter
 */
export function validatePeriods(periodsStr?: string): ValidationResult {
  if (!periodsStr) {
    return { valid: true }; // Optional parameter
  }

  const periods = parseInt(periodsStr, 10);

  if (isNaN(periods)) {
    return {
      valid: false,
      error: {
        error: 'Periods must be a valid integer',
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'periods', value: periodsStr },
        timestamp: Date.now(),
      },
    };
  }

  if (periods < 1 || periods > 24) {
    return {
      valid: false,
      error: {
        error: 'Periods must be between 1 and 24',
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'periods', value: periods, min: 1, max: 24 },
        timestamp: Date.now(),
      },
    };
  }

  return { valid: true };
}

/**
 * Validate protocol IDs list
 */
export function validateProtocolIds(protocolIdsStr: string): ValidationResult {
  if (!protocolIdsStr || typeof protocolIdsStr !== 'string') {
    return {
      valid: false,
      error: {
        error: 'Protocol IDs are required (comma-separated list)',
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'protocolIds', value: protocolIdsStr },
        timestamp: Date.now(),
      },
    };
  }

  const protocolIds = protocolIdsStr.split(',').map(id => id.trim()).filter(id => id);

  if (protocolIds.length === 0) {
    return {
      valid: false,
      error: {
        error: 'At least one protocol ID is required',
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'protocolIds', value: protocolIdsStr },
        timestamp: Date.now(),
      },
    };
  }

  if (protocolIds.length > 20) {
    return {
      valid: false,
      error: {
        error: 'Maximum 20 protocol IDs allowed per request',
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'protocolIds', count: protocolIds.length, max: 20 },
        timestamp: Date.now(),
      },
    };
  }

  // Validate each protocol ID
  for (const protocolId of protocolIds) {
    const result = validateProtocolId(protocolId);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Validate category parameter
 */
export function validateCategory(category?: string): ValidationResult {
  const validCategories: ProtocolCategory[] = [
    'dex',
    'lending',
    'yield',
    'derivatives',
    'bridge',
    'liquid-staking',
    'all',
  ];

  if (!category) {
    return { valid: true }; // Optional parameter
  }

  if (!validCategories.includes(category as ProtocolCategory)) {
    return {
      valid: false,
      error: {
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'category', value: category, allowed: validCategories },
        timestamp: Date.now(),
      },
    };
  }

  return { valid: true };
}

/**
 * Validate metric parameter
 */
export function validateMetric(metric?: string): ValidationResult {
  const validMetrics: BenchmarkMetric[] = ['tvl', 'volume24h', 'users', 'revenue', 'apy'];

  if (!metric) {
    return { valid: true }; // Optional parameter
  }

  if (!validMetrics.includes(metric as BenchmarkMetric)) {
    return {
      valid: false,
      error: {
        error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
        code: ErrorCode.INVALID_PARAMETER,
        details: { field: 'metric', value: metric, allowed: validMetrics },
        timestamp: Date.now(),
      },
    };
  }

  return { valid: true };
}

/**
 * Validate boolean parameter
 */
export function validateBoolean(value?: string): ValidationResult {
  if (!value) {
    return { valid: true }; // Optional parameter
  }

  if (value !== 'true' && value !== 'false') {
    return {
      valid: false,
      error: {
        error: 'Boolean parameter must be "true" or "false"',
        code: ErrorCode.INVALID_PARAMETER,
        details: { value },
        timestamp: Date.now(),
      },
    };
  }

  return { valid: true };
}

