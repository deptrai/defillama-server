/**
 * Alert Matching Engine
 * Story: 2.1.2 - Yield Opportunity Scanner
 * 
 * Matches yield changes against user alert configurations
 */

import { query } from '../db/connection';

export interface YieldAlert {
  id: string;
  userId: string;
  opportunityId?: string;
  alertType: 'yield_increase' | 'yield_decrease' | 'new_opportunity' | 'risk_change';
  threshold?: number;
  minApy?: number;
  maxRiskScore?: number;
  protocolIds?: string[];
  chainIds?: string[];
  poolTypes?: string[];
  channels: string[];
  webhookUrl?: string;
  enabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AlertMatch {
  alert: YieldAlert;
  opportunity: {
    id: string;
    protocolId: string;
    poolName: string;
    chainId: string;
    apy: number;
    riskScore: number;
  };
  reason: string;
  changePercent?: number;
}

export class AlertMatchingEngine {
  private static instance: AlertMatchingEngine;

  private constructor() {}

  public static getInstance(): AlertMatchingEngine {
    if (!AlertMatchingEngine.instance) {
      AlertMatchingEngine.instance = new AlertMatchingEngine();
    }
    return AlertMatchingEngine.instance;
  }

  /**
   * Create a new alert
   */
  public async createAlert(alert: Omit<YieldAlert, 'id' | 'triggerCount' | 'lastTriggered'>): Promise<YieldAlert> {
    const result = await query<any>(
      `INSERT INTO yield_alerts (
        user_id, opportunity_id, alert_type, threshold, min_apy, max_risk_score,
        protocol_ids, chain_ids, pool_types, channels, webhook_url, enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        alert.userId,
        alert.opportunityId || null,
        alert.alertType,
        alert.threshold || null,
        alert.minApy || null,
        alert.maxRiskScore || null,
        alert.protocolIds || null,
        alert.chainIds || null,
        alert.poolTypes || null,
        alert.channels,
        alert.webhookUrl || null,
        alert.enabled,
      ]
    );

    return this.mapRowToAlert(result.rows[0]);
  }

  /**
   * Get alerts for a user
   */
  public async getUserAlerts(userId: string, enabled?: boolean): Promise<YieldAlert[]> {
    const conditions = ['user_id = $1'];
    const params: any[] = [userId];

    if (enabled !== undefined) {
      conditions.push('enabled = $2');
      params.push(enabled);
    }

    const result = await query<any>(
      `SELECT * FROM yield_alerts WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );

    return result.rows.map(row => this.mapRowToAlert(row));
  }

  /**
   * Update an alert
   */
  public async updateAlert(id: string, updates: Partial<YieldAlert>): Promise<YieldAlert> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.threshold !== undefined) {
      fields.push(`threshold = $${paramIndex++}`);
      params.push(updates.threshold);
    }

    if (updates.minApy !== undefined) {
      fields.push(`min_apy = $${paramIndex++}`);
      params.push(updates.minApy);
    }

    if (updates.maxRiskScore !== undefined) {
      fields.push(`max_risk_score = $${paramIndex++}`);
      params.push(updates.maxRiskScore);
    }

