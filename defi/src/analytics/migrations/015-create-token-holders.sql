-- Migration: Create token_holders table
-- Story: 2.2.2 - Holder Distribution Analysis
-- Description: Tracks individual token holders with balance, classification, and behavior metrics

CREATE TABLE IF NOT EXISTS token_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  
  -- Holdings
  balance DECIMAL(30, 10) NOT NULL,
  balance_usd DECIMAL(20, 2),
  supply_percentage DECIMAL(10, 6),
  
  -- Classification
  holder_type VARCHAR(50), -- 'whale', 'large', 'medium', 'small', 'dust'
  is_contract BOOLEAN DEFAULT FALSE,
  is_exchange BOOLEAN DEFAULT FALSE,
  
  -- Behavior
  first_seen TIMESTAMP,
  last_active TIMESTAMP,
  holding_period_days INTEGER,
  transaction_count INTEGER,
  
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_token_holders_token ON token_holders(token_address);
CREATE INDEX idx_token_holders_wallet ON token_holders(wallet_address);
CREATE INDEX idx_token_holders_balance ON token_holders(balance DESC);
CREATE INDEX idx_token_holders_supply_pct ON token_holders(supply_percentage DESC);
CREATE INDEX idx_token_holders_type ON token_holders(holder_type);
CREATE INDEX idx_token_holders_chain ON token_holders(chain_id);
CREATE UNIQUE INDEX idx_token_holders_unique ON token_holders(token_address, chain_id, wallet_address);

-- Comments
COMMENT ON TABLE token_holders IS 'Individual token holder data with balance, classification, and behavior metrics';
COMMENT ON COLUMN token_holders.holder_type IS 'Holder classification: whale (>1% supply), large (0.1-1%), medium (0.01-0.1%), small (0.001-0.01%), dust (<0.001%)';
COMMENT ON COLUMN token_holders.supply_percentage IS 'Percentage of total token supply held by this wallet';
COMMENT ON COLUMN token_holders.holding_period_days IS 'Number of days since first_seen';

