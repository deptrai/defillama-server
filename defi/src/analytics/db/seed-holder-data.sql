-- Seed Data: Token Holders
-- Story: 2.2.2 - Holder Distribution Analysis
-- Description: Comprehensive seed data with various holder types and distribution patterns

-- Token 1: USDC (Ethereum) - Widely distributed stablecoin
-- Total Supply: 1,000,000,000 USDC

-- Whales (>1% supply) - 3 holders
INSERT INTO token_holders (token_address, chain_id, wallet_address, balance, balance_usd, supply_percentage, holder_type, is_contract, is_exchange, first_seen, last_active, holding_period_days, transaction_count) VALUES
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x0A59649758aa4d66E25f08Dd01271e891fe52199', 50000000.00, 50000000.00, 5.000000, 'whale', FALSE, TRUE, NOW() - INTERVAL '365 days', NOW() - INTERVAL '1 day', 365, 1250),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', 30000000.00, 30000000.00, 3.000000, 'whale', FALSE, TRUE, NOW() - INTERVAL '300 days', NOW() - INTERVAL '2 days', 300, 980),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x5754284f345afc66a98fbB0a0Afe71e0F007B949', 15000000.00, 15000000.00, 1.500000, 'whale', FALSE, FALSE, NOW() - INTERVAL '200 days', NOW() - INTERVAL '5 days', 200, 450);

-- Large holders (0.1-1% supply) - 5 holders
INSERT INTO token_holders (token_address, chain_id, wallet_address, balance, balance_usd, supply_percentage, holder_type, is_contract, is_exchange, first_seen, last_active, holding_period_days, transaction_count) VALUES
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x8EB8a3b98659Cce290402893d0123abb75E3ab28', 8000000.00, 8000000.00, 0.800000, 'large', FALSE, FALSE, NOW() - INTERVAL '180 days', NOW() - INTERVAL '3 days', 180, 320),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 5000000.00, 5000000.00, 0.500000, 'large', FALSE, FALSE, NOW() - INTERVAL '150 days', NOW() - INTERVAL '1 day', 150, 280),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296', 3000000.00, 3000000.00, 0.300000, 'large', TRUE, FALSE, NOW() - INTERVAL '120 days', NOW() - INTERVAL '2 days', 120, 150),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x6B175474E89094C44Da98b954EedeAC495271d0F', 2000000.00, 2000000.00, 0.200000, 'large', TRUE, FALSE, NOW() - INTERVAL '90 days', NOW() - INTERVAL '4 days', 90, 120),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 1500000.00, 1500000.00, 0.150000, 'large', TRUE, FALSE, NOW() - INTERVAL '60 days', NOW() - INTERVAL '1 day', 60, 95);

-- Medium holders (0.01-0.1% supply) - 10 holders
INSERT INTO token_holders (token_address, chain_id, wallet_address, balance, balance_usd, supply_percentage, holder_type, is_contract, is_exchange, first_seen, last_active, holding_period_days, transaction_count) VALUES
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x1111111254fb6c44bAC0beD2854e76F90643097d', 800000.00, 800000.00, 0.080000, 'medium', FALSE, FALSE, NOW() - INTERVAL '50 days', NOW() - INTERVAL '1 day', 50, 75),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x2222222254fb6c44bAC0beD2854e76F90643097d', 500000.00, 500000.00, 0.050000, 'medium', FALSE, FALSE, NOW() - INTERVAL '45 days', NOW() - INTERVAL '2 days', 45, 60),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x3333333254fb6c44bAC0beD2854e76F90643097d', 300000.00, 300000.00, 0.030000, 'medium', FALSE, FALSE, NOW() - INTERVAL '40 days', NOW() - INTERVAL '3 days', 40, 50),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x4444444254fb6c44bAC0beD2854e76F90643097d', 200000.00, 200000.00, 0.020000, 'medium', FALSE, FALSE, NOW() - INTERVAL '35 days', NOW() - INTERVAL '1 day', 35, 45),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x5555555254fb6c44bAC0beD2854e76F90643097d', 150000.00, 150000.00, 0.015000, 'medium', FALSE, FALSE, NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days', 30, 40),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x6666666254fb6c44bAC0beD2854e76F90643097d', 120000.00, 120000.00, 0.012000, 'medium', FALSE, FALSE, NOW() - INTERVAL '25 days', NOW() - INTERVAL '1 day', 25, 35),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x7777777254fb6c44bAC0beD2854e76F90643097d', 110000.00, 110000.00, 0.011000, 'medium', FALSE, FALSE, NOW() - INTERVAL '20 days', NOW() - INTERVAL '3 days', 20, 30),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x8888888254fb6c44bAC0beD2854e76F90643097d', 105000.00, 105000.00, 0.010500, 'medium', FALSE, FALSE, NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days', 15, 25),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x9999999254fb6c44bAC0beD2854e76F90643097d', 102000.00, 102000.00, 0.010200, 'medium', FALSE, FALSE, NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day', 10, 20),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xAAAAAAAA54fb6c44bAC0beD2854e76F90643097d', 100500.00, 100500.00, 0.010050, 'medium', FALSE, FALSE, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day', 7, 15);

