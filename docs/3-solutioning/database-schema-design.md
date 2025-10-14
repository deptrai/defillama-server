# 🗄️ Database Schema Design - On-Chain Services Platform

**Epic**: On-Chain Services Platform (on-chain-services-v1)  
**Date**: October 14, 2025  
**Database Architect**: Luis  
**Version**: 1.0  

---

## 🎯 **Schema Overview**

This document defines the PostgreSQL database schema for DeFiLlama's On-Chain Services Platform, supporting real-time analytics, user management, alerts, and advanced features like smart money tracking and MEV detection.

## 🏗️ **Database Architecture**

### Design Principles
- **Normalized design** for data consistency
- **Optimized for read-heavy workloads** with strategic denormalization
- **Time-series data** for historical analytics
- **Partitioning** for large tables
- **Indexing strategy** for real-time queries

### Technology Stack
- **Primary Database**: PostgreSQL 15+
- **Extensions**: TimescaleDB for time-series data
- **Connection Pooling**: PgBouncer
- **Replication**: Read replicas for analytics queries

---

## 📊 **Core Schema Tables**

### 1. Protocols Management

#### protocols
```sql
CREATE TABLE protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    chain_id INTEGER NOT NULL,
    contract_address VARCHAR(42),
    website_url VARCHAR(500),
    twitter_handle VARCHAR(100),
    discord_url VARCHAR(500),
    telegram_url VARCHAR(500),
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT protocols_name_check CHECK (length(name) > 0),
    CONSTRAINT protocols_slug_check CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Indexes
CREATE INDEX idx_protocols_category ON protocols (category);
CREATE INDEX idx_protocols_chain_id ON protocols (chain_id);
CREATE INDEX idx_protocols_active ON protocols (is_active) WHERE is_active = true;
CREATE INDEX idx_protocols_updated ON protocols (updated_at DESC);
```

#### protocol_metrics (TimescaleDB Hypertable)
```sql
CREATE TABLE protocol_metrics (
    id UUID DEFAULT gen_random_uuid(),
    protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    value DECIMAL(20,8) NOT NULL,
    value_usd DECIMAL(20,2),
    chain_id INTEGER NOT NULL,
    block_number BIGINT,
    transaction_hash VARCHAR(66),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Composite primary key for TimescaleDB
    PRIMARY KEY (timestamp, protocol_id, metric_type)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('protocol_metrics', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Indexes for common queries
CREATE INDEX idx_protocol_metrics_protocol_type ON protocol_metrics (protocol_id, metric_type, timestamp DESC);
CREATE INDEX idx_protocol_metrics_chain ON protocol_metrics (chain_id, timestamp DESC);
CREATE INDEX idx_protocol_metrics_value ON protocol_metrics (metric_type, value DESC, timestamp DESC);
```

### 2. Token & Price Management

#### tokens
```sql
CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contract_address VARCHAR(42),
    chain_id INTEGER NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 18,
    logo_url VARCHAR(500),
    coingecko_id VARCHAR(100),
    coinmarketcap_id INTEGER,
    is_stablecoin BOOLEAN DEFAULT false,
    is_wrapped BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for token per chain
    UNIQUE (contract_address, chain_id)
);

-- Indexes
CREATE INDEX idx_tokens_symbol ON tokens (symbol);
CREATE INDEX idx_tokens_chain ON tokens (chain_id);
CREATE INDEX idx_tokens_coingecko ON tokens (coingecko_id) WHERE coingecko_id IS NOT NULL;
```

#### token_prices (TimescaleDB Hypertable)
```sql
CREATE TABLE token_prices (
    id UUID DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    price DECIMAL(20,8) NOT NULL,
    volume_24h DECIMAL(20,2),
    market_cap DECIMAL(20,2),
    price_change_1h DECIMAL(10,6),
    price_change_24h DECIMAL(10,6),
    price_change_7d DECIMAL(10,6),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (timestamp, token_id)
);

-- Convert to hypertable
SELECT create_hypertable('token_prices', 'timestamp', chunk_time_interval => INTERVAL '1 hour');

-- Indexes
CREATE INDEX idx_token_prices_token ON token_prices (token_id, timestamp DESC);
CREATE INDEX idx_token_prices_price ON token_prices (price DESC, timestamp DESC);
```

### 3. User Management & Authentication

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    api_key_hash VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_api_key ON users (api_key_hash) WHERE api_key_hash IS NOT NULL;
CREATE INDEX idx_users_subscription ON users (subscription_tier, subscription_expires_at);
```

#### user_sessions
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    connection_id VARCHAR(255), -- WebSocket connection ID
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_sessions_token ON user_sessions (session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions (user_id, expires_at DESC);
CREATE INDEX idx_user_sessions_connection ON user_sessions (connection_id) WHERE connection_id IS NOT NULL;
```

