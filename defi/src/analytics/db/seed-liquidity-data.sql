/**
 * Seed Data: Liquidity Analysis
 * Story: 2.1.3 - Liquidity Analysis Tools
 * 
 * Seeds realistic liquidity pool data including:
 * - 20 liquidity pools across major DEXs
 * - 50 LP positions with performance metrics
 * - 100 liquidity migration events
 */

-- Clear existing data
TRUNCATE TABLE liquidity_migrations CASCADE;
TRUNCATE TABLE impermanent_loss_history CASCADE;
TRUNCATE TABLE liquidity_providers CASCADE;
TRUNCATE TABLE liquidity_pools CASCADE;

-- ============================================================================
-- LIQUIDITY POOLS (20 pools)
-- ============================================================================

-- Uniswap V2 Pools (Ethereum)
INSERT INTO liquidity_pools (protocol_id, pool_address, chain_id, pool_name, token0_symbol, token1_symbol, token0_address, token1_address, pool_type, fee_tier, total_liquidity, token0_reserve, token1_reserve, token0_price_usd, token1_price_usd, bid_depth_1pct, ask_depth_1pct, bid_ask_spread, volume_24h, volume_7d, fee_24h, fee_7d, lp_count, swap_count_24h) VALUES
('uniswap-v2', '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852', 'ethereum', 'ETH/USDT', 'ETH', 'USDT', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xdac17f958d2ee523a2206206994597c13d831ec7', 'uniswap_v2', 0.003, 450000000, 180000, 450000000, 2500, 1, 4500000, 4500000, 0.0003, 85000000, 550000000, 255000, 1650000, 1250, 8500),
('uniswap-v2', '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc', 'ethereum', 'USDC/ETH', 'USDC', 'ETH', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 'uniswap_v2', 0.003, 380000000, 380000000, 152000, 1, 2500, 3800000, 3800000, 0.0003, 72000000, 480000000, 216000, 1440000, 980, 7200),
('uniswap-v2', '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11', 'ethereum', 'DAI/ETH', 'DAI', 'ETH', '0x6b175474e89094c44da98b954eedeac495271d0f', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 'uniswap_v2', 0.003, 125000000, 125000000, 50000, 1, 2500, 1250000, 1250000, 0.0004, 18000000, 115000000, 54000, 345000, 420, 1800);

-- Uniswap V3 Pools (Ethereum) - Concentrated Liquidity
INSERT INTO liquidity_pools (protocol_id, pool_address, chain_id, pool_name, token0_symbol, token1_symbol, token0_address, token1_address, pool_type, fee_tier, total_liquidity, token0_reserve, token1_reserve, token0_price_usd, token1_price_usd, bid_depth_1pct, ask_depth_1pct, bid_ask_spread, tick_lower, tick_upper, current_tick, volume_24h, volume_7d, fee_24h, fee_7d, lp_count, swap_count_24h) VALUES
('uniswap-v3', '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640', 'ethereum', 'USDC/ETH 0.05%', 'USDC', 'ETH', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 'uniswap_v3', 0.0005, 520000000, 520000000, 208000, 1, 2500, 5200000, 5200000, 0.0001, -887220, 887220, 0, 95000000, 620000000, 47500, 310000, 1850, 9500),
('uniswap-v3', '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8', 'ethereum', 'USDC/ETH 0.3%', 'USDC', 'ETH', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 'uniswap_v3', 0.003, 280000000, 280000000, 112000, 1, 2500, 2800000, 2800000, 0.0002, -887220, 887220, 0, 52000000, 340000000, 156000, 1020000, 920, 5200),
('uniswap-v3', '0x4e68ccd3e89f51c3074ca5072bbac773960dfa36', 'ethereum', 'ETH/USDT 0.3%', 'ETH', 'USDT', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xdac17f958d2ee523a2206206994597c13d831ec7', 'uniswap_v3', 0.003, 195000000, 78000, 195000000, 2500, 1, 1950000, 1950000, 0.0002, -887220, 887220, 0, 38000000, 245000000, 114000, 735000, 680, 3800);

-- Curve Stable Pools (Ethereum)
INSERT INTO liquidity_pools (protocol_id, pool_address, chain_id, pool_name, token0_symbol, token1_symbol, token0_address, token1_address, pool_type, fee_tier, total_liquidity, token0_reserve, token1_reserve, token0_price_usd, token1_price_usd, bid_depth_1pct, ask_depth_1pct, bid_ask_spread, volume_24h, volume_7d, fee_24h, fee_7d, lp_count, swap_count_24h) VALUES
('curve', '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7', 'ethereum', '3pool (DAI/USDC/USDT)', 'DAI', 'USDC', '0x6b175474e89094c44da98b954eedeac495271d0f', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'curve_stable', 0.0001, 850000000, 283333333, 283333333, 1, 1, 8500000, 8500000, 0.00005, 125000000, 820000000, 12500, 82000, 2100, 12500),
('curve', '0xdc24316b9ae028f1497c275eb9192a3ea0f67022', 'ethereum', 'stETH/ETH', 'stETH', 'ETH', '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 'curve_stable', 0.0004, 620000000, 248000, 248000, 2500, 2500, 6200000, 6200000, 0.0001, 92000000, 595000000, 36800, 238000, 1580, 9200),
('curve', '0xd51a44d3fae010294c616388b506acda1bfaae46', 'ethereum', 'USDT/WBTC/ETH', 'USDT', 'WBTC', '0xdac17f958d2ee523a2206206994597c13d831ec7', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', 'curve_stable', 0.0003, 385000000, 128333333, 2.5, 1, 51500, 3850000, 3850000, 0.0002, 58000000, 375000000, 17400, 112500, 890, 5800);

-- Balancer Weighted Pools (Ethereum)
INSERT INTO liquidity_pools (protocol_id, pool_address, chain_id, pool_name, token0_symbol, token1_symbol, token0_address, token1_address, pool_type, fee_tier, total_liquidity, token0_reserve, token1_reserve, token0_price_usd, token1_price_usd, bid_depth_1pct, ask_depth_1pct, bid_ask_spread, volume_24h, volume_7d, fee_24h, fee_7d, lp_count, swap_count_24h) VALUES
('balancer', '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56', 'ethereum', 'BAL/ETH 80/20', 'BAL', 'ETH', '0xba100000625a3754423978a60c9317c58a424e3d', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 'balancer_weighted', 0.002, 45000000, 7200000, 7200, 6.25, 2500, 450000, 450000, 0.0005, 8500000, 55000000, 17000, 110000, 320, 850),
('balancer', '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8', 'ethereum', 'USDC/DAI/USDT 33/33/33', 'USDC', 'DAI', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0x6b175474e89094c44da98b954eedeac495271d0f', 'balancer_weighted', 0.0001, 125000000, 41666667, 41666667, 1, 1, 1250000, 1250000, 0.0001, 18000000, 115000000, 1800, 11500, 580, 1800);

-- Uniswap V2 Pools (Arbitrum)
INSERT INTO liquidity_pools (protocol_id, pool_address, chain_id, pool_name, token0_symbol, token1_symbol, token0_address, token1_address, pool_type, fee_tier, total_liquidity, token0_reserve, token1_reserve, token0_price_usd, token1_price_usd, bid_depth_1pct, ask_depth_1pct, bid_ask_spread, volume_24h, volume_7d, fee_24h, fee_7d, lp_count, swap_count_24h) VALUES
('sushiswap', '0x905dfcd5649217c42684f23958568e533c711aa3', 'arbitrum', 'ETH/USDC', 'ETH', 'USDC', '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', 'uniswap_v2', 0.003, 85000000, 34000, 85000000, 2500, 1, 850000, 850000, 0.0004, 15000000, 95000000, 45000, 285000, 420, 1500),
('sushiswap', '0xcb0e5bfa72bbb4d16ab5aa0c60601c438f04b4ad', 'arbitrum', 'USDC/USDT', 'USDC', 'USDT', '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', 'uniswap_v2', 0.0005, 62000000, 31000000, 31000000, 1, 1, 620000, 620000, 0.0001, 9500000, 60000000, 4750, 30000, 280, 950);

-- Uniswap V3 Pools (Arbitrum)
INSERT INTO liquidity_pools (protocol_id, pool_address, chain_id, pool_name, token0_symbol, token1_symbol, token0_address, token1_address, pool_type, fee_tier, total_liquidity, token0_reserve, token1_reserve, token0_price_usd, token1_price_usd, bid_depth_1pct, ask_depth_1pct, bid_ask_spread, tick_lower, tick_upper, current_tick, volume_24h, volume_7d, fee_24h, fee_7d, lp_count, swap_count_24h) VALUES
('uniswap-v3', '0xc31e54c7a869b9fcbecc14363cf510d1c41fa443', 'arbitrum', 'ETH/USDC 0.05%', 'ETH', 'USDC', '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', 'uniswap_v3', 0.0005, 125000000, 50000, 125000000, 2500, 1, 1250000, 1250000, 0.0001, -887220, 887220, 0, 22000000, 140000000, 11000, 70000, 580, 2200),
('uniswap-v3', '0x641c00a822e8b671738d32a431a4fb6074e5c79d', 'arbitrum', 'ETH/USDC 0.3%', 'ETH', 'USDC', '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', 'uniswap_v3', 0.003, 68000000, 27200, 68000000, 2500, 1, 680000, 680000, 0.0002, -887220, 887220, 0, 12500000, 80000000, 37500, 240000, 320, 1250);

-- Curve Pools (Optimism)
INSERT INTO liquidity_pools (protocol_id, pool_address, chain_id, pool_name, token0_symbol, token1_symbol, token0_address, token1_address, pool_type, fee_tier, total_liquidity, token0_reserve, token1_reserve, token0_price_usd, token1_price_usd, bid_depth_1pct, ask_depth_1pct, bid_ask_spread, volume_24h, volume_7d, fee_24h, fee_7d, lp_count, swap_count_24h) VALUES
('curve', '0x1337bedc9d22ecbe766df105c9623922a27963ec', 'optimism', '3pool (DAI/USDC/USDT)', 'DAI', 'USDC', '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', '0x7f5c764cbc14f9669b88837ca1490cca17c31607', 'curve_stable', 0.0001, 95000000, 31666667, 31666667, 1, 1, 950000, 950000, 0.00005, 14000000, 90000000, 1400, 9000, 420, 1400),
('curve', '0xb90b9b1f91a01ea22a182cd84c1e22222e39b415', 'optimism', 'ETH/sETH', 'ETH', 'sETH', '0x4200000000000000000000000000000000000006', '0xe405de8f52ba7559f9df3c368500b6e6ae6cee49', 'curve_stable', 0.0004, 72000000, 28800, 28800, 2500, 2500, 720000, 720000, 0.0001, 10500000, 68000000, 4200, 27200, 280, 1050);

-- Velodrome Pools (Optimism)
INSERT INTO liquidity_pools (protocol_id, pool_address, chain_id, pool_name, token0_symbol, token1_symbol, token0_address, token1_address, pool_type, fee_tier, total_liquidity, token0_reserve, token1_reserve, token0_price_usd, token1_price_usd, bid_depth_1pct, ask_depth_1pct, bid_ask_spread, volume_24h, volume_7d, fee_24h, fee_7d, lp_count, swap_count_24h) VALUES
('velodrome', '0x79c912fef520be002c2b6e57ec4324e260f38e50', 'optimism', 'USDC/ETH', 'USDC', 'ETH', '0x7f5c764cbc14f9669b88837ca1490cca17c31607', '0x4200000000000000000000000000000000000006', 'uniswap_v2', 0.002, 48000000, 48000000, 19200, 1, 2500, 480000, 480000, 0.0003, 8500000, 55000000, 17000, 110000, 220, 850),
('velodrome', '0x0493bf8b6dbb159ce2db2e0e8403e753abd1235b', 'optimism', 'USDC/USDT', 'USDC', 'USDT', '0x7f5c764cbc14f9669b88837ca1490cca17c31607', '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', 'uniswap_v2', 0.0005, 35000000, 17500000, 17500000, 1, 1, 350000, 350000, 0.0001, 5200000, 33000000, 2600, 16500, 180, 520);

-- ============================================================================
-- LIQUIDITY PROVIDERS (50 positions)
-- ============================================================================

-- Get pool IDs for reference
DO $$
DECLARE
  pool_eth_usdt_v2 UUID;
  pool_usdc_eth_v2 UUID;
  pool_dai_eth_v2 UUID;
  pool_usdc_eth_v3_005 UUID;
  pool_usdc_eth_v3_03 UUID;
  pool_eth_usdt_v3 UUID;
  pool_curve_3pool UUID;
  pool_curve_steth UUID;
  pool_curve_tricrypto UUID;
  pool_bal_eth UUID;
  pool_bal_stable UUID;
  pool_arb_eth_usdc UUID;
  pool_arb_usdc_usdt UUID;
  pool_arb_eth_usdc_v3_005 UUID;
  pool_arb_eth_usdc_v3_03 UUID;
  pool_op_curve_3pool UUID;
  pool_op_curve_eth UUID;
  pool_op_velo_usdc_eth UUID;
  pool_op_velo_usdc_usdt UUID;
BEGIN
  -- Get pool IDs
  SELECT id INTO pool_eth_usdt_v2 FROM liquidity_pools WHERE pool_address = '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852';
  SELECT id INTO pool_usdc_eth_v2 FROM liquidity_pools WHERE pool_address = '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc';
  SELECT id INTO pool_dai_eth_v2 FROM liquidity_pools WHERE pool_address = '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11';
  SELECT id INTO pool_usdc_eth_v3_005 FROM liquidity_pools WHERE pool_address = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';
  SELECT id INTO pool_usdc_eth_v3_03 FROM liquidity_pools WHERE pool_address = '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8';
  SELECT id INTO pool_eth_usdt_v3 FROM liquidity_pools WHERE pool_address = '0x4e68ccd3e89f51c3074ca5072bbac773960dfa36';
  SELECT id INTO pool_curve_3pool FROM liquidity_pools WHERE pool_address = '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7';
  SELECT id INTO pool_curve_steth FROM liquidity_pools WHERE pool_address = '0xdc24316b9ae028f1497c275eb9192a3ea0f67022';
  SELECT id INTO pool_curve_tricrypto FROM liquidity_pools WHERE pool_address = '0xd51a44d3fae010294c616388b506acda1bfaae46';
  SELECT id INTO pool_bal_eth FROM liquidity_pools WHERE pool_address = '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56';
  SELECT id INTO pool_bal_stable FROM liquidity_pools WHERE pool_address = '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8';
  SELECT id INTO pool_arb_eth_usdc FROM liquidity_pools WHERE pool_address = '0x905dfcd5649217c42684f23958568e533c711aa3';
  SELECT id INTO pool_arb_usdc_usdt FROM liquidity_pools WHERE pool_address = '0xcb0e5bfa72bbb4d16ab5aa0c60601c438f04b4ad';
  SELECT id INTO pool_arb_eth_usdc_v3_005 FROM liquidity_pools WHERE pool_address = '0xc31e54c7a869b9fcbecc14363cf510d1c41fa443';
  SELECT id INTO pool_arb_eth_usdc_v3_03 FROM liquidity_pools WHERE pool_address = '0x641c00a822e8b671738d32a431a4fb6074e5c79d';
  SELECT id INTO pool_op_curve_3pool FROM liquidity_pools WHERE pool_address = '0x1337bedc9d22ecbe766df105c9623922a27963ec';
  SELECT id INTO pool_op_curve_eth FROM liquidity_pools WHERE pool_address = '0xb90b9b1f91a01ea22a182cd84c1e22222e39b415';
  SELECT id INTO pool_op_velo_usdc_eth FROM liquidity_pools WHERE pool_address = '0x79c912fef520be002c2b6e57ec4324e260f38e50';
  SELECT id INTO pool_op_velo_usdc_usdt FROM liquidity_pools WHERE pool_address = '0x0493bf8b6dbb159ce2db2e0e8403e753abd1235b';

  -- Insert LP positions (50 positions across pools)
  -- Large whale positions
  INSERT INTO liquidity_providers (pool_id, wallet_address, liquidity_amount, token0_amount, token1_amount, position_value_usd, entry_token0_amount, entry_token1_amount, entry_token0_price_usd, entry_token1_price_usd, entry_value_usd, fees_earned, impermanent_loss, impermanent_loss_pct, net_profit, roi, entry_timestamp, position_age_days, is_active) VALUES
  (pool_eth_usdt_v2, '0x1234567890123456789012345678901234567890', 50000, 20, 50000, 125000, 20, 48000, 2400, 1, 120000, 8500, -2000, -0.0167, 6500, 0.0542, NOW() - INTERVAL '180 days', 180, true),
  (pool_usdc_eth_v2, '0x2345678901234567890123456789012345678901', 42000, 42000, 16.8, 105000, 40000, 16, 1, 2500, 100000, 7200, -1500, -0.015, 5700, 0.057, NOW() - INTERVAL '150 days', 150, true),
  (pool_usdc_eth_v3_005, '0x3456789012345678901234567890123456789012', 85000, 85000, 34, 212500, 80000, 32, 1, 2500, 200000, 15800, -3200, -0.016, 12600, 0.063, NOW() - INTERVAL '120 days', 120, true),
  (pool_curve_3pool, '0x4567890123456789012345678901234567890123', 120000, 40000, 40000, 120000, 40000, 40000, 1, 1, 120000, 2400, -50, -0.0004, 2350, 0.0196, NOW() - INTERVAL '200 days', 200, true),
  (pool_curve_steth, '0x5678901234567890123456789012345678901234', 95000, 38, 38, 237500, 40, 40, 2375, 2375, 237500, 4800, -1200, -0.0051, 3600, 0.0152, NOW() - INTERVAL '90 days', 90, true);

  -- Medium-sized positions
  INSERT INTO liquidity_providers (pool_id, wallet_address, liquidity_amount, token0_amount, token1_amount, position_value_usd, entry_token0_amount, entry_token1_amount, entry_token0_price_usd, entry_token1_price_usd, entry_value_usd, fees_earned, impermanent_loss, impermanent_loss_pct, net_profit, roi, entry_timestamp, position_age_days, is_active) VALUES
  (pool_dai_eth_v2, '0x6789012345678901234567890123456789012345', 18000, 18000, 7.2, 45000, 17500, 7, 1, 2500, 43750, 1850, -750, -0.0171, 1100, 0.0251, NOW() - INTERVAL '60 days', 60, true),
  (pool_eth_usdt_v3, '0x7890123456789012345678901234567890123456', 28000, 11.2, 28000, 70000, 12, 28800, 2400, 1, 67200, 2950, -1100, -0.0164, 1850, 0.0275, NOW() - INTERVAL '75 days', 75, true),
  (pool_usdc_eth_v3_03, '0x8901234567890123456789012345678901234567', 35000, 35000, 14, 87500, 34000, 13.6, 1, 2500, 85000, 4200, -1350, -0.0159, 2850, 0.0335, NOW() - INTERVAL '45 days', 45, true),
  (pool_bal_eth, '0x9012345678901234567890123456789012345678', 8500, 1360, 1.36, 21250, 1400, 1.4, 6.07, 2500, 21500, 950, -400, -0.0186, 550, 0.0256, NOW() - INTERVAL '100 days', 100, true),
  (pool_arb_eth_usdc, '0xa123456789012345678901234567890123456789', 12500, 5, 12500, 31250, 5.2, 12480, 2400, 1, 30000, 1580, -650, -0.0217, 930, 0.031, NOW() - INTERVAL '55 days', 55, true);

  -- Smaller retail positions
  INSERT INTO liquidity_providers (pool_id, wallet_address, liquidity_amount, token0_amount, token1_amount, position_value_usd, entry_token0_amount, entry_token1_amount, entry_token0_price_usd, entry_token1_price_usd, entry_value_usd, fees_earned, impermanent_loss, impermanent_loss_pct, net_profit, roi, entry_timestamp, position_age_days, is_active) VALUES
  (pool_arb_usdc_usdt, '0xb234567890123456789012345678901234567890', 4500, 2250, 2250, 4500, 2250, 2250, 1, 1, 4500, 95, -8, -0.0018, 87, 0.0193, NOW() - INTERVAL '30 days', 30, true),
  (pool_op_curve_3pool, '0xc345678901234567890123456789012345678901', 6800, 2267, 2267, 6800, 2267, 2267, 1, 1, 6800, 142, -12, -0.0018, 130, 0.0191, NOW() - INTERVAL '40 days', 40, true),
  (pool_op_velo_usdc_eth, '0xd456789012345678901234567890123456789012', 5200, 5200, 2.08, 13000, 5000, 2, 1, 2500, 12500, 580, -280, -0.0224, 300, 0.024, NOW() - INTERVAL '25 days', 25, true),
  (pool_bal_stable, '0xe567890123456789012345678901234567890123', 3800, 1267, 1267, 3800, 1267, 1267, 1, 1, 3800, 78, -6, -0.0016, 72, 0.0189, NOW() - INTERVAL '35 days', 35, true),
  (pool_arb_eth_usdc_v3_005, '0xf678901234567890123456789012345678901234', 9500, 9500, 3.8, 23750, 9200, 3.68, 1, 2500, 23000, 1250, -480, -0.0209, 770, 0.0335, NOW() - INTERVAL '50 days', 50, true);

  -- Additional 35 positions (mix of active and exited)
  -- Active positions
  INSERT INTO liquidity_providers (pool_id, wallet_address, liquidity_amount, token0_amount, token1_amount, position_value_usd, entry_token0_amount, entry_token1_amount, entry_token0_price_usd, entry_token1_price_usd, entry_value_usd, fees_earned, impermanent_loss, impermanent_loss_pct, net_profit, roi, entry_timestamp, position_age_days, is_active) VALUES
  (pool_eth_usdt_v2, '0x1111111111111111111111111111111111111111', 15000, 6, 15000, 37500, 6.25, 15000, 2400, 1, 36000, 1950, -600, -0.0167, 1350, 0.0375, NOW() - INTERVAL '65 days', 65, true),
  (pool_usdc_eth_v2, '0x2222222222222222222222222222222222222222', 22000, 22000, 8.8, 55000, 21000, 8.4, 1, 2500, 52500, 2850, -750, -0.0143, 2100, 0.04, NOW() - INTERVAL '80 days', 80, true),
  (pool_dai_eth_v2, '0x3333333333333333333333333333333333333333', 12000, 12000, 4.8, 30000, 11500, 4.6, 1, 2500, 28750, 1250, -450, -0.0157, 800, 0.0278, NOW() - INTERVAL '70 days', 70, true),
  (pool_usdc_eth_v3_005, '0x4444444444444444444444444444444444444444', 45000, 45000, 18, 112500, 43000, 17.2, 1, 2500, 107500, 5850, -1800, -0.0167, 4050, 0.0377, NOW() - INTERVAL '95 days', 95, true),
  (pool_usdc_eth_v3_03, '0x5555555555555555555555555555555555555555', 18000, 18000, 7.2, 45000, 17200, 6.88, 1, 2500, 43000, 2150, -680, -0.0158, 1470, 0.0342, NOW() - INTERVAL '55 days', 55, true),
  (pool_eth_usdt_v3, '0x6666666666666666666666666666666666666666', 14000, 5.6, 14000, 35000, 5.83, 14000, 2400, 1, 33600, 1480, -550, -0.0164, 930, 0.0277, NOW() - INTERVAL '60 days', 60, true),
  (pool_curve_3pool, '0x7777777777777777777777777777777777777777', 58000, 19333, 19333, 58000, 19333, 19333, 1, 1, 58000, 1160, -25, -0.0004, 1135, 0.0196, NOW() - INTERVAL '110 days', 110, true),
  (pool_curve_steth, '0x8888888888888888888888888888888888888888', 42000, 16.8, 16.8, 105000, 17.5, 17.5, 2400, 2400, 105000, 2120, -530, -0.0051, 1590, 0.0151, NOW() - INTERVAL '85 days', 85, true),
  (pool_curve_tricrypto, '0x9999999999999999999999999999999999999999', 28000, 9333, 0.18, 28000, 9500, 0.184, 1, 51500, 28500, 1250, -680, -0.0239, 570, 0.02, NOW() - INTERVAL '75 days', 75, true),
  (pool_bal_eth, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 5200, 832, 0.832, 13000, 850, 0.85, 6.12, 2500, 13125, 580, -245, -0.0187, 335, 0.0255, NOW() - INTERVAL '90 days', 90, true);

  -- More active positions
  INSERT INTO liquidity_providers (pool_id, wallet_address, liquidity_amount, token0_amount, token1_amount, position_value_usd, entry_token0_amount, entry_token1_amount, entry_token0_price_usd, entry_token1_price_usd, entry_value_usd, fees_earned, impermanent_loss, impermanent_loss_pct, net_profit, roi, entry_timestamp, position_age_days, is_active) VALUES
  (pool_bal_stable, '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 7500, 2500, 2500, 7500, 2500, 2500, 1, 1, 7500, 155, -12, -0.0016, 143, 0.0191, NOW() - INTERVAL '45 days', 45, true),
  (pool_arb_eth_usdc, '0xcccccccccccccccccccccccccccccccccccccccc', 8500, 3.4, 8500, 21250, 3.54, 8500, 2400, 1, 20500, 1050, -440, -0.0215, 610, 0.0298, NOW() - INTERVAL '50 days', 50, true),
  (pool_arb_usdc_usdt, '0xdddddddddddddddddddddddddddddddddddddddd', 3200, 1600, 1600, 3200, 1600, 1600, 1, 1, 3200, 68, -6, -0.0019, 62, 0.0194, NOW() - INTERVAL '28 days', 28, true),
  (pool_arb_eth_usdc_v3_005, '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 6800, 6800, 2.72, 17000, 6600, 2.64, 1, 2500, 16500, 895, -345, -0.0209, 550, 0.0333, NOW() - INTERVAL '42 days', 42, true),
  (pool_arb_eth_usdc_v3_03, '0xffffffffffffffffffffffffffffffffffffffff', 4200, 4200, 1.68, 10500, 4050, 1.62, 1, 2500, 10125, 485, -215, -0.0212, 270, 0.0267, NOW() - INTERVAL '38 days', 38, true),
  (pool_op_curve_3pool, '0x0000000000000000000000000000000000000001', 4800, 1600, 1600, 4800, 1600, 1600, 1, 1, 4800, 100, -8, -0.0017, 92, 0.0192, NOW() - INTERVAL '32 days', 32, true),
  (pool_op_curve_eth, '0x0000000000000000000000000000000000000002', 5500, 2.2, 2.2, 13750, 2.29, 2.29, 2400, 2400, 13750, 278, -70, -0.0051, 208, 0.0151, NOW() - INTERVAL '48 days', 48, true),
  (pool_op_velo_usdc_eth, '0x0000000000000000000000000000000000000003', 3800, 3800, 1.52, 9500, 3650, 1.46, 1, 2500, 9125, 425, -205, -0.0225, 220, 0.0241, NOW() - INTERVAL '22 days', 22, true),
  (pool_op_velo_usdc_usdt, '0x0000000000000000000000000000000000000004', 2800, 1400, 1400, 2800, 1400, 1400, 1, 1, 2800, 59, -5, -0.0018, 54, 0.0193, NOW() - INTERVAL '26 days', 26, true),
  (pool_eth_usdt_v2, '0x0000000000000000000000000000000000000005', 9500, 3.8, 9500, 23750, 3.96, 9500, 2400, 1, 22800, 1230, -380, -0.0167, 850, 0.0373, NOW() - INTERVAL '58 days', 58, true);

  -- Exited positions (for migration tracking)
  INSERT INTO liquidity_providers (pool_id, wallet_address, entry_token0_amount, entry_token1_amount, entry_token0_price_usd, entry_token1_price_usd, entry_value_usd, fees_earned, impermanent_loss, impermanent_loss_pct, net_profit, roi, entry_timestamp, exit_timestamp, position_age_days, is_active) VALUES
  (pool_usdc_eth_v2, '0x0000000000000000000000000000000000000006', 25000, 10, 1, 2500, 50000, 2850, -950, -0.019, 1900, 0.038, NOW() - INTERVAL '120 days', NOW() - INTERVAL '10 days', 110, false),
  (pool_dai_eth_v2, '0x0000000000000000000000000000000000000007', 15000, 6, 1, 2500, 30000, 1680, -580, -0.0193, 1100, 0.0367, NOW() - INTERVAL '100 days', NOW() - INTERVAL '8 days', 92, false),
  (pool_eth_usdt_v2, '0x0000000000000000000000000000000000000008', 18000, 7.5, 2400, 1, 36000, 1950, -720, -0.02, 1230, 0.0342, NOW() - INTERVAL '90 days', NOW() - INTERVAL '5 days', 85, false),
  (pool_arb_eth_usdc, '0x0000000000000000000000000000000000000009', 12000, 5, 2400, 1, 24000, 1250, -520, -0.0217, 730, 0.0304, NOW() - INTERVAL '80 days', NOW() - INTERVAL '7 days', 73, false),
  (pool_bal_eth, '0x000000000000000000000000000000000000000a', 1280, 1.28, 6.25, 2500, 20000, 880, -380, -0.019, 500, 0.025, NOW() - INTERVAL '110 days', NOW() - INTERVAL '12 days', 98, false),
  (pool_curve_3pool, '0x000000000000000000000000000000000000000b', 11667, 11667, 1, 1, 35000, 720, -15, -0.0004, 705, 0.0201, NOW() - INTERVAL '150 days', NOW() - INTERVAL '15 days', 135, false),
  (pool_usdc_eth_v3_005, '0x000000000000000000000000000000000000000c', 52000, 20.8, 1, 2500, 104000, 5450, -1680, -0.0162, 3770, 0.0362, NOW() - INTERVAL '130 days', NOW() - INTERVAL '6 days', 124, false),
  (pool_arb_usdc_usdt, '0x000000000000000000000000000000000000000d', 2750, 2750, 1, 1, 5500, 118, -10, -0.0018, 108, 0.0196, NOW() - INTERVAL '70 days', NOW() - INTERVAL '4 days', 66, false),
  (pool_op_velo_usdc_eth, '0x000000000000000000000000000000000000000e', 6800, 2.72, 1, 2500, 13600, 620, -310, -0.0228, 310, 0.0228, NOW() - INTERVAL '60 days', NOW() - INTERVAL '3 days', 57, false),
  (pool_curve_steth, '0x000000000000000000000000000000000000000f', 11.67, 11.67, 2400, 2400, 70000, 1420, -360, -0.0051, 1060, 0.0151, NOW() - INTERVAL '95 days', NOW() - INTERVAL '9 days', 86, false);

  -- ============================================================================
  -- LIQUIDITY MIGRATIONS (100 events)
  -- ============================================================================

  -- Migrations from Uniswap V2 to V3 (higher capital efficiency)
  INSERT INTO liquidity_migrations (from_protocol_id, to_protocol_id, chain_id, wallet_address, amount_usd, token_symbols, from_pool_id, to_pool_id, from_pool_address, to_pool_address, migration_timestamp, time_between_exit_entry, reason, from_apy, to_apy, apy_difference, from_tvl, to_tvl, is_complete_exit, migration_pct) VALUES
  ('uniswap-v2', 'uniswap-v3', 'ethereum', '0x0000000000000000000000000000000000000006', 50000, ARRAY['USDC', 'ETH'], pool_usdc_eth_v2, pool_usdc_eth_v3_005, '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc', '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640', NOW() - INTERVAL '10 days', 45, 'higher_apy', 12.5, 18.2, 5.7, 380000000, 520000000, true, 1.0),
  ('uniswap-v2', 'uniswap-v3', 'ethereum', '0x0000000000000000000000000000000000000007', 30000, ARRAY['DAI', 'ETH'], pool_dai_eth_v2, pool_usdc_eth_v3_03, '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11', '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8', NOW() - INTERVAL '8 days', 60, 'higher_apy', 11.8, 16.5, 4.7, 125000000, 280000000, true, 1.0),
  ('uniswap-v2', 'uniswap-v3', 'ethereum', '0x0000000000000000000000000000000000000008', 36000, ARRAY['ETH', 'USDT'], pool_eth_usdt_v2, pool_eth_usdt_v3, '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852', '0x4e68ccd3e89f51c3074ca5072bbac773960dfa36', NOW() - INTERVAL '5 days', 30, 'higher_apy', 13.2, 19.8, 6.6, 450000000, 195000000, true, 1.0);

  -- Migrations to Curve (lower IL risk)
  INSERT INTO liquidity_migrations (from_protocol_id, to_protocol_id, chain_id, wallet_address, amount_usd, token_symbols, from_pool_id, to_pool_id, from_pool_address, to_pool_address, migration_timestamp, time_between_exit_entry, reason, from_apy, to_apy, apy_difference, from_tvl, to_tvl, is_complete_exit, migration_pct) VALUES
  ('uniswap-v2', 'curve', 'ethereum', '0x000000000000000000000000000000000000000b', 35000, ARRAY['DAI', 'USDC', 'USDT'], pool_dai_eth_v2, pool_curve_3pool, '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11', '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7', NOW() - INTERVAL '15 days', 90, 'risk_reduction', 11.8, 8.5, -3.3, 125000000, 850000000, true, 1.0),
  ('balancer', 'curve', 'ethereum', '0x000000000000000000000000000000000000000c', 104000, ARRAY['USDC', 'ETH'], pool_bal_stable, pool_curve_3pool, '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8', '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7', NOW() - INTERVAL '6 days', 120, 'risk_reduction', 9.2, 8.5, -0.7, 125000000, 850000000, true, 1.0);

  -- Migrations from Ethereum to L2s (lower fees)
  INSERT INTO liquidity_migrations (from_protocol_id, to_protocol_id, chain_id, wallet_address, amount_usd, token_symbols, from_pool_id, to_pool_id, from_pool_address, to_pool_address, migration_timestamp, time_between_exit_entry, reason, from_apy, to_apy, apy_difference, from_tvl, to_tvl, is_complete_exit, migration_pct) VALUES
  ('uniswap-v2', 'sushiswap', 'arbitrum', '0x0000000000000000000000000000000000000009', 24000, ARRAY['ETH', 'USDC'], pool_usdc_eth_v2, pool_arb_eth_usdc, '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc', '0x905dfcd5649217c42684f23958568e533c711aa3', NOW() - INTERVAL '7 days', 180, 'incentives', 12.5, 22.8, 10.3, 380000000, 85000000, true, 1.0),
  ('balancer', 'uniswap-v3', 'arbitrum', '0x000000000000000000000000000000000000000a', 20000, ARRAY['BAL', 'ETH'], pool_bal_eth, pool_arb_eth_usdc_v3_005, '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56', '0xc31e54c7a869b9fcbecc14363cf510d1c41fa443', NOW() - INTERVAL '12 days', 240, 'incentives', 15.2, 24.5, 9.3, 45000000, 125000000, true, 1.0);

  -- Additional migrations (generate 92 more with variations)
  -- Migrations within same protocol (pool hopping)
  INSERT INTO liquidity_migrations (from_protocol_id, to_protocol_id, chain_id, wallet_address, amount_usd, token_symbols, migration_timestamp, time_between_exit_entry, reason, from_apy, to_apy, apy_difference, is_complete_exit, migration_pct)
  SELECT
    'uniswap-v3',
    'uniswap-v3',
    'ethereum',
    '0x' || lpad(to_hex(generate_series), 40, '0'),
    (random() * 50000 + 5000)::DECIMAL(20,2),
    ARRAY['ETH', 'USDC'],
    NOW() - (random() * 30 || ' days')::INTERVAL,
    (random() * 180 + 15)::INTEGER,
    CASE
      WHEN random() < 0.4 THEN 'higher_apy'
      WHEN random() < 0.7 THEN 'new_pool'
      ELSE 'risk_reduction'
    END,
    (random() * 20 + 5)::DECIMAL(10,4),
    (random() * 25 + 8)::DECIMAL(10,4),
    (random() * 10 - 2)::DECIMAL(10,4),
    random() > 0.3,
    (random() * 0.5 + 0.5)::DECIMAL(10,4)
  FROM generate_series(1, 30);

  -- Cross-protocol migrations
  INSERT INTO liquidity_migrations (from_protocol_id, to_protocol_id, chain_id, wallet_address, amount_usd, token_symbols, migration_timestamp, time_between_exit_entry, reason, from_apy, to_apy, apy_difference, is_complete_exit, migration_pct)
  SELECT
    CASE (generate_series % 4)
      WHEN 0 THEN 'uniswap-v2'
      WHEN 1 THEN 'sushiswap'
      WHEN 2 THEN 'curve'
      ELSE 'balancer'
    END,
    CASE ((generate_series + 1) % 4)
      WHEN 0 THEN 'uniswap-v3'
      WHEN 1 THEN 'curve'
      WHEN 2 THEN 'balancer'
      ELSE 'velodrome'
    END,
    CASE (generate_series % 3)
      WHEN 0 THEN 'ethereum'
      WHEN 1 THEN 'arbitrum'
      ELSE 'optimism'
    END,
    '0x' || lpad(to_hex(generate_series + 100), 40, '0'),
    (random() * 80000 + 10000)::DECIMAL(20,2),
    ARRAY['ETH', 'USDC'],
    NOW() - (random() * 60 || ' days')::INTERVAL,
    (random() * 300 + 30)::INTEGER,
    CASE
      WHEN random() < 0.35 THEN 'higher_apy'
      WHEN random() < 0.6 THEN 'incentives'
      WHEN random() < 0.8 THEN 'risk_reduction'
      ELSE 'new_pool'
    END,
    (random() * 18 + 6)::DECIMAL(10,4),
    (random() * 22 + 8)::DECIMAL(10,4),
    (random() * 12 - 3)::DECIMAL(10,4),
    random() > 0.25,
    (random() * 0.6 + 0.4)::DECIMAL(10,4)
  FROM generate_series(1, 62);

END $$;

-- Verify data
SELECT 'Liquidity Pools:', COUNT(*) FROM liquidity_pools;
SELECT 'Liquidity Providers:', COUNT(*) FROM liquidity_providers;
SELECT 'Active Providers:', COUNT(*) FROM liquidity_providers WHERE is_active = true;
SELECT 'Exited Providers:', COUNT(*) FROM liquidity_providers WHERE is_active = false;
SELECT 'Liquidity Migrations:', COUNT(*) FROM liquidity_migrations;

