-- Seed Test Data for Analytics Integration Testing
-- Story: 2.1.1 - Protocol Performance Dashboard
-- Purpose: Insert realistic test data for manual integration testing

-- ============================================================================
-- Test Protocols
-- ============================================================================

-- Insert test protocols (if not exists)
INSERT INTO protocols (id, name, category, description, created_at)
VALUES 
  ('uniswap', 'Uniswap', 'DEX', 'Leading decentralized exchange', NOW()),
  ('aave', 'Aave', 'Lending', 'Decentralized lending protocol', NOW()),
  ('curve', 'Curve', 'DEX', 'Stablecoin-focused DEX', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Daily Users Data (Last 90 days)
-- ============================================================================

-- Generate daily users for Uniswap (trending up)
INSERT INTO dailyUsers (start, endTime, protocolId, chain, users, realStart)
SELECT 
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as start,
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i) + interval '1 day')::int as endTime,
  'uniswap' as protocolId,
  'ethereum' as chain,
  10000 + (i * 100) + (random() * 500)::int as users, -- Trending up
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as realStart
FROM generate_series(0, 89) as i
ON CONFLICT (start, protocolId, chain) DO NOTHING;

-- Generate daily users for Aave (stable)
INSERT INTO dailyUsers (start, endTime, protocolId, chain, users, realStart)
SELECT 
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as start,
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i) + interval '1 day')::int as endTime,
  'aave' as protocolId,
  'ethereum' as chain,
  5000 + (random() * 200)::int as users, -- Stable
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as realStart
FROM generate_series(0, 89) as i
ON CONFLICT (start, protocolId, chain) DO NOTHING;

-- Generate daily users for Curve (trending down)
INSERT INTO dailyUsers (start, endTime, protocolId, chain, users, realStart)
SELECT 
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as start,
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i) + interval '1 day')::int as endTime,
  'curve' as protocolId,
  'ethereum' as chain,
  8000 - (i * 50) + (random() * 300)::int as users, -- Trending down
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as realStart
FROM generate_series(0, 89) as i
ON CONFLICT (start, protocolId, chain) DO NOTHING;

-- ============================================================================
-- Daily New Users Data (Last 90 days)
-- ============================================================================

-- Generate new users for Uniswap (10% of total users)
INSERT INTO dailyNewUsers (start, endTime, protocolId, chain, users, realStart)
SELECT 
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as start,
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i) + interval '1 day')::int as endTime,
  'uniswap' as protocolId,
  'ethereum' as chain,
  (1000 + (i * 10) + (random() * 50)::int) as users, -- 10% of total
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as realStart
FROM generate_series(0, 89) as i
ON CONFLICT (start, protocolId, chain) DO NOTHING;

-- Generate new users for Aave (8% of total users)
INSERT INTO dailyNewUsers (start, endTime, protocolId, chain, users, realStart)
SELECT 
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as start,
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i) + interval '1 day')::int as endTime,
  'aave' as protocolId,
  'ethereum' as chain,
  (400 + (random() * 20)::int) as users, -- 8% of total
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as realStart
FROM generate_series(0, 89) as i
ON CONFLICT (start, protocolId, chain) DO NOTHING;

-- Generate new users for Curve (5% of total users)
INSERT INTO dailyNewUsers (start, endTime, protocolId, chain, users, realStart)
SELECT 
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as start,
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i) + interval '1 day')::int as endTime,
  'curve' as protocolId,
  'ethereum' as chain,
  (400 - (i * 2) + (random() * 15)::int) as users, -- 5% of total
  extract(epoch from date_trunc('day', NOW() - interval '1 day' * i))::int as realStart
FROM generate_series(0, 89) as i
ON CONFLICT (start, protocolId, chain) DO NOTHING;

-- ============================================================================
-- Protocol TVL Data (Last 90 days)
-- ============================================================================

