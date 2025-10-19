-- ============================================================================
-- Migration: Create Alert History Table
-- Story: 1.1.5 - View Whale Alert History
-- Date: 2025-10-19
-- Description: Create alert_history table to track triggered alerts and notifications
-- ============================================================================

-- ============================================================================
-- Alert History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_history (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  
  -- Event Data (JSONB for flexibility)
  -- For whale alerts: {chain, token, amount_usd, from, to, tx_hash}
  -- For price alerts: {chain, token, current_price, previous_price, threshold, change_percent}
  event_data JSONB NOT NULL,
  
  -- Notification Status
  notification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed', 'partial')),
  notification_channels TEXT[] NOT NULL DEFAULT '{}',
  delivery_status JSONB DEFAULT '{}',
  notification_error TEXT,
  
  -- Timestamps
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index for user queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_alert_history_user_id ON alert_history(user_id, triggered_at DESC);

-- Index for rule-based queries
CREATE INDEX IF NOT EXISTS idx_alert_history_rule_id ON alert_history(rule_id, triggered_at DESC);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at DESC);

-- Index for notification status queries
CREATE INDEX IF NOT EXISTS idx_alert_history_notification_status ON alert_history(notification_status);

-- GIN index for JSONB event_data queries (filtering by chain, token, etc.)
CREATE INDEX IF NOT EXISTS idx_alert_history_event_data ON alert_history USING GIN (event_data);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE alert_history IS 'Historical record of triggered alerts and notification delivery status';
COMMENT ON COLUMN alert_history.id IS 'Unique identifier for the alert history entry';
COMMENT ON COLUMN alert_history.rule_id IS 'Reference to the alert rule that triggered this alert';
COMMENT ON COLUMN alert_history.user_id IS 'User identifier (VARCHAR to support various auth systems)';
COMMENT ON COLUMN alert_history.event_data IS 'JSONB object containing event details (chain, token, amount, etc.)';
COMMENT ON COLUMN alert_history.notification_status IS 'Overall notification delivery status: pending, sent, failed, partial';
COMMENT ON COLUMN alert_history.notification_channels IS 'Array of notification channels used (email, telegram, discord, webhook)';
COMMENT ON COLUMN alert_history.delivery_status IS 'JSONB object tracking delivery status per channel: {email: "sent", telegram: "failed"}';
COMMENT ON COLUMN alert_history.notification_error IS 'Error message if notification delivery failed';
COMMENT ON COLUMN alert_history.triggered_at IS 'Timestamp when the alert was triggered';
COMMENT ON COLUMN alert_history.notified_at IS 'Timestamp when notifications were sent';
COMMENT ON COLUMN alert_history.created_at IS 'Timestamp when the history entry was created';

-- ============================================================================
-- Sample Data (for development/testing)
-- ============================================================================

-- Uncomment to insert sample data
-- INSERT INTO alert_history (rule_id, user_id, event_data, notification_status, notification_channels, delivery_status, triggered_at, notified_at)
-- SELECT 
--   id as rule_id,
--   user_id,
--   '{"chain": "ethereum", "token": "ETH", "amount_usd": 1500000, "from": "0x123...", "to": "0x456...", "tx_hash": "0xabc..."}'::jsonb as event_data,
--   'sent' as notification_status,
--   ARRAY['email', 'telegram'] as notification_channels,
--   '{"email": "sent", "telegram": "sent"}'::jsonb as delivery_status,
--   NOW() - INTERVAL '1 hour' as triggered_at,
--   NOW() - INTERVAL '1 hour' + INTERVAL '5 seconds' as notified_at
-- FROM alert_rules
-- WHERE type = 'whale'
-- LIMIT 1;

-- ============================================================================
-- Rollback Script
-- ============================================================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_alert_history_event_data;
-- DROP INDEX IF EXISTS idx_alert_history_notification_status;
-- DROP INDEX IF EXISTS idx_alert_history_triggered_at;
-- DROP INDEX IF EXISTS idx_alert_history_rule_id;
-- DROP INDEX IF EXISTS idx_alert_history_user_id;
-- DROP TABLE IF EXISTS alert_history;

