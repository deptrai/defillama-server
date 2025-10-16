-- Migration: 024-create-wallet-performance-snapshots.sql
-- Story: 3.1.3 - Performance Attribution
-- Description: Create wallet_performance_snapshots table for time-series performance tracking

CREATE TABLE IF NOT EXISTS wallet_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  
  -- Portfolio value
  portfolio_value_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
  open_positions_count INTEGER NOT NULL DEFAULT 0,
  open_positions_value DECIMAL(20, 2) NOT NULL DEFAULT 0,
  
  -- Daily metrics
  daily_pnl DECIMAL(20, 2) NOT NULL DEFAULT 0,
  daily_return_pct DECIMAL(10, 4) NOT NULL DEFAULT 0, -- percentage
  daily_volume DECIMAL(20, 2) NOT NULL DEFAULT 0,
  daily_trades_count INTEGER NOT NULL DEFAULT 0,
  
  -- Cumulative metrics
  cumulative_pnl DECIMAL(20, 2) NOT NULL DEFAULT 0,
  cumulative_return_pct DECIMAL(10, 4) NOT NULL DEFAULT 0, -- percentage
  cumulative_volume DECIMAL(20, 2) NOT NULL DEFAULT 0,
  cumulative_trades_count INTEGER NOT NULL DEFAULT 0,
  
  -- Risk metrics (rolling)
  rolling_sharpe_ratio DECIMAL(10, 4) DEFAULT NULL, -- 30-day rolling
  rolling_volatility DECIMAL(10, 4) DEFAULT NULL, -- 30-day rolling
  rolling_max_drawdown DECIMAL(5, 2) DEFAULT NULL, -- 30-day rolling
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_wallet_snapshot_wallet FOREIGN KEY (wallet_id) 
    REFERENCES smart_money_wallets(id) ON DELETE CASCADE,
  CONSTRAINT unique_wallet_snapshot_date UNIQUE (wallet_id, snapshot_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_snapshot_wallet_id 
  ON wallet_performance_snapshots(wallet_id);

CREATE INDEX IF NOT EXISTS idx_wallet_snapshot_date 
  ON wallet_performance_snapshots(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_snapshot_wallet_date 
  ON wallet_performance_snapshots(wallet_id, snapshot_date DESC);

-- Comments
COMMENT ON TABLE wallet_performance_snapshots IS 'Daily performance snapshots for smart money wallets';
COMMENT ON COLUMN wallet_performance_snapshots.snapshot_date IS 'Date of the snapshot (daily granularity)';
COMMENT ON COLUMN wallet_performance_snapshots.daily_return_pct IS 'Daily return percentage';
COMMENT ON COLUMN wallet_performance_snapshots.cumulative_return_pct IS 'Cumulative return percentage since inception';
COMMENT ON COLUMN wallet_performance_snapshots.rolling_sharpe_ratio IS '30-day rolling Sharpe ratio';

