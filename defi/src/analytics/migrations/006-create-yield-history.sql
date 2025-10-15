-- Migration: Create yield_history table
-- Story: 2.1.2 - Yield Opportunity Scanner
-- Description: Stores historical snapshots of yield opportunities for trend analysis

CREATE TABLE IF NOT EXISTS yield_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES yield_opportunities(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  
  -- Yield Snapshot
  apy DECIMAL(10, 4) NOT NULL,
  apr DECIMAL(10, 4),
  tvl DECIMAL(20, 2),
  volume_24h DECIMAL(20, 2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT yield_history_unique_snapshot UNIQUE (opportunity_id, timestamp)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_yield_history_opportunity_id ON yield_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_yield_history_timestamp ON yield_history(timestamp DESC);

-- Composite index for time-series queries
CREATE INDEX IF NOT EXISTS idx_yield_history_composite ON yield_history(opportunity_id, timestamp DESC);

-- Comments
COMMENT ON TABLE yield_history IS 'Historical snapshots of yield opportunities for trend analysis';
COMMENT ON COLUMN yield_history.opportunity_id IS 'Foreign key to yield_opportunities table';
COMMENT ON COLUMN yield_history.timestamp IS 'Snapshot timestamp (typically every 5 minutes)';

