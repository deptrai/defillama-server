-- Seed Data: Suspicious Activities
-- Story: 3.2.2 - Suspicious Activity Detection
-- Description: Sample suspicious activities for testing and demonstration

-- Clear existing data
TRUNCATE TABLE suspicious_activities CASCADE;

-- Rug Pull Activities (5 records)

-- 1. Critical Rug Pull - Liquidity Removal
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent, reported_to_authorities
) VALUES (
  'rug_pull', 'critical', 95.00,
  'scam-protocol', ARRAY['0x1234...scam', '0x5678...scam'], ARRAY['0xabcd...token'], 'ethereum',
  NOW() - INTERVAL '2 hours', 'rule_based', 'v1.0.0',
  ARRAY['0xtx1...', '0xtx2...', '0xtx3...'],
  'Detected 92% liquidity removal in 15 minutes. Owner wallet drained pool and transferred tokens to new address.',
  '{"liquidity_removed_pct": 0.92, "timeframe_seconds": 900, "owner_transfer": true, "new_address": "0x9999...new"}'::jsonb,
  1500000.00, 450, ARRAY['scam-protocol'],
  'confirmed', true, true
);

-- 2. High Rug Pull - Token Dump
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent, reported_to_authorities
) VALUES (
  'rug_pull', 'high', 88.00,
  'risky-protocol', ARRAY['0xaaaa...dev'], ARRAY['0xbbbb...token'], 'bsc',
  NOW() - INTERVAL '6 hours', 'rule_based', 'v1.0.0',
  ARRAY['0xtx4...', '0xtx5...'],
  'Developer wallet sold 45% of total supply in 30 minutes, causing 78% price drop.',
  '{"supply_sold_pct": 0.45, "timeframe_seconds": 1800, "price_drop_pct": 0.78}'::jsonb,
  850000.00, 320, ARRAY['risky-protocol'],
  'confirmed', true, false
);

-- 3. Medium Rug Pull - Contract Manipulation
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent, reported_to_authorities
) VALUES (
  'rug_pull', 'medium', 75.00,
  'new-protocol-x', ARRAY['0xcccc...owner'], ARRAY['0xdddd...token'], 'polygon',
  NOW() - INTERVAL '12 hours', 'rule_based', 'v1.0.0',
  ARRAY['0xtx6...'],
  'Contract ownership transferred to new address, followed by emergency pause.',
  '{"ownership_transfer": true, "emergency_pause": true, "timeframe_seconds": 600}'::jsonb,
  250000.00, 120, ARRAY['new-protocol-x'],
  'investigating', true, false
);

-- 4. Low Rug Pull - Suspicious Upgrade
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent, reported_to_authorities
) VALUES (
  'rug_pull', 'low', 65.00,
  'unaudited-dex', ARRAY['0xeeee...admin'], ARRAY['0xffff...token'], 'arbitrum',
  NOW() - INTERVAL '1 day', 'rule_based', 'v1.0.0',
  ARRAY['0xtx7...'],
  'Contract upgraded without timelock delay. New implementation not verified.',
  '{"contract_upgrade": true, "timelock_delay": 0, "implementation_verified": false}'::jsonb,
  50000.00, 45, ARRAY['unaudited-dex'],
  'investigating', true, false
);

-- 5. False Positive Rug Pull
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, investigation_notes, resolution_timestamp, alert_sent
) VALUES (
  'rug_pull', 'medium', 70.00,
  'pancakeswap', ARRAY['0x1111...lp'], ARRAY['0x2222...token'], 'bsc',
  NOW() - INTERVAL '2 days', 'rule_based', 'v1.0.0',
  ARRAY['0xtx8...'],
  'Large liquidity removal detected. Investigation revealed legitimate LP migration to V3.',
  '{"liquidity_removed_pct": 0.55, "timeframe_seconds": 3600}'::jsonb,
  0, 0, ARRAY['pancakeswap'],
  'false_positive', 'Confirmed as legitimate V3 migration. LP tokens migrated to new pool.', NOW() - INTERVAL '1 day', true
);

-- Wash Trading Activities (5 records)