### 4. Alert System

#### user_alerts
```sql
CREATE TABLE user_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('tvl_change', 'price_change', 'volume_spike', 'smart_money', 'risk_score')),
    
    -- Target configuration
    protocol_id UUID REFERENCES protocols(id) ON DELETE CASCADE,
    token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
    chain_id INTEGER,
    
    -- Condition configuration
    condition_operator VARCHAR(10) NOT NULL CHECK (condition_operator IN ('>', '<', '>=', '<=', '=', '!=')),
    threshold_value DECIMAL(20,8) NOT NULL,
    threshold_type VARCHAR(20) DEFAULT 'absolute' CHECK (threshold_type IN ('absolute', 'percentage')),
    
    -- Notification settings
    notification_channels TEXT[] DEFAULT ARRAY['email'], -- email, webhook, sms, push
    webhook_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    
    -- Throttling
    cooldown_minutes INTEGER DEFAULT 60,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure at least one target is specified
    CONSTRAINT alert_target_check CHECK (
        protocol_id IS NOT NULL OR token_id IS NOT NULL OR chain_id IS NOT NULL
    )
);

-- Indexes
CREATE INDEX idx_user_alerts_user ON user_alerts (user_id, is_active);
CREATE INDEX idx_user_alerts_protocol ON user_alerts (protocol_id) WHERE protocol_id IS NOT NULL;
CREATE INDEX idx_user_alerts_token ON user_alerts (token_id) WHERE token_id IS NOT NULL;
CREATE INDEX idx_user_alerts_type ON user_alerts (alert_type, is_active);
```

#### alert_history
```sql
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES user_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    triggered_value DECIMAL(20,8) NOT NULL,
    threshold_value DECIMAL(20,8) NOT NULL,
    message TEXT NOT NULL,
    notification_channels TEXT[] NOT NULL,
    delivery_status JSONB, -- Status per channel
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to hypertable for time-series data
SELECT create_hypertable('alert_history', 'created_at', chunk_time_interval => INTERVAL '7 days');

-- Indexes
CREATE INDEX idx_alert_history_alert ON alert_history (alert_id, created_at DESC);
CREATE INDEX idx_alert_history_user ON alert_history (user_id, created_at DESC);
```

### 5. Smart Money Tracking

#### wallets
```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    label VARCHAR(255),
    wallet_type VARCHAR(50) DEFAULT 'unknown' CHECK (wallet_type IN ('unknown', 'eoa', 'contract', 'exchange', 'bridge', 'defi_protocol')),
    
    -- Smart money metrics
    smart_money_score DECIMAL(5,4) DEFAULT 0.0000 CHECK (smart_money_score >= 0 AND smart_money_score <= 1),
    total_pnl_usd DECIMAL(20,2) DEFAULT 0,
    win_rate DECIMAL(5,4) DEFAULT 0.0000,
    total_trades INTEGER DEFAULT 0,
    avg_trade_size_usd DECIMAL(20,2) DEFAULT 0,
    
    -- Activity metrics
    first_seen_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (address, chain_id)
);

-- Indexes
CREATE INDEX idx_wallets_address ON wallets (address);
CREATE INDEX idx_wallets_chain ON wallets (chain_id);
CREATE INDEX idx_wallets_smart_money ON wallets (smart_money_score DESC) WHERE smart_money_score > 0.5;
CREATE INDEX idx_wallets_type ON wallets (wallet_type);
```

#### wallet_transactions
```sql
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    chain_id INTEGER NOT NULL,
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL, -- swap, transfer, mint, burn, etc.
    protocol_id UUID REFERENCES protocols(id),
    
    -- Token movements
    token_in_id UUID REFERENCES tokens(id),
    token_out_id UUID REFERENCES tokens(id),
    amount_in DECIMAL(30,18),
    amount_out DECIMAL(30,18),
    amount_in_usd DECIMAL(20,2),
    amount_out_usd DECIMAL(20,2),
    
    -- Performance tracking
    pnl_usd DECIMAL(20,2),
    gas_used BIGINT,
    gas_price DECIMAL(20,0),
    gas_cost_usd DECIMAL(10,2),
    
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    PRIMARY KEY (timestamp, wallet_id, transaction_hash)
);

-- Convert to hypertable
SELECT create_hypertable('wallet_transactions', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Indexes
CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions (wallet_id, timestamp DESC);
CREATE INDEX idx_wallet_transactions_hash ON wallet_transactions (transaction_hash);
CREATE INDEX idx_wallet_transactions_protocol ON wallet_transactions (protocol_id, timestamp DESC) WHERE protocol_id IS NOT NULL;
```

