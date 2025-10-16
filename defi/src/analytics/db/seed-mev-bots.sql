-- Seed Data: MEV Bots
-- Story: 4.1.3 - Advanced MEV Analytics
-- Date: 2025-10-16
-- Description: Sample MEV bot data for testing and development

-- Clear existing data (for development)
TRUNCATE TABLE mev_bots CASCADE;

-- Insert sample MEV bots (10 bots with varying sophistication levels)

-- Bot 1: High-sophistication multi-strategy bot
INSERT INTO mev_bots (
  bot_address, chain_id, bot_name, bot_type, verified,
  total_mev_extracted_usd, total_transactions, successful_transactions, failed_transactions, success_rate,
  avg_profit_per_tx_usd, total_gas_spent_usd, net_profit_usd,
  first_seen, last_active, active_days, total_blocks_active,
  preferred_opportunity_types, preferred_protocols, preferred_tokens, preferred_dexes,
  sophistication_score, uses_flashbots, uses_private_mempool, uses_multi_hop, uses_flash_loans,
  avg_gas_price_gwei, max_gas_price_gwei, avg_priority_fee_gwei
) VALUES (
  '0x000000000035B5e5ad9019092C665357240f594e', 'ethereum', 'Flashbots Alpha', 'multi-strategy', TRUE,
  5250000.00, 1250, 1125, 125, 90.00,
  4200.00, 125000.00, 5125000.00,
  '2023-01-15 08:00:00', '2025-10-15 23:45:00', 639, 45000,
  ARRAY['sandwich', 'arbitrage', 'liquidation'], ARRAY['uniswap-v3', 'curve', 'aave'], ARRAY['WETH', 'USDC', 'DAI'], ARRAY['uniswap', 'sushiswap', 'curve'],
  95.00, TRUE, TRUE, TRUE, TRUE,
  45.50, 250.00, 12.50
);

-- Bot 2: Sandwich specialist
INSERT INTO mev_bots (
  bot_address, chain_id, bot_name, bot_type, verified,
  total_mev_extracted_usd, total_transactions, successful_transactions, failed_transactions, success_rate,
  avg_profit_per_tx_usd, total_gas_spent_usd, net_profit_usd,
  first_seen, last_active, active_days, total_blocks_active,
  preferred_opportunity_types, preferred_protocols, preferred_tokens, preferred_dexes,
  sophistication_score, uses_flashbots, uses_private_mempool, uses_multi_hop, uses_flash_loans,
  avg_gas_price_gwei, max_gas_price_gwei, avg_priority_fee_gwei
) VALUES (
  '0x6b75d8AF000000e20B7a7DDf000Ba900b4009A80', 'ethereum', 'Sandwich Master', 'sandwich', TRUE,
  3800000.00, 2100, 1890, 210, 90.00,
  1809.52, 105000.00, 3695000.00,
  '2023-03-20 10:30:00', '2025-10-15 22:15:00', 574, 38000,
  ARRAY['sandwich'], ARRAY['uniswap-v3', 'uniswap-v2'], ARRAY['WETH', 'USDC'], ARRAY['uniswap', 'sushiswap'],
  85.00, TRUE, FALSE, TRUE, FALSE,
  50.00, 300.00, 15.00
);

-- Bot 3: Arbitrage specialist
INSERT INTO mev_bots (
  bot_address, chain_id, bot_name, bot_type, verified,
  total_mev_extracted_usd, total_transactions, successful_transactions, failed_transactions, success_rate,
  avg_profit_per_tx_usd, total_gas_spent_usd, net_profit_usd,
  first_seen, last_active, active_days, total_blocks_active,
  preferred_opportunity_types, preferred_protocols, preferred_tokens, preferred_dexes,
  sophistication_score, uses_flashbots, uses_private_mempool, uses_multi_hop, uses_flash_loans,
  avg_gas_price_gwei, max_gas_price_gwei, avg_priority_fee_gwei
) VALUES (
  '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', 'ethereum', 'Arb Hunter', 'arbitrage', TRUE,
  2150000.00, 3500, 3150, 350, 90.00,
  614.29, 87500.00, 2062500.00,
  '2023-02-10 14:20:00', '2025-10-15 21:30:00', 613, 42000,
  ARRAY['arbitrage'], ARRAY['uniswap-v3', 'curve', 'balancer'], ARRAY['WETH', 'USDC', 'USDT'], ARRAY['uniswap', 'curve', 'balancer'],
  80.00, FALSE, FALSE, TRUE, TRUE,
  35.00, 180.00, 8.00
);

