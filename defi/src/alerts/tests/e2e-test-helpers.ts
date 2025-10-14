/**
 * End-to-End Test Helpers
 * Utilities for testing full alert workflow
 */

import { v4 as uuidv4 } from 'uuid';
import { getAlertsDBConnection } from '../db';
import type { AlertRule, AlertHistory } from '../types';
import type { PriceChangeEvent, TVLChangeEvent, ProtocolEvent } from '../../events/event-types';

// ============================================================================
// Database Setup
// ============================================================================

export async function setupE2EDatabase() {
  const sql = getAlertsDBConnection();

  // Ensure tables exist
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS user_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_token TEXT NOT NULL,
      platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
      device_name TEXT,
      app_version TEXT,
      os_version TEXT,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      alert_type TEXT NOT NULL CHECK (alert_type IN ('price_change', 'tvl_change', 'protocol_event', 'custom')),
      conditions JSONB NOT NULL,
      channels TEXT[] NOT NULL,
      webhook_url TEXT,
      enabled BOOLEAN DEFAULT true,
      throttle_minutes INTEGER DEFAULT 60,
      last_triggered_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS alert_history (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      triggered_at TIMESTAMP DEFAULT NOW(),
      triggered_value NUMERIC,
      threshold_value NUMERIC,
      message TEXT NOT NULL,
      delivery_status JSONB DEFAULT '{}',
      error_details JSONB DEFAULT '{}'
    )
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      alert_history_id TEXT NOT NULL REFERENCES alert_history(id) ON DELETE CASCADE,
      channel TEXT NOT NULL CHECK (channel IN ('email', 'webhook', 'push')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
      error_message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function cleanupE2EDatabase(userId: string) {
  const sql = getAlertsDBConnection();

  // Delete in reverse order of dependencies
  await sql.unsafe(`DELETE FROM notification_logs WHERE alert_history_id IN (SELECT id FROM alert_history WHERE user_id = $1)`, [userId]);
  await sql.unsafe(`DELETE FROM alert_history WHERE user_id = $1`, [userId]);
  await sql.unsafe(`DELETE FROM alert_rules WHERE user_id = $1`, [userId]);
  await sql.unsafe(`DELETE FROM user_devices WHERE user_id = $1`, [userId]);
  await sql.unsafe(`DELETE FROM users WHERE id = $1`, [userId]);
}

// ============================================================================
// Test Data Generators
// ============================================================================

export function generateE2EUser(userId?: string) {
  const id = userId || `e2e-user-${uuidv4()}`;
  return {
    id,
    email: `${id}@example.com`,
    created_at: new Date().toISOString(),
  };
}

export function generateE2EDevice(userId: string, platform: 'ios' | 'android' = 'ios') {
  return {
    id: `e2e-device-${uuidv4()}`,
    user_id: userId,
    device_token: `e2e-token-${uuidv4()}`,
    platform,
    device_name: `E2E Test Device (${platform})`,
    app_version: '1.0.0',
    os_version: platform === 'ios' ? '17.0' : '14.0',
    enabled: true,
    created_at: new Date().toISOString(),
  };
}

export function generateE2EAlertRule(userId: string, overrides?: Partial<AlertRule>): AlertRule {
  return {
    id: uuidv4(),
    user_id: userId,
    name: 'E2E Test Rule',
    description: 'End-to-end test alert rule',
    alert_type: 'price_change',
    protocol_id: 'ethereum',
    token_id: null,
    chain_id: null,
    condition: {
      metric: 'price',
      operator: 'greater_than',
      threshold: 2000,
      target: {
        protocol_id: 'ethereum',
      },
    },
    channels: ['email', 'webhook', 'push'],
    webhook_url: 'http://localhost:3335/webhook',
    enabled: true,
    throttle_minutes: 60,
    last_triggered_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Event Generators
// ============================================================================

export function generatePriceChangeEvent(overrides?: Partial<any>): any {
  const tokenId = overrides?.token_id || 'ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const currentPrice = overrides?.new_price || 2100;
  const previousPrice = overrides?.old_price || 1800;
  const changeAbsolute = currentPrice - previousPrice;
  const changePercent = ((changeAbsolute / previousPrice) * 100);

  return {
    eventId: `test-event-${Date.now()}`,
    eventType: 'price_update',
    timestamp: Date.now(),
    source: 'manual',
    version: '1.0',
    metadata: {
      correlationId: `test-correlation-${Date.now()}`,
      confidence: 1.0,
      processingTime: 100,
      retryCount: 0,
      tags: ['test', 'e2e'],
    },
    data: {
      tokenId,
      symbol: overrides?.token_symbol || 'ETH',
      chain: overrides?.chain || 'ethereum',
      previousPrice,
      currentPrice,
      changePercent,
      changeAbsolute,
      volume24h: overrides?.volume_24h || 15000000000,
      marketCap: overrides?.market_cap || 250000000000,
      decimals: 18,
    },
  };
}

export function generateTVLChangeEvent(overrides?: Partial<TVLChangeEvent>): TVLChangeEvent {
  return {
    event_type: 'tvl_change',
    timestamp: Date.now(),
    protocol_id: 'uniswap',
    protocol_name: 'Uniswap',
    chain: 'ethereum',
    old_tvl: 5000000000,
    new_tvl: 5500000000,
    change_percent: 10,
    ...overrides,
  };
}

export function generateProtocolEvent(overrides?: Partial<ProtocolEvent>): ProtocolEvent {
  return {
    event_type: 'protocol_event',
    timestamp: Date.now(),
    protocol_id: 'aave',
    protocol_name: 'Aave',
    chain: 'ethereum',
    event_name: 'new_market',
    event_data: {
      market: 'USDC',
      apy: 5.5,
    },
    ...overrides,
  };
}

// ============================================================================
// Verification Utilities
// ============================================================================

export async function verifyAlertCreated(ruleId: string): Promise<AlertHistory | null> {
  const sql = getAlertsDBConnection();
  const results = await sql.unsafe<AlertHistory[]>(`
    SELECT * FROM alert_history
    WHERE alert_rule_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [ruleId]);

  return results.length > 0 ? results[0] : null;
}

export async function verifyNotificationSent(alertHistoryId: string, channel: string): Promise<boolean> {
  const sql = getAlertsDBConnection();
  const results = await sql.unsafe(`
    SELECT * FROM notification_logs
    WHERE alert_history_id = $1 AND channel = $2 AND status = 'sent'
  `, [alertHistoryId, channel]);

  return results.length > 0;
}

export async function verifyDeliveryStatus(alertHistoryId: string): Promise<any> {
  const sql = getAlertsDBConnection();
  const results = await sql.unsafe(`
    SELECT delivery_status FROM alert_history
    WHERE id = $1
  `, [alertHistoryId]);

  return results.length > 0 ? results[0].delivery_status : null;
}

export async function verifyRuleThrottled(ruleId: string): Promise<boolean> {
  const sql = getAlertsDBConnection();
  const results = await sql.unsafe(`
    SELECT last_triggered_at FROM alert_rules
    WHERE id = $1
  `, [ruleId]);

  if (results.length === 0) return false;

  const lastTriggered = results[0].last_triggered_at;
  return lastTriggered !== null;
}

export async function getAllAlertHistory(ruleId: string): Promise<AlertHistory[]> {
  const sql = getAlertsDBConnection();
  return await sql.unsafe<AlertHistory[]>(`
    SELECT * FROM alert_history
    WHERE alert_rule_id = $1
    ORDER BY created_at DESC
  `, [ruleId]);
}

export async function getAllNotificationLogs(alertHistoryId: string): Promise<any[]> {
  const sql = getAlertsDBConnection();
  return await sql.unsafe(`
    SELECT * FROM notification_logs
    WHERE alert_history_id = $1
    ORDER BY created_at ASC
  `, [alertHistoryId]);
}

// ============================================================================
// Async Utilities
// ============================================================================

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitFor(
  condition: () => Promise<boolean>,
  timeout: number = 30000,
  interval: number = 1000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await sleep(interval);
  }

  return false;
}

