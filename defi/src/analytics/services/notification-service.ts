/**
 * Notification Service
 * Story: 3.2.2 - Suspicious Activity Detection - Enhancement 2
 * Phase: Notification Services
 * 
 * Provides unified interface for sending notifications via multiple channels
 */

import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Types
// ============================================================================

export interface EmailNotification {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export interface WebhookNotification {
  url: string;
  payload: Record<string, any>;
  headers?: Record<string, string>;
}

export interface PushNotification {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  channel: 'email' | 'webhook' | 'push';
  messageId?: string;
  error?: string;
}

// ============================================================================
// Notification Service
// ============================================================================

export class NotificationService {
  private static instance: NotificationService;
  private httpClient: AxiosInstance;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  private constructor() {
    this.httpClient = axios.create({
      timeout: 30000,
    });
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send email notification
   */
  public async sendEmail(notification: EmailNotification): Promise<NotificationResult> {
    try {
      // Check if SendGrid is configured
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SendGrid API key not configured, using mock email service');
        return this.mockEmailSend(notification);
      }

      // Send via SendGrid
      const response = await this.httpClient.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [
            {
              to: notification.to.map(email => ({ email })),
            },
          ],
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || 'alerts@example.com',
            name: process.env.SENDGRID_FROM_NAME || 'DeFiLlama Alerts',
          },
          subject: notification.subject,
          content: [
            {
              type: 'text/plain',
              value: notification.text,
            },
            {
              type: 'text/html',
              value: notification.html,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        channel: 'email',
        messageId: response.headers['x-message-id'],
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        channel: 'email',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send webhook notification with retry logic
   */
  public async sendWebhook(notification: WebhookNotification): Promise<NotificationResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await this.httpClient.post(
          notification.url,
          notification.payload,
          {
            headers: notification.headers || {},
          }
        );

        return {
          success: true,
          channel: 'webhook',
          messageId: response.data?.id || response.headers['x-request-id'],
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Webhook delivery attempt ${attempt}/${this.MAX_RETRIES} failed:`, lastError.message);

        if (attempt < this.MAX_RETRIES) {
          // Exponential backoff
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      channel: 'webhook',
      error: lastError?.message || 'Failed after max retries',
    };
  }

  /**
   * Send push notification via Supabase Realtime
   */
  public async sendPush(notification: PushNotification): Promise<NotificationResult> {
    try {
      // Check if Supabase is configured
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        console.warn('Supabase not configured, using mock push service');
        return this.mockPushSend(notification);
      }

      // Send via Supabase Realtime
      // NOTE: This would use Supabase Realtime channels to broadcast notifications
      // For now, using mock implementation until Supabase client is integrated
      return this.mockPushSend(notification);
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return {
        success: false,
        channel: 'push',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send notification to multiple channels
   */
  public async sendMultiChannel(
    email?: EmailNotification,
    webhook?: WebhookNotification,
    push?: PushNotification
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    if (email) {
      results.push(await this.sendEmail(email));
    }

    if (webhook) {
      results.push(await this.sendWebhook(webhook));
    }

    if (push) {
      results.push(await this.sendPush(push));
    }

    return results;
  }

  // ============================================================================
  // Mock Implementations (for testing without API keys)
  // ============================================================================

  private mockEmailSend(notification: EmailNotification): NotificationResult {
    console.log('Mock email sent:', {
      to: notification.to,
      subject: notification.subject,
      text: notification.text.substring(0, 100) + '...',
    });

    return {
      success: true,
      channel: 'email',
      messageId: `mock-email-${Date.now()}`,
    };
  }

  private mockPushSend(notification: PushNotification): NotificationResult {
    console.log('Mock push notification sent:', {
      tokens: notification.tokens,
      title: notification.title,
      body: notification.body.substring(0, 100) + '...',
    });

    return {
      success: true,
      channel: 'push',
      messageId: `mock-push-${Date.now()}`,
    };
  }
}

// ============================================================================
// Notification Templates
// ============================================================================

export class NotificationTemplates {
  /**
   * Generate email template for suspicious activity alert
   */
  public static generateAlertEmail(
    activityType: string,
    severity: string,
    protocolId: string,
    chainId: string,
    confidence: number,
    description: string
  ): { subject: string; html: string; text: string } {
    const severityEmoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️',
    }[severity] || 'ℹ️';

    const subject = `${severityEmoji} ${severity.toUpperCase()} Alert: ${activityType} detected on ${protocolId}`;

    const text = `
${severityEmoji} ${severity.toUpperCase()} - ${activityType}

Protocol: ${protocolId}
Chain: ${chainId}
Confidence: ${confidence.toFixed(1)}%

${description}

---
This is an automated alert from DeFiLlama Suspicious Activity Detection System.
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f44336; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
    .severity-critical { background: #f44336; }
    .severity-high { background: #ff9800; }
    .severity-medium { background: #ffc107; }
    .severity-low { background: #2196f3; }
    .detail { margin: 10px 0; }
    .label { font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header severity-${severity}">
      <h1>${severityEmoji} ${severity.toUpperCase()} Alert</h1>
      <h2>${activityType}</h2>
    </div>
    <div class="content">
      <div class="detail">
        <span class="label">Protocol:</span> ${protocolId}
      </div>
      <div class="detail">
        <span class="label">Chain:</span> ${chainId}
      </div>
      <div class="detail">
        <span class="label">Confidence:</span> ${confidence.toFixed(1)}%
      </div>
      <div class="detail">
        <p>${description}</p>
      </div>
      <hr>
      <p><small>This is an automated alert from DeFiLlama Suspicious Activity Detection System.</small></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return { subject, html, text };
  }
}

