# Technical Specification: EPIC-3 Portfolio Management

**Document Version**: 1.0  
**Date**: 2025-10-17  
**Status**: Draft for Review  
**EPIC ID**: EPIC-3  
**EPIC Name**: Portfolio Management System

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-17 | Winston (Architect) | Initial draft |

---

## 1. OVERVIEW

### 1.1 EPIC Summary

**EPIC-3: Portfolio Management** provides comprehensive multi-chain portfolio tracking and performance analytics.

**Business Value**: $3.75M ARR (15% of total)  
**Story Points**: 110 points  
**Timeline**: Q1 2026 (Months 4-6)  
**Priority**: P1 (High)

### 1.2 Features (6 Features)

| Feature ID | Feature Name | Story Points | Timeline |
|------------|--------------|--------------|----------|
| F-007 | Multi-Chain Portfolio Tracking | 25 | Week 1-3 |
| F-008 | Real-Time Portfolio Updates | 20 | Week 4-5 |
| F-009 | Performance Analytics | 20 | Week 6-7 |
| F-010 | Asset Allocation | 15 | Week 8-9 |
| F-011 | Historical Performance | 15 | Week 10-11 |
| F-012 | Portfolio Comparison | 15 | Week 12 |

### 1.3 Success Metrics

- **User Adoption**: 70% of premium users track portfolios
- **Update Frequency**: Real-time updates (<1 minute)
- **Accuracy**: >99% portfolio value accuracy
- **Performance**: <2s page load time
- **Engagement**: 50% daily active users

---

## 2. ARCHITECTURE

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 PORTFOLIO SERVICE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Portfolio    │  │ Performance  │  │ Asset        │     │
│  │ Aggregator   │  │ Calculator   │  │ Allocator    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Multi-Chain  │  │ P&L          │  │ Rebalancing  │     │
│  │ Data Fetcher │  │ Calculator   │  │ Suggestions  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │ Redis Cache  │  │ WebSocket    │     │
│  │ (Partitioned)│  │              │  │ (Real-time)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. DATA MODEL

### 3.1 Database Schema (✅ ALIGNED WITH EXISTING PATTERN - PostgreSQL)

**Based on**: `defi/src/alerts/db.ts` (existing database pattern)

**⚠️ IMPORTANT**: Using **PostgreSQL** (NOT TimescaleDB) - consistent with existing infrastructure

