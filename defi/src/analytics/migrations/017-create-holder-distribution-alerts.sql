-- Migration: Create holder_distribution_alerts table
-- Story: 2.2.2 - Holder Distribution Analysis
-- Description: Alert configuration for holder distribution changes

CREATE TABLE IF NOT EXISTS holder_distribution_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  token_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Alert Config
  alert_type VARCHAR(50) NOT NULL, -- 'whale_accumulation', 'whale_distribution', 'concentration_increase', 'holder_count_change'
  threshold DECIMAL(10, 6), -- e.g., 0.5 for 0.5% supply change
  
  -- Notification Channels
  channels JSONB, -- ['email', 'webhook', 'push']
  webhook_url VARCHAR(500),
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP,
  trigger_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_holder_alerts_user_id ON holder_distribution_alerts(user_id);
CREATE INDEX idx_holder_alerts_token ON holder_distribution_alerts(token_address);
CREATE INDEX idx_holder_alerts_chain ON holder_distribution_alerts(chain_id);
CREATE INDEX idx_holder_alerts_enabled ON holder_distribution_alerts(enabled);
CREATE INDEX idx_holder_alerts_type ON holder_distribution_alerts(alert_type);
CREATE INDEX idx_holder_alerts_composite ON holder_distribution_alerts(token_address, chain_id, enabled);

-- Comments
COMMENT ON TABLE holder_distribution_alerts IS 'Alert configuration for monitoring token holder distribution changes';
COMMENT ON COLUMN holder_distribution_alerts.alert_type IS 'Type of alert: whale_accumulation, whale_distribution, concentration_increase, holder_count_change';
COMMENT ON COLUMN holder_distribution_alerts.threshold IS 'Alert threshold (e.g., 0.5 for 0.5% supply change)';
COMMENT ON COLUMN holder_distribution_alerts.channels IS 'Notification channels: email, webhook, push';

