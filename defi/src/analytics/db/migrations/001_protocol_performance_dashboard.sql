-- Migration: 001_protocol_performance_dashboard
-- Story: 2.1.1 - Protocol Performance Dashboard
-- Description: Create tables for protocol performance metrics, yield sources, and user cohorts
-- Date: 2025-10-14

-- ============================================================================
-- Table 1: protocol_performance_metrics
-- Purpose: Store comprehensive protocol performance metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS protocol_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- APY/APR Metrics
  apy_7d DECIMAL(10, 4),
  apy_30d DECIMAL(10, 4),
  apy_90d DECIMAL(10, 4),
  apy_1y DECIMAL(10, 4),
  apr_7d DECIMAL(10, 4),
  apr_30d DECIMAL(10, 4),
  
  -- User Metrics
  dau INTEGER,
  wau INTEGER,
  mau INTEGER,
  new_users INTEGER,
  returning_users INTEGER,
  churned_users INTEGER,
  
  -- Revenue Metrics
  daily_revenue DECIMAL(20, 2),
  weekly_revenue DECIMAL(20, 2),
  monthly_revenue DECIMAL(20, 2),
  trading_fees DECIMAL(20, 2),
  withdrawal_fees DECIMAL(20, 2),
  performance_fees DECIMAL(20, 2),
  
  -- Engagement Metrics
  avg_transaction_size DECIMAL(20, 2),
  transaction_count INTEGER,
  unique_traders INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for protocol_performance_metrics
CREATE INDEX IF NOT EXISTS idx_protocol_performance_protocol_id 
  ON protocol_performance_metrics(protocol_id);

CREATE INDEX IF NOT EXISTS idx_protocol_performance_timestamp 
  ON protocol_performance_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_protocol_performance_composite 
  ON protocol_performance_metrics(protocol_id, timestamp DESC);

-- Unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_protocol_performance_unique 
  ON protocol_performance_metrics(protocol_id, timestamp);

-- ============================================================================
-- Table 2: protocol_yield_sources
-- Purpose: Store yield source breakdown for protocols and pools
-- ============================================================================

CREATE TABLE IF NOT EXISTS protocol_yield_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  pool_id VARCHAR(255),
  timestamp TIMESTAMP NOT NULL,
  
  -- Yield Sources
  trading_fee_yield DECIMAL(10, 4),
  incentive_yield DECIMAL(10, 4),
  lending_yield DECIMAL(10, 4),
  staking_yield DECIMAL(10, 4),
  other_yield DECIMAL(10, 4),
  
  -- Pool Metrics
  pool_tvl DECIMAL(20, 2),
  pool_volume_24h DECIMAL(20, 2),
  pool_apy DECIMAL(10, 4),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for protocol_yield_sources
CREATE INDEX IF NOT EXISTS idx_yield_sources_protocol_id 
  ON protocol_yield_sources(protocol_id);

CREATE INDEX IF NOT EXISTS idx_yield_sources_timestamp 
  ON protocol_yield_sources(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_yield_sources_pool_id 
  ON protocol_yield_sources(pool_id);

CREATE INDEX IF NOT EXISTS idx_yield_sources_composite 
  ON protocol_yield_sources(protocol_id, timestamp DESC);

-- Unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_yield_sources_unique 
  ON protocol_yield_sources(protocol_id, COALESCE(pool_id, ''), timestamp);

-- ============================================================================
-- Table 3: protocol_user_cohorts
-- Purpose: Store user cohort analysis data for retention tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS protocol_user_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  cohort_date DATE NOT NULL,
  period_number INTEGER NOT NULL, -- 0 = signup period, 1 = period 1, etc.
  
  -- Cohort Metrics
  cohort_size INTEGER NOT NULL,
  active_users INTEGER NOT NULL,
  retention_rate DECIMAL(5, 2),
  
  -- Value Metrics
  avg_transaction_value DECIMAL(20, 2),
  total_volume DECIMAL(20, 2),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for protocol_user_cohorts
CREATE INDEX IF NOT EXISTS idx_user_cohorts_protocol_id 
  ON protocol_user_cohorts(protocol_id);

CREATE INDEX IF NOT EXISTS idx_user_cohorts_cohort_date 
  ON protocol_user_cohorts(cohort_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_cohorts_composite 
  ON protocol_user_cohorts(protocol_id, cohort_date DESC, period_number);

-- Unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cohorts_unique 
  ON protocol_user_cohorts(protocol_id, cohort_date, period_number);

-- ============================================================================
-- Table 4: protocol_competitive_metrics
-- Purpose: Store competitive benchmarking data
-- ============================================================================

CREATE TABLE IF NOT EXISTS protocol_competitive_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- Rankings
  tvl_rank INTEGER,
  volume_rank INTEGER,
  users_rank INTEGER,
  revenue_rank INTEGER,
  apy_rank INTEGER,
  
  -- Market Share
  tvl_market_share DECIMAL(5, 2),
  volume_market_share DECIMAL(5, 2),
  users_market_share DECIMAL(5, 2),
  
  -- Competitive Position
  category VARCHAR(100),
  total_competitors INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for protocol_competitive_metrics
CREATE INDEX IF NOT EXISTS idx_competitive_metrics_protocol_id 
  ON protocol_competitive_metrics(protocol_id);

CREATE INDEX IF NOT EXISTS idx_competitive_metrics_timestamp 
  ON protocol_competitive_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_competitive_metrics_composite 
  ON protocol_competitive_metrics(protocol_id, timestamp DESC);

-- Unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitive_metrics_unique 
  ON protocol_competitive_metrics(protocol_id, timestamp);

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE protocol_performance_metrics IS 'Comprehensive protocol performance metrics including APY/APR, user metrics, revenue, and engagement';
COMMENT ON TABLE protocol_yield_sources IS 'Yield source breakdown for protocols and individual pools';
COMMENT ON TABLE protocol_user_cohorts IS 'User cohort analysis data for retention tracking';
COMMENT ON TABLE protocol_competitive_metrics IS 'Competitive benchmarking and market positioning data';

-- ============================================================================
-- Grants (adjust based on your user roles)
-- ============================================================================

-- Grant SELECT to read-only users
-- GRANT SELECT ON protocol_performance_metrics TO readonly_user;
-- GRANT SELECT ON protocol_yield_sources TO readonly_user;
-- GRANT SELECT ON protocol_user_cohorts TO readonly_user;
-- GRANT SELECT ON protocol_competitive_metrics TO readonly_user;

-- Grant ALL to application user
-- GRANT ALL ON protocol_performance_metrics TO app_user;
-- GRANT ALL ON protocol_yield_sources TO app_user;
-- GRANT ALL ON protocol_user_cohorts TO app_user;
-- GRANT ALL ON protocol_competitive_metrics TO app_user;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables were created
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.table_name) as index_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'protocol_performance_metrics',
    'protocol_yield_sources',
    'protocol_user_cohorts',
    'protocol_competitive_metrics'
  )
ORDER BY table_name;

