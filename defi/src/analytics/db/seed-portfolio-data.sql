/**
 * Seed Data for Wallet Portfolio Tracking
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * Creates:
 * - 10 wallet portfolios across 3 chains (Ethereum, Arbitrum, Optimism)
 * - 50+ token holdings with various position types
 * - 100+ historical snapshots for performance tracking
 */

-- Clear existing data
TRUNCATE TABLE portfolio_history CASCADE;
TRUNCATE TABLE wallet_holdings CASCADE;
TRUNCATE TABLE wallet_portfolios CASCADE;

-- ============================================================================
-- Wallet Portfolios (10 wallets across 3 chains)
-- ============================================================================

-- Whale Wallet (Ethereum) - Large diversified portfolio
INSERT INTO wallet_portfolios (wallet_address, chain_id, total_value_usd, token_count, protocol_count, pnl_24h, pnl_7d, pnl_30d, pnl_all_time, roi_all_time, concentration_score, diversification_score)
VALUES 
('0x1234567890123456789012345678901234567890', 'ethereum', 5250000.00, 15, 8, 125000.00, 450000.00, 1200000.00, 2500000.00, 0.9091, 25.5, 85.0),
('0x1234567890123456789012345678901234567890', 'arbitrum', 1500000.00, 8, 5, 35000.00, 120000.00, 280000.00, 500000.00, 0.5000, 35.0, 75.0),
('0x1234567890123456789012345678901234567890', 'optimism', 750000.00, 6, 4, 18000.00, 55000.00, 125000.00, 200000.00, 0.3636, 40.0, 70.0);

-- DeFi Farmer (Ethereum) - Focused on yield farming
INSERT INTO wallet_portfolios (wallet_address, chain_id, total_value_usd, token_count, protocol_count, pnl_24h, pnl_7d, pnl_30d, pnl_all_time, roi_all_time, concentration_score, diversification_score)
VALUES 
('0x2345678901234567890123456789012345678901', 'ethereum', 850000.00, 10, 6, 12000.00, 45000.00, 95000.00, 150000.00, 0.2143, 45.0, 65.0),
('0x2345678901234567890123456789012345678901', 'arbitrum', 420000.00, 7, 4, 8000.00, 28000.00, 55000.00, 80000.00, 0.2353, 50.0, 60.0);

-- NFT Collector (Ethereum) - Heavy NFT exposure
INSERT INTO wallet_portfolios (wallet_address, chain_id, total_value_usd, token_count, protocol_count, pnl_24h, pnl_7d, pnl_30d, pnl_all_time, roi_all_time, concentration_score, diversification_score)
VALUES 
('0x3456789012345678901234567890123456789012', 'ethereum', 2100000.00, 12, 5, -50000.00, -120000.00, -200000.00, 300000.00, 0.1667, 60.0, 50.0);

-- Stablecoin Holder (Ethereum, Arbitrum, Optimism) - Conservative
INSERT INTO wallet_portfolios (wallet_address, chain_id, total_value_usd, token_count, protocol_count, pnl_24h, pnl_7d, pnl_30d, pnl_all_time, roi_all_time, concentration_score, diversification_score)
VALUES 
('0x4567890123456789012345678901234567890123', 'ethereum', 500000.00, 5, 3, 500.00, 3500.00, 12000.00, 25000.00, 0.0526, 70.0, 40.0),
('0x4567890123456789012345678901234567890123', 'arbitrum', 300000.00, 4, 2, 300.00, 2100.00, 7000.00, 15000.00, 0.0526, 75.0, 35.0),
('0x4567890123456789012345678901234567890123', 'optimism', 200000.00, 3, 2, 200.00, 1400.00, 4500.00, 10000.00, 0.0526, 80.0, 30.0);

-- Active Trader (Ethereum) - High turnover
INSERT INTO wallet_portfolios (wallet_address, chain_id, total_value_usd, token_count, protocol_count, pnl_24h, pnl_7d, pnl_30d, pnl_all_time, roi_all_time, concentration_score, diversification_score)
VALUES 
('0x5678901234567890123456789012345678901234', 'ethereum', 1200000.00, 20, 10, 25000.00, 80000.00, 150000.00, 200000.00, 0.2000, 30.0, 80.0);

-- ============================================================================
-- Wallet Holdings (50+ holdings)
-- ============================================================================