-- Bot 4: Liquidation specialist
INSERT INTO mev_bots (
  bot_address, chain_id, bot_name, bot_type, verified,
  total_mev_extracted_usd, total_transactions, successful_transactions, failed_transactions, success_rate,
  avg_profit_per_tx_usd, total_gas_spent_usd, net_profit_usd,
  first_seen, last_active, active_days, total_blocks_active,
  preferred_opportunity_types, preferred_protocols, preferred_tokens, preferred_dexes,
  sophistication_score, uses_flashbots, uses_private_mempool, uses_multi_hop, uses_flash_loans,
  avg_gas_price_gwei, max_gas_price_gwei, avg_priority_fee_gwei
) VALUES (
  '0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296', 'ethereum', 'Liquidator Pro', 'liquidation', TRUE,
  1950000.00, 450, 405, 45, 90.00,
  4333.33, 22500.00, 1927500.00,
  '2023-04-05 09:15:00', '2025-10-15 20:00:00', 558, 28000,
  ARRAY['liquidation'], ARRAY['aave', 'compound', 'maker'], ARRAY['WETH', 'WBTC', 'USDC'], ARRAY[],
  90.00, TRUE, TRUE, FALSE, TRUE,
  55.00, 400.00, 18.00
);

-- Bot 5: Frontrun specialist
INSERT INTO mev_bots (
  bot_address, chain_id, bot_name, bot_type, verified,
  total_mev_extracted_usd, total_transactions, successful_transactions, failed_transactions, success_rate,
  avg_profit_per_tx_usd, total_gas_spent_usd, net_profit_usd,
  first_seen, last_active, active_days, total_blocks_active,
  preferred_opportunity_types, preferred_protocols, preferred_tokens, preferred_dexes,
  sophistication_score, uses_flashbots, uses_private_mempool, uses_multi_hop, uses_flash_loans,
  avg_gas_price_gwei, max_gas_price_gwei, avg_priority_fee_gwei
) VALUES (
  '0x56178a0d5F301bAf6CF3e1Cd53d9863437345Bf9', 'ethereum', 'Frontrun Elite', 'frontrun', TRUE,
  1650000.00, 1800, 1620, 180, 90.00,
  916.67, 90000.00, 1560000.00,
  '2023-05-12 11:45:00', '2025-10-15 19:30:00', 521, 32000,
  ARRAY['frontrun'], ARRAY['uniswap-v3', 'opensea'], ARRAY['WETH', 'USDC'], ARRAY['uniswap'],
  75.00, TRUE, FALSE, FALSE, FALSE,
  60.00, 500.00, 20.00
);

-- Bot 6: Medium sophistication bot (Arbitrum)
INSERT INTO mev_bots (
  bot_address, chain_id, bot_name, bot_type, verified,
  total_mev_extracted_usd, total_transactions, successful_transactions, failed_transactions, success_rate,
  avg_profit_per_tx_usd, total_gas_spent_usd, net_profit_usd,
  first_seen, last_active, active_days, total_blocks_active,
  preferred_opportunity_types, preferred_protocols, preferred_tokens, preferred_dexes,
  sophistication_score, uses_flashbots, uses_private_mempool, uses_multi_hop, uses_flash_loans,
  avg_gas_price_gwei, max_gas_price_gwei, avg_priority_fee_gwei
) VALUES (
  '0x7F268357A8c2552623316e2562D90e642bB538E5', 'arbitrum', 'Arb L2 Bot', 'multi-strategy', FALSE,
  850000.00, 2500, 2125, 375, 85.00,
  340.00, 12500.00, 837500.00,
  '2023-06-20 13:00:00', '2025-10-15 18:45:00', 482, 55000,
  ARRAY['sandwich', 'arbitrage'], ARRAY['uniswap-v3', 'camelot'], ARRAY['WETH', 'USDC', 'ARB'], ARRAY['uniswap', 'camelot'],
  65.00, FALSE, FALSE, TRUE, FALSE,
  0.15, 2.50, 0.05
);

-- Bot 7: Low sophistication bot
INSERT INTO mev_bots (
  bot_address, chain_id, bot_name, bot_type, verified,
  total_mev_extracted_usd, total_transactions, successful_transactions, failed_transactions, success_rate,
  avg_profit_per_tx_usd, total_gas_spent_usd, net_profit_usd,
  first_seen, last_active, active_days, total_blocks_active,
  preferred_opportunity_types, preferred_protocols, preferred_tokens, preferred_dexes,
  sophistication_score, uses_flashbots, uses_private_mempool, uses_multi_hop, uses_flash_loans,
  avg_gas_price_gwei, max_gas_price_gwei, avg_priority_fee_gwei
) VALUES (
  '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97', 'ethereum', 'Simple Bot', 'backrun', FALSE,
  320000.00, 1200, 960, 240, 80.00,
  266.67, 36000.00, 284000.00,
  '2024-01-10 15:30:00', '2025-10-15 17:00:00', 279, 18000,
  ARRAY['backrun'], ARRAY['uniswap-v2'], ARRAY['WETH'], ARRAY['uniswap'],
  45.00, FALSE, FALSE, FALSE, FALSE,
  40.00, 150.00, 10.00
);

