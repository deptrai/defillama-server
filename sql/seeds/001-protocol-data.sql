-- Seed Data for Protocol Data Tables
-- Purpose: Generate sample data for testing Advanced Query Processor

-- ============================================================================
-- Seed protocols (100 protocols)
-- ============================================================================
INSERT INTO protocols (id, name, category, chains, description, website, created_at) VALUES
('uniswap', 'Uniswap', 'DEX', ARRAY['ethereum', 'polygon', 'arbitrum'], 'Leading decentralized exchange', 'https://uniswap.org', NOW()),
('aave', 'Aave', 'Lending', ARRAY['ethereum', 'polygon', 'avalanche'], 'Decentralized lending protocol', 'https://aave.com', NOW()),
('curve', 'Curve Finance', 'DEX', ARRAY['ethereum', 'polygon', 'arbitrum'], 'Stablecoin-focused DEX', 'https://curve.fi', NOW()),
('makerdao', 'MakerDAO', 'Lending', ARRAY['ethereum'], 'Decentralized stablecoin protocol', 'https://makerdao.com', NOW()),
('compound', 'Compound', 'Lending', ARRAY['ethereum'], 'Algorithmic money market', 'https://compound.finance', NOW()),
('pancakeswap', 'PancakeSwap', 'DEX', ARRAY['bsc'], 'Leading BSC DEX', 'https://pancakeswap.finance', NOW()),
('sushiswap', 'SushiSwap', 'DEX', ARRAY['ethereum', 'polygon', 'arbitrum'], 'Community-driven DEX', 'https://sushi.com', NOW()),
('yearn', 'Yearn Finance', 'Yield', ARRAY['ethereum', 'fantom'], 'Yield aggregator', 'https://yearn.finance', NOW()),
('convex', 'Convex Finance', 'Yield', ARRAY['ethereum'], 'Curve yield optimizer', 'https://convexfinance.com', NOW()),
('lido', 'Lido', 'Staking', ARRAY['ethereum'], 'Liquid staking protocol', 'https://lido.fi', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Seed protocol_tvl (sample data for 10 protocols)
-- ============================================================================
INSERT INTO protocol_tvl (id, protocol_id, chain, tvl, tvl_prev_day, change_1d, timestamp) VALUES
(gen_random_uuid()::text, 'uniswap', 'ethereum', 3500000000, 3400000000, 2.94, NOW() - INTERVAL '0 days'),
(gen_random_uuid()::text, 'uniswap', 'polygon', 500000000, 480000000, 4.17, NOW() - INTERVAL '0 days'),
(gen_random_uuid()::text, 'uniswap', 'arbitrum', 300000000, 290000000, 3.45, NOW() - INTERVAL '0 days'),
(gen_random_uuid()::text, 'aave', 'ethereum', 5000000000, 4900000000, 2.04, NOW() - INTERVAL '0 days'),
(gen_random_uuid()::text, 'aave', 'polygon', 800000000, 780000000, 2.56, NOW() - INTERVAL '0 days'),
(gen_random_uuid()::text, 'curve', 'ethereum', 4200000000, 4100000000, 2.44, NOW() - INTERVAL '0 days'),
(gen_random_uuid()::text, 'makerdao', 'ethereum', 8000000000, 7900000000, 1.27, NOW() - INTERVAL '0 days'),
(gen_random_uuid()::text, 'compound', 'ethereum', 3000000000, 2950000000, 1.69, NOW() - INTERVAL '0 days'),
(gen_random_uuid()::text, 'pancakeswap', 'bsc', 2500000000, 2450000000, 2.04, NOW() - INTERVAL '0 days'),
(gen_random_uuid()::text, 'lido', 'ethereum', 15000000000, 14800000000, 1.35, NOW() - INTERVAL '0 days')
ON CONFLICT (id) DO NOTHING;

-- Add historical data (1 day ago)
INSERT INTO protocol_tvl (id, protocol_id, chain, tvl, tvl_prev_day, change_1d, timestamp) VALUES
(gen_random_uuid()::text, 'uniswap', 'ethereum', 3400000000, 3300000000, 3.03, NOW() - INTERVAL '1 day'),
(gen_random_uuid()::text, 'aave', 'ethereum', 4900000000, 4800000000, 2.08, NOW() - INTERVAL '1 day'),
(gen_random_uuid()::text, 'curve', 'ethereum', 4100000000, 4000000000, 2.50, NOW() - INTERVAL '1 day'),
(gen_random_uuid()::text, 'makerdao', 'ethereum', 7900000000, 7800000000, 1.28, NOW() - INTERVAL '1 day'),
(gen_random_uuid()::text, 'lido', 'ethereum', 14800000000, 14600000000, 1.37, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Seed token_prices (sample data for 10 tokens)
-- ============================================================================
INSERT INTO token_prices (id, token_id, token_symbol, token_name, price, price_prev_day, change_1d, volume_24h, market_cap, timestamp) VALUES
(gen_random_uuid()::text, 'ethereum', 'ETH', 'Ethereum', 2100.50, 2050.00, 2.46, 15000000000, 250000000000, NOW()),
(gen_random_uuid()::text, 'bitcoin', 'BTC', 'Bitcoin', 42000.00, 41000.00, 2.44, 25000000000, 800000000000, NOW()),
(gen_random_uuid()::text, 'binancecoin', 'BNB', 'BNB', 310.00, 305.00, 1.64, 1000000000, 50000000000, NOW()),
(gen_random_uuid()::text, 'usd-coin', 'USDC', 'USD Coin', 1.00, 1.00, 0.00, 5000000000, 25000000000, NOW()),
(gen_random_uuid()::text, 'tether', 'USDT', 'Tether', 1.00, 1.00, 0.00, 50000000000, 90000000000, NOW()),
(gen_random_uuid()::text, 'dai', 'DAI', 'Dai', 1.00, 1.00, 0.00, 500000000, 5000000000, NOW()),
(gen_random_uuid()::text, 'uniswap', 'UNI', 'Uniswap', 6.50, 6.30, 3.17, 200000000, 5000000000, NOW()),
(gen_random_uuid()::text, 'aave', 'AAVE', 'Aave', 95.00, 92.00, 3.26, 150000000, 1500000000, NOW()),
(gen_random_uuid()::text, 'curve-dao-token', 'CRV', 'Curve DAO Token', 0.85, 0.82, 3.66, 100000000, 500000000, NOW()),
(gen_random_uuid()::text, 'maker', 'MKR', 'Maker', 1500.00, 1480.00, 1.35, 50000000, 1500000000, NOW())
ON CONFLICT (id) DO NOTHING;

-- Add historical data (1 hour ago)
INSERT INTO token_prices (id, token_id, token_symbol, token_name, price, price_prev_day, change_1d, volume_24h, market_cap, timestamp) VALUES
(gen_random_uuid()::text, 'ethereum', 'ETH', 'Ethereum', 2080.00, 2050.00, 1.46, 14500000000, 248000000000, NOW() - INTERVAL '1 hour'),
(gen_random_uuid()::text, 'bitcoin', 'BTC', 'Bitcoin', 41500.00, 41000.00, 1.22, 24500000000, 795000000000, NOW() - INTERVAL '1 hour'),
(gen_random_uuid()::text, 'uniswap', 'UNI', 'Uniswap', 6.40, 6.30, 1.59, 195000000, 4900000000, NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Seed protocol_stats (aggregated statistics)
-- ============================================================================
INSERT INTO protocol_stats (id, protocol_id, total_tvl, total_chains, avg_tvl_per_chain, max_tvl, min_tvl, last_updated) VALUES
(gen_random_uuid()::text, 'uniswap', 4300000000, 3, 1433333333, 3500000000, 300000000, NOW()),
(gen_random_uuid()::text, 'aave', 5800000000, 2, 2900000000, 5000000000, 800000000, NOW()),
(gen_random_uuid()::text, 'curve', 4200000000, 1, 4200000000, 4200000000, 4200000000, NOW()),
(gen_random_uuid()::text, 'makerdao', 8000000000, 1, 8000000000, 8000000000, 8000000000, NOW()),
(gen_random_uuid()::text, 'compound', 3000000000, 1, 3000000000, 3000000000, 3000000000, NOW()),
(gen_random_uuid()::text, 'pancakeswap', 2500000000, 1, 2500000000, 2500000000, 2500000000, NOW()),
(gen_random_uuid()::text, 'lido', 15000000000, 1, 15000000000, 15000000000, 15000000000, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Verify seed data
-- ============================================================================
SELECT 'Protocols seeded: ' || COUNT(*) FROM protocols;
SELECT 'Protocol TVL records seeded: ' || COUNT(*) FROM protocol_tvl;
SELECT 'Token price records seeded: ' || COUNT(*) FROM token_prices;
SELECT 'Protocol stats seeded: ' || COUNT(*) FROM protocol_stats;

