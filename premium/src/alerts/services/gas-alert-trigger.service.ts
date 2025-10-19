/**
 * Gas Alert Trigger Service
 * Story: 1.3 - Gas Fee Alerts
 * Phase 3: Alert Triggering
 * 
 * Evaluates gas alerts and triggers notifications when conditions are met
 */

import { gasAlertService, GasAlert } from './gas-alert.service';
import { notificationService, NotificationPayload, NotificationChannel } from './notification.service';
import { alertHistoryService } from './alert-history.service';
import { logger } from '../../common/utils/logger';
import { GasPriceData } from './gas-price-monitor.service';
import Redis from 'ioredis';

// ============================================================================
// Types
// ============================================================================

export interface GasAlertEventData {
  chain: string;
  threshold_gwei: number;
  current_gas_price: {
    slow: number;
    standard: number;
    fast: number;
    instant: number;
  };
  alert_type: 'below' | 'spike';
  triggered_value: number; // The gas price that triggered alert
  gas_type: 'slow' | 'standard' | 'fast' | 'instant';
}

// ============================================================================
// Gas Alert Trigger Service
// ============================================================================

export class GasAlertTriggerService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
    });
  }

  /**
   * Check all active alerts for a chain and trigger if conditions are met
   * 
   * @param chain - Chain name (ethereum, bsc, polygon, etc.)
   * @param gasPrices - Current gas prices
   */
  async checkAlerts(chain: string, gasPrices: GasPriceData): Promise<void> {
    try {
      // Get all active alerts for this chain
      const alerts = await gasAlertService.getActiveAlertsByChain(chain);
      
      if (alerts.length === 0) {
        logger.debug(`No active gas alerts for chain: ${chain}`);
        return;
      }

      logger.info(`Checking ${alerts.length} gas alerts for chain: ${chain}`, { chain, alertCount: alerts.length });

      // Check each alert
      for (const alert of alerts) {
        try {
          // Check if alert should trigger
          const shouldTrigger = await this.shouldTrigger(alert, gasPrices);
          
          if (!shouldTrigger) {
            continue;
          }

          // Check throttling
          if (this.isThrottled(alert)) {
            logger.debug(`Alert throttled: ${alert.id}`, { alertId: alert.id, lastTriggeredAt: alert.last_triggered_at });
            continue;
          }

          // Trigger alert
          await this.triggerAlert(alert, gasPrices);
        } catch (error: any) {
          logger.error(`Error checking alert: ${alert.id}`, error, { alertId: alert.id, chain });
        }
      }
    } catch (error: any) {
      logger.error(`Error checking gas alerts for chain: ${chain}`, error, { chain });
    }
  }

  /**
   * Check if alert should trigger based on current gas prices
   * 
   * @param alert - Gas alert
   * @param gasPrices - Current gas prices
   * @returns True if alert should trigger
   */
  private async shouldTrigger(alert: GasAlert, gasPrices: GasPriceData): Promise<boolean> {
    const alertType = alert.conditions.alert_type as 'below' | 'spike';
    
    if (alertType === 'below') {
      return this.shouldTriggerBelow(alert, gasPrices);
    } else if (alertType === 'spike') {
      return await this.shouldTriggerSpike(alert, gasPrices);
    }
    
    return false;
  }

  /**
   * Check if "below threshold" alert should trigger
   * 
   * @param alert - Gas alert
   * @param gasPrices - Current gas prices
   * @returns True if alert should trigger
   */
  private shouldTriggerBelow(alert: GasAlert, gasPrices: GasPriceData): boolean {
    const thresholdGwei = alert.conditions.threshold_gwei as number;
    const gasType = (alert.conditions.gas_type as 'slow' | 'standard' | 'fast' | 'instant') || 'standard';
    const currentPrice = gasPrices[gasType];
    
    // Trigger if current price is below or equal to threshold
    return currentPrice <= thresholdGwei;
  }

  /**
   * Check if "spike" alert should trigger
   * 
   * @param alert - Gas alert
   * @param gasPrices - Current gas prices
   * @returns True if alert should trigger
   */
  private async shouldTriggerSpike(alert: GasAlert, gasPrices: GasPriceData): Promise<boolean> {
    const chain = alert.conditions.chain as string;
    const gasType = (alert.conditions.gas_type as 'slow' | 'standard' | 'fast' | 'instant') || 'standard';
    const currentPrice = gasPrices[gasType];
    
    // Get gas price from 10 minutes ago
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const historicalPrice = await this.getGasPriceAt(chain, tenMinutesAgo);
    
    if (!historicalPrice) {
      logger.debug(`No historical price found for spike detection`, { chain, tenMinutesAgo });
      return false;
    }
    
    // Calculate spike percentage
    const spikePercent = ((currentPrice - historicalPrice) / historicalPrice) * 100;
    
    logger.debug(`Spike detection`, {
      chain,
      gasType,
      currentPrice,
      historicalPrice,
      spikePercent,
    });
    
    // Trigger if spike >= 100% (as per TC-009 requirement)
    return spikePercent >= 100;
  }

  /**
   * Check if alert is throttled (recently triggered)
   * 
   * @param alert - Gas alert
   * @returns True if alert is throttled
   */
  private isThrottled(alert: GasAlert): boolean {
    if (!alert.last_triggered_at) {
      return false;
    }
    
    const now = Date.now();
    const lastTriggered = new Date(alert.last_triggered_at).getTime();
    const throttleMs = alert.throttle_minutes * 60 * 1000;
    
    return (now - lastTriggered) < throttleMs;
  }

  /**
   * Trigger alert: send notification and create history
   * 
   * @param alert - Gas alert
   * @param gasPrices - Current gas prices
   */
  private async triggerAlert(alert: GasAlert, gasPrices: GasPriceData): Promise<void> {
    try {
      const chain = alert.conditions.chain as string;
      const alertType = alert.conditions.alert_type as 'below' | 'spike';
      const gasType = (alert.conditions.gas_type as 'slow' | 'standard' | 'fast' | 'instant') || 'standard';
      const currentPrice = gasPrices[gasType];
      const thresholdGwei = alert.conditions.threshold_gwei as number;

      logger.info(`Triggering gas alert: ${alert.id}`, {
        alertId: alert.id,
        chain,
        alertType,
        gasType,
        currentPrice,
        thresholdGwei,
      });

      // Format notification payload
      const notificationPayload = this.formatNotificationPayload(alert, gasPrices);
      
      // Send notification
      const notificationResults = await notificationService.sendNotification(notificationPayload);
      
      // Determine notification status
      const successCount = notificationResults.filter(r => r.success).length;
      const notificationStatus = successCount === notificationResults.length ? 'sent' :
                                 successCount === 0 ? 'failed' : 'partial';
      
      // Create delivery status
      const deliveryStatus: Record<string, string> = {};
      for (const result of notificationResults) {
        deliveryStatus[result.channel] = result.success ? 'sent' : 'failed';
      }
      
      // Create event data
      const eventData: GasAlertEventData = {
        chain,
        threshold_gwei: thresholdGwei,
        current_gas_price: {
          slow: gasPrices.slow,
          standard: gasPrices.standard,
          fast: gasPrices.fast,
          instant: gasPrices.instant,
        },
        alert_type: alertType,
        triggered_value: currentPrice,
        gas_type: gasType,
      };
      
      // Create alert history
      await alertHistoryService.createAlertHistory({
        rule_id: alert.id,
        user_id: alert.user_id,
        event_data: eventData,
        notification_channels: alert.actions.channels,
        notification_status: notificationStatus,
        delivery_status: deliveryStatus,
        notification_error: notificationResults.find(r => !r.success)?.error,
      });
      
      // Update last_triggered_at
      await this.updateLastTriggeredAt(alert.id);
      
      logger.info(`Gas alert triggered successfully: ${alert.id}`, {
        alertId: alert.id,
        notificationStatus,
        deliveryStatus,
      });
    } catch (error: any) {
      logger.error(`Error triggering gas alert: ${alert.id}`, error, { alertId: alert.id });
      throw error;
    }
  }

  /**
   * Format notification payload for gas alert
   * 
   * @param alert - Gas alert
   * @param gasPrices - Current gas prices
   * @returns Notification payload
   */
  private formatNotificationPayload(alert: GasAlert, gasPrices: GasPriceData): NotificationPayload {
    const chain = alert.conditions.chain as string;
    const alertType = alert.conditions.alert_type as 'below' | 'spike';
    const gasType = (alert.conditions.gas_type as 'slow' | 'standard' | 'fast' | 'instant') || 'standard';
    const currentPrice = gasPrices[gasType];
    const thresholdGwei = alert.conditions.threshold_gwei as number;
    
    // Format title and message based on alert type
    let title: string;
    let message: string;
    
    if (alertType === 'below') {
      title = `⛽ Gas Alert: ${chain.toUpperCase()} - Below Threshold`;
      message = `Gas price on ${chain} has dropped to ${currentPrice} Gwei (${gasType}), below your threshold of ${thresholdGwei} Gwei. Great time to transact!`;
    } else {
      title = `🚨 Gas Alert: ${chain.toUpperCase()} - Price Spike`;
      message = `Gas price on ${chain} has spiked to ${currentPrice} Gwei (${gasType}). Consider waiting for prices to stabilize.`;
    }
    
    // Format notification channels
    const channels: NotificationChannel[] = alert.actions.channels.map((channelType) => ({
      type: channelType as 'email' | 'telegram' | 'discord' | 'webhook',
      config: this.getChannelConfig(alert, channelType),
    }));
    
    return {
      alertId: alert.id,
      alertType: 'gas',
      userId: alert.user_id,
      ruleId: alert.id,
      title,
      message,
      data: {
        chain,
        alert_type: alertType,
        gas_type: gasType,
        current_price: currentPrice,
        threshold: thresholdGwei,
        slow: gasPrices.slow,
        standard: gasPrices.standard,
        fast: gasPrices.fast,
        instant: gasPrices.instant,
        timestamp: Date.now(),
      },
      channels,
    };
  }

  /**
   * Get channel configuration from alert
   * 
   * @param alert - Gas alert
   * @param channelType - Channel type
   * @returns Channel configuration
   */
  private getChannelConfig(alert: GasAlert, channelType: string): Record<string, any> {
    // Extract channel-specific config from alert.actions
    const config: Record<string, any> = {};
    
    if (channelType === 'webhook' && alert.actions.webhook_url) {
      config.webhook_url = alert.actions.webhook_url;
    }
    
    if (channelType === 'telegram' && alert.actions.telegram_chat_id) {
      config.telegram_chat_id = alert.actions.telegram_chat_id;
    }
    
    if (channelType === 'discord' && alert.actions.discord_webhook_url) {
      config.discord_webhook_url = alert.actions.discord_webhook_url;
    }
    
    if (channelType === 'email' && alert.actions.email) {
      config.email = alert.actions.email;
    }
    
    return config;
  }

  /**
   * Get gas price at a specific timestamp from Redis history
   * 
   * @param chain - Chain name
   * @param timestamp - Timestamp in milliseconds
   * @returns Gas price (standard) or null if not found
   */
  private async getGasPriceAt(chain: string, timestamp: number): Promise<number | null> {
    try {
      const key = `gas_price_history:${chain}`;
      
      // Get prices within ±30 seconds of target timestamp
      const startScore = timestamp - 30000;
      const endScore = timestamp + 30000;
      
      const results = await this.redis.zrangebyscore(key, startScore, endScore, 'LIMIT', 0, 1);
      
      if (results.length === 0) {
        return null;
      }
      
      const data = JSON.parse(results[0]);
      return data.standard;
    } catch (error: any) {
      logger.error(`Error getting historical gas price`, error, { chain, timestamp });
      return null;
    }
  }

  /**
   * Update last_triggered_at timestamp for alert
   * 
   * @param alertId - Alert ID
   */
  private async updateLastTriggeredAt(alertId: string): Promise<void> {
    try {
      const db = gasAlertService['db']; // Access private db instance
      
      await db`
        UPDATE alert_rules
        SET last_triggered_at = NOW()
        WHERE id = ${alertId}
      `;
    } catch (error: any) {
      logger.error(`Error updating last_triggered_at`, error, { alertId });
    }
  }
}

// Export singleton instance
export const gasAlertTriggerService = new GasAlertTriggerService();