-- 6. Critical Wash Trading - Self Trading
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent
) VALUES (
  'wash_trading', 'critical', 92.00,
  'fake-volume-dex', ARRAY['0x3333...wash1', '0x4444...wash2', '0x5555...wash3'], ARRAY['0x6666...token'], 'ethereum',
  NOW() - INTERVAL '4 hours', 'rule_based', 'v1.0.0',
  ARRAY['0xtx9...', '0xtx10...', '0xtx11...'],
  'Detected 127 self-trading transactions from 3 wallets in 2 hours. Same entity controlling all wallets.',
  '{"self_trade_count": 127, "wallet_count": 3, "timeframe_seconds": 7200, "volume_inflated_usd": 2500000}'::jsonb,
  0, 0, ARRAY['fake-volume-dex'],
  'confirmed', true
);

-- 7. High Wash Trading - Circular Trading
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent
) VALUES (
  'wash_trading', 'high', 85.00,
  'suspicious-dex', ARRAY['0x7777...a', '0x8888...b', '0x9999...c'], ARRAY['0xaaaa...token'], 'bsc',
  NOW() - INTERVAL '8 hours', 'rule_based', 'v1.0.0',
  ARRAY['0xtx12...', '0xtx13...', '0xtx14...'],
  'Detected circular trading pattern: A→B→C→A repeated 45 times in 3 hours.',
  '{"circular_pattern_count": 45, "wallet_count": 3, "timeframe_seconds": 10800, "pattern": "A->B->C->A"}'::jsonb,
  0, 0, ARRAY['suspicious-dex'],
  'investigating', true
);

-- 8. Medium Wash Trading - Volume Inflation
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent
) VALUES (
  'wash_trading', 'medium', 78.00,
  'low-volume-dex', ARRAY['0xbbbb...bot1', '0xcccc...bot2'], ARRAY['0xdddd...token'], 'polygon',
  NOW() - INTERVAL '12 hours', 'rule_based', 'v1.0.0',
  ARRAY['0xtx15...', '0xtx16...'],
  'Volume spike of 850% detected. 2 wallets responsible for 78% of volume.',
  '{"volume_spike_pct": 8.5, "normal_volume_usd": 50000, "current_volume_usd": 475000, "wallet_contribution_pct": 0.78}'::jsonb,
  0, 0, ARRAY['low-volume-dex'],
  'investigating', true
);

-- 9. Low Wash Trading - Price Manipulation
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent
) VALUES (
  'wash_trading', 'low', 68.00,
  'small-dex', ARRAY['0xeeee...trader'], ARRAY['0xffff...token'], 'arbitrum',
  NOW() - INTERVAL '1 day', 'rule_based', 'v1.0.0',
  ARRAY['0xtx17...'],
  'Coordinated trades detected. Single wallet executing buy/sell orders to maintain price.',
  '{"coordinated_trade_count": 23, "price_maintained": true, "timeframe_seconds": 14400}'::jsonb,
  0, 0, ARRAY['small-dex'],
  'investigating', false
);

-- 10. False Positive Wash Trading
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, investigation_notes, resolution_timestamp, alert_sent
) VALUES (
  'wash_trading', 'medium', 72.00,
  'uniswap-v3', ARRAY['0x1111...mm'], ARRAY['0x2222...token'], 'ethereum',
  NOW() - INTERVAL '2 days', 'rule_based', 'v1.0.0',
  ARRAY['0xtx18...'],
  'High frequency trading detected. Investigation revealed legitimate market making activity.',
  '{"trade_count": 156, "timeframe_seconds": 3600}'::jsonb,
  0, 0, ARRAY['uniswap-v3'],
  'false_positive', 'Confirmed as legitimate market maker providing liquidity.', NOW() - INTERVAL '1 day', true
);

-- Pump & Dump Activities (5 records)

-- 11. Critical Pump & Dump - Coordinated Dump
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent, reported_to_authorities
) VALUES (
  'pump_dump', 'critical', 90.00,
  'pump-dump-token', ARRAY['0x3333...pump1', '0x4444...pump2', '0x5555...pump3', '0x6666...pump4'], ARRAY['0x7777...token'], 'bsc',
  NOW() - INTERVAL '3 hours', 'rule_based', 'v1.0.0',
  ARRAY['0xtx19...', '0xtx20...', '0xtx21...'],
  'Coordinated pump detected: 4 wallets bought 35% supply in 45 minutes, price increased 420%. Then coordinated dump: all 4 wallets sold within 10 minutes, price dropped 85%.',
  '{"phase": "dump", "wallet_count": 4, "supply_bought_pct": 0.35, "price_increase_pct": 4.2, "price_drop_pct": 0.85, "pump_timeframe": 2700, "dump_timeframe": 600}'::jsonb,
  2800000.00, 680, ARRAY['pump-dump-token'],
  'confirmed', true, true
);

