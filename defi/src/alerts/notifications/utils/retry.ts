/**
 * Retry Utility
 * Implements retry logic with exponential backoff
 * Story 1.3: Alert Engine and Notification System - Phase 6.3
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  factor?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  factor: 2, // Exponential factor
  onRetry: () => {},
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  factor: number
): number {
  const delay = baseDelay * Math.pow(factor, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt === opts.maxRetries - 1) {
        throw lastError;
      }

      // Call onRetry callback
      opts.onRetry(lastError, attempt + 1);

      // Calculate delay and sleep
      const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay, opts.factor);
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Retry function with custom retry condition
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if should retry
      if (!shouldRetry(lastError) || attempt === opts.maxRetries - 1) {
        throw lastError;
      }

      // Call onRetry callback
      opts.onRetry(lastError, attempt + 1);

      // Calculate delay and sleep
      const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay, opts.factor);
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Batch retry for multiple operations
 */
export async function batchRetry<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
  return Promise.all(
    operations.map(async (op) => {
      try {
        const result = await retryWithBackoff(op, options);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error as Error };
      }
    })
  );
}

