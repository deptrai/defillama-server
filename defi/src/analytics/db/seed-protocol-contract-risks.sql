-- Seed data for protocol_contract_risks
-- Story: 3.2.1 - Protocol Risk Assessment

-- 1. Uniswap V3 - Excellent audit, no vulnerabilities
INSERT INTO protocol_contract_risks (
  protocol_id, audit_status, auditor_names, auditor_reputation_score, audit_date,
  known_vulnerabilities_count, critical_vulnerabilities, high_vulnerabilities, medium_vulnerabilities, low_vulnerabilities,
  vulnerability_ids, code_complexity_score, contract_age_days, contract_risk_score
) VALUES (
  'uniswap-v3', 'audited', 
  '["Trail of Bits", "OpenZeppelin", "ABDK"]'::jsonb, 95.00, '2021-03-15',
  0, 0, 0, 0, 0,
  '[]'::jsonb, 25.00, 1675, 12.00
) ON CONFLICT DO NOTHING;

-- 2. Aave V3 - Multiple audits, minimal vulnerabilities
INSERT INTO protocol_contract_risks (
  protocol_id, audit_status, auditor_names, auditor_reputation_score, audit_date,
  known_vulnerabilities_count, critical_vulnerabilities, high_vulnerabilities, medium_vulnerabilities, low_vulnerabilities,
  vulnerability_ids, code_complexity_score, contract_age_days, contract_risk_score
) VALUES (
  'aave-v3', 'audited',
  '["OpenZeppelin", "Trail of Bits", "Certora"]'::jsonb, 92.00, '2022-01-10',
  2, 0, 0, 1, 1,
  '["CWE-703", "CWE-710"]'::jsonb, 30.00, 1370, 15.00
) ON CONFLICT DO NOTHING;

-- 3. Curve Finance - Well audited, some complexity
INSERT INTO protocol_contract_risks (
  protocol_id, audit_status, auditor_names, auditor_reputation_score, audit_date,
  known_vulnerabilities_count, critical_vulnerabilities, high_vulnerabilities, medium_vulnerabilities, low_vulnerabilities,
  vulnerability_ids, code_complexity_score, contract_age_days, contract_risk_score
) VALUES (
  'curve-finance', 'audited',
  '["Trail of Bits", "MixBytes"]'::jsonb, 88.00, '2020-08-20',
  3, 0, 0, 2, 1,
  '["CWE-682", "CWE-703", "CWE-710"]'::jsonb, 45.00, 1885, 25.00
) ON CONFLICT DO NOTHING;

-- 4. Compound V3 - Well audited
INSERT INTO protocol_contract_risks (
  protocol_id, audit_status, auditor_names, auditor_reputation_score, audit_date,
  known_vulnerabilities_count, critical_vulnerabilities, high_vulnerabilities, medium_vulnerabilities, low_vulnerabilities,
  vulnerability_ids, code_complexity_score, contract_age_days, contract_risk_score
) VALUES (
  'compound-v3', 'audited',
  '["OpenZeppelin", "ChainSecurity"]'::jsonb, 90.00, '2022-06-15',
  1, 0, 0, 0, 1,
  '["CWE-710"]'::jsonb, 35.00, 1215, 20.00
) ON CONFLICT DO NOTHING;

-- 5. SushiSwap - Audited, some concerns
INSERT INTO protocol_contract_risks (
  protocol_id, audit_status, auditor_names, auditor_reputation_score, audit_date,
  known_vulnerabilities_count, critical_vulnerabilities, high_vulnerabilities, medium_vulnerabilities, low_vulnerabilities,
  vulnerability_ids, code_complexity_score, contract_age_days, contract_risk_score
) VALUES (
  'sushiswap', 'audited',
  '["PeckShield", "Quantstamp"]'::jsonb, 75.00, '2020-09-10',
  5, 0, 1, 2, 2,
  '["CWE-284", "CWE-682", "CWE-703", "CWE-710", "CWE-732"]'::jsonb, 50.00, 1862, 40.00
) ON CONFLICT DO NOTHING;

