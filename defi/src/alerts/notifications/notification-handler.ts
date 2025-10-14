/**
 * Notification Handler Lambda
 * Main handler for notification delivery
 * Story 1.3: Alert Engine and Notification System - Phase 6.3
 */

import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { getAlertsDBConnection } from '../db';
import {
  generateEmailTemplate,
  generateWebhookPayload,
  generatePushNotification,
  TemplateData,
} from './templates/template-engine';
import { sendEmailFromTemplate } from './services/email-service';
import { sendWebhook } from './services/webhook-service';
import { sendPushFromTemplate } from './services/push-service';
import {
  batchUpdateDeliveryStatus,
  batchCreateNotificationLogs,
  DeliveryResult,
  NotificationLog,
} from './services/delivery-tracker';

// ============================================================================
// Notification Message (from SQS)
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
    chain?: string;
    message: string;
  };
  timestamp: number;
}

// ============================================================================
// User Data Query
// ============================================================================

interface UserData {
  email?: string;
  devices?: Array<{
    device_token: string;
    platform: 'ios' | 'android';
  }>;
  webhook_url?: string;
}

async function getUserData(userId: string, ruleId: string): Promise<UserData> {
  const sql = getAlertsDBConnection();

  // Query user email
  const userQuery = `SELECT email FROM users WHERE id = $1`;
  const userResult = await sql.unsafe(userQuery, [userId]);
  const email = userResult[0]?.email;

  // Query user devices
  const devicesQuery = `
    SELECT device_token, platform
    FROM user_devices
    WHERE user_id = $1 AND enabled = true
  `;
  const devicesResult = await sql.unsafe(devicesQuery, [userId]);
  const devices = devicesResult.map(row => ({
    device_token: row.device_token,
    platform: row.platform,
  }));

  // Query webhook URL from alert rule
  const webhookQuery = `SELECT webhook_url FROM alert_rules WHERE id = $1`;
  const webhookResult = await sql.unsafe(webhookQuery, [ruleId]);
  const webhook_url = webhookResult[0]?.webhook_url;

  return { email, devices, webhook_url };
}

// ============================================================================
// Channel Delivery
// ============================================================================

async function deliverEmail(
  userData: UserData,
  templateData: TemplateData
): Promise<DeliveryResult> {
  if (!userData.email) {
    return {
      channel: 'email',
      status: 'failed',
      error: 'No email address configured',
    };
  }

  try {
    const template = generateEmailTemplate(templateData);
    await sendEmailFromTemplate(userData.email, template);
    return {
      channel: 'email',
      status: 'sent',
      recipient: userData.email,
    };
  } catch (error) {
    return {
      channel: 'email',
      status: 'failed',
      error: (error as Error).message,
      recipient: userData.email,
    };
  }
}

async function deliverWebhook(
  userData: UserData,
  templateData: TemplateData
): Promise<DeliveryResult> {
  if (!userData.webhook_url) {
    return {
      channel: 'webhook',
      status: 'failed',
      error: 'No webhook URL configured',
    };
  }

  try {
    const payload = generateWebhookPayload(templateData);
    await sendWebhook({
      url: userData.webhook_url,
      payload,
    });
    return {
      channel: 'webhook',
      status: 'sent',
      recipient: userData.webhook_url,
    };
  } catch (error) {
    return {
      channel: 'webhook',
      status: 'failed',
      error: (error as Error).message,
      recipient: userData.webhook_url,
    };
  }
}

async function deliverPush(
  userData: UserData,
  templateData: TemplateData
): Promise<DeliveryResult[]> {
  if (!userData.devices || userData.devices.length === 0) {
    return [{
      channel: 'push',
      status: 'failed',
      error: 'No devices configured',
    }];
  }

  const results: DeliveryResult[] = [];
  const template = generatePushNotification(templateData);

  for (const device of userData.devices) {
    try {
      await sendPushFromTemplate(
        device.device_token,
        device.platform,
        template,
        { alert_history_id: templateData.rule_name }
      );
      results.push({
        channel: 'push',
        status: 'sent',
        recipient: device.device_token,
      });
    } catch (error) {
      results.push({
        channel: 'push',
        status: 'failed',
        error: (error as Error).message,
        recipient: device.device_token,
      });
    }
  }

  return results;
}

