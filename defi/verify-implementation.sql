-- Comprehensive Implementation Verification
-- Tests all database tables and data for Stories 2.2.2, 2.2.3, 3.1.1, and 3.1.2

\echo '🧪 Comprehensive Implementation Verification'
\echo '============================================'
\echo ''

-- Database Connection Test
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'Database Connection Test'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT NOW() as current_time;
\echo ''

-- Story 3.1.2: Trade Pattern Analysis
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'Story 3.1.2: Trade Pattern Analysis'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '✅ wallet_trades table:'
SELECT COUNT(*) as total_trades FROM wallet_trades;
SELECT COUNT(DISTINCT wallet_id) as unique_wallets FROM wallet_trades;
SELECT trade_type, COUNT(*) as count FROM wallet_trades GROUP BY trade_type ORDER BY count DESC;
\echo ''

\echo '✅ trade_patterns table:'
SELECT COUNT(*) as total_patterns FROM trade_patterns;
\echo ''

\echo '✅ Sample trades by wallet:'
SELECT 
  w.wallet_address,
  COUNT(t.id) as trade_count,
  SUM(CASE WHEN t.trade_type = 'buy' THEN 1 ELSE 0 END) as buys,
  SUM(CASE WHEN t.trade_type = 'sell' THEN 1 ELSE 0 END) as sells,
  SUM(CASE WHEN t.trade_type = 'swap' THEN 1 ELSE 0 END) as swaps
FROM wallet_trades t
JOIN smart_money_wallets w ON t.wallet_id = w.id
GROUP BY w.wallet_address
ORDER BY trade_count DESC;
\echo ''

\echo '✅ Trade patterns distribution:'
SELECT 
  trade_pattern,
  COUNT(*) as count
FROM wallet_trades
WHERE trade_pattern IS NOT NULL
GROUP BY trade_pattern
ORDER BY count DESC;
\echo ''

-- Story 3.1.1: Smart Money Identification
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'Story 3.1.1: Smart Money Identification'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '✅ smart_money_wallets table:'
SELECT COUNT(*) as total_wallets FROM smart_money_wallets;
SELECT 
  CASE 
    WHEN overall_score >= 90 THEN '90-100 (Elite)'
    WHEN overall_score >= 80 THEN '80-89 (Excellent)'
    WHEN overall_score >= 70 THEN '70-79 (Good)'
    WHEN overall_score >= 60 THEN '60-69 (Average)'
    ELSE '< 60 (Below Average)'
  END as score_range,
  COUNT(*) as count
FROM smart_money_wallets
GROUP BY score_range
ORDER BY score_range DESC;
\echo ''

\echo '✅ Top 5 smart money wallets:'
SELECT 
  wallet_address,
  overall_score,
  profitability_score,
  consistency_score,
  timing_score,
  risk_management_score
FROM smart_money_wallets
ORDER BY overall_score DESC
LIMIT 5;
\echo ''

-- Story 2.2.2: Holder Distribution Analysis
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'Story 2.2.2: Holder Distribution Analysis'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '✅ token_holders table:'
SELECT COUNT(*) as total_holders FROM token_holders;
SELECT COUNT(DISTINCT token_address) as unique_tokens FROM token_holders;
\echo ''

\echo '✅ Tokens with most holders:'
SELECT 
  token_address,
  token_symbol,
  COUNT(*) as holder_count
FROM token_holders
GROUP BY token_address, token_symbol
ORDER BY holder_count DESC
LIMIT 5;
\echo ''

\echo '✅ holder_distribution_snapshots table:'
SELECT COUNT(*) as total_snapshots FROM holder_distribution_snapshots;
\echo ''

\echo '✅ holder_distribution_alerts table:'
SELECT COUNT(*) as total_alerts FROM holder_distribution_alerts;
SELECT alert_type, COUNT(*) as count FROM holder_distribution_alerts GROUP BY alert_type;
\echo ''

-- Story 2.2.3: Cross-chain Portfolio Aggregation
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'Story 2.2.3: Cross-chain Portfolio'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '✅ cross_chain_portfolios table:'
SELECT COUNT(*) as total_portfolios FROM cross_chain_portfolios;
SELECT COUNT(DISTINCT user_id) as unique_users FROM cross_chain_portfolios;
\echo ''

\echo '✅ Portfolios by chain:'
SELECT 
  chain_id,
  COUNT(*) as portfolio_count
FROM cross_chain_portfolios
GROUP BY chain_id
ORDER BY portfolio_count DESC;
\echo ''

\echo '✅ cross_chain_assets table:'
SELECT COUNT(*) as total_assets FROM cross_chain_assets;
SELECT COUNT(DISTINCT token_address) as unique_tokens FROM cross_chain_assets;
\echo ''

-- Database Indexes Verification
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'Database Indexes Verification'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '✅ Indexes on wallet_trades:'
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'wallet_trades'
ORDER BY indexname;
\echo ''

\echo '✅ Indexes on trade_patterns:'
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'trade_patterns'
ORDER BY indexname;
\echo ''

\echo '✅ Indexes on smart_money_wallets:'
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'smart_money_wallets'
ORDER BY indexname;
\echo ''

-- Final Summary
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'Final Summary'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
  'wallet_trades' as table_name,
  COUNT(*) as record_count
FROM wallet_trades
UNION ALL
SELECT 
  'trade_patterns',
  COUNT(*)
FROM trade_patterns
UNION ALL
SELECT 
  'smart_money_wallets',
  COUNT(*)
FROM smart_money_wallets
UNION ALL
SELECT 
  'token_holders',
  COUNT(*)
FROM token_holders
UNION ALL
SELECT 
  'cross_chain_portfolios',
  COUNT(*)
FROM cross_chain_portfolios
UNION ALL
SELECT 
  'cross_chain_assets',
  COUNT(*)
FROM cross_chain_assets
ORDER BY table_name;

\echo ''
\echo '✅ Verification Complete!'

