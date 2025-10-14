# Story 2.1.2: Yield Opportunity Scanner

**Epic**: 2.1 Advanced DeFi Analytics  
**Status**: Ready for Implementation  
**Priority**: P1  
**Effort**: 8 points  
**Value**: Medium

---

## User Story

**As an** active trader  
**I want** to discover high-yield opportunities across all protocols  
**So that** I can maximize my DeFi returns

---

## Acceptance Criteria

### AC1: Real-time Yield Calculations ✅
- [ ] Calculate real-time APY for all yield-generating pools
- [ ] Support multiple yield types (lending, staking, LP, farming)
- [ ] Auto-compound calculations
- [ ] Yield updates every 5 minutes
- [ ] Historical yield tracking

### AC2: Risk-Adjusted Yield Rankings ✅
- [ ] Risk scoring algorithm (0-100 scale)
- [ ] Risk-adjusted yield (Sharpe ratio)
- [ ] Risk factors: TVL, audit status, age, volatility
- [ ] Sortable rankings by risk-adjusted yield
- [ ] Risk category labels (Low, Medium, High)

### AC3: Historical Yield Performance ✅
- [ ] Yield history charts (7d, 30d, 90d, 1y)
- [ ] Yield volatility metrics
- [ ] Yield stability score
- [ ] Best/worst performing periods
- [ ] Yield trend analysis

### AC4: Yield Change Alerts ✅
- [ ] Alert on yield increase >10%
- [ ] Alert on yield decrease >20%
- [ ] Alert on new high-yield opportunities (>50% APY)
- [ ] Alert on risk level changes
- [ ] Customizable alert thresholds

---

## Technical Specification

### Database Schema

#### New Tables

**1. yield_opportunities**
```sql
CREATE TABLE yield_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  pool_id VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Pool Info
  pool_name VARCHAR(255) NOT NULL,
  pool_type VARCHAR(50) NOT NULL, -- 'lending', 'staking', 'lp', 'farming'
  token_symbols VARCHAR(255)[], -- ['USDC', 'ETH']
  
  -- Yield Metrics
  apy DECIMAL(10, 4) NOT NULL,
  apr DECIMAL(10, 4),
  base_apy DECIMAL(10, 4), -- without rewards
  reward_apy DECIMAL(10, 4), -- from incentives
  auto_compound BOOLEAN DEFAULT FALSE,
  
  -- TVL and Volume
  tvl DECIMAL(20, 2) NOT NULL,
  volume_24h DECIMAL(20, 2),
  volume_7d DECIMAL(20, 2),
  
  -- Risk Metrics
  risk_score INTEGER, -- 0-100
  risk_category VARCHAR(20), -- 'low', 'medium', 'high'
  audit_status VARCHAR(50),
  protocol_age_days INTEGER,
  
  -- Performance
  yield_volatility DECIMAL(10, 4),
  yield_stability_score DECIMAL(5, 2),
  
  -- Timestamps
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_yield_opportunities_protocol_id ON yield_opportunities(protocol_id);
CREATE INDEX idx_yield_opportunities_chain_id ON yield_opportunities(chain_id);
CREATE INDEX idx_yield_opportunities_apy ON yield_opportunities(apy DESC);
CREATE INDEX idx_yield_opportunities_risk_score ON yield_opportunities(risk_score);
CREATE INDEX idx_yield_opportunities_tvl ON yield_opportunities(tvl DESC);
CREATE INDEX idx_yield_opportunities_composite ON yield_opportunities(apy DESC, risk_score, tvl DESC);
```

**2. yield_history**
```sql
CREATE TABLE yield_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES yield_opportunities(id),
  timestamp TIMESTAMP NOT NULL,
  
  -- Yield Snapshot
  apy DECIMAL(10, 4) NOT NULL,
  apr DECIMAL(10, 4),
  tvl DECIMAL(20, 2),
  volume_24h DECIMAL(20, 2),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_yield_history_opportunity_id ON yield_history(opportunity_id);
CREATE INDEX idx_yield_history_timestamp ON yield_history(timestamp DESC);
CREATE INDEX idx_yield_history_composite ON yield_history(opportunity_id, timestamp DESC);
```

**3. yield_alerts**
```sql
CREATE TABLE yield_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  opportunity_id UUID REFERENCES yield_opportunities(id),
  
  -- Alert Config
  alert_type VARCHAR(50) NOT NULL, -- 'yield_increase', 'yield_decrease', 'new_opportunity', 'risk_change'
  threshold DECIMAL(10, 4), -- e.g., 10 for 10% change
  min_apy DECIMAL(10, 4), -- minimum APY to trigger
  max_risk_score INTEGER, -- maximum risk score
  
  -- Filters
  protocol_ids VARCHAR(255)[],
  chain_ids VARCHAR(50)[],
  pool_types VARCHAR(50)[],
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_yield_alerts_user_id ON yield_alerts(user_id);
CREATE INDEX idx_yield_alerts_enabled ON yield_alerts(enabled);
```

### API Endpoints

