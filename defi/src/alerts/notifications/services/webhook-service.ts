/**
 * Webhook Service
 * Sends webhook notifications via HTTP POST
 * Story 1.3: Alert Engine and Notification System - Phase 6.3
 */

import axios, { AxiosError } from 'axios';
import { retryWithCondition } from '../utils/retry';
import { CircuitBreakerManager } from '../utils/circuit-breaker';

// ============================================================================
// Configuration
// ============================================================================

const WEBHOOK_TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '5000');
const WEBHOOK_MAX_RETRIES = parseInt(process.env.WEBHOOK_MAX_RETRIES || '3');

// ============================================================================
// Circuit Breaker Manager
// ============================================================================

const circuitBreakerManager = new CircuitBreakerManager({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  onStateChange: (state) => {
    console.log(`Circuit breaker state changed to: ${state}`);
  },
});

// ============================================================================
// Webhook Notification
// ============================================================================

export interface WebhookNotification {
  url: string;
  payload: any;
  headers?: Record<string, string>;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: AxiosError): boolean {
  // Retry on network errors
  if (!error.response) {
    return true;
  }

  // Retry on 5xx errors
  if (error.response.status >= 500) {
    return true;
  }

  // Retry on 429 (rate limit)
  if (error.response.status === 429) {
    return true;
  }

  // Don't retry on 4xx errors (except 429)
  return false;
}

/**
 * Send webhook via HTTP POST
 */
async function sendWebhookHTTP(notification: WebhookNotification): Promise<void> {
  const response = await axios.post(notification.url, notification.payload, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'DeFiLlama-Alerts/1.0',
      ...notification.headers,
    },
    timeout: WEBHOOK_TIMEOUT_MS,
  });

  // Check response status
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Webhook returned status ${response.status}`);
  }
}

/**
 * Send webhook notification
 */
export async function sendWebhook(notification: WebhookNotification): Promise<void> {
  // Use circuit breaker
  await circuitBreakerManager.execute(
    notification.url,
    async () => {
      // Retry with condition
      await retryWithCondition(
        () => sendWebhookHTTP(notification),
        (error) => {
          if (error instanceof AxiosError) {
            return isRetryableError(error);
          }
          return true; // Retry on other errors
        },
        {
          maxRetries: WEBHOOK_MAX_RETRIES,
          baseDelay: 1000,
          onRetry: (error, attempt) => {
            console.warn(`Webhook delivery failed (attempt ${attempt}):`, {
              url: notification.url,
              error: error.message,
            });
          },
        }
      );
    }
  );
}

/**
 * Batch send webhooks
 */
export async function batchSendWebhooks(
  notifications: WebhookNotification[]
): Promise<Array<{ success: boolean; url: string; error?: Error }>> {
  const results = await Promise.all(
    notifications.map(async (notification) => {
      try {
        await sendWebhook(notification);
        return { success: true, url: notification.url };
      } catch (error) {
        return { success: false, url: notification.url, error: error as Error };
      }
    })
  );

  return results;
}

/**
 * Validate webhook URL
 */
export function isValidWebhookURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get webhook service status
 */
export function getWebhookServiceStatus(): {
  enabled: boolean;
  timeout: number;
  maxRetries: number;
  circuitBreakers: Array<{
    url: string;
    state: string;
    failureCount: number;
  }>;
} {
  const breakers = circuitBreakerManager.getStats();

  return {
    enabled: true,
    timeout: WEBHOOK_TIMEOUT_MS,
    maxRetries: WEBHOOK_MAX_RETRIES,
    circuitBreakers: breakers.map(b => ({
      url: b.key,
      state: b.state,
      failureCount: b.failureCount,
    })),
  };
}

/**
 * Reset circuit breaker for URL
 */
export function resetCircuitBreaker(url: string): void {
  const breaker = circuitBreakerManager.getBreaker(url);
  breaker.reset();
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakerManager.resetAll();
}

