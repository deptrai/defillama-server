# Story 2.1.1: Protocol Performance Dashboard

**Epic**: 2.1 Advanced DeFi Analytics  
**Status**: Ready for Implementation  
**Priority**: P1  
**Effort**: 10 points  
**Value**: High

---

## User Story

**As a** DeFi researcher  
**I want** to analyze detailed protocol performance metrics  
**So that** I can conduct thorough investment research

---

## Acceptance Criteria

### AC1: APY/APR Calculations and Trends ✅
- [ ] Calculate real-time APY/APR for all protocols
- [ ] Historical APY/APR trends (7d, 30d, 90d, 1y)
- [ ] APY/APR breakdown by pool/vault
- [ ] Yield source attribution (trading fees, incentives, lending)
- [ ] Comparative APY/APR charts across protocols

### AC2: User Retention and Activity Metrics ✅
- [ ] Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)
- [ ] User retention cohort analysis
- [ ] New vs returning user metrics
- [ ] User churn rate calculations
- [ ] User growth trends

### AC3: Revenue and Fee Analysis ✅
- [ ] Protocol revenue tracking (daily, weekly, monthly)
- [ ] Fee breakdown by type (trading, withdrawal, performance)
- [ ] Revenue per user metrics
- [ ] Fee trends and projections
- [ ] Revenue comparison across protocols

### AC4: Competitive Benchmarking ✅
- [ ] Side-by-side protocol comparison
- [ ] Market share analysis
- [ ] Performance rankings (TVL, volume, users, revenue)
- [ ] Competitive positioning charts
- [ ] Trend analysis vs competitors

---

## Technical Specification

### Database Schema

#### New Tables

**1. protocol_performance_metrics**
```sql
CREATE TABLE protocol_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- APY/APR Metrics
  apy_7d DECIMAL(10, 4),
  apy_30d DECIMAL(10, 4),
  apy_90d DECIMAL(10, 4),
  apy_1y DECIMAL(10, 4),
  apr_7d DECIMAL(10, 4),
  apr_30d DECIMAL(10, 4),
  
  -- User Metrics
  dau INTEGER,
  wau INTEGER,
  mau INTEGER,
  new_users INTEGER,
  returning_users INTEGER,
  churned_users INTEGER,
  
  -- Revenue Metrics
  daily_revenue DECIMAL(20, 2),
  weekly_revenue DECIMAL(20, 2),
  monthly_revenue DECIMAL(20, 2),
  trading_fees DECIMAL(20, 2),
  withdrawal_fees DECIMAL(20, 2),
  performance_fees DECIMAL(20, 2),
  
  -- Engagement Metrics
  avg_transaction_size DECIMAL(20, 2),
  transaction_count INTEGER,
  unique_traders INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_protocol_performance_protocol_id ON protocol_performance_metrics(protocol_id);
CREATE INDEX idx_protocol_performance_timestamp ON protocol_performance_metrics(timestamp DESC);
CREATE INDEX idx_protocol_performance_composite ON protocol_performance_metrics(protocol_id, timestamp DESC);
```

**2. protocol_yield_sources**
```sql
CREATE TABLE protocol_yield_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  pool_id VARCHAR(255),
  timestamp TIMESTAMP NOT NULL,
  
  -- Yield Sources
  trading_fee_yield DECIMAL(10, 4),
  incentive_yield DECIMAL(10, 4),
  lending_yield DECIMAL(10, 4),
  staking_yield DECIMAL(10, 4),
  other_yield DECIMAL(10, 4),
  
  -- Pool Metrics
  pool_tvl DECIMAL(20, 2),
  pool_volume_24h DECIMAL(20, 2),
  pool_apy DECIMAL(10, 4),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_yield_sources_protocol_id ON protocol_yield_sources(protocol_id);
CREATE INDEX idx_yield_sources_timestamp ON protocol_yield_sources(timestamp DESC);
```

**3. protocol_user_cohorts**
```sql
CREATE TABLE protocol_user_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  cohort_date DATE NOT NULL,
  period_number INTEGER NOT NULL, -- 0 = signup period, 1 = period 1, etc.
  
  -- Cohort Metrics
  cohort_size INTEGER NOT NULL,
  active_users INTEGER NOT NULL,
  retention_rate DECIMAL(5, 2),
  
  -- Value Metrics
  avg_transaction_value DECIMAL(20, 2),
  total_volume DECIMAL(20, 2),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_cohorts_protocol_id ON protocol_user_cohorts(protocol_id);
CREATE INDEX idx_user_cohorts_cohort_date ON protocol_user_cohorts(cohort_date DESC);
```

### API Endpoints

