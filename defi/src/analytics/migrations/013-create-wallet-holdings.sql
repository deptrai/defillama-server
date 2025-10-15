/**
 * Migration: Create wallet_holdings table
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * This table stores individual token holdings for each wallet portfolio.
 */

CREATE TABLE IF NOT EXISTS wallet_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES wallet_portfolios(id) ON DELETE CASCADE,
  
  -- Asset Info
  token_address VARCHAR(255) NOT NULL,
  token_symbol VARCHAR(50) NOT NULL,
  token_name VARCHAR(255),
  
  -- Position
  balance DECIMAL(30, 10) NOT NULL,
  value_usd DECIMAL(20, 2) NOT NULL,
  allocation_pct DECIMAL(5, 2) DEFAULT 0, -- % of portfolio
  
  -- Protocol Info
  protocol_id VARCHAR(255),
  position_type VARCHAR(50) DEFAULT 'wallet', -- 'wallet', 'staked', 'lp', 'lending', 'borrowed'
  
  -- Performance
  cost_basis DECIMAL(20, 2) DEFAULT 0,
  unrealized_pnl DECIMAL(20, 2) DEFAULT 0,
  roi DECIMAL(10, 4) DEFAULT 0,
  
  -- Timestamps
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_wallet_holdings_portfolio_id ON wallet_holdings(portfolio_id);
CREATE INDEX idx_wallet_holdings_token ON wallet_holdings(token_address);
CREATE INDEX idx_wallet_holdings_value ON wallet_holdings(value_usd DESC);
CREATE INDEX idx_wallet_holdings_protocol ON wallet_holdings(protocol_id);
CREATE INDEX idx_wallet_holdings_type ON wallet_holdings(position_type);

-- Comments
COMMENT ON TABLE wallet_holdings IS 'Individual token holdings for each wallet portfolio';
COMMENT ON COLUMN wallet_holdings.position_type IS 'Type of position: wallet (simple balance), staked, lp (liquidity provider), lending, borrowed';
COMMENT ON COLUMN wallet_holdings.allocation_pct IS 'Percentage of total portfolio value (0-100)';
COMMENT ON COLUMN wallet_holdings.cost_basis IS 'Original cost basis in USD';
COMMENT ON COLUMN wallet_holdings.unrealized_pnl IS 'Unrealized profit/loss in USD';
COMMENT ON COLUMN wallet_holdings.roi IS 'Return on investment (decimal, e.g., 0.25 = 25%)';

