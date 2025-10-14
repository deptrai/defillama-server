/**
 * CloudWatch Custom Metrics Utility
 * 
 * This utility provides a simple interface for publishing custom metrics to CloudWatch.
 * It supports business metrics, performance metrics, and error metrics.
 * 
 * Usage:
 * ```typescript
 * import { metrics } from './utils/shared/metrics';
 * 
 * // Business metrics
 * metrics.incrementSubscriptions('ethereum', 1);
 * metrics.incrementEvents('price_update', 1);
 * metrics.incrementAlerts('price_threshold', 1);
 * 
 * // Performance metrics
 * metrics.recordQueryLatency(150);
 * metrics.recordCacheHitRate(0.85);
 * 
 * // Error metrics
 * metrics.incrementErrors('validation', 1);
 * ```
 */

import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION || 'eu-central-1' });

const NAMESPACE = 'DeFiLlama';
const STAGE = process.env.stage || 'dev';

/**
 * Publish a custom metric to CloudWatch
 */
async function publishMetric(
  metricName: string,
  value: number,
  unit: 'Count' | 'Milliseconds' | 'Percent' | 'None' = 'Count',
  dimensions: Record<string, string> = {}
): Promise<void> {
  try {
    const params = {
      Namespace: NAMESPACE,
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Environment', Value: STAGE },
            ...Object.entries(dimensions).map(([name, value]) => ({
              Name: name,
              Value: value,
            })),
          ],
        },
      ],
    };

    await cloudwatch.putMetricData(params);
  } catch (error) {
    console.error('Failed to publish metric:', error);
    // Don't throw error to avoid breaking the main flow
  }
}

/**
 * Business Metrics
 */

/**
 * Increment active subscriptions count
 */
export async function incrementSubscriptions(protocol: string, count: number = 1): Promise<void> {
  await publishMetric('Subscriptions.Active', count, 'Count', { Protocol: protocol });
}

/**
 * Decrement active subscriptions count
 */
export async function decrementSubscriptions(protocol: string, count: number = 1): Promise<void> {
  await publishMetric('Subscriptions.Active', -count, 'Count', { Protocol: protocol });
}

/**
 * Increment events published count
 */
export async function incrementEvents(eventType: string, count: number = 1): Promise<void> {
  await publishMetric('Events.Published', count, 'Count', { EventType: eventType });
}

/**
 * Increment alerts triggered count
 */
export async function incrementAlerts(alertType: string, count: number = 1): Promise<void> {
  await publishMetric('Alerts.Triggered', count, 'Count', { AlertType: alertType });
}

/**
 * Increment queries executed count
 */
export async function incrementQueries(queryType: string, count: number = 1): Promise<void> {
  await publishMetric('Queries.Executed', count, 'Count', { QueryType: queryType });
}

/**
 * Performance Metrics
 */

/**
 * Record query latency in milliseconds
 */
export async function recordQueryLatency(latencyMs: number, queryType: string = 'default'): Promise<void> {
  await publishMetric('Query.Latency', latencyMs, 'Milliseconds', { QueryType: queryType });
}

/**
 * Record cache hit rate as a percentage (0-100)
 */
export async function recordCacheHitRate(hitRate: number, cacheType: string = 'default'): Promise<void> {
  await publishMetric('Cache.HitRate', hitRate * 100, 'Percent', { CacheType: cacheType });
}

/**
 * Record WebSocket message latency in milliseconds
 */
export async function recordWebSocketLatency(latencyMs: number, messageType: string = 'default'): Promise<void> {
  await publishMetric('WebSocket.MessageLatency', latencyMs, 'Milliseconds', { MessageType: messageType });
}

/**
 * Record database query latency in milliseconds
 */
export async function recordDatabaseLatency(latencyMs: number, operation: string = 'default'): Promise<void> {
  await publishMetric('Database.Latency', latencyMs, 'Milliseconds', { Operation: operation });
}

/**
 * Error Metrics
 */

/**
 * Increment validation errors count
 */
export async function incrementValidationErrors(errorType: string, count: number = 1): Promise<void> {
  await publishMetric('Errors.Validation', count, 'Count', { ErrorType: errorType });
}

/**
 * Increment processing errors count
 */
export async function incrementProcessingErrors(errorType: string, count: number = 1): Promise<void> {
  await publishMetric('Errors.Processing', count, 'Count', { ErrorType: errorType });
}

/**
 * Increment database errors count
 */
export async function incrementDatabaseErrors(errorType: string, count: number = 1): Promise<void> {
  await publishMetric('Errors.Database', count, 'Count', { ErrorType: errorType });
}

/**
 * Increment external API errors count
 */
export async function incrementExternalAPIErrors(service: string, count: number = 1): Promise<void> {
  await publishMetric('Errors.ExternalAPI', count, 'Count', { Service: service });
}

/**
 * Helper function to measure execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
  metricName: string,
  dimensions: Record<string, string> = {}
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    await publishMetric(metricName, duration, 'Milliseconds', dimensions);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    await publishMetric(metricName, duration, 'Milliseconds', { ...dimensions, Error: 'true' });
    throw error;
  }
}

/**
 * Batch publish multiple metrics
 */
export async function publishMetricsBatch(
  metrics: Array<{
    name: string;
    value: number;
    unit?: 'Count' | 'Milliseconds' | 'Percent' | 'None';
    dimensions?: Record<string, string>;
  }>
): Promise<void> {
  try {
    const params = {
      Namespace: NAMESPACE,
      MetricData: metrics.map((metric) => ({
        MetricName: metric.name,
        Value: metric.value,
        Unit: metric.unit || 'Count',
        Timestamp: new Date(),
        Dimensions: [
          { Name: 'Environment', Value: STAGE },
          ...Object.entries(metric.dimensions || {}).map(([name, value]) => ({
            Name: name,
            Value: value,
          })),
        ],
      })),
    };

    await cloudwatch.putMetricData(params);
  } catch (error) {
    console.error('Failed to publish metrics batch:', error);
    // Don't throw error to avoid breaking the main flow
  }
}

/**
 * Export all metrics functions
 */
export const metrics = {
  // Business metrics
  incrementSubscriptions,
  decrementSubscriptions,
  incrementEvents,
  incrementAlerts,
  incrementQueries,

  // Performance metrics
  recordQueryLatency,
  recordCacheHitRate,
  recordWebSocketLatency,
  recordDatabaseLatency,

  // Error metrics
  incrementValidationErrors,
  incrementProcessingErrors,
  incrementDatabaseErrors,
  incrementExternalAPIErrors,

  // Helpers
  measureExecutionTime,
  publishMetricsBatch,
};

export default metrics;

