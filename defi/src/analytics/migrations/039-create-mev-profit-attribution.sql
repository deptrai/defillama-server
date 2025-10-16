-- Migration: Create MEV Profit Attribution Table
-- Story: 4.1.3 - Advanced MEV Analytics
-- Date: 2025-10-16
-- Description: Table for attributing MEV profits to bots, protocols, strategies, and tokens

-- Drop table if exists (for development)
DROP TABLE IF EXISTS mev_profit_attribution CASCADE;

-- Create mev_profit_attribution table
CREATE TABLE mev_profit_attribution (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  opportunity_id UUID REFERENCES mev_opportunities(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES mev_bots(id) ON DELETE SET NULL,
  
  -- Attribution dimensions
  bot_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  opportunity_type VARCHAR(50) NOT NULL CHECK (opportunity_type IN ('sandwich', 'frontrun', 'backrun', 'arbitrage', 'liquidation')),
  
  -- Protocol attribution
  protocol_id VARCHAR(255),
  protocol_name VARCHAR(255),
  dex_name VARCHAR(255),
  
  -- Token attribution
  token_addresses TEXT[], -- Array of token addresses involved
  token_symbols VARCHAR(50)[], -- Array of token symbols
  primary_token_address VARCHAR(255), -- Main token for attribution
  primary_token_symbol VARCHAR(50),
  
  -- Time attribution
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  date DATE NOT NULL, -- For daily aggregations
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23), -- For hourly aggregations
  
  -- Financial metrics
  gross_profit_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
  gas_cost_usd DECIMAL(10, 2) DEFAULT 0,
  protocol_fees_usd DECIMAL(10, 2) DEFAULT 0,
  slippage_cost_usd DECIMAL(10, 2) DEFAULT 0,
  other_costs_usd DECIMAL(10, 2) DEFAULT 0,
  net_profit_usd DECIMAL(20, 2) DEFAULT 0,
  
  -- Victim impact (for sandwich/frontrun)
  victim_loss_usd DECIMAL(20, 2) DEFAULT 0,
  victim_address VARCHAR(255),
  
  -- Transaction details
  mev_tx_hashes TEXT[], -- Array of MEV transaction hashes
  target_tx_hash VARCHAR(255),
  
  -- Confidence and quality
  confidence_score DECIMAL(5, 2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  attribution_quality VARCHAR(20) DEFAULT 'medium' CHECK (attribution_quality IN ('high', 'medium', 'low')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_mev_profit_attribution_opportunity 
  ON mev_profit_attribution(opportunity_id);

CREATE INDEX idx_mev_profit_attribution_bot 
  ON mev_profit_attribution(bot_id);

CREATE INDEX idx_mev_profit_attribution_bot_address 
  ON mev_profit_attribution(bot_address);

CREATE INDEX idx_mev_profit_attribution_chain 
  ON mev_profit_attribution(chain_id);

CREATE INDEX idx_mev_profit_attribution_type 
  ON mev_profit_attribution(opportunity_type);

CREATE INDEX idx_mev_profit_attribution_protocol 
  ON mev_profit_attribution(protocol_id);

CREATE INDEX idx_mev_profit_attribution_token 
  ON mev_profit_attribution(primary_token_address);

CREATE INDEX idx_mev_profit_attribution_timestamp 
  ON mev_profit_attribution(timestamp DESC);

CREATE INDEX idx_mev_profit_attribution_date 
  ON mev_profit_attribution(date DESC);

CREATE INDEX idx_mev_profit_attribution_profit 
  ON mev_profit_attribution(net_profit_usd DESC);

-- Composite indexes for common queries
CREATE INDEX idx_mev_profit_attribution_bot_date 
  ON mev_profit_attribution(bot_address, date DESC);

CREATE INDEX idx_mev_profit_attribution_protocol_date 
  ON mev_profit_attribution(protocol_id, date DESC);

CREATE INDEX idx_mev_profit_attribution_type_date 
  ON mev_profit_attribution(opportunity_type, date DESC);

CREATE INDEX idx_mev_profit_attribution_chain_date 
  ON mev_profit_attribution(chain_id, date DESC);

-- Add comments for documentation
COMMENT ON TABLE mev_profit_attribution IS 'MEV profit attribution by bot, protocol, strategy, token, and time';
COMMENT ON COLUMN mev_profit_attribution.opportunity_id IS 'Reference to mev_opportunities table';
COMMENT ON COLUMN mev_profit_attribution.bot_id IS 'Reference to mev_bots table';
COMMENT ON COLUMN mev_profit_attribution.gross_profit_usd IS 'Gross MEV profit before costs';
COMMENT ON COLUMN mev_profit_attribution.net_profit_usd IS 'Net MEV profit after all costs';
COMMENT ON COLUMN mev_profit_attribution.victim_loss_usd IS 'Loss incurred by victim (sandwich/frontrun)';
COMMENT ON COLUMN mev_profit_attribution.attribution_quality IS 'Quality of attribution: high, medium, low';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_mev_profit_attribution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mev_profit_attribution_updated_at
  BEFORE UPDATE ON mev_profit_attribution
  FOR EACH ROW
  EXECUTE FUNCTION update_mev_profit_attribution_updated_at();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON mev_profit_attribution TO defillama_api;
-- GRANT SELECT ON mev_profit_attribution TO defillama_readonly;

