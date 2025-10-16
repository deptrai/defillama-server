-- Migration: 029-create-protocol-governance-risks.sql
-- Story: 3.2.1 - Protocol Risk Assessment
-- Description: Create protocol_governance_risks table for governance risk analysis

CREATE TABLE IF NOT EXISTS protocol_governance_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  
  -- Governance structure
  governance_type VARCHAR(50) NOT NULL, -- 'dao', 'multisig', 'centralized', 'none'
  
  -- Multisig information
  multisig_threshold INTEGER DEFAULT NULL,
  multisig_signers_count INTEGER DEFAULT NULL,
  
  -- Token distribution
  token_distribution_gini DECIMAL(5, 4) DEFAULT NULL, -- 0-1, lower is better (more equal)
  governance_token_symbol VARCHAR(20) DEFAULT NULL,
  
  -- Admin key management
  admin_key_holders JSONB DEFAULT '[]'::jsonb, -- Array of admin addresses
  admin_key_count INTEGER DEFAULT NULL,
  timelock_delay_hours INTEGER DEFAULT NULL,
  
  -- Risk score
  governance_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_governance_type CHECK (governance_type IN ('dao', 'multisig', 'centralized', 'none')),
  CONSTRAINT check_token_gini CHECK (token_distribution_gini IS NULL OR (token_distribution_gini >= 0 AND token_distribution_gini <= 1)),
  CONSTRAINT check_governance_risk_score CHECK (governance_risk_score >= 0 AND governance_risk_score <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_governance_risk_protocol_id 
  ON protocol_governance_risks(protocol_id);

CREATE INDEX IF NOT EXISTS idx_governance_risk_type 
  ON protocol_governance_risks(governance_type);

CREATE INDEX IF NOT EXISTS idx_governance_risk_score 
  ON protocol_governance_risks(governance_risk_score ASC);

CREATE INDEX IF NOT EXISTS idx_governance_risk_gini 
  ON protocol_governance_risks(token_distribution_gini ASC NULLS LAST);

-- Comments
COMMENT ON TABLE protocol_governance_risks IS 'Governance risk analysis for DeFi protocols';
COMMENT ON COLUMN protocol_governance_risks.token_distribution_gini IS 'Gini coefficient for token distribution (0-1, lower is better)';
COMMENT ON COLUMN protocol_governance_risks.admin_key_holders IS 'Array of admin key holder addresses (JSONB)';

