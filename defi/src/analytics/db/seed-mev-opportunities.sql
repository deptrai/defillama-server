-- Seed Data: MEV Opportunities
-- Story: 4.1.1 - MEV Opportunity Detection
-- Date: 2025-10-16
-- Description: Test data for MEV opportunities covering all 5 types

-- Clear existing data
TRUNCATE TABLE mev_opportunities CASCADE;

-- Sandwich Attack Opportunities (5 records)
INSERT INTO mev_opportunities (
  opportunity_type, chain_id, block_number, timestamp,
  target_tx_hash, mev_tx_hashes, token_addresses, token_symbols,
  protocol_id, protocol_name, dex_name,
  mev_profit_usd, victim_loss_usd, gas_cost_usd, net_profit_usd,
  bot_address, bot_name, bot_type,
  detection_method, confidence_score, status
) VALUES
-- Sandwich 1: Large USDC/ETH swap on Uniswap
(
  'sandwich', 'ethereum', 18500000, '2025-10-15 10:30:00',
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  ARRAY['0xabc123...frontrun', '0xdef456...backrun']::TEXT[],
  ARRAY['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2']::TEXT[],
  ARRAY['USDC', 'WETH']::TEXT[],
  'uniswap-v3', 'Uniswap V3', 'Uniswap V3',
  15420.50, 8230.25, 450.30, 14970.20,
  '0x000000000035B5e5ad9019092C665357240f594e', 'jaredfromsubway.eth', 'sandwich_bot',
  'pattern_matching', 92.5, 'confirmed'
),

