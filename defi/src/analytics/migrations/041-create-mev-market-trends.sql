-- Migration: Create MEV Market Trends Table
-- Story: 4.1.3 - Advanced MEV Analytics
-- Date: 2025-10-16
-- Description: Table for tracking MEV market trends with daily aggregations

-- Drop table if exists (for development)
DROP TABLE IF EXISTS mev_market_trends CASCADE;

-- Create mev_market_trends table
CREATE TABLE mev_market_trends (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Time and chain
  date DATE NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Total MEV metrics
  total_mev_volume_usd DECIMAL(20, 2) DEFAULT 0,
  total_opportunities INTEGER DEFAULT 0,
  total_executed_opportunities INTEGER DEFAULT 0,
  execution_rate_pct DECIMAL(5, 2) DEFAULT 0, -- Percentage (0-100)
  
  -- Opportunity distribution
  sandwich_count INTEGER DEFAULT 0,
  sandwich_volume_usd DECIMAL(20, 2) DEFAULT 0,
  sandwich_share_pct DECIMAL(5, 2) DEFAULT 0,
  frontrun_count INTEGER DEFAULT 0,
  frontrun_volume_usd DECIMAL(20, 2) DEFAULT 0,
  frontrun_share_pct DECIMAL(5, 2) DEFAULT 0,
  backrun_count INTEGER DEFAULT 0,
  backrun_volume_usd DECIMAL(20, 2) DEFAULT 0,
  backrun_share_pct DECIMAL(5, 2) DEFAULT 0,
  arbitrage_count INTEGER DEFAULT 0,
  arbitrage_volume_usd DECIMAL(20, 2) DEFAULT 0,
  arbitrage_share_pct DECIMAL(5, 2) DEFAULT 0,
  liquidation_count INTEGER DEFAULT 0,
  liquidation_volume_usd DECIMAL(20, 2) DEFAULT 0,
  liquidation_share_pct DECIMAL(5, 2) DEFAULT 0,
  
  -- Profit metrics
  avg_profit_per_opportunity_usd DECIMAL(20, 2) DEFAULT 0,
  median_profit_usd DECIMAL(20, 2) DEFAULT 0,
  max_profit_usd DECIMAL(20, 2) DEFAULT 0,
  min_profit_usd DECIMAL(20, 2) DEFAULT 0,
  
  -- Bot competition metrics
  unique_bots INTEGER DEFAULT 0,
  new_bots INTEGER DEFAULT 0,
  active_bots INTEGER DEFAULT 0,
  bot_concentration_hhi DECIMAL(10, 2) DEFAULT 0, -- Herfindahl-Hirschman Index (0-10000)
  top_10_bots_share_pct DECIMAL(5, 2) DEFAULT 0, -- Top 10 bots' share of total MEV
  
  -- Gas metrics
  avg_gas_price_gwei DECIMAL(10, 2) DEFAULT 0,
  avg_priority_fee_gwei DECIMAL(10, 2) DEFAULT 0,
  total_gas_spent_usd DECIMAL(20, 2) DEFAULT 0,
  
  -- Protocol rankings (top 5)
  top_protocol_1_id VARCHAR(255),
  top_protocol_1_volume_usd DECIMAL(20, 2) DEFAULT 0,
  top_protocol_2_id VARCHAR(255),
  top_protocol_2_volume_usd DECIMAL(20, 2) DEFAULT 0,
  top_protocol_3_id VARCHAR(255),
  top_protocol_3_volume_usd DECIMAL(20, 2) DEFAULT 0,
  top_protocol_4_id VARCHAR(255),
  top_protocol_4_volume_usd DECIMAL(20, 2) DEFAULT 0,
  top_protocol_5_id VARCHAR(255),
  top_protocol_5_volume_usd DECIMAL(20, 2) DEFAULT 0,
  
  -- Token rankings (top 5)
  top_token_1_symbol VARCHAR(50),
  top_token_1_volume_usd DECIMAL(20, 2) DEFAULT 0,
  top_token_2_symbol VARCHAR(50),
  top_token_2_volume_usd DECIMAL(20, 2) DEFAULT 0,
  top_token_3_symbol VARCHAR(50),
  top_token_3_volume_usd DECIMAL(20, 2) DEFAULT 0,
  top_token_4_symbol VARCHAR(50),
  top_token_4_volume_usd DECIMAL(20, 2) DEFAULT 0,
  top_token_5_symbol VARCHAR(50),
  top_token_5_volume_usd DECIMAL(20, 2) DEFAULT 0,
  
  -- Market health indicators
  market_efficiency_score DECIMAL(5, 2) DEFAULT 0 CHECK (market_efficiency_score >= 0 AND market_efficiency_score <= 100),
  competition_level VARCHAR(20) DEFAULT 'medium' CHECK (competition_level IN ('low', 'medium', 'high', 'very_high')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(date, chain_id)
);

-- Create indexes for performance
CREATE INDEX idx_mev_market_trends_date 
  ON mev_market_trends(date DESC);

CREATE INDEX idx_mev_market_trends_chain 
  ON mev_market_trends(chain_id);

CREATE INDEX idx_mev_market_trends_volume 
  ON mev_market_trends(total_mev_volume_usd DESC);

CREATE INDEX idx_mev_market_trends_opportunities 
  ON mev_market_trends(total_opportunities DESC);

CREATE INDEX idx_mev_market_trends_bots 
  ON mev_market_trends(unique_bots DESC);

-- Composite indexes for common queries
CREATE INDEX idx_mev_market_trends_chain_date 
  ON mev_market_trends(chain_id, date DESC);

CREATE INDEX idx_mev_market_trends_date_volume 
  ON mev_market_trends(date DESC, total_mev_volume_usd DESC);

-- Add comments for documentation
COMMENT ON TABLE mev_market_trends IS 'Daily MEV market trends with opportunity distribution, bot competition, and protocol/token rankings';
COMMENT ON COLUMN mev_market_trends.total_mev_volume_usd IS 'Total MEV volume extracted on this date';
COMMENT ON COLUMN mev_market_trends.execution_rate_pct IS 'Percentage of opportunities that were executed (0-100)';
COMMENT ON COLUMN mev_market_trends.bot_concentration_hhi IS 'Herfindahl-Hirschman Index for bot concentration (0-10000)';
COMMENT ON COLUMN mev_market_trends.top_10_bots_share_pct IS 'Top 10 bots share of total MEV (0-100)';
COMMENT ON COLUMN mev_market_trends.market_efficiency_score IS 'Market efficiency score (0-100)';
COMMENT ON COLUMN mev_market_trends.competition_level IS 'Competition level: low, medium, high, very_high';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_mev_market_trends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mev_market_trends_updated_at
  BEFORE UPDATE ON mev_market_trends
  FOR EACH ROW
  EXECUTE FUNCTION update_mev_market_trends_updated_at();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON mev_market_trends TO defillama_api;
-- GRANT SELECT ON mev_market_trends TO defillama_readonly;

