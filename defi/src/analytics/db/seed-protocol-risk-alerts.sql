-- Seed data for protocol_risk_alerts
-- Story: 3.2.1 - Protocol Risk Assessment

-- Alert 1: Risky Protocol - Critical vulnerability detected
INSERT INTO protocol_risk_alerts (
  protocol_id, protocol_name, alert_type, severity, message, details,
  previous_risk_score, current_risk_score, risk_score_change, acknowledged
) VALUES (
  'risky-protocol', 'Risky Protocol', 'vulnerability_detected', 'critical',
  'Critical vulnerability detected: Reentrancy attack vector in withdraw function',
  '{"cwe_id": "CWE-362", "severity": "critical", "affected_function": "withdraw", "recommendation": "Immediate patch required"}'::jsonb,
  75.00, 85.00, 10.00, FALSE
) ON CONFLICT DO NOTHING;

-- Alert 2: Scam Protocol - Liquidity drop
INSERT INTO protocol_risk_alerts (
  protocol_id, protocol_name, alert_type, severity, message, details,
  previous_risk_score, current_risk_score, risk_score_change, acknowledged
) VALUES (
  'scam-protocol', 'Scam Protocol', 'liquidity_drop', 'critical',
  'Critical liquidity drop: TVL decreased by 78% in 30 days',
  '{"tvl_before": 4500000, "tvl_after": 1000000, "drop_percentage": 78.0, "timeframe": "30d"}'::jsonb,
  88.00, 95.00, 7.00, FALSE
) ON CONFLICT DO NOTHING;

-- Alert 3: Unaudited DEX - Risk increase
INSERT INTO protocol_risk_alerts (
  protocol_id, protocol_name, alert_type, severity, message, details,
  previous_risk_score, current_risk_score, risk_score_change, acknowledged
) VALUES (
  'unaudited-dex', 'Unaudited DEX', 'risk_increase', 'high',
  'Risk score increased by 25 points in 24 hours due to multiple vulnerabilities',
  '{"previous_vulnerabilities": 3, "current_vulnerabilities": 8, "new_critical": 1, "new_high": 3}'::jsonb,
  50.00, 75.00, 25.00, FALSE
) ON CONFLICT DO NOTHING;

-- Alert 4: New Protocol X - Governance change
INSERT INTO protocol_risk_alerts (
  protocol_id, protocol_name, alert_type, severity, message, details,
  previous_risk_score, current_risk_score, risk_score_change, acknowledged
) VALUES (
  'new-protocol-x', 'New Protocol X', 'governance_change', 'high',
  'Governance change detected: Multisig threshold reduced from 4/5 to 3/5',
  '{"previous_threshold": 4, "current_threshold": 3, "previous_signers": 5, "current_signers": 5}'::jsonb,
  60.00, 68.00, 8.00, FALSE
) ON CONFLICT DO NOTHING;

-- Alert 5: SushiSwap - Incident reported
INSERT INTO protocol_risk_alerts (
  protocol_id, protocol_name, alert_type, severity, message, details,
  previous_risk_score, current_risk_score, risk_score_change, acknowledged
) VALUES (
  'sushiswap', 'SushiSwap', 'incident_reported', 'medium',
  'Security incident reported: Unauthorized access attempt detected and blocked',
  '{"incident_type": "unauthorized_access", "status": "blocked", "impact": "none", "date": "2024-05-20"}'::jsonb,
  42.00, 45.00, 3.00, TRUE
) ON CONFLICT DO NOTHING;

-- Alert 6: Curve Finance - Audit expired
INSERT INTO protocol_risk_alerts (
  protocol_id, protocol_name, alert_type, severity, message, details,
  previous_risk_score, current_risk_score, risk_score_change, acknowledged
) VALUES (
  'curve-finance', 'Curve Finance', 'audit_expired', 'medium',
  'Audit report is over 4 years old, recommend re-audit',
  '{"audit_date": "2020-08-20", "auditor": "Trail of Bits", "age_days": 1675, "recommendation": "Schedule re-audit"}'::jsonb,
  25.00, 28.00, 3.00, FALSE
) ON CONFLICT DO NOTHING;

-- Alert 7: Risky Protocol - Liquidity drop
INSERT INTO protocol_risk_alerts (
  protocol_id, protocol_name, alert_type, severity, message, details,
  previous_risk_score, current_risk_score, risk_score_change, acknowledged
) VALUES (
  'risky-protocol', 'Risky Protocol', 'liquidity_drop', 'critical',
  'Critical liquidity drop: TVL decreased by 62.5% in 30 days',
  '{"tvl_before": 13333333, "tvl_after": 5000000, "drop_percentage": 62.5, "timeframe": "30d"}'::jsonb,
  80.00, 85.00, 5.00, FALSE
) ON CONFLICT DO NOTHING;

-- Alert 8: Unaudited DEX - Incident reported
INSERT INTO protocol_risk_alerts (
  protocol_id, protocol_name, alert_type, severity, message, details,
  previous_risk_score, current_risk_score, risk_score_change, acknowledged
) VALUES (
  'unaudited-dex', 'Unaudited DEX', 'incident_reported', 'critical',
  'Critical incident: Smart contract exploit resulted in $500K loss',
  '{"incident_type": "exploit", "loss_usd": 500000, "status": "investigating", "date": "2025-02-10"}'::jsonb,
  70.00, 75.00, 5.00, FALSE
) ON CONFLICT DO NOTHING;

-- Alert 9: Scam Protocol - Multiple critical issues
INSERT INTO protocol_risk_alerts (
  protocol_id, protocol_name, alert_type, severity, message, details,
  previous_risk_score, current_risk_score, risk_score_change, acknowledged
) VALUES (
  'scam-protocol', 'Scam Protocol', 'vulnerability_detected', 'critical',
  'Multiple critical vulnerabilities detected: Reentrancy, access control, integer overflow',
  '{"vulnerabilities": ["CWE-362", "CWE-284", "CWE-682"], "critical_count": 5, "high_count": 6}'::jsonb,
  90.00, 95.00, 5.00, FALSE
) ON CONFLICT DO NOTHING;

-- Alert 10: PancakeSwap - Risk increase (acknowledged)
INSERT INTO protocol_risk_alerts (
  protocol_id, protocol_name, alert_type, severity, message, details,
  previous_risk_score, current_risk_score, risk_score_change, acknowledged, acknowledged_at, acknowledged_by
) VALUES (
  'pancakeswap', 'PancakeSwap', 'risk_increase', 'medium',
  'Risk score increased by 12 points due to governance concerns',
  '{"governance_change": "multisig_threshold_reduced", "previous_threshold": 6, "current_threshold": 5}'::jsonb,
  30.00, 42.00, 12.00, TRUE, NOW() - INTERVAL '2 days', 'admin@pancakeswap.finance'
) ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT protocol_name, alert_type, severity, acknowledged 
FROM protocol_risk_alerts 
ORDER BY triggered_at DESC;

