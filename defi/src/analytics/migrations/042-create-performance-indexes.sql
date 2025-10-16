-- Migration 042: Create Performance Indexes for MEV Analytics
-- Story: 4.1.3 - Advanced MEV Analytics
-- Purpose: Optimize query performance for bot tracking and enrichment
-- Author: AI Assistant
-- Date: 2025-10-16

-- ============================================================================
-- INDEXES FOR mev_opportunities TABLE
-- ============================================================================

-- Index for bot address + chain_id lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_mev_opportunities_bot_chain 
ON mev_opportunities(bot_address, chain_id);

-- Index for timestamp-based queries (time series analysis)
CREATE INDEX IF NOT EXISTS idx_mev_opportunities_timestamp 
ON mev_opportunities(timestamp DESC);

-- Index for bot + timestamp (bot activity timeline)
CREATE INDEX IF NOT EXISTS idx_mev_opportunities_bot_timestamp 
ON mev_opportunities(bot_address, timestamp DESC);

-- Index for chain + timestamp (chain-specific analysis)
CREATE INDEX IF NOT EXISTS idx_mev_opportunities_chain_timestamp 
ON mev_opportunities(chain_id, timestamp DESC);

-- Index for MEV type analysis
CREATE INDEX IF NOT EXISTS idx_mev_opportunities_type 
ON mev_opportunities(mev_type);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_mev_opportunities_status 
ON mev_opportunities(status);

-- Composite index for bot performance queries
CREATE INDEX IF NOT EXISTS idx_mev_opportunities_bot_performance 
ON mev_opportunities(bot_address, chain_id, timestamp DESC, mev_profit_usd);

-- ============================================================================
-- INDEXES FOR mev_bots TABLE
-- ============================================================================

-- Index for bot address lookups
CREATE INDEX IF NOT EXISTS idx_mev_bots_address 
ON mev_bots(bot_address);

-- Index for chain_id filtering
CREATE INDEX IF NOT EXISTS idx_mev_bots_chain 
ON mev_bots(chain_id);

-- Index for bot + chain (primary lookup pattern)
CREATE INDEX IF NOT EXISTS idx_mev_bots_address_chain 
ON mev_bots(bot_address, chain_id);

-- Index for total MEV sorting
CREATE INDEX IF NOT EXISTS idx_mev_bots_total_mev 
ON mev_bots(total_mev_extracted_usd DESC);

-- Index for last active timestamp
CREATE INDEX IF NOT EXISTS idx_mev_bots_last_active 
ON mev_bots(last_active_at DESC);

-- Index for bot name searches
CREATE INDEX IF NOT EXISTS idx_mev_bots_name 
ON mev_bots(bot_name);

-- ============================================================================
-- INDEXES FOR mev_profit_attribution TABLE
-- ============================================================================

-- Index for bot + chain + date lookups
CREATE INDEX IF NOT EXISTS idx_mev_profit_attribution_bot_chain_date 
ON mev_profit_attribution(bot_address, chain_id, attribution_date DESC);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_mev_profit_attribution_date 
ON mev_profit_attribution(attribution_date DESC);

-- Index for MEV type analysis
CREATE INDEX IF NOT EXISTS idx_mev_profit_attribution_type 
ON mev_profit_attribution(mev_type);

-- Index for protocol analysis
CREATE INDEX IF NOT EXISTS idx_mev_profit_attribution_protocol 
ON mev_profit_attribution(protocol_name);

-- ============================================================================
-- INDEXES FOR protocol_mev_leakage TABLE
-- ============================================================================

-- Index for protocol + chain + date lookups
CREATE INDEX IF NOT EXISTS idx_protocol_mev_leakage_protocol_chain_date 
ON protocol_mev_leakage(protocol_name, chain_id, leakage_date DESC);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_protocol_mev_leakage_date 
ON protocol_mev_leakage(leakage_date DESC);

-- Index for chain filtering
CREATE INDEX IF NOT EXISTS idx_protocol_mev_leakage_chain 
ON protocol_mev_leakage(chain_id);

-- Index for total leakage sorting
CREATE INDEX IF NOT EXISTS idx_protocol_mev_leakage_total 
ON protocol_mev_leakage(total_mev_leaked_usd DESC);

-- ============================================================================
-- INDEXES FOR mev_market_trends TABLE
-- ============================================================================

-- Index for chain + date lookups
CREATE INDEX IF NOT EXISTS idx_mev_market_trends_chain_date 
ON mev_market_trends(chain_id, trend_date DESC);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_mev_market_trends_date 
ON mev_market_trends(trend_date DESC);

-- Index for chain filtering
CREATE INDEX IF NOT EXISTS idx_mev_market_trends_chain 
ON mev_market_trends(chain_id);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

-- Update statistics for query planner optimization
ANALYZE mev_opportunities;
ANALYZE mev_bots;
ANALYZE mev_profit_attribution;
ANALYZE protocol_mev_leakage;
ANALYZE mev_market_trends;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'mev_opportunities',
  'mev_bots',
  'mev_profit_attribution',
  'protocol_mev_leakage',
  'mev_market_trends'
)
ORDER BY tablename, indexname;

