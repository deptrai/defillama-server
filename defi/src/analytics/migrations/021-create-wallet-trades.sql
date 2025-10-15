-- Migration: 021-create-wallet-trades.sql
-- Story: 3.1.2 - Trade Pattern Analysis
-- Description: Create wallet_trades table to store individual trades from smart money wallets

CREATE TABLE IF NOT EXISTS wallet_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL,
  tx_hash VARCHAR(255) NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Trade details
  trade_type VARCHAR(20) NOT NULL, -- 'buy', 'sell', 'swap'
  
  -- Token in (what was sold/spent)
  token_in_address VARCHAR(255),
  token_in_symbol VARCHAR(50),
  token_in_amount DECIMAL(30, 10),
  token_in_value_usd DECIMAL(20, 2),
  
  -- Token out (what was bought/received)
  token_out_address VARCHAR(255),
  token_out_symbol VARCHAR(50),
  token_out_amount DECIMAL(30, 10),
  token_out_value_usd DECIMAL(20, 2),
  
  -- Protocol details
  protocol_id VARCHAR(255),
  protocol_name VARCHAR(255),
  dex_name VARCHAR(255),
  
  -- Trade metrics
  trade_size_usd DECIMAL(20, 2),
  gas_fee_usd DECIMAL(10, 2),
  slippage_pct DECIMAL(5, 2),
  
  -- Performance metrics
  realized_pnl DECIMAL(20, 2),
  unrealized_pnl DECIMAL(20, 2),
  roi DECIMAL(10, 4),
  holding_period_days INTEGER,
  
  -- Pattern classification
  trade_pattern VARCHAR(50), -- 'accumulation', 'distribution', 'rotation', 'arbitrage', null
  trade_timing VARCHAR(20), -- 'early', 'mid', 'late', 'exit'
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_wallet_trades_wallet_id ON wallet_trades(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_trades_timestamp ON wallet_trades(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_trades_token_in ON wallet_trades(token_in_address);
CREATE INDEX IF NOT EXISTS idx_wallet_trades_token_out ON wallet_trades(token_out_address);
CREATE INDEX IF NOT EXISTS idx_wallet_trades_pattern ON wallet_trades(trade_pattern);

-- Comments
COMMENT ON TABLE wallet_trades IS 'Individual trades from smart money wallets for pattern analysis';
COMMENT ON COLUMN wallet_trades.wallet_id IS 'Reference to smart_money_wallets table (not enforced FK for flexibility)';
COMMENT ON COLUMN wallet_trades.trade_type IS 'Type of trade: buy, sell, or swap';
COMMENT ON COLUMN wallet_trades.trade_pattern IS 'Detected pattern: accumulation, distribution, rotation, arbitrage, or null';
COMMENT ON COLUMN wallet_trades.trade_timing IS 'Trade timing classification: early, mid, late, or exit';

