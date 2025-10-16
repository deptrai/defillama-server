-- Migration: 023-create-wallet-performance-metrics.sql
-- Story: 3.1.3 - Performance Attribution
-- Description: Create wallet_performance_metrics table to store aggregated performance metrics

CREATE TABLE IF NOT EXISTS wallet_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL,
  calculation_date TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Trade statistics
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL(5, 2) NOT NULL DEFAULT 0, -- percentage (0-100)
  
  -- P&L metrics
  realized_pnl DECIMAL(20, 2) NOT NULL DEFAULT 0, -- USD
  unrealized_pnl DECIMAL(20, 2) NOT NULL DEFAULT 0, -- USD
  total_pnl DECIMAL(20, 2) NOT NULL DEFAULT 0, -- USD
  total_volume_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
  average_trade_size DECIMAL(20, 2) NOT NULL DEFAULT 0,
  
  -- Risk metrics
  sharpe_ratio DECIMAL(10, 4) DEFAULT NULL,
  sortino_ratio DECIMAL(10, 4) DEFAULT NULL,
  max_drawdown DECIMAL(5, 2) DEFAULT NULL, -- percentage
  max_drawdown_usd DECIMAL(20, 2) DEFAULT NULL,
  volatility DECIMAL(10, 4) DEFAULT NULL, -- standard deviation of returns
  downside_volatility DECIMAL(10, 4) DEFAULT NULL, -- downside deviation
  
  -- Trade performance
  best_trade_pnl DECIMAL(20, 2) DEFAULT NULL,
  worst_trade_pnl DECIMAL(20, 2) DEFAULT NULL,
  average_trade_pnl DECIMAL(20, 2) DEFAULT NULL,
  median_trade_pnl DECIMAL(20, 2) DEFAULT NULL,
  
  -- Holding period
  average_holding_period_days DECIMAL(10, 2) DEFAULT NULL,
  median_holding_period_days DECIMAL(10, 2) DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_wallet_performance_wallet FOREIGN KEY (wallet_id)
    REFERENCES smart_money_wallets(id) ON DELETE CASCADE,
  CONSTRAINT unique_wallet_performance_date UNIQUE (wallet_id, calculation_date),
  CONSTRAINT check_win_rate CHECK (win_rate >= 0 AND win_rate <= 100),
  CONSTRAINT check_max_drawdown CHECK (max_drawdown IS NULL OR (max_drawdown >= 0 AND max_drawdown <= 100))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_performance_wallet_id 
  ON wallet_performance_metrics(wallet_id);

CREATE INDEX IF NOT EXISTS idx_wallet_performance_calculation_date 
  ON wallet_performance_metrics(calculation_date DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_performance_win_rate 
  ON wallet_performance_metrics(win_rate DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_performance_sharpe_ratio 
  ON wallet_performance_metrics(sharpe_ratio DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_wallet_performance_total_pnl 
  ON wallet_performance_metrics(total_pnl DESC);

-- Composite index for wallet + date queries
CREATE INDEX IF NOT EXISTS idx_wallet_performance_wallet_date 
  ON wallet_performance_metrics(wallet_id, calculation_date DESC);

-- Comments
COMMENT ON TABLE wallet_performance_metrics IS 'Aggregated performance metrics for smart money wallets';
COMMENT ON COLUMN wallet_performance_metrics.win_rate IS 'Percentage of winning trades (0-100)';
COMMENT ON COLUMN wallet_performance_metrics.sharpe_ratio IS 'Risk-adjusted return metric';
COMMENT ON COLUMN wallet_performance_metrics.sortino_ratio IS 'Downside risk-adjusted return metric';
COMMENT ON COLUMN wallet_performance_metrics.max_drawdown IS 'Maximum peak-to-trough decline percentage';

