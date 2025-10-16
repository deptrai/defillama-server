-- Migration: Create Protocol MEV Leakage Table
-- Story: 4.1.3 - Advanced MEV Analytics
-- Date: 2025-10-16
-- Description: Table for tracking MEV leakage per protocol with daily aggregations

-- Drop table if exists (for development)
DROP TABLE IF EXISTS protocol_mev_leakage CASCADE;

-- Create protocol_mev_leakage table
CREATE TABLE protocol_mev_leakage (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Protocol identification
  protocol_id VARCHAR(255) NOT NULL,
  protocol_name VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Time dimension
  date DATE NOT NULL,
  
  -- Total MEV metrics
  total_mev_extracted_usd DECIMAL(20, 2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  total_affected_transactions INTEGER DEFAULT 0,
  affected_transaction_pct DECIMAL(5, 2) DEFAULT 0, -- Percentage (0-100)
  
  -- MEV breakdown by type
  sandwich_mev_usd DECIMAL(20, 2) DEFAULT 0,
  sandwich_count INTEGER DEFAULT 0,
  frontrun_mev_usd DECIMAL(20, 2) DEFAULT 0,
  frontrun_count INTEGER DEFAULT 0,
  backrun_mev_usd DECIMAL(20, 2) DEFAULT 0,
  backrun_count INTEGER DEFAULT 0,
  arbitrage_mev_usd DECIMAL(20, 2) DEFAULT 0,
  arbitrage_count INTEGER DEFAULT 0,
  liquidation_mev_usd DECIMAL(20, 2) DEFAULT 0,
  liquidation_count INTEGER DEFAULT 0,
  
  -- User impact metrics
  total_user_loss_usd DECIMAL(20, 2) DEFAULT 0,
  avg_loss_per_affected_tx_usd DECIMAL(20, 2) DEFAULT 0,
  unique_affected_users INTEGER DEFAULT 0,
  
  -- Bot activity metrics
  unique_bots INTEGER DEFAULT 0,
  top_bot_address VARCHAR(255),
  top_bot_extracted_usd DECIMAL(20, 2) DEFAULT 0,
  top_bot_share_pct DECIMAL(5, 2) DEFAULT 0, -- Percentage (0-100)
  
  -- Protocol volume context
  protocol_volume_usd DECIMAL(20, 2) DEFAULT 0,
  mev_to_volume_ratio_pct DECIMAL(5, 2) DEFAULT 0, -- MEV as % of volume
  
  -- Leakage severity
  leakage_severity VARCHAR(20) DEFAULT 'low' CHECK (leakage_severity IN ('low', 'medium', 'high', 'critical')),
  leakage_score DECIMAL(5, 2) DEFAULT 0 CHECK (leakage_score >= 0 AND leakage_score <= 100),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(protocol_id, chain_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_protocol_mev_leakage_protocol 
  ON protocol_mev_leakage(protocol_id);

CREATE INDEX idx_protocol_mev_leakage_chain 
  ON protocol_mev_leakage(chain_id);

CREATE INDEX idx_protocol_mev_leakage_date 
  ON protocol_mev_leakage(date DESC);

CREATE INDEX idx_protocol_mev_leakage_total_extracted 
  ON protocol_mev_leakage(total_mev_extracted_usd DESC);

CREATE INDEX idx_protocol_mev_leakage_severity 
  ON protocol_mev_leakage(leakage_severity);

CREATE INDEX idx_protocol_mev_leakage_score 
  ON protocol_mev_leakage(leakage_score DESC);

-- Composite indexes for common queries
CREATE INDEX idx_protocol_mev_leakage_protocol_date 
  ON protocol_mev_leakage(protocol_id, date DESC);

CREATE INDEX idx_protocol_mev_leakage_chain_date 
  ON protocol_mev_leakage(chain_id, date DESC);

CREATE INDEX idx_protocol_mev_leakage_date_extracted 
  ON protocol_mev_leakage(date DESC, total_mev_extracted_usd DESC);

-- Add comments for documentation
COMMENT ON TABLE protocol_mev_leakage IS 'Daily aggregation of MEV leakage per protocol with breakdown by type and user impact';
COMMENT ON COLUMN protocol_mev_leakage.protocol_id IS 'Protocol identifier (e.g., uniswap-v3, curve, aave)';
COMMENT ON COLUMN protocol_mev_leakage.total_mev_extracted_usd IS 'Total MEV extracted from this protocol on this date';
COMMENT ON COLUMN protocol_mev_leakage.affected_transaction_pct IS 'Percentage of transactions affected by MEV (0-100)';
COMMENT ON COLUMN protocol_mev_leakage.total_user_loss_usd IS 'Total loss incurred by users (sandwich/frontrun victims)';
COMMENT ON COLUMN protocol_mev_leakage.mev_to_volume_ratio_pct IS 'MEV extracted as percentage of protocol volume';
COMMENT ON COLUMN protocol_mev_leakage.leakage_severity IS 'Severity level: low, medium, high, critical';
COMMENT ON COLUMN protocol_mev_leakage.leakage_score IS 'Leakage severity score (0-100)';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_protocol_mev_leakage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_protocol_mev_leakage_updated_at
  BEFORE UPDATE ON protocol_mev_leakage
  FOR EACH ROW
  EXECUTE FUNCTION update_protocol_mev_leakage_updated_at();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON protocol_mev_leakage TO defillama_api;
-- GRANT SELECT ON protocol_mev_leakage TO defillama_readonly;

