/**
 * Push Notification Service
 * Sends push notifications via Amazon SNS
 * Story 1.3: Alert Engine and Notification System - Phase 6.3
 */

import { SNS, PublishCommand } from '@aws-sdk/client-sns';
import { retryWithBackoff } from '../utils/retry';
import { PushTemplate } from '../templates/template-engine';

// ============================================================================
// Configuration
// ============================================================================

const USE_REAL_SNS = process.env.USE_REAL_SNS === 'true';
const SNS_PLATFORM_APPLICATION_ARN_IOS = process.env.SNS_PLATFORM_APPLICATION_ARN_IOS || '';
const SNS_PLATFORM_APPLICATION_ARN_ANDROID = process.env.SNS_PLATFORM_APPLICATION_ARN_ANDROID || '';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// ============================================================================
// SNS Client
// ============================================================================

let snsClient: SNS | null = null;

function getSNSClient(): SNS {
  if (!snsClient && USE_REAL_SNS) {
    snsClient = new SNS({ region: AWS_REGION });
  }
  return snsClient!;
}

// ============================================================================
// Push Notification
// ============================================================================

export interface PushNotification {
  deviceToken: string;
  platform: 'ios' | 'android';
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Format push notification payload for platform
 */
function formatPushPayload(notification: PushNotification): string {
  if (notification.platform === 'ios') {
    // APNS format
    return JSON.stringify({
      aps: {
        alert: {
          title: notification.title,
          body: notification.body,
        },
        sound: 'default',
      },
      data: notification.data || {},
    });
  } else {
    // FCM format
    return JSON.stringify({
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
    });
  }
}

/**
 * Send push notification via SNS
 */
async function sendPushViaSNS(notification: PushNotification): Promise<void> {
  const client = getSNSClient();

  // Get platform application ARN
  const platformARN = notification.platform === 'ios'
    ? SNS_PLATFORM_APPLICATION_ARN_IOS
    : SNS_PLATFORM_APPLICATION_ARN_ANDROID;

  if (!platformARN) {
    throw new Error(`Platform ARN not configured for ${notification.platform}`);
  }

  // Format payload
  const payload = formatPushPayload(notification);

  // Create endpoint (if not exists) and publish
  // Note: In production, endpoints should be created during device registration
  // For now, we assume endpoint ARN is the device token
  const command = new PublishCommand({
    TargetArn: notification.deviceToken, // Should be endpoint ARN
    Message: payload,
    MessageStructure: 'json',
  });

  await client.send(command);
}

/**
 * Mock push notification sending (for local development)
 */
async function sendPushMock(notification: PushNotification): Promise<void> {
  console.log('📱 [MOCK] Push notification sent:', {
    platform: notification.platform,
    deviceToken: notification.deviceToken.substring(0, 20) + '...',
    title: notification.title,
    body: notification.body,
  });
}

/**
 * Send push notification
 */
export async function sendPush(notification: PushNotification): Promise<void> {
  const sendFn = USE_REAL_SNS ? sendPushViaSNS : sendPushMock;

  await retryWithBackoff(
    () => sendFn(notification),
    {
      maxRetries: 3,
      baseDelay: 1000,
      onRetry: (error, attempt) => {
        console.warn(`Push notification failed (attempt ${attempt}):`, error.message);
      },
    }
  );
}

/**
 * Send push notification from template
 */
export async function sendPushFromTemplate(
  deviceToken: string,
  platform: 'ios' | 'android',
  template: PushTemplate,
  data?: Record<string, any>
): Promise<void> {
  await sendPush({
    deviceToken,
    platform,
    title: template.title,
    body: template.body,
    data,
  });
}

/**
 * Batch send push notifications
 */
export async function batchSendPush(
  notifications: PushNotification[]
): Promise<Array<{ success: boolean; deviceToken: string; error?: Error }>> {
  const results = await Promise.all(
    notifications.map(async (notification) => {
      try {
        await sendPush(notification);
        return { success: true, deviceToken: notification.deviceToken };
      } catch (error) {
        return {
          success: false,
          deviceToken: notification.deviceToken,
          error: error as Error,
        };
      }
    })
  );

  return results;
}

/**
 * Get push service status
 */
export function getPushServiceStatus(): {
  enabled: boolean;
  mode: 'real' | 'mock';
  platforms: {
    ios: { configured: boolean };
    android: { configured: boolean };
  };
} {
  return {
    enabled: true,
    mode: USE_REAL_SNS ? 'real' : 'mock',
    platforms: {
      ios: { configured: !!SNS_PLATFORM_APPLICATION_ARN_IOS },
      android: { configured: !!SNS_PLATFORM_APPLICATION_ARN_ANDROID },
    },
  };
}