-- 12. High Pump & Dump - Pump Phase
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent
) VALUES (
  'pump_dump', 'high', 82.00,
  'suspicious-token', ARRAY['0x8888...buyer1', '0x9999...buyer2', '0xaaaa...buyer3'], ARRAY['0xbbbb...token'], 'ethereum',
  NOW() - INTERVAL '1 hour', 'rule_based', 'v1.0.0',
  ARRAY['0xtx22...', '0xtx23...'],
  'Coordinated buying detected: 3 wallets bought 28% supply in 30 minutes. Price increased 180%. Monitoring for dump phase.',
  '{"phase": "pump", "wallet_count": 3, "supply_bought_pct": 0.28, "price_increase_pct": 1.8, "timeframe_seconds": 1800}'::jsonb,
  0, 0, ARRAY['suspicious-token'],
  'investigating', true
);

-- Sybil Attack Activities (3 records)

-- 13. Critical Sybil Attack - Airdrop Farming
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent
) VALUES (
  'sybil_attack', 'critical', 94.00,
  'airdrop-protocol', ARRAY['0xcccc...sybil1', '0xdddd...sybil2', '0xeeee...sybil3'], ARRAY['0xffff...token'], 'arbitrum',
  NOW() - INTERVAL '5 hours', 'rule_based', 'v1.0.0',
  ARRAY['0xtx24...', '0xtx25...', '0xtx26...'],
  'Detected 127 wallets with identical behavior patterns. All wallets funded from same source, executed identical transactions, claimed airdrop, and transferred to single address.',
  '{"cluster_count": 1, "wallet_count": 127, "similarity_score": 0.96, "airdrop_farming": true, "total_claimed_usd": 450000}'::jsonb,
  450000.00, 0, ARRAY['airdrop-protocol'],
  'confirmed', true
);

-- 14. High Sybil Attack - Coordinated Behavior
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent
) VALUES (
  'sybil_attack', 'high', 87.00,
  'governance-protocol', ARRAY['0x1111...vote1', '0x2222...vote2', '0x3333...vote3'], ARRAY['0x4444...token'], 'ethereum',
  NOW() - INTERVAL '10 hours', 'rule_based', 'v1.0.0',
  ARRAY['0xtx27...', '0xtx28...'],
  'Detected 45 wallets voting identically on all proposals. Wallets created within 24 hours, funded from same source.',
  '{"cluster_count": 1, "wallet_count": 45, "similarity_score": 0.89, "coordinated_voting": true, "proposal_count": 12}'::jsonb,
  0, 0, ARRAY['governance-protocol'],
  'investigating', true
);

-- 15. Medium Sybil Attack - Identity Clustering
INSERT INTO suspicious_activities (
  activity_type, severity, confidence_score,
  protocol_id, wallet_addresses, token_addresses, chain_id,
  detection_timestamp, detection_method, detector_version,
  evidence_tx_hashes, evidence_description, evidence_metrics,
  estimated_loss_usd, affected_users, affected_protocols,
  status, alert_sent
) VALUES (
  'sybil_attack', 'medium', 76.00,
  'defi-protocol', ARRAY['0x5555...user1', '0x6666...user2'], ARRAY['0x7777...token'], 'polygon',
  NOW() - INTERVAL '1 day', 'rule_based', 'v1.0.0',
  ARRAY['0xtx29...'],
  'Detected 23 wallets with similar transaction patterns and timing. Possible single entity controlling multiple accounts.',
  '{"cluster_count": 1, "wallet_count": 23, "similarity_score": 0.82, "pattern_similarity": true}'::jsonb,
  0, 0, ARRAY['defi-protocol'],
  'investigating', false
);

-- Summary
SELECT 
  activity_type,
  severity,
  COUNT(*) as count,
  AVG(confidence_score) as avg_confidence,
  SUM(COALESCE(estimated_loss_usd, 0)) as total_loss_usd
FROM suspicious_activities
GROUP BY activity_type, severity
ORDER BY activity_type, severity;

