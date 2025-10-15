-- Seed Data: Cross-chain Assets
-- Story: 2.2.3 - Cross-chain Portfolio Aggregation
-- Description: Detailed asset holdings across chains for test users

-- Clean existing data (cascades from portfolios)
-- DELETE FROM cross_chain_assets; -- Already handled by portfolio deletion

-- ============================================================================
-- User 1: user-cross-chain-001 (Total: $100,000)
-- ============================================================================

-- Ethereum Chain ($50,000)
-- ETH: $18,000
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'ethereum', '0xCrossChain001', NULL, 'ETH', 'Ethereum', 10.0, 18000.00, 1800.00, 'native', TRUE, FALSE, FALSE, 15000.00, 3000.00, 0.20);

-- USDC: $15,000 (bridged token)
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'ethereum', '0xCrossChain001', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 'USD Coin', 15000.0, 15000.00, 1.00, 'stablecoin', FALSE, FALSE, TRUE, 15000.00, 0.00, 0.00);

-- UNI: $12,000
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'ethereum', '0xCrossChain001', '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 'UNI', 'Uniswap', 2000.0, 12000.00, 6.00, 'defi', FALSE, FALSE, FALSE, 10000.00, 2000.00, 0.20);

-- WBTC: $10,000 (wrapped token)
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'ethereum', '0xCrossChain001', '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 'WBTC', 'Wrapped Bitcoin', 0.25, 10000.00, 40000.00, 'other', FALSE, TRUE, FALSE, 9000.00, 1000.00, 0.111);

-- Polygon Chain ($20,000)
-- MATIC: $8,000
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'polygon', '0xCrossChain002', NULL, 'MATIC', 'Polygon', 10000.0, 8000.00, 0.80, 'native', TRUE, FALSE, FALSE, 6000.00, 2000.00, 0.333);

-- USDC: $10,000 (bridged token)
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'polygon', '0xCrossChain002', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'USDC', 'USD Coin', 10000.0, 10000.00, 1.00, 'stablecoin', FALSE, FALSE, TRUE, 10000.00, 0.00, 0.00);

-- AAVE: $10,000
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'polygon', '0xCrossChain002', '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', 'AAVE', 'Aave', 100.0, 10000.00, 100.00, 'defi', FALSE, FALSE, FALSE, 8000.00, 2000.00, 0.25);

-- Arbitrum Chain ($20,000)
-- ETH: $12,000 (bridged)
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'arbitrum', '0xCrossChain003', NULL, 'ETH', 'Ethereum', 6.666, 12000.00, 1800.00, 'native', TRUE, FALSE, TRUE, 10000.00, 2000.00, 0.20);

-- ARB: $5,000
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'arbitrum', '0xCrossChain003', '0x912CE59144191C1204E64559FE8253a0e49E6548', 'ARB', 'Arbitrum', 5000.0, 5000.00, 1.00, 'native', FALSE, FALSE, FALSE, 4000.00, 1000.00, 0.25);

-- GMX: $5,000
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'arbitrum', '0xCrossChain003', '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', 'GMX', 'GMX', 100.0, 5000.00, 50.00, 'defi', FALSE, FALSE, FALSE, 4000.00, 1000.00, 0.25);

-- BSC Chain ($10,000)
-- BNB: $4,000
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'bsc', '0xCrossChain004', NULL, 'BNB', 'BNB', 16.0, 4000.00, 250.00, 'native', TRUE, FALSE, FALSE, 3000.00, 1000.00, 0.333);

-- BUSD: $5,000 (stablecoin)
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'bsc', '0xCrossChain004', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 'BUSD', 'Binance USD', 5000.0, 5000.00, 1.00, 'stablecoin', FALSE, FALSE, FALSE, 5000.00, 0.00, 0.00);

-- CAKE: $3,000
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('11111111-1111-1111-1111-111111111111', 'bsc', '0xCrossChain004', '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', 'CAKE', 'PancakeSwap', 1000.0, 3000.00, 3.00, 'defi', FALSE, FALSE, FALSE, 2500.00, 500.00, 0.20);

-- ============================================================================
-- User 2: user-cross-chain-002 (Total: $25,000)
-- ============================================================================

-- Ethereum Chain ($18,000)
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('22222222-2222-2222-2222-222222222222', 'ethereum', '0xCrossChain005', NULL, 'ETH', 'Ethereum', 5.555, 10000.00, 1800.00, 'native', TRUE, FALSE, FALSE, 9000.00, 1000.00, 0.111);

INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('22222222-2222-2222-2222-222222222222', 'ethereum', '0xCrossChain005', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 'USD Coin', 8000.0, 8000.00, 1.00, 'stablecoin', FALSE, FALSE, TRUE, 8000.00, 0.00, 0.00);

-- Polygon Chain ($7,000)
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('22222222-2222-2222-2222-222222222222', 'polygon', '0xCrossChain006', NULL, 'MATIC', 'Polygon', 5000.0, 4000.00, 0.80, 'native', TRUE, FALSE, FALSE, 3500.00, 500.00, 0.143);

INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('22222222-2222-2222-2222-222222222222', 'polygon', '0xCrossChain006', '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', 'AAVE', 'Aave', 30.0, 3000.00, 100.00, 'defi', FALSE, FALSE, FALSE, 2500.00, 500.00, 0.20);

-- ============================================================================
-- User 3: user-cross-chain-003 (Total: $50,000, single chain)
-- ============================================================================

-- Ethereum Chain only ($50,000)
INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('33333333-3333-3333-3333-333333333333', 'ethereum', '0xCrossChain007', NULL, 'ETH', 'Ethereum', 16.666, 30000.00, 1800.00, 'native', TRUE, FALSE, FALSE, 24000.00, 6000.00, 0.25);

INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('33333333-3333-3333-3333-333333333333', 'ethereum', '0xCrossChain007', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'USDC', 'USD Coin', 15000.0, 15000.00, 1.00, 'stablecoin', FALSE, FALSE, TRUE, 15000.00, 0.00, 0.00);

INSERT INTO cross_chain_assets (portfolio_id, chain_id, wallet_address, token_address, token_symbol, token_name, balance, balance_usd, price_usd, category, is_native, is_wrapped, is_bridged, cost_basis_usd, unrealized_pnl, roi)
VALUES ('33333333-3333-3333-3333-333333333333', 'ethereum', '0xCrossChain007', '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 'UNI', 'Uniswap', 833.333, 5000.00, 6.00, 'defi', FALSE, FALSE, FALSE, 4000.00, 1000.00, 0.25);

