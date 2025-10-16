-- Migration: 026-create-protocol-risk-assessments.sql
-- Story: 3.2.1 - Protocol Risk Assessment
-- Description: Create protocol_risk_assessments table for overall risk scoring

CREATE TABLE IF NOT EXISTS protocol_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  protocol_name VARCHAR(255) NOT NULL,
  assessment_date TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Overall risk score (0-100, lower is better)
  overall_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  risk_category VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  
  -- Risk factor scores (0-100 each)
  contract_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  contract_risk_weight DECIMAL(3, 2) NOT NULL DEFAULT 0.30, -- 30%
  
  liquidity_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  liquidity_risk_weight DECIMAL(3, 2) NOT NULL DEFAULT 0.25, -- 25%
  
  governance_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  governance_risk_weight DECIMAL(3, 2) NOT NULL DEFAULT 0.20, -- 20%
  
  operational_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  operational_risk_weight DECIMAL(3, 2) NOT NULL DEFAULT 0.15, -- 15%
  
  market_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  market_risk_weight DECIMAL(3, 2) NOT NULL DEFAULT 0.10, -- 10%
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_overall_risk_score CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
  CONSTRAINT check_risk_category CHECK (risk_category IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT check_contract_risk_score CHECK (contract_risk_score >= 0 AND contract_risk_score <= 100),
  CONSTRAINT check_liquidity_risk_score CHECK (liquidity_risk_score >= 0 AND liquidity_risk_score <= 100),
  CONSTRAINT check_governance_risk_score CHECK (governance_risk_score >= 0 AND governance_risk_score <= 100),
  CONSTRAINT check_operational_risk_score CHECK (operational_risk_score >= 0 AND operational_risk_score <= 100),
  CONSTRAINT check_market_risk_score CHECK (market_risk_score >= 0 AND market_risk_score <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_protocol_risk_protocol_id 
  ON protocol_risk_assessments(protocol_id);

CREATE INDEX IF NOT EXISTS idx_protocol_risk_assessment_date 
  ON protocol_risk_assessments(assessment_date DESC);

CREATE INDEX IF NOT EXISTS idx_protocol_risk_overall_score 
  ON protocol_risk_assessments(overall_risk_score ASC);

CREATE INDEX IF NOT EXISTS idx_protocol_risk_category 
  ON protocol_risk_assessments(risk_category);

CREATE INDEX IF NOT EXISTS idx_protocol_risk_protocol_date 
  ON protocol_risk_assessments(protocol_id, assessment_date DESC);

-- Comments
COMMENT ON TABLE protocol_risk_assessments IS 'Overall risk assessments for DeFi protocols';
COMMENT ON COLUMN protocol_risk_assessments.overall_risk_score IS 'Weighted average of all risk factors (0-100, lower is better)';
COMMENT ON COLUMN protocol_risk_assessments.risk_category IS 'Risk categorization: low (0-30), medium (31-60), high (61-80), critical (81-100)';
COMMENT ON COLUMN protocol_risk_assessments.contract_risk_weight IS 'Weight for contract risk factor (default: 30%)';
COMMENT ON COLUMN protocol_risk_assessments.liquidity_risk_weight IS 'Weight for liquidity risk factor (default: 25%)';
COMMENT ON COLUMN protocol_risk_assessments.governance_risk_weight IS 'Weight for governance risk factor (default: 20%)';
COMMENT ON COLUMN protocol_risk_assessments.operational_risk_weight IS 'Weight for operational risk factor (default: 15%)';
COMMENT ON COLUMN protocol_risk_assessments.market_risk_weight IS 'Weight for market risk factor (default: 10%)';