#### 1. Get Protocol Performance Overview
```typescript
GET /v1/analytics/protocol/:protocolId/performance

Query Parameters:
- timeRange: '7d' | '30d' | '90d' | '1y' | 'all'
- metrics: string[] (optional, filter specific metrics)

Response:
{
  protocolId: string;
  timeRange: string;
  metrics: {
    apy: {
      current: number;
      trend: number; // % change
      history: Array<{ timestamp: string; value: number }>;
    };
    users: {
      dau: number;
      wau: number;
      mau: number;
      growth: number; // % change
      retention: number; // %
    };
    revenue: {
      daily: number;
      weekly: number;
      monthly: number;
      trend: number; // % change
      breakdown: {
        tradingFees: number;
        withdrawalFees: number;
        performanceFees: number;
      };
    };
  };
}
```

#### 2. Get APY/APR Breakdown
```typescript
GET /v1/analytics/protocol/:protocolId/yield-breakdown

Query Parameters:
- timeRange: '7d' | '30d' | '90d' | '1y'
- poolId: string (optional)

Response:
{
  protocolId: string;
  pools: Array<{
    poolId: string;
    poolName: string;
    tvl: number;
    apy: number;
    yieldSources: {
      tradingFees: number;
      incentives: number;
      lending: number;
      staking: number;
      other: number;
    };
    history: Array<{ timestamp: string; apy: number }>;
  }>;
}
```

#### 3. Get User Retention Analysis
```typescript
GET /v1/analytics/protocol/:protocolId/user-retention

Query Parameters:
- cohortDate: string (YYYY-MM-DD, optional)
- periods: number (default: 12)

Response:
{
  protocolId: string;
  cohorts: Array<{
    cohortDate: string;
    cohortSize: number;
    retentionByPeriod: Array<{
      period: number;
      activeUsers: number;
      retentionRate: number;
    }>;
  }>;
  averageRetention: {
    period1: number;
    period3: number;
    period6: number;
    period12: number;
  };
}
```

#### 4. Get Revenue Analysis
```typescript
GET /v1/analytics/protocol/:protocolId/revenue

Query Parameters:
- timeRange: '7d' | '30d' | '90d' | '1y'
- granularity: 'daily' | 'weekly' | 'monthly'

Response:
{
  protocolId: string;
  timeRange: string;
  revenue: {
    total: number;
    trend: number; // % change
    history: Array<{
      timestamp: string;
      total: number;
      tradingFees: number;
      withdrawalFees: number;
      performanceFees: number;
    }>;
  };
  revenuePerUser: number;
  projections: {
    next7d: number;
    next30d: number;
  };
}
```

#### 5. Get Competitive Benchmarking
```typescript
GET /v1/analytics/protocols/compare

Query Parameters:
- protocolIds: string[] (comma-separated)
- metrics: string[] (comma-separated: 'tvl', 'volume', 'users', 'revenue', 'apy')
- timeRange: '7d' | '30d' | '90d' | '1y'

Response:
{
  protocols: Array<{
    protocolId: string;
    protocolName: string;
    metrics: {
      tvl: { value: number; rank: number; change: number };
      volume: { value: number; rank: number; change: number };
      users: { value: number; rank: number; change: number };
      revenue: { value: number; rank: number; change: number };
      apy: { value: number; rank: number; change: number };
    };
  }>;
  marketShare: Array<{
    protocolId: string;
    share: number; // %
  }>;
}
```

---

## Implementation Plan

### Phase 1: Database Schema and Data Pipeline (3 days)

**Tasks:**
1. Create database migration for new tables
2. Implement data collection jobs for performance metrics
3. Create APY/APR calculation engine
4. Implement user cohort analysis job
5. Create revenue aggregation job

**Deliverables:**
- 3 new database tables
- 5 data collection/calculation jobs
- Unit tests for calculation logic

### Phase 2: API Implementation (2 days)

**Tasks:**
1. Implement 5 API endpoints
2. Add caching layer (Redis)
3. Implement rate limiting
4. Add API documentation

**Deliverables:**
- 5 REST API endpoints
- API documentation (OpenAPI/Swagger)
- Integration tests

### Phase 3: Testing and Optimization (2 days)

**Tasks:**
1. Performance testing (load tests)
2. Data accuracy validation
3. Query optimization
4. Cache optimization

**Deliverables:**
- Load test results
- Performance benchmarks
- Optimized queries

---

## Dependencies

- Story 1.4: Advanced Query Processor (for complex queries)
- Story 1.5: Infrastructure (for deployment)
- Existing protocol_tvl and protocol_stats tables

---

## Success Metrics

- API response time <500ms (p95)
- Data freshness <5 minutes
- Calculation accuracy >99.9%
- Cache hit rate >90%
- Support 1000+ protocols

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-14  
**Author**: AI Development Team