    if (updates.enabled !== undefined) {
      fields.push(`enabled = $${paramIndex++}`);
      params.push(updates.enabled);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query<any>(
      `UPDATE yield_alerts SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new Error('Alert not found');
    }

    return this.mapRowToAlert(result.rows[0]);
  }

  /**
   * Delete an alert
   */
  public async deleteAlert(id: string): Promise<void> {
    await query('DELETE FROM yield_alerts WHERE id = $1', [id]);
  }

  /**
   * Match yield changes against alerts (stub for MVP)
   */
  public async matchAlerts(
    opportunityId: string,
    currentApy: number,
    previousApy: number,
    currentRiskScore: number,
    previousRiskScore: number
  ): Promise<AlertMatch[]> {
    // Get all enabled alerts
    const result = await query<any>(
      `SELECT * FROM yield_alerts WHERE enabled = TRUE`
    );

    const alerts = result.rows.map(row => this.mapRowToAlert(row));
    const matches: AlertMatch[]  = [];

    // Get opportunity details
    const oppResult = await query<any>(
      `SELECT id, protocol_id, pool_name, chain_id, apy, risk_score
       FROM yield_opportunities WHERE id = $1`,
      [opportunityId]
    );

    if (oppResult.rows.length === 0) {
      return matches;
    }

    const opportunity = oppResult.rows[0];

    for (const alert of alerts) {
      // Check if alert matches this opportunity
      if (alert.opportunityId && alert.opportunityId !== opportunityId) {
        continue;
      }

      // Check filters
      if (alert.protocolIds && !alert.protocolIds.includes(opportunity.protocol_id)) {
        continue;
      }

      if (alert.chainIds && !alert.chainIds.includes(opportunity.chain_id)) {
        continue;
      }

      if (alert.minApy && currentApy < alert.minApy) {
        continue;
      }

      if (alert.maxRiskScore && currentRiskScore > alert.maxRiskScore) {
        continue;
      }

      // Check alert type
      const apyChange = ((currentApy - previousApy) / previousApy) * 100;
      const riskChange = currentRiskScore - previousRiskScore;

      let matched = false;
      let reason = '';
      let changePercent: number | undefined;

      switch (alert.alertType) {
        case 'yield_increase':
          if (apyChange > 0 && (!alert.threshold || apyChange >= alert.threshold)) {
            matched = true;
            reason = `APY increased by ${apyChange.toFixed(2)}%`;
            changePercent = apyChange;
          }
          break;

        case 'yield_decrease':
          if (apyChange < 0 && (!alert.threshold || Math.abs(apyChange) >= alert.threshold)) {
            matched = true;
            reason = `APY decreased by ${Math.abs(apyChange).toFixed(2)}%`;
            changePercent = apyChange;
          }
          break;

        case 'new_opportunity':
          if (currentApy >= (alert.minApy || 0) && currentRiskScore <= (alert.maxRiskScore || 100)) {
            matched = true;
            reason = `New opportunity with ${currentApy.toFixed(2)}% APY`;
          }
          break;

        case 'risk_change':
          if (Math.abs(riskChange) >= (alert.threshold || 10)) {
            matched = true;
            reason = `Risk score changed by ${riskChange}`;
            changePercent = riskChange;
          }
          break;
      }

      if (matched) {
        matches.push({
          alert,
          opportunity: {
            id: opportunity.id,
            protocolId: opportunity.protocol_id,
            poolName: opportunity.pool_name,
            chainId: opportunity.chain_id,
            apy: parseFloat(opportunity.apy),
            riskScore: opportunity.risk_score,
          },
          reason,
          changePercent,
        });
      }
    }

    return matches;
  }

  /**
   * Mark alert as triggered
   */
  public async markTriggered(alertId: string): Promise<void> {
    await query(
      `UPDATE yield_alerts 
       SET last_triggered = NOW(), trigger_count = trigger_count + 1
       WHERE id = $1`,
      [alertId]
    );
  }

  private mapRowToAlert(row: any): YieldAlert {
    return {
      id: row.id,
      userId: row.user_id,
      opportunityId: row.opportunity_id,
      alertType: row.alert_type,
      threshold: row.threshold ? parseFloat(row.threshold) : undefined,
      minApy: row.min_apy ? parseFloat(row.min_apy) : undefined,
      maxRiskScore: row.max_risk_score,
      protocolIds: row.protocol_ids,
      chainIds: row.chain_ids,
      poolTypes: row.pool_types,
      channels: row.channels || [],
      webhookUrl: row.webhook_url,
      enabled: row.enabled,
      lastTriggered: row.last_triggered ? new Date(row.last_triggered) : undefined,
      triggerCount: row.trigger_count || 0,
    };
  }
}

// Export singleton instance
export const alertMatchingEngine = AlertMatchingEngine.getInstance();

