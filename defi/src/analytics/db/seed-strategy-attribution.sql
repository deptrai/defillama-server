-- Seed Data: Wallet Strategy Attribution
-- Story: 3.1.3 - Performance Attribution
-- Description: Mock strategy attribution for 5 representative smart money wallets
-- Created: 2025-10-15

-- Clear existing data
TRUNCATE TABLE wallet_strategy_attribution CASCADE;

-- Wallet 1: Ethereum Whale #1 - Primary: Swing Trading
INSERT INTO wallet_strategy_attribution (
  wallet_id, primary_strategy, secondary_strategies, strategy_consistency_score,
  accumulation_pnl, accumulation_win_rate, accumulation_trade_count, accumulation_sharpe_ratio,
  distribution_pnl, distribution_win_rate, distribution_trade_count, distribution_sharpe_ratio,
  rotation_pnl, rotation_win_rate, rotation_trade_count, rotation_sharpe_ratio,
  arbitrage_pnl, arbitrage_win_rate, arbitrage_trade_count, arbitrage_sharpe_ratio,
  swing_pnl, swing_win_rate, swing_trade_count, swing_sharpe_ratio,
  day_pnl, day_win_rate, day_trade_count, day_sharpe_ratio,
  position_pnl, position_win_rate, position_trade_count, position_sharpe_ratio,
  scalp_pnl, scalp_win_rate, scalp_trade_count, scalp_sharpe_ratio
)
SELECT 
  id, 'swing', '["accumulation", "position"]'::jsonb, 75.50,
  3500000.00, 82.00, 85, 2.9000,
  1200000.00, 70.00, 45, 2.2000,
  800000.00, 68.00, 35, 2.0000,
  500000.00, 85.00, 25, 3.5000,
  8500000.00, 80.00, 220, 3.1000,
  400000.00, 72.00, 30, 2.4000,
  2100000.00, 76.00, 60, 2.7000,
  0.00, 0.00, 0, NULL
FROM smart_money_wallets 
WHERE wallet_address = '0x1234567890abcdef1234567890abcdef12345678';

-- Wallet 2: DeFi Whale Master - Primary: Position Trading
INSERT INTO wallet_strategy_attribution (
  wallet_id, primary_strategy, secondary_strategies, strategy_consistency_score,
  accumulation_pnl, accumulation_win_rate, accumulation_trade_count, accumulation_sharpe_ratio,
  distribution_pnl, distribution_win_rate, distribution_trade_count, distribution_sharpe_ratio,
  rotation_pnl, rotation_win_rate, rotation_trade_count, rotation_sharpe_ratio,
  arbitrage_pnl, arbitrage_win_rate, arbitrage_trade_count, arbitrage_sharpe_ratio,
  swing_pnl, swing_win_rate, swing_trade_count, swing_sharpe_ratio,
  day_pnl, day_win_rate, day_trade_count, day_sharpe_ratio,
  position_pnl, position_win_rate, position_trade_count, position_sharpe_ratio,
  scalp_pnl, scalp_win_rate, scalp_trade_count, scalp_sharpe_ratio
)
SELECT 
  id, 'position', '["accumulation", "swing"]'::jsonb, 82.00,
  4200000.00, 80.00, 95, 2.8000,
  900000.00, 68.00, 35, 2.1000,
  600000.00, 65.00, 25, 1.9000,
  300000.00, 82.00, 15, 3.2000,
  2800000.00, 74.00, 85, 2.5000,
  200000.00, 70.00, 20, 2.3000,
  9500000.00, 78.00, 180, 2.9000,
  0.00, 0.00, 0, NULL
FROM smart_money_wallets 
WHERE wallet_address = '0x2345678901bcdef2345678901bcdef234567890';

-- Wallet 3: Arbitrage Bot Alpha - Primary: Arbitrage
INSERT INTO wallet_strategy_attribution (
  wallet_id, primary_strategy, secondary_strategies, strategy_consistency_score,
  accumulation_pnl, accumulation_win_rate, accumulation_trade_count, accumulation_sharpe_ratio,
  distribution_pnl, distribution_win_rate, distribution_trade_count, distribution_sharpe_ratio,
  rotation_pnl, rotation_win_rate, rotation_trade_count, rotation_sharpe_ratio,
  arbitrage_pnl, arbitrage_win_rate, arbitrage_trade_count, arbitrage_sharpe_ratio,
  swing_pnl, swing_win_rate, swing_trade_count, swing_sharpe_ratio,
  day_pnl, day_win_rate, day_trade_count, day_sharpe_ratio,
  position_pnl, position_win_rate, position_trade_count, position_sharpe_ratio,
  scalp_pnl, scalp_win_rate, scalp_trade_count, scalp_sharpe_ratio
)
SELECT 
  id, 'arbitrage', '["scalp", "rotation"]'::jsonb, 92.00,
  200000.00, 75.00, 25, 2.5000,
  150000.00, 70.00, 20, 2.2000,
  1200000.00, 85.00, 180, 3.0000,
  7500000.00, 90.00, 950, 3.5000,
  100000.00, 68.00, 15, 2.0000,
  50000.00, 65.00, 10, 1.8000,
  80000.00, 72.00, 12, 2.1000,
  270000.00, 82.00, 38, 2.8000
