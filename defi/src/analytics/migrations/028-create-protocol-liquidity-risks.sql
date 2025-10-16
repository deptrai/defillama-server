-- Migration: 028-create-protocol-liquidity-risks.sql
-- Story: 3.2.1 - Protocol Risk Assessment
-- Description: Create protocol_liquidity_risks table for liquidity risk analysis

CREATE TABLE IF NOT EXISTS protocol_liquidity_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  
  -- TVL metrics
  current_tvl_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
  tvl_change_24h_pct DECIMAL(10, 4) DEFAULT NULL,
  tvl_change_7d_pct DECIMAL(10, 4) DEFAULT NULL,
  tvl_change_30d_pct DECIMAL(10, 4) DEFAULT NULL,
  
  -- Liquidity depth
  liquidity_depth_score DECIMAL(5, 2) DEFAULT NULL, -- 0-100, higher is better
  
  -- Concentration metrics
  top_10_holders_concentration_pct DECIMAL(5, 2) DEFAULT NULL, -- 0-100
  top_50_holders_concentration_pct DECIMAL(5, 2) DEFAULT NULL, -- 0-100
  liquidity_provider_count INTEGER DEFAULT NULL,
  
  -- Risk score
  liquidity_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_current_tvl CHECK (current_tvl_usd >= 0),
  CONSTRAINT check_liquidity_depth CHECK (liquidity_depth_score IS NULL OR (liquidity_depth_score >= 0 AND liquidity_depth_score <= 100)),
  CONSTRAINT check_top_10_concentration CHECK (top_10_holders_concentration_pct IS NULL OR (top_10_holders_concentration_pct >= 0 AND top_10_holders_concentration_pct <= 100)),
  CONSTRAINT check_top_50_concentration CHECK (top_50_holders_concentration_pct IS NULL OR (top_50_holders_concentration_pct >= 0 AND top_50_holders_concentration_pct <= 100)),
  CONSTRAINT check_liquidity_risk_score CHECK (liquidity_risk_score >= 0 AND liquidity_risk_score <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_liquidity_risk_protocol_id 
  ON protocol_liquidity_risks(protocol_id);

CREATE INDEX IF NOT EXISTS idx_liquidity_risk_tvl 
  ON protocol_liquidity_risks(current_tvl_usd DESC);

CREATE INDEX IF NOT EXISTS idx_liquidity_risk_score 
  ON protocol_liquidity_risks(liquidity_risk_score ASC);

CREATE INDEX IF NOT EXISTS idx_liquidity_risk_concentration 
  ON protocol_liquidity_risks(top_10_holders_concentration_pct DESC);

-- Comments
COMMENT ON TABLE protocol_liquidity_risks IS 'Liquidity risk analysis for DeFi protocols';
COMMENT ON COLUMN protocol_liquidity_risks.liquidity_depth_score IS 'Liquidity depth score (0-100, higher is better)';
COMMENT ON COLUMN protocol_liquidity_risks.top_10_holders_concentration_pct IS 'Percentage of liquidity held by top 10 holders';

