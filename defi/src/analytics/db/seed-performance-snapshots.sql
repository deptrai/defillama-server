-- Seed Data: Wallet Performance Snapshots
-- Story: 3.1.3 - Performance Attribution
-- Description: Mock daily performance snapshots for 1 wallet (last 30 days)
-- Created: 2025-10-15

-- Clear existing data
TRUNCATE TABLE wallet_performance_snapshots CASCADE;

-- Generate 30 days of snapshots for Wallet 1 (Ethereum Whale #1)
-- Simulating a profitable month with some volatility

INSERT INTO wallet_performance_snapshots (
  wallet_id, snapshot_date,
  portfolio_value_usd, open_positions_count, open_positions_value,
  daily_pnl, daily_return_pct, daily_volume, daily_trades_count,
  cumulative_pnl, cumulative_return_pct, cumulative_volume, cumulative_trades_count,
  rolling_sharpe_ratio, rolling_volatility, rolling_max_drawdown
)
SELECT 
  w.id,
  (CURRENT_DATE - INTERVAL '30 days' + (day || ' days')::INTERVAL)::DATE,
  -- Portfolio value grows from 50M to 65M over 30 days
  50000000 + (day * 500000) + (RANDOM() * 1000000 - 500000),
  -- Open positions: 8-12
  8 + FLOOR(RANDOM() * 5),
  -- Open positions value: 40-50% of portfolio
  (50000000 + (day * 500000)) * (0.40 + RANDOM() * 0.10),
  -- Daily P&L: -500K to +1.5M (mostly positive)
  (RANDOM() * 2000000 - 500000),
  -- Daily return: -1% to +3%
  (RANDOM() * 4.0 - 1.0),
  -- Daily volume: 1M to 5M
  1000000 + (RANDOM() * 4000000),
  -- Daily trades: 10-20
  10 + FLOOR(RANDOM() * 11),
  -- Cumulative P&L grows
  (day * 500000) + (RANDOM() * 200000),
  -- Cumulative return grows
  (day * 1.0) + (RANDOM() * 0.5),
  -- Cumulative volume
  day * 2500000,
  -- Cumulative trades
  day * 15,
  -- Rolling Sharpe ratio: 2.5-3.5
  2.5 + (RANDOM() * 1.0),
  -- Rolling volatility: 0.15-0.25
  0.15 + (RANDOM() * 0.10),
  -- Rolling max drawdown: 5-15%
  5.0 + (RANDOM() * 10.0)
FROM smart_money_wallets w
CROSS JOIN generate_series(0, 29) AS day
WHERE w.wallet_address = '0x1234567890abcdef1234567890abcdef12345678';

-- Verify data
SELECT 
  snapshot_date,
  portfolio_value_usd,
  daily_pnl,
  daily_return_pct,
  cumulative_pnl,
  cumulative_return_pct,
  rolling_sharpe_ratio
FROM wallet_performance_snapshots
ORDER BY snapshot_date DESC
LIMIT 10;

