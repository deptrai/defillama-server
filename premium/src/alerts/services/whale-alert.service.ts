/**
 * Whale Alert Service
 * Story 1.1.1: Configure Whale Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 * 
 * Based on: defi/src/alerts/db.ts (existing alerts module)
 */

import postgres from 'postgres';
import { CreateWhaleAlertRuleDto, UpdateWhaleAlertRuleDto } from '../dto';

// ============================================================================
// Database Connection (Follow existing pattern from defi/src/alerts/db.ts)
// ============================================================================

let alertsDBConnection: ReturnType<typeof postgres>;

function getAlertsDBConnection() {
  if (!alertsDBConnection) {
    // Use PREMIUM_DB if available, otherwise fall back to ALERTS_DB
    const dbUrl = process.env.PREMIUM_DB || process.env.ALERTS_DB;
    if (!dbUrl) {
      throw new Error('Database connection string not found. Set PREMIUM_DB or ALERTS_DB environment variable.');
    }
    alertsDBConnection = postgres(dbUrl, {
      idle_timeout: 90,
      max: 10, // Connection pool size
    });
  }
  return alertsDBConnection;
}

// ============================================================================
// Types
// ============================================================================

export interface WhaleAlertRule {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: 'whale';
  conditions: {
    min_amount_usd: number;
    tokens: string[];
    chains: string[];
  };
  actions: {
    channels: string[];
    webhook_url?: string;
    email_template?: string;
    telegram_chat_id?: string;
    discord_webhook_url?: string;
  };
  enabled: boolean;
  throttle_minutes: number;
  created_at: Date;
  updated_at: Date;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

// ============================================================================
// Whale Alert Service
// ============================================================================

export class WhaleAlertService {
  private db = getAlertsDBConnection();

  /**
   * Create a new whale alert rule
   * @param userId - User ID
   * @param dto - Create whale alert rule DTO
   * @returns Created whale alert rule
   */
  async createWhaleAlertRule(userId: string, dto: CreateWhaleAlertRuleDto): Promise<WhaleAlertRule> {
    const [rule] = await this.db`
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
        ${dto.name},
        ${dto.description || null},
        ${dto.type},
        ${JSON.stringify(dto.conditions)},
        ${JSON.stringify(dto.actions)},
        ${dto.enabled},
        ${dto.throttle_minutes || 5}
      )
      RETURNING *
    `;

    return this.mapToWhaleAlertRule(rule);
  }

  /**
   * Get all whale alert rules for a user
   * @param userId - User ID
   * @param params - Pagination parameters
   * @returns Paginated whale alert rules
   */
  async getWhaleAlertRules(
    userId: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<WhaleAlertRule>> {
    const page = params.page || 1;
    const per_page = params.per_page || 20;
    const offset = (page - 1) * per_page;

    // Get total count
    const [{ count }] = await this.db`
      SELECT COUNT(*) as count
      FROM alert_rules
      WHERE user_id = ${userId} AND type = 'whale'
    `;

    // Get paginated rules
    const rules = await this.db`
      SELECT *
      FROM alert_rules
      WHERE user_id = ${userId} AND type = 'whale'
      ORDER BY created_at DESC
      LIMIT ${per_page}
      OFFSET ${offset}
    `;

    return {
      data: rules.map(rule => this.mapToWhaleAlertRule(rule)),
      pagination: {
        total: parseInt(count),
        page,
        per_page,
        total_pages: Math.ceil(parseInt(count) / per_page)
      }
    };
  }

  /**
   * Get a single whale alert rule by ID
   * @param userId - User ID
   * @param id - Alert rule ID
   * @returns Whale alert rule or null if not found
   */
  async getWhaleAlertRuleById(userId: string, id: string): Promise<WhaleAlertRule | null> {
    const [rule] = await this.db`
      SELECT *
      FROM alert_rules
      WHERE id = ${id} AND user_id = ${userId} AND type = 'whale'
    `;

    return rule ? this.mapToWhaleAlertRule(rule) : null;
  }

  /**
   * Update a whale alert rule
   * @param userId - User ID
   * @param id - Alert rule ID
   * @param dto - Update whale alert rule DTO
   * @returns Updated whale alert rule or null if not found
   */
  async updateWhaleAlertRule(
    userId: string,
    id: string,
    dto: UpdateWhaleAlertRuleDto
  ): Promise<WhaleAlertRule | null> {
    // Build update object
    const updates: any = {
      updated_at: new Date()
    };

    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.conditions !== undefined) updates.conditions = JSON.stringify(dto.conditions);
    if (dto.actions !== undefined) updates.actions = JSON.stringify(dto.actions);
    if (dto.enabled !== undefined) updates.enabled = dto.enabled;
    if (dto.throttle_minutes !== undefined) updates.throttle_minutes = dto.throttle_minutes;

    const [rule] = await this.db`
      UPDATE alert_rules
      SET ${this.db(updates)}
      WHERE id = ${id} AND user_id = ${userId} AND type = 'whale'
      RETURNING *
    `;

    return rule ? this.mapToWhaleAlertRule(rule) : null;
  }

