-- Migration: Create suspicious_activities table
-- Story: 3.2.2 - Suspicious Activity Detection
-- Description: Table for storing detected suspicious activities (rug pulls, wash trading, pump & dump, sybil attacks)

CREATE TABLE IF NOT EXISTS suspicious_activities (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Activity Classification
  activity_type VARCHAR(50) NOT NULL, -- 'rug_pull', 'wash_trading', 'pump_dump', 'sybil_attack'
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  confidence_score DECIMAL(5, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Entity Information
  protocol_id VARCHAR(255),
  wallet_addresses VARCHAR(255)[], -- Array of involved wallet addresses
  token_addresses VARCHAR(255)[], -- Array of involved token addresses
  chain_id VARCHAR(50) NOT NULL,
  
  -- Detection Metadata
  detection_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  detection_method VARCHAR(50), -- 'ml_model', 'rule_based', 'manual_report', 'hybrid'
  detector_version VARCHAR(20), -- Version of detector that found this activity
  
  -- Evidence
  evidence_tx_hashes VARCHAR(255)[], -- Array of transaction hashes as evidence
  evidence_description TEXT, -- Human-readable description of evidence
  evidence_metrics JSONB, -- Detailed metrics (e.g., {liquidity_removed: 0.75, timeframe: 3600})
  
  -- Impact Assessment
  estimated_loss_usd DECIMAL(20, 2), -- Estimated financial loss in USD
  affected_users INTEGER, -- Number of users affected
  affected_protocols VARCHAR(255)[], -- Array of affected protocol IDs
  
  -- Investigation Status
  status VARCHAR(20) DEFAULT 'investigating', -- 'investigating', 'confirmed', 'false_positive', 'resolved'
  investigation_notes TEXT, -- Notes from investigation
  resolution_timestamp TIMESTAMP, -- When the investigation was resolved
  
  -- Alert Tracking
  alert_sent BOOLEAN DEFAULT FALSE, -- Whether alert was sent
  reported_to_authorities BOOLEAN DEFAULT FALSE, -- Whether reported to authorities
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_suspicious_activities_type ON suspicious_activities(activity_type);
CREATE INDEX idx_suspicious_activities_severity ON suspicious_activities(severity);
CREATE INDEX idx_suspicious_activities_protocol ON suspicious_activities(protocol_id);
CREATE INDEX idx_suspicious_activities_timestamp ON suspicious_activities(detection_timestamp DESC);
CREATE INDEX idx_suspicious_activities_status ON suspicious_activities(status);
CREATE INDEX idx_suspicious_activities_chain ON suspicious_activities(chain_id);

-- Comments
COMMENT ON TABLE suspicious_activities IS 'Stores detected suspicious activities including rug pulls, wash trading, pump & dump schemes, and sybil attacks';
COMMENT ON COLUMN suspicious_activities.activity_type IS 'Type of suspicious activity: rug_pull, wash_trading, pump_dump, sybil_attack';
COMMENT ON COLUMN suspicious_activities.severity IS 'Severity level: critical, high, medium, low';
COMMENT ON COLUMN suspicious_activities.confidence_score IS 'Confidence score 0-100 indicating detection certainty';
COMMENT ON COLUMN suspicious_activities.evidence_metrics IS 'JSONB object containing detailed detection metrics';
COMMENT ON COLUMN suspicious_activities.status IS 'Investigation status: investigating, confirmed, false_positive, resolved';

