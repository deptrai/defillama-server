/**
 * Migration: Create wallet_portfolios table
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * This table stores portfolio summary data for each wallet on each chain.
 */

CREATE TABLE IF NOT EXISTS wallet_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Portfolio Metrics
  total_value_usd DECIMAL(20, 2) NOT NULL,
  token_count INTEGER DEFAULT 0,
  protocol_count INTEGER DEFAULT 0,
  
  -- Performance
  pnl_24h DECIMAL(20, 2) DEFAULT 0,
  pnl_7d DECIMAL(20, 2) DEFAULT 0,
  pnl_30d DECIMAL(20, 2) DEFAULT 0,
  pnl_all_time DECIMAL(20, 2) DEFAULT 0,
  roi_all_time DECIMAL(10, 4) DEFAULT 0,
  
  -- Risk
  concentration_score DECIMAL(5, 2) DEFAULT 0, -- 0-100
  diversification_score DECIMAL(5, 2) DEFAULT 0, -- 0-100
  
  -- Timestamps
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_wallet_portfolios_address ON wallet_portfolios(wallet_address);
CREATE INDEX idx_wallet_portfolios_chain ON wallet_portfolios(chain_id);
CREATE INDEX idx_wallet_portfolios_value ON wallet_portfolios(total_value_usd DESC);
CREATE UNIQUE INDEX idx_wallet_portfolios_unique ON wallet_portfolios(wallet_address, chain_id);

-- Comments
COMMENT ON TABLE wallet_portfolios IS 'Portfolio summary data for each wallet on each chain';
COMMENT ON COLUMN wallet_portfolios.concentration_score IS 'Concentration risk score (0-100): higher = more concentrated';
COMMENT ON COLUMN wallet_portfolios.diversification_score IS 'Diversification score (0-100): higher = more diversified';
COMMENT ON COLUMN wallet_portfolios.pnl_24h IS 'Profit/Loss in last 24 hours (USD)';
COMMENT ON COLUMN wallet_portfolios.pnl_7d IS 'Profit/Loss in last 7 days (USD)';
COMMENT ON COLUMN wallet_portfolios.pnl_30d IS 'Profit/Loss in last 30 days (USD)';
COMMENT ON COLUMN wallet_portfolios.pnl_all_time IS 'All-time Profit/Loss (USD)';
COMMENT ON COLUMN wallet_portfolios.roi_all_time IS 'All-time Return on Investment (decimal, e.g., 0.25 = 25%)';