-- Bot 8: Polygon bot
INSERT INTO mev_bots (
  bot_address, chain_id, bot_name, bot_type, verified,
  total_mev_extracted_usd, total_transactions, successful_transactions, failed_transactions, success_rate,
  avg_profit_per_tx_usd, total_gas_spent_usd, net_profit_usd,
  first_seen, last_active, active_days, total_blocks_active,
  preferred_opportunity_types, preferred_protocols, preferred_tokens, preferred_dexes,
  sophistication_score, uses_flashbots, uses_private_mempool, uses_multi_hop, uses_flash_loans,
  avg_gas_price_gwei, max_gas_price_gwei, avg_priority_fee_gwei
) VALUES (
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'polygon', 'Polygon MEV', 'sandwich', FALSE,
  450000.00, 3200, 2720, 480, 85.00,
  140.63, 8000.00, 442000.00,
  '2023-08-15 12:00:00', '2025-10-15 16:15:00', 427, 48000,
  ARRAY['sandwich'], ARRAY['quickswap', 'uniswap-v3'], ARRAY['WMATIC', 'USDC'], ARRAY['quickswap', 'uniswap'],
  55.00, FALSE, FALSE, FALSE, FALSE,
  80.00, 500.00, 25.00
);

-- Bot 9: Base bot
INSERT INTO mev_bots (
  bot_address, chain_id, bot_name, bot_type, verified,
  total_mev_extracted_usd, total_transactions, successful_transactions, failed_transactions, success_rate,
  avg_profit_per_tx_usd, total_gas_spent_usd, net_profit_usd,
  first_seen, last_active, active_days, total_blocks_active,
  preferred_opportunity_types, preferred_protocols, preferred_tokens, preferred_dexes,
  sophistication_score, uses_flashbots, uses_private_mempool, uses_multi_hop, uses_flash_loans,
  avg_gas_price_gwei, max_gas_price_gwei, avg_priority_fee_gwei
) VALUES (
  '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5', 'base', 'Base Hunter', 'arbitrage', FALSE,
  280000.00, 1800, 1530, 270, 85.00,
  155.56, 4500.00, 275500.00,
  '2024-03-01 10:00:00', '2025-10-15 15:30:00', 229, 25000,
  ARRAY['arbitrage'], ARRAY['uniswap-v3', 'aerodrome'], ARRAY['WETH', 'USDC'], ARRAY['uniswap', 'aerodrome'],
  60.00, FALSE, FALSE, TRUE, FALSE,
  0.08, 1.20, 0.03
);

-- Bot 10: Optimism bot
INSERT INTO mev_bots (
  bot_address, chain_id, bot_name, bot_type, verified,
  total_mev_extracted_usd, total_transactions, successful_transactions, failed_transactions, success_rate,
  avg_profit_per_tx_usd, total_gas_spent_usd, net_profit_usd,
  first_seen, last_active, active_days, total_blocks_active,
  preferred_opportunity_types, preferred_protocols, preferred_tokens, preferred_dexes,
  sophistication_score, uses_flashbots, uses_private_mempool, uses_multi_hop, uses_flash_loans,
  avg_gas_price_gwei, max_gas_price_gwei, avg_priority_fee_gwei
) VALUES (
  '0x220866B1A2219f40e72f5c628B65D54268cA3A9D', 'optimism', 'OP MEV Bot', 'multi-strategy', FALSE,
  520000.00, 2200, 1870, 330, 85.00,
  236.36, 5500.00, 514500.00,
  '2023-09-10 14:30:00', '2025-10-15 14:45:00', 401, 35000,
  ARRAY['sandwich', 'arbitrage'], ARRAY['uniswap-v3', 'velodrome'], ARRAY['WETH', 'USDC', 'OP'], ARRAY['uniswap', 'velodrome'],
  70.00, FALSE, FALSE, TRUE, FALSE,
  0.12, 2.00, 0.04
);

-- Verify data
SELECT 
  bot_address, 
  chain_id, 
  bot_name, 
  bot_type, 
  total_mev_extracted_usd, 
  success_rate, 
  sophistication_score
FROM mev_bots
ORDER BY total_mev_extracted_usd DESC;

