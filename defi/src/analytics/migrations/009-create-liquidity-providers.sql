/**
 * Migration: Create liquidity_providers table
 * Story: 2.1.3 - Liquidity Analysis Tools
 * 
 * This table stores LP position data including performance metrics,
 * fees earned, and impermanent loss calculations.
 */

CREATE TABLE IF NOT EXISTS liquidity_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES liquidity_pools(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL,
  
  -- Position Details
  liquidity_amount DECIMAL(30, 10),
  token0_amount DECIMAL(30, 10),
  token1_amount DECIMAL(30, 10),
  position_value_usd DECIMAL(20, 2),
  
  -- Entry State (for IL calculations)
  entry_token0_amount DECIMAL(30, 10),
  entry_token1_amount DECIMAL(30, 10),
  entry_token0_price_usd DECIMAL(20, 10),
  entry_token1_price_usd DECIMAL(20, 10),
  entry_value_usd DECIMAL(20, 2),
  
  -- Performance Metrics
  fees_earned DECIMAL(20, 2),
  impermanent_loss DECIMAL(20, 2),
  impermanent_loss_pct DECIMAL(10, 4), -- IL as percentage
  net_profit DECIMAL(20, 2), -- fees_earned - impermanent_loss
  roi DECIMAL(10, 4), -- Return on investment as decimal (e.g., 0.15 = 15%)
  
  -- Concentrated Liquidity (Uniswap V3)
  tick_lower INTEGER,
  tick_upper INTEGER,
  in_range BOOLEAN DEFAULT true,
  
  -- Timing
  entry_timestamp TIMESTAMP,
  exit_timestamp TIMESTAMP,
  position_age_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(pool_id, wallet_address, entry_timestamp)
);

-- Indexes for common queries
CREATE INDEX idx_liquidity_providers_pool_id ON liquidity_providers(pool_id);
CREATE INDEX idx_liquidity_providers_wallet ON liquidity_providers(wallet_address);
CREATE INDEX idx_liquidity_providers_value ON liquidity_providers(position_value_usd DESC);
CREATE INDEX idx_liquidity_providers_roi ON liquidity_providers(roi DESC);
CREATE INDEX idx_liquidity_providers_fees ON liquidity_providers(fees_earned DESC);
CREATE INDEX idx_liquidity_providers_active ON liquidity_providers(is_active) WHERE is_active = true;
CREATE INDEX idx_liquidity_providers_entry ON liquidity_providers(entry_timestamp DESC);

-- Comments
COMMENT ON TABLE liquidity_providers IS 'Stores LP position data with performance metrics and IL calculations';
COMMENT ON COLUMN liquidity_providers.impermanent_loss IS 'Impermanent loss in USD (negative value)';
COMMENT ON COLUMN liquidity_providers.impermanent_loss_pct IS 'IL as percentage of entry value (e.g., -0.05 = -5%)';
COMMENT ON COLUMN liquidity_providers.net_profit IS 'Total profit/loss: fees_earned + impermanent_loss';
COMMENT ON COLUMN liquidity_providers.roi IS 'Return on investment: net_profit / entry_value_usd';
COMMENT ON COLUMN liquidity_providers.in_range IS 'For concentrated liquidity: whether position is in active range';

