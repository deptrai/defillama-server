-- Migration: 027-create-protocol-contract-risks.sql
-- Story: 3.2.1 - Protocol Risk Assessment
-- Description: Create protocol_contract_risks table for smart contract risk analysis

CREATE TABLE IF NOT EXISTS protocol_contract_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  
  -- Audit information
  audit_status VARCHAR(50) NOT NULL, -- 'audited', 'unaudited', 'in_progress', 'none'
  auditor_names JSONB DEFAULT '[]'::jsonb, -- Array of auditor names
  auditor_reputation_score DECIMAL(5, 2) DEFAULT NULL, -- 0-100, higher is better
  audit_date DATE DEFAULT NULL,
  audit_report_url VARCHAR(500) DEFAULT NULL,
  
  -- Vulnerability tracking
  known_vulnerabilities_count INTEGER NOT NULL DEFAULT 0,
  critical_vulnerabilities INTEGER NOT NULL DEFAULT 0,
  high_vulnerabilities INTEGER NOT NULL DEFAULT 0,
  medium_vulnerabilities INTEGER NOT NULL DEFAULT 0,
  low_vulnerabilities INTEGER NOT NULL DEFAULT 0,
  vulnerability_ids JSONB DEFAULT '[]'::jsonb, -- Array of CWE IDs
  
  -- Code quality metrics
  code_complexity_score DECIMAL(5, 2) DEFAULT NULL, -- 0-100, lower is better
  contract_age_days INTEGER DEFAULT NULL,
  lines_of_code INTEGER DEFAULT NULL,
  function_count INTEGER DEFAULT NULL,
  
  -- Risk score
  contract_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_audit_status CHECK (audit_status IN ('audited', 'unaudited', 'in_progress', 'none')),
  CONSTRAINT check_auditor_reputation CHECK (auditor_reputation_score IS NULL OR (auditor_reputation_score >= 0 AND auditor_reputation_score <= 100)),
  CONSTRAINT check_code_complexity CHECK (code_complexity_score IS NULL OR (code_complexity_score >= 0 AND code_complexity_score <= 100)),
  CONSTRAINT check_contract_risk_score CHECK (contract_risk_score >= 0 AND contract_risk_score <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_risk_protocol_id 
  ON protocol_contract_risks(protocol_id);

CREATE INDEX IF NOT EXISTS idx_contract_risk_audit_status 
  ON protocol_contract_risks(audit_status);

CREATE INDEX IF NOT EXISTS idx_contract_risk_score 
  ON protocol_contract_risks(contract_risk_score ASC);

CREATE INDEX IF NOT EXISTS idx_contract_risk_vulnerabilities 
  ON protocol_contract_risks(known_vulnerabilities_count DESC);

-- Comments
COMMENT ON TABLE protocol_contract_risks IS 'Smart contract risk analysis for DeFi protocols';
COMMENT ON COLUMN protocol_contract_risks.auditor_names IS 'Array of auditor names (JSONB)';
COMMENT ON COLUMN protocol_contract_risks.vulnerability_ids IS 'Array of CWE vulnerability IDs (JSONB)';
COMMENT ON COLUMN protocol_contract_risks.code_complexity_score IS 'Code complexity score (0-100, lower is better)';

