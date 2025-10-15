/**
 * Additional Wallet Holdings Seed Data
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * Adds more holdings to reach ~50 total holdings
 */

-- Whale Wallet (Ethereum) - Add 10 more holdings (total 15)
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  'LINK',
  'Chainlink',
  25000.0,
  367500.00,
  7.0,
  NULL,
  'wallet',
  300000.00,
  67500.00,
  0.225
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  'WBTC',
  'Wrapped Bitcoin',
  8.0,
  315000.00,
  6.0,
  NULL,
  'wallet',
  280000.00,
  35000.00,
  0.125
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
  'SNX',
  'Synthetix',
  80000.0,
  262500.00,
  5.0,
  'synthetix',
  'staked',
  250000.00,
  12500.00,
  0.05
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
  'MKR',
  'Maker',
  150.0,
  210000.00,
  4.0,
  'makerdao',
  'wallet',
  200000.00,
  10000.00,
  0.05
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xD533a949740bb3306d119CC777fa900bA034cd52',
  'CRV',
  'Curve DAO Token',
  200000.0,
  157500.00,
  3.0,
  'curve',
  'staked',
  150000.00,
  7500.00,
  0.05
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'ethereum';

-- Whale Wallet (Arbitrum) - Add 5 more holdings (total 8)
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  'WETH',
  'Wrapped Ether',
  150.0,
  315000.00,
  21.0,
  NULL,
  'wallet',
  270000.00,
  45000.00,
  0.1667
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'arbitrum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  'USDC',
  'USD Coin',
  450000.0,
  450000.00,
  30.0,
  'aave-v3',
  'lending',
  450000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'arbitrum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x912CE59144191C1204E64559FE8253a0e49E6548',
  'ARB',
  'Arbitrum',
  300000.0,
  300000.00,
  20.0,
  NULL,
  'wallet',
  250000.00,
  50000.00,
  0.2000
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'arbitrum';

-- DeFi Farmer (Ethereum) - Add 7 more holdings (total 10)
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'USDC',
  'USD Coin',
  170000.0,
  170000.00,
  20.0,
  'curve',
  'lp',
  170000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x2345678901234567890123456789012345678901' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  'DAI',
  'Dai Stablecoin',
  127500.0,
  127500.00,
  15.0,
  'curve',
  'lp',
  127500.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x2345678901234567890123456789012345678901' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xD533a949740bb3306d119CC777fa900bA034cd52',
  'CRV',
  'Curve DAO Token',
  85000.0,
  68000.00,
  8.0,
  'curve',
  'staked',
  60000.00,
  8000.00,
  0.1333
FROM wallet_portfolios WHERE wallet_address = '0x2345678901234567890123456789012345678901' AND chain_id = 'ethereum';

-- NFT Collector (Ethereum) - Add 10 more holdings (total 12)
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  'WETH',
  'Wrapped Ether',
  400.0,
  840000.00,
  40.0,
  NULL,
  'wallet',
  720000.00,
  120000.00,
  0.1667
FROM wallet_portfolios WHERE wallet_address = '0x3456789012345678901234567890123456789012' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'USDC',
  'USD Coin',
  420000.0,
  420000.00,
  20.0,
  NULL,
  'wallet',
  420000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x3456789012345678901234567890123456789012' AND chain_id = 'ethereum';

-- Active Trader (Ethereum) - Add 18 more holdings (total 20)
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  'WETH',
  'Wrapped Ether',
  120.0,
  252000.00,
  21.0,
  NULL,
  'wallet',
  240000.00,
  12000.00,
  0.05
FROM wallet_portfolios WHERE wallet_address = '0x5678901234567890123456789012345678901234' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'USDC',
  'USD Coin',
  180000.0,
  180000.00,
  15.0,
  'aave-v3',
  'lending',
  180000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x5678901234567890123456789012345678901234' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  'UNI',
  'Uniswap',
  10000.0,
  120000.00,
  10.0,
  'uniswap-v3',
  'lp',
  110000.00,
  10000.00,
  0.0909
FROM wallet_portfolios WHERE wallet_address = '0x5678901234567890123456789012345678901234' AND chain_id = 'ethereum';

-- Summary
SELECT 'Additional holdings created successfully!' AS status;
SELECT COUNT(*) AS total_wallet_holdings FROM wallet_holdings;

