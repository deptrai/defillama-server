-- Seed Data: Wallet Performance Metrics
-- Story: 3.1.3 - Performance Attribution
-- Description: Mock performance metrics for 5 representative smart money wallets
-- Created: 2025-10-15

-- Clear existing data
TRUNCATE TABLE wallet_performance_metrics CASCADE;

-- Wallet 1: Ethereum Whale #1 (High performer, swing trader)
INSERT INTO wallet_performance_metrics (
  wallet_id, calculation_date,
  total_trades, winning_trades, losing_trades, win_rate,
  realized_pnl, unrealized_pnl, total_pnl, total_volume_usd, average_trade_size,
  sharpe_ratio, sortino_ratio, max_drawdown, max_drawdown_usd, volatility, downside_volatility,
  best_trade_pnl, worst_trade_pnl, average_trade_pnl, median_trade_pnl,
  average_holding_period_days, median_holding_period_days
)
SELECT 
  id, NOW(),
  450, 353, 97, 78.50,
  14500000.00, 500000.00, 15000000.00, 382500000.00, 850000.00,
  2.8500, 3.2000, 12.00, 1800000.00, 0.1850, 0.1200,
  2500000.00, -850000.00, 33333.33, 28000.00,
  45.50, 42.00
FROM smart_money_wallets 
WHERE wallet_address = '0x1234567890abcdef1234567890abcdef12345678';

-- Wallet 2: DeFi Whale Master (High performer, position trader)
INSERT INTO wallet_performance_metrics (
  wallet_id, calculation_date,
  total_trades, winning_trades, losing_trades, win_rate,
  realized_pnl, unrealized_pnl, total_pnl, total_volume_usd, average_trade_size,
  sharpe_ratio, sortino_ratio, max_drawdown, max_drawdown_usd, volatility, downside_volatility,
  best_trade_pnl, worst_trade_pnl, average_trade_pnl, median_trade_pnl,
  average_holding_period_days, median_holding_period_days
)
SELECT 
  id, NOW(),
  380, 285, 95, 75.00,
  12000000.00, 500000.00, 12500000.00, 349600000.00, 920000.00,
  2.6000, 2.9500, 15.00, 1875000.00, 0.2100, 0.1400,
  3200000.00, -920000.00, 31578.95, 26500.00,
  52.00, 48.00
FROM smart_money_wallets 
WHERE wallet_address = '0x2345678901bcdef2345678901bcdef234567890';

-- Wallet 3: Arbitrage Bot Alpha (Arbitrage specialist)
INSERT INTO wallet_performance_metrics (
  wallet_id, calculation_date,
  total_trades, winning_trades, losing_trades, win_rate,
  realized_pnl, unrealized_pnl, total_pnl, total_volume_usd, average_trade_size,
  sharpe_ratio, sortino_ratio, max_drawdown, max_drawdown_usd, volatility, downside_volatility,
  best_trade_pnl, worst_trade_pnl, average_trade_pnl, median_trade_pnl,
  average_holding_period_days, median_holding_period_days
)
SELECT 
  id, NOW(),
  1250, 1100, 150, 88.00,
  8500000.00, 50000.00, 8550000.00, 312500000.00, 250000.00,
  3.2000, 3.8000, 8.00, 684000.00, 0.1200, 0.0800,
  450000.00, -125000.00, 6800.00, 5200.00,
  0.25, 0.20
FROM smart_money_wallets 
WHERE wallet_address = '0x3456789012cdef3456789012cdef345678901234';

-- Wallet 4: Smart Trader Pro (Day trader)
INSERT INTO wallet_performance_metrics (
  wallet_id, calculation_date,
  total_trades, winning_trades, losing_trades, win_rate,
  realized_pnl, unrealized_pnl, total_pnl, total_volume_usd, average_trade_size,
  sharpe_ratio, sortino_ratio, max_drawdown, max_drawdown_usd, volatility, downside_volatility,
  best_trade_pnl, worst_trade_pnl, average_trade_pnl, median_trade_pnl,
  average_holding_period_days, median_holding_period_days
)
SELECT 
  id, NOW(),
  820, 615, 205, 75.00,
  5800000.00, 200000.00, 6000000.00, 246000000.00, 300000.00,
  2.4500, 2.7500, 18.00, 1080000.00, 0.2400, 0.1600,
  850000.00, -420000.00, 7317.07, 6200.00,
  3.50, 3.00
FROM smart_money_wallets 
WHERE wallet_address = '0x4567890123def4567890123def456789012345678';

-- Wallet 5: Yield Farmer Elite (Position trader, conservative)
INSERT INTO wallet_performance_metrics (
  wallet_id, calculation_date,
  total_trades, winning_trades, losing_trades, win_rate,
  realized_pnl, unrealized_pnl, total_pnl, total_volume_usd, average_trade_size,
  sharpe_ratio, sortino_ratio, max_drawdown, max_drawdown_usd, volatility, downside_volatility,
  best_trade_pnl, worst_trade_pnl, average_trade_pnl, median_trade_pnl,
  average_holding_period_days, median_holding_period_days
)
SELECT 
  id, NOW(),
  180, 144, 36, 80.00,
  4200000.00, 300000.00, 4500000.00, 90000000.00, 500000.00,
  2.1000, 2.4000, 10.00, 450000.00, 0.1500, 0.1000,
  1200000.00, -280000.00, 23333.33, 20000.00,
  85.00, 78.00
FROM smart_money_wallets 
WHERE wallet_address = '0x5678901234ef5678901234ef567890123456789';

-- Verify data
SELECT 
  w.wallet_address,
  w.wallet_name,
  pm.total_trades,
  pm.win_rate,
  pm.total_pnl,
  pm.sharpe_ratio,
  pm.average_holding_period_days
FROM wallet_performance_metrics pm
JOIN smart_money_wallets w ON pm.wallet_id = w.id
ORDER BY pm.total_pnl DESC;

