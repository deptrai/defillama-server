/**
 * Price Alert Service
 * Story 1.1.2: Configure Price Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 *
 * Service layer for price alert CRUD operations
 */

import postgres from 'postgres';
import {
  CreatePriceAlertDto,
  UpdatePriceAlertDto,
  validateConditionalFields,
  validateUpdateConditionalFields,
  mergeUpdateData,
} from '../dto';

// ============================================================================
// Database Connection (Follow whale alert service pattern)
// ============================================================================

let alertsDBConnection: ReturnType<typeof postgres>;

function getAlertsDBConnection() {
  if (!alertsDBConnection) {
    const dbUrl = process.env.PREMIUM_DB || process.env.ALERTS_DB;
    if (!dbUrl) {
      throw new Error('Database connection string not found. Set PREMIUM_DB or ALERTS_DB environment variable.');
    }
    alertsDBConnection = postgres(dbUrl, {
      idle_timeout: 90,
      max: 10,
    });
  }
  return alertsDBConnection;
}

// Price alert interface
export interface PriceAlert {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: 'price';
  conditions: {
    token: string;
    chain: string;
    alert_type: 'above' | 'below' | 'change_percent' | 'volume_spike';
    threshold: number;
    direction?: 'up' | 'down' | 'both';
    timeframe?: '1h' | '24h' | '7d';
    auto_disable: boolean;
  };
  actions: {
    channels: string[];
    webhook_url?: string;
    telegram_chat_id?: string;
    discord_webhook_url?: string;
  };
  enabled: boolean;
  throttle_minutes: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

// List options interface
export interface ListPriceAlertsOptions {
  page?: number;
  per_page?: number;
  status?: 'active' | 'triggered' | 'paused';
  chain?: string;
  alert_type?: 'above' | 'below' | 'change_percent' | 'volume_spike';
}

/**
 * Price Alert Service
 */
export class PriceAlertService {
  private db = getAlertsDBConnection();