### 6. MEV Detection

#### mev_opportunities
```sql
CREATE TABLE mev_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_type VARCHAR(50) NOT NULL CHECK (opportunity_type IN ('arbitrage', 'liquidation', 'sandwich', 'frontrun', 'backrun')),
    chain_id INTEGER NOT NULL,
    block_number BIGINT NOT NULL,
    
    -- Opportunity details
    token_id UUID REFERENCES tokens(id),
    protocol_ids UUID[], -- Array of involved protocols
    estimated_profit_usd DECIMAL(20,2) NOT NULL,
    gas_cost_estimate_usd DECIMAL(10,2),
    net_profit_usd DECIMAL(20,2) GENERATED ALWAYS AS (estimated_profit_usd - COALESCE(gas_cost_estimate_usd, 0)) STORED,
    
    -- Execution details
    is_executed BOOLEAN DEFAULT false,
    executed_by VARCHAR(42), -- Wallet address
    actual_profit_usd DECIMAL(20,2),
    execution_transaction_hash VARCHAR(66),
    
    -- Timing
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional data
    metadata JSONB,
    
    PRIMARY KEY (detected_at, id)
);

-- Convert to hypertable
SELECT create_hypertable('mev_opportunities', 'detected_at', chunk_time_interval => INTERVAL '1 hour');

-- Indexes
CREATE INDEX idx_mev_opportunities_type ON mev_opportunities (opportunity_type, detected_at DESC);
CREATE INDEX idx_mev_opportunities_chain ON mev_opportunities (chain_id, detected_at DESC);
CREATE INDEX idx_mev_opportunities_profit ON mev_opportunities (net_profit_usd DESC, detected_at DESC);
CREATE INDEX idx_mev_opportunities_executed ON mev_opportunities (is_executed, detected_at DESC);
```

### 7. Risk Monitoring

#### risk_assessments
```sql
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN ('protocol', 'token', 'wallet', 'transaction')),
    target_id UUID NOT NULL, -- References protocols.id, tokens.id, wallets.id, etc.
    
    -- Risk scores (0-100)
    overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    liquidity_risk_score INTEGER CHECK (liquidity_risk_score >= 0 AND liquidity_risk_score <= 100),
    smart_contract_risk_score INTEGER CHECK (smart_contract_risk_score >= 0 AND smart_contract_risk_score <= 100),
    governance_risk_score INTEGER CHECK (governance_risk_score >= 0 AND governance_risk_score <= 100),
    market_risk_score INTEGER CHECK (market_risk_score >= 0 AND market_risk_score <= 100),
    
    -- Risk factors
    risk_factors TEXT[],
    risk_description TEXT,
    
    -- Assessment metadata
    assessment_version VARCHAR(10) DEFAULT '1.0',
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    PRIMARY KEY (created_at, target_id, assessment_type)
);

-- Convert to hypertable
SELECT create_hypertable('risk_assessments', 'created_at', chunk_time_interval => INTERVAL '1 day');

-- Indexes
CREATE INDEX idx_risk_assessments_target ON risk_assessments (target_id, assessment_type, created_at DESC);
CREATE INDEX idx_risk_assessments_score ON risk_assessments (overall_risk_score DESC, created_at DESC);
CREATE INDEX idx_risk_assessments_type ON risk_assessments (assessment_type, created_at DESC);
```

---

## 🔧 **Database Functions & Triggers**

### 1. Automatic Timestamp Updates
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_protocols_updated_at BEFORE UPDATE ON protocols
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_alerts_updated_at BEFORE UPDATE ON user_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Smart Money Score Calculation
```sql
-- Function to calculate smart money score
CREATE OR REPLACE FUNCTION calculate_smart_money_score(wallet_uuid UUID)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    total_trades INTEGER;
    win_rate DECIMAL(5,4);
    avg_profit DECIMAL(20,2);
    score DECIMAL(5,4);
BEGIN
    -- Get wallet statistics
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE pnl_usd > 0)::DECIMAL / GREATEST(COUNT(*), 1),
        AVG(pnl_usd)
    INTO total_trades, win_rate, avg_profit
    FROM wallet_transactions 
    WHERE wallet_id = wallet_uuid 
    AND timestamp > NOW() - INTERVAL '90 days';
    
    -- Calculate score (simplified algorithm)
    score := LEAST(1.0, 
        (win_rate * 0.4) + 
        (LEAST(avg_profit / 10000, 1) * 0.3) + 
        (LEAST(total_trades / 1000.0, 1) * 0.3)
    );
    
    RETURN COALESCE(score, 0.0000);
END;
$$ LANGUAGE plpgsql;
```

