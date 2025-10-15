/**
 * Migration: Create liquidity_pools table
 * Story: 2.1.3 - Liquidity Analysis Tools
 * 
 * This table stores liquidity pool data including depth metrics,
 * reserves, and activity statistics.
 */

CREATE TABLE IF NOT EXISTS liquidity_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  pool_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Pool Info
  pool_name VARCHAR(255),
  token0_symbol VARCHAR(50),
  token1_symbol VARCHAR(50),
  token0_address VARCHAR(255),
  token1_address VARCHAR(255),
  pool_type VARCHAR(50), -- 'uniswap_v2', 'uniswap_v3', 'curve_stable', 'balancer_weighted'
  fee_tier DECIMAL(10, 6), -- Fee percentage (e.g., 0.003 for 0.3%)
  
  -- Liquidity Metrics
  total_liquidity DECIMAL(20, 2),
  token0_reserve DECIMAL(30, 10),
  token1_reserve DECIMAL(30, 10),
  token0_price_usd DECIMAL(20, 10),
  token1_price_usd DECIMAL(20, 10),
  
  -- Depth Metrics (liquidity available within 1% of mid price)
  bid_depth_1pct DECIMAL(20, 2),
  ask_depth_1pct DECIMAL(20, 2),
  bid_ask_spread DECIMAL(10, 6),
  
  -- Concentrated Liquidity (Uniswap V3)
  tick_lower INTEGER,
  tick_upper INTEGER,
  current_tick INTEGER,
  
  -- Activity Metrics
  volume_24h DECIMAL(20, 2),
  volume_7d DECIMAL(20, 2),
  fee_24h DECIMAL(20, 2),
  fee_7d DECIMAL(20, 2),
  lp_count INTEGER,
  swap_count_24h INTEGER,
  
  -- Timestamps
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(protocol_id, pool_address, chain_id)
);

-- Indexes for common queries
CREATE INDEX idx_liquidity_pools_protocol_id ON liquidity_pools(protocol_id);
CREATE INDEX idx_liquidity_pools_chain_id ON liquidity_pools(chain_id);
CREATE INDEX idx_liquidity_pools_pool_type ON liquidity_pools(pool_type);
CREATE INDEX idx_liquidity_pools_liquidity ON liquidity_pools(total_liquidity DESC);
CREATE INDEX idx_liquidity_pools_volume ON liquidity_pools(volume_24h DESC);
CREATE INDEX idx_liquidity_pools_tokens ON liquidity_pools(token0_symbol, token1_symbol);
CREATE INDEX idx_liquidity_pools_updated ON liquidity_pools(last_updated DESC);

-- Comments
COMMENT ON TABLE liquidity_pools IS 'Stores liquidity pool data for depth analysis and LP tracking';
COMMENT ON COLUMN liquidity_pools.pool_type IS 'AMM model: uniswap_v2, uniswap_v3, curve_stable, balancer_weighted';
COMMENT ON COLUMN liquidity_pools.bid_depth_1pct IS 'Liquidity available for buying within 1% of mid price';
COMMENT ON COLUMN liquidity_pools.ask_depth_1pct IS 'Liquidity available for selling within 1% of mid price';
COMMENT ON COLUMN liquidity_pools.bid_ask_spread IS 'Spread between best bid and ask as decimal (e.g., 0.001 = 0.1%)';