#### 1. Get Yield Opportunities
```typescript
GET /v1/analytics/yield-opportunities

Query Parameters:
- chains: string[] (optional, filter by chains)
- protocols: string[] (optional, filter by protocols)
- poolTypes: string[] (optional: 'lending', 'staking', 'lp', 'farming')
- minApy: number (optional, minimum APY)
- maxRiskScore: number (optional, maximum risk score 0-100)
- minTvl: number (optional, minimum TVL)
- sortBy: 'apy' | 'risk_adjusted_yield' | 'tvl' | 'volume' (default: 'apy')
- sortOrder: 'asc' | 'desc' (default: 'desc')
- page: number (default: 1)
- limit: number (default: 20, max: 100)

Response:
{
  opportunities: Array<{
    id: string;
    protocolId: string;
    protocolName: string;
    poolId: string;
    poolName: string;
    chainId: string;
    poolType: string;
    tokens: string[];
    
    yield: {
      apy: number;
      apr: number;
      baseApy: number;
      rewardApy: number;
      autoCompound: boolean;
    };
    
    metrics: {
      tvl: number;
      volume24h: number;
      volume7d: number;
    };
    
    risk: {
      score: number; // 0-100
      category: 'low' | 'medium' | 'high';
      auditStatus: string;
      protocolAge: number; // days
    };
    
    performance: {
      volatility: number;
      stabilityScore: number;
      riskAdjustedYield: number; // Sharpe ratio
    };
    
    lastUpdated: string;
  }>;
  
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  summary: {
    avgApy: number;
    maxApy: number;
    totalTvl: number;
    opportunityCount: number;
  };
}
```

#### 2. Get Yield History
```typescript
GET /v1/analytics/yield-opportunities/:opportunityId/history

Query Parameters:
- timeRange: '7d' | '30d' | '90d' | '1y' (default: '30d')
- granularity: 'hourly' | 'daily' | 'weekly' (default: 'daily')

Response:
{
  opportunityId: string;
  poolName: string;
  timeRange: string;
  
  history: Array<{
    timestamp: string;
    apy: number;
    apr: number;
    tvl: number;
    volume24h: number;
  }>;
  
  statistics: {
    avgApy: number;
    maxApy: number;
    minApy: number;
    volatility: number;
    stabilityScore: number;
    bestPeriod: { start: string; end: string; avgApy: number };
    worstPeriod: { start: string; end: string; avgApy: number };
  };
}
```

#### 3. Get Top Opportunities
```typescript
GET /v1/analytics/yield-opportunities/top

Query Parameters:
- category: 'highest_apy' | 'best_risk_adjusted' | 'most_stable' | 'trending_up'
- limit: number (default: 10, max: 50)
- timeRange: '24h' | '7d' | '30d' (for trending)

Response:
{
  category: string;
  opportunities: Array<{
    // Same structure as Get Yield Opportunities
  }>;
  
  insights: {
    avgApy: number;
    avgRiskScore: number;
    totalTvl: number;
  };
}
```

#### 4. Create Yield Alert
```typescript
POST /v1/analytics/yield-alerts

Request Body:
{
  alertType: 'yield_increase' | 'yield_decrease' | 'new_opportunity' | 'risk_change';
  threshold?: number; // % change threshold
  minApy?: number;
  maxRiskScore?: number;
  
  filters?: {
    protocolIds?: string[];
    chainIds?: string[];
    poolTypes?: string[];
  };
  
  channels: Array<'email' | 'webhook' | 'push'>;
}

Response:
{
  alertId: string;
  status: 'active';
  createdAt: string;
}
```

#### 5. Get Yield Alerts
```typescript
GET /v1/analytics/yield-alerts

Response:
{
  alerts: Array<{
    id: string;
    alertType: string;
    threshold: number;
    minApy: number;
    maxRiskScore: number;
    filters: object;
    enabled: boolean;
    lastTriggered: string;
    createdAt: string;
  }>;
}
```

---

## Implementation Plan

### Phase 1: Data Collection and Risk Scoring (3 days)

**Tasks:**
1. Create database schema and migrations
2. Implement yield data collection from protocols
3. Build risk scoring algorithm
4. Create yield history tracking job
5. Implement yield volatility calculations

**Deliverables:**
- 3 new database tables
- Risk scoring engine
- Data collection jobs
- Unit tests

### Phase 2: API and Alert System (3 days)

**Tasks:**
1. Implement 5 API endpoints
2. Build alert engine for yield changes
3. Add caching layer (Redis)
4. Implement rate limiting
5. Create API documentation

**Deliverables:**
- 5 REST API endpoints
- Alert engine
- API documentation
- Integration tests

### Phase 3: Testing and Optimization (2 days)

**Tasks:**
1. Performance testing
2. Risk scoring validation
3. Alert accuracy testing
4. Query optimization

**Deliverables:**
- Test results
- Performance benchmarks
- Optimized queries

---

## Dependencies

- Story 1.3: Alert Engine (for yield alerts)
- Story 1.4: Advanced Query Processor (for complex queries)
- Story 2.1.1: Protocol Performance Dashboard (for protocol data)

---

## Success Metrics

- API response time <500ms (p95)
- Data freshness <5 minutes
- Risk scoring accuracy >95%
- Alert delivery <30 seconds
- Support 5000+ yield opportunities

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-14  
**Author**: AI Development Team

