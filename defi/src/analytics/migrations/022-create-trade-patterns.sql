-- Migration: 022-create-trade-patterns.sql
-- Story: 3.1.2 - Trade Pattern Analysis
-- Description: Create trade_patterns table to store detected trading patterns

CREATE TABLE IF NOT EXISTS trade_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL,
  
  -- Pattern details
  pattern_type VARCHAR(50) NOT NULL, -- 'accumulation', 'distribution', 'rotation', 'arbitrage'
  pattern_name VARCHAR(255),
  confidence_score DECIMAL(5, 2), -- 0-100
  
  -- Time range
  start_timestamp TIMESTAMP NOT NULL,
  end_timestamp TIMESTAMP,
  duration_hours INTEGER,
  
  -- Token details
  token_address VARCHAR(255),
  token_symbol VARCHAR(50),
  
  -- Pattern metrics
  total_trades INTEGER,
  total_volume_usd DECIMAL(20, 2),
  avg_trade_size DECIMAL(20, 2),
  
  -- Pattern status
  pattern_status VARCHAR(20), -- 'active', 'completed', 'failed'
  
  -- Performance
  realized_pnl DECIMAL(20, 2),
  roi DECIMAL(10, 4),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_trade_patterns_wallet_id ON trade_patterns(wallet_id);
CREATE INDEX IF NOT EXISTS idx_trade_patterns_type ON trade_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_trade_patterns_token ON trade_patterns(token_address);
CREATE INDEX IF NOT EXISTS idx_trade_patterns_status ON trade_patterns(pattern_status);

-- Comments
COMMENT ON TABLE trade_patterns IS 'Detected trading patterns from smart money wallets';
COMMENT ON COLUMN trade_patterns.wallet_id IS 'Reference to smart_money_wallets table (not enforced FK for flexibility)';
COMMENT ON COLUMN trade_patterns.pattern_type IS 'Type of pattern: accumulation, distribution, rotation, or arbitrage';
COMMENT ON COLUMN trade_patterns.confidence_score IS 'Confidence score 0-100 based on pattern strength';
COMMENT ON COLUMN trade_patterns.pattern_status IS 'Status: active (ongoing), completed (finished), or failed (invalidated)';

