import postgres from 'postgres';
import { CreateGasAlertDto, UpdateGasAlertDto, validateConditionalFields } from '../dto';

/**
 * Gas Alert Service
 * 
 * Handles CRUD operations for gas fee alerts
 * 
 * Story 1.3.1: Configure Gas Alert Thresholds
 * Feature ID: F-003
 * EPIC-1: Smart Alerts & Notifications
 */

// Database connection
const db = postgres(process.env.PREMIUM_DB || process.env.ALERTS_DB || '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Gas alert interface
export interface GasAlert {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: 'gas';
  conditions: {
    chain: string;
    threshold_gwei: number;
    alert_type: 'below' | 'spike';
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

export class GasAlertService {
  private db: postgres.Sql;

  constructor(database?: postgres.Sql) {
    this.db = database || db;
  }

  /**
   * Create a new gas alert
   *
   * @param userId - User ID
   * @param data - Gas alert data
   * @returns Created gas alert
   */
  async create(userId: string, data: CreateGasAlertDto): Promise<GasAlert> {
    // Validate conditional fields
    const validation = validateConditionalFields(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Check alert limit (200 for Pro, unlimited for Premium)
    const count = await this.count(userId);
    const userTier = await this.getUserTier(userId);
    
    if (userTier === 'pro' && count >= 200) {
      throw new Error('Alert limit exceeded. Pro tier allows maximum 200 gas alerts. Upgrade to Premium for unlimited alerts.');
    }
    
    // Build conditions object
    const conditions = {
      chain: data.chain,
      threshold_gwei: data.thresholdGwei,
      alert_type: data.alertType,
    };
    
    // Build actions object
    const actions: any = {
      channels: data.notificationChannels,
    };
    
    if (data.webhookUrl) {
      actions.webhook_url = data.webhookUrl;
    }
    
    if (data.telegramChatId) {
      actions.telegram_chat_id = data.telegramChatId;
    }
    
    if (data.discordWebhookUrl) {
      actions.discord_webhook_url = data.discordWebhookUrl;
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
        ${data.name || `Gas Alert - ${data.chain} below ${data.thresholdGwei} Gwei`},
        ${data.description || null},
        'gas',
        ${JSON.stringify(conditions)},
        ${JSON.stringify(actions)},
        ${data.enabled},
        ${data.throttleMinutes}
      )
      RETURNING *
    `;
    
    return this.mapToAlert(alert);
  }

  /**
   * Get all gas alerts for a user
   *
   * @param userId - User ID
   * @param page - Page number (1-based)
   * @param perPage - Items per page
   * @returns Paginated gas alerts
   */
  async findAll(userId: string, page: number = 1, perPage: number = 20): Promise<{
    data: GasAlert[];
    pagination: {
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    };
  }> {
    const offset = (page - 1) * perPage;
    
    // Get total count
    const [{ count }] = await this.db`
      SELECT COUNT(*) as count
      FROM alert_rules
      WHERE user_id = ${userId}
        AND type = 'gas'
    `;
    
    // Get paginated results
    const alerts = await this.db`
      SELECT *
      FROM alert_rules
      WHERE user_id = ${userId}
        AND type = 'gas'
      ORDER BY created_at DESC
      LIMIT ${perPage}
      OFFSET ${offset}
    `;
    
    return {
      data: alerts.map(alert => this.mapToAlert(alert)),
      pagination: {
        total: parseInt(count),
        page,
        per_page: perPage,
        total_pages: Math.ceil(parseInt(count) / perPage),
      },
    };
  }

  /**
   * Get a single gas alert by ID
   *
   * @param userId - User ID
   * @param id - Alert ID
   * @returns Gas alert or null
   */
  async findById(userId: string, id: string): Promise<GasAlert | null> {
    const [alert] = await this.db`
      SELECT *
      FROM alert_rules
      WHERE id = ${id}
        AND user_id = ${userId}
        AND type = 'gas'
    `;
    
    return alert ? this.mapToAlert(alert) : null;
  }

  /**
   * Update a gas alert
   *
   * @param userId - User ID
   * @param id - Alert ID
   * @param data - Update data
   * @returns Updated gas alert or null
   */
  async update(userId: string, id: string, data: UpdateGasAlertDto): Promise<GasAlert | null> {
    // Get existing alert
    const existing = await this.findById(userId, id);
    if (!existing) {
      return null;
    }
    
    // Build update conditions
    const conditions = {
      ...existing.conditions,
      ...(data.chain && { chain: data.chain }),
      ...(data.thresholdGwei && { threshold_gwei: data.thresholdGwei }),
      ...(data.alertType && { alert_type: data.alertType }),
    };
    
    // Build update actions
    const actions = {
      ...existing.actions,
      ...(data.notificationChannels && { channels: data.notificationChannels }),
      ...(data.webhookUrl && { webhook_url: data.webhookUrl }),
      ...(data.telegramChatId && { telegram_chat_id: data.telegramChatId }),
      ...(data.discordWebhookUrl && { discord_webhook_url: data.discordWebhookUrl }),
    };
    
    // Update database
    const [alert] = await this.db`
      UPDATE alert_rules
      SET
        name = ${data.name || existing.name},
        description = ${data.description !== undefined ? data.description : existing.description},
        conditions = ${JSON.stringify(conditions)},
        actions = ${JSON.stringify(actions)},
        enabled = ${data.enabled !== undefined ? data.enabled : existing.enabled},
        throttle_minutes = ${data.throttleMinutes || existing.throttle_minutes},
        updated_at = NOW()
      WHERE id = ${id}
        AND user_id = ${userId}
        AND type = 'gas'
      RETURNING *
    `;
    
    return alert ? this.mapToAlert(alert) : null;
  }

  /**
   * Delete a gas alert
   *
   * @param userId - User ID
   * @param id - Alert ID
   * @returns True if deleted, false if not found
   */
  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.db`
      DELETE FROM alert_rules
      WHERE id = ${id}
        AND user_id = ${userId}
        AND type = 'gas'
      RETURNING id
    `;
    
    return result.length > 0;
  }

  /**
   * Toggle gas alert enabled status
   *
   * @param userId - User ID
   * @param id - Alert ID
   * @param enabled - New enabled status
   * @returns Updated gas alert or null
   */
  async toggle(userId: string, id: string, enabled: boolean): Promise<GasAlert | null> {
    const [alert] = await this.db`
      UPDATE alert_rules
      SET
        enabled = ${enabled},
        updated_at = NOW()
      WHERE id = ${id}
        AND user_id = ${userId}
        AND type = 'gas'
      RETURNING *
    `;
    
    return alert ? this.mapToAlert(alert) : null;
  }

  /**
   * Count gas alerts for a user
   *
   * @param userId - User ID
   * @returns Alert count
   */
  async count(userId: string): Promise<number> {
    const [{ count }] = await this.db`
      SELECT COUNT(*) as count
      FROM alert_rules
      WHERE user_id = ${userId}
        AND type = 'gas'
    `;
    
    return parseInt(count);
  }

  /**
   * Get user tier (mock implementation)
   * TODO: Implement actual user tier lookup
   *
   * @param userId - User ID
   * @returns User tier
   */
  private async getUserTier(userId: string): Promise<'free' | 'pro' | 'premium'> {
    // Mock implementation - always return 'premium' for now
    // TODO: Implement actual user tier lookup from subscriptions table
    return 'premium';
  }

  /**
   * Map database row to GasAlert interface
   *
   * @param row - Database row
   * @returns GasAlert
   */
  private mapToAlert(row: any): GasAlert {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      type: row.type,
      conditions: row.conditions,
      actions: row.actions,
      enabled: row.enabled,
      throttle_minutes: row.throttle_minutes,
      last_triggered_at: row.last_triggered_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// Export singleton instance
export const gasAlertService = new GasAlertService();

