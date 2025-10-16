-- Seed data for protocol_liquidity_risks
-- Story: 3.2.1 - Protocol Risk Assessment

-- 1. Uniswap V3 - Excellent liquidity
INSERT INTO protocol_liquidity_risks (
  protocol_id, current_tvl_usd, tvl_change_24h_pct, tvl_change_7d_pct, tvl_change_30d_pct,
  liquidity_depth_score, top_10_holders_concentration_pct, top_50_holders_concentration_pct,
  liquidity_provider_count, liquidity_risk_score
) VALUES (
  'uniswap-v3', 5000000000.00, 2.5, 5.2, 12.8,
  95.00, 18.50, 42.00, 125000, 10.00
) ON CONFLICT DO NOTHING;

-- 2. Aave V3 - Strong liquidity
INSERT INTO protocol_liquidity_risks (
  protocol_id, current_tvl_usd, tvl_change_24h_pct, tvl_change_7d_pct, tvl_change_30d_pct,
  liquidity_depth_score, top_10_holders_concentration_pct, top_50_holders_concentration_pct,
  liquidity_provider_count, liquidity_risk_score
) VALUES (
  'aave-v3', 3000000000.00, 1.8, 4.5, 10.2,
  92.00, 22.00, 48.00, 85000, 12.00
) ON CONFLICT DO NOTHING;

-- 3. Curve Finance - Good liquidity
INSERT INTO protocol_liquidity_risks (
  protocol_id, current_tvl_usd, tvl_change_24h_pct, tvl_change_7d_pct, tvl_change_30d_pct,
  liquidity_depth_score, top_10_holders_concentration_pct, top_50_holders_concentration_pct,
  liquidity_provider_count, liquidity_risk_score
) VALUES (
  'curve-finance', 2000000000.00, -1.2, 2.8, 8.5,
  88.00, 28.00, 55.00, 65000, 20.00
) ON CONFLICT DO NOTHING;

-- 4. Compound V3 - Good liquidity
INSERT INTO protocol_liquidity_risks (
  protocol_id, current_tvl_usd, tvl_change_24h_pct, tvl_change_7d_pct, tvl_change_30d_pct,
  liquidity_depth_score, top_10_holders_concentration_pct, top_50_holders_concentration_pct,
  liquidity_provider_count, liquidity_risk_score
) VALUES (
  'compound-v3', 1500000000.00, 0.5, 3.2, 7.8,
  85.00, 25.00, 52.00, 55000, 18.00
) ON CONFLICT DO NOTHING;

-- 5. SushiSwap - Moderate liquidity
INSERT INTO protocol_liquidity_risks (
  protocol_id, current_tvl_usd, tvl_change_24h_pct, tvl_change_7d_pct, tvl_change_30d_pct,
  liquidity_depth_score, top_10_holders_concentration_pct, top_50_holders_concentration_pct,
  liquidity_provider_count, liquidity_risk_score
) VALUES (
  'sushiswap', 500000000.00, -3.5, -8.2, -15.5,
  65.00, 42.00, 68.00, 28000, 35.00
) ON CONFLICT DO NOTHING;

-- 6. PancakeSwap - Moderate liquidity
INSERT INTO protocol_liquidity_risks (
  protocol_id, current_tvl_usd, tvl_change_24h_pct, tvl_change_7d_pct, tvl_change_30d_pct,
  liquidity_depth_score, top_10_holders_concentration_pct, top_50_holders_concentration_pct,
  liquidity_provider_count, liquidity_risk_score
) VALUES (
  'pancakeswap', 800000000.00, -2.1, -5.5, -12.0,
  70.00, 38.00, 65.00, 35000, 32.00
) ON CONFLICT DO NOTHING;

-- 7. New Protocol X - Low liquidity
INSERT INTO protocol_liquidity_risks (
  protocol_id, current_tvl_usd, tvl_change_24h_pct, tvl_change_7d_pct, tvl_change_30d_pct,
  liquidity_depth_score, top_10_holders_concentration_pct, top_50_holders_concentration_pct,
  liquidity_provider_count, liquidity_risk_score
) VALUES (
  'new-protocol-x', 50000000.00, -8.5, -18.2, -35.5,
  45.00, 58.00, 82.00, 2500, 55.00
) ON CONFLICT DO NOTHING;

-- 8. Unaudited DEX - Low liquidity, high concentration
INSERT INTO protocol_liquidity_risks (
  protocol_id, current_tvl_usd, tvl_change_24h_pct, tvl_change_7d_pct, tvl_change_30d_pct,
  liquidity_depth_score, top_10_holders_concentration_pct, top_50_holders_concentration_pct,
  liquidity_provider_count, liquidity_risk_score
) VALUES (
  'unaudited-dex', 10000000.00, -12.5, -25.8, -48.2,
  35.00, 68.00, 88.00, 850, 60.00
) ON CONFLICT DO NOTHING;

-- 9. Risky Protocol - Very low liquidity
INSERT INTO protocol_liquidity_risks (
  protocol_id, current_tvl_usd, tvl_change_24h_pct, tvl_change_7d_pct, tvl_change_30d_pct,
  liquidity_depth_score, top_10_holders_concentration_pct, top_50_holders_concentration_pct,
  liquidity_provider_count, liquidity_risk_score
) VALUES (
  'risky-protocol', 5000000.00, -18.5, -38.2, -62.5,
  25.00, 78.00, 92.00, 320, 75.00
) ON CONFLICT DO NOTHING;

-- 10. Scam Protocol - Extremely low liquidity
INSERT INTO protocol_liquidity_risks (
  protocol_id, current_tvl_usd, tvl_change_24h_pct, tvl_change_7d_pct, tvl_change_30d_pct,
  liquidity_depth_score, top_10_holders_concentration_pct, top_50_holders_concentration_pct,
  liquidity_provider_count, liquidity_risk_score
) VALUES (
  'scam-protocol', 1000000.00, -25.0, -52.5, -78.0,
  15.00, 92.00, 98.00, 85, 90.00
) ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT protocol_id, current_tvl_usd, top_10_holders_concentration_pct, liquidity_risk_score 
FROM protocol_liquidity_risks 
ORDER BY liquidity_risk_score ASC;

