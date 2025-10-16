-- Migration: 031-create-protocol-market-risks.sql
-- Story: 3.2.1 - Protocol Risk Assessment
-- Description: Create protocol_market_risks table for market risk analysis

CREATE TABLE IF NOT EXISTS protocol_market_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  
  -- Volume metrics
  daily_volume_usd DECIMAL(20, 2) DEFAULT NULL,
  volume_change_24h_pct DECIMAL(10, 4) DEFAULT NULL,
  volume_change_7d_pct DECIMAL(10, 4) DEFAULT NULL,
  volume_change_30d_pct DECIMAL(10, 4) DEFAULT NULL,
  
  -- User metrics
  active_users_count INTEGER DEFAULT NULL,
  user_change_24h_pct DECIMAL(10, 4) DEFAULT NULL,
  user_change_7d_pct DECIMAL(10, 4) DEFAULT NULL,
  user_change_30d_pct DECIMAL(10, 4) DEFAULT NULL,
  
  -- Volatility metrics
  price_volatility_7d DECIMAL(10, 4) DEFAULT NULL, -- Standard deviation of returns
  price_volatility_30d DECIMAL(10, 4) DEFAULT NULL,
  
  -- Risk score
  market_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_daily_volume CHECK (daily_volume_usd IS NULL OR daily_volume_usd >= 0),
  CONSTRAINT check_active_users CHECK (active_users_count IS NULL OR active_users_count >= 0),
  CONSTRAINT check_market_risk_score CHECK (market_risk_score >= 0 AND market_risk_score <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_risk_protocol_id 
  ON protocol_market_risks(protocol_id);

CREATE INDEX IF NOT EXISTS idx_market_risk_volume 
  ON protocol_market_risks(daily_volume_usd DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_market_risk_score 
  ON protocol_market_risks(market_risk_score ASC);

CREATE INDEX IF NOT EXISTS idx_market_risk_volatility 
  ON protocol_market_risks(price_volatility_30d DESC NULLS LAST);

-- Comments
COMMENT ON TABLE protocol_market_risks IS 'Market risk analysis for DeFi protocols';
COMMENT ON COLUMN protocol_market_risks.price_volatility_30d IS 'Price volatility over 30 days (standard deviation of returns)';

