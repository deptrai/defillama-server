/**
 * Test Helpers for Notification Service Tests
 */

import { Context, SQSEvent, SQSRecord } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Mock Context
// ============================================================================

export function createMockContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-notification-handler',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
    memoryLimitInMB: '512',
    awsRequestId: `test-request-${Date.now()}`,
    logGroupName: '/aws/lambda/test',
    logStreamName: `2024/01/01/[$LATEST]test-${Date.now()}`,
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

// ============================================================================
// Mock SQS Event
// ============================================================================

export interface NotificationMessage {
  alert_history_id: string;
  rule_id: string;
  user_id: string;
  rule_name: string;
  channels: string[];
  data: {
    metric: string;
    triggered_value: number;
    threshold_value: number;
    protocol_name?: string;
    token_symbol?: string;
    chain?: string;
    message: string;
  };
  timestamp: number;
}

export function createMockNotificationMessage(
  overrides?: Partial<NotificationMessage>
): NotificationMessage {
  return {
    alert_history_id: uuidv4(),
    rule_id: uuidv4(),
    user_id: 'test-user-123',
    rule_name: 'Test Alert Rule',
    channels: ['email', 'webhook', 'push'],
    data: {
      metric: 'price_change',
      triggered_value: 2500,
      threshold_value: 2000,
      protocol_name: 'Uniswap V3',
      token_symbol: 'ETH',
      chain: 'ethereum',
      message: 'ETH price reached $2,500 (threshold: $2,000)',
    },
    timestamp: Date.now(),
    ...overrides,
  };
}

export function createMockSQSRecord(message: NotificationMessage): SQSRecord {
  return {
    messageId: uuidv4(),
    receiptHandle: `receipt-${Date.now()}`,
    body: JSON.stringify(message),
    attributes: {
      ApproximateReceiveCount: '1',
      SentTimestamp: Date.now().toString(),
      SenderId: 'test-sender',
      ApproximateFirstReceiveTimestamp: Date.now().toString(),
    },
    messageAttributes: {},
    md5OfBody: 'test-md5',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
    awsRegion: 'us-east-1',
  };
}

export function createMockSQSEvent(messages: NotificationMessage[]): SQSEvent {
  return {
    Records: messages.map(createMockSQSRecord),
  };
}

// ============================================================================
// Test Data Generators
// ============================================================================

export function generateTestUser(userId?: string) {
  return {
    id: userId || `test-user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    created_at: new Date(),
  };
}

export function generateTestDevice(userId: string, platform: 'ios' | 'android') {
  return {
    id: uuidv4(),
    user_id: userId,
    device_token: `device-token-${Date.now()}`,
    platform,
    device_name: `Test ${platform} Device`,
    app_version: '1.0.0',
    os_version: platform === 'ios' ? '17.0' : '14.0',
    enabled: true,
    created_at: new Date(),
  };
}

export function generateTestAlertRule(userId: string) {
  return {
    id: uuidv4(),
    user_id: userId,
    name: `Test Rule ${Date.now()}`,
    description: 'Test alert rule',
    alert_type: 'price_change',
    conditions: {
      metric: 'price',
      operator: 'gt',
      threshold: 2000,
    },
    channels: ['email', 'webhook', 'push'],
    webhook_url: 'https://example.com/webhook',
    enabled: true,
    throttle_minutes: 5,
    created_at: new Date(),
  };
}

export function generateTestAlertHistory(ruleId: string, userId: string) {
  return {
    id: uuidv4(),
    rule_id: ruleId,
    user_id: userId,
    triggered_at: new Date(),
    triggered_value: 2500,
    threshold_value: 2000,
    message: 'ETH price reached $2,500 (threshold: $2,000)',
    delivery_status: {},
    error_details: {},
  };
}

// ============================================================================
// Database Cleanup Utilities
// ============================================================================

export async function cleanupTestData(sql: any, userId: string) {
  // Clean up in reverse order of dependencies
  await sql.unsafe(`DELETE FROM notification_logs WHERE alert_history_id IN (
    SELECT id FROM alert_history WHERE user_id = $1
  )`, [userId]);
  
  await sql.unsafe(`DELETE FROM alert_history WHERE user_id = $1`, [userId]);
  await sql.unsafe(`DELETE FROM alert_rules WHERE user_id = $1`, [userId]);
  await sql.unsafe(`DELETE FROM user_devices WHERE user_id = $1`, [userId]);
  await sql.unsafe(`DELETE FROM users WHERE id = $1`, [userId]);
}

// ============================================================================
// Mock HTTP Server (for webhook testing)
// ============================================================================

import * as http from 'http';

export class MockWebhookServer {
  private server: http.Server | null = null;
  private port: number;
  public requests: Array<{
    method: string;
    url: string;
    headers: http.IncomingHttpHeaders;
    body: any;
  }> = [];

  constructor(port: number = 3333) {
    this.port = port;
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          this.requests.push({
            method: req.method || 'GET',
            url: req.url || '/',
            headers: req.headers,
            body: body ? JSON.parse(body) : null,
          });

          // Respond with 200 OK
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        });
      });

      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  reset() {
    this.requests = [];
  }

  getLastRequest() {
    return this.requests[this.requests.length - 1];
  }

  getRequestCount() {
    return this.requests.length;
  }
}

// ============================================================================
// Async Utilities
// ============================================================================

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

// ============================================================================
// Environment Variable Helpers
// ============================================================================

export function setTestEnv(overrides: Record<string, string>) {
  const original: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(overrides)) {
    original[key] = process.env[key];
    process.env[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

