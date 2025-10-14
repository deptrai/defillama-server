# Story 2.1.3: Liquidity Analysis Tools

**Epic**: 2.1 Advanced DeFi Analytics  
**Status**: Ready for Implementation  
**Priority**: P2  
**Effort**: 9 points  
**Value**: Medium

---

## User Story

**As a** protocol team member  
**I want** to analyze liquidity depth and distribution  
**So that** I can optimize my protocol's liquidity incentives

---

## Acceptance Criteria

### AC1: Liquidity Depth Charts ✅
- [ ] Order book depth visualization
- [ ] Bid/ask spread analysis
- [ ] Liquidity concentration metrics
- [ ] Price impact calculations
- [ ] Slippage estimates for different trade sizes

### AC2: Liquidity Provider Analysis ✅
- [ ] LP position tracking
- [ ] LP profitability analysis
- [ ] LP entry/exit patterns
- [ ] Top LP rankings
- [ ] LP concentration metrics

### AC3: Impermanent Loss Calculations ✅
- [ ] Real-time IL calculations
- [ ] Historical IL tracking
- [ ] IL vs fee earnings comparison
- [ ] IL risk scoring
- [ ] IL projections

### AC4: Liquidity Migration Tracking ✅
- [ ] Track liquidity flows between protocols
- [ ] Identify liquidity migration events
- [ ] Analyze migration causes
- [ ] Migration impact on TVL
- [ ] Migration alerts

---

## Technical Specification

### Database Schema

**1. liquidity_pools**
```sql
CREATE TABLE liquidity_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  pool_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Pool Info
  pool_name VARCHAR(255),
  token0_symbol VARCHAR(50),
  token1_symbol VARCHAR(50),
  pool_type VARCHAR(50), -- 'uniswap_v2', 'uniswap_v3', 'curve', etc.
  
  -- Liquidity Metrics
  total_liquidity DECIMAL(20, 2),
  token0_reserve DECIMAL(30, 10),
  token1_reserve DECIMAL(30, 10),
  
  -- Depth Metrics
  bid_depth_1pct DECIMAL(20, 2),
  ask_depth_1pct DECIMAL(20, 2),
  bid_ask_spread DECIMAL(10, 6),
  
  -- Activity
  volume_24h DECIMAL(20, 2),
  fee_24h DECIMAL(20, 2),
  lp_count INTEGER,
  
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_liquidity_pools_protocol_id ON liquidity_pools(protocol_id);
CREATE INDEX idx_liquidity_pools_chain_id ON liquidity_pools(chain_id);
CREATE INDEX idx_liquidity_pools_liquidity ON liquidity_pools(total_liquidity DESC);
```

**2. liquidity_providers**
```sql
CREATE TABLE liquidity_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES liquidity_pools(id),
  wallet_address VARCHAR(255) NOT NULL,
  
  -- Position
  liquidity_amount DECIMAL(30, 10),
  token0_amount DECIMAL(30, 10),
  token1_amount DECIMAL(30, 10),
  position_value_usd DECIMAL(20, 2),
  
  -- Performance
  fees_earned DECIMAL(20, 2),
  impermanent_loss DECIMAL(20, 2),
  net_profit DECIMAL(20, 2),
  roi DECIMAL(10, 4),
  
  -- Timing
  entry_timestamp TIMESTAMP,
  exit_timestamp TIMESTAMP,
  position_age_days INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_liquidity_providers_pool_id ON liquidity_providers(pool_id);
CREATE INDEX idx_liquidity_providers_wallet ON liquidity_providers(wallet_address);
CREATE INDEX idx_liquidity_providers_value ON liquidity_providers(position_value_usd DESC);
```

