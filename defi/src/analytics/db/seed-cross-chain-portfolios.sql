-- Seed Data: Cross-chain Portfolios
-- Story: 2.2.3 - Cross-chain Portfolio Aggregation
-- Description: Test data for multi-chain portfolio aggregation

-- Clean existing data
DELETE FROM cross_chain_assets;
DELETE FROM cross_chain_portfolios;

-- Insert cross-chain portfolio for test user
-- User: user-cross-chain-001
-- Total Value: $100,000 USD
-- Chains: Ethereum (50%), Polygon (20%), Arbitrum (20%), BSC (10%)
-- Categories: DeFi (40%), Stablecoins (30%), Native (20%), Other (10%)

INSERT INTO cross_chain_portfolios (
  id,
  user_id,
  wallet_addresses,
  total_net_worth_usd,
  net_worth_change_24h,
  net_worth_change_7d,
  net_worth_change_30d,
  total_assets,
  total_chains,
  total_wallets,
  asset_breakdown,
  chain_breakdown,
  category_breakdown,
  total_pnl_usd,
  total_roi,
  last_updated,
  created_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'user-cross-chain-001',
  '{
    "ethereum": ["0xCrossChain001"],
    "polygon": ["0xCrossChain002"],
    "arbitrum": ["0xCrossChain003"],
    "bsc": ["0xCrossChain004"]
  }'::jsonb,
  100000.00,
  2.5,
  8.3,
  15.7,
  16,
  4,
  4,
  '{
    "ETH": 18000.00,
    "USDC": 25000.00,
    "UNI": 12000.00,
    "WBTC": 10000.00,
    "MATIC": 8000.00,
    "AAVE": 10000.00,
    "ARB": 5000.00,
    "GMX": 5000.00,
    "BNB": 4000.00,
    "CAKE": 3000.00
  }'::jsonb,
  '{
    "ethereum": 50000.00,
    "polygon": 20000.00,
    "arbitrum": 20000.00,
    "bsc": 10000.00
  }'::jsonb,
  '{
    "defi": 40000.00,
    "stablecoins": 30000.00,
    "native": 20000.00,
    "other": 10000.00
  }'::jsonb,
  15000.00,
  0.176,
  NOW() - INTERVAL '5 minutes',
  NOW() - INTERVAL '30 days'
);

-- Insert second test user with smaller portfolio
INSERT INTO cross_chain_portfolios (
  id,
  user_id,
  wallet_addresses,
  total_net_worth_usd,
  net_worth_change_24h,
  net_worth_change_7d,
  net_worth_change_30d,
  total_assets,
  total_chains,
  total_wallets,
  asset_breakdown,
  chain_breakdown,
  category_breakdown,
  total_pnl_usd,
  total_roi,
  last_updated,
  created_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'user-cross-chain-002',
  '{
    "ethereum": ["0xCrossChain005"],
    "polygon": ["0xCrossChain006"]
  }'::jsonb,
  25000.00,
  -1.2,
  3.5,
  7.8,
  8,
  2,
  2,
  '{
    "ETH": 10000.00,
    "USDC": 8000.00,
    "MATIC": 4000.00,
    "AAVE": 3000.00
  }'::jsonb,
  '{
    "ethereum": 18000.00,
    "polygon": 7000.00
  }'::jsonb,
  '{
    "native": 14000.00,
    "stablecoins": 8000.00,
    "defi": 3000.00
  }'::jsonb,
  2000.00,
  0.087,
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '15 days'
);

-- Insert third test user with single chain
INSERT INTO cross_chain_portfolios (
  id,
  user_id,
  wallet_addresses,
  total_net_worth_usd,
  net_worth_change_24h,
  net_worth_change_7d,
  net_worth_change_30d,
  total_assets,
  total_chains,
  total_wallets,
  asset_breakdown,
  chain_breakdown,
  category_breakdown,
  total_pnl_usd,
  total_roi,
  last_updated,
  created_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'user-cross-chain-003',
  '{
    "ethereum": ["0xCrossChain007"]
  }'::jsonb,
  50000.00,
  5.2,
  12.8,
  25.3,
  5,
  1,
  1,
  '{
    "ETH": 30000.00,
    "USDC": 15000.00,
    "UNI": 5000.00
  }'::jsonb,
  '{
    "ethereum": 50000.00
  }'::jsonb,
  '{
    "native": 30000.00,
    "stablecoins": 15000.00,
    "defi": 5000.00
  }'::jsonb,
  10000.00,
  0.25,
  NOW() - INTERVAL '2 minutes',
  NOW() - INTERVAL '60 days'
);

