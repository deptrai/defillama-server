-- Seed Data: Yield Opportunities
-- Story: 2.1.2 - Yield Opportunity Scanner
-- Description: Sample yield opportunities for testing

-- Clear existing data
TRUNCATE TABLE yield_history CASCADE;
TRUNCATE TABLE yield_alerts CASCADE;
TRUNCATE TABLE yield_opportunities CASCADE;

-- Insert yield opportunities (20+ pools across different protocols and chains)

-- Lending Pools (Aave, Compound)
INSERT INTO yield_opportunities (protocol_id, pool_id, chain_id, pool_name, pool_type, token_symbols, apy, apr, base_apy, reward_apy, auto_compound, tvl, volume_24h, volume_7d, risk_score, risk_category, audit_status, protocol_age_days, yield_volatility, yield_stability_score) VALUES
('aave-v3', 'aave-usdc-eth', 'ethereum', 'USDC Lending', 'lending', ARRAY['USDC']::TEXT[], 4.25, 4.15, 3.50, 0.75, FALSE, 1250000000, 45000000, 315000000, 15, 'low', 'audited', 1825, 0.85, 92.5),
('aave-v3', 'aave-usdt-eth', 'ethereum', 'USDT Lending', 'lending', ARRAY['USDT']::TEXT[], 3.95, 3.87, 3.20, 0.75, FALSE, 980000000, 38000000, 266000000, 18, 'low', 'audited', 1825, 0.92, 90.8),
('aave-v3', 'aave-dai-eth', 'ethereum', 'DAI Lending', 'lending', ARRAY['DAI']::TEXT[], 4.10, 4.02, 3.35, 0.75, FALSE, 750000000, 28000000, 196000000, 16, 'low', 'audited', 1825, 0.88, 91.7),
('compound-v3', 'comp-usdc-eth', 'ethereum', 'USDC Supply', 'lending', ARRAY['USDC']::TEXT[], 3.85, 3.78, 3.10, 0.75, FALSE, 890000000, 32000000, 224000000, 20, 'low', 'audited', 2190, 1.05, 88.5),
('aave-v3', 'aave-weth-arb', 'arbitrum', 'WETH Lending', 'lending', ARRAY['WETH']::TEXT[], 2.15, 2.12, 1.80, 0.35, FALSE, 450000000, 18000000, 126000000, 22, 'low', 'audited', 1825, 0.75, 93.2),

-- Staking Pools (Lido, Rocket Pool)
('lido', 'lido-steth-eth', 'ethereum', 'stETH Staking', 'staking', ARRAY['ETH']::TEXT[], 3.45, 3.38, 3.45, 0.00, TRUE, 18500000000, 125000000, 875000000, 12, 'low', 'audited', 1460, 0.45, 95.8),
('rocket-pool', 'rpl-reth-eth', 'ethereum', 'rETH Staking', 'staking', ARRAY['ETH']::TEXT[], 3.65, 3.58, 3.65, 0.00, TRUE, 2800000000, 35000000, 245000000, 25, 'low', 'audited', 1095, 0.62, 94.2),
('lido', 'lido-stmatic-pol', 'polygon', 'stMATIC Staking', 'staking', ARRAY['MATIC']::TEXT[], 5.25, 5.12, 5.25, 0.00, TRUE, 185000000, 8500000, 59500000, 28, 'low', 'audited', 1460, 1.15, 89.5),

-- LP Pools (Uniswap, Curve)
('uniswap-v3', 'uni-usdc-eth-005', 'ethereum', 'USDC/ETH 0.05%', 'lp', ARRAY['USDC', 'ETH']::TEXT[], 12.50, 11.85, 8.50, 4.00, FALSE, 425000000, 185000000, 1295000000, 35, 'medium', 'audited', 1825, 2.85, 78.5),
('uniswap-v3', 'uni-usdc-eth-03', 'ethereum', 'USDC/ETH 0.3%', 'lp', ARRAY['USDC', 'ETH']::TEXT[], 18.75, 17.50, 12.75, 6.00, FALSE, 285000000, 125000000, 875000000, 38, 'medium', 'audited', 1825, 3.25, 75.2),
('curve', 'curve-3pool-eth', 'ethereum', '3Pool (DAI/USDC/USDT)', 'lp', ARRAY['DAI', 'USDC', 'USDT']::TEXT[], 6.85, 6.65, 4.85, 2.00, FALSE, 1850000000, 95000000, 665000000, 18, 'low', 'audited', 2190, 1.45, 88.8),
('curve', 'curve-steth-eth', 'ethereum', 'stETH/ETH', 'lp', ARRAY['stETH', 'ETH']::TEXT[], 8.25, 7.95, 5.25, 3.00, FALSE, 3250000000, 145000000, 1015000000, 22, 'low', 'audited', 2190, 1.75, 86.5),
('uniswap-v3', 'uni-wbtc-eth-03', 'ethereum', 'WBTC/ETH 0.3%', 'lp', ARRAY['WBTC', 'ETH']::TEXT[], 15.25, 14.35, 10.25, 5.00, FALSE, 195000000, 85000000, 595000000, 42, 'medium', 'audited', 1825, 3.05, 76.8),

