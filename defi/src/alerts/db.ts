/**
 * Alert Rules Database Layer
 * Database operations for alert rule management using postgres library
 */

import postgres from 'postgres';
import {
  AlertRule,
  AlertRuleFilters,
  AlertRulePagination,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AlertHistory,
} from './types';

// Database connection
let alertsDBConnection: ReturnType<typeof postgres>;

export function getAlertsDBConnection() {
  if (!alertsDBConnection) {
    // Use ALERTS_DB if available, otherwise fall back to ACCOUNTS_DB
    const dbUrl = process.env.ALERTS_DB || process.env.ACCOUNTS_DB;
    if (!dbUrl) {
      throw new Error('Database connection string not found. Set ALERTS_DB or ACCOUNTS_DB environment variable.');
    }
    alertsDBConnection = postgres(dbUrl, {
      idle_timeout: 90,
      max: 10,
    });
  }
  return alertsDBConnection;
}

/**
 * Create a new alert rule
 */
export async function createAlertRule(
  userId: string,
  data: CreateAlertRuleRequest
): Promise<AlertRule> {
  const sql = getAlertsDBConnection();

  const result = await sql`
    INSERT INTO alert_rules (
      user_id,
      name,
      description,
      alert_type,
      protocol_id,
      token_id,
      chain_id,
      condition,
      channels,
      throttle_minutes,
      enabled
    ) VALUES (
      ${userId},
      ${data.name},
      ${data.description || null},
      ${data.alert_type},
      ${data.protocol_id || null},
      ${data.token_id || null},
      ${data.chain_id || null},
      ${JSON.stringify(data.condition)},
      ${JSON.stringify(data.channels)},
      ${data.throttle_minutes || 5},
      ${data.enabled !== undefined ? data.enabled : true}
    )
    RETURNING *
  `;

  return mapDatabaseRowToAlertRule(result[0]);
}

/**
 * Get alert rules with filters and pagination
 */
export async function getAlertRules(
  filters: AlertRuleFilters,
  pagination: AlertRulePagination
): Promise<{ rules: AlertRule[]; total: number }> {
  const sql = getAlertsDBConnection();

  // Build WHERE clause parts
  let whereClause = 'user_id = $1';
  const params: any[] = [filters.user_id];
  let paramIndex = 2;

  if (filters.alert_type) {
    whereClause += ` AND alert_type = $${paramIndex}`;
    params.push(filters.alert_type);
    paramIndex++;
  }
  if (filters.protocol_id) {
    whereClause += ` AND protocol_id = $${paramIndex}`;
    params.push(filters.protocol_id);
    paramIndex++;
  }
  if (filters.token_id) {
    whereClause += ` AND token_id = $${paramIndex}`;
    params.push(filters.token_id);
    paramIndex++;
  }
  if (filters.chain_id !== undefined) {
    whereClause += ` AND chain_id = $${paramIndex}`;
    params.push(filters.chain_id);
    paramIndex++;
  }
  if (filters.enabled !== undefined) {
    whereClause += ` AND enabled = $${paramIndex}`;
    params.push(filters.enabled);
    paramIndex++;
  }

  // Build ORDER BY clause
  const orderByColumn = pagination.sort_by || 'created_at';
  const orderDirection = pagination.sort_order === 'asc' ? 'ASC' : 'DESC';

  // Get total count using unsafe for dynamic WHERE
  const countQuery = `SELECT COUNT(*) as total FROM alert_rules WHERE ${whereClause}`;
  const countResult = await sql.unsafe(countQuery, params);
  const total = parseInt(countResult[0].total);

  // Get paginated results
  const selectQuery = `
    SELECT * FROM alert_rules
    WHERE ${whereClause}
    ORDER BY ${orderByColumn} ${orderDirection}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(pagination.limit, pagination.offset);
  const results = await sql.unsafe(selectQuery, params);

  const rules = results.map(mapDatabaseRowToAlertRule);

  return { rules, total };
}

/**
 * Get a single alert rule by ID
 */
export async function getAlertRuleById(
  userId: string,
  ruleId: string
): Promise<AlertRule | null> {
  const sql = getAlertsDBConnection();

  const result = await sql`
    SELECT *
    FROM alert_rules
    WHERE id = ${ruleId} AND user_id = ${userId}
  `;

  if (result.length === 0) {
    return null;
  }

  return mapDatabaseRowToAlertRule(result[0]);
}

/**
 * Update an alert rule
 */
export async function updateAlertRule(
  userId: string,
  ruleId: string,
  data: UpdateAlertRuleRequest
): Promise<AlertRule | null> {
  const sql = getAlertsDBConnection();

  // Build SET clause dynamically
  const updates: any = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.alert_type !== undefined) updates.alert_type = data.alert_type;
  if (data.protocol_id !== undefined) updates.protocol_id = data.protocol_id;
  if (data.token_id !== undefined) updates.token_id = data.token_id;
  if (data.chain_id !== undefined) updates.chain_id = data.chain_id;
  if (data.condition !== undefined) updates.condition = JSON.stringify(data.condition);
  if (data.channels !== undefined) updates.channels = JSON.stringify(data.channels);
  if (data.throttle_minutes !== undefined) updates.throttle_minutes = data.throttle_minutes;
  if (data.enabled !== undefined) updates.enabled = data.enabled;

  if (Object.keys(updates).length === 0) {
    // No updates provided, return current rule
    return getAlertRuleById(userId, ruleId);
  }

  const result = await sql`
    UPDATE alert_rules
    SET ${sql(updates, ...Object.keys(updates))}
    WHERE id = ${ruleId} AND user_id = ${userId}
    RETURNING *
  `;

  if (result.length === 0) {
    return null;
  }

  return mapDatabaseRowToAlertRule(result[0]);
}

/**
 * Delete an alert rule
 */
export async function deleteAlertRule(
  userId: string,
  ruleId: string
): Promise<boolean> {
  const sql = getAlertsDBConnection();

  const result = await sql`
    DELETE FROM alert_rules
    WHERE id = ${ruleId} AND user_id = ${userId}
    RETURNING id
  `;

  return result.length > 0;
}

/**
 * Update last_triggered_at timestamp
 */
export async function updateLastTriggered(ruleId: string): Promise<void> {
  const sql = getAlertsDBConnection();

  await sql`
    UPDATE alert_rules
    SET last_triggered_at = NOW()
    WHERE id = ${ruleId}
  `;
}

/**
 * Create alert history entry
 */
export async function createAlertHistory(
  ruleId: string,
  userId: string,
  triggeredValue: number,
  thresholdValue: number,
  message: string,
  channels: string[],
  deliveryStatus?: Record<string, string>
): Promise<AlertHistory> {
  const sql = getAlertsDBConnection();

  const result = await sql`
    INSERT INTO alert_history (
      alert_rule_id,
      user_id,
      triggered_value,
      threshold_value,
      message,
      notification_channels,
      delivery_status
    ) VALUES (
      ${ruleId},
      ${userId},
      ${triggeredValue},
      ${thresholdValue},
      ${message},
      ${channels},
      ${deliveryStatus ? JSON.stringify(deliveryStatus) : null}
    )
    RETURNING *
  `;

  return mapDatabaseRowToAlertHistory(result[0]);
}

/**
 * Get alert history for a rule
 */
export async function getAlertHistory(
  userId: string,
  ruleId: string,
  limit: number = 50
): Promise<AlertHistory[]> {
  const sql = getAlertsDBConnection();

  const results = await sql`
    SELECT *
    FROM alert_history
    WHERE alert_rule_id = ${ruleId} AND user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return results.map(mapDatabaseRowToAlertHistory);
}