```sql
-- Portfolio Snapshots (Time-Series Data in PostgreSQL)
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- String user ID (not UUID reference)

  -- Snapshot metadata
  snapshot_timestamp TIMESTAMP NOT NULL,
  snapshot_type VARCHAR(20) DEFAULT 'auto' CHECK (snapshot_type IN (
    'auto',    -- Automatic hourly snapshot
    'manual',  -- User-triggered snapshot
    'daily',   -- Daily aggregation
    'weekly',  -- Weekly aggregation
    'monthly'  -- Monthly aggregation
  )),

  -- Portfolio totals
  total_value_usd NUMERIC(20, 8) NOT NULL,
  total_assets_count INTEGER,
  total_chains_count INTEGER,

  -- Breakdowns (JSONB)
  chain_breakdown JSONB NOT NULL,
  asset_breakdown JSONB NOT NULL,
  category_breakdown JSONB NOT NULL,
  protocol_breakdown JSONB,

  -- Performance metrics (optional)
  daily_change_usd NUMERIC(20, 8),
  daily_change_percent NUMERIC(10, 4),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for time-series queries
CREATE INDEX idx_portfolio_snapshots_user_id ON portfolio_snapshots(user_id);
CREATE INDEX idx_portfolio_snapshots_timestamp ON portfolio_snapshots(snapshot_timestamp DESC);
CREATE INDEX idx_portfolio_snapshots_user_timestamp ON portfolio_snapshots(user_id, snapshot_timestamp DESC);
CREATE INDEX idx_portfolio_snapshots_type ON portfolio_snapshots(snapshot_type);

-- Composite index for common queries
CREATE INDEX idx_portfolio_snapshots_user_type_timestamp
ON portfolio_snapshots(user_id, snapshot_type, snapshot_timestamp DESC);

-- Portfolio Assets (Current Holdings)
CREATE TABLE portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- String user ID (not UUID reference)

  -- Asset identification
  chain_id VARCHAR(50) NOT NULL,
  asset_symbol VARCHAR(100) NOT NULL,
  asset_address VARCHAR(255),
  asset_type VARCHAR(50) CHECK (asset_type IN (
    'token',
    'nft',
    'lp_token',
    'staked',
    'vested'
  )),

  -- Balance & value
  balance NUMERIC(36, 18) NOT NULL,
  value_usd NUMERIC(20, 8) NOT NULL,
  price_usd NUMERIC(20, 8),

  -- Metadata
  protocol_name VARCHAR(255),
  category VARCHAR(50), -- 'DeFi', 'NFT', 'Staking', etc.

  -- Cost basis (for P&L calculation)
  cost_basis_usd NUMERIC(20, 8),
  unrealized_pnl_usd NUMERIC(20, 8),

  -- Timestamps
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_portfolio_assets_user_id ON portfolio_assets(user_id);
CREATE INDEX idx_portfolio_assets_chain_id ON portfolio_assets(chain_id);
CREATE INDEX idx_portfolio_assets_asset_symbol ON portfolio_assets(asset_symbol);
CREATE INDEX idx_portfolio_assets_updated_at ON portfolio_assets(updated_at);

-- Composite index for common queries
CREATE INDEX idx_portfolio_assets_user_chain
ON portfolio_assets(user_id, chain_id);

-- Unique constraint (one asset per user per chain)
CREATE UNIQUE INDEX idx_portfolio_assets_unique
ON portfolio_assets(user_id, chain_id, asset_address)
WHERE asset_address IS NOT NULL;

-- Portfolio Wallets (User's Tracked Wallets)
CREATE TABLE portfolio_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,

  -- Wallet details
  wallet_address VARCHAR(255) NOT NULL,
  wallet_name VARCHAR(255),
  chain_id VARCHAR(50) NOT NULL,

  -- Metadata
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_portfolio_wallets_user_id ON portfolio_wallets(user_id);
CREATE INDEX idx_portfolio_wallets_wallet_address ON portfolio_wallets(wallet_address);
CREATE INDEX idx_portfolio_wallets_chain_id ON portfolio_wallets(chain_id);

-- Unique constraint (one wallet per user per chain)
CREATE UNIQUE INDEX idx_portfolio_wallets_unique
ON portfolio_wallets(user_id, wallet_address, chain_id);

-- Portfolio Performance (Aggregated Metrics)
CREATE TABLE portfolio_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,

  -- Time period
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  period_type VARCHAR(20) CHECK (period_type IN (
    '1h', '24h', '7d', '30d', '90d', '1y', 'all'
  )),

  -- Performance metrics
  start_value_usd NUMERIC(20, 8) NOT NULL,
  end_value_usd NUMERIC(20, 8) NOT NULL,
  absolute_gain_usd NUMERIC(20, 8) NOT NULL,
  percentage_gain NUMERIC(10, 4) NOT NULL,

  -- Risk metrics
  volatility NUMERIC(10, 4),
  sharpe_ratio NUMERIC(10, 4),
  max_drawdown NUMERIC(10, 4),

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_portfolio_performance_user_id ON portfolio_performance(user_id);
CREATE INDEX idx_portfolio_performance_period_type ON portfolio_performance(period_type);
CREATE INDEX idx_portfolio_performance_user_period
ON portfolio_performance(user_id, period_type, period_end DESC);

-- Triggers to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolio_assets_updated_at
BEFORE UPDATE ON portfolio_assets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_wallets_updated_at
BEFORE UPDATE ON portfolio_wallets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Partitioning Strategy (for large datasets)
-- Note: PostgreSQL native partitioning (not TimescaleDB)
-- Partition portfolio_snapshots by month
CREATE TABLE portfolio_snapshots_2025_10 PARTITION OF portfolio_snapshots
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE portfolio_snapshots_2025_11 PARTITION OF portfolio_snapshots
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Auto-create partitions using pg_partman (optional)
-- Or create partitions manually as needed
```

**Key Differences from Original**:
1. ✅ **PostgreSQL** (NOT TimescaleDB) - consistent with existing infrastructure
2. ✅ **user_id**: `VARCHAR(255)` (not UUID reference) - follows existing pattern
3. ✅ **Specific naming**: `chain_id`, `asset_symbol`, `snapshot_timestamp`, `total_value_usd`
4. ✅ **High precision**: `NUMERIC(36, 18)` for balances, `NUMERIC(20, 8)` for values
5. ✅ **Added portfolio_wallets**: Track user's wallets across chains
6. ✅ **Added portfolio_performance**: Pre-calculated performance metrics
7. ✅ **Native partitioning**: PostgreSQL partitioning (not TimescaleDB hypertables)
8. ✅ **Removed TimescaleDB functions**: `create_hypertable`, `add_retention_policy`, `add_compression_policy`
9. ✅ **Added snapshot_type**: Differentiate auto/manual/daily/weekly/monthly snapshots
10. ✅ **Added cost_basis**: For P&L calculation

