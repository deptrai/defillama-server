-- DeFiLlama database schema for Supabase
-- 100% FREE WebSocket solution with unlimited connections

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Price updates table
CREATE TABLE price_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id TEXT NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  change_24h DECIMAL(10,4),
  volume_24h DECIMAL(20,2),
  market_cap DECIMAL(20,2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TVL updates table  
CREATE TABLE tvl_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_id TEXT NOT NULL,
  tvl DECIMAL(20,2) NOT NULL,
  change_24h DECIMAL(10,4),
  chain TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Protocol updates table
CREATE TABLE protocol_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  chains TEXT[],
  tvl DECIMAL(20,2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User alerts table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  protocol_id TEXT,
  token_id TEXT,
  read BOOLEAN DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Liquidations table
CREATE TABLE liquidations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_id TEXT NOT NULL,
  user_address TEXT NOT NULL,
  collateral_token TEXT,
  debt_token TEXT,
  collateral_amount DECIMAL(20,8),
  debt_amount DECIMAL(20,8),
  liquidation_price DECIMAL(20,8),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Governance proposals table
CREATE TABLE governance_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  votes_for DECIMAL(20,2) DEFAULT 0,
  votes_against DECIMAL(20,2) DEFAULT 0,
  end_time TIMESTAMP WITH TIME ZONE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token emissions table
CREATE TABLE token_emissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_id TEXT NOT NULL,
  token_id TEXT NOT NULL,
  emission_rate DECIMAL(20,8),
  total_supply DECIMAL(30,8),
  circulating_supply DECIMAL(30,8),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API keys table for authentication
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  user_id UUID,
  name TEXT,
  permissions JSONB DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- WebSocket connections tracking
CREATE TABLE websocket_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id TEXT UNIQUE NOT NULL,
  user_id UUID,
  api_key_id UUID REFERENCES api_keys(id),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscriptions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_price_updates_token_timestamp ON price_updates(token_id, timestamp DESC);
CREATE INDEX idx_tvl_updates_protocol_timestamp ON tvl_updates(protocol_id, timestamp DESC);
CREATE INDEX idx_protocol_updates_protocol_timestamp ON protocol_updates(protocol_id, timestamp DESC);
CREATE INDEX idx_alerts_user_timestamp ON alerts(user_id, timestamp DESC);
CREATE INDEX idx_liquidations_protocol_timestamp ON liquidations(protocol_id, timestamp DESC);
CREATE INDEX idx_governance_protocol_timestamp ON governance_proposals(protocol_id, timestamp DESC);
CREATE INDEX idx_emissions_protocol_timestamp ON token_emissions(protocol_id, timestamp DESC);
CREATE INDEX idx_api_keys_key ON api_keys(key) WHERE active = true;
CREATE INDEX idx_websocket_connections_user ON websocket_connections(user_id);

-- Insert sample API key for testing
INSERT INTO api_keys (key, name, permissions, rate_limit) 
VALUES ('defillama-dev-key-2024', 'Development Key', '{"read": true, "write": true, "admin": false}', 10000);

-- Create views for common queries
CREATE VIEW active_connections AS
SELECT 
  wc.*,
  ak.name as api_key_name,
  ak.rate_limit
FROM websocket_connections wc
LEFT JOIN api_keys ak ON wc.api_key_id = ak.id
WHERE wc.last_heartbeat > NOW() - INTERVAL '5 minutes';

CREATE VIEW latest_prices AS
SELECT DISTINCT ON (token_id)
  token_id,
  price,
  change_24h,
  volume_24h,
  market_cap,
  timestamp
FROM price_updates
ORDER BY token_id, timestamp DESC;

CREATE VIEW protocol_tvl_summary AS
SELECT 
  protocol_id,
  name,
  category,
  chains,
  tvl,
  timestamp
FROM protocol_updates pu1
WHERE timestamp = (
  SELECT MAX(timestamp) 
  FROM protocol_updates pu2 
  WHERE pu2.protocol_id = pu1.protocol_id
);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
