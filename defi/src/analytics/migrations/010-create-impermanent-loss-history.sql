/**
 * Migration: Create impermanent_loss_history table
 * Story: 2.1.3 - Liquidity Analysis Tools
 * 
 * This table stores historical snapshots of impermanent loss
 * for tracking IL trends over time.
 */

CREATE TABLE IF NOT EXISTS impermanent_loss_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES liquidity_providers(id) ON DELETE CASCADE,
  pool_id UUID NOT NULL REFERENCES liquidity_pools(id) ON DELETE CASCADE,
  
  -- Snapshot Timestamp
  timestamp TIMESTAMP NOT NULL,
  
  -- Position State at Snapshot
  token0_amount DECIMAL(30, 10),
  token1_amount DECIMAL(30, 10),
  token0_price_usd DECIMAL(20, 10),
  token1_price_usd DECIMAL(20, 10),
  position_value_usd DECIMAL(20, 2),
  
  -- IL Metrics
  impermanent_loss DECIMAL(20, 2),
  impermanent_loss_pct DECIMAL(10, 4),
  hodl_value_usd DECIMAL(20, 2), -- Value if tokens were held instead
  il_vs_hodl DECIMAL(20, 2), -- Difference: position_value - hodl_value
  
  -- Fee Metrics
  fees_earned DECIMAL(20, 2),
  cumulative_fees DECIMAL(20, 2),
  
  -- Net Performance
  net_profit DECIMAL(20, 2),
  roi DECIMAL(10, 4),
  
  -- Constraints
  UNIQUE(provider_id, timestamp)
);

-- Indexes for time-series queries
CREATE INDEX idx_il_history_provider_id ON impermanent_loss_history(provider_id);
CREATE INDEX idx_il_history_pool_id ON impermanent_loss_history(pool_id);
CREATE INDEX idx_il_history_timestamp ON impermanent_loss_history(timestamp DESC);
CREATE INDEX idx_il_history_provider_time ON impermanent_loss_history(provider_id, timestamp DESC);

-- Comments
COMMENT ON TABLE impermanent_loss_history IS 'Historical snapshots of impermanent loss for trend analysis';
COMMENT ON COLUMN impermanent_loss_history.hodl_value_usd IS 'Value if tokens were held instead of providing liquidity';
COMMENT ON COLUMN impermanent_loss_history.il_vs_hodl IS 'IL compared to holding: position_value - hodl_value';
COMMENT ON COLUMN impermanent_loss_history.cumulative_fees IS 'Total fees earned since position entry';

