/**
 * Final Batch of Wallet Holdings Seed Data
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * Adds final batch to reach ~50 total holdings
 */

-- Whale Wallet (Optimism) - Add 4 more holdings (total 6)
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x4200000000000000000000000000000000000006',
  'WETH',
  'Wrapped Ether',
  180.0,
  378000.00,
  50.4,
  NULL,
  'wallet',
  324000.00,
  54000.00,
  0.1667
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'optimism';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
  'USDC',
  'USD Coin',
  225000.0,
  225000.00,
  30.0,
  'aave-v3',
  'lending',
  225000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'optimism';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x4200000000000000000000000000000000000042',
  'OP',
  'Optimism',
  60000.0,
  147000.00,
  19.6,
  NULL,
  'wallet',
  120000.00,
  27000.00,
  0.225
FROM wallet_portfolios WHERE wallet_address = '0x1234567890123456789012345678901234567890' AND chain_id = 'optimism';

-- DeFi Farmer (Arbitrum) - Add 5 more holdings (total 7)
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  'WETH',
  'Wrapped Ether',
  50.0,
  105000.00,
  25.0,
  'gmx',
  'lp',
  90000.00,
  15000.00,
  0.1667
FROM wallet_portfolios WHERE wallet_address = '0x2345678901234567890123456789012345678901' AND chain_id = 'arbitrum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  'USDC',
  'USD Coin',
  126000.0,
  126000.00,
  30.0,
  'gmx',
  'lp',
  126000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x2345678901234567890123456789012345678901' AND chain_id = 'arbitrum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
  'GMX',
  'GMX',
  1500.0,
  84000.00,
  20.0,
  'gmx',
  'staked',
  75000.00,
  9000.00,
  0.12
FROM wallet_portfolios WHERE wallet_address = '0x2345678901234567890123456789012345678901' AND chain_id = 'arbitrum';

-- Stablecoin Holder (Arbitrum) - Add 2 more holdings (total 4)
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  'USDC',
  'USD Coin',
  210000.0,
  210000.00,
  70.0,
  'aave-v3',
  'lending',
  210000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x4567890123456789012345678901234567890123' AND chain_id = 'arbitrum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  'DAI',
  'Dai Stablecoin',
  90000.0,
  90000.00,
  30.0,
  'compound-v3',
  'lending',
  90000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x4567890123456789012345678901234567890123' AND chain_id = 'arbitrum';

-- Stablecoin Holder (Optimism) - Add 1 more holding (total 3)
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
  'USDC',
  'USD Coin',
  140000.0,
  140000.00,
  70.0,
  'aave-v3',
  'lending',
  140000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x4567890123456789012345678901234567890123' AND chain_id = 'optimism';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  'DAI',
  'Dai Stablecoin',
  60000.0,
  60000.00,
  30.0,
  'compound-v3',
  'lending',
  60000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x4567890123456789012345678901234567890123' AND chain_id = 'optimism';

-- Active Trader - Add 15 more diverse holdings
INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  'AAVE',
  'Aave Token',
  600.0,
  84000.00,
  7.0,
  'aave-v3',
  'staked',
  80000.00,
  4000.00,
  0.05
FROM wallet_portfolios WHERE wallet_address = '0x5678901234567890123456789012345678901234' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  'LINK',
  'Chainlink',
  4000.0,
  60000.00,
  5.0,
  NULL,
  'wallet',
  56000.00,
  4000.00,
  0.0714
FROM wallet_portfolios WHERE wallet_address = '0x5678901234567890123456789012345678901234' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  'WBTC',
  'Wrapped Bitcoin',
  1.5,
  60000.00,
  5.0,
  NULL,
  'wallet',
  58000.00,
  2000.00,
  0.0345
FROM wallet_portfolios WHERE wallet_address = '0x5678901234567890123456789012345678901234' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
  'SNX',
  'Synthetix',
  15000.0,
  48000.00,
  4.0,
  'synthetix',
  'staked',
  45000.00,
  3000.00,
  0.0667
FROM wallet_portfolios WHERE wallet_address = '0x5678901234567890123456789012345678901234' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
  'MKR',
  'Maker',
  25.0,
  36000.00,
  3.0,
  'makerdao',
  'wallet',
  35000.00,
  1000.00,
  0.0286
FROM wallet_portfolios WHERE wallet_address = '0x5678901234567890123456789012345678901234' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xD533a949740bb3306d119CC777fa900bA034cd52',
  'CRV',
  'Curve DAO Token',
  40000.0,
  36000.00,
  3.0,
  'curve',
  'staked',
  34000.00,
  2000.00,
  0.0588
FROM wallet_portfolios WHERE wallet_address = '0x5678901234567890123456789012345678901234' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  'DAI',
  'Dai Stablecoin',
  36000.0,
  36000.00,
  3.0,
  'compound-v3',
  'lending',
  36000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x5678901234567890123456789012345678901234' AND chain_id = 'ethereum';

INSERT INTO wallet_holdings (portfolio_id, token_address, token_symbol, token_name, balance, value_usd, allocation_pct, protocol_id, position_type, cost_basis, unrealized_pnl, roi)
SELECT 
  id,
  '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  'USDT',
  'Tether USD',
  24000.0,
  24000.00,
  2.0,
  NULL,
  'wallet',
  24000.00,
  0.00,
  0.0000
FROM wallet_portfolios WHERE wallet_address = '0x5678901234567890123456789012345678901234' AND chain_id = 'ethereum';

-- Summary
SELECT 'Final batch of holdings created successfully!' AS status;
SELECT COUNT(*) AS total_wallet_holdings FROM wallet_holdings;
SELECT 
  wp.wallet_address,
  wp.chain_id,
  COUNT(wh.id) AS holdings_count
FROM wallet_portfolios wp
LEFT JOIN wallet_holdings wh ON wp.id = wh.portfolio_id
GROUP BY wp.wallet_address, wp.chain_id
ORDER BY wp.wallet_address, wp.chain_id;

