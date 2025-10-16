-- Migration: 030-create-protocol-operational-risks.sql
-- Story: 3.2.1 - Protocol Risk Assessment
-- Description: Create protocol_operational_risks table for operational risk analysis

CREATE TABLE IF NOT EXISTS protocol_operational_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  
  -- Protocol age
  protocol_age_days INTEGER DEFAULT NULL,
  launch_date DATE DEFAULT NULL,
  
  -- Team information
  team_doxxed BOOLEAN DEFAULT FALSE,
  team_reputation_score DECIMAL(5, 2) DEFAULT NULL, -- 0-100, higher is better
  team_size INTEGER DEFAULT NULL,
  
  -- Incident tracking
  incident_count INTEGER NOT NULL DEFAULT 0,
  critical_incidents INTEGER NOT NULL DEFAULT 0,
  high_incidents INTEGER NOT NULL DEFAULT 0,
  medium_incidents INTEGER NOT NULL DEFAULT 0,
  low_incidents INTEGER NOT NULL DEFAULT 0,
  last_incident_date DATE DEFAULT NULL,
  
  -- Risk score
  operational_risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_team_reputation CHECK (team_reputation_score IS NULL OR (team_reputation_score >= 0 AND team_reputation_score <= 100)),
  CONSTRAINT check_operational_risk_score CHECK (operational_risk_score >= 0 AND operational_risk_score <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operational_risk_protocol_id 
  ON protocol_operational_risks(protocol_id);

CREATE INDEX IF NOT EXISTS idx_operational_risk_age 
  ON protocol_operational_risks(protocol_age_days DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_operational_risk_score 
  ON protocol_operational_risks(operational_risk_score ASC);

CREATE INDEX IF NOT EXISTS idx_operational_risk_incidents 
  ON protocol_operational_risks(incident_count DESC);

-- Comments
COMMENT ON TABLE protocol_operational_risks IS 'Operational risk analysis for DeFi protocols';
COMMENT ON COLUMN protocol_operational_risks.team_doxxed IS 'Whether the team is publicly known (doxxed)';
COMMENT ON COLUMN protocol_operational_risks.team_reputation_score IS 'Team reputation score (0-100, higher is better)';

