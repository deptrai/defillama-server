/**
 * Distribution Alert Engine
 * Story: 2.2.2 - Holder Distribution Analysis
 * 
 * Manages alerts for holder distribution changes including whale accumulation,
 * whale distribution, concentration increases, and holder count changes
 */

import { query } from '../db/connection';

export interface DistributionAlert {
  id: string;
  userId: string;
  tokenAddress: string;
  chainId: string;
  alertType: 'whale_accumulation' | 'whale_distribution' | 'concentration_increase' | 'holder_count_change';
  threshold: number;
  channels: string[];
  webhookUrl?: string;
  enabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCreateInput {
  userId: string;
  tokenAddress: string;
  chainId?: string;
  alertType: DistributionAlert['alertType'];
  threshold: number;
  channels: string[];
  webhookUrl?: string;
}

export interface AlertTrigger {
  alertId: string;
  tokenAddress: string;
  chainId: string;
  alertType: string;
  threshold: number;
  currentValue: number;
  change: number;
  timestamp: Date;
  message: string;
}

export class DistributionAlertEngine {
  private static instance: DistributionAlertEngine;

  private constructor() {}

  public static getInstance(): DistributionAlertEngine {
    if (!DistributionAlertEngine.instance) {
      DistributionAlertEngine.instance = new DistributionAlertEngine();
    }
    return DistributionAlertEngine.instance;
  }

