-- ============================================================================
-- Story 1.4: Advanced Query Processor - Database Schema
-- ============================================================================
-- This schema defines 5 tables for the Advanced Query Processor:
-- 1. protocols - Protocol metadata
-- 2. protocol_tvl - Protocol TVL data by chain and timestamp
-- 3. token_prices - Token price data with historical changes
-- 4. protocol_stats - Aggregated protocol statistics
-- 5. query_logs - Query execution logs for monitoring and analytics
-- ============================================================================

-- ============================================================================
-- Table: protocols
-- ============================================================================
-- Stores protocol metadata including name, category, chains, and links
-- ============================================================================

CREATE TABLE IF NOT EXISTS protocols (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  chains TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  website VARCHAR(500),
  logo_url VARCHAR(500),
  twitter VARCHAR(100),
  audit_links TEXT[] DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for protocols table
CREATE INDEX IF NOT EXISTS idx_protocols_category ON protocols(category);
CREATE INDEX IF NOT EXISTS idx_protocols_chains ON protocols USING GIN(chains);
CREATE INDEX IF NOT EXISTS idx_protocols_created_at ON protocols(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_protocols_name ON protocols(name);

-- ============================================================================
-- Table: protocol_tvl
-- ============================================================================
-- Stores protocol TVL data by chain and timestamp with historical changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS protocol_tvl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  chain VARCHAR(100) NOT NULL,
  tvl NUMERIC(20, 8) NOT NULL,
  tvl_prev_day NUMERIC(20, 8),
  tvl_prev_week NUMERIC(20, 8),
  tvl_prev_month NUMERIC(20, 8),
  change_1d NUMERIC(10, 2),
  change_7d NUMERIC(10, 2),
  change_30d NUMERIC(10, 2),
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for protocol_tvl table
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_protocol_id ON protocol_tvl(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_chain ON protocol_tvl(chain);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_timestamp ON protocol_tvl(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_tvl ON protocol_tvl(tvl DESC);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_change_1d ON protocol_tvl(change_1d DESC);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_change_7d ON protocol_tvl(change_7d DESC);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_change_30d ON protocol_tvl(change_30d DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_protocol_chain ON protocol_tvl(protocol_id, chain);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_chain_timestamp ON protocol_tvl(chain, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_protocol_timestamp ON protocol_tvl(protocol_id, timestamp DESC);

-- ============================================================================
-- Table: token_prices
-- ============================================================================
-- Stores token price data with historical changes and market metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id VARCHAR(255) NOT NULL,
  token_symbol VARCHAR(50) NOT NULL,
  token_name VARCHAR(255) NOT NULL,
  price NUMERIC(20, 8) NOT NULL,
  price_prev_day NUMERIC(20, 8),
  price_prev_week NUMERIC(20, 8),
  price_prev_month NUMERIC(20, 8),
  change_1d NUMERIC(10, 2),
  change_7d NUMERIC(10, 2),
  change_30d NUMERIC(10, 2),
  volume_24h NUMERIC(20, 2),
  market_cap NUMERIC(20, 2),
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for token_prices table
CREATE INDEX IF NOT EXISTS idx_token_prices_token_id ON token_prices(token_id);
CREATE INDEX IF NOT EXISTS idx_token_prices_token_symbol ON token_prices(token_symbol);
CREATE INDEX IF NOT EXISTS idx_token_prices_timestamp ON token_prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_token_prices_price ON token_prices(price DESC);
CREATE INDEX IF NOT EXISTS idx_token_prices_change_1d ON token_prices(change_1d DESC);
CREATE INDEX IF NOT EXISTS idx_token_prices_change_7d ON token_prices(change_7d DESC);
CREATE INDEX IF NOT EXISTS idx_token_prices_change_30d ON token_prices(change_30d DESC);
CREATE INDEX IF NOT EXISTS idx_token_prices_volume_24h ON token_prices(volume_24h DESC);
CREATE INDEX IF NOT EXISTS idx_token_prices_market_cap ON token_prices(market_cap DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_token_prices_token_timestamp ON token_prices(token_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_token_prices_symbol_timestamp ON token_prices(token_symbol, timestamp DESC);

-- ============================================================================
-- Table: protocol_stats
-- ============================================================================
-- Stores aggregated protocol statistics for quick lookups
-- ============================================================================

CREATE TABLE IF NOT EXISTS protocol_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  total_tvl NUMERIC(20, 8) NOT NULL,
  total_chains INTEGER NOT NULL,
  avg_tvl_per_chain NUMERIC(20, 8),
  max_tvl NUMERIC(20, 8),
  min_tvl NUMERIC(20, 8),
  last_updated TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(protocol_id)
);

-- Indexes for protocol_stats table
CREATE INDEX IF NOT EXISTS idx_protocol_stats_protocol_id ON protocol_stats(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_stats_total_tvl ON protocol_stats(total_tvl DESC);
CREATE INDEX IF NOT EXISTS idx_protocol_stats_total_chains ON protocol_stats(total_chains DESC);
CREATE INDEX IF NOT EXISTS idx_protocol_stats_last_updated ON protocol_stats(last_updated DESC);

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- View: Latest protocol TVL by chain
CREATE OR REPLACE VIEW latest_protocol_tvl AS
SELECT DISTINCT ON (protocol_id, chain)
  protocol_id,
  chain,
  tvl,
  tvl_prev_day,
  tvl_prev_week,
  tvl_prev_month,
  change_1d,
  change_7d,
  change_30d,
  timestamp
FROM protocol_tvl
ORDER BY protocol_id, chain, timestamp DESC;

-- View: Latest token prices
CREATE OR REPLACE VIEW latest_token_prices AS
SELECT DISTINCT ON (token_id)
  token_id,
  token_symbol,
  token_name,
  price,
  price_prev_day,
  price_prev_week,
  price_prev_month,
  change_1d,
  change_7d,
  change_30d,
  volume_24h,
  market_cap,
  timestamp
FROM token_prices
ORDER BY token_id, timestamp DESC;

-- View: Protocol summary with latest stats
CREATE OR REPLACE VIEW protocol_summary AS
SELECT 
  p.id,
  p.name,
  p.category,
  p.chains,
  p.description,
  p.website,
  p.logo_url,
  p.twitter,
  ps.total_tvl,
  ps.total_chains,
  ps.avg_tvl_per_chain,
  ps.max_tvl,
  ps.min_tvl,
  ps.last_updated
FROM protocols p
LEFT JOIN protocol_stats ps ON p.id = ps.protocol_id;

-- ============================================================================
-- Functions for Data Maintenance
-- ============================================================================

-- Function: Update protocol stats
CREATE OR REPLACE FUNCTION update_protocol_stats(p_protocol_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  INSERT INTO protocol_stats (
    protocol_id,
    total_tvl,
    total_chains,
    avg_tvl_per_chain,
    max_tvl,
    min_tvl,
    last_updated
  )
  SELECT 
    protocol_id,
    SUM(tvl) as total_tvl,
    COUNT(DISTINCT chain) as total_chains,
    AVG(tvl) as avg_tvl_per_chain,
    MAX(tvl) as max_tvl,
    MIN(tvl) as min_tvl,
    NOW() as last_updated
  FROM latest_protocol_tvl
  WHERE protocol_id = p_protocol_id
  GROUP BY protocol_id
  ON CONFLICT (protocol_id) DO UPDATE SET
    total_tvl = EXCLUDED.total_tvl,
    total_chains = EXCLUDED.total_chains,
    avg_tvl_per_chain = EXCLUDED.avg_tvl_per_chain,
    max_tvl = EXCLUDED.max_tvl,
    min_tvl = EXCLUDED.min_tvl,
    last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;

-- Function: Update all protocol stats
CREATE OR REPLACE FUNCTION update_all_protocol_stats()
RETURNS VOID AS $$
DECLARE
  protocol_record RECORD;
BEGIN
  FOR protocol_record IN SELECT id FROM protocols LOOP
    PERFORM update_protocol_stats(protocol_record.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update protocols.updated_at on UPDATE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_protocols_updated_at
BEFORE UPDATE ON protocols
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE protocols IS 'Protocol metadata including name, category, chains, and links';
COMMENT ON TABLE protocol_tvl IS 'Protocol TVL data by chain and timestamp with historical changes';
COMMENT ON TABLE token_prices IS 'Token price data with historical changes and market metrics';
COMMENT ON TABLE protocol_stats IS 'Aggregated protocol statistics for quick lookups';

COMMENT ON VIEW latest_protocol_tvl IS 'Latest TVL data for each protocol-chain combination';
COMMENT ON VIEW latest_token_prices IS 'Latest price data for each token';
COMMENT ON VIEW protocol_summary IS 'Protocol summary with latest stats';

COMMENT ON FUNCTION update_protocol_stats IS 'Update aggregated stats for a specific protocol';
COMMENT ON FUNCTION update_all_protocol_stats IS 'Update aggregated stats for all protocols';

-- ============================================================================
-- Table: query_logs
-- ============================================================================
-- Stores query execution logs for monitoring, analytics, and debugging
-- ============================================================================

CREATE TABLE IF NOT EXISTS query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  query_hash VARCHAR(64) NOT NULL,
  query_params JSONB NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  result_count INTEGER NOT NULL,
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for query_logs table
CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_query_hash ON query_logs(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_logs_cache_hit ON query_logs(cache_hit);
CREATE INDEX IF NOT EXISTS idx_query_logs_execution_time ON query_logs(execution_time_ms DESC);

-- Comment
COMMENT ON TABLE query_logs IS 'Query execution logs for monitoring and analytics';

-- ============================================================================
-- End of Schema
-- ============================================================================

