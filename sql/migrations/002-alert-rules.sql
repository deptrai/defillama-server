-- Migration: Add Alert Rules and Alert History tables
-- Date: 2025-10-14
-- Description: Create tables for alert rule management system

-- Alert Rules table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Alert configuration
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'tvl_change',
    'price_change',
    'volume_spike',
    'protocol_event',
    'smart_money',
    'risk_score'
  )),
  
  -- Target configuration (at least one must be specified)
  protocol_id TEXT,
  token_id TEXT,
  chain_id INTEGER,
  
  -- Condition configuration (JSONB for flexibility)
  condition JSONB NOT NULL,
  -- Example conditions:
  -- {"operator": ">", "threshold": 1000000000, "metric": "tvl"}
  -- {"operator": ">", "threshold": 5, "metric": "price_change_24h", "unit": "percent"}
  -- {"type": "and", "conditions": [{"operator": ">", "threshold": 1000000000}, {"operator": "<", "threshold": 2000000000}]}
  
  -- Notification configuration
  channels JSONB NOT NULL DEFAULT '[]',
  -- Example: ["email", "webhook", "push"]
  
  -- Throttling configuration
  throttle_minutes INTEGER DEFAULT 5 CHECK (throttle_minutes >= 0),
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure at least one target is specified
  CONSTRAINT alert_target_check CHECK (
    protocol_id IS NOT NULL OR token_id IS NOT NULL OR chain_id IS NOT NULL
  )
);

-- Alert History table (for audit trail and throttling)
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  
  -- Trigger information
  triggered_value DECIMAL(20,8) NOT NULL,
  threshold_value DECIMAL(20,8) NOT NULL,
  message TEXT NOT NULL,
  
  -- Notification delivery
  notification_channels TEXT[] NOT NULL,
  delivery_status JSONB,
  -- Example: {"email": "sent", "webhook": "failed", "push": "pending"}
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_alert_rules_user ON alert_rules(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_type ON alert_rules(alert_type, enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_protocol ON alert_rules(protocol_id) WHERE protocol_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alert_rules_token ON alert_rules(token_id) WHERE token_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alert_rules_chain ON alert_rules(chain_id) WHERE chain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_alert_rules_last_triggered ON alert_rules(last_triggered_at) WHERE last_triggered_at IS NOT NULL;

-- GIN index for JSONB condition queries
CREATE INDEX IF NOT EXISTS idx_alert_rules_condition ON alert_rules USING GIN (condition);

-- Alert history indexes
CREATE INDEX IF NOT EXISTS idx_alert_history_rule ON alert_history(alert_rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_user ON alert_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_created ON alert_history(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_rules_updated_at();

-- Comments for documentation
COMMENT ON TABLE alert_rules IS 'User-defined alert rules for monitoring DeFi protocols, tokens, and chains';
COMMENT ON TABLE alert_history IS 'Historical record of triggered alerts for audit and throttling purposes';

COMMENT ON COLUMN alert_rules.condition IS 'JSONB field containing flexible condition configuration with operators, thresholds, and metrics';
COMMENT ON COLUMN alert_rules.channels IS 'JSONB array of notification channels: email, webhook, push';
COMMENT ON COLUMN alert_rules.throttle_minutes IS 'Minimum minutes between alert notifications to prevent spam';
COMMENT ON COLUMN alert_history.delivery_status IS 'JSONB object tracking delivery status per channel';

