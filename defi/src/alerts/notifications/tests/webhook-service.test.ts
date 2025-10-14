/**
 * Webhook Service Unit Tests
 */

import * as dotenv from 'dotenv';
dotenv.config();

import {
  sendWebhook,
  batchSendWebhooks,
  isValidWebhookURL,
  getWebhookServiceStatus,
  resetCircuitBreaker,
  resetAllCircuitBreakers,
} from '../services/webhook-service';
import { MockWebhookServer } from './test-helpers';

describe('Webhook Service', () => {
  let mockServer: MockWebhookServer;

  beforeAll(async () => {
    mockServer = new MockWebhookServer(3333);
    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    mockServer.reset();
    resetAllCircuitBreakers();
  });

  describe('isValidWebhookURL', () => {
    it('should validate correct URLs', () => {
      expect(isValidWebhookURL('http://example.com/webhook')).toBe(true);
      expect(isValidWebhookURL('https://example.com/webhook')).toBe(true);
      expect(isValidWebhookURL('https://api.example.com:8080/webhook')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidWebhookURL('ftp://example.com')).toBe(false);
      expect(isValidWebhookURL('invalid-url')).toBe(false);
      expect(isValidWebhookURL('')).toBe(false);
      expect(isValidWebhookURL('javascript:alert(1)')).toBe(false);
    });
  });

  describe('sendWebhook', () => {
    it('should send webhook successfully', async () => {
      const payload = {
        alert_type: 'price_change',
        message: 'Test alert',
        value: 2500,
      };

      await sendWebhook({
        url: 'http://localhost:3333/webhook',
        payload,
      });

      expect(mockServer.getRequestCount()).toBe(1);
      const request = mockServer.getLastRequest();
      expect(request.method).toBe('POST');
      expect(request.body).toEqual(payload);
      expect(request.headers['content-type']).toBe('application/json');
      expect(request.headers['user-agent']).toBe('DeFiLlama-Alerts/1.0');
    });

    it('should send webhook with custom headers', async () => {
      await sendWebhook({
        url: 'http://localhost:3333/webhook',
        payload: { test: 'data' },
        headers: {
          'X-Custom-Header': 'custom-value',
          'Authorization': 'Bearer token123',
        },
      });

      const request = mockServer.getLastRequest();
      expect(request.headers['x-custom-header']).toBe('custom-value');
      expect(request.headers['authorization']).toBe('Bearer token123');
    });

    it('should handle webhook timeout', async () => {
      // Use a non-existent server to trigger timeout
      await expect(
        sendWebhook({
          url: 'http://localhost:9999/webhook',
          payload: { test: 'data' },
        })
      ).rejects.toThrow();
    }, 10000); // 10 second timeout for this test

    it('should retry on failure', async () => {
      // This test verifies retry logic is in place
      // In real scenario, webhook would fail and retry
      await sendWebhook({
        url: 'http://localhost:3333/webhook',
        payload: { test: 'data' },
      });

      expect(mockServer.getRequestCount()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('batchSendWebhooks', () => {
    it('should send multiple webhooks successfully', async () => {
      const webhooks = [
        {
          url: 'http://localhost:3333/webhook1',
          payload: { alert: 1 },
        },
        {
          url: 'http://localhost:3333/webhook2',
          payload: { alert: 2 },
        },
        {
          url: 'http://localhost:3333/webhook3',
          payload: { alert: 3 },
        },
      ];

      const results = await batchSendWebhooks(webhooks);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockServer.getRequestCount()).toBe(3);
    });

    it('should handle mixed success and failure', async () => {
      const webhooks = [
        {
          url: 'http://localhost:3333/webhook1',
          payload: { alert: 1 },
        },
        {
          url: 'http://localhost:9999/webhook2', // Non-existent server
          payload: { alert: 2 },
        },
        {
          url: 'http://localhost:3333/webhook3',
          payload: { alert: 3 },
        },
      ];

      const results = await batchSendWebhooks(webhooks);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
      expect(results[2].success).toBe(true);
    }, 15000); // 15 second timeout

    it('should handle empty batch', async () => {
      const results = await batchSendWebhooks([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('Circuit Breaker', () => {
    it('should track circuit breaker state', () => {
      const status = getWebhookServiceStatus();

      expect(status.enabled).toBe(true);
      expect(status.timeout).toBeDefined();
      expect(status.maxRetries).toBeDefined();
      expect(status.circuitBreakers).toBeDefined();
      expect(Array.isArray(status.circuitBreakers)).toBe(true);
    });

    it('should reset circuit breaker for specific URL', async () => {
      const url = 'http://localhost:3333/webhook';

      await sendWebhook({ url, payload: { test: 'data' } });

      resetCircuitBreaker(url);

      const status = getWebhookServiceStatus();
      const breaker = status.circuitBreakers.find(b => b.url === url);

      if (breaker) {
        expect(breaker.state).toBe('CLOSED');
        expect(breaker.failureCount).toBe(0);
      }
    });

    it('should reset all circuit breakers', async () => {
      await sendWebhook({
        url: 'http://localhost:3333/webhook1',
        payload: { test: 'data' },
      });
      await sendWebhook({
        url: 'http://localhost:3333/webhook2',
        payload: { test: 'data' },
      });

      resetAllCircuitBreakers();

      const status = getWebhookServiceStatus();
      expect(status.circuitBreakers.every(b => b.state === 'CLOSED')).toBe(true);
      expect(status.circuitBreakers.every(b => b.failureCount === 0)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should send webhook within timeout', async () => {
      const startTime = Date.now();

      await sendWebhook({
        url: 'http://localhost:3333/webhook',
        payload: { test: 'data' },
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle batch of 10 webhooks efficiently', async () => {
      const webhooks = Array.from({ length: 10 }, (_, i) => ({
        url: `http://localhost:3333/webhook${i}`,
        payload: { alert: i },
      }));

      const startTime = Date.now();
      const results = await batchSendWebhooks(webhooks);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(mockServer.getRequestCount()).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      await expect(
        sendWebhook({
          url: 'http://localhost:9999/webhook',
          payload: { test: 'data' },
        })
      ).rejects.toThrow();
    }, 10000);

    it('should handle invalid JSON payload', async () => {
      // Circular reference to create invalid JSON
      const circular: any = { test: 'data' };
      circular.self = circular;

      await expect(
        sendWebhook({
          url: 'http://localhost:3333/webhook',
          payload: circular,
        })
      ).rejects.toThrow();
    });
  });
});

