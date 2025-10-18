/**
 * Notification Service
 * Handles sending notifications via multiple channels (email, Telegram, Discord, webhook)
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../common/utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface NotificationChannel {
  type: 'email' | 'telegram' | 'discord' | 'webhook' | 'push';
  config: Record<string, any>;
}

export interface NotificationPayload {
  alertId: string;
  alertType: 'whale' | 'price';
  title: string;
  message: string;
  data: Record<string, any>;
  channels: NotificationChannel[];
}

export interface NotificationResult {
  channel: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// Notification Service
// ============================================================================

export class NotificationService {
  private static instance: NotificationService;
  private httpClient: AxiosInstance;

  // Callback for testing
  private onNotificationComplete?: (alertId: string, results: NotificationResult[]) => void;

  // Configuration
  private readonly TELEGRAM_API_URL = process.env.TELEGRAM_API_URL || 'http://localhost:3100';
  private readonly DISCORD_WEBHOOK_BASE = process.env.DISCORD_WEBHOOK_BASE || 'http://localhost:3101';
  private readonly WEBHOOK_BASE = process.env.WEBHOOK_BASE || 'http://localhost:3102';
  private readonly MAILHOG_SMTP_HOST = process.env.MAILHOG_SMTP_HOST || 'localhost';
  private readonly MAILHOG_SMTP_PORT = parseInt(process.env.MAILHOG_SMTP_PORT || '3103');

  private constructor() {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send notification to all configured channels
   */
  public async sendNotification(payload: NotificationPayload): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Send to all channels in parallel
    const promises = payload.channels.map(async (channel) => {
      try {
        let result: NotificationResult;

        switch (channel.type) {
          case 'email':
            result = await this.sendEmail(payload, channel.config);
            break;
          case 'telegram':
            result = await this.sendTelegram(payload, channel.config);
            break;
          case 'discord':
            result = await this.sendDiscord(payload, channel.config);
            break;
          case 'webhook':
            result = await this.sendWebhook(payload, channel.config);
            break;
          default:
            result = {
              channel: channel.type,
              success: false,
              error: `Unsupported channel type: ${channel.type}`,
            };
        }

        return result;
      } catch (error: any) {
        logger.error(`Failed to send notification via ${channel.type}`, error);
        return {
          channel: channel.type,
          success: false,
          error: error.message,
        };
      }
    });

    const channelResults = await Promise.all(promises);
    results.push(...channelResults);

    // Trigger callback for testing
    if (this.onNotificationComplete) {
      this.onNotificationComplete(payload.alertId, results);
    }

    return results;
  }

  /**
   * Set callback for notification completion (for testing)
   */
  public setNotificationCallback(callback: (alertId: string, results: NotificationResult[]) => void): void {
    this.onNotificationComplete = callback;
  }

  /**
   * Clear notification callback (for testing)
   */
  public clearNotificationCallback(): void {
    this.onNotificationComplete = undefined;
  }

  /**
   * Send email notification via MailHog (for testing)
   */
  private async sendEmail(
    payload: NotificationPayload,
    config: Record<string, any>
  ): Promise<NotificationResult> {
    try {
      const nodemailer = require('nodemailer');

      // Create transporter for MailHog
      const transporter = nodemailer.createTransport({
        host: this.MAILHOG_SMTP_HOST,
        port: this.MAILHOG_SMTP_PORT,
        secure: false,
        ignoreTLS: true,
      });

      // Send email
      const info = await transporter.sendMail({
        from: '"DeFiLlama Alerts" <alerts@defillama.com>',
        to: config.email || config.to,
        subject: payload.title,
        text: payload.message,
        html: this.formatEmailHTML(payload),
      });

      logger.info('Email sent successfully', { messageId: info.messageId });

      return {
        channel: 'email',
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      logger.error('Failed to send email', error);
      return {
        channel: 'email',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send Telegram notification
   */
  private async sendTelegram(
    payload: NotificationPayload,
    config: Record<string, any>
  ): Promise<NotificationResult> {
    try {
      const chatId = config.telegram_chat_id || config.chatId || config.chat_id;
      if (!chatId) {
        throw new Error('Telegram chat ID is required');
      }

      const response = await this.httpClient.post(`${this.TELEGRAM_API_URL}/bot:token/sendMessage`, {
        chat_id: chatId,
        text: this.formatTelegramMessage(payload),
        parse_mode: 'Markdown',
      });

      return {
        channel: 'telegram',
        success: true,
        messageId: response.data.result?.message_id?.toString(),
      };
    } catch (error: any) {
      logger.error('Failed to send Telegram message', error);
      return {
        channel: 'telegram',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send Discord notification
   */
  private async sendDiscord(
    payload: NotificationPayload,
    config: Record<string, any>
  ): Promise<NotificationResult> {
    try {
      const webhookUrl = config.discord_webhook_url || config.webhookUrl || config.webhook_url;
      if (!webhookUrl) {
        throw new Error('Discord webhook URL is required');
      }

      const response = await this.httpClient.post(webhookUrl, {
        content: this.formatDiscordMessage(payload),
        embeds: [
          {
            title: payload.title,
            description: payload.message,
            color: payload.alertType === 'whale' ? 0x3498db : 0xe74c3c,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      return {
        channel: 'discord',
        success: true,
        messageId: response.headers['x-message-id'],
      };
    } catch (error: any) {
      logger.error('Failed to send Discord message', error);
      return {
        channel: 'discord',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    payload: NotificationPayload,
    config: Record<string, any>
  ): Promise<NotificationResult> {
    try {
      const webhookUrl = config.webhook_url || config.url;
      if (!webhookUrl) {
        throw new Error('Webhook URL is required');
      }

      const response = await this.httpClient.post(webhookUrl, {
        alert_id: payload.alertId,
        alert_type: payload.alertType,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        timestamp: new Date().toISOString(),
      });

      return {
        channel: 'webhook',
        success: true,
        messageId: response.headers['x-request-id'],
      };
    } catch (error: any) {
      logger.error('Failed to send webhook', error);
      return {
        channel: 'webhook',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Format email HTML
   */
  private formatEmailHTML(payload: NotificationPayload): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>${payload.title}</h2>
          <p>${payload.message}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            <a href="https://defillama.com/alerts/unsubscribe">Unsubscribe</a>
          </p>
        </body>
      </html>
    `;
  }

  /**
   * Format Telegram message
   */
  private formatTelegramMessage(payload: NotificationPayload): string {
    const icon = payload.alertType === 'whale' ? '🐋' : '📊';
    return `${icon} **${payload.title}**\n\n${payload.message}`;
  }

  /**
   * Format Discord message
   */
  private formatDiscordMessage(payload: NotificationPayload): string {
    const icon = payload.alertType === 'whale' ? '🐋' : '📊';
    return `${icon} **${payload.title}**`;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