  /**
   * Create a new price alert
   *
   * @param userId - User ID
   * @param data - Price alert data
   * @returns Created price alert
   */
  async create(userId: string, data: CreatePriceAlertDto): Promise<PriceAlert> {
    // Validate conditional fields
    const validation = validateConditionalFields(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Check alert limit (200 for Pro, unlimited for Premium)
    const count = await this.count(userId);
    const userTier = await this.getUserTier(userId);
    
    if (userTier === 'pro' && count >= 200) {
      throw new Error('Alert limit exceeded. Pro tier allows maximum 200 price alerts. Upgrade to Premium for unlimited alerts.');
    }
    
    // Insert into database
    const [alert] = await this.db`
      INSERT INTO alert_rules (
        user_id,
        name,
        description,
        type,
        conditions,
        actions,
        enabled,
        throttle_minutes
      ) VALUES (
        ${userId},
        ${data.name || `Price Alert - ${data.conditions.token} on ${data.conditions.chain}`},
        ${data.description || null},
        ${data.type},
        ${JSON.stringify(data.conditions)},
        ${JSON.stringify(data.actions)},
        ${data.enabled},
        ${data.throttle_minutes}
      )
      RETURNING *
    `;
    
    return this.mapToAlert(alert);
  }
  
  /**
   * Get all price alerts for a user
   * 
   * @param userId - User ID
   * @param options - List options
   * @returns Price alerts and pagination
   */
  async get(userId: string, options: ListPriceAlertsOptions = {}): Promise<{
    data: PriceAlert[];
    pagination: {
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    };
  }> {
    const page = options.page || 1;
    const perPage = Math.min(options.per_page || 20, 100);
    const offset = (page - 1) * perPage;

    // Build WHERE clause with parameterized queries
    const conditions = [`user_id = '${userId}'`, `type = 'price'`];

    if (options.status) {
      if (options.status === 'active') {
        conditions.push(`enabled = true`);
      } else if (options.status === 'paused') {
        conditions.push(`enabled = false`);
      } else if (options.status === 'triggered') {
        conditions.push(`last_triggered_at IS NOT NULL`);
      }
    }

    if (options.chain) {
      conditions.push(`conditions->>'chain' = '${options.chain}'`);
    }

    if (options.alert_type) {
      conditions.push(`conditions->>'alert_type' = '${options.alert_type}'`);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const [{ count: total }] = await this.db.unsafe(`
      SELECT COUNT(*) as count
      FROM alert_rules
      WHERE ${whereClause}
    `);

    // Get alerts
    const alerts = await this.db.unsafe(`
      SELECT *
      FROM alert_rules
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${perPage}
      OFFSET ${offset}
    `);

    return {
      data: alerts.map(this.mapToAlert),
      pagination: {
        total: parseInt(total),
        page,
        per_page: perPage,
        total_pages: Math.ceil(parseInt(total) / perPage),
      },
    };
  }
  
  /**
   * Get a price alert by ID
   * 
   * @param userId - User ID
   * @param alertId - Alert ID
   * @returns Price alert
   */
  async getById(userId: string, alertId: string): Promise<PriceAlert | null> {
    const [alert] = await this.db`
      SELECT *
      FROM alert_rules
      WHERE id = ${alertId}
        AND user_id = ${userId}
        AND type = 'price'
    `;
    
    return alert ? this.mapToAlert(alert) : null;
  }
  
  /**
   * Update a price alert
   * 
   * @param userId - User ID
   * @param alertId - Alert ID
   * @param data - Update data
   * @returns Updated price alert
   */
  async update(userId: string, alertId: string, data: UpdatePriceAlertDto): Promise<PriceAlert> {
    // Get existing alert
    const existingAlert = await this.getById(userId, alertId);
    if (!existingAlert) {
      throw new Error('Price alert not found');
    }
    
    // Validate conditional fields
    const validation = validateUpdateConditionalFields(data, existingAlert);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Merge update data
    const merged = mergeUpdateData(existingAlert, data);
    
    // Update in database
    const [updated] = await this.db`
      UPDATE alert_rules
      SET
        name = ${merged.name},
        description = ${merged.description},
        conditions = ${JSON.stringify(merged.conditions)},
        actions = ${JSON.stringify(merged.actions)},
        enabled = ${merged.enabled},
        throttle_minutes = ${merged.throttle_minutes},
        updated_at = NOW()
      WHERE id = ${alertId}
        AND user_id = ${userId}
        AND type = 'price'
      RETURNING *
    `;
    
    if (!updated) {
      throw new Error('Failed to update price alert');
    }
    
    return this.mapToAlert(updated);
  }
  
  /**
   * Delete a price alert
   * 
   * @param userId - User ID
   * @param alertId - Alert ID
   * @returns True if deleted
   */
  async delete(userId: string, alertId: string): Promise<boolean> {
    const result = await this.db`
      DELETE FROM alert_rules
      WHERE id = ${alertId}
        AND user_id = ${userId}
        AND type = 'price'
    `;
    
    return result.count > 0;
  }
  
  /**
   * Toggle price alert enabled status
   * 
   * @param userId - User ID
   * @param alertId - Alert ID
   * @param enabled - Enabled status
   * @returns Updated price alert
   */
  async toggle(userId: string, alertId: string, enabled: boolean): Promise<PriceAlert> {
    const [updated] = await this.db`
      UPDATE alert_rules
      SET
        enabled = ${enabled},
        updated_at = NOW()
      WHERE id = ${alertId}
        AND user_id = ${userId}
        AND type = 'price'
      RETURNING *
    `;
    
    if (!updated) {
      throw new Error('Price alert not found');
    }
    
    return this.mapToAlert(updated);
  }
  
  /**
   * Count price alerts for a user
   * 
   * @param userId - User ID
   * @returns Alert count
   */
  async count(userId: string): Promise<number> {
    const [{ count }] = await this.db`
      SELECT COUNT(*) as count
      FROM alert_rules
      WHERE user_id = ${userId}
        AND type = 'price'
    `;
    
    return parseInt(count);
  }
  
  /**
   * Get user tier (Pro or Premium)
   *
   * @param userId - User ID
   * @returns User tier
   */
  private async getUserTier(userId: string): Promise<'pro' | 'premium'> {
    try {
      // Query subscriptions table for user tier
      const [subscription] = await this.db`
        SELECT tier, status
        FROM subscriptions
        WHERE user_id = ${userId}
          AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!subscription || !subscription.tier) {
        // No active subscription found or tier is null, default to 'pro'
        return 'pro';
      }

      // Map tier values to 'pro' or 'premium'
      // Tier values from database: 'free', 'basic', 'pro', 'enterprise', 'premium'
      const tier = subscription.tier.toLowerCase();

      if (tier === 'premium' || tier === 'enterprise') {
        return 'premium';
      }

      // Default to 'pro' for 'free', 'basic', 'pro', or unknown tiers
      return 'pro';
    } catch (error) {
      console.error('Error fetching user tier:', error);
      // On error, default to 'pro' tier (safer default)
      return 'pro';
    }
  }
  
  /**
   * Map database row to PriceAlert
   *
   * @param row - Database row
   * @returns Price alert
   */
  private mapToAlert(row: any): PriceAlert {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      type: row.type,
      conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions,
      actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions,
      enabled: row.enabled,
      throttle_minutes: row.throttle_minutes,
      last_triggered_at: row.last_triggered_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// Export singleton instance
export const priceAlertService = new PriceAlertService();