### 3. Alert Condition Evaluation
```sql
-- Function to check alert conditions
CREATE OR REPLACE FUNCTION evaluate_alert_condition(
    alert_uuid UUID,
    current_value DECIMAL(20,8)
) RETURNS BOOLEAN AS $$
DECLARE
    alert_record user_alerts%ROWTYPE;
    should_trigger BOOLEAN := false;
BEGIN
    SELECT * INTO alert_record FROM user_alerts WHERE id = alert_uuid;
    
    IF NOT FOUND OR NOT alert_record.is_active THEN
        RETURN false;
    END IF;
    
    -- Check cooldown period
    IF alert_record.last_triggered_at IS NOT NULL AND 
       alert_record.last_triggered_at + (alert_record.cooldown_minutes || ' minutes')::INTERVAL > NOW() THEN
        RETURN false;
    END IF;
    
    -- Evaluate condition
    CASE alert_record.condition_operator
        WHEN '>' THEN should_trigger := current_value > alert_record.threshold_value;
        WHEN '<' THEN should_trigger := current_value < alert_record.threshold_value;
        WHEN '>=' THEN should_trigger := current_value >= alert_record.threshold_value;
        WHEN '<=' THEN should_trigger := current_value <= alert_record.threshold_value;
        WHEN '=' THEN should_trigger := current_value = alert_record.threshold_value;
        WHEN '!=' THEN should_trigger := current_value != alert_record.threshold_value;
    END CASE;
    
    RETURN should_trigger;
END;
$$ LANGUAGE plpgsql;
```

---

## 📈 **Performance Optimization**

### 1. Partitioning Strategy
```sql
-- Partition large tables by time
CREATE TABLE protocol_metrics_2025_10 PARTITION OF protocol_metrics
FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2025-11-01 00:00:00+00');

CREATE TABLE protocol_metrics_2025_11 PARTITION OF protocol_metrics
FOR VALUES FROM ('2025-11-01 00:00:00+00') TO ('2025-12-01 00:00:00+00');
```

### 2. Materialized Views for Analytics
```sql
-- Protocol summary view
CREATE MATERIALIZED VIEW protocol_summary AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.chain_id,
    COALESCE(latest_tvl.value, 0) as current_tvl,
    COALESCE(tvl_change.change_24h, 0) as tvl_change_24h,
    p.updated_at
FROM protocols p
LEFT JOIN LATERAL (
    SELECT value 
    FROM protocol_metrics pm 
    WHERE pm.protocol_id = p.id 
    AND pm.metric_type = 'tvl' 
    ORDER BY timestamp DESC 
    LIMIT 1
) latest_tvl ON true
LEFT JOIN LATERAL (
    SELECT 
        (latest.value - previous.value) / NULLIF(previous.value, 0) as change_24h
    FROM (
        SELECT value 
        FROM protocol_metrics 
        WHERE protocol_id = p.id 
        AND metric_type = 'tvl' 
        ORDER BY timestamp DESC 
        LIMIT 1
    ) latest
    CROSS JOIN (
        SELECT value 
        FROM protocol_metrics 
        WHERE protocol_id = p.id 
        AND metric_type = 'tvl' 
        AND timestamp < NOW() - INTERVAL '24 hours'
        ORDER BY timestamp DESC 
        LIMIT 1
    ) previous
) tvl_change ON true
WHERE p.is_active = true;

-- Refresh materialized view every 5 minutes
CREATE INDEX idx_protocol_summary_tvl ON protocol_summary (current_tvl DESC);
```

### 3. Connection Pooling Configuration
```sql
-- PgBouncer configuration
-- pool_mode = transaction
-- max_client_conn = 1000
-- default_pool_size = 25
-- max_db_connections = 100
```

---

## 🔒 **Security & Access Control**

### 1. Row Level Security (RLS)
```sql
-- Enable RLS on user-specific tables
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for user alerts
CREATE POLICY user_alerts_policy ON user_alerts
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());

-- Policy for alert history
CREATE POLICY alert_history_policy ON alert_history
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());
```

### 2. Data Encryption
```sql
-- Encrypt sensitive fields
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt API keys
CREATE OR REPLACE FUNCTION encrypt_api_key(api_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(api_key, gen_salt('bf', 8));
END;
$$ LANGUAGE plpgsql;
```

---

**This comprehensive database schema provides the foundation for DeFiLlama's On-Chain Services Platform, supporting real-time analytics, user management, alerts, smart money tracking, and MEV detection with optimized performance and security.**
