-- Migration: Create yield_opportunities table
-- Story: 2.1.2 - Yield Opportunity Scanner
-- Description: Stores yield opportunity data with pool info, yield metrics, and risk scores

CREATE TABLE IF NOT EXISTS yield_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  pool_id VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Pool Info
  pool_name VARCHAR(255) NOT NULL,
  pool_type VARCHAR(50) NOT NULL, -- 'lending', 'staking', 'lp', 'farming'
  token_symbols VARCHAR(255)[], -- ['USDC', 'ETH']
  
  -- Yield Metrics
  apy DECIMAL(10, 4) NOT NULL,
  apr DECIMAL(10, 4),
  base_apy DECIMAL(10, 4), -- without rewards
  reward_apy DECIMAL(10, 4), -- from incentives
  auto_compound BOOLEAN DEFAULT FALSE,
  
  -- TVL and Volume
  tvl DECIMAL(20, 2) NOT NULL,
  volume_24h DECIMAL(20, 2),
  volume_7d DECIMAL(20, 2),
  
  -- Risk Metrics
  risk_score INTEGER, -- 0-100, lower = lower risk
  risk_category VARCHAR(20), -- 'low', 'medium', 'high'
  audit_status VARCHAR(50),
  protocol_age_days INTEGER,
  
  -- Performance
  yield_volatility DECIMAL(10, 4),
  yield_stability_score DECIMAL(5, 2),
  
  -- Timestamps
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT yield_opportunities_unique_pool UNIQUE (protocol_id, pool_id, chain_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_yield_opportunities_protocol_id ON yield_opportunities(protocol_id);
CREATE INDEX IF NOT EXISTS idx_yield_opportunities_chain_id ON yield_opportunities(chain_id);
CREATE INDEX IF NOT EXISTS idx_yield_opportunities_pool_type ON yield_opportunities(pool_type);
CREATE INDEX IF NOT EXISTS idx_yield_opportunities_apy ON yield_opportunities(apy DESC);
CREATE INDEX IF NOT EXISTS idx_yield_opportunities_risk_score ON yield_opportunities(risk_score);
CREATE INDEX IF NOT EXISTS idx_yield_opportunities_tvl ON yield_opportunities(tvl DESC);
CREATE INDEX IF NOT EXISTS idx_yield_opportunities_last_updated ON yield_opportunities(last_updated DESC);

-- Composite index for common queries (sort by APY with risk filter)
CREATE INDEX IF NOT EXISTS idx_yield_opportunities_composite ON yield_opportunities(apy DESC, risk_score, tvl DESC);

-- Composite index for risk-adjusted queries
CREATE INDEX IF NOT EXISTS idx_yield_opportunities_risk_composite ON yield_opportunities(risk_score, apy DESC, tvl DESC);

-- Comments
COMMENT ON TABLE yield_opportunities IS 'Stores yield opportunity data from various DeFi protocols';
COMMENT ON COLUMN yield_opportunities.pool_type IS 'Type of yield pool: lending, staking, lp, farming';
COMMENT ON COLUMN yield_opportunities.risk_score IS 'Risk score 0-100, lower score = lower risk';
COMMENT ON COLUMN yield_opportunities.risk_category IS 'Risk category: low (0-33), medium (34-66), high (67-100)';
COMMENT ON COLUMN yield_opportunities.yield_volatility IS 'Standard deviation of APY over time period';
COMMENT ON COLUMN yield_opportunities.yield_stability_score IS 'Stability score 0-100, higher = more stable';

