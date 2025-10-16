-- Migration: 032-create-protocol-risk-alerts.sql
-- Story: 3.2.1 - Protocol Risk Assessment
-- Description: Create protocol_risk_alerts table for risk alert notifications

CREATE TABLE IF NOT EXISTS protocol_risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  protocol_name VARCHAR(255) NOT NULL,
  
  -- Alert information
  alert_type VARCHAR(50) NOT NULL, -- 'risk_increase', 'vulnerability_detected', 'liquidity_drop', 'governance_change', 'incident_reported', 'audit_expired'
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  
  -- Alert details
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  
  -- Risk scores
  previous_risk_score DECIMAL(5, 2) DEFAULT NULL,
  current_risk_score DECIMAL(5, 2) DEFAULT NULL,
  risk_score_change DECIMAL(5, 2) DEFAULT NULL,
  
  -- Status
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP DEFAULT NULL,
  acknowledged_by VARCHAR(255) DEFAULT NULL,
  
  -- Metadata
  triggered_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_alert_type CHECK (alert_type IN ('risk_increase', 'vulnerability_detected', 'liquidity_drop', 'governance_change', 'incident_reported', 'audit_expired')),
  CONSTRAINT check_severity CHECK (severity IN ('critical', 'high', 'medium', 'low'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_alert_protocol_id 
  ON protocol_risk_alerts(protocol_id);

CREATE INDEX IF NOT EXISTS idx_risk_alert_type 
  ON protocol_risk_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_risk_alert_severity 
  ON protocol_risk_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_risk_alert_acknowledged 
  ON protocol_risk_alerts(acknowledged);

CREATE INDEX IF NOT EXISTS idx_risk_alert_triggered_at 
  ON protocol_risk_alerts(triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_alert_protocol_triggered 
  ON protocol_risk_alerts(protocol_id, triggered_at DESC);

-- Comments
COMMENT ON TABLE protocol_risk_alerts IS 'Risk alert notifications for DeFi protocols';
COMMENT ON COLUMN protocol_risk_alerts.alert_type IS 'Type of alert: risk_increase, vulnerability_detected, liquidity_drop, governance_change, incident_reported, audit_expired';
COMMENT ON COLUMN protocol_risk_alerts.severity IS 'Alert severity: critical, high, medium, low';
COMMENT ON COLUMN protocol_risk_alerts.details IS 'Additional alert details (JSONB)';