  /**
   * Create a new alert
   */
  async createAlert(input: AlertCreateInput): Promise<DistributionAlert> {
    const {
      userId,
      tokenAddress,
      chainId = 'ethereum',
      alertType,
      threshold,
      channels,
      webhookUrl,
    } = input;

    const result = await query<{
      id: string;
      user_id: string;
      token_address: string;
      chain_id: string;
      alert_type: string;
      threshold: string;
      channels: string;
      webhook_url: string;
      enabled: boolean;
      last_triggered: Date;
      trigger_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO holder_distribution_alerts (
         user_id, token_address, chain_id, alert_type, threshold, channels, webhook_url
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, tokenAddress, chainId, alertType, threshold, JSON.stringify(channels), webhookUrl]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      tokenAddress: row.token_address,
      chainId: row.chain_id,
      alertType: row.alert_type as DistributionAlert['alertType'],
      threshold: parseFloat(row.threshold),
      channels: JSON.parse(row.channels),
      webhookUrl: row.webhook_url,
      enabled: row.enabled,
      lastTriggered: row.last_triggered,
      triggerCount: row.trigger_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get alerts for a user
   */
  async getUserAlerts(userId: string, tokenAddress?: string): Promise<DistributionAlert[]> {
    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];

    if (tokenAddress) {
      whereClause += ' AND token_address = $2';
      params.push(tokenAddress);
    }

    const result = await query<{
      id: string;
      user_id: string;
      token_address: string;
      chain_id: string;
      alert_type: string;
      threshold: string;
      channels: string;
      webhook_url: string;
      enabled: boolean;
      last_triggered: Date;
      trigger_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM holder_distribution_alerts ${whereClause} ORDER BY created_at DESC`,
      params
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      tokenAddress: row.token_address,
      chainId: row.chain_id,
      alertType: row.alert_type as DistributionAlert['alertType'],
      threshold: parseFloat(row.threshold),
      channels: JSON.parse(row.channels),
      webhookUrl: row.webhook_url,
      enabled: row.enabled,
      lastTriggered: row.last_triggered,
      triggerCount: row.trigger_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Update alert
   */
  async updateAlert(
    alertId: string,
    updates: Partial<Pick<DistributionAlert, 'threshold' | 'channels' | 'webhookUrl' | 'enabled'>>
  ): Promise<DistributionAlert> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.threshold !== undefined) {
      setClauses.push(`threshold = $${paramIndex++}`);
      params.push(updates.threshold);
    }

    if (updates.channels !== undefined) {
      setClauses.push(`channels = $${paramIndex++}`);
      params.push(JSON.stringify(updates.channels));
    }

    if (updates.webhookUrl !== undefined) {
      setClauses.push(`webhook_url = $${paramIndex++}`);
      params.push(updates.webhookUrl);
    }

    if (updates.enabled !== undefined) {
      setClauses.push(`enabled = $${paramIndex++}`);
      params.push(updates.enabled);
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(alertId);

    const result = await query<{
      id: string;
      user_id: string;
      token_address: string;
      chain_id: string;
      alert_type: string;
      threshold: string;
      channels: string;
      webhook_url: string;
      enabled: boolean;
      last_triggered: Date;
      trigger_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE holder_distribution_alerts 
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      tokenAddress: row.token_address,
      chainId: row.chain_id,
      alertType: row.alert_type as DistributionAlert['alertType'],
      threshold: parseFloat(row.threshold),
      channels: JSON.parse(row.channels),
      webhookUrl: row.webhook_url,
      enabled: row.enabled,
      lastTriggered: row.last_triggered,
      triggerCount: row.trigger_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Delete alert
   */
  async deleteAlert(alertId: string): Promise<void> {
    await query('DELETE FROM holder_distribution_alerts WHERE id = $1', [alertId]);
  }

  /**
   * Check alerts and return triggered ones
   */
  async checkAlerts(tokenAddress: string, chainId: string = 'ethereum'): Promise<AlertTrigger[]> {
    // Get all enabled alerts for this token
    const alertsResult = await query<{
      id: string;
      alert_type: string;
      threshold: string;
    }>(
      `SELECT id, alert_type, threshold
       FROM holder_distribution_alerts
       WHERE token_address = $1 AND chain_id = $2 AND enabled = TRUE`,
      [tokenAddress, chainId]
    );

    const triggers: AlertTrigger[] = [];

    for (const alert of alertsResult.rows) {
      const trigger = await this.checkAlert(
        alert.id,
        tokenAddress,
        chainId,
        alert.alert_type as DistributionAlert['alertType'],
        parseFloat(alert.threshold)
      );

      if (trigger) {
        triggers.push(trigger);
        // Update last_triggered and trigger_count
        await query(
          `UPDATE holder_distribution_alerts 
           SET last_triggered = NOW(), trigger_count = trigger_count + 1
           WHERE id = $1`,
          [alert.id]
        );
      }
    }

    return triggers;
  }

  /**
   * Check individual alert
   */
  private async checkAlert(
    alertId: string,
    tokenAddress: string,
    chainId: string,
    alertType: DistributionAlert['alertType'],
    threshold: number
  ): Promise<AlertTrigger | null> {
    // Get latest 2 snapshots to calculate change
    const snapshotsResult = await query<{
      whale_percentage: string;
      concentration_score: string;
      total_holders: number;
      timestamp: Date;
    }>(
      `SELECT whale_percentage, concentration_score, total_holders, timestamp
       FROM holder_distribution_snapshots
       WHERE token_address = $1 AND chain_id = $2
       ORDER BY timestamp DESC
       LIMIT 2`,
      [tokenAddress, chainId]
    );

    if (snapshotsResult.rows.length < 2) {
      return null; // Not enough data
    }

    const [latest, previous] = snapshotsResult.rows;

    let currentValue = 0;
    let change = 0;
    let message = '';

    switch (alertType) {
      case 'whale_accumulation':
        currentValue = parseFloat(latest.whale_percentage);
        change = currentValue - parseFloat(previous.whale_percentage);
        if (change >= threshold) {
          message = `Whale accumulation detected: +${change.toFixed(2)}% (threshold: ${threshold}%)`;
          return { alertId, tokenAddress, chainId, alertType, threshold, currentValue, change, timestamp: latest.timestamp, message };
        }
        break;

      case 'whale_distribution':
        currentValue = parseFloat(latest.whale_percentage);
        change = parseFloat(previous.whale_percentage) - currentValue;
        if (change >= threshold) {
          message = `Whale distribution detected: -${change.toFixed(2)}% (threshold: ${threshold}%)`;
          return { alertId, tokenAddress, chainId, alertType, threshold, currentValue, change, timestamp: latest.timestamp, message };
        }
        break;

      case 'concentration_increase':
        currentValue = parseFloat(latest.concentration_score);
        change = currentValue - parseFloat(previous.concentration_score);
        if (change >= threshold) {
          message = `Concentration increase detected: +${change.toFixed(2)} (threshold: ${threshold})`;
          return { alertId, tokenAddress, chainId, alertType, threshold, currentValue, change, timestamp: latest.timestamp, message };
        }
        break;

      case 'holder_count_change':
        currentValue = latest.total_holders;
        change = Math.abs(currentValue - previous.total_holders);
        const changePercent = (change / previous.total_holders) * 100;
        if (changePercent >= threshold) {
          message = `Holder count change detected: ${change > 0 ? '+' : ''}${change} holders (${changePercent.toFixed(1)}%, threshold: ${threshold}%)`;
          return { alertId, tokenAddress, chainId, alertType, threshold, currentValue, change, timestamp: latest.timestamp, message };
        }
        break;
    }

    return null;
  }
}

