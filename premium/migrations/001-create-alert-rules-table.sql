-- ============================================================================
-- Migration: 001 - Create Alert Rules Table
-- Story: Story 1.1.1 - Configure Whale Alert Thresholds
-- EPIC: EPIC-1 - Smart Alerts & Notifications
-- Created: 2025-10-18
-- ============================================================================

-- Create alert_rules table
CREATE TABLE IF NOT EXISTS alert_rules (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Information
  user_id VARCHAR(255) NOT NULL,
  
  -- Alert Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'whale',
  
  -- Alert Conditions (JSONB for flexibility)
  conditions JSONB NOT NULL,
  
  -- Alert Actions (JSONB for flexibility)
  actions JSONB NOT NULL,
  
  -- Alert Status
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Throttle Configuration
  throttle_minutes INTEGER NOT NULL DEFAULT 5,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT alert_rules_type_check CHECK (type IN ('whale', 'price', 'volume', 'gas')),
  CONSTRAINT alert_rules_throttle_check CHECK (throttle_minutes >= 1 AND throttle_minutes <= 1440)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index on user_id for fast user-specific queries
CREATE INDEX IF NOT EXISTS idx_alert_rules_user_id ON alert_rules(user_id);

-- Index on type for filtering by alert type
CREATE INDEX IF NOT EXISTS idx_alert_rules_type ON alert_rules(type);

-- Index on enabled for filtering active alerts
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);

-- Composite index on user_id + type for common queries
CREATE INDEX IF NOT EXISTS idx_alert_rules_user_type ON alert_rules(user_id, type);

-- Composite index on user_id + enabled for active user alerts
CREATE INDEX IF NOT EXISTS idx_alert_rules_user_enabled ON alert_rules(user_id, enabled);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_alert_rules_created_at ON alert_rules(created_at DESC);

-- Index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_alert_rules_updated_at ON alert_rules(updated_at DESC);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_rules_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE alert_rules IS 'Stores user-configured alert rules for whale transactions, price changes, volume spikes, and gas alerts';
COMMENT ON COLUMN alert_rules.id IS 'Unique identifier for the alert rule';
COMMENT ON COLUMN alert_rules.user_id IS 'User identifier (VARCHAR to support various auth systems)';
COMMENT ON COLUMN alert_rules.name IS 'User-friendly name for the alert';
COMMENT ON COLUMN alert_rules.description IS 'Optional description of the alert';
COMMENT ON COLUMN alert_rules.type IS 'Type of alert: whale, price, volume, gas';
COMMENT ON COLUMN alert_rules.conditions IS 'JSONB object containing alert conditions (e.g., min_amount_usd, tokens, chains)';
COMMENT ON COLUMN alert_rules.actions IS 'JSONB object containing notification actions (e.g., channels, webhook_url, telegram_chat_id)';
COMMENT ON COLUMN alert_rules.enabled IS 'Whether the alert is currently active';
COMMENT ON COLUMN alert_rules.throttle_minutes IS 'Minimum minutes between notifications (1-1440)';
COMMENT ON COLUMN alert_rules.created_at IS 'Timestamp when the alert was created';
COMMENT ON COLUMN alert_rules.updated_at IS 'Timestamp when the alert was last updated';

-- ============================================================================
-- Sample Data (for development/testing)
-- ============================================================================

-- Uncomment to insert sample data
-- INSERT INTO alert_rules (user_id, name, description, type, conditions, actions, enabled, throttle_minutes)
-- VALUES (
--   'user_123',
--   'Large ETH Transfers',
--   'Alert me when large ETH transfers occur',
--   'whale',
--   '{"min_amount_usd": 1000000, "tokens": ["ETH", "WETH"], "chains": ["ethereum", "arbitrum"]}'::jsonb,
--   '{"channels": ["email", "push"], "webhook_url": null, "telegram_chat_id": null, "discord_webhook_url": null}'::jsonb,
--   true,
--   5
-- );

-- ============================================================================
-- Rollback Script
-- ============================================================================

-- To rollback this migration, run:
-- DROP TRIGGER IF EXISTS trigger_update_alert_rules_updated_at ON alert_rules;
-- DROP FUNCTION IF EXISTS update_alert_rules_updated_at();
-- DROP TABLE IF EXISTS alert_rules;

