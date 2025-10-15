-- Migration: Create cross_chain_portfolios table
-- Story: 2.2.3 - Cross-chain Portfolio Aggregation
-- Description: Aggregated portfolio data across all chains for a user

CREATE TABLE IF NOT EXISTS cross_chain_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Wallet addresses across all chains (JSONB format)
  -- Example: {"ethereum": ["0x..."], "polygon": ["0x..."], "arbitrum": ["0x..."]}
  wallet_addresses JSONB NOT NULL,
  
  -- Total portfolio metrics
  total_net_worth_usd DECIMAL(20, 2) NOT NULL,
  net_worth_change_24h DECIMAL(10, 4),
  net_worth_change_7d DECIMAL(10, 4),
  net_worth_change_30d DECIMAL(10, 4),
  
  -- Portfolio composition
  total_assets INTEGER NOT NULL DEFAULT 0,
  total_chains INTEGER NOT NULL DEFAULT 0,
  total_wallets INTEGER NOT NULL DEFAULT 0,
  
  -- Breakdowns (JSONB format for flexibility)
  -- asset_breakdown: {"ETH": 25000.50, "USDC": 20000.00, ...} (top 10)
  asset_breakdown JSONB,
  
  -- chain_breakdown: {"ethereum": 50000.00, "polygon": 20000.00, ...}
  chain_breakdown JSONB,
  
  -- category_breakdown: {"defi": 40000.00, "stablecoins": 30000.00, ...}
  category_breakdown JSONB,
  
  -- Performance metrics
  total_pnl_usd DECIMAL(20, 2),
  total_roi DECIMAL(10, 4),
  
  -- Metadata
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cross_chain_portfolios_user 
  ON cross_chain_portfolios(user_id);

CREATE INDEX IF NOT EXISTS idx_cross_chain_portfolios_net_worth 
  ON cross_chain_portfolios(total_net_worth_usd DESC);

CREATE INDEX IF NOT EXISTS idx_cross_chain_portfolios_updated 
  ON cross_chain_portfolios(last_updated DESC);

-- Comments
COMMENT ON TABLE cross_chain_portfolios IS 'Aggregated portfolio data across all chains for each user';
COMMENT ON COLUMN cross_chain_portfolios.wallet_addresses IS 'JSONB map of chain_id to array of wallet addresses';
COMMENT ON COLUMN cross_chain_portfolios.asset_breakdown IS 'Top 10 assets by USD value across all chains';
COMMENT ON COLUMN cross_chain_portfolios.chain_breakdown IS 'Portfolio value distribution by chain';
COMMENT ON COLUMN cross_chain_portfolios.category_breakdown IS 'Portfolio value distribution by asset category (DeFi, stablecoins, native, other)';

