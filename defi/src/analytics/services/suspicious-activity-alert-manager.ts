/**
 * Suspicious Activity Alert Manager
 * Story: 3.2.2 - Suspicious Activity Detection
 * Phase: 6 - Alert System Integration
 * 
 * Manages alerts for suspicious activities detected by the system.
 * Integrates with existing alert infrastructure from Story 1.3.
 */

import { query } from '../db/connection';
import { SuspiciousActivity } from '../engines/rug-pull-detector';
import { NotificationService, NotificationTemplates } from './notification-service';

// ============================================================================
// Types
// ============================================================================

export interface AlertConfig {
  enabled: boolean;
  severity_threshold: 'low' | 'medium' | 'high' | 'critical';
  confidence_threshold: number; // 0-100
  channels: AlertChannel[];
  deduplication_window: number; // seconds
}

export interface AlertChannel {
  type: 'email' | 'webhook' | 'push';
  config: Record<string, any>;
  enabled: boolean;
}

export interface Alert {
  id: string;
  activity_id: string;
  alert_type: string;
  severity: string;
  message: string;
  channels: string[];
  sent_at: Date;
  acknowledged: boolean;
  acknowledged_at?: Date;
  acknowledged_by?: string;
}

// ============================================================================
// Suspicious Activity Alert Manager
// ============================================================================

