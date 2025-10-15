-- Migration: Create yield_alerts table
-- Story: 2.1.2 - Yield Opportunity Scanner
-- Description: Stores user alert configurations for yield changes

CREATE TABLE IF NOT EXISTS yield_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  opportunity_id UUID REFERENCES yield_opportunities(id) ON DELETE SET NULL,
  
  -- Alert Config
  alert_type VARCHAR(50) NOT NULL, -- 'yield_increase', 'yield_decrease', 'new_opportunity', 'risk_change'
  threshold DECIMAL(10, 4), -- e.g., 10 for 10% change
  min_apy DECIMAL(10, 4), -- minimum APY to trigger
  max_risk_score INTEGER, -- maximum risk score
  
  -- Filters
  protocol_ids VARCHAR(255)[],
  chain_ids VARCHAR(50)[],
  pool_types VARCHAR(50)[],
  
  -- Delivery Channels
  channels VARCHAR(50)[], -- ['email', 'webhook', 'push']
  webhook_url VARCHAR(500),
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP,
  trigger_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT yield_alerts_valid_type CHECK (alert_type IN ('yield_increase', 'yield_decrease', 'new_opportunity', 'risk_change')),
  CONSTRAINT yield_alerts_valid_threshold CHECK (threshold IS NULL OR threshold >= 0),
  CONSTRAINT yield_alerts_valid_min_apy CHECK (min_apy IS NULL OR min_apy >= 0),
  CONSTRAINT yield_alerts_valid_max_risk CHECK (max_risk_score IS NULL OR (max_risk_score >= 0 AND max_risk_score <= 100))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_yield_alerts_user_id ON yield_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_yield_alerts_enabled ON yield_alerts(enabled);
CREATE INDEX IF NOT EXISTS idx_yield_alerts_opportunity_id ON yield_alerts(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_yield_alerts_alert_type ON yield_alerts(alert_type);

-- Composite index for alert matching queries
CREATE INDEX IF NOT EXISTS idx_yield_alerts_matching ON yield_alerts(enabled, alert_type) WHERE enabled = TRUE;

-- Comments
COMMENT ON TABLE yield_alerts IS 'User alert configurations for yield opportunity changes';
COMMENT ON COLUMN yield_alerts.alert_type IS 'Type of alert: yield_increase, yield_decrease, new_opportunity, risk_change';
COMMENT ON COLUMN yield_alerts.threshold IS 'Percentage change threshold to trigger alert (e.g., 10 for 10%)';
COMMENT ON COLUMN yield_alerts.min_apy IS 'Minimum APY required to trigger alert';
COMMENT ON COLUMN yield_alerts.max_risk_score IS 'Maximum risk score allowed (0-100)';
COMMENT ON COLUMN yield_alerts.channels IS 'Delivery channels: email, webhook, push';
COMMENT ON COLUMN yield_alerts.trigger_count IS 'Number of times this alert has been triggered';