**Why PostgreSQL Instead of TimescaleDB**:
- ✅ **Existing infrastructure**: DeFiLlama uses PostgreSQL (not TimescaleDB)
- ✅ **Simpler deployment**: No need to install TimescaleDB extension
- ✅ **Native partitioning**: PostgreSQL 10+ has native partitioning
- ✅ **Cost-effective**: No additional licensing or infrastructure
- ✅ **Performance**: PostgreSQL partitioning is sufficient for 125K users

**Performance Optimization**:
- ✅ **Partitioning**: Monthly partitions for portfolio_snapshots
- ✅ **Indexes**: Composite indexes for common queries
- ✅ **Aggregation**: Pre-calculated performance metrics in portfolio_performance table
- ✅ **Redis caching**: Cache hot data (current portfolio, recent snapshots)

---

## 4. API SPECIFICATION

### 4.1 REST API Endpoints

**Get Portfolio Overview** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
GET /v2/premium/portfolio
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "user_id": "user-123",
    "total_value_usd": 100000.00,
    "total_assets_count": 15,
    "total_chains_count": 5,
    "daily_change_usd": 5000.00,
    "daily_change_percent": 5.26,
    "chains": [
      {
        "chain_id": "ethereum",
        "value_usd": 50000.00,
        "asset_count": 8,
        "percentage": 50.0
      },
      {
        "chain_id": "polygon",
        "value_usd": 30000.00,
        "asset_count": 5,
        "percentage": 30.0
      },
      {
        "chain_id": "arbitrum",
        "value_usd": 20000.00,
        "asset_count": 2,
        "percentage": 20.0
      }
    ],
    "assets": [
      {
        "asset_symbol": "ETH",
        "asset_address": "0x0000000000000000000000000000000000000000",
        "chain_id": "ethereum",
        "balance": "10.5",
        "value_usd": 20000.00,
        "price_usd": 1904.76,
        "percentage": 20.0,
        "unrealized_pnl_usd": 2000.00
      },
      {
        "asset_symbol": "USDC",
        "asset_address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "chain_id": "ethereum",
        "balance": "50000.0",
        "value_usd": 50000.00,
        "price_usd": 1.0,
        "percentage": 50.0,
        "unrealized_pnl_usd": 0.00
      }
    ],
    "categories": [
      { "category": "DeFi", "value_usd": 60000.00, "percentage": 60.0 },
      { "category": "NFT", "value_usd": 20000.00, "percentage": 20.0 },
      { "category": "Staking", "value_usd": 20000.00, "percentage": 20.0 }
    ],
    "protocols": [
      { "protocol_name": "Uniswap", "value_usd": 30000.00, "percentage": 30.0 },
      { "protocol_name": "Aave", "value_usd": 20000.00, "percentage": 20.0 }
    ],
    "last_updated": "2025-10-17T10:00:00Z"
  }
}
```

**Get Performance Metrics** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
GET /v2/premium/portfolio/performance?period=30d
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "user_id": "user-123",
    "period_type": "30d",
    "period_start": "2025-09-17T00:00:00Z",
    "period_end": "2025-10-17T00:00:00Z",
    "start_value_usd": 90000.00,
    "end_value_usd": 100000.00,
    "absolute_gain_usd": 10000.00,
    "percentage_gain": 11.11,
    "roi": 11.11,
    "volatility": 15.5,
    "sharpe_ratio": 1.5,
    "max_drawdown": -8.2,
    "calculated_at": "2025-10-17T10:00:00Z"
  }
}
```

