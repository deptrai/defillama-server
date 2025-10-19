/**
 * Alert History Service
 * Story: 1.1.5 - View Whale Alert History
 * 
 * Handles alert history retrieval, filtering, sorting, and export
 */

import { getAlertsDBConnection } from '../../common/utils/db';
import { logger } from '../../common/utils/logger';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AlertHistoryEntry {
  id: string;
  rule_id: string;
  rule_name: string;
  alert_type: 'whale' | 'price' | 'gas';
  user_id: string;
  event_data: Record<string, any>;
  notification_status: 'pending' | 'sent' | 'failed' | 'partial';
  notification_channels: string[];
  delivery_status: Record<string, string>;
  notification_error?: string;
  triggered_at: Date;
  notified_at?: Date;
  created_at: Date;
}

export interface GetAlertHistoryOptions {
  page?: number;
  per_page?: number;
  alert_type?: 'whale' | 'price' | 'gas';
  chain?: string;
  token?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: 'date' | 'amount';
  sort_order?: 'asc' | 'desc';
}

export interface AlertHistoryResponse {
  data: AlertHistoryEntry[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface CreateAlertHistoryData {
  rule_id: string;
  user_id: string;
  event_data: Record<string, any>;
  notification_channels: string[];
  notification_status?: 'pending' | 'sent' | 'failed' | 'partial';
  delivery_status?: Record<string, string>;
  notification_error?: string;
}

// ============================================================================
// Alert History Service
// ============================================================================

export class AlertHistoryService {
  private db = getAlertsDBConnection();

  /**
   * Get alert history for a user with filtering, sorting, and pagination
   */
  async getAlertHistory(userId: string, options: GetAlertHistoryOptions = {}): Promise<AlertHistoryResponse> {
    const {
      page = 1,
      per_page = 50,
      alert_type,
      chain,
      token,
      start_date,
      end_date,
      sort_by = 'date',
      sort_order = 'desc',
    } = options;

    // Validate pagination
    const validatedPage = Math.max(1, page);
    const validatedPerPage = Math.min(100, Math.max(1, per_page));
    const offset = (validatedPage - 1) * validatedPerPage;

    try {
      // Build dynamic WHERE conditions using postgres template literals
      // Start with base query parts
      let countResults, results;

      // Build filters dynamically
      if (alert_type && chain && token && start_date && end_date) {
        // All filters
        [{ count: countResults }] = await this.db`
          SELECT COUNT(*) as count
          FROM alert_history ah
          JOIN alert_rules ar ON ah.rule_id = ar.id
          WHERE ah.user_id = ${userId}
            AND ar.type = ${alert_type}
            AND ah.event_data->>'chain' = ${chain}
            AND ah.event_data->>'token' = ${token}
            AND ah.triggered_at >= ${start_date}
            AND ah.triggered_at <= ${end_date}
        `;
      } else if (chain) {
        // Chain filter only
        const chainCountResult = await this.db.unsafe(`
          SELECT COUNT(*) as count
          FROM alert_history ah
          WHERE ah.user_id = $1
            AND ah.event_data->>'chain' = $2
        `, [userId, chain]);
        countResults = chainCountResult[0]?.count || 0;
      } else if (token) {
        // Token filter only
        const tokenResults = await this.db.unsafe(`
          SELECT COUNT(*) as count
          FROM alert_history ah
          WHERE ah.user_id = $1
            AND ah.event_data->>'token' = $2
        `, [userId, token]);
        countResults = tokenResults[0].count;
      } else if (alert_type) {
        // Alert type filter only
        [{ count: countResults }] = await this.db`
          SELECT COUNT(*) as count
          FROM alert_history ah
          JOIN alert_rules ar ON ah.rule_id = ar.id
          WHERE ah.user_id = ${userId}
            AND ar.type = ${alert_type}
        `;
      } else {
        // No filters
        [{ count: countResults }] = await this.db`
          SELECT COUNT(*) as count
          FROM alert_history ah
          JOIN alert_rules ar ON ah.rule_id = ar.id
          WHERE ah.user_id = ${userId}
        `;
      }

      // Get results with same filters
      if (chain) {
        if (sort_by === 'amount') {
          results = await this.db.unsafe(`
            SELECT
              ah.id, ah.rule_id, ar.name as rule_name, ar.type as alert_type,
              ah.user_id, ah.event_data, ah.notification_status, ah.notification_channels,
              ah.delivery_status, ah.notification_error, ah.triggered_at, ah.notified_at, ah.created_at
            FROM alert_history ah
            JOIN alert_rules ar ON ah.rule_id = ar.id
            WHERE ah.user_id = $1 AND ah.event_data->>'chain' = $2
            ORDER BY (ah.event_data->>'amount_usd')::numeric ${sort_order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST
            LIMIT $3 OFFSET $4
          `, [userId, chain, validatedPerPage, offset]);
        } else {
          results = await this.db.unsafe(`
            SELECT
              ah.id, ah.rule_id, ar.name as rule_name, ar.type as alert_type,
              ah.user_id, ah.event_data, ah.notification_status, ah.notification_channels,
              ah.delivery_status, ah.notification_error, ah.triggered_at, ah.notified_at, ah.created_at
            FROM alert_history ah
            JOIN alert_rules ar ON ah.rule_id = ar.id
            WHERE ah.user_id = $1 AND ah.event_data->>'chain' = $2
            ORDER BY ah.triggered_at ${sort_order === 'asc' ? 'ASC' : 'DESC'}
            LIMIT $3 OFFSET $4
          `, [userId, chain, validatedPerPage, offset]);
        }
      } else if (token) {
        results = await this.db.unsafe(`
          SELECT
            ah.id, ah.rule_id, ar.name as rule_name, ar.type as alert_type,
            ah.user_id, ah.event_data, ah.notification_status, ah.notification_channels,
            ah.delivery_status, ah.notification_error, ah.triggered_at, ah.notified_at, ah.created_at
          FROM alert_history ah
          JOIN alert_rules ar ON ah.rule_id = ar.id
          WHERE ah.user_id = $1 AND ah.event_data->>'token' = $2
          ORDER BY ah.triggered_at ${sort_order === 'asc' ? 'ASC' : 'DESC'}
          LIMIT $3 OFFSET $4
        `, [userId, token, validatedPerPage, offset]);
      } else if (alert_type) {
        results = await this.db`
          SELECT
            ah.id, ah.rule_id, ar.name as rule_name, ar.type as alert_type,
            ah.user_id, ah.event_data, ah.notification_status, ah.notification_channels,
            ah.delivery_status, ah.notification_error, ah.triggered_at, ah.notified_at, ah.created_at
          FROM alert_history ah
          JOIN alert_rules ar ON ah.rule_id = ar.id
          WHERE ah.user_id = ${userId} AND ar.type = ${alert_type}
          ORDER BY ah.triggered_at ${this.db.unsafe(sort_order === 'asc' ? 'ASC' : 'DESC')}
          LIMIT ${validatedPerPage} OFFSET ${offset}
        `;
      } else {
        // No filters - with sorting
        if (sort_by === 'amount') {
          results = await this.db`
            SELECT
              ah.id, ah.rule_id, ar.name as rule_name, ar.type as alert_type,
              ah.user_id, ah.event_data, ah.notification_status, ah.notification_channels,
              ah.delivery_status, ah.notification_error, ah.triggered_at, ah.notified_at, ah.created_at
            FROM alert_history ah
            JOIN alert_rules ar ON ah.rule_id = ar.id
            WHERE ah.user_id = ${userId}
            ORDER BY (ah.event_data->>'amount_usd')::numeric ${this.db.unsafe(sort_order === 'asc' ? 'ASC' : 'DESC')} NULLS LAST
            LIMIT ${validatedPerPage} OFFSET ${offset}
          `;
        } else {
          results = await this.db`
            SELECT
              ah.id, ah.rule_id, ar.name as rule_name, ar.type as alert_type,
              ah.user_id, ah.event_data, ah.notification_status, ah.notification_channels,
              ah.delivery_status, ah.notification_error, ah.triggered_at, ah.notified_at, ah.created_at
            FROM alert_history ah
            JOIN alert_rules ar ON ah.rule_id = ar.id
            WHERE ah.user_id = ${userId}
            ORDER BY ah.triggered_at ${this.db.unsafe(sort_order === 'asc' ? 'ASC' : 'DESC')}
            LIMIT ${validatedPerPage} OFFSET ${offset}
          `;
        }
      }

      return {
        data: results.map(this.mapToAlertHistoryEntry),
        pagination: {
          total: parseInt(countResults),
          page: validatedPage,
          per_page: validatedPerPage,
          total_pages: Math.ceil(parseInt(countResults) / validatedPerPage),
        },
      };
    } catch (error: any) {
      logger.error('Error getting alert history', error, { userId, options });
      throw error;
    }
  }

  /**
   * Get single alert history entry by ID
   */
  async getAlertHistoryById(userId: string, historyId: string): Promise<AlertHistoryEntry | null> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(historyId)) {
        return null; // Invalid UUID format
      }

      const [result] = await this.db`
        SELECT
          ah.id,
          ah.rule_id,
          ar.name as rule_name,
          ar.type as alert_type,
          ah.user_id,
          ah.event_data,
          ah.notification_status,
          ah.notification_channels,
          ah.delivery_status,
          ah.notification_error,
          ah.triggered_at,
          ah.notified_at,
          ah.created_at
        FROM alert_history ah
        JOIN alert_rules ar ON ah.rule_id = ar.id
        WHERE ah.id = ${historyId} AND ah.user_id = ${userId}
      `;

      return result ? this.mapToAlertHistoryEntry(result) : null;
    } catch (error: any) {
      logger.error('Error getting alert history by ID', error, { userId, historyId });
      throw error;
    }
  }

  /**
   * Create new alert history entry
   */
  async createAlertHistory(data: CreateAlertHistoryData): Promise<AlertHistoryEntry> {
    try {
      const [result] = await this.db`
        INSERT INTO alert_history (
          rule_id,
          user_id,
          event_data,
          notification_channels,
          notification_status,
          delivery_status,
          notification_error,
          notified_at
        ) VALUES (
          ${data.rule_id},
          ${data.user_id},
          ${JSON.stringify(data.event_data)},
          ${data.notification_channels},
          ${data.notification_status || 'pending'},
          ${data.delivery_status ? JSON.stringify(data.delivery_status) : '{}'},
          ${data.notification_error || null},
          ${data.notification_status === 'sent' ? new Date() : null}
        )
        RETURNING *
      `;

      // Get rule name and type
      const [rule] = await this.db`
        SELECT name, type FROM alert_rules WHERE id = ${data.rule_id}
      `;

      return this.mapToAlertHistoryEntry({ ...result, rule_name: rule.name, alert_type: rule.type });
    } catch (error: any) {
      logger.error('Error creating alert history', error, { data });
      throw error;
    }
  }

  /**
   * Export alert history as CSV or JSON
   */
  async exportAlertHistory(userId: string, format: 'csv' | 'json', options: GetAlertHistoryOptions = {}): Promise<string> {
    // Get all history (up to 1000 records)
    const history = await this.getAlertHistory(userId, { ...options, per_page: 1000 });

    if (format === 'csv') {
      return this.convertToCSV(history.data);
    } else {
      return JSON.stringify(history.data, null, 2);
    }
  }

  /**
   * Convert alert history to CSV format
   */
  private convertToCSV(data: AlertHistoryEntry[]): string {
    if (data.length === 0) {
      return 'id,rule_name,alert_type,chain,token,amount_usd,from,to,tx_hash,triggered_at,notification_status\n';
    }

    const headers = 'id,rule_name,alert_type,chain,token,amount_usd,from,to,tx_hash,triggered_at,notification_status\n';
    const rows = data.map(entry => {
      const eventData = entry.event_data;
      return [
        entry.id,
        entry.rule_name,
        entry.alert_type,
        eventData.chain || '',
        eventData.token || '',
        eventData.amount_usd || '',
        eventData.from || '',
        eventData.to || '',
        eventData.tx_hash || '',
        entry.triggered_at.toISOString(),
        entry.notification_status,
      ].join(',');
    }).join('\n');

    return headers + rows;
  }

  /**
   * Map database row to AlertHistoryEntry
   */
  private mapToAlertHistoryEntry(row: any): AlertHistoryEntry {
    return {
      id: row.id,
      rule_id: row.rule_id,
      rule_name: row.rule_name,
      alert_type: row.alert_type,
      user_id: row.user_id,
      event_data: typeof row.event_data === 'string' ? JSON.parse(row.event_data) : row.event_data,
      notification_status: row.notification_status,
      notification_channels: row.notification_channels,
      delivery_status: typeof row.delivery_status === 'string' ? JSON.parse(row.delivery_status) : row.delivery_status,
      notification_error: row.notification_error,
      triggered_at: new Date(row.triggered_at),
      notified_at: row.notified_at ? new Date(row.notified_at) : undefined,
      created_at: new Date(row.created_at),
    };
  }
}

// Export singleton instance
export const alertHistoryService = new AlertHistoryService();

