/**
 * Delivery Tracker
 * Tracks notification delivery status and errors
 * Story 1.3: Alert Engine and Notification System - Phase 6.3
 */

import { getAlertsDBConnection } from '../../db';

// ============================================================================
// Delivery Status Types
// ============================================================================

export type DeliveryStatus = 'sent' | 'failed' | 'pending';
export type NotificationChannel = 'email' | 'webhook' | 'push';

export interface DeliveryResult {
  channel: NotificationChannel;
  status: DeliveryStatus;
  error?: string;
  recipient?: string;
}

// ============================================================================
// Update Delivery Status
// ============================================================================

/**
 * Update delivery status for a single channel
 */
export async function updateDeliveryStatus(
  alertHistoryId: string,
  channel: NotificationChannel,
  status: DeliveryStatus,
  error?: string
): Promise<void> {
  const sql = getAlertsDBConnection();

  // Update delivery_status JSONB
  const query = `
    UPDATE alert_history
    SET delivery_status = jsonb_set(
      COALESCE(delivery_status, '{}'::jsonb),
      '{${channel}}',
      '"${status}"'
    )
    WHERE id = $1
  `;

  await sql.unsafe(query, [alertHistoryId]);

  // Update error_details if error exists
  if (error) {
    const errorQuery = `
      UPDATE alert_history
      SET error_details = jsonb_set(
        COALESCE(error_details, '{}'::jsonb),
        '{${channel}}',
        $2
      )
      WHERE id = $1
    `;

    await sql.unsafe(errorQuery, [alertHistoryId, JSON.stringify(error)]);
  }
}

/**
 * Batch update delivery status for multiple channels
 */
export async function batchUpdateDeliveryStatus(
  alertHistoryId: string,
  results: DeliveryResult[]
): Promise<void> {
  const sql = getAlertsDBConnection();

  // Build delivery_status object
  const deliveryStatus: Record<string, DeliveryStatus> = {};
  const errorDetails: Record<string, string> = {};

  results.forEach(result => {
    deliveryStatus[result.channel] = result.status;
    if (result.error) {
      errorDetails[result.channel] = result.error;
    }
  });

  // Update delivery_status
  const statusQuery = `
    UPDATE alert_history
    SET delivery_status = $2
    WHERE id = $1
  `;

  await sql.unsafe(statusQuery, [alertHistoryId, deliveryStatus]);

  // Update error_details if any errors
  if (Object.keys(errorDetails).length > 0) {
    const errorQuery = `
      UPDATE alert_history
      SET error_details = $2
      WHERE id = $1
    `;

    await sql.unsafe(errorQuery, [alertHistoryId, errorDetails]);
  }
}

// ============================================================================
// Notification Logs
// ============================================================================

export interface NotificationLog {
  alert_history_id: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  recipient?: string;
  error_message?: string;
  retry_count?: number;
}

/**
 * Create notification log entry
 */
export async function createNotificationLog(log: NotificationLog): Promise<void> {
  const sql = getAlertsDBConnection();

  const query = `
    INSERT INTO notification_logs (
      alert_history_id,
      channel,
      status,
      recipient,
      error_message,
      retry_count,
      sent_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;

  const sentAt = log.status === 'sent' ? new Date() : null;

  await sql.unsafe(query, [
    log.alert_history_id,
    log.channel,
    log.status,
    log.recipient || null,
    log.error_message || null,
    log.retry_count || 0,
    sentAt,
  ]);
}

/**
 * Batch create notification logs
 */
export async function batchCreateNotificationLogs(
  logs: NotificationLog[]
): Promise<void> {
  const sql = getAlertsDBConnection();

  if (logs.length === 0) {
    return;
  }

  // Build values array
  const values: any[] = [];
  const placeholders: string[] = [];

  logs.forEach((log, index) => {
    const offset = index * 7;
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
    );

    const sentAt = log.status === 'sent' ? new Date() : null;

    values.push(
      log.alert_history_id,
      log.channel,
      log.status,
      log.recipient || null,
      log.error_message || null,
      log.retry_count || 0,
      sentAt
    );
  });

  const query = `
    INSERT INTO notification_logs (
      alert_history_id,
      channel,
      status,
      recipient,
      error_message,
      retry_count,
      sent_at
    ) VALUES ${placeholders.join(', ')}
  `;

  await sql.unsafe(query, values);
}

// ============================================================================
// Query Delivery Status
// ============================================================================

/**
 * Get delivery status for alert history
 */
export async function getDeliveryStatus(
  alertHistoryId: string
): Promise<Record<string, DeliveryStatus>> {
  const sql = getAlertsDBConnection();

  const query = `
    SELECT delivery_status
    FROM alert_history
    WHERE id = $1
  `;

  const result = await sql.unsafe(query, [alertHistoryId]);

  if (result.length === 0) {
    throw new Error(`Alert history not found: ${alertHistoryId}`);
  }

  return result[0].delivery_status || {};
}

/**
 * Get error details for alert history
 */
export async function getErrorDetails(
  alertHistoryId: string
): Promise<Record<string, string>> {
  const sql = getAlertsDBConnection();

  const query = `
    SELECT error_details
    FROM alert_history
    WHERE id = $1
  `;

  const result = await sql.unsafe(query, [alertHistoryId]);

  if (result.length === 0) {
    throw new Error(`Alert history not found: ${alertHistoryId}`);
  }

  return result[0].error_details || {};
}

/**
 * Get notification logs for alert history
 */
export async function getNotificationLogs(
  alertHistoryId: string
): Promise<NotificationLog[]> {
  const sql = getAlertsDBConnection();

  const query = `
    SELECT *
    FROM notification_logs
    WHERE alert_history_id = $1
    ORDER BY created_at DESC
  `;

  const results = await sql.unsafe(query, [alertHistoryId]);

  return results.map(row => ({
    alert_history_id: row.alert_history_id,
    channel: row.channel,
    status: row.status,
    recipient: row.recipient,
    error_message: row.error_message,
    retry_count: row.retry_count,
  }));
}

