/**
 * Alert Engine Lambda Handler
 * Main handler for alert rule evaluation
 * Story 1.3: Alert Engine and Notification System - Task 6
 */

import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { SQS } from '@aws-sdk/client-sqs';
import { BaseEvent } from '../../events/event-types';
import { matchRules } from './rule-matcher';
import { evaluateCondition } from './condition-evaluator';
import { filterThrottledRules, updateRuleThrottling } from './throttling-manager';
import { getCachedRules, cacheRules } from './rule-cache';
import { getAlertsDBConnection } from '../db';
import { AlertRule } from '../types';

// ============================================================================
// SQS Client
// ============================================================================

const sqsClient = new SQS({
  region: process.env.AWS_REGION || 'us-east-1',
});

const NOTIFICATION_QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL || '';

// ============================================================================
// Alert History
// ============================================================================

interface AlertHistoryRecord {
  alert_rule_id: string;
  user_id: string;
  triggered_value: number;
  threshold_value: number;
  message: string;
  notification_channels: string[];
}

async function createAlertHistory(
  record: AlertHistoryRecord
): Promise<string> {
  const sql = getAlertsDBConnection();
  
  const query = `
    INSERT INTO alert_history (
      alert_rule_id,
      user_id,
      triggered_value,
      threshold_value,
      message,
      notification_channels,
      delivery_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;
  
  const deliveryStatus = record.notification_channels.reduce((acc, channel) => {
    acc[channel] = 'pending';
    return acc;
  }, {} as any);
  
  const result = await sql.unsafe(query, [
    record.alert_rule_id,
    record.user_id,
    record.triggered_value,
    record.threshold_value,
    record.message,
    record.notification_channels,
    deliveryStatus,
  ]);
  
  return result[0].id;
}

// ============================================================================
// Notification Queue
// ============================================================================

interface NotificationMessage {
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
    message: string;
  };
  timestamp: number;
}

async function sendToNotificationQueue(
  message: NotificationMessage
): Promise<void> {
  if (!NOTIFICATION_QUEUE_URL) {
    console.warn('NOTIFICATION_QUEUE_URL not configured, skipping notification');
    return;
  }
  
  await sqsClient.sendMessage({
    QueueUrl: NOTIFICATION_QUEUE_URL,
    MessageBody: JSON.stringify(message),
    MessageAttributes: {
      rule_id: {
        DataType: 'String',
        StringValue: message.rule_id,
      },
      user_id: {
        DataType: 'String',
        StringValue: message.user_id,
      },
    },
  });
}

// ============================================================================
// Event Processing
// ============================================================================

interface ProcessingResult {
  eventId: string;
  rulesMatched: number;
  rulesEvaluated: number;
  rulesThrottled: number;
  alertsTriggered: number;
  errors: string[];
}

async function processEvent(event: BaseEvent): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    eventId: event.eventId,
    rulesMatched: 0,
    rulesEvaluated: 0,
    rulesThrottled: 0,
    alertsTriggered: 0,
    errors: [],
  };
  
  try {
    // Step 1: Match rules
    const matchedRules = await matchRules(event);
    result.rulesMatched = matchedRules.length;
    
    if (matchedRules.length === 0) {
      return result;
    }
    
    // Step 2: Filter throttled rules
    const { allowed, throttled } = await filterThrottledRules(matchedRules);
    result.rulesThrottled = throttled.length;
    result.rulesEvaluated = allowed.length;
    
    if (allowed.length === 0) {
      return result;
    }
    
    // Step 3: Evaluate conditions
    const triggeredRules: Array<{
      rule: AlertRule;
      triggeredValue: number | null;
      thresholdValue: number | null;
      message: string;
    }> = [];
    
    for (const rule of allowed) {
      const evaluation = evaluateCondition(rule.condition, event);
      
      if (evaluation.result) {
        triggeredRules.push({
          rule,
          triggeredValue: evaluation.triggeredValue,
          thresholdValue: evaluation.thresholdValue,
          message: evaluation.message,
        });
      }
    }
    
    result.alertsTriggered = triggeredRules.length;
    
    if (triggeredRules.length === 0) {
      return result;
    }
    
    // Step 4: Create alert history and send notifications
    for (const { rule, triggeredValue, thresholdValue, message } of triggeredRules) {
      try {
        // Create alert history
        const historyId = await createAlertHistory({
          alert_rule_id: rule.id,
          user_id: rule.user_id,
          triggered_value: triggeredValue || 0,
          threshold_value: thresholdValue || 0,
          message,
          notification_channels: rule.channels,
        });
        
        // Send to notification queue
        await sendToNotificationQueue({
          alert_history_id: historyId,
          rule_id: rule.id,
          user_id: rule.user_id,
          rule_name: rule.name,
          channels: rule.channels,
          data: {
            metric: rule.alert_type,
            triggered_value: triggeredValue || 0,
            threshold_value: thresholdValue || 0,
            message,
          },
          timestamp: Date.now(),
        });
        
        // Update throttling
        await updateRuleThrottling(rule.id, rule.throttle_minutes);
      } catch (error) {
        result.errors.push(`Failed to process rule ${rule.id}: ${error}`);
      }
    }
    
    return result;
  } catch (error) {
    result.errors.push(`Failed to process event: ${error}`);
    return result;
  }
}

// ============================================================================
// Lambda Handler
// ============================================================================

export async function handler(
  sqsEvent: SQSEvent,
  context: Context
): Promise<{ statusCode: number; body: string }> {
  console.log('Alert Engine Lambda invoked', {
    recordCount: sqsEvent.Records.length,
    requestId: context.requestId,
  });
  
  const results: ProcessingResult[] = [];
  const errors: string[] = [];
  
  // Process each SQS record
  for (const record of sqsEvent.Records) {
    try {
      const event: BaseEvent = JSON.parse(record.body);
      const result = await processEvent(event);
      results.push(result);
      
      if (result.errors.length > 0) {
        errors.push(...result.errors);
      }
    } catch (error) {
      errors.push(`Failed to parse SQS record: ${error}`);
    }
  }
  
  // Log summary
  const summary = {
    totalEvents: sqsEvent.Records.length,
    totalRulesMatched: results.reduce((sum, r) => sum + r.rulesMatched, 0),
    totalRulesEvaluated: results.reduce((sum, r) => sum + r.rulesEvaluated, 0),
    totalRulesThrottled: results.reduce((sum, r) => sum + r.rulesThrottled, 0),
    totalAlertsTriggered: results.reduce((sum, r) => sum + r.alertsTriggered, 0),
    totalErrors: errors.length,
  };
  
  console.log('Alert Engine processing complete', summary);
  
  if (errors.length > 0) {
    console.error('Errors during processing:', errors);
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify(summary),
  };
}

