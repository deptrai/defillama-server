/**
 * Error Handling Utilities
 * 
 * Provides retry logic, circuit breaker, timeout handling, and error logging
 * for resilient external API calls and database operations.
 */

import { logger } from './logger';

/**
 * Retry options
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Promise with function result
 * 
 * @example
 * const data = await retryWithBackoff(
 *   () => fetchFromAPI(),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate delay
      const delay = exponentialBackoff
        ? Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
        : baseDelay;

      // Call onRetry callback
      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }

      // Log retry attempt
      logger.warn('Retrying operation', {
        attempt: attempt + 1,
        maxRetries,
        delay,
        error: lastError.message,
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Circuit breaker state
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  onStateChange?: (state: CircuitState) => void;
}

/**
 * Circuit Breaker Pattern
 * 
 * Prevents cascading failures by stopping requests to failing services
 * 
 * @example
 * const breaker = new CircuitBreaker({ failureThreshold: 5, timeout: 60000 });
 * const data = await breaker.execute(() => fetchFromAPI());
 */
export class CircuitBreaker {
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'CLOSED';

  constructor(private options: CircuitBreakerOptions = {}) {
    const {
      failureThreshold = 5,
      successThreshold = 2,
      timeout = 60000,
    } = options;

    this.options = {
      failureThreshold,
      successThreshold,
      timeout,
      ...options,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * 
   * @param fn - Function to execute
   * @returns Promise with function result
   * @throws Error if circuit is OPEN
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.options.timeout!) {
        this.setState('HALF_OPEN');
      } else {
        throw new Error(`Circuit breaker is OPEN. Retry after ${this.options.timeout! - timeSinceLastFailure}ms`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess() {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.options.successThreshold!) {
        this.setState('CLOSED');
        this.successes = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successes = 0;

    if (this.failures >= this.options.failureThreshold!) {
      this.setState('OPEN');
    }
  }

  /**
   * Set circuit breaker state
   */
  private setState(newState: CircuitState) {
    if (this.state !== newState) {
      logger.info('Circuit breaker state changed', {
        oldState: this.state,
        newState,
        failures: this.failures,
      });

      this.state = newState;

      if (this.options.onStateChange) {
        this.options.onStateChange(newState);
      }
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
    this.setState('CLOSED');
  }
}

/**
 * Execute a function with timeout
 * 
 * @param promise - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Error message if timeout occurs
 * @returns Promise with function result
 * @throws Error if timeout occurs
 * 
 * @example
 * const data = await withTimeout(
 *   fetchFromAPI(),
 *   5000,
 *   'API request timed out'
 * );
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Error categories for logging and monitoring
 */
export enum ErrorCategory {
  API_ERROR = 'API_ERROR',
  DB_ERROR = 'DB_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Log error with context
 * 
 * @param message - Error message
 * @param error - Error object
 * @param category - Error category
 * @param context - Additional context
 * 
 * @example
 * logError('Failed to fetch gas price', error, ErrorCategory.API_ERROR, {
 *   chain: 'ethereum',
 *   userId: 'user-123',
 * });
 */
export function logError(
  message: string,
  error: Error,
  category: ErrorCategory = ErrorCategory.UNKNOWN_ERROR,
  context: Record<string, any> = {}
): void {
  logger.error(message, {
    error: error.message,
    stack: error.stack,
    category,
    ...context,
  });
}

/**
 * Categorize error based on error message or type
 * 
 * @param error - Error object
 * @returns Error category
 */
export function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();

  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorCategory.TIMEOUT_ERROR;
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return ErrorCategory.RATE_LIMIT_ERROR;
  }

  if (message.includes('network') || message.includes('econnrefused') || message.includes('enotfound')) {
    return ErrorCategory.NETWORK_ERROR;
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorCategory.VALIDATION_ERROR;
  }

  if (message.includes('database') || message.includes('query') || message.includes('sql')) {
    return ErrorCategory.DB_ERROR;
  }

  if (message.includes('api') || message.includes('fetch') || message.includes('request')) {
    return ErrorCategory.API_ERROR;
  }

  return ErrorCategory.UNKNOWN_ERROR;
}

