-- Migration: 025-create-wallet-strategy-attribution.sql
-- Story: 3.1.3 - Performance Attribution
-- Description: Create wallet_strategy_attribution table for strategy classification and effectiveness

CREATE TABLE IF NOT EXISTS wallet_strategy_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL,
  
  -- Strategy classification
  primary_strategy VARCHAR(50) NOT NULL, -- 'accumulation', 'distribution', 'rotation', 'arbitrage', 'swing', 'day', 'position', 'scalp'
  secondary_strategies JSONB DEFAULT '[]'::jsonb, -- array of secondary strategies
  strategy_consistency_score DECIMAL(5, 2) NOT NULL DEFAULT 0, -- 0-100, higher = more consistent
  
  -- Accumulation strategy metrics
  accumulation_pnl DECIMAL(20, 2) DEFAULT 0,
  accumulation_win_rate DECIMAL(5, 2) DEFAULT 0,
  accumulation_trade_count INTEGER DEFAULT 0,
  accumulation_sharpe_ratio DECIMAL(10, 4) DEFAULT NULL,
  
  -- Distribution strategy metrics
  distribution_pnl DECIMAL(20, 2) DEFAULT 0,
  distribution_win_rate DECIMAL(5, 2) DEFAULT 0,
  distribution_trade_count INTEGER DEFAULT 0,
  distribution_sharpe_ratio DECIMAL(10, 4) DEFAULT NULL,
  
  -- Rotation strategy metrics
  rotation_pnl DECIMAL(20, 2) DEFAULT 0,
  rotation_win_rate DECIMAL(5, 2) DEFAULT 0,
  rotation_trade_count INTEGER DEFAULT 0,
  rotation_sharpe_ratio DECIMAL(10, 4) DEFAULT NULL,
  
  -- Arbitrage strategy metrics
  arbitrage_pnl DECIMAL(20, 2) DEFAULT 0,
  arbitrage_win_rate DECIMAL(5, 2) DEFAULT 0,
  arbitrage_trade_count INTEGER DEFAULT 0,
  arbitrage_sharpe_ratio DECIMAL(10, 4) DEFAULT NULL,
  
  -- Swing trading metrics
  swing_pnl DECIMAL(20, 2) DEFAULT 0,
  swing_win_rate DECIMAL(5, 2) DEFAULT 0,
  swing_trade_count INTEGER DEFAULT 0,
  swing_sharpe_ratio DECIMAL(10, 4) DEFAULT NULL,
  
  -- Day trading metrics
  day_pnl DECIMAL(20, 2) DEFAULT 0,
  day_win_rate DECIMAL(5, 2) DEFAULT 0,
  day_trade_count INTEGER DEFAULT 0,
  day_sharpe_ratio DECIMAL(10, 4) DEFAULT NULL,
  
  -- Position trading metrics
  position_pnl DECIMAL(20, 2) DEFAULT 0,
  position_win_rate DECIMAL(5, 2) DEFAULT 0,
  position_trade_count INTEGER DEFAULT 0,
  position_sharpe_ratio DECIMAL(10, 4) DEFAULT NULL,
  
  -- Scalp trading metrics
  scalp_pnl DECIMAL(20, 2) DEFAULT 0,
  scalp_win_rate DECIMAL(5, 2) DEFAULT 0,
  scalp_trade_count INTEGER DEFAULT 0,
  scalp_sharpe_ratio DECIMAL(10, 4) DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_wallet_strategy_wallet FOREIGN KEY (wallet_id) 
    REFERENCES smart_money_wallets(id) ON DELETE CASCADE,
  CONSTRAINT unique_wallet_strategy UNIQUE (wallet_id),
  CONSTRAINT check_consistency_score CHECK (strategy_consistency_score >= 0 AND strategy_consistency_score <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_strategy_wallet_id 
  ON wallet_strategy_attribution(wallet_id);

CREATE INDEX IF NOT EXISTS idx_wallet_strategy_primary 
  ON wallet_strategy_attribution(primary_strategy);

CREATE INDEX IF NOT EXISTS idx_wallet_strategy_consistency 
  ON wallet_strategy_attribution(strategy_consistency_score DESC);

-- Comments
COMMENT ON TABLE wallet_strategy_attribution IS 'Strategy classification and effectiveness metrics for smart money wallets';
COMMENT ON COLUMN wallet_strategy_attribution.primary_strategy IS 'Primary trading strategy identified for the wallet';
COMMENT ON COLUMN wallet_strategy_attribution.secondary_strategies IS 'Array of secondary strategies (JSONB)';
COMMENT ON COLUMN wallet_strategy_attribution.strategy_consistency_score IS 'Consistency score 0-100, higher = more focused on primary strategy';

