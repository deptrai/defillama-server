-- Migration: Create holder_distribution_snapshots table
-- Story: 2.2.2 - Holder Distribution Analysis
-- Description: Historical snapshots of token holder distribution metrics

CREATE TABLE IF NOT EXISTS holder_distribution_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- Distribution Metrics
  total_holders INTEGER NOT NULL,
  gini_coefficient DECIMAL(5, 4), -- 0-1 (0 = perfect equality, 1 = perfect inequality)
  concentration_score DECIMAL(5, 2), -- 0-100 (derived from Gini)
  
  -- Top Holder Metrics
  top10_percentage DECIMAL(10, 6),
  top50_percentage DECIMAL(10, 6),
  top100_percentage DECIMAL(10, 6),
  
  -- Holder Type Distribution
  whale_count INTEGER,
  whale_percentage DECIMAL(10, 6),
  large_holder_count INTEGER,
  large_holder_percentage DECIMAL(10, 6),
  medium_holder_count INTEGER,
  medium_holder_percentage DECIMAL(10, 6),
  small_holder_count INTEGER,
  small_holder_percentage DECIMAL(10, 6),
  dust_holder_count INTEGER,
  dust_holder_percentage DECIMAL(10, 6),
  
  -- Behavior Metrics
  avg_holding_period_days DECIMAL(10, 2),
  holder_churn_rate DECIMAL(5, 2), -- % of holders who exited in last 30 days
  new_holders_24h INTEGER,
  new_holders_7d INTEGER,
  new_holders_30d INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_holder_snapshots_token ON holder_distribution_snapshots(token_address);
CREATE INDEX idx_holder_snapshots_chain ON holder_distribution_snapshots(chain_id);
CREATE INDEX idx_holder_snapshots_timestamp ON holder_distribution_snapshots(timestamp DESC);
CREATE INDEX idx_holder_snapshots_composite ON holder_distribution_snapshots(token_address, chain_id, timestamp DESC);
CREATE UNIQUE INDEX idx_holder_snapshots_unique ON holder_distribution_snapshots(token_address, chain_id, timestamp);

-- Comments
COMMENT ON TABLE holder_distribution_snapshots IS 'Historical snapshots of token holder distribution metrics for trend analysis';
COMMENT ON COLUMN holder_distribution_snapshots.gini_coefficient IS 'Gini coefficient (0-1): 0 = perfect equality, 1 = perfect inequality';
COMMENT ON COLUMN holder_distribution_snapshots.concentration_score IS 'Concentration risk score (0-100): derived from Gini coefficient';
COMMENT ON COLUMN holder_distribution_snapshots.holder_churn_rate IS 'Percentage of holders who exited in the last 30 days';