-- Farming Pools (Yearn, Convex)
('yearn', 'yearn-usdc-vault', 'ethereum', 'USDC Vault', 'farming', ARRAY['USDC']::TEXT[], 8.95, 8.45, 4.95, 4.00, TRUE, 285000000, 12000000, 84000000, 30, 'low', 'audited', 1825, 1.85, 84.5),
('yearn', 'yearn-dai-vault', 'ethereum', 'DAI Vault', 'farming', ARRAY['DAI']::TEXT[], 9.25, 8.75, 5.25, 4.00, TRUE, 195000000, 9500000, 66500000, 32, 'low', 'audited', 1825, 1.95, 83.8),
('convex', 'cvx-3pool-eth', 'ethereum', 'Convex 3Pool', 'farming', ARRAY['DAI', 'USDC', 'USDT']::TEXT[], 11.50, 10.85, 6.50, 5.00, TRUE, 1250000000, 45000000, 315000000, 28, 'low', 'audited', 1460, 2.15, 82.5),
('convex', 'cvx-steth-eth', 'ethereum', 'Convex stETH', 'farming', ARRAY['stETH', 'ETH']::TEXT[], 13.75, 12.95, 7.75, 6.00, TRUE, 2150000000, 85000000, 595000000, 25, 'low', 'audited', 1460, 2.35, 81.2),

-- High-Risk / High-Yield Opportunities
('sushiswap', 'sushi-arb-eth-arb', 'arbitrum', 'ARB/ETH', 'lp', ARRAY['ARB', 'ETH']::TEXT[], 45.50, 38.25, 25.50, 20.00, FALSE, 28500000, 12500000, 87500000, 68, 'high', 'unaudited', 365, 8.50, 52.5),
('trader-joe', 'joe-avax-usdc-avax', 'avalanche', 'AVAX/USDC', 'lp', ARRAY['AVAX', 'USDC']::TEXT[], 38.75, 32.50, 20.75, 18.00, FALSE, 45000000, 18500000, 129500000, 65, 'high', 'audited', 730, 7.25, 58.2),
('pancakeswap', 'cake-bnb-busd-bsc', 'bsc', 'BNB/BUSD', 'lp', ARRAY['BNB', 'BUSD']::TEXT[], 42.25, 35.50, 22.25, 20.00, FALSE, 125000000, 45000000, 315000000, 62, 'high', 'audited', 1460, 6.85, 60.5),

-- Medium-Risk Opportunities
('balancer', 'bal-weth-usdc-eth', 'ethereum', 'WETH/USDC 80/20', 'lp', ARRAY['WETH', 'USDC']::TEXT[], 22.50, 20.75, 14.50, 8.00, FALSE, 85000000, 28000000, 196000000, 48, 'medium', 'audited', 1095, 4.25, 72.5),
('velodrome', 'velo-op-usdc-opt', 'optimism', 'OP/USDC', 'lp', ARRAY['OP', 'USDC']::TEXT[], 28.75, 25.50, 16.75, 12.00, FALSE, 45000000, 15000000, 105000000, 52, 'medium', 'audited', 730, 5.15, 68.8),
('gmx', 'gmx-glp-arb', 'arbitrum', 'GLP Staking', 'staking', ARRAY['GLP']::TEXT[], 18.50, 17.25, 12.50, 6.00, TRUE, 285000000, 35000000, 245000000, 45, 'medium', 'audited', 1095, 3.85, 74.2);

-- Insert historical data (last 30 days, daily snapshots)
-- For each opportunity, create 30 historical snapshots with realistic APY variations

DO $$
DECLARE
  opp RECORD;
  day_offset INT;
  hist_apy DECIMAL(10, 4);
  hist_tvl DECIMAL(20, 2);
  hist_volume DECIMAL(20, 2);
  base_timestamp TIMESTAMP;
BEGIN
  base_timestamp := NOW() - INTERVAL '30 days';
  
  FOR opp IN SELECT id, apy, tvl, volume_24h, yield_volatility FROM yield_opportunities LOOP
    FOR day_offset IN 0..29 LOOP
      -- Add random variation based on volatility
      hist_apy := opp.apy + (RANDOM() - 0.5) * opp.yield_volatility * 2;
      hist_tvl := opp.tvl * (0.9 + RANDOM() * 0.2); -- ±10% variation
      hist_volume := opp.volume_24h * (0.8 + RANDOM() * 0.4); -- ±20% variation
      
      INSERT INTO yield_history (opportunity_id, timestamp, apy, apr, tvl, volume_24h)
      VALUES (
        opp.id,
        base_timestamp + (day_offset || ' days')::INTERVAL,
        hist_apy,
        hist_apy * 0.95, -- APR slightly lower than APY
        hist_tvl,
        hist_volume
      );
    END LOOP;
  END LOOP;
END $$;

-- Summary
SELECT 
  'Yield Opportunities' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT protocol_id) as protocols,
  COUNT(DISTINCT chain_id) as chains,
  COUNT(DISTINCT pool_type) as pool_types
FROM yield_opportunities
UNION ALL
SELECT 
  'Yield History' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT opportunity_id) as opportunities,
  NULL as chains,
  NULL as pool_types
FROM yield_history;

