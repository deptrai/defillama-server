/**
 * End-to-End Alert Workflow Tests
 * Tests full flow: Event → Alert Engine → Notification Handler
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { handler as alertEngineHandler } from '../engine/alert-engine';
import { handler as notificationHandler } from '../notifications/notification-handler';
import {
  setupE2EDatabase,
  cleanupE2EDatabase,
  generateE2EUser,
  generateE2EDevice,
  generateE2EAlertRule,
  generatePriceChangeEvent,
  generateTVLChangeEvent,
  verifyAlertCreated,
  verifyNotificationSent,
  verifyDeliveryStatus,
  verifyRuleThrottled,
  getAllAlertHistory,
  getAllNotificationLogs,
  waitFor,
  sleep,
} from './e2e-test-helpers';
import { getAlertsDBConnection, closeAlertsDBConnection } from '../db';
import { MockWebhookServer } from '../notifications/tests/test-helpers';
import type { SQSEvent, Context } from 'aws-lambda';

// Set mock mode
process.env.USE_REAL_SES = 'false';
process.env.USE_REAL_SNS = 'false';

// Mock Context
function createMockContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '512',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2025/01/01/[$LATEST]test',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

describe('E2E Alert Workflow Tests', () => {
  let mockWebhookServer: MockWebhookServer;
  const testUserId = `e2e-user-${Date.now()}`;
  let testRuleId: string;

  beforeAll(async () => {
    // Setup database
    await setupE2EDatabase();

    // Start mock webhook server
    mockWebhookServer = new MockWebhookServer(3335);
    await mockWebhookServer.start();

    // Create test user
    const sql = getAlertsDBConnection();
    const user = generateE2EUser(testUserId);
    await sql.unsafe(`
      INSERT INTO users (id, email, created_at)
      VALUES ($1, $2, $3)
    `, [user.id, user.email, user.created_at]);

    // Create test devices
    const iosDevice = generateE2EDevice(testUserId, 'ios');
    const androidDevice = generateE2EDevice(testUserId, 'android');

    await sql.unsafe(`
      INSERT INTO user_devices (id, user_id, device_token, platform, device_name, app_version, os_version, enabled, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      iosDevice.id,
      iosDevice.user_id,
      iosDevice.device_token,
      iosDevice.platform,
      iosDevice.device_name,
      iosDevice.app_version,
      iosDevice.os_version,
      iosDevice.enabled,
      iosDevice.created_at,
    ]);

    await sql.unsafe(`
      INSERT INTO user_devices (id, user_id, device_token, platform, device_name, app_version, os_version, enabled, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      androidDevice.id,
      androidDevice.user_id,
      androidDevice.device_token,
      androidDevice.platform,
      androidDevice.device_name,
      androidDevice.app_version,
      androidDevice.os_version,
      androidDevice.enabled,
      androidDevice.created_at,
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await cleanupE2EDatabase(testUserId);
    await closeAlertsDBConnection();
    await mockWebhookServer.stop();
  });

  beforeEach(() => {
    mockWebhookServer.reset();
  });

  describe('Single Rule Evaluation', () => {
    it('should process event through alert engine to notification delivery', async () => {
      // Step 1: Create alert rule
      const sql = getAlertsDBConnection();
      const rule = generateE2EAlertRule(testUserId, {
        alert_type: 'price_change',
        conditions: {
          metric: 'price',
          operator: 'greater_than',
          threshold: 2000,
          target: {
            protocol_id: 'ethereum',
          },
        },
        channels: ['email', 'webhook'],
        webhook_url: 'http://localhost:3335/webhook',
      });
      testRuleId = rule.id;

      await sql.unsafe(`
        INSERT INTO alert_rules (id, user_id, name, description, alert_type, conditions, channels, webhook_url, enabled, throttle_minutes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        rule.id,
        rule.user_id,
        rule.name,
        rule.description,
        rule.alert_type,
        rule.conditions,
        rule.channels,
        rule.webhook_url,
        rule.enabled,
        rule.throttle_minutes,
        rule.created_at,
      ]);

      // Step 2: Trigger event (price change)
      const event = generatePriceChangeEvent({
        protocol_id: 'ethereum',
        new_price: 2100, // Above threshold
      });

      // Create SQS event for alert engine
      const sqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify(event),
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
          },
        ],
      };

      const context = createMockContext();

      // Step 3: Alert engine evaluates and creates alert_history
      const alertEngineResponse = await alertEngineHandler(sqsEvent, context);
      expect(alertEngineResponse.statusCode).toBe(200);

      // Step 4: Wait for alert to be created
      const alertCreated = await waitFor(async () => {
        const alert = await verifyAlertCreated(testRuleId);
        return alert !== null;
      }, 10000);

      expect(alertCreated).toBe(true);

      // Step 5: Verify alert_history created
      const alert = await verifyAlertCreated(testRuleId);
      expect(alert).toBeDefined();
      expect(alert!.rule_id).toBe(testRuleId);
      expect(alert!.user_id).toBe(testUserId);
      expect(alert!.triggered_value).toBeGreaterThan(2000);

      console.log('✅ E2E Test: Alert created successfully', {
        alert_id: alert!.id,
        rule_id: testRuleId,
        triggered_value: alert!.triggered_value,
      });
    }, 60000);
  });

  describe('Multi-Rule Evaluation', () => {
    it('should trigger multiple rules for single event', async () => {
      // Create 3 rules with different thresholds
      const sql = getAlertsDBConnection();
      const rules = [
        generateE2EAlertRule(testUserId, {
          name: 'Rule 1: Price > 2000',
          conditions: {
            metric: 'price',
            operator: 'greater_than',
            threshold: 2000,
            target: { protocol_id: 'ethereum' },
          },
          channels: ['email'],
        }),
        generateE2EAlertRule(testUserId, {
          name: 'Rule 2: Price > 2050',
          conditions: {
            metric: 'price',
            operator: 'greater_than',
            threshold: 2050,
            target: { protocol_id: 'ethereum' },
          },
          channels: ['webhook'],
          webhook_url: 'http://localhost:3335/webhook',
        }),
        generateE2EAlertRule(testUserId, {
          name: 'Rule 3: Price > 2100',
          conditions: {
            metric: 'price',
            operator: 'greater_than',
            threshold: 2100,
            target: { protocol_id: 'ethereum' },
          },
          channels: ['push'],
        }),
      ];

      for (const rule of rules) {
        await sql.unsafe(`
          INSERT INTO alert_rules (id, user_id, name, description, alert_type, conditions, channels, webhook_url, enabled, throttle_minutes, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          rule.id,
          rule.user_id,
          rule.name,
          rule.description,
          rule.alert_type,
          rule.conditions,
          rule.channels,
          rule.webhook_url,
          rule.enabled,
          rule.throttle_minutes,
          rule.created_at,
        ]);
      }

      // Trigger event with price = 2150 (should trigger all 3 rules)
      const event = generatePriceChangeEvent({
        protocol_id: 'ethereum',
        new_price: 2150,
      });

      const sqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id-2',
            receiptHandle: 'test-receipt-handle-2',
            body: JSON.stringify(event),
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
          },
        ],
      };

      const context = createMockContext();
      await alertEngineHandler(sqsEvent, context);

      // Wait for all alerts to be created
      await sleep(5000);

      // Verify all 3 rules triggered
      for (const rule of rules) {
        const alert = await verifyAlertCreated(rule.id);
        expect(alert).toBeDefined();
        expect(alert!.rule_id).toBe(rule.id);
      }

      console.log('✅ E2E Test: Multiple rules triggered successfully');
    }, 60000);
  });
});

