/**
 * Monitoring & Observability Utilities
 * 
 * Provides CloudWatch metrics, performance tracking, and structured logging
 * for monitoring application health and performance.
 */

import { CloudWatch } from 'aws-sdk';
import { logger } from './logger';

/**
 * CloudWatch client (lazy initialization)
 */
let cloudwatch: CloudWatch | null = null;

/**
 * Get CloudWatch client
 */
function getCloudWatch(): CloudWatch {
  if (!cloudwatch) {
    cloudwatch = new CloudWatch({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return cloudwatch;
}

/**
 * Metric options
 */
export interface MetricOptions {
  namespace?: string;
  dimensions?: Record<string, string>;
  unit?: 'Count' | 'Milliseconds' | 'Seconds' | 'Bytes' | 'Percent';
  timestamp?: Date;
}

/**
 * Publish a metric to CloudWatch
 * 
 * @param metricName - Metric name
 * @param value - Metric value
 * @param options - Metric options
 * 
 * @example
 * await publishMetric('GasPriceUpdate', 1, {
 *   dimensions: { chain: 'ethereum' },
 *   unit: 'Count',
 * });
 */
export async function publishMetric(
  metricName: string,
  value: number,
  options: MetricOptions = {}
): Promise<void> {
  const {
    namespace = 'DeFiLlama/Premium/GasAlerts',
    dimensions = {},
    unit = 'Count',
    timestamp = new Date(),
  } = options;

  try {
    const cw = getCloudWatch();

    await cw.putMetricData({
      Namespace: namespace,
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: timestamp,
        Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({
          Name,
          Value,
        })),
      }],
    }).promise();

    logger.debug('Published metric', {
      metricName,
      value,
      namespace,
      dimensions,
      unit,
    });
  } catch (error) {
    logger.error('Failed to publish metric', {
      metricName,
      value,
      error: (error as Error).message,
    });
  }
}

/**
 * Publish multiple metrics to CloudWatch
 * 
 * @param metrics - Array of metrics
 * @param options - Metric options
 * 
 * @example
 * await publishMetrics([
 *   { name: 'GasPriceUpdate', value: 1 },
 *   { name: 'CacheHit', value: 1 },
 * ], { dimensions: { chain: 'ethereum' } });
 */
export async function publishMetrics(
  metrics: Array<{ name: string; value: number; unit?: MetricOptions['unit'] }>,
  options: MetricOptions = {}
): Promise<void> {
  const {
    namespace = 'DeFiLlama/Premium/GasAlerts',
    dimensions = {},
    timestamp = new Date(),
  } = options;

  try {
    const cw = getCloudWatch();

    await cw.putMetricData({
      Namespace: namespace,
      MetricData: metrics.map(metric => ({
        MetricName: metric.name,
        Value: metric.value,
        Unit: metric.unit || 'Count',
        Timestamp: timestamp,
        Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({
          Name,
          Value,
        })),
      })),
    }).promise();

    logger.debug('Published metrics', {
      count: metrics.length,
      namespace,
      dimensions,
    });
  } catch (error) {
    logger.error('Failed to publish metrics', {
      count: metrics.length,
      error: (error as Error).message,
    });
  }
}

/**
 * Track performance of an operation
 * 
 * @param operation - Operation name
 * @param fn - Function to track
 * @param options - Metric options
 * @returns Promise with function result
 * 
 * @example
 * const data = await trackPerformance('FetchGasPrice', async () => {
 *   return await fetchFromAPI();
 * }, { dimensions: { chain: 'ethereum' } });
 */
export async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  options: MetricOptions = {}
): Promise<T> {
  const startTime = Date.now();
  let success = false;

  try {
    const result = await fn();
    success = true;
    return result;
  } finally {
    const duration = Date.now() - startTime;

    // Publish duration metric
    await publishMetric(`${operation}Duration`, duration, {
      ...options,
      unit: 'Milliseconds',
    });

    // Publish success/error metric
    await publishMetric(`${operation}${success ? 'Success' : 'Error'}`, 1, options);

    logger.info(`${operation} completed`, {
      duration,
      success,
      ...options.dimensions,
    });
  }
}

/**
 * Counter for tracking counts
 */
export class Counter {
  private count = 0;

  constructor(
    private metricName: string,
    private options: MetricOptions = {}
  ) {}

  /**
   * Increment counter
   */
  async increment(value: number = 1): Promise<void> {
    this.count += value;
    await publishMetric(this.metricName, value, this.options);
  }

  /**
   * Get current count
   */
  getCount(): number {
    return this.count;
  }

  /**
   * Reset counter
   */
  reset(): void {
    this.count = 0;
  }
}

/**
 * Gauge for tracking values
 */
export class Gauge {
  private value = 0;

  constructor(
    private metricName: string,
    private options: MetricOptions = {}
  ) {}

  /**
   * Set gauge value
   */
  async set(value: number): Promise<void> {
    this.value = value;
    await publishMetric(this.metricName, value, this.options);
  }

  /**
   * Get current value
   */
  getValue(): number {
    return this.value;
  }
}

/**
 * Histogram for tracking distributions
 */
export class Histogram {
  private values: number[] = [];

  constructor(
    private metricName: string,
    private options: MetricOptions = {}
  ) {}

  /**
   * Record a value
   */
  async record(value: number): Promise<void> {
    this.values.push(value);
    await publishMetric(this.metricName, value, this.options);
  }

  /**
   * Get statistics
   */
  getStats(): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    if (this.values.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...this.values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sum / count,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  /**
   * Reset histogram
   */
  reset(): void {
    this.values = [];
  }
}

/**
 * Rate limiter for tracking request rates
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000
  ) {}

  /**
   * Check if request is allowed
   * 
   * @param key - Rate limit key (e.g., user ID)
   * @returns True if request is allowed
   * @throws Error if rate limit exceeded
   */
  checkLimit(key: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];

    // Remove old requests
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);

    if (recentRequests.length >= this.maxRequests) {
      throw new Error(`Rate limit exceeded: ${this.maxRequests} requests per ${this.windowMs}ms`);
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  /**
   * Get remaining requests
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  /**
   * Reset rate limiter for a key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.requests.clear();
  }
}

