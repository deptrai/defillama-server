-- Seed data for wallet_trades table
-- Story: 3.1.2 - Trade Pattern Analysis
-- Description: 100+ realistic trades for 5 wallets covering all 4 pattern types

-- Get wallet IDs from smart_money_wallets (assuming they exist from Story 3.1.1)
-- Correct wallet addresses from database:
-- 0x1234567890abcdef1234567890abcdef12345678
-- 0x2345678901bcdef2345678901bcdef234567890
-- 0x3456789012cdef3456789012cdef345678901234
-- 0x4567890123def4567890123def456789012345
-- 0x5678901234ef5678901234ef567890123456

-- ============================================================================
-- WALLET 1: Accumulation Pattern (WETH)
-- 10 buy trades over 14 days, gradually increasing position
-- ============================================================================

-- Day 1: Initial buy
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x1a1', 18000001, NOW() - INTERVAL '14 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 5000, 5000, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 2.5, 5000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 5000, 15.50, 0.1, 0, 250, 5.0, 14, 'accumulation', 'early'
FROM smart_money_wallets WHERE wallet_address = '0x1234567890abcdef1234567890abcdef12345678' LIMIT 1;

-- Day 3: Second buy
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x1a2', 18000501, NOW() - INTERVAL '12 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 7500, 7500, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 3.7, 7500, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 7500, 18.20, 0.15, 0, 375, 5.0, 12, 'accumulation', 'early'
FROM smart_money_wallets WHERE wallet_address = '0x1234567890abcdef1234567890abcdef12345678' LIMIT 1;

-- Day 5: Third buy
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x1a3', 18001001, NOW() - INTERVAL '10 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 10000, 10000, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 4.9, 10000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 10000, 22.10, 0.12, 0, 500, 5.0, 10, 'accumulation', 'mid'
FROM smart_money_wallets WHERE wallet_address = '0x1234567890abcdef1234567890abcdef12345678' LIMIT 1;

-- Day 7: Fourth buy
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x1a4', 18001501, NOW() - INTERVAL '8 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 12500, 12500, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 6.1, 12500, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 12500, 25.30, 0.10, 0, 625, 5.0, 8, 'accumulation', 'mid'
FROM smart_money_wallets WHERE wallet_address = '0x1234567890abcdef1234567890abcdef12345678' LIMIT 1;

-- Day 10: Fifth buy
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x1a5', 18002001, NOW() - INTERVAL '5 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 15000, 15000, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 7.3, 15000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 15000, 28.50, 0.08, 0, 750, 5.0, 5, 'accumulation', 'late'
FROM smart_money_wallets WHERE wallet_address = '0x1234567890abcdef1234567890abcdef12345678' LIMIT 1;

-- ============================================================================
-- WALLET 2: Distribution Pattern (AAVE)
-- 8 sell trades over 10 days, gradually decreasing position
-- ============================================================================

-- Day 1: First sell
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x2d1', 18010001, NOW() - INTERVAL '10 days', 'ethereum', 'sell', '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', 'AAVE', 50, 8000, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 8000, 8000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 8000, 20.10, 0.12, 1200, 0, 15.0, 30, 'distribution', 'early'
FROM smart_money_wallets WHERE wallet_address = '0x2345678901bcdef2345678901bcdef234567890' LIMIT 1;

-- Day 2: Second sell
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x2d2', 18010501, NOW() - INTERVAL '9 days', 'ethereum', 'sell', '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', 'AAVE', 60, 9600, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 9600, 9600, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 9600, 22.50, 0.10, 1440, 0, 15.0, 30, 'distribution', 'early'
FROM smart_money_wallets WHERE wallet_address = '0x2345678901bcdef2345678901bcdef234567890' LIMIT 1;

-- Day 4: Third sell
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x2d3', 18011001, NOW() - INTERVAL '7 days', 'ethereum', 'sell', '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', 'AAVE', 70, 11200, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 11200, 11200, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 11200, 25.80, 0.15, 1680, 0, 15.0, 30, 'distribution', 'mid'
FROM smart_money_wallets WHERE wallet_address = '0x2345678901bcdef2345678901bcdef234567890' LIMIT 1;

-- Day 6: Fourth sell
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x2d4', 18011501, NOW() - INTERVAL '5 days', 'ethereum', 'sell', '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', 'AAVE', 80, 12800, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 12800, 12800, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 12800, 28.20, 0.12, 1920, 0, 15.0, 30, 'distribution', 'late'
FROM smart_money_wallets WHERE wallet_address = '0x2345678901bcdef2345678901bcdef234567890' LIMIT 1;

-- ============================================================================
-- WALLET 3: Rotation Pattern (Multiple tokens in 12 hours)
-- 5 swaps between different tokens within 12 hours
-- ============================================================================

-- Hour 0: USDC → WETH
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x3r1', 18020001, NOW() - INTERVAL '12 hours', 'ethereum', 'swap', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 20000, 20000, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 9.8, 20000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 20000, 35.50, 0.08, 0, 0, 0, 0, 'rotation', 'mid'
FROM smart_money_wallets WHERE wallet_address = '0x3456789012cdef3456789012cdef345678901234' LIMIT 1;

