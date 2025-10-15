-- Migration: Create smart_money_wallets table
-- Story: 3.1.1 - Smart Money Identification
-- Description: Table for tracking and scoring smart money wallets
-- Created: 2025-10-15

CREATE TABLE IF NOT EXISTS smart_money_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Identification
  wallet_name VARCHAR(255),
  wallet_type VARCHAR(50), -- 'whale', 'fund', 'trader', 'protocol'
  discovery_method VARCHAR(50), -- 'algorithm', 'manual', 'community'
  verified BOOLEAN DEFAULT FALSE,
  
  -- Scoring
  smart_money_score DECIMAL(5, 2) NOT NULL, -- 0-100
  confidence_level VARCHAR(20), -- 'high', 'medium', 'low'
  
  -- Performance Metrics
  total_pnl DECIMAL(20, 2),
  roi_all_time DECIMAL(10, 4),
  win_rate DECIMAL(5, 2),
  sharpe_ratio DECIMAL(10, 4),
  max_drawdown DECIMAL(10, 4),
  
  -- Activity Metrics
  total_trades INTEGER DEFAULT 0,
  avg_trade_size DECIMAL(20, 2),
  avg_holding_period_days DECIMAL(10, 2),
  last_trade_timestamp TIMESTAMP,
  
  -- Behavioral
  trading_style VARCHAR(50),
  risk_profile VARCHAR(20),
  preferred_tokens VARCHAR(255)[],
  preferred_protocols VARCHAR(255)[],
  
  -- Timestamps
  first_seen TIMESTAMP NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_smart_money_wallets_address ON smart_money_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_smart_money_wallets_score ON smart_money_wallets(smart_money_score DESC);
CREATE INDEX IF NOT EXISTS idx_smart_money_wallets_verified ON smart_money_wallets(verified);
CREATE INDEX IF NOT EXISTS idx_smart_money_wallets_chain ON smart_money_wallets(chain_id);
CREATE INDEX IF NOT EXISTS idx_smart_money_wallets_type ON smart_money_wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_smart_money_wallets_composite ON smart_money_wallets(smart_money_score DESC, verified, chain_id);

-- Comments
COMMENT ON TABLE smart_money_wallets IS 'Smart money wallets with performance scoring and behavioral analysis';
COMMENT ON COLUMN smart_money_wallets.smart_money_score IS 'Composite score 0-100 based on performance, activity, behavioral, and verification factors';
COMMENT ON COLUMN smart_money_wallets.confidence_level IS 'Confidence in smart money classification: high (90-100), medium (70-89), low (50-69)';
COMMENT ON COLUMN smart_money_wallets.sharpe_ratio IS 'Risk-adjusted return metric: (Return - RiskFreeRate) / Volatility';
COMMENT ON COLUMN smart_money_wallets.max_drawdown IS 'Maximum peak-to-trough decline in portfolio value';