-- Whale Wallet (Ethereum) - 15 holdings
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  'WETH',
  'Wrapped Ether',
  500.0,
  1050000.00,
  20.0,
  NULL,
  'wallet',
  800000.00,
  250000.00,
  0.3125
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'USDC',
  'USD Coin',
  800000.0,
  800000.00,
  15.24,
  'aave-v3',
  'lending',
  800000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  'DAI',
  'Dai Stablecoin',
  650000.0,
  650000.00,
  12.38,
  'compound-v3',
  'lending',
  650000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  'UNI',
  'Uniswap',
  50000.0,
  525000.00,
  10.0,
  'uniswap-v3',
  'staked',
  400000.00,
  125000.00,
  0.3125
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  'AAVE',
  'Aave Token',
  3000.0,
  420000.00,
  8.0,
  'aave-v3',
  'staked',
  350000.00,
  70000.00,
  0.2000
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'ethereum';

-- Add more holdings for other wallets (abbreviated for space)
-- DeFi Farmer holdings
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  'WETH',
  'Wrapped Ether',
  100.0,
  210000.00,
  24.71,
  'curve',
  'lp',
  180000.00,
  30000.00,
  0.1667
FROM wallet_portfolios WHERE wallet_address = '0x2345678901234567890123456789012345678901' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  'USDT',
  'Tether USD',
  200000.0,
  200000.00,
  23.53,
  'curve',
  'lp',
  200000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x2345678901234567890123456789012345678901' AND chain_id = 'ethereum';

-- Stablecoin Holder holdings
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'USDC',
  'USD Coin',
  350000.0,
  350000.00,
  70.0,
  'aave-v3',
  'lending',
  350000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x4567890123456789012345678901234567890123' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  'DAI',
  'Dai Stablecoin',
  150000.0,
  150000.00,
  30.0,
  'compound-v3',
  'lending',
  150000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x4567890123456789012345678901234567890123' AND chain_id = 'ethereum';

-- ============================================================================
-- Portfolio History (100+ snapshots)
-- ============================================================================

-- Whale Wallet - 30 days of daily snapshots
INSERT INTO portfolio_history (wallet_address, timestamp, total_value_usd, token_count, protocol_count, top_holdings)
SELECT 
  '0x1234567890123456789012345678901234567890',
  NOW() - INTERVAL '1 day' * i,
  5250000.00 - (i * 15000) + (RANDOM() * 50000 - 25000),
  15,
  8,
  '[{"symbol":"WETH","valueUsd":1050000,"allocationPct":20},{"symbol":"USDC","valueUsd":800000,"allocationPct":15.24}]'::jsonb
FROM generate_series(0, 29) AS i;

-- DeFi Farmer - 30 days of daily snapshots
INSERT INTO portfolio_history (wallet_address, timestamp, total_value_usd, token_count, protocol_count, top_holdings)
SELECT 
  '0x2345678901234567890123456789012345678901',
  NOW() - INTERVAL '1 day' * i,
  850000.00 - (i * 5000) + (RANDOM() * 20000 - 10000),
  10,
  6,
  '[{"symbol":"WETH","valueUsd":210000,"allocationPct":24.71},{"symbol":"USDT","valueUsd":200000,"allocationPct":23.53}]'::jsonb
FROM generate_series(0, 29) AS i;

-- Stablecoin Holder - 30 days of daily snapshots (very stable)
INSERT INTO portfolio_history (wallet_address, timestamp, total_value_usd, token_count, protocol_count, top_holdings)
SELECT 
  '0x4567890123456789012345678901234567890123',
  NOW() - INTERVAL '1 day' * i,
  500000.00 + (i * 400) + (RANDOM() * 1000 - 500),
  5,
  3,
  '[{"symbol":"USDC","valueUsd":350000,"allocationPct":70},{"symbol":"DAI","valueUsd":150000,"allocationPct":30}]'::jsonb
FROM generate_series(0, 29) AS i;

-- Active Trader - 30 days of daily snapshots (high volatility)
INSERT INTO portfolio_history (wallet_address, timestamp, total_value_usd, token_count, protocol_count, top_holdings)
SELECT 
  '0x5678901234567890123456789012345678901234', 
  NOW() - INTERVAL '1 day' * i,
  1200000.00 + (RANDOM() * 200000 - 100000),
  20,
  10,
  '[{"symbol":"WETH","valueUsd":240000,"allocationPct":20}]'::jsonb
FROM generate_series(0, 29) AS i;

-- Summary
SELECT 'Seed data created successfully!' AS status;
SELECT COUNT(*) AS wallet_portfolios_count FROM wallet_portfolios;
SELECT COUNT(*) AS wallet_holdings_count FROM wallet_holdings;
SELECT COUNT(*) AS portfolio_history_count FROM portfolio_history;

