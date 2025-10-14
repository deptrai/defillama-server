-- Migration 004: Protocol Data Tables
-- Purpose: Create tables for protocol metadata, TVL data, and token prices
-- Required for: Story 1.4 - Advanced Query Processor

-- ============================================================================
-- protocols table
-- ============================================================================
CREATE TABLE IF NOT EXISTS protocols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  chains TEXT[],
  description TEXT,
  website TEXT,
  logo_url TEXT,
  twitter TEXT,
  audit_links TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocols_name ON protocols(name);
CREATE INDEX IF NOT EXISTS idx_protocols_category ON protocols(category);

-- ============================================================================
-- protocol_tvl table (time-series data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS protocol_tvl (
  id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  chain TEXT NOT NULL,
  tvl NUMERIC NOT NULL,
  tvl_prev_day NUMERIC,
  tvl_prev_week NUMERIC,
  tvl_prev_month NUMERIC,
  change_1d NUMERIC,
  change_7d NUMERIC,
  change_30d NUMERIC,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_tvl_protocol ON protocol_tvl(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_chain ON protocol_tvl(chain);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_timestamp ON protocol_tvl(timestamp);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_tvl ON protocol_tvl(tvl);
CREATE INDEX IF NOT EXISTS idx_protocol_tvl_protocol_timestamp ON protocol_tvl(protocol_id, timestamp);

-- ============================================================================
-- token_prices table (time-series data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS token_prices (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT,
  price NUMERIC NOT NULL,
  price_prev_day NUMERIC,
  price_prev_week NUMERIC,
  price_prev_month NUMERIC,
  change_1d NUMERIC,
  change_7d NUMERIC,
  change_30d NUMERIC,
  volume_24h NUMERIC,
  market_cap NUMERIC,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_prices_token ON token_prices(token_id);
CREATE INDEX IF NOT EXISTS idx_token_prices_symbol ON token_prices(token_symbol);
CREATE INDEX IF NOT EXISTS idx_token_prices_timestamp ON token_prices(timestamp);
CREATE INDEX IF NOT EXISTS idx_token_prices_price ON token_prices(price);
CREATE INDEX IF NOT EXISTS idx_token_prices_token_timestamp ON token_prices(token_id, timestamp);

-- ============================================================================
-- protocol_stats table (aggregated statistics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS protocol_stats (
  id TEXT PRIMARY KEY,
  protocol_id TEXT NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  total_tvl NUMERIC NOT NULL,
  total_chains INTEGER NOT NULL,
  avg_tvl_per_chain NUMERIC,
  max_tvl NUMERIC,
  min_tvl NUMERIC,
  last_updated TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_stats_protocol ON protocol_stats(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_stats_total_tvl ON protocol_stats(total_tvl);

-- ============================================================================
-- query_cache table (for query result caching)
-- ============================================================================
CREATE TABLE IF NOT EXISTS query_cache (
  cache_key TEXT PRIMARY KEY,
  query_hash TEXT NOT NULL,
  result JSONB NOT NULL,
  hit_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_query_cache_hash ON query_cache(query_hash);

-- ============================================================================
-- query_logs table (for query performance monitoring)
-- ============================================================================
CREATE TABLE IF NOT EXISTS query_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  query_hash TEXT NOT NULL,
  query_params JSONB NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  result_count INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_logs_user ON query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created ON query_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_query_logs_execution_time ON query_logs(execution_time_ms);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE protocols IS 'Protocol metadata and information';
COMMENT ON TABLE protocol_tvl IS 'Time-series TVL data for protocols by chain';
COMMENT ON TABLE token_prices IS 'Time-series price data for tokens';
COMMENT ON TABLE protocol_stats IS 'Aggregated statistics for protocols';
COMMENT ON TABLE query_cache IS 'Cached query results for performance optimization';
COMMENT ON TABLE query_logs IS 'Query execution logs for monitoring and analytics';

COMMENT ON COLUMN protocols.chains IS 'Array of chains where protocol is deployed';
COMMENT ON COLUMN protocol_tvl.tvl IS 'Total Value Locked in USD';
COMMENT ON COLUMN protocol_tvl.change_1d IS 'Percentage change in last 24 hours';
COMMENT ON COLUMN token_prices.price IS 'Token price in USD';
COMMENT ON COLUMN token_prices.volume_24h IS '24-hour trading volume in USD';
COMMENT ON COLUMN query_cache.expires_at IS 'Cache expiration timestamp (TTL)';
COMMENT ON COLUMN query_logs.execution_time_ms IS 'Query execution time in milliseconds';

