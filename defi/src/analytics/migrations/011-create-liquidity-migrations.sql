/**
 * Migration: Create liquidity_migrations table
 * Story: 2.1.3 - Liquidity Analysis Tools
 * 
 * This table tracks liquidity flows between protocols
 * to identify migration patterns and causes.
 */

CREATE TABLE IF NOT EXISTS liquidity_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_protocol_id VARCHAR(255) NOT NULL,
  to_protocol_id VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Migration Details
  wallet_address VARCHAR(255) NOT NULL,
  amount_usd DECIMAL(20, 2) NOT NULL,
  token_symbols VARCHAR(255)[],
  
  -- Pool Details
  from_pool_id UUID REFERENCES liquidity_pools(id) ON DELETE SET NULL,
  to_pool_id UUID REFERENCES liquidity_pools(id) ON DELETE SET NULL,
  from_pool_address VARCHAR(255),
  to_pool_address VARCHAR(255),
  
  -- Timing
  migration_timestamp TIMESTAMP NOT NULL,
  time_between_exit_entry INTEGER, -- Minutes between exit and entry
  
  -- Context & Reasons
  reason VARCHAR(255), -- 'higher_apy', 'incentives', 'risk_reduction', 'new_pool', 'other'
  from_apy DECIMAL(10, 4),
  to_apy DECIMAL(10, 4),
  apy_difference DECIMAL(10, 4), -- to_apy - from_apy
  from_tvl DECIMAL(20, 2),
  to_tvl DECIMAL(20, 2),
  
  -- Migration Metrics
  is_complete_exit BOOLEAN DEFAULT true, -- Did user exit entire position?
  migration_pct DECIMAL(10, 4), -- % of position migrated
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for migration analysis
CREATE INDEX idx_liquidity_migrations_from_protocol ON liquidity_migrations(from_protocol_id);
CREATE INDEX idx_liquidity_migrations_to_protocol ON liquidity_migrations(to_protocol_id);
CREATE INDEX idx_liquidity_migrations_chain ON liquidity_migrations(chain_id);
CREATE INDEX idx_liquidity_migrations_wallet ON liquidity_migrations(wallet_address);
CREATE INDEX idx_liquidity_migrations_timestamp ON liquidity_migrations(migration_timestamp DESC);
CREATE INDEX idx_liquidity_migrations_amount ON liquidity_migrations(amount_usd DESC);
CREATE INDEX idx_liquidity_migrations_reason ON liquidity_migrations(reason);
CREATE INDEX idx_liquidity_migrations_flow ON liquidity_migrations(from_protocol_id, to_protocol_id, migration_timestamp DESC);

-- Comments
COMMENT ON TABLE liquidity_migrations IS 'Tracks liquidity flows between protocols for migration analysis';
COMMENT ON COLUMN liquidity_migrations.reason IS 'Migration reason: higher_apy, incentives, risk_reduction, new_pool, other';
COMMENT ON COLUMN liquidity_migrations.time_between_exit_entry IS 'Minutes between exiting old pool and entering new pool';
COMMENT ON COLUMN liquidity_migrations.apy_difference IS 'APY improvement: to_apy - from_apy';
COMMENT ON COLUMN liquidity_migrations.is_complete_exit IS 'Whether user exited entire position or partial';
COMMENT ON COLUMN liquidity_migrations.migration_pct IS 'Percentage of position migrated (1.0 = 100%)';