export class SuspiciousActivityAlertManager {
  private static instance: SuspiciousActivityAlertManager;
  private notificationService: NotificationService;
  private readonly DEFAULT_CONFIG: AlertConfig = {
    enabled: true,
    severity_threshold: 'medium',
    confidence_threshold: 60,
    channels: [
      { type: 'email', config: {}, enabled: true },
      { type: 'webhook', config: {}, enabled: true },
    ],
    deduplication_window: 3600, // 1 hour
  };

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): SuspiciousActivityAlertManager {
    if (!SuspiciousActivityAlertManager.instance) {
      SuspiciousActivityAlertManager.instance = new SuspiciousActivityAlertManager();
    }
    return SuspiciousActivityAlertManager.instance;
  }

  /**
   * Process suspicious activity and send alerts if needed
   */
  public async processActivity(activity: SuspiciousActivity, config?: AlertConfig): Promise<Alert | null> {
    const alertConfig = config || this.DEFAULT_CONFIG;

    // Check if alerts are enabled
    if (!alertConfig.enabled) {
      return null;
    }

    // Check severity threshold
    if (!this.meetsSeverityThreshold(activity.severity, alertConfig.severity_threshold)) {
      return null;
    }

    // Check confidence threshold
    if (activity.confidence_score < alertConfig.confidence_threshold) {
      return null;
    }

    // Check for duplicate alerts
    const isDuplicate = await this.isDuplicateAlert(activity, alertConfig.deduplication_window);
    if (isDuplicate) {
      console.log(`Skipping duplicate alert for activity ${activity.protocol_id}`);
      return null;
    }

    // Create and send alert
    const alert = await this.createAlert(activity, alertConfig);
    await this.sendAlert(alert, alertConfig.channels);

    // Update activity status
    await this.markActivityAlertSent(activity);

    return alert;
  }

  /**
   * Check if activity meets severity threshold
   */
  private meetsSeverityThreshold(activitySeverity: string, threshold: string): boolean {
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const activityLevel = severityLevels.indexOf(activitySeverity);
    const thresholdLevel = severityLevels.indexOf(threshold);
    return activityLevel >= thresholdLevel;
  }

  /**
   * Check if alert is duplicate within deduplication window
   */
  private async isDuplicateAlert(activity: SuspiciousActivity, window: number): Promise<boolean> {
    try {
      const result = await query<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM suspicious_activities
         WHERE protocol_id = $1
           AND activity_type = $2
           AND detection_timestamp > NOW() - INTERVAL '${window} seconds'
           AND alert_sent = true`,
        [activity.protocol_id, activity.activity_type]
      );

      return result.rows[0].count > 0;
    } catch (error) {
      console.error('Error checking duplicate alert:', error);
      return false;
    }
  }

  /**
   * Create alert record
   */
  private async createAlert(activity: SuspiciousActivity, config: AlertConfig): Promise<Alert> {
    const message = this.generateAlertMessage(activity);
    const channels = config.channels.filter(c => c.enabled).map(c => c.type);

    try {
      const result = await query<Alert>(
        `INSERT INTO alerts (
          activity_id, alert_type, severity, message, channels, sent_at, acknowledged
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          activity.protocol_id, // Using protocol_id as activity_id for now
          'suspicious_activity',
          activity.severity,
          message,
          channels,
          new Date(),
          false,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating alert:', error);
      throw new Error(`Failed to create alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate human-readable alert message
   */
  private generateAlertMessage(activity: SuspiciousActivity): string {
    const severityEmoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️',
    };

    const emoji = severityEmoji[activity.severity as keyof typeof severityEmoji] || 'ℹ️';

    return `${emoji} ${activity.severity.toUpperCase()} - ${activity.activity_type.replace(/_/g, ' ').toUpperCase()}

Protocol: ${activity.protocol_id}
Chain: ${activity.chain_id}
Confidence: ${activity.confidence_score.toFixed(1)}%

${activity.evidence_description}

Detected at: ${activity.detection_timestamp.toISOString()}
Status: ${activity.status}

${activity.wallet_addresses.length > 0 ? `Wallets involved: ${activity.wallet_addresses.length}` : ''}
${activity.estimated_loss_usd > 0 ? `Estimated loss: $${activity.estimated_loss_usd.toLocaleString()}` : ''}
${activity.affected_users > 0 ? `Affected users: ${activity.affected_users.toLocaleString()}` : ''}`;
  }

  /**
   * Send alert through configured channels
   */
  private async sendAlert(alert: Alert, channels: AlertChannel[]): Promise<void> {
    const enabledChannels = channels.filter(c => c.enabled);

    for (const channel of enabledChannels) {
      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailAlert(alert, channel.config);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, channel.config);
            break;
          case 'push':
            await this.sendPushAlert(alert, channel.config);
            break;
        }
      } catch (error) {
        console.error(`Error sending alert via ${channel.type}:`, error);
      }
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    try {
      // Extract activity details from alert
      const activityMatch = alert.message.match(/(\w+) - (\w+)/);
      const severity = activityMatch?.[1]?.toLowerCase() || 'medium';
      const activityType = activityMatch?.[2] || 'unknown';

      const protocolMatch = alert.message.match(/Protocol: ([^\n]+)/);
      const protocolId = protocolMatch?.[1] || 'unknown';

      const chainMatch = alert.message.match(/Chain: ([^\n]+)/);
      const chainId = chainMatch?.[1] || 'unknown';

      const confidenceMatch = alert.message.match(/Confidence: ([\d.]+)%/);
      const confidence = parseFloat(confidenceMatch?.[1] || '0');

      // Generate email template
      const emailTemplate = NotificationTemplates.generateAlertEmail(
        activityType,
        severity,
        protocolId,
        chainId,
        confidence,
        alert.message
      );

      // Send email
      const recipients = config.recipients || [process.env.ALERT_EMAIL || 'admin@example.com'];
      const result = await this.notificationService.sendEmail({
        to: recipients,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      if (!result.success) {
        console.error('Failed to send email alert:', result.error);
      }
    } catch (error) {
      console.error('Error sending email alert:', error);
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    try {
      const webhookUrl = config.url || process.env.WEBHOOK_URL;
      if (!webhookUrl) {
        console.warn('Webhook URL not configured, skipping webhook alert');
        return;
      }

      // Send webhook with retry logic
      const result = await this.notificationService.sendWebhook({
        url: webhookUrl,
        payload: {
          alert_id: alert.id,
          activity_id: alert.activity_id,
          severity: alert.severity,
          message: alert.message,
          timestamp: alert.timestamp,
        },
        headers: config.headers || {},
      });

      if (!result.success) {
        console.error('Failed to send webhook alert:', result.error);
      }
    } catch (error) {
      console.error('Error sending webhook alert:', error);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    try {
      const deviceTokens = config.tokens || [];
      if (deviceTokens.length === 0) {
        console.warn('No device tokens configured, skipping push notification');
        return;
      }

      // Extract title from alert message
      const titleMatch = alert.message.match(/^([^\n]+)/);
      const title = titleMatch?.[1] || 'Suspicious Activity Alert';

      // Send push notification
      const result = await this.notificationService.sendPush({
        tokens: deviceTokens,
        title,
        body: alert.message.substring(0, 200),
        data: {
          alert_id: alert.id,
          activity_id: alert.activity_id,
          severity: alert.severity,
        },
      });

      if (!result.success) {
        console.error('Failed to send push notification:', result.error);
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  /**
   * Mark activity as alert sent
   */
  private async markActivityAlertSent(activity: SuspiciousActivity): Promise<void> {
    try {
      await query(
        `UPDATE suspicious_activities
         SET alert_sent = true, updated_at = NOW()
         WHERE protocol_id = $1 AND activity_type = $2 AND detection_timestamp = $3`,
        [activity.protocol_id, activity.activity_type, activity.detection_timestamp]
      );
    } catch (error) {
      console.error('Error marking activity alert sent:', error);
    }
  }

  /**
   * Acknowledge alert
   */
  public async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      await query(
        `UPDATE alerts
         SET acknowledged = true, acknowledged_at = NOW(), acknowledged_by = $1
         WHERE id = $2`,
        [acknowledgedBy, alertId]
      );
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw new Error(`Failed to acknowledge alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get alerts for activity
   */
  public async getAlertsForActivity(activityId: string): Promise<Alert[]> {
    try {
      const result = await query<Alert>(
        `SELECT * FROM alerts WHERE activity_id = $1 ORDER BY sent_at DESC`,
        [activityId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }
}