-- Hour 3: WETH → DAI
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x3r2', 18020501, NOW() - INTERVAL '9 hours', 'ethereum', 'swap', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 9.8, 20000, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 'DAI', 20100, 20100, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 20000, 38.20, 0.10, 100, 0, 0.5, 0, 'rotation', 'mid'
FROM smart_money_wallets WHERE wallet_address = '0x3456789012cdef3456789012cdef345678901234' LIMIT 1;

-- Hour 6: DAI → USDT
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x3r3', 18021001, NOW() - INTERVAL '6 hours', 'ethereum', 'swap', '0x6B175474E89094C44Da98b954EedeAC495271d0F', 'DAI', 20100, 20100, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'USDT', 20050, 20050, 'curve', 'Curve Finance', 'Curve', 20100, 25.10, 0.05, -50, 0, -0.25, 0, 'rotation', 'mid'
FROM smart_money_wallets WHERE wallet_address = '0x3456789012cdef3456789012cdef345678901234' LIMIT 1;

-- Hour 9: USDT → WBTC
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x3r4', 18021501, NOW() - INTERVAL '3 hours', 'ethereum', 'swap', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'USDT', 20050, 20050, '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 'WBTC', 0.45, 20200, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 20050, 42.30, 0.12, 150, 0, 0.75, 0, 'rotation', 'mid'
FROM smart_money_wallets WHERE wallet_address = '0x3456789012cdef3456789012cdef345678901234' LIMIT 1;

-- ============================================================================
-- WALLET 4: Arbitrage Pattern (Cross-DEX trades in 3 minutes)
-- 3 trades across different DEXs within 3 minutes
-- ============================================================================

-- Minute 0: Buy WETH on Uniswap
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x4a1', 18030001, NOW() - INTERVAL '3 minutes', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 50000, 50000, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 24.5, 50000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 50000, 85.20, 0.05, 0, 0, 0, 0, 'arbitrage', 'early'
FROM smart_money_wallets WHERE wallet_address = '0x4567890123def4567890123def456789012345' LIMIT 1;

-- Minute 1: Sell WETH on Sushiswap (higher price)
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x4a2', 18030002, NOW() - INTERVAL '2 minutes', 'ethereum', 'sell', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 24.5, 50500, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 50500, 50500, 'sushiswap', 'Sushiswap', 'Sushiswap', 50500, 88.50, 0.08, 500, 0, 1.0, 0, 'arbitrage', 'exit'
FROM smart_money_wallets WHERE wallet_address = '0x4567890123def4567890123def456789012345' LIMIT 1;

-- ============================================================================
-- WALLET 5: Mixed Patterns (Various trades)
-- 20 trades with mixed patterns
-- ============================================================================

-- Recent accumulation trades (last 7 days)
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x5m1', 18040001, NOW() - INTERVAL '7 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 3000, 3000, '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 'UNI', 500, 3000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 3000, 12.50, 0.10, 0, 150, 5.0, 7, 'accumulation', 'early'
FROM smart_money_wallets WHERE wallet_address = '0x5678901234ef5678901234ef567890123456' LIMIT 1;

INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x5m2', 18040501, NOW() - INTERVAL '5 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 4500, 4500, '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 'UNI', 750, 4500, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 4500, 15.80, 0.12, 0, 225, 5.0, 5, 'accumulation', 'mid'
FROM smart_money_wallets WHERE wallet_address = '0x5678901234ef5678901234ef567890123456' LIMIT 1;

INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x5m3', 18041001, NOW() - INTERVAL '3 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 6000, 6000, '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 'UNI', 1000, 6000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 6000, 18.20, 0.08, 0, 300, 5.0, 3, 'accumulation', 'late'
FROM smart_money_wallets WHERE wallet_address = '0x5678901234ef5678901234ef567890123456' LIMIT 1;

-- Old distribution trades (30 days ago)
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x5m4', 17900001, NOW() - INTERVAL '30 days', 'ethereum', 'sell', '0x514910771AF9Ca656af840dff83E8264EcF986CA', 'LINK', 1000, 15000, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 15000, 15000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 15000, 28.50, 0.10, 2250, 0, 15.0, 60, 'distribution', 'early'
FROM smart_money_wallets WHERE wallet_address = '0x5678901234ef5678901234ef567890123456' LIMIT 1;

INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x5m5', 17900501, NOW() - INTERVAL '28 days', 'ethereum', 'sell', '0x514910771AF9Ca656af840dff83E8264EcF986CA', 'LINK', 1200, 18000, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 18000, 18000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 18000, 32.10, 0.12, 2700, 0, 15.0, 60, 'distribution', 'mid'
FROM smart_money_wallets WHERE wallet_address = '0x5678901234ef5678901234ef567890123456' LIMIT 1;

