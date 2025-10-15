/**
 * Migration: Create portfolio_history table
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * This table stores historical snapshots of portfolio values for performance tracking.
 */

CREATE TABLE IF NOT EXISTS portfolio_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- Snapshot
  total_value_usd DECIMAL(20, 2) NOT NULL,
  token_count INTEGER DEFAULT 0,
  protocol_count INTEGER DEFAULT 0,
  
  -- Top Holdings (JSON)
  top_holdings JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_portfolio_history_wallet ON portfolio_history(wallet_address);
CREATE INDEX idx_portfolio_history_timestamp ON portfolio_history(timestamp DESC);
CREATE INDEX idx_portfolio_history_composite ON portfolio_history(wallet_address, timestamp DESC);

-- Comments
COMMENT ON TABLE portfolio_history IS 'Historical snapshots of portfolio values for performance tracking';
COMMENT ON COLUMN portfolio_history.top_holdings IS 'JSON array of top holdings at snapshot time: [{symbol, valueUsd, allocationPct}]';
COMMENT ON COLUMN portfolio_history.timestamp IS 'Snapshot timestamp';

