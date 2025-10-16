-- Migration: Create compliance_screenings table
-- Story: 3.2.3 - Compliance Monitoring
-- Phase 1: Database Setup

-- Create compliance_screenings table
CREATE TABLE IF NOT EXISTS compliance_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_type VARCHAR(50) NOT NULL,
  wallet_address VARCHAR(255),
  transaction_hash VARCHAR(255),
  chain_id VARCHAR(50) NOT NULL,
  screening_result VARCHAR(20) NOT NULL,
  risk_level VARCHAR(20),
  risk_score DECIMAL(5, 2),
  sanctions_match BOOLEAN DEFAULT FALSE,
  sanctions_list VARCHAR(100),
  pep_match BOOLEAN DEFAULT FALSE,
  adverse_media BOOLEAN DEFAULT FALSE,
  match_details JSONB,
  screening_provider VARCHAR(50),
  screening_timestamp TIMESTAMP NOT NULL,
  screening_version VARCHAR(20),
  alert_generated BOOLEAN DEFAULT FALSE,
  manual_review_required BOOLEAN DEFAULT FALSE,
  review_status VARCHAR(20),
  reviewer_id VARCHAR(100),
  review_notes TEXT,
  review_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_compliance_screenings_wallet 
  ON compliance_screenings(wallet_address);

CREATE INDEX IF NOT EXISTS idx_compliance_screenings_tx 
  ON compliance_screenings(transaction_hash);

CREATE INDEX IF NOT EXISTS idx_compliance_screenings_result 
  ON compliance_screenings(screening_result);

CREATE INDEX IF NOT EXISTS idx_compliance_screenings_timestamp 
  ON compliance_screenings(screening_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_screenings_review 
  ON compliance_screenings(manual_review_required, review_status);

CREATE INDEX IF NOT EXISTS idx_compliance_screenings_chain 
  ON compliance_screenings(chain_id);

CREATE INDEX IF NOT EXISTS idx_compliance_screenings_type 
  ON compliance_screenings(screening_type);

-- Add comments
COMMENT ON TABLE compliance_screenings IS 'Compliance screening results for sanctions, AML, KYC, PEP, and adverse media';
COMMENT ON COLUMN compliance_screenings.screening_type IS 'Type of screening: sanctions, aml, kyc, pep, adverse_media, comprehensive';
COMMENT ON COLUMN compliance_screenings.screening_result IS 'Result: clear, flagged, review_required';
COMMENT ON COLUMN compliance_screenings.risk_level IS 'Risk level: low, medium, high, critical';
COMMENT ON COLUMN compliance_screenings.risk_score IS 'Risk score: 0-100';
COMMENT ON COLUMN compliance_screenings.match_details IS 'JSON details of matches found';

