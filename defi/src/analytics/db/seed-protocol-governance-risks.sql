-- Seed data for protocol_governance_risks
-- Story: 3.2.1 - Protocol Risk Assessment

-- 1. Uniswap V3 - DAO with timelock
INSERT INTO protocol_governance_risks (
  protocol_id, governance_type, multisig_threshold, multisig_signers_count,
  token_distribution_gini, governance_token_symbol, admin_key_holders, admin_key_count,
  timelock_delay_hours, governance_risk_score
) VALUES (
  'uniswap-v3', 'dao', NULL, NULL,
  0.42, 'UNI', '[]'::jsonb, 0, 48, 15.00
) ON CONFLICT DO NOTHING;

-- 2. Aave V3 - DAO with timelock
INSERT INTO protocol_governance_risks (
  protocol_id, governance_type, multisig_threshold, multisig_signers_count,
  token_distribution_gini, governance_token_symbol, admin_key_holders, admin_key_count,
  timelock_delay_hours, governance_risk_score
) VALUES (
  'aave-v3', 'dao', NULL, NULL,
  0.38, 'AAVE', '[]'::jsonb, 0, 72, 18.00
) ON CONFLICT DO NOTHING;

-- 3. Curve Finance - DAO with some centralization
INSERT INTO protocol_governance_risks (
  protocol_id, governance_type, multisig_threshold, multisig_signers_count,
  token_distribution_gini, governance_token_symbol, admin_key_holders, admin_key_count,
  timelock_delay_hours, governance_risk_score
) VALUES (
  'curve-finance', 'dao', NULL, NULL,
  0.52, 'CRV', '["0x1234567890abcdef1234567890abcdef12345678"]'::jsonb, 1, 24, 30.00
) ON CONFLICT DO NOTHING;

-- 4. Compound V3 - DAO with timelock
INSERT INTO protocol_governance_risks (
  protocol_id, governance_type, multisig_threshold, multisig_signers_count,
  token_distribution_gini, governance_token_symbol, admin_key_holders, admin_key_count,
  timelock_delay_hours, governance_risk_score
) VALUES (
  'compound-v3', 'dao', NULL, NULL,
  0.45, 'COMP', '[]'::jsonb, 0, 48, 25.00
) ON CONFLICT DO NOTHING;

-- 5. SushiSwap - Multisig governance
INSERT INTO protocol_governance_risks (
  protocol_id, governance_type, multisig_threshold, multisig_signers_count,
  token_distribution_gini, governance_token_symbol, admin_key_holders, admin_key_count,
  timelock_delay_hours, governance_risk_score
) VALUES (
  'sushiswap', 'multisig', 6, 9,
  0.58, 'SUSHI', '["0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222", "0x3333333333333333333333333333333333333333"]'::jsonb, 3, 12, 50.00
) ON CONFLICT DO NOTHING;

-- 6. PancakeSwap - Multisig with some centralization
INSERT INTO protocol_governance_risks (
  protocol_id, governance_type, multisig_threshold, multisig_signers_count,
  token_distribution_gini, governance_token_symbol, admin_key_holders, admin_key_count,
  timelock_delay_hours, governance_risk_score
) VALUES (
  'pancakeswap', 'multisig', 5, 8,
  0.62, 'CAKE', '["0x4444444444444444444444444444444444444444", "0x5555555555555555555555555555555555555555"]'::jsonb, 2, 24, 48.00
) ON CONFLICT DO NOTHING;

-- 7. New Protocol X - Small multisig
INSERT INTO protocol_governance_risks (
  protocol_id, governance_type, multisig_threshold, multisig_signers_count,
  token_distribution_gini, governance_token_symbol, admin_key_holders, admin_key_count,
  timelock_delay_hours, governance_risk_score
) VALUES (
  'new-protocol-x', 'multisig', 3, 5,
  0.72, 'NPX', '["0x6666666666666666666666666666666666666666", "0x7777777777777777777777777777777777777777", "0x8888888888888888888888888888888888888888", "0x9999999999999999999999999999999999999999"]'::jsonb, 4, 6, 70.00
) ON CONFLICT DO NOTHING;

-- 8. Unaudited DEX - Centralized governance
INSERT INTO protocol_governance_risks (
  protocol_id, governance_type, multisig_threshold, multisig_signers_count,
  token_distribution_gini, governance_token_symbol, admin_key_holders, admin_key_count,
  timelock_delay_hours, governance_risk_score
) VALUES (
  'unaudited-dex', 'centralized', NULL, NULL,
  0.85, NULL, '["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"]'::jsonb, 2, 0, 75.00
) ON CONFLICT DO NOTHING;

-- 9. Risky Protocol - Single admin
INSERT INTO protocol_governance_risks (
  protocol_id, governance_type, multisig_threshold, multisig_signers_count,
  token_distribution_gini, governance_token_symbol, admin_key_holders, admin_key_count,
  timelock_delay_hours, governance_risk_score
) VALUES (
  'risky-protocol', 'centralized', NULL, NULL,
  0.92, NULL, '["0xcccccccccccccccccccccccccccccccccccccccc"]'::jsonb, 1, 0, 85.00
) ON CONFLICT DO NOTHING;

-- 10. Scam Protocol - No governance
INSERT INTO protocol_governance_risks (
  protocol_id, governance_type, multisig_threshold, multisig_signers_count,
  token_distribution_gini, governance_token_symbol, admin_key_holders, admin_key_count,
  timelock_delay_hours, governance_risk_score
) VALUES (
  'scam-protocol', 'none', NULL, NULL,
  0.98, NULL, '[]'::jsonb, 0, 0, 95.00
) ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT protocol_id, governance_type, token_distribution_gini, governance_risk_score 
FROM protocol_governance_risks 
ORDER BY governance_risk_score ASC;