**Get Historical Performance** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
GET /v2/premium/portfolio/history?period=90d&interval=1d
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "user_id": "user-123",
    "period": "90d",
    "interval": "1d",
    "snapshots": [
      {
        "snapshot_timestamp": "2025-07-19T00:00:00Z",
        "total_value_usd": 90000.00,
        "daily_change_usd": 0.00,
        "daily_change_percent": 0.00
      },
      {
        "snapshot_timestamp": "2025-07-20T00:00:00Z",
        "total_value_usd": 92000.00,
        "daily_change_usd": 2000.00,
        "daily_change_percent": 2.22
      },
      ...
      {
        "snapshot_timestamp": "2025-10-17T00:00:00Z",
        "total_value_usd": 100000.00,
        "daily_change_usd": 1000.00,
        "daily_change_percent": 1.01
      }
    ],
    "total_snapshots": 90
  }
}
```

**Add Wallet** (✅ NEW - ALIGNED WITH ACTUAL IMPLEMENTATION):
```
POST /v2/premium/portfolio/wallets
Authorization: Bearer <JWT>

Request Body:
{
  "wallet_address": "0x123...",
  "wallet_name": "My Main Wallet",
  "chain_id": "ethereum",
  "is_primary": true
}

Response (201 Created):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-123",
    "wallet_address": "0x123...",
    "wallet_name": "My Main Wallet",
    "chain_id": "ethereum",
    "is_primary": true,
    "is_active": true,
    "created_at": "2025-10-17T10:00:00Z"
  }
}
```

**List Wallets** (✅ NEW - ALIGNED WITH ACTUAL IMPLEMENTATION):
```
GET /v2/premium/portfolio/wallets
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "wallets": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "wallet_address": "0x123...",
        "wallet_name": "My Main Wallet",
        "chain_id": "ethereum",
        "is_primary": true,
        "is_active": true,
        "created_at": "2025-10-17T10:00:00Z"
      }
    ],
    "total": 3
  }
}
```

**Delete Wallet** (✅ NEW - ALIGNED WITH ACTUAL IMPLEMENTATION):
```
DELETE /v2/premium/portfolio/wallets/{id}
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "message": "Wallet removed successfully"
}
```

### 4.2 WebSocket API

**Subscribe to Portfolio Updates**:
```json
{
  "type": "subscribe",
  "channel": "portfolio",
  "userId": "user_123"
}
```

**Receive Portfolio Update**:
```json
{
  "type": "portfolio_update",
  "data": {
    "totalValue": 100500,
    "change": 500,
    "changePercent": 0.5
  }
}
```

---

## 5. IMPLEMENTATION DETAILS

### 5.1 Technology Stack

- **Framework**: NestJS 10.3+
- **Database**: PostgreSQL 16+ (with native partitioning)
- **Cache**: Redis 7+
- **WebSocket**: ws 8.16+
- **Charts**: ECharts 6.0.0 (frontend)

### 5.2 Key Classes

**PortfolioAggregatorService**:
```typescript
@Injectable()
export class PortfolioAggregatorService {
  async aggregatePortfolio(userId: string): Promise<Portfolio> {
    // Fetch balances from 100+ chains
    // Calculate total value
    // Categorize assets
  }
}
```

**PerformanceCalculatorService**:
```typescript
@Injectable()
export class PerformanceCalculatorService {
  async calculatePerformance(
    userId: string,
    period: string
  ): Promise<PerformanceMetrics> {
    // Calculate P&L, ROI, Sharpe ratio
  }
}
```

---

## 6. TESTING STRATEGY

### 6.1 Unit Tests

**Portfolio Aggregation Service**:
- ✅ Test single wallet aggregation (1 chain, 1 wallet)
- ✅ Test multi-wallet aggregation (10 wallets, 100+ chains)
- ✅ Test asset deduplication across chains
- ✅ Test balance calculation with different token decimals
- ✅ Test USD value conversion with price feeds
- ✅ Test error handling (RPC failures, invalid addresses)

**Performance Calculation Service**:
- ✅ Test P&L calculation (realized + unrealized)
- ✅ Test ROI calculation (time-weighted, money-weighted)
- ✅ Test Sharpe ratio calculation
- ✅ Test max drawdown calculation
- ✅ Test historical performance queries (1D, 7D, 30D, 1Y, All)
- ✅ Test edge cases (zero balance, negative P&L)

**Asset Allocation Service**:
- ✅ Test allocation by asset type (tokens, NFTs, LP positions)
- ✅ Test allocation by chain (Ethereum, BSC, Polygon, etc.)
- ✅ Test allocation by protocol (Uniswap, Aave, Compound, etc.)
- ✅ Test rebalancing suggestions
- ✅ Test risk scoring (concentration risk, protocol risk)

**Target**: 85% code coverage (increased from 80%)

---

### 6.2 Integration Tests

**Multi-Chain Data Fetching**:
- ✅ Test fetching from 100+ chains simultaneously
- ✅ Test RPC failover (primary → backup → tertiary)
- ✅ Test rate limiting handling (429 errors)
- ✅ Test data consistency across chains
- ✅ Test timeout handling (5s timeout per chain)

**Real-Time Updates**:
- ✅ Test WebSocket connection establishment
- ✅ Test real-time balance updates (<5s latency)
- ✅ Test reconnection logic (auto-reconnect on disconnect)
- ✅ Test message ordering (FIFO)
- ✅ Test concurrent updates (10K users)

**Historical Data Queries**:
- ✅ Test PostgreSQL materialized views (1h, 1d, 1w)
- ✅ Test time-series queries (1D, 7D, 30D, 1Y, All)
- ✅ Test data retention (90 days raw, 2 years aggregated)
- ✅ Test query performance (<2s for 1 year data)

**API Integration**:
- ✅ Test REST API endpoints (GET /portfolio, GET /performance, etc.)
- ✅ Test authentication (JWT validation)
- ✅ Test authorization (user can only access own portfolio)
- ✅ Test rate limiting (per-tier limits)
- ✅ Test error responses (400, 401, 403, 404, 500)

---

### 6.3 Performance Tests

**Load Testing**:
- ✅ Test 125K users × 24 snapshots/day = 3M snapshots/day
- ✅ Test 10K concurrent API requests (p95 <200ms, p99 <500ms)
- ✅ Test 10K concurrent WebSocket connections
- ✅ Test database write throughput (3M writes/day = 35 writes/sec)
- ✅ Test database read throughput (10K reads/min = 167 reads/sec)

**Query Performance**:
- ✅ Test portfolio aggregation (<30s for 10 wallets, 100+ chains)
- ✅ Test performance calculation (<2s for 1 year data)
- ✅ Test asset allocation (<1s for 1,000 assets)
- ✅ Test historical queries (<2s for 1 year data)
- ✅ Test real-time updates (<5s latency)

**Scalability Testing**:
- ✅ Test horizontal scaling (Lambda auto-scaling)
- ✅ Test database scaling (PostgreSQL read replicas)
- ✅ Test cache scaling (Redis cluster)
- ✅ Test WebSocket scaling (10K → 50K → 100K connections)

---

### 6.4 End-to-End Tests

**User Flows**:
- ✅ Test add wallet → fetch balances → view portfolio
- ✅ Test view performance → view P&L → view ROI
- ✅ Test view asset allocation → view rebalancing suggestions
- ✅ Test real-time updates → balance changes → notifications
- ✅ Test historical data → view charts → export CSV

**Multi-Chain Scenarios**:
- ✅ Test user with 10 wallets across 100+ chains
- ✅ Test user with 1,000+ assets (tokens, NFTs, LP positions)
- ✅ Test user with complex DeFi positions (Aave, Compound, Uniswap)
- ✅ Test user with cross-chain assets (bridged tokens)

**Edge Cases**:
- ✅ Test empty portfolio (no assets)
- ✅ Test single asset portfolio
- ✅ Test portfolio with only NFTs
- ✅ Test portfolio with only LP positions
- ✅ Test portfolio with negative P&L

---

### 6.5 Security Tests

**Authentication & Authorization**:
- ✅ Test JWT validation (valid, expired, invalid)
- ✅ Test user isolation (user A cannot access user B's portfolio)
- ✅ Test rate limiting (per-tier limits)
- ✅ Test API key validation (valid, invalid, revoked)

**Data Security**:
- ✅ Test encryption at rest (AES-256)
- ✅ Test encryption in transit (TLS 1.3)
- ✅ Test SQL injection prevention (parameterized queries)
- ✅ Test XSS prevention (input sanitization)

**Privacy**:
- ✅ Test wallet address anonymization (optional)
- ✅ Test data deletion (GDPR compliance)
- ✅ Test audit logging (all operations logged)

---

## 7. DEPLOYMENT

### 7.1 Infrastructure

- **Lambda**: Portfolio API
- **ECS Fargate**: Portfolio Aggregator (background job)
- **PostgreSQL**: RDS Premium DB (db.r6g.xlarge)
- **Redis**: ElastiCache (cache.r6g.large)
- **WebSocket**: ECS Fargate

### 7.2 Deployment Strategy

- Blue-green deployment
- Canary deployment for high-risk changes

---

**END OF DOCUMENT**