  /**
   * Delete a whale alert rule
   * @param userId - User ID
   * @param id - Alert rule ID
   * @returns True if deleted, false if not found
   */
  async deleteWhaleAlertRule(userId: string, id: string): Promise<boolean> {
    const result = await this.db`
      DELETE FROM alert_rules
      WHERE id = ${id} AND user_id = ${userId} AND type = 'whale'
      RETURNING id
    `;

    return result.length > 0;
  }

  /**
   * Toggle whale alert rule enabled status
   * @param userId - User ID
   * @param id - Alert rule ID
   * @param enabled - New enabled status
   * @returns Updated whale alert rule or null if not found
   */
  async toggleWhaleAlertRule(
    userId: string,
    id: string,
    enabled: boolean
  ): Promise<WhaleAlertRule | null> {
    const [rule] = await this.db`
      UPDATE alert_rules
      SET enabled = ${enabled}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId} AND type = 'whale'
      RETURNING *
    `;

    return rule ? this.mapToWhaleAlertRule(rule) : null;
  }

  /**
   * Get count of whale alert rules for a user
   * @param userId - User ID
   * @returns Count of whale alert rules
   */
  async getWhaleAlertRulesCount(userId: string): Promise<number> {
    const [{ count }] = await this.db`
      SELECT COUNT(*) as count
      FROM alert_rules
      WHERE user_id = ${userId} AND type = 'whale'
    `;

    return parseInt(count);
  }

  // ============================================================================
  // Alias Methods (for backward compatibility with tests)
  // ============================================================================

  /**
   * Alias for createWhaleAlertRule
   */
  async create(userId: string, dto: CreateWhaleAlertRuleDto): Promise<WhaleAlertRule> {
    return this.createWhaleAlertRule(userId, dto);
  }

  /**
   * Alias for getWhaleAlertRules (returns array instead of paginated response)
   */
  async get(userId: string, page: number = 1, perPage: number = 20): Promise<WhaleAlertRule[]> {
    const result = await this.getWhaleAlertRules(userId, { page, per_page: perPage });
    return result.data;
  }

  /**
   * Alias for getWhaleAlertRuleById
   */
  async getById(userId: string, id: string): Promise<WhaleAlertRule | null> {
    return this.getWhaleAlertRuleById(userId, id);
  }

  /**
   * Alias for updateWhaleAlertRule
   */
  async update(userId: string, id: string, dto: UpdateWhaleAlertRuleDto): Promise<WhaleAlertRule | null> {
    return this.updateWhaleAlertRule(userId, id, dto);
  }

  /**
   * Alias for deleteWhaleAlertRule
   */
  async delete(userId: string, id: string): Promise<boolean> {
    return this.deleteWhaleAlertRule(userId, id);
  }

  /**
   * Alias for toggleWhaleAlertRule
   */
  async toggle(userId: string, id: string, enabled: boolean): Promise<WhaleAlertRule | null> {
    return this.toggleWhaleAlertRule(userId, id, enabled);
  }

  /**
   * Alias for getWhaleAlertRulesCount
   */
  async count(userId: string): Promise<number> {
    return this.getWhaleAlertRulesCount(userId);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Map database row to WhaleAlertRule type
   * @param row - Database row
   * @returns Whale alert rule
   */
  private mapToWhaleAlertRule(row: any): WhaleAlertRule {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      type: 'whale',
      conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions,
      actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions,
      enabled: row.enabled,
      throttle_minutes: row.throttle_minutes,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const whaleAlertService = new WhaleAlertService();