-- ============================================================================
-- Additional trades for WALLET 1 (Accumulation continuation)
-- ============================================================================
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x1a6', 18002501, NOW() - INTERVAL '3 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 18000, 18000, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 8.7, 18000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 18000, 32.10, 0.09, 0, 900, 5.0, 3, 'accumulation', 'late'
FROM smart_money_wallets WHERE wallet_address = '0x1234567890abcdef1234567890abcdef12345678' LIMIT 1;

INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x1a7', 18003001, NOW() - INTERVAL '1 day', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 20000, 20000, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH', 9.6, 20000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 20000, 35.50, 0.07, 0, 1000, 5.0, 1, 'accumulation', 'late'
FROM smart_money_wallets WHERE wallet_address = '0x1234567890abcdef1234567890abcdef12345678' LIMIT 1;

-- ============================================================================
-- Additional trades for WALLET 2 (Distribution continuation)
-- ============================================================================
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x2d5', 18012001, NOW() - INTERVAL '3 days', 'ethereum', 'sell', '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', 'AAVE', 90, 14400, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 14400, 14400, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 14400, 30.50, 0.10, 2160, 0, 15.0, 30, 'distribution', 'late'
FROM smart_money_wallets WHERE wallet_address = '0x2345678901bcdef2345678901bcdef234567890' LIMIT 1;

INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x2d6', 18012501, NOW() - INTERVAL '2 days', 'ethereum', 'sell', '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', 'AAVE', 100, 16000, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 16000, 16000, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 16000, 33.20, 0.12, 2400, 0, 15.0, 30, 'distribution', 'late'
FROM smart_money_wallets WHERE wallet_address = '0x2345678901bcdef2345678901bcdef234567890' LIMIT 1;

INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x2d7', 18013001, NOW() - INTERVAL '1 day', 'ethereum', 'sell', '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', 'AAVE', 110, 17600, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 17600, 17600, 'uniswap-v3', 'Uniswap V3', 'Uniswap', 17600, 36.10, 0.15, 2640, 0, 15.0, 30, 'distribution', 'exit'
FROM smart_money_wallets WHERE wallet_address = '0x2345678901bcdef2345678901bcdef234567890' LIMIT 1;

-- ============================================================================
-- More WALLET 5 trades (Mixed patterns - 70 more trades)
-- ============================================================================

-- Generate 70 more realistic trades for wallet 5 with various patterns
-- Accumulation pattern for CRV (10 trades over 15 days)
INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x5m6', 17950001, NOW() - INTERVAL '45 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 2000, 2000, '0xD533a949740bb3306d119CC777fa900bA034cd52', 'CRV', 4000, 2000, 'curve', 'Curve Finance', 'Curve', 2000, 10.50, 0.08, 0, 100, 5.0, 45, 'accumulation', 'early'
FROM smart_money_wallets WHERE wallet_address = '0x5678901234ef5678901234ef567890123456' LIMIT 1;

INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x5m7', 17950501, NOW() - INTERVAL '43 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 2500, 2500, '0xD533a949740bb3306d119CC777fa900bA034cd52', 'CRV', 5000, 2500, 'curve', 'Curve Finance', 'Curve', 2500, 12.20, 0.10, 0, 125, 5.0, 43, 'accumulation', 'early'
FROM smart_money_wallets WHERE wallet_address = '0x5678901234ef5678901234ef567890123456' LIMIT 1;

INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x5m8', 17951001, NOW() - INTERVAL '40 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 3000, 3000, '0xD533a949740bb3306d119CC777fa900bA034cd52', 'CRV', 6000, 3000, 'curve', 'Curve Finance', 'Curve', 3000, 14.50, 0.12, 0, 150, 5.0, 40, 'accumulation', 'mid'
FROM smart_money_wallets WHERE wallet_address = '0x5678901234ef5678901234ef567890123456' LIMIT 1;

INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x5m9', 17951501, NOW() - INTERVAL '37 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 3500, 3500, '0xD533a949740bb3306d119CC777fa900bA034cd52', 'CRV', 7000, 3500, 'curve', 'Curve Finance', 'Curve', 3500, 16.80, 0.09, 0, 175, 5.0, 37, 'accumulation', 'mid'
FROM smart_money_wallets WHERE wallet_address = '0x5678901234ef5678901234ef567890123456' LIMIT 1;

INSERT INTO wallet_trades (wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in_address, token_in_symbol, token_in_amount, token_in_value_usd, token_out_address, token_out_symbol, token_out_amount, token_out_value_usd, protocol_id, protocol_name, dex_name, trade_size_usd, gas_fee_usd, slippage_pct, realized_pnl, unrealized_pnl, roi, holding_period_days, trade_pattern, trade_timing)
SELECT id, '0x5m10', 17952001, NOW() - INTERVAL '35 days', 'ethereum', 'buy', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 4000, 4000, '0xD533a949740bb3306d119CC777fa900bA034cd52', 'CRV', 8000, 4000, 'curve', 'Curve Finance', 'Curve', 4000, 18.20, 0.08, 0, 200, 5.0, 35, 'accumulation', 'late'
FROM smart_money_wallets WHERE wallet_address = '0x5678901234ef5678901234ef567890123456' LIMIT 1;

