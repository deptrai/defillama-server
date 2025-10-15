-- Migration: Create cross_chain_assets table
-- Story: 2.2.3 - Cross-chain Portfolio Aggregation
-- Description: Detailed asset holdings across all chains

CREATE TABLE IF NOT EXISTS cross_chain_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES cross_chain_portfolios(id) ON DELETE CASCADE,
  
  -- Chain and wallet identification
  chain_id VARCHAR(50) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  
  -- Token information
  token_address VARCHAR(255), -- NULL for native tokens
  token_symbol VARCHAR(50) NOT NULL,
  token_name VARCHAR(255),
  token_decimals INTEGER DEFAULT 18,
  
  -- Balance information
  balance DECIMAL(30, 10) NOT NULL,
  balance_usd DECIMAL(20, 2) NOT NULL,
  price_usd DECIMAL(20, 10),
  
  -- Asset classification
  category VARCHAR(50), -- 'defi', 'stablecoin', 'native', 'other'
  is_native BOOLEAN DEFAULT FALSE,
  is_wrapped BOOLEAN DEFAULT FALSE, -- WETH, WBTC, etc.
  is_bridged BOOLEAN DEFAULT FALSE, -- Same token on different chains
  
  -- Performance metrics
  cost_basis_usd DECIMAL(20, 2),
  unrealized_pnl DECIMAL(20, 2),
  roi DECIMAL(10, 4),
  
  -- Metadata
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cross_chain_assets_portfolio 
  ON cross_chain_assets(portfolio_id);

CREATE INDEX IF NOT EXISTS idx_cross_chain_assets_chain 
  ON cross_chain_assets(chain_id);

CREATE INDEX IF NOT EXISTS idx_cross_chain_assets_wallet 
  ON cross_chain_assets(wallet_address);

CREATE INDEX IF NOT EXISTS idx_cross_chain_assets_token 
  ON cross_chain_assets(token_symbol);

CREATE INDEX IF NOT EXISTS idx_cross_chain_assets_category 
  ON cross_chain_assets(category);

CREATE INDEX IF NOT EXISTS idx_cross_chain_assets_value 
  ON cross_chain_assets(balance_usd DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_cross_chain_assets_portfolio_chain 
  ON cross_chain_assets(portfolio_id, chain_id);

-- Comments
COMMENT ON TABLE cross_chain_assets IS 'Detailed asset holdings across all chains for cross-chain portfolios';
COMMENT ON COLUMN cross_chain_assets.category IS 'Asset category: defi, stablecoin, native, other';
COMMENT ON COLUMN cross_chain_assets.is_wrapped IS 'True for wrapped tokens like WETH, WBTC';
COMMENT ON COLUMN cross_chain_assets.is_bridged IS 'True for tokens that exist on multiple chains (e.g., USDC on Ethereum and Polygon)';