-- Generate TVL for Uniswap (trending up)
INSERT INTO protocol_tvl (protocol_id, chain, tvl, tvl_prev_day, tvl_prev_week, tvl_prev_month, change_1d, change_7d, change_30d, timestamp, created_at)
SELECT 
  'uniswap' as protocol_id,
  'ethereum' as chain,
  (5000000000 + (i * 10000000) + (random() * 50000000)::numeric) as tvl, -- $5B trending up
  (4900000000 + (i * 10000000) + (random() * 50000000)::numeric) as tvl_prev_day,
  (4500000000 + (i * 10000000) + (random() * 50000000)::numeric) as tvl_prev_week,
  (4000000000 + (i * 10000000) + (random() * 50000000)::numeric) as tvl_prev_month,
  (random() * 5)::numeric as change_1d,
  (random() * 10)::numeric as change_7d,
  (random() * 20)::numeric as change_30d,
  NOW() - interval '1 day' * i as timestamp,
  NOW() as created_at
FROM generate_series(0, 89) as i
ON CONFLICT DO NOTHING;

-- Generate TVL for Aave (stable)
INSERT INTO protocol_tvl (protocol_id, chain, tvl, tvl_prev_day, tvl_prev_week, tvl_prev_month, change_1d, change_7d, change_30d, timestamp, created_at)
SELECT 
  'aave' as protocol_id,
  'ethereum' as chain,
  (8000000000 + (random() * 100000000)::numeric) as tvl, -- $8B stable
  (7950000000 + (random() * 100000000)::numeric) as tvl_prev_day,
  (7900000000 + (random() * 100000000)::numeric) as tvl_prev_week,
  (7800000000 + (random() * 100000000)::numeric) as tvl_prev_month,
  (random() * 2 - 1)::numeric as change_1d, -- -1% to +1%
  (random() * 4 - 2)::numeric as change_7d,
  (random() * 6 - 3)::numeric as change_30d,
  NOW() - interval '1 day' * i as timestamp,
  NOW() as created_at
FROM generate_series(0, 89) as i
ON CONFLICT DO NOTHING;

-- Generate TVL for Curve (trending down)
INSERT INTO protocol_tvl (protocol_id, chain, tvl, tvl_prev_day, tvl_prev_week, tvl_prev_month, change_1d, change_7d, change_30d, timestamp, created_at)
SELECT 
  'curve' as protocol_id,
  'ethereum' as chain,
  (3000000000 - (i * 5000000) + (random() * 30000000)::numeric) as tvl, -- $3B trending down
  (3050000000 - (i * 5000000) + (random() * 30000000)::numeric) as tvl_prev_day,
  (3200000000 - (i * 5000000) + (random() * 30000000)::numeric) as tvl_prev_week,
  (3500000000 - (i * 5000000) + (random() * 30000000)::numeric) as tvl_prev_month,
  -(random() * 3)::numeric as change_1d, -- Negative
  -(random() * 8)::numeric as change_7d,
  -(random() * 15)::numeric as change_30d,
  NOW() - interval '1 day' * i as timestamp,
  NOW() as created_at
FROM generate_series(0, 89) as i
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify data was inserted
SELECT 
  'dailyUsers' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT protocolId) as protocol_count,
  MIN(start) as earliest_date,
  MAX(start) as latest_date
FROM dailyUsers
UNION ALL
SELECT 
  'dailyNewUsers' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT protocolId) as protocol_count,
  MIN(start) as earliest_date,
  MAX(start) as latest_date
FROM dailyNewUsers
UNION ALL
SELECT 
  'protocol_tvl' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT protocol_id) as protocol_count,
  MIN(extract(epoch from timestamp)::int) as earliest_date,
  MAX(extract(epoch from timestamp)::int) as latest_date
FROM protocol_tvl;

-- Show sample data
SELECT 'Sample dailyUsers data:' as info;
SELECT protocolId, chain, users, to_timestamp(start) as date
FROM dailyUsers
WHERE protocolId = 'uniswap'
ORDER BY start DESC
LIMIT 5;

SELECT 'Sample protocol_tvl data:' as info;
SELECT protocol_id, chain, tvl, change_1d, timestamp
FROM protocol_tvl
WHERE protocol_id = 'uniswap'
ORDER BY timestamp DESC
LIMIT 5;