/**
 * Get recent alert history for throttling check
 */
export async function getRecentAlertHistory(
  ruleId: string,
  minutesAgo: number
): Promise<AlertHistory[]> {
  const sql = getAlertsDBConnection();

  const results = await sql`
    SELECT *
    FROM alert_history
    WHERE alert_rule_id = ${ruleId}
      AND created_at > NOW() - INTERVAL '${minutesAgo} minutes'
    ORDER BY created_at DESC
  `;

  return results.map(mapDatabaseRowToAlertHistory);
}

/**
 * Map database row to AlertRule object
 */
function mapDatabaseRowToAlertRule(row: any): AlertRule {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description,
    alert_type: row.alert_type,
    protocol_id: row.protocol_id,
    token_id: row.token_id,
    chain_id: row.chain_id,
    condition: typeof row.condition === 'string' ? JSON.parse(row.condition) : row.condition,
    channels: typeof row.channels === 'string' ? JSON.parse(row.channels) : row.channels,
    throttle_minutes: row.throttle_minutes,
    enabled: row.enabled,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_triggered_at: row.last_triggered_at,
  };
}

/**
 * Map database row to AlertHistory object
 */
function mapDatabaseRowToAlertHistory(row: any): AlertHistory {
  return {
    id: row.id,
    alert_rule_id: row.alert_rule_id,
    user_id: row.user_id,
    triggered_value: parseFloat(row.triggered_value),
    threshold_value: parseFloat(row.threshold_value),
    message: row.message,
    notification_channels: row.notification_channels,
    delivery_status: row.delivery_status ? 
      (typeof row.delivery_status === 'string' ? JSON.parse(row.delivery_status) : row.delivery_status) : 
      undefined,
    created_at: row.created_at,
  };
}

/**
 * Close database connection (for cleanup)
 */
export async function closeAlertsDBConnection(): Promise<void> {
  if (alertsDBConnection) {
    await alertsDBConnection.end({ timeout: 2 });
  }
}