// ============================================================================
// Process Notification
// ============================================================================

interface ProcessingResult {
  alert_history_id: string;
  channels_attempted: number;
  channels_succeeded: number;
  channels_failed: number;
  errors: string[];
}

async function processNotification(
  message: NotificationMessage
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    alert_history_id: message.alert_history_id,
    channels_attempted: message.channels.length,
    channels_succeeded: 0,
    channels_failed: 0,
    errors: [],
  };

  try {
    // Get user data
    const userData = await getUserData(message.user_id, message.rule_id);

    // Prepare template data
    const templateData: TemplateData = {
      rule_name: message.rule_name,
      message: message.data.message,
      triggered_value: message.data.triggered_value,
      threshold_value: message.data.threshold_value,
      protocol_name: message.data.protocol_name,
      token_symbol: message.data.token_symbol,
      chain: message.data.chain,
      timestamp: message.timestamp,
      alert_type: message.data.metric,
    };

    // Deliver to all channels in parallel
    const deliveryPromises: Promise<DeliveryResult | DeliveryResult[]>[] = [];

    message.channels.forEach(channel => {
      if (channel === 'email') {
        deliveryPromises.push(deliverEmail(userData, templateData));
      } else if (channel === 'webhook') {
        deliveryPromises.push(deliverWebhook(userData, templateData));
      } else if (channel === 'push') {
        deliveryPromises.push(deliverPush(userData, templateData));
      }
    });

    const deliveryResults = await Promise.all(deliveryPromises);

    // Flatten results (push returns array)
    const flatResults: DeliveryResult[] = deliveryResults.flat();

    // Count successes and failures
    flatResults.forEach(r => {
      if (r.status === 'sent') {
        result.channels_succeeded++;
      } else {
        result.channels_failed++;
        if (r.error) {
          result.errors.push(`${r.channel}: ${r.error}`);
        }
      }
    });

    // Update delivery status in database
    await batchUpdateDeliveryStatus(message.alert_history_id, flatResults);

    // Create notification logs
    const logs: NotificationLog[] = flatResults.map(r => ({
      alert_history_id: message.alert_history_id,
      channel: r.channel,
      status: r.status,
      recipient: r.recipient,
      error_message: r.error,
    }));
    await batchCreateNotificationLogs(logs);

    return result;
  } catch (error) {
    result.channels_failed = result.channels_attempted;
    result.errors.push(`Processing failed: ${(error as Error).message}`);
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
  console.log('Notification Handler Lambda invoked', {
    recordCount: sqsEvent.Records.length,
    requestId: context.requestId,
  });

  const results: ProcessingResult[] = [];
  const errors: string[] = [];

  // Process each SQS record
  for (const record of sqsEvent.Records) {
    try {
      const message: NotificationMessage = JSON.parse(record.body);
      const result = await processNotification(message);
      results.push(result);

      if (result.errors.length > 0) {
        errors.push(...result.errors);
      }
    } catch (error) {
      errors.push(`Failed to parse SQS record: ${(error as Error).message}`);
    }
  }

  // Log summary
  const summary = {
    totalNotifications: sqsEvent.Records.length,
    totalChannelsAttempted: results.reduce((sum, r) => sum + r.channels_attempted, 0),
    totalChannelsSucceeded: results.reduce((sum, r) => sum + r.channels_succeeded, 0),
    totalChannelsFailed: results.reduce((sum, r) => sum + r.channels_failed, 0),
    totalErrors: errors.length,
  };

  console.log('Notification Handler processing complete', summary);

  if (errors.length > 0) {
    console.error('Errors during processing:', errors);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(summary),
  };
}

