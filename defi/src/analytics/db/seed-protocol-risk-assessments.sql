-- Seed data for protocol_risk_assessments
-- Story: 3.2.1 - Protocol Risk Assessment
-- 10 protocols with varying risk levels

-- 1. Uniswap V3 - Low Risk (Score: 15)
INSERT INTO protocol_risk_assessments (
  protocol_id, protocol_name, overall_risk_score, risk_category,
  contract_risk_score, liquidity_risk_score, governance_risk_score, operational_risk_score, market_risk_score
) VALUES (
  'uniswap-v3', 'Uniswap V3', 15.00, 'low',
  12.00, 10.00, 15.00, 18.00, 20.00
) ON CONFLICT DO NOTHING;

-- 2. Aave V3 - Low Risk (Score: 18)
INSERT INTO protocol_risk_assessments (
  protocol_id, protocol_name, overall_risk_score, risk_category,
  contract_risk_score, liquidity_risk_score, governance_risk_score, operational_risk_score, market_risk_score
) VALUES (
  'aave-v3', 'Aave V3', 18.00, 'low',
  15.00, 12.00, 18.00, 20.00, 25.00
) ON CONFLICT DO NOTHING;

-- 3. Curve Finance - Low-Medium Risk (Score: 28)
INSERT INTO protocol_risk_assessments (
  protocol_id, protocol_name, overall_risk_score, risk_category,
  contract_risk_score, liquidity_risk_score, governance_risk_score, operational_risk_score, market_risk_score
) VALUES (
  'curve-finance', 'Curve Finance', 28.00, 'low',
  25.00, 20.00, 30.00, 28.00, 35.00
) ON CONFLICT DO NOTHING;

-- 4. Compound V3 - Low-Medium Risk (Score: 25)
INSERT INTO protocol_risk_assessments (
  protocol_id, protocol_name, overall_risk_score, risk_category,
  contract_risk_score, liquidity_risk_score, governance_risk_score, operational_risk_score, market_risk_score
) VALUES (
  'compound-v3', 'Compound V3', 25.00, 'low',
  20.00, 18.00, 25.00, 28.00, 30.00
) ON CONFLICT DO NOTHING;

-- 5. SushiSwap - Medium Risk (Score: 45)
INSERT INTO protocol_risk_assessments (
  protocol_id, protocol_name, overall_risk_score, risk_category,
  contract_risk_score, liquidity_risk_score, governance_risk_score, operational_risk_score, market_risk_score
) VALUES (
  'sushiswap', 'SushiSwap', 45.00, 'medium',
  40.00, 35.00, 50.00, 48.00, 55.00
) ON CONFLICT DO NOTHING;

-- 6. PancakeSwap - Medium Risk (Score: 42)
INSERT INTO protocol_risk_assessments (
  protocol_id, protocol_name, overall_risk_score, risk_category,
  contract_risk_score, liquidity_risk_score, governance_risk_score, operational_risk_score, market_risk_score
) VALUES (
  'pancakeswap', 'PancakeSwap', 42.00, 'medium',
  38.00, 32.00, 48.00, 45.00, 50.00
) ON CONFLICT DO NOTHING;

-- 7. New Protocol X - High Risk (Score: 68)
INSERT INTO protocol_risk_assessments (
  protocol_id, protocol_name, overall_risk_score, risk_category,
  contract_risk_score, liquidity_risk_score, governance_risk_score, operational_risk_score, market_risk_score
) VALUES (
  'new-protocol-x', 'New Protocol X', 68.00, 'high',
  60.00, 55.00, 70.00, 75.00, 80.00
) ON CONFLICT DO NOTHING;

-- 8. Unaudited DEX - High Risk (Score: 75)
INSERT INTO protocol_risk_assessments (
  protocol_id, protocol_name, overall_risk_score, risk_category,
  contract_risk_score, liquidity_risk_score, governance_risk_score, operational_risk_score, market_risk_score
) VALUES (
  'unaudited-dex', 'Unaudited DEX', 75.00, 'high',
  80.00, 60.00, 75.00, 78.00, 70.00
) ON CONFLICT DO NOTHING;

-- 9. Risky Protocol - Critical Risk (Score: 85)
INSERT INTO protocol_risk_assessments (
  protocol_id, protocol_name, overall_risk_score, risk_category,
  contract_risk_score, liquidity_risk_score, governance_risk_score, operational_risk_score, market_risk_score
) VALUES (
  'risky-protocol', 'Risky Protocol', 85.00, 'critical',
  90.00, 75.00, 85.00, 88.00, 80.00
) ON CONFLICT DO NOTHING;

-- 10. Scam Protocol - Critical Risk (Score: 95)
INSERT INTO protocol_risk_assessments (
  protocol_id, protocol_name, overall_risk_score, risk_category,
  contract_risk_score, liquidity_risk_score, governance_risk_score, operational_risk_score, market_risk_score
) VALUES (
  'scam-protocol', 'Scam Protocol', 95.00, 'critical',
  98.00, 90.00, 95.00, 95.00, 92.00
) ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT protocol_name, overall_risk_score, risk_category 
FROM protocol_risk_assessments 
ORDER BY overall_risk_score ASC;