-- Small holders (0.001-0.01% supply) - 15 holders
INSERT INTO token_holders (token_address, chain_id, wallet_address, balance, balance_usd, supply_percentage, holder_type, is_contract, is_exchange, first_seen, last_active, holding_period_days, transaction_count) VALUES
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xBBBBBBBB54fb6c44bAC0beD2854e76F90643097d', 80000.00, 80000.00, 0.008000, 'small', FALSE, FALSE, NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day', 30, 12),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xCCCCCCCC54fb6c44bAC0beD2854e76F90643097d', 50000.00, 50000.00, 0.005000, 'small', FALSE, FALSE, NOW() - INTERVAL '25 days', NOW() - INTERVAL '2 days', 25, 10),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xDDDDDDDD54fb6c44bAC0beD2854e76F90643097d', 30000.00, 30000.00, 0.003000, 'small', FALSE, FALSE, NOW() - INTERVAL '20 days', NOW() - INTERVAL '3 days', 20, 8),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xEEEEEEEE54fb6c44bAC0beD2854e76F90643097d', 20000.00, 20000.00, 0.002000, 'small', FALSE, FALSE, NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day', 15, 7),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xFFFFFFFF54fb6c44bAC0beD2854e76F90643097d', 15000.00, 15000.00, 0.001500, 'small', FALSE, FALSE, NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days', 10, 6),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x11111111254fb6c44bAC0beD2854e76F90643098', 12000.00, 12000.00, 0.001200, 'small', FALSE, FALSE, NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day', 8, 5),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x22222222254fb6c44bAC0beD2854e76F90643098', 11000.00, 11000.00, 0.001100, 'small', FALSE, FALSE, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day', 7, 5),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x33333333254fb6c44bAC0beD2854e76F90643098', 10500.00, 10500.00, 0.001050, 'small', FALSE, FALSE, NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days', 6, 4),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x44444444254fb6c44bAC0beD2854e76F90643098', 10200.00, 10200.00, 0.001020, 'small', FALSE, FALSE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', 5, 4),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x55555555254fb6c44bAC0beD2854e76F90643098', 10100.00, 10100.00, 0.001010, 'small', FALSE, FALSE, NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day', 4, 3),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x66666666254fb6c44bAC0beD2854e76F90643098', 10050.00, 10050.00, 0.001005, 'small', FALSE, FALSE, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', 3, 3),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x77777777254fb6c44bAC0beD2854e76F90643098', 10020.00, 10020.00, 0.001002, 'small', FALSE, FALSE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 2, 2),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x88888888254fb6c44bAC0beD2854e76F90643098', 10010.00, 10010.00, 0.001001, 'small', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 2),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x99999999254fb6c44bAC0beD2854e76F90643098', 10005.00, 10005.00, 0.001000, 'small', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xAAAAAAAA254fb6c44bAC0beD2854e76F90643098', 10002.00, 10002.00, 0.001000, 'small', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1);

-- Dust holders (<0.001% supply) - 20 holders
INSERT INTO token_holders (token_address, chain_id, wallet_address, balance, balance_usd, supply_percentage, holder_type, is_contract, is_exchange, first_seen, last_active, holding_period_days, transaction_count) VALUES
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xBBBBBBBB254fb6c44bAC0beD2854e76F90643098', 5000.00, 5000.00, 0.000500, 'dust', FALSE, FALSE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days', 5, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xCCCCCCCC254fb6c44bAC0beD2854e76F90643098', 3000.00, 3000.00, 0.000300, 'dust', FALSE, FALSE, NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day', 4, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xDDDDDDDD254fb6c44bAC0beD2854e76F90643098', 2000.00, 2000.00, 0.000200, 'dust', FALSE, FALSE, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', 3, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xEEEEEEEE254fb6c44bAC0beD2854e76F90643098', 1500.00, 1500.00, 0.000150, 'dust', FALSE, FALSE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 2, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xFFFFFFFF254fb6c44bAC0beD2854e76F90643098', 1000.00, 1000.00, 0.000100, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x11111111354fb6c44bAC0beD2854e76F90643098', 800.00, 800.00, 0.000080, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x22222222354fb6c44bAC0beD2854e76F90643098', 600.00, 600.00, 0.000060, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x33333333354fb6c44bAC0beD2854e76F90643098', 500.00, 500.00, 0.000050, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x44444444354fb6c44bAC0beD2854e76F90643098', 400.00, 400.00, 0.000040, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x55555555354fb6c44bAC0beD2854e76F90643098', 300.00, 300.00, 0.000030, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x66666666354fb6c44bAC0beD2854e76F90643098', 250.00, 250.00, 0.000025, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x77777777354fb6c44bAC0beD2854e76F90643098', 200.00, 200.00, 0.000020, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x88888888354fb6c44bAC0beD2854e76F90643098', 150.00, 150.00, 0.000015, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0x99999999354fb6c44bAC0beD2854e76F90643098', 120.00, 120.00, 0.000012, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xAAAAAAAA354fb6c44bAC0beD2854e76F90643098', 100.00, 100.00, 0.000010, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xBBBBBBBB354fb6c44bAC0beD2854e76F90643098', 80.00, 80.00, 0.000008, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xCCCCCCCC354fb6c44bAC0beD2854e76F90643098', 60.00, 60.00, 0.000006, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xDDDDDDDD354fb6c44bAC0beD2854e76F90643098', 50.00, 50.00, 0.000005, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xEEEEEEEE354fb6c44bAC0beD2854e76F90643098', 40.00, 40.00, 0.000004, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1),
('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ethereum', '0xFFFFFFFF354fb6c44bAC0beD2854e76F90643098', 30.00, 30.00, 0.000003, 'dust', FALSE, FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 1, 1);

-- Total: 53 holders for USDC
-- Whales: 3 (9.5% supply)
-- Large: 5 (1.95% supply)
-- Medium: 10 (0.3085% supply)
-- Small: 15 (0.0304% supply)
-- Dust: 20 (0.0014% supply)
-- Total accounted: ~11.79% supply (rest distributed among other holders not in seed data)