-- 6. PancakeSwap - Audited, moderate complexity
INSERT INTO protocol_contract_risks (
  protocol_id, audit_status, auditor_names, auditor_reputation_score, audit_date,
  known_vulnerabilities_count, critical_vulnerabilities, high_vulnerabilities, medium_vulnerabilities, low_vulnerabilities,
  vulnerability_ids, code_complexity_score, contract_age_days, contract_risk_score
) VALUES (
  'pancakeswap', 'audited',
  '["CertiK", "SlowMist"]'::jsonb, 78.00, '2020-10-05',
  4, 0, 0, 3, 1,
  '["CWE-682", "CWE-703", "CWE-710", "CWE-732"]'::jsonb, 48.00, 1837, 38.00
) ON CONFLICT DO NOTHING;

-- 7. New Protocol X - Recently audited, some issues
INSERT INTO protocol_contract_risks (
  protocol_id, audit_status, auditor_names, auditor_reputation_score, audit_date,
  known_vulnerabilities_count, critical_vulnerabilities, high_vulnerabilities, medium_vulnerabilities, low_vulnerabilities,
  vulnerability_ids, code_complexity_score, contract_age_days, contract_risk_score
) VALUES (
  'new-protocol-x', 'audited',
  '["Hacken"]'::jsonb, 65.00, '2024-09-01',
  6, 0, 2, 3, 1,
  '["CWE-284", "CWE-287", "CWE-682", "CWE-703", "CWE-710", "CWE-732"]'::jsonb, 60.00, 180, 60.00
) ON CONFLICT DO NOTHING;

-- 8. Unaudited DEX - No audit, high risk
INSERT INTO protocol_contract_risks (
  protocol_id, audit_status, auditor_names, auditor_reputation_score, audit_date,
  known_vulnerabilities_count, critical_vulnerabilities, high_vulnerabilities, medium_vulnerabilities, low_vulnerabilities,
  vulnerability_ids, code_complexity_score, contract_age_days, contract_risk_score
) VALUES (
  'unaudited-dex', 'unaudited',
  '[]'::jsonb, NULL, NULL,
  8, 1, 3, 3, 1,
  '["CWE-284", "CWE-287", "CWE-362", "CWE-682", "CWE-703", "CWE-710", "CWE-732", "CWE-807"]'::jsonb, 70.00, 90, 80.00
) ON CONFLICT DO NOTHING;

-- 9. Risky Protocol - Unaudited, critical vulnerabilities
INSERT INTO protocol_contract_risks (
  protocol_id, audit_status, auditor_names, auditor_reputation_score, audit_date,
  known_vulnerabilities_count, critical_vulnerabilities, high_vulnerabilities, medium_vulnerabilities, low_vulnerabilities,
  vulnerability_ids, code_complexity_score, contract_age_days, contract_risk_score
) VALUES (
  'risky-protocol', 'unaudited',
  '[]'::jsonb, NULL, NULL,
  12, 2, 4, 4, 2,
  '["CWE-284", "CWE-287", "CWE-362", "CWE-400", "CWE-682", "CWE-691", "CWE-703", "CWE-710", "CWE-732", "CWE-807", "CWE-862", "CWE-863"]'::jsonb, 85.00, 30, 90.00
) ON CONFLICT DO NOTHING;

-- 10. Scam Protocol - No audit, many critical issues
INSERT INTO protocol_contract_risks (
  protocol_id, audit_status, auditor_names, auditor_reputation_score, audit_date,
  known_vulnerabilities_count, critical_vulnerabilities, high_vulnerabilities, medium_vulnerabilities, low_vulnerabilities,
  vulnerability_ids, code_complexity_score, contract_age_days, contract_risk_score
) VALUES (
  'scam-protocol', 'none',
  '[]'::jsonb, NULL, NULL,
  15, 5, 6, 3, 1,
  '["CWE-284", "CWE-287", "CWE-362", "CWE-400", "CWE-682", "CWE-691", "CWE-703", "CWE-710", "CWE-732", "CWE-807", "CWE-862", "CWE-863", "CWE-908", "CWE-909", "CWE-1041"]'::jsonb, 95.00, 15, 98.00
) ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT protocol_id, audit_status, known_vulnerabilities_count, contract_risk_score 
FROM protocol_contract_risks 
ORDER BY contract_risk_score ASC;

