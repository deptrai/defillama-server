-- Migration: Create MEV Opportunities Table
-- Story: 4.1.1 - MEV Opportunity Detection
-- Date: 2025-10-16
-- Description: Table for storing detected MEV opportunities (sandwich, frontrun, backrun, arbitrage, liquidation)

-- Drop table if exists (for development)
DROP TABLE IF EXISTS mev_opportunities CASCADE;

-- Create mev_opportunities table
CREATE TABLE mev_opportunities (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- MEV type and chain
  opportunity_type VARCHAR(50) NOT NULL CHECK (opportunity_type IN ('sandwich', 'frontrun', 'backrun', 'arbitrage', 'liquidation')),
  chain_id VARCHAR(50) NOT NULL,
  
  -- Block and timestamp
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- Transaction hashes
  target_tx_hash VARCHAR(255),
  mev_tx_hashes TEXT[], -- Array of MEV transaction hashes
  
  -- Token information
  token_addresses TEXT[], -- Array of token addresses
  token_symbols VARCHAR(50)[], -- Array of token symbols
  
  -- Protocol information
  protocol_id VARCHAR(255),
  protocol_name VARCHAR(255),
  dex_name VARCHAR(255),
  
  -- Financial metrics
  mev_profit_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
  victim_loss_usd DECIMAL(20, 2) DEFAULT 0,
  gas_cost_usd DECIMAL(10, 2) DEFAULT 0,
  net_profit_usd DECIMAL(20, 2) DEFAULT 0,
  
  -- Bot information
  bot_address VARCHAR(255),
  bot_name VARCHAR(255),
  bot_type VARCHAR(50),
  
  -- Detection metadata
  detection_method VARCHAR(50),
  confidence_score DECIMAL(5, 2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Status
  status VARCHAR(20) DEFAULT 'detected' CHECK (status IN ('detected', 'confirmed', 'executed', 'failed')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_mev_opportunities_type 
  ON mev_opportunities(opportunity_type);

CREATE INDEX idx_mev_opportunities_chain 
  ON mev_opportunities(chain_id);

CREATE INDEX idx_mev_opportunities_timestamp 
  ON mev_opportunities(timestamp DESC);

CREATE INDEX idx_mev_opportunities_bot 
  ON mev_opportunities(bot_address);

CREATE INDEX idx_mev_opportunities_profit 
  ON mev_opportunities(mev_profit_usd DESC);

CREATE INDEX idx_mev_opportunities_composite 
  ON mev_opportunities(opportunity_type, chain_id, timestamp DESC);

CREATE INDEX idx_mev_opportunities_block 
  ON mev_opportunities(chain_id, block_number DESC);

-- Add comments for documentation
COMMENT ON TABLE mev_opportunities IS 'MEV opportunities detected across multiple chains (sandwich, frontrun, backrun, arbitrage, liquidation)';
COMMENT ON COLUMN mev_opportunities.opportunity_type IS 'Type of MEV: sandwich, frontrun, backrun, arbitrage, liquidation';
COMMENT ON COLUMN mev_opportunities.chain_id IS 'Blockchain identifier (ethereum, arbitrum, optimism, base, polygon, etc.)';
COMMENT ON COLUMN mev_opportunities.mev_profit_usd IS 'Gross MEV profit in USD';
COMMENT ON COLUMN mev_opportunities.victim_loss_usd IS 'Loss incurred by victim (for sandwich/frontrun)';
COMMENT ON COLUMN mev_opportunities.gas_cost_usd IS 'Gas cost in USD';
COMMENT ON COLUMN mev_opportunities.net_profit_usd IS 'Net profit after gas costs';
COMMENT ON COLUMN mev_opportunities.confidence_score IS 'Detection confidence score (0-100)';
COMMENT ON COLUMN mev_opportunities.status IS 'Opportunity status: detected, confirmed, executed, failed';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_mev_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mev_opportunities_updated_at
  BEFORE UPDATE ON mev_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_mev_opportunities_updated_at();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON mev_opportunities TO defillama_api;
-- GRANT SELECT ON mev_opportunities TO defillama_readonly;