**3. liquidity_migrations**
```sql
CREATE TABLE liquidity_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_protocol_id VARCHAR(255) NOT NULL,
  to_protocol_id VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Migration Details
  wallet_address VARCHAR(255) NOT NULL,
  amount_usd DECIMAL(20, 2) NOT NULL,
  token_symbols VARCHAR(255)[],
  
  -- Timing
  migration_timestamp TIMESTAMP NOT NULL,
  
  -- Context
  reason VARCHAR(255), -- 'higher_apy', 'incentives', 'risk', etc.
  from_apy DECIMAL(10, 4),
  to_apy DECIMAL(10, 4),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_liquidity_migrations_from_protocol ON liquidity_migrations(from_protocol_id);
CREATE INDEX idx_liquidity_migrations_to_protocol ON liquidity_migrations(to_protocol_id);
CREATE INDEX idx_liquidity_migrations_timestamp ON liquidity_migrations(migration_timestamp DESC);
```

### API Endpoints

#### 1. Get Liquidity Depth
```typescript
GET /v1/analytics/liquidity/:poolId/depth

Response:
{
  poolId: string;
  poolName: string;
  depth: {
    bids: Array<{ price: number; amount: number; total: number }>;
    asks: Array<{ price: number; amount: number; total: number }>;
    spread: number;
    midPrice: number;
  };
  priceImpact: {
    buy: { '1k': number; '10k': number; '100k': number; '1m': number };
    sell: { '1k': number; '10k': number; '100k': number; '1m': number };
  };
}
```

#### 2. Get LP Analysis
```typescript
GET /v1/analytics/liquidity/:poolId/providers

Query Parameters:
- sortBy: 'position_value' | 'fees_earned' | 'roi' | 'position_age'
- limit: number (default: 20)

Response:
{
  poolId: string;
  providers: Array<{
    walletAddress: string;
    position: {
      liquidityAmount: number;
      valueUsd: number;
      token0Amount: number;
      token1Amount: number;
    };
    performance: {
      feesEarned: number;
      impermanentLoss: number;
      netProfit: number;
      roi: number;
    };
    timing: {
      entryDate: string;
      positionAgeDays: number;
    };
  }>;
  summary: {
    totalProviders: number;
    totalLiquidity: number;
    avgRoi: number;
    concentration: number; // % held by top 10
  };
}
```

#### 3. Get Impermanent Loss
```typescript
GET /v1/analytics/liquidity/:poolId/impermanent-loss

Query Parameters:
- walletAddress: string (optional)
- timeRange: '7d' | '30d' | '90d' | '1y'

Response:
{
  poolId: string;
  impermanentLoss: {
    current: number;
    history: Array<{ timestamp: string; il: number; fees: number }>;
    vsHodl: number; // % difference vs holding
  };
  riskScore: number; // 0-100
  projections: {
    next7d: { best: number; worst: number; expected: number };
    next30d: { best: number; worst: number; expected: number };
  };
}
```

#### 4. Get Liquidity Migrations
```typescript
GET /v1/analytics/liquidity/migrations

Query Parameters:
- protocolId: string (optional)
- chainId: string (optional)
- timeRange: '24h' | '7d' | '30d'
- direction: 'inflow' | 'outflow' | 'both' (default: 'both')

Response:
{
  migrations: Array<{
    fromProtocol: string;
    toProtocol: string;
    chainId: string;
    amountUsd: number;
    walletCount: number;
    avgAmount: number;
    reason: string;
    timestamp: string;
  }>;
  summary: {
    totalMigrated: number;
    netFlow: number; // positive = inflow, negative = outflow
    topDestinations: Array<{ protocol: string; amount: number }>;
    topSources: Array<{ protocol: string; amount: number }>;
  };
}
```

---

## Implementation Plan

### Phase 1: Data Collection (3 days)
- Create database schema
- Implement liquidity depth tracking
- Build LP position tracking
- Create IL calculation engine
- Implement migration detection

### Phase 2: API Implementation (3 days)
- Implement 4 API endpoints
- Add caching layer
- Create API documentation
- Integration tests

### Phase 3: Testing (3 days)
- Performance testing
- IL calculation validation
- Migration detection accuracy
- Query optimization

---

## Dependencies

- Story 1.4: Advanced Query Processor
- Story 2.1.1: Protocol Performance Dashboard
- Blockchain data indexing infrastructure

---

## Success Metrics

- API response time <500ms (p95)
- IL calculation accuracy >99%
- Migration detection accuracy >95%
- Support 10,000+ liquidity pools

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-14  
**Author**: AI Development Team

