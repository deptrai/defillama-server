/**
 * Alert Engine Integration Tests
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { handler } from '../alert-engine';
import { SQSEvent, Context } from 'aws-lambda';
import {
  PriceUpdateEvent,
  TvlChangeEvent,
  EventType,
  EventSource,
} from '../../../events/event-types';
import { createAlertRule, deleteAlertRule, getAlertsDBConnection } from '../../db';
import { resetAllThrottling } from '../throttling-manager';
import { invalidateAllRuleCaches } from '../rule-cache';

describe('Alert Engine Integration Tests', () => {
  let testRuleIds: string[] = [];
  const testUserId = 'test-user-integration';

  beforeAll(async () => {
    // Clean up any existing test data
    const sql = getAlertsDBConnection();
    await sql.unsafe(`DELETE FROM alert_rules WHERE user_id = $1`, [testUserId]);
    await sql.unsafe(`DELETE FROM alert_history WHERE user_id = $1`, [testUserId]);
  });

  afterEach(async () => {
    // Clean up test rules
    for (const ruleId of testRuleIds) {
      try {
        await deleteAlertRule(testUserId, ruleId);
      } catch (error) {
        // Ignore errors
      }
    }
    testRuleIds = [];

    // Reset throttling and cache
    await resetAllThrottling();
    await invalidateAllRuleCaches();
  });

  afterAll(async () => {
    // Final cleanup
    const sql = getAlertsDBConnection();
    await sql.unsafe(`DELETE FROM alert_rules WHERE user_id = $1`, [testUserId]);
    await sql.unsafe(`DELETE FROM alert_history WHERE user_id = $1`, [testUserId]);
    await sql.end();
  });

  describe('Price Update Events', () => {
    it('should trigger alert when price exceeds threshold', async () => {
      // Create alert rule
      const rule = await createAlertRule(testUserId, {
        name: 'ETH Price Alert',
        alert_type: 'price_change',
        token_id: 'ethereum:0x...',
        condition: {
          operator: '>',
          threshold: 2000,
          metric: 'price',
        },
        channels: ['email'],
        throttle_minutes: 5,
      });
      testRuleIds.push(rule.id);

      // Create price update event
      const priceEvent: PriceUpdateEvent = {
        eventId: 'test-event-1',
        eventType: EventType.PRICE_UPDATE,
        timestamp: Date.now(),
        source: EventSource.DYNAMODB_STREAM,
        version: '1.0',
        metadata: {
          correlationId: 'test-correlation-1',
          confidence: 1.0,
          processingTime: 100,
          retryCount: 0,
          tags: [],
        },
        data: {
          tokenId: 'ethereum:0x...',
          symbol: 'ETH',
          chain: 'ethereum',
          previousPrice: 2000,
          currentPrice: 2500,
          changePercent: 25,
          changeAbsolute: 500,
          volume24h: 15000000000,
          marketCap: 300000000000,
          decimals: 18,
        },
      };

      // Create SQS event
      const sqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-1',
            receiptHandle: 'test-receipt-1',
            body: JSON.stringify(priceEvent),
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

      // Mock context
      const context: Context = {
        callbackWaitsForEmptyEventLoop: false,
        functionName: 'alert-engine',
        functionVersion: '1',
        invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:alert-engine',
        memoryLimitInMB: '512',
        awsRequestId: 'test-request-1',
        logGroupName: '/aws/lambda/alert-engine',
        logStreamName: 'test-stream',
        getRemainingTimeInMillis: () => 30000,
        done: () => {},
        fail: () => {},
        succeed: () => {},
      };

      // Process event
      const result = await handler(sqsEvent, context);

      // Verify result
      expect(result.statusCode).toBe(200);
      const summary = JSON.parse(result.body);
      expect(summary.totalEvents).toBe(1);
      expect(summary.totalRulesMatched).toBeGreaterThan(0);
      expect(summary.totalAlertsTriggered).toBeGreaterThan(0);

      // Verify alert history
      const sql = getAlertsDBConnection();
      const history = await sql.unsafe(
        `SELECT * FROM alert_history WHERE alert_rule_id = $1`,
        [rule.id]
      );
      expect(history.length).toBeGreaterThan(0);
      expect(Number(history[0].triggered_value)).toBe(2500);
      expect(Number(history[0].threshold_value)).toBe(2000);
    });

    it('should not trigger alert when price below threshold', async () => {
      // Create alert rule
      const rule = await createAlertRule(testUserId, {
        name: 'ETH Price Alert',
        alert_type: 'price_change',
        token_id: 'ethereum:0x...',
        condition: {
          operator: '>',
          threshold: 3000,
          metric: 'price',
        },
        channels: ['email'],
        throttle_minutes: 5,
      });
      testRuleIds.push(rule.id);

      // Create price update event (price below threshold)
      const priceEvent: PriceUpdateEvent = {
        eventId: 'test-event-2',
        eventType: EventType.PRICE_UPDATE,
        timestamp: Date.now(),
        source: EventSource.DYNAMODB_STREAM,
        version: '1.0',
        metadata: {
          correlationId: 'test-correlation-2',
          confidence: 1.0,
          processingTime: 100,
          retryCount: 0,
          tags: [],
        },
        data: {
          tokenId: 'ethereum:0x...',
          symbol: 'ETH',
          chain: 'ethereum',
          previousPrice: 2000,
          currentPrice: 2500,
          changePercent: 25,
          changeAbsolute: 500,
          volume24h: 15000000000,
          marketCap: 300000000000,
          decimals: 18,
        },
      };

      // Create SQS event
      const sqsEvent: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-2',
            receiptHandle: 'test-receipt-2',
            body: JSON.stringify(priceEvent),
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

      const context: Context = {
        callbackWaitsForEmptyEventLoop: false,
        functionName: 'alert-engine',
        functionVersion: '1',
        invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:alert-engine',
        memoryLimitInMB: '512',
        awsRequestId: 'test-request-2',
        logGroupName: '/aws/lambda/alert-engine',
        logStreamName: 'test-stream',
        getRemainingTimeInMillis: () => 30000,
        done: () => {},
        fail: () => {},
        succeed: () => {},
      };

      // Process event
      const result = await handler(sqsEvent, context);

      // Verify result
      expect(result.statusCode).toBe(200);
      const summary = JSON.parse(result.body);
      expect(summary.totalAlertsTriggered).toBe(0);

      // Verify no alert history
      const sql = getAlertsDBConnection();
      const history = await sql.unsafe(
        `SELECT * FROM alert_history WHERE alert_rule_id = $1`,
        [rule.id]
      );
      expect(history.length).toBe(0);
    });
  });

  describe('Throttling', () => {
    it('should throttle repeated alerts', async () => {
      // Create alert rule with 1 minute throttle
      const rule = await createAlertRule(testUserId, {
        name: 'ETH Price Alert',
        alert_type: 'price_change',
        token_id: 'ethereum:0x...',
        condition: {
          operator: '>',
          threshold: 2000,
          metric: 'price',
        },
        channels: ['email'],
        throttle_minutes: 1,
      });
      testRuleIds.push(rule.id);

      // Create price update event
      const priceEvent: PriceUpdateEvent = {
        eventId: 'test-event-3',
        eventType: EventType.PRICE_UPDATE,
        timestamp: Date.now(),
        source: EventSource.DYNAMODB_STREAM,
        version: '1.0',
        metadata: {
          correlationId: 'test-correlation-3',
          confidence: 1.0,
          processingTime: 100,
          retryCount: 0,
          tags: [],
        },
        data: {
          tokenId: 'ethereum:0x...',
          symbol: 'ETH',
          chain: 'ethereum',
          previousPrice: 2000,
          currentPrice: 2500,
          changePercent: 25,
          changeAbsolute: 500,
          decimals: 18,
        },
      };

      const context: Context = {
        callbackWaitsForEmptyEventLoop: false,
        functionName: 'alert-engine',
        functionVersion: '1',
        invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:alert-engine',
        memoryLimitInMB: '512',
        awsRequestId: 'test-request-3',
        logGroupName: '/aws/lambda/alert-engine',
        logStreamName: 'test-stream',
        getRemainingTimeInMillis: () => 30000,
        done: () => {},
        fail: () => {},
        succeed: () => {},
      };

      // First event - should trigger
      const sqsEvent1: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-3a',
            receiptHandle: 'test-receipt-3a',
            body: JSON.stringify(priceEvent),
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

      const result1 = await handler(sqsEvent1, context);
      const summary1 = JSON.parse(result1.body);
      expect(summary1.totalAlertsTriggered).toBe(1);

      // Second event immediately after - should be throttled
      const sqsEvent2: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-3b',
            receiptHandle: 'test-receipt-3b',
            body: JSON.stringify({ ...priceEvent, eventId: 'test-event-3b' }),
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

      const result2 = await handler(sqsEvent2, context);
      const summary2 = JSON.parse(result2.body);
      expect(summary2.totalRulesThrottled).toBeGreaterThan(0);
      expect(summary2.totalAlertsTriggered).toBe(0);
    });
  });
});

