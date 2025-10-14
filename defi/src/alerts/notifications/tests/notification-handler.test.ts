/**
 * Notification Handler Integration Tests
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { handler } from '../notification-handler';
import {
  createMockContext,
  createMockSQSEvent,
  createMockNotificationMessage,
  generateTestUser,
  generateTestDevice,
  generateTestAlertRule,
  generateTestAlertHistory,
  cleanupTestData,
  MockWebhookServer,
} from './test-helpers';
import { getAlertsDBConnection, closeAlertsDBConnection } from '../../db';

// Set mock mode
process.env.USE_REAL_SES = 'false';
process.env.USE_REAL_SNS = 'false';

describe('Notification Handler Integration Tests', () => {
  let mockWebhookServer: MockWebhookServer;
  const testUserId = `test-user-${Date.now()}`;
  let testRuleId: string;
  let testAlertHistoryId: string;

  beforeAll(async () => {
    // Start mock webhook server
    mockWebhookServer = new MockWebhookServer(3334);
    await mockWebhookServer.start();

    // Setup test data
    const sql = getAlertsDBConnection();

    // Create test user
    const user = generateTestUser(testUserId);
    await sql.unsafe(`
      INSERT INTO users (id, email, created_at)
      VALUES ($1, $2, $3)
    `, [user.id, user.email, user.created_at]);

    // Create test devices
    const iosDevice = generateTestDevice(testUserId, 'ios');
    const androidDevice = generateTestDevice(testUserId, 'android');

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

    // Create test alert rule
    const rule = generateTestAlertRule(testUserId);
    rule.webhook_url = 'http://localhost:3334/webhook';
    testRuleId = rule.id;

    await sql.unsafe(`
      INSERT INTO alert_rules (id, user_id, name, description, alert_type, protocol_id, token_id, chain_id, condition, channels, webhook_url, enabled, throttle_minutes, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      rule.id,
      rule.user_id,
      rule.name,
      rule.description,
      rule.alert_type,
      rule.protocol_id,
      rule.token_id,
      rule.chain_id,
      rule.condition,
      rule.channels,
      rule.webhook_url,
      rule.enabled,
      rule.throttle_minutes,
      rule.created_at,
    ]);

    // Create test alert history
    const history = generateTestAlertHistory(testRuleId, testUserId);
    testAlertHistoryId = history.id;

    await sql.unsafe(`
      INSERT INTO alert_history (id, alert_rule_id, user_id, triggered_value, threshold_value, message, notification_channels, delivery_status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      history.id,
      history.alert_rule_id,
      history.user_id,
      history.triggered_value,
      history.threshold_value,
      history.message,
      history.notification_channels,
      history.delivery_status,
      history.created_at,
    ]);
  });

  afterAll(async () => {
    // Cleanup test data
    const sql = getAlertsDBConnection();
    await cleanupTestData(sql, testUserId);
    await closeAlertsDBConnection();

    // Stop mock webhook server
    await mockWebhookServer.stop();
  });

  beforeEach(() => {
    mockWebhookServer.reset();
  });

  describe('handler', () => {
    it('should process notification message successfully', async () => {
      const message = createMockNotificationMessage({
        alert_history_id: testAlertHistoryId,
        rule_id: testRuleId,
        user_id: testUserId,
        channels: ['email', 'webhook', 'push'],
      });

      const sqsEvent = createMockSQSEvent([message]);
      const context = createMockContext();

      const response = await handler(sqsEvent, context);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalNotifications).toBe(1);
      expect(body.totalChannelsAttempted).toBe(3);
      expect(body.totalChannelsSucceeded).toBeGreaterThan(0);

      // Verify webhook was called
      expect(mockWebhookServer.getRequestCount()).toBeGreaterThanOrEqual(1);
    }, 15000);

    it('should process multiple notification messages', async () => {
      const messages = [
        createMockNotificationMessage({
          alert_history_id: testAlertHistoryId,
          rule_id: testRuleId,
          user_id: testUserId,
          channels: ['email'],
        }),
        createMockNotificationMessage({
          alert_history_id: testAlertHistoryId,
          rule_id: testRuleId,
          user_id: testUserId,
          channels: ['webhook'],
        }),
        createMockNotificationMessage({
          alert_history_id: testAlertHistoryId,
          rule_id: testUserId,
          channels: ['push'],
        }),
      ];

      const sqsEvent = createMockSQSEvent(messages);
      const context = createMockContext();

      const response = await handler(sqsEvent, context);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalNotifications).toBe(3);
    }, 20000);

    it('should update delivery status in database', async () => {
      const message = createMockNotificationMessage({
        alert_history_id: testAlertHistoryId,
        rule_id: testRuleId,
        user_id: testUserId,
        channels: ['email', 'webhook'],
      });

      const sqsEvent = createMockSQSEvent([message]);
      const context = createMockContext();

      await handler(sqsEvent, context);

      // Query delivery status from database
      const sql = getAlertsDBConnection();
      const result = await sql.unsafe(`
        SELECT delivery_status
        FROM alert_history
        WHERE id = $1
      `, [testAlertHistoryId]);

      expect(result.length).toBe(1);
      expect(result[0].delivery_status).toBeDefined();
      expect(typeof result[0].delivery_status).toBe('object');
    }, 15000);

    it('should create notification logs', async () => {
      const message = createMockNotificationMessage({
        alert_history_id: testAlertHistoryId,
        rule_id: testRuleId,
        user_id: testUserId,
        channels: ['email'],
      });

      const sqsEvent = createMockSQSEvent([message]);
      const context = createMockContext();

      await handler(sqsEvent, context);

      // Query notification logs from database
      const sql = getAlertsDBConnection();
      const logs = await sql.unsafe(`
        SELECT *
        FROM notification_logs
        WHERE alert_history_id = $1
      `, [testAlertHistoryId]);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].channel).toBeDefined();
      expect(logs[0].status).toBeDefined();
    }, 15000);

    it('should handle errors gracefully', async () => {
      const message = createMockNotificationMessage({
        alert_history_id: 'invalid-id',
        rule_id: 'invalid-rule-id',
        user_id: 'invalid-user-id',
        channels: ['email'],
      });

      const sqsEvent = createMockSQSEvent([message]);
      const context = createMockContext();

      const response = await handler(sqsEvent, context);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalErrors).toBeGreaterThan(0);
    }, 15000);

    it('should handle empty SQS event', async () => {
      const sqsEvent = createMockSQSEvent([]);
      const context = createMockContext();

      const response = await handler(sqsEvent, context);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalNotifications).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should process notification within 30 seconds', async () => {
      const message = createMockNotificationMessage({
        alert_history_id: testAlertHistoryId,
        rule_id: testRuleId,
        user_id: testUserId,
        channels: ['email', 'webhook', 'push'],
      });

      const sqsEvent = createMockSQSEvent([message]);
      const context = createMockContext();

      const startTime = Date.now();
      await handler(sqsEvent, context);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000); // AC requirement: <30 seconds
    }, 35000);
  });
});

