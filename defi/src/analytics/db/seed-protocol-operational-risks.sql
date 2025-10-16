-- Seed data for protocol_operational_risks
-- Story: 3.2.1 - Protocol Risk Assessment

-- 1. Uniswap V3 - Established, doxxed team
INSERT INTO protocol_operational_risks (
  protocol_id, protocol_age_days, launch_date, team_doxxed, team_reputation_score, team_size,
  incident_count, critical_incidents, high_incidents, medium_incidents, low_incidents,
  last_incident_date, operational_risk_score
) VALUES (
  'uniswap-v3', 1675, '2021-03-15', TRUE, 95.00, 45,
  2, 0, 0, 1, 1, '2023-08-15', 18.00
) ON CONFLICT DO NOTHING;

-- 2. Aave V3 - Established, doxxed team
INSERT INTO protocol_operational_risks (
  protocol_id, protocol_age_days, launch_date, team_doxxed, team_reputation_score, team_size,
  incident_count, critical_incidents, high_incidents, medium_incidents, low_incidents,
  last_incident_date, operational_risk_score
) VALUES (
  'aave-v3', 1370, '2022-01-10', TRUE, 92.00, 38,
  3, 0, 0, 2, 1, '2024-02-20', 20.00
) ON CONFLICT DO NOTHING;

-- 3. Curve Finance - Established, doxxed team
INSERT INTO protocol_operational_risks (
  protocol_id, protocol_age_days, launch_date, team_doxxed, team_reputation_score, team_size,
  incident_count, critical_incidents, high_incidents, medium_incidents, low_incidents,
  last_incident_date, operational_risk_score
) VALUES (
  'curve-finance', 1885, '2020-08-20', TRUE, 88.00, 32,
  5, 0, 1, 2, 2, '2023-11-10', 28.00
) ON CONFLICT DO NOTHING;

-- 4. Compound V3 - Established, doxxed team
INSERT INTO protocol_operational_risks (
  protocol_id, protocol_age_days, launch_date, team_doxxed, team_reputation_score, team_size,
  incident_count, critical_incidents, high_incidents, medium_incidents, low_incidents,
  last_incident_date, operational_risk_score
) VALUES (
  'compound-v3', 1215, '2022-06-15', TRUE, 90.00, 35,
  3, 0, 0, 2, 1, '2024-01-15', 28.00
) ON CONFLICT DO NOTHING;

-- 5. SushiSwap - Established, some team changes
INSERT INTO protocol_operational_risks (
  protocol_id, protocol_age_days, launch_date, team_doxxed, team_reputation_score, team_size,
  incident_count, critical_incidents, high_incidents, medium_incidents, low_incidents,
  last_incident_date, operational_risk_score
) VALUES (
  'sushiswap', 1862, '2020-09-10', TRUE, 72.00, 25,
  8, 0, 2, 4, 2, '2024-05-20', 48.00
) ON CONFLICT DO NOTHING;

-- 6. PancakeSwap - Established, partially doxxed
INSERT INTO protocol_operational_risks (
  protocol_id, protocol_age_days, launch_date, team_doxxed, team_reputation_score, team_size,
  incident_count, critical_incidents, high_incidents, medium_incidents, low_incidents,
  last_incident_date, operational_risk_score
) VALUES (
  'pancakeswap', 1837, '2020-10-05', TRUE, 75.00, 28,
  6, 0, 1, 3, 2, '2024-06-10', 45.00
) ON CONFLICT DO NOTHING;

-- 7. New Protocol X - New, small team
INSERT INTO protocol_operational_risks (
  protocol_id, protocol_age_days, launch_date, team_doxxed, team_reputation_score, team_size,
  incident_count, critical_incidents, high_incidents, medium_incidents, low_incidents,
  last_incident_date, operational_risk_score
) VALUES (
  'new-protocol-x', 180, '2024-09-01', TRUE, 55.00, 8,
  4, 0, 1, 2, 1, '2025-01-15', 75.00
) ON CONFLICT DO NOTHING;

-- 8. Unaudited DEX - Very new, anonymous team
INSERT INTO protocol_operational_risks (
  protocol_id, protocol_age_days, launch_date, team_doxxed, team_reputation_score, team_size,
  incident_count, critical_incidents, high_incidents, medium_incidents, low_incidents,
  last_incident_date, operational_risk_score
) VALUES (
  'unaudited-dex', 90, '2024-12-01', FALSE, 35.00, 5,
  6, 1, 2, 2, 1, '2025-02-10', 78.00
) ON CONFLICT DO NOTHING;

-- 9. Risky Protocol - Brand new, anonymous
INSERT INTO protocol_operational_risks (
  protocol_id, protocol_age_days, launch_date, team_doxxed, team_reputation_score, team_size,
  incident_count, critical_incidents, high_incidents, medium_incidents, low_incidents,
  last_incident_date, operational_risk_score
) VALUES (
  'risky-protocol', 30, '2025-01-15', FALSE, 20.00, 3,
  8, 2, 3, 2, 1, '2025-02-12', 88.00
) ON CONFLICT DO NOTHING;

-- 10. Scam Protocol - Very new, anonymous, many incidents
INSERT INTO protocol_operational_risks (
  protocol_id, protocol_age_days, launch_date, team_doxxed, team_reputation_score, team_size,
  incident_count, critical_incidents, high_incidents, medium_incidents, low_incidents,
  last_incident_date, operational_risk_score
) VALUES (
  'scam-protocol', 15, '2025-02-01', FALSE, 5.00, 1,
  12, 5, 4, 2, 1, '2025-02-14', 95.00
) ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT protocol_id, protocol_age_days, team_doxxed, incident_count, operational_risk_score 
FROM protocol_operational_risks 
ORDER BY operational_risk_score ASC;

