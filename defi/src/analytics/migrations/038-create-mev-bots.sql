-- Migration: Create MEV Bots Table
-- Story: 4.1.3 - Advanced MEV Analytics
-- Date: 2025-10-16
-- Description: Table for tracking MEV bot addresses, performance, and behavior

-- Drop table if exists (for development)
DROP TABLE IF EXISTS mev_bots CASCADE;

-- Create mev_bots table
CREATE TABLE mev_bots (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Bot identification
  bot_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  bot_name VARCHAR(255),
  bot_type VARCHAR(50), -- 'sandwich', 'frontrun', 'arbitrage', 'liquidation', 'backrun', 'multi-strategy'
  verified BOOLEAN DEFAULT FALSE,
  
  -- Performance metrics
  total_mev_extracted_usd DECIMAL(20, 2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage (0-100)
  avg_profit_per_tx_usd DECIMAL(20, 2) DEFAULT 0,
  total_gas_spent_usd DECIMAL(20, 2) DEFAULT 0,
  net_profit_usd DECIMAL(20, 2) DEFAULT 0,
  
  -- Activity metrics
  first_seen TIMESTAMP NOT NULL,
  last_active TIMESTAMP,
  active_days INTEGER DEFAULT 0,
  total_blocks_active INTEGER DEFAULT 0,
  
  -- Strategy analysis (JSON arrays)
  preferred_opportunity_types TEXT[], -- ['sandwich', 'frontrun', ...]
  preferred_protocols TEXT[], -- ['uniswap-v3', 'curve', ...]
  preferred_tokens TEXT[], -- ['WETH', 'USDC', ...]
  preferred_dexes TEXT[], -- ['uniswap', 'sushiswap', ...]
  
  -- Sophistication metrics
  sophistication_score DECIMAL(5, 2) DEFAULT 0 CHECK (sophistication_score >= 0 AND sophistication_score <= 100),
  uses_flashbots BOOLEAN DEFAULT FALSE,
  uses_private_mempool BOOLEAN DEFAULT FALSE,
  uses_multi_hop BOOLEAN DEFAULT FALSE,
  uses_flash_loans BOOLEAN DEFAULT FALSE,
  
  -- Competition metrics
  avg_gas_price_gwei DECIMAL(10, 2) DEFAULT 0,
  max_gas_price_gwei DECIMAL(10, 2) DEFAULT 0,
  avg_priority_fee_gwei DECIMAL(10, 2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(bot_address, chain_id)
);

-- Create indexes for performance
CREATE INDEX idx_mev_bots_address 
  ON mev_bots(bot_address);

CREATE INDEX idx_mev_bots_chain 
  ON mev_bots(chain_id);

CREATE INDEX idx_mev_bots_type 
  ON mev_bots(bot_type);

CREATE INDEX idx_mev_bots_total_extracted 
  ON mev_bots(total_mev_extracted_usd DESC);

CREATE INDEX idx_mev_bots_success_rate 
  ON mev_bots(success_rate DESC);

CREATE INDEX idx_mev_bots_last_active 
  ON mev_bots(last_active DESC);

CREATE INDEX idx_mev_bots_sophistication 
  ON mev_bots(sophistication_score DESC);

CREATE INDEX idx_mev_bots_composite 
  ON mev_bots(chain_id, bot_type, total_mev_extracted_usd DESC);

-- Add comments for documentation
COMMENT ON TABLE mev_bots IS 'MEV bot tracking with performance metrics, strategy analysis, and sophistication scoring';
COMMENT ON COLUMN mev_bots.bot_address IS 'Ethereum address of the MEV bot';
COMMENT ON COLUMN mev_bots.chain_id IS 'Blockchain identifier (ethereum, arbitrum, optimism, base, polygon, etc.)';
COMMENT ON COLUMN mev_bots.bot_type IS 'Primary MEV strategy: sandwich, frontrun, arbitrage, liquidation, backrun, multi-strategy';
COMMENT ON COLUMN mev_bots.total_mev_extracted_usd IS 'Total MEV profit extracted in USD (gross)';
COMMENT ON COLUMN mev_bots.success_rate IS 'Percentage of successful transactions (0-100)';
COMMENT ON COLUMN mev_bots.sophistication_score IS 'Bot sophistication score based on strategy complexity (0-100)';
COMMENT ON COLUMN mev_bots.uses_flashbots IS 'Whether bot uses Flashbots for private transactions';
COMMENT ON COLUMN mev_bots.uses_private_mempool IS 'Whether bot uses private mempool (Eden, etc.)';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_mev_bots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mev_bots_updated_at
  BEFORE UPDATE ON mev_bots
  FOR EACH ROW
  EXECUTE FUNCTION update_mev_bots_updated_at();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON mev_bots TO defillama_api;
-- GRANT SELECT ON mev_bots TO defillama_readonly;