FROM smart_money_wallets 
WHERE wallet_address = '0x3456789012cdef3456789012cdef345678901234';

-- Wallet 4: Smart Trader Pro - Primary: Day Trading
INSERT INTO wallet_strategy_attribution (
  wallet_id, primary_strategy, secondary_strategies, strategy_consistency_score,
  accumulation_pnl, accumulation_win_rate, accumulation_trade_count, accumulation_sharpe_ratio,
  distribution_pnl, distribution_win_rate, distribution_trade_count, distribution_sharpe_ratio,
  rotation_pnl, rotation_win_rate, rotation_trade_count, rotation_sharpe_ratio,
  arbitrage_pnl, arbitrage_win_rate, arbitrage_trade_count, arbitrage_sharpe_ratio,
  swing_pnl, swing_win_rate, swing_trade_count, swing_sharpe_ratio,
  day_pnl, day_win_rate, day_trade_count, day_sharpe_ratio,
  position_pnl, position_win_rate, position_trade_count, position_sharpe_ratio,
  scalp_pnl, scalp_win_rate, scalp_trade_count, scalp_sharpe_ratio
)
SELECT 
  id, 'day', '["swing", "scalp"]'::jsonb, 70.00,
  800000.00, 72.00, 95, 2.3000,
  600000.00, 68.00, 75, 2.1000,
  500000.00, 70.00, 65, 2.2000,
  400000.00, 85.00, 55, 3.0000,
  1200000.00, 74.00, 180, 2.4000,
  4200000.00, 76.00, 520, 2.6000,
  300000.00, 70.00, 45, 2.0000,
  1000000.00, 78.00, 135, 2.5000
FROM smart_money_wallets 
WHERE wallet_address = '0x4567890123def4567890123def456789012345678';

-- Wallet 5: Yield Farmer Elite - Primary: Position Trading (Conservative)
INSERT INTO wallet_strategy_attribution (
  wallet_id, primary_strategy, secondary_strategies, strategy_consistency_score,
  accumulation_pnl, accumulation_win_rate, accumulation_trade_count, accumulation_sharpe_ratio,
  distribution_pnl, distribution_win_rate, distribution_trade_count, distribution_sharpe_ratio,
  rotation_pnl, rotation_win_rate, rotation_trade_count, rotation_sharpe_ratio,
  arbitrage_pnl, arbitrage_win_rate, arbitrage_trade_count, arbitrage_sharpe_ratio,
  swing_pnl, swing_win_rate, swing_trade_count, swing_sharpe_ratio,
  day_pnl, day_win_rate, day_trade_count, day_sharpe_ratio,
  position_pnl, position_win_rate, position_trade_count, position_sharpe_ratio,
  scalp_pnl, scalp_win_rate, scalp_trade_count, scalp_sharpe_ratio
)
SELECT 
  id, 'position', '["accumulation"]'::jsonb, 88.00,
  2800000.00, 85.00, 95, 2.5000,
  500000.00, 75.00, 25, 2.0000,
  200000.00, 70.00, 15, 1.8000,
  100000.00, 80.00, 10, 2.8000,
  400000.00, 78.00, 20, 2.2000,
  50000.00, 68.00, 5, 1.9000,
  3950000.00, 82.00, 140, 2.4000,
  0.00, 0.00, 0, NULL
FROM smart_money_wallets 
WHERE wallet_address = '0x5678901234ef5678901234ef567890123456789';

-- Verify data
SELECT 
  w.wallet_address,
  w.wallet_name,
  sa.primary_strategy,
  sa.secondary_strategies,
  sa.strategy_consistency_score,
  CASE sa.primary_strategy
    WHEN 'accumulation' THEN sa.accumulation_pnl
    WHEN 'distribution' THEN sa.distribution_pnl
    WHEN 'rotation' THEN sa.rotation_pnl
    WHEN 'arbitrage' THEN sa.arbitrage_pnl
    WHEN 'swing' THEN sa.swing_pnl
    WHEN 'day' THEN sa.day_pnl
    WHEN 'position' THEN sa.position_pnl
    WHEN 'scalp' THEN sa.scalp_pnl
  END as primary_strategy_pnl
FROM wallet_strategy_attribution sa
JOIN smart_money_wallets w ON sa.wallet_id = w.id
ORDER BY sa.strategy_consistency_score DESC;