-- Sandwich 2: Medium PEPE/WETH swap on Uniswap
(
  'sandwich', 'ethereum', 18500100, '2025-10-15 11:15:00',
  '0x2345678901bcdef2345678901bcdef2345678901bcdef2345678901bcdef23',
  ARRAY['0xbcd234...frontrun', '0xefg567...backrun']::TEXT[],
  ARRAY['0x6982508145454Ce325dDbE47a25d4ec3d2311933', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2']::TEXT[],
  ARRAY['PEPE', 'WETH']::TEXT[],
  'uniswap-v2', 'Uniswap V2', 'Uniswap V2',
  8750.00, 4320.50, 320.00, 8430.00,
  '0x6b75d8AF000000e20B7a7DDf000Ba900b4009A80', 'mev_bot_alpha', 'sandwich_bot',
  'pattern_matching', 88.0, 'executed'
),

-- Sandwich 3: Small ARB/USDC swap on Arbitrum
(
  'sandwich', 'arbitrum', 145000000, '2025-10-15 12:00:00',
  '0x3456789012cdef3456789012cdef3456789012cdef3456789012cdef345678',
  ARRAY['0xcde345...frontrun', '0xfgh678...backrun']::TEXT[],
  ARRAY['0x912CE59144191C1204E64559FE8253a0e49E6548', '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8']::TEXT[],
  ARRAY['ARB', 'USDC']::TEXT[],
  'uniswap-v3', 'Uniswap V3', 'Uniswap V3',
  2340.00, 1150.00, 45.00, 2295.00,
  '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', 'arb_sandwich_bot', 'sandwich_bot',
  'pattern_matching', 85.5, 'confirmed'
),

-- Sandwich 4: Failed sandwich (victim used MEV protection)
(
  'sandwich', 'ethereum', 18500200, '2025-10-15 13:30:00',
  '0x4567890123def4567890123def4567890123def4567890123def4567890123',
  ARRAY['0xdef456...frontrun']::TEXT[],
  ARRAY['0xdAC17F958D2ee523a2206206994597C13D831ec7', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2']::TEXT[],
  ARRAY['USDT', 'WETH']::TEXT[],
  'uniswap-v3', 'Uniswap V3', 'Uniswap V3',
  0.00, 0.00, 280.00, -280.00,
  '0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296', 'failed_sandwich_bot', 'sandwich_bot',
  'pattern_matching', 75.0, 'failed'
),

-- Sandwich 5: Large LINK/ETH swap on Optimism
(
  'sandwich', 'optimism', 112000000, '2025-10-15 14:45:00',
  '0x5678901234ef5678901234ef5678901234ef5678901234ef5678901234ef56',
  ARRAY['0xefg567...frontrun', '0xhij890...backrun']::TEXT[],
  ARRAY['0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6', '0x4200000000000000000000000000000000000006']::TEXT[],
  ARRAY['LINK', 'WETH']::TEXT[],
  'uniswap-v3', 'Uniswap V3', 'Uniswap V3',
  5680.00, 2890.00, 35.00, 5645.00,
  '0x56178a0d5F301bAf6CF3e1Cd53d9863437345Bf9', 'op_sandwich_master', 'sandwich_bot',
  'pattern_matching', 90.0, 'executed'
);

-- Frontrunning Opportunities (4 records)
INSERT INTO mev_opportunities (
  opportunity_type, chain_id, block_number, timestamp,
  target_tx_hash, mev_tx_hashes, token_addresses, token_symbols,
  protocol_id, protocol_name, dex_name,
  mev_profit_usd, victim_loss_usd, gas_cost_usd, net_profit_usd,
  bot_address, bot_name, bot_type,
  detection_method, confidence_score, status
) VALUES
-- Frontrun 1: Large buy order
(
  'frontrun', 'ethereum', 18500300, '2025-10-15 15:00:00',
  '0x6789012345f6789012345f6789012345f6789012345f6789012345f678901',
  ARRAY['0xfgh678...frontrun']::TEXT[],
  ARRAY['0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2']::TEXT[],
  ARRAY['UNI', 'WETH']::TEXT[],
  'uniswap-v3', 'Uniswap V3', 'Uniswap V3',
  12500.00, 6200.00, 380.00, 12120.00,
  '0x7F268357A8c2552623316e2562D90e642bB538E5', 'frontrun_master', 'frontrun_bot',
  'price_impact_estimation', 87.0, 'confirmed'
),

-- Frontrun 2: NFT mint
(
  'frontrun', 'ethereum', 18500350, '2025-10-15 15:30:00',
  '0x7890123456g7890123456g7890123456g7890123456g7890123456g789012',
  ARRAY['0xghi789...frontrun']::TEXT[],
  ARRAY['0x0000000000000000000000000000000000000000']::TEXT[],
  ARRAY['ETH']::TEXT[],
  'nft-collection', 'Bored Ape Yacht Club', NULL,
  8900.00, 0.00, 520.00, 8380.00,
  '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97', 'nft_sniper_bot', 'frontrun_bot',
  'price_impact_estimation', 82.5, 'executed'
),

-- Frontrun 3: Token launch
(
  'frontrun', 'base', 5000000, '2025-10-15 16:00:00',
  '0x8901234567h8901234567h8901234567h8901234567h8901234567h890123',
  ARRAY['0xhij890...frontrun']::TEXT[],
  ARRAY['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', '0x4200000000000000000000000000000000000006']::TEXT[],
  ARRAY['USDC', 'WETH']::TEXT[],
  'uniswap-v3', 'Uniswap V3', 'Uniswap V3',
  4560.00, 2100.00, 25.00, 4535.00,
  '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5', 'base_frontrun_bot', 'frontrun_bot',
  'price_impact_estimation', 79.0, 'confirmed'
),

-- Frontrun 4: Failed frontrun (gas war lost)
(
  'frontrun', 'ethereum', 18500400, '2025-10-15 16:30:00',
  '0x9012345678i9012345678i9012345678i9012345678i9012345678i901234',
  ARRAY['0xijk901...frontrun']::TEXT[],
  ARRAY['0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2']::TEXT[],
  ARRAY['DAI', 'WETH']::TEXT[],
  'uniswap-v2', 'Uniswap V2', 'Uniswap V2',
  0.00, 0.00, 650.00, -650.00,
  '0x220866B1A2219f40e72f5c628B65D54268cA3A9D', 'failed_frontrun_bot', 'frontrun_bot',
  'price_impact_estimation', 70.0, 'failed'
);

-- Arbitrage Opportunities (5 records)
INSERT INTO mev_opportunities (
  opportunity_type, chain_id, block_number, timestamp,
  target_tx_hash, mev_tx_hashes, token_addresses, token_symbols,
  protocol_id, protocol_name, dex_name,
  mev_profit_usd, victim_loss_usd, gas_cost_usd, net_profit_usd,
  bot_address, bot_name, bot_type,
  detection_method, confidence_score, status
) VALUES
-- Arbitrage 1: Uniswap vs Sushiswap
(
  'arbitrage', 'ethereum', 18500500, '2025-10-15 17:00:00',
  NULL,
  ARRAY['0xjkl012...arbitrage']::TEXT[],
  ARRAY['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2']::TEXT[],
  ARRAY['USDC', 'WETH']::TEXT[],
  'multi-dex', 'Uniswap V3 → Sushiswap', 'Uniswap V3, Sushiswap',
  3240.00, 0.00, 420.00, 2820.00,
  '0x00000000003b3cc22aF3aE1EAc0440BcEe416B40', 'arb_bot_pro', 'arbitrage_bot',
  'multi_dex_price_comparison', 94.0, 'executed'
),

-- Arbitrage 2: Curve vs Balancer
(
  'arbitrage', 'ethereum', 18500550, '2025-10-15 17:30:00',
  NULL,
  ARRAY['0xklm123...arbitrage']::TEXT[],
  ARRAY['0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48']::TEXT[],
  ARRAY['DAI', 'USDC']::TEXT[],
  'multi-dex', 'Curve → Balancer', 'Curve, Balancer',
  1850.00, 0.00, 280.00, 1570.00,
  '0x000000000035B5e5ad9019092C665357240f594e', 'stable_arb_bot', 'arbitrage_bot',
  'multi_dex_price_comparison', 96.5, 'executed'
),

-- Arbitrage 3: Cross-chain (Ethereum → Arbitrum)
(
  'arbitrage', 'ethereum', 18500600, '2025-10-15 18:00:00',
  NULL,
  ARRAY['0xlmn234...arbitrage_eth', '0xmno345...arbitrage_arb']::TEXT[],
  ARRAY['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48']::TEXT[],
  ARRAY['USDC']::TEXT[],
  'cross-chain', 'Ethereum → Arbitrum', 'Uniswap V3',
  5670.00, 0.00, 850.00, 4820.00,
  '0x6b75d8AF000000e20B7a7DDf000Ba900b4009A80', 'cross_chain_arb_bot', 'arbitrage_bot',
  'cross_chain_price_comparison', 91.0, 'confirmed'
),

-- Arbitrage 4: Flash loan arbitrage
(
  'arbitrage', 'ethereum', 18500650, '2025-10-15 18:30:00',
  NULL,
  ARRAY['0xnop456...arbitrage']::TEXT[],
  ARRAY['0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2']::TEXT[],
  ARRAY['WBTC', 'WETH']::TEXT[],
  'multi-dex', 'Uniswap V2 → Sushiswap → Curve', 'Multiple DEXes',
  12340.00, 0.00, 680.00, 11660.00,
  '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', 'flash_arb_master', 'arbitrage_bot',
  'multi_dex_price_comparison', 93.5, 'executed'
),

-- Arbitrage 5: Small opportunity (not profitable after gas)
(
  'arbitrage', 'ethereum', 18500700, '2025-10-15 19:00:00',
  NULL,
  ARRAY['0xopq567...arbitrage']::TEXT[],
  ARRAY['0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2']::TEXT[],
  ARRAY['UNI', 'WETH']::TEXT[],
  'multi-dex', 'Uniswap V3 → Sushiswap', 'Uniswap V3, Sushiswap',
  450.00, 0.00, 520.00, -70.00,
  '0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296', 'small_arb_bot', 'arbitrage_bot',
  'multi_dex_price_comparison', 88.0, 'detected'
);

-- Liquidation Opportunities (4 records)
INSERT INTO mev_opportunities (
  opportunity_type, chain_id, block_number, timestamp,
  target_tx_hash, mev_tx_hashes, token_addresses, token_symbols,
  protocol_id, protocol_name, dex_name,
  mev_profit_usd, victim_loss_usd, gas_cost_usd, net_profit_usd,
  bot_address, bot_name, bot_type,
  detection_method, confidence_score, status
) VALUES
-- Liquidation 1: Aave position
(
  'liquidation', 'ethereum', 18500800, '2025-10-15 19:30:00',
  NULL,
  ARRAY['0xpqr678...liquidation']::TEXT[],
  ARRAY['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48']::TEXT[],
  ARRAY['WETH', 'USDC']::TEXT[],
  'aave-v3', 'Aave V3', NULL,
  8950.00, 0.00, 450.00, 8500.00,
  '0x56178a0d5F301bAf6CF3e1Cd53d9863437345Bf9', 'aave_liquidator_bot', 'liquidation_bot',
  'health_factor_monitoring', 98.0, 'executed'
),

-- Liquidation 2: Compound position
(
  'liquidation', 'ethereum', 18500850, '2025-10-15 20:00:00',
  NULL,
  ARRAY['0xqrs789...liquidation']::TEXT[],
  ARRAY['0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', '0x6B175474E89094C44Da98b954EedeAC495271d0F']::TEXT[],
  ARRAY['WBTC', 'DAI']::TEXT[],
  'compound-v3', 'Compound V3', NULL,
  15670.00, 0.00, 520.00, 15150.00,
  '0x7F268357A8c2552623316e2562D90e642bB538E5', 'compound_liquidator', 'liquidation_bot',
  'health_factor_monitoring', 97.5, 'executed'
),

-- Liquidation 3: MakerDAO vault
(
  'liquidation', 'ethereum', 18500900, '2025-10-15 20:30:00',
  NULL,
  ARRAY['0xrst890...liquidation']::TEXT[],
  ARRAY['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0x6B175474E89094C44Da98b954EedeAC495271d0F']::TEXT[],
  ARRAY['WETH', 'DAI']::TEXT[],
  'makerdao', 'MakerDAO', NULL,
  22340.00, 0.00, 680.00, 21660.00,
  '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97', 'maker_liquidator_pro', 'liquidation_bot',
  'health_factor_monitoring', 99.0, 'executed'
),

-- Liquidation 4: Failed liquidation (already liquidated)
(
  'liquidation', 'ethereum', 18500950, '2025-10-15 21:00:00',
  NULL,
  ARRAY['0xstu901...liquidation']::TEXT[],
  ARRAY['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0x6B175474E89094C44Da98b954EedeAC495271d0F']::TEXT[],
  ARRAY['USDC', 'DAI']::TEXT[],
  'aave-v3', 'Aave V3', NULL,
  0.00, 0.00, 380.00, -380.00,
  '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5', 'slow_liquidator', 'liquidation_bot',
  'health_factor_monitoring', 95.0, 'failed'
);

-- Backrunning Opportunities (2 records)
INSERT INTO mev_opportunities (
  opportunity_type, chain_id, block_number, timestamp,
  target_tx_hash, mev_tx_hashes, token_addresses, token_symbols,
  protocol_id, protocol_name, dex_name,
  mev_profit_usd, victim_loss_usd, gas_cost_usd, net_profit_usd,
  bot_address, bot_name, bot_type,
  detection_method, confidence_score, status
) VALUES
-- Backrun 1: After large buy
(
  'backrun', 'ethereum', 18501000, '2025-10-15 21:30:00',
  '0xtuv012...target',
  ARRAY['0xuv w123...backrun']::TEXT[],
  ARRAY['0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2']::TEXT[],
  ARRAY['UNI', 'WETH']::TEXT[],
  'uniswap-v3', 'Uniswap V3', 'Uniswap V3',
  6780.00, 0.00, 320.00, 6460.00,
  '0x220866B1A2219f40e72f5c628B65D54268cA3A9D', 'backrun_specialist', 'backrun_bot',
  'post_transaction_opportunity', 89.5, 'executed'
),

-- Backrun 2: After liquidation
(
  'backrun', 'ethereum', 18501050, '2025-10-15 22:00:00',
  '0xvwx234...target',
  ARRAY['0xwxy345...backrun']::TEXT[],
  ARRAY['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48']::TEXT[],
  ARRAY['WETH', 'USDC']::TEXT[],
  'aave-v3', 'Aave V3', 'Uniswap V3',
  4320.00, 0.00, 280.00, 4040.00,
  '0x00000000003b3cc22aF3aE1EAc0440BcEe416B40', 'liquidation_backrunner', 'backrun_bot',
  'post_transaction_opportunity', 91.0, 'confirmed'
);

-- Verify data
SELECT 
  opportunity_type,
  COUNT(*) as count,
  SUM(mev_profit_usd) as total_profit,
  AVG(confidence_score) as avg_confidence
FROM mev_opportunities
GROUP BY opportunity_type
ORDER BY opportunity_type;

