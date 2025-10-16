-- Seed data for protocol_market_risks
-- Story: 3.2.1 - Protocol Risk Assessment

-- 1. Uniswap V3 - High volume, stable
INSERT INTO protocol_market_risks (
  protocol_id, daily_volume_usd, volume_change_24h_pct, volume_change_7d_pct, volume_change_30d_pct,
  active_users_count, user_change_24h_pct, user_change_7d_pct, user_change_30d_pct,
  price_volatility_7d, price_volatility_30d, market_risk_score
) VALUES (
  'uniswap-v3', 1500000000.00, 3.5, 8.2, 15.5,
  85000, 2.1, 5.5, 12.0, 0.15, 0.18, 20.00
) ON CONFLICT DO NOTHING;

-- 2. Aave V3 - High volume, stable
INSERT INTO protocol_market_risks (
  protocol_id, daily_volume_usd, volume_change_24h_pct, volume_change_7d_pct, volume_change_30d_pct,
  active_users_count, user_change_24h_pct, user_change_7d_pct, user_change_30d_pct,
  price_volatility_7d, price_volatility_30d, market_risk_score
) VALUES (
  'aave-v3', 800000000.00, 2.8, 6.5, 12.8,
  55000, 1.8, 4.2, 10.5, 0.18, 0.22, 25.00
) ON CONFLICT DO NOTHING;

-- 3. Curve Finance - Moderate volume
INSERT INTO protocol_market_risks (
  protocol_id, daily_volume_usd, volume_change_24h_pct, volume_change_7d_pct, volume_change_30d_pct,
  active_users_count, user_change_24h_pct, user_change_7d_pct, user_change_30d_pct,
  price_volatility_7d, price_volatility_30d, market_risk_score
) VALUES (
  'curve-finance', 500000000.00, -2.5, 3.2, 8.5,
  38000, -1.2, 2.8, 7.5, 0.25, 0.30, 35.00
) ON CONFLICT DO NOTHING;

-- 4. Compound V3 - Moderate volume
INSERT INTO protocol_market_risks (
  protocol_id, daily_volume_usd, volume_change_24h_pct, volume_change_7d_pct, volume_change_30d_pct,
  active_users_count, user_change_24h_pct, user_change_7d_pct, user_change_30d_pct,
  price_volatility_7d, price_volatility_30d, market_risk_score
) VALUES (
  'compound-v3', 350000000.00, 1.5, 4.8, 10.2,
  32000, 0.8, 3.5, 8.8, 0.22, 0.28, 30.00
) ON CONFLICT DO NOTHING;

-- 5. SushiSwap - Declining volume
INSERT INTO protocol_market_risks (
  protocol_id, daily_volume_usd, volume_change_24h_pct, volume_change_7d_pct, volume_change_30d_pct,
  active_users_count, user_change_24h_pct, user_change_7d_pct, user_change_30d_pct,
  price_volatility_7d, price_volatility_30d, market_risk_score
) VALUES (
  'sushiswap', 120000000.00, -8.5, -15.2, -28.5,
  18000, -5.2, -12.5, -22.0, 0.42, 0.48, 55.00
) ON CONFLICT DO NOTHING;

-- 6. PancakeSwap - Moderate volume, some volatility
INSERT INTO protocol_market_risks (
  protocol_id, daily_volume_usd, volume_change_24h_pct, volume_change_7d_pct, volume_change_30d_pct,
  active_users_count, user_change_24h_pct, user_change_7d_pct, user_change_30d_pct,
  price_volatility_7d, price_volatility_30d, market_risk_score
) VALUES (
  'pancakeswap', 180000000.00, -5.2, -10.5, -18.8,
  22000, -3.5, -8.2, -15.5, 0.38, 0.45, 50.00
) ON CONFLICT DO NOTHING;

-- 7. New Protocol X - Low volume, high volatility
INSERT INTO protocol_market_risks (
  protocol_id, daily_volume_usd, volume_change_24h_pct, volume_change_7d_pct, volume_change_30d_pct,
  active_users_count, user_change_24h_pct, user_change_7d_pct, user_change_30d_pct,
  price_volatility_7d, price_volatility_30d, market_risk_score
) VALUES (
  'new-protocol-x', 5000000.00, -15.5, -32.8, -55.2,
  1200, -12.5, -28.5, -48.0, 0.68, 0.75, 80.00
) ON CONFLICT DO NOTHING;

-- 8. Unaudited DEX - Very low volume
INSERT INTO protocol_market_risks (
  protocol_id, daily_volume_usd, volume_change_24h_pct, volume_change_7d_pct, volume_change_30d_pct,
  active_users_count, user_change_24h_pct, user_change_7d_pct, user_change_30d_pct,
  price_volatility_7d, price_volatility_30d, market_risk_score
) VALUES (
  'unaudited-dex', 800000.00, -22.5, -45.8, -68.5,
  350, -18.5, -38.2, -62.0, 0.82, 0.88, 70.00
) ON CONFLICT DO NOTHING;

-- 9. Risky Protocol - Extremely low volume
INSERT INTO protocol_market_risks (
  protocol_id, daily_volume_usd, volume_change_24h_pct, volume_change_7d_pct, volume_change_30d_pct,
  active_users_count, user_change_24h_pct, user_change_7d_pct, user_change_30d_pct,
  price_volatility_7d, price_volatility_30d, market_risk_score
) VALUES (
  'risky-protocol', 250000.00, -35.5, -62.8, -82.5,
  120, -28.5, -55.2, -75.0, 0.92, 0.95, 80.00
) ON CONFLICT DO NOTHING;

-- 10. Scam Protocol - Almost no volume
INSERT INTO protocol_market_risks (
  protocol_id, daily_volume_usd, volume_change_24h_pct, volume_change_7d_pct, volume_change_30d_pct,
  active_users_count, user_change_24h_pct, user_change_7d_pct, user_change_30d_pct,
  price_volatility_7d, price_volatility_30d, market_risk_score
) VALUES (
  'scam-protocol', 50000.00, -48.5, -75.8, -92.5,
  25, -42.5, -68.2, -88.0, 0.98, 0.99, 92.00
) ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT protocol_id, daily_volume_usd, active_users_count, market_risk_score 
FROM protocol_market_risks 
ORDER BY market_risk_score ASC;

