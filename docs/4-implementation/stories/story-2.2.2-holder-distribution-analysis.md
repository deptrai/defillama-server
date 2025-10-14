# Story 2.2.2: Holder Distribution Analysis

**Epic**: 2.2 Portfolio Analysis  
**Status**: Ready for Implementation  
**Priority**: P2  
**Effort**: 6 points  
**Value**: Medium

---

## User Story

**As a** DeFi researcher  
**I want** to analyze token holder distribution patterns  
**So that** I can assess token concentration risks

---

## Acceptance Criteria

### AC1: Holder Concentration Metrics ✅
- [ ] Gini coefficient calculation
- [ ] Top holder percentages (top 10, 50, 100)
- [ ] Holder count by balance range
- [ ] Concentration risk score
- [ ] Distribution charts

### AC2: Whale vs Retail Distribution ✅
- [ ] Whale identification (>1% supply)
- [ ] Whale vs retail balance distribution
- [ ] Whale transaction patterns
- [ ] Whale accumulation/distribution trends
- [ ] Retail investor metrics

### AC3: Holder Behavior Analysis ✅
- [ ] Holder age distribution
- [ ] Average holding period
- [ ] Holder churn rate
- [ ] New vs existing holder trends
- [ ] Holder loyalty score

### AC4: Distribution Change Alerts ✅
- [ ] Alert on whale accumulation (>0.5% supply)
- [ ] Alert on whale distribution (>0.5% supply)
- [ ] Alert on concentration increase
- [ ] Alert on holder count changes
- [ ] Customizable alert thresholds

---

## Technical Specification

### Database Schema

**1. token_holders**
```sql
CREATE TABLE token_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  
  -- Holdings
  balance DECIMAL(30, 10) NOT NULL,
  balance_usd DECIMAL(20, 2),
  supply_percentage DECIMAL(10, 6),
  
  -- Classification
  holder_type VARCHAR(50), -- 'whale', 'large', 'medium', 'small', 'dust'
  is_contract BOOLEAN DEFAULT FALSE,
  is_exchange BOOLEAN DEFAULT FALSE,
  
  -- Behavior
  first_seen TIMESTAMP,
  last_active TIMESTAMP,
  holding_period_days INTEGER,
  transaction_count INTEGER,
  
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_token_holders_token ON token_holders(token_address);
CREATE INDEX idx_token_holders_wallet ON token_holders(wallet_address);
CREATE INDEX idx_token_holders_balance ON token_holders(balance DESC);
CREATE INDEX idx_token_holders_supply_pct ON token_holders(supply_percentage DESC);
CREATE UNIQUE INDEX idx_token_holders_unique ON token_holders(token_address, chain_id, wallet_address);
```

**2. holder_distribution_snapshots**
```sql
CREATE TABLE holder_distribution_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- Distribution Metrics
  total_holders INTEGER NOT NULL,
  gini_coefficient DECIMAL(5, 4),
  concentration_score DECIMAL(5, 2), -- 0-100
  
  -- Top Holder Metrics
  top10_percentage DECIMAL(10, 6),
  top50_percentage DECIMAL(10, 6),
  top100_percentage DECIMAL(10, 6),
  
  -- Holder Type Distribution
  whale_count INTEGER,
  whale_percentage DECIMAL(10, 6),
  large_holder_count INTEGER,
  medium_holder_count INTEGER,
  small_holder_count INTEGER,
  
  -- Behavior Metrics
  avg_holding_period_days DECIMAL(10, 2),
  holder_churn_rate DECIMAL(5, 2),
  new_holders_24h INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_holder_snapshots_token ON holder_distribution_snapshots(token_address);
CREATE INDEX idx_holder_snapshots_timestamp ON holder_distribution_snapshots(timestamp DESC);
CREATE INDEX idx_holder_snapshots_composite ON holder_distribution_snapshots(token_address, timestamp DESC);
```

**3. holder_distribution_alerts**
```sql
CREATE TABLE holder_distribution_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  token_address VARCHAR(255) NOT NULL,
  
  -- Alert Config
  alert_type VARCHAR(50) NOT NULL, -- 'whale_accumulation', 'whale_distribution', 'concentration_increase', 'holder_count_change'
  threshold DECIMAL(10, 6), -- e.g., 0.5 for 0.5% supply
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_holder_alerts_user_id ON holder_distribution_alerts(user_id);
CREATE INDEX idx_holder_alerts_token ON holder_distribution_alerts(token_address);
CREATE INDEX idx_holder_alerts_enabled ON holder_distribution_alerts(enabled);
```

### API Endpoints

#### 1. Get Holder Distribution
```typescript
GET /v1/analytics/tokens/:tokenAddress/holders/distribution

Query Parameters:
- chainId: string

Response:
{
  tokenAddress: string;
  chainId: string;
  totalHolders: number;
  
  concentration: {
    giniCoefficient: number; // 0-1
    concentrationScore: number; // 0-100
    top10Percentage: number;
    top50Percentage: number;
    top100Percentage: number;
  };
  
  holderTypes: {
    whales: { count: number; percentage: number };
    large: { count: number; percentage: number };
    medium: { count: number; percentage: number };
    small: { count: number; percentage: number };
    dust: { count: number; percentage: number };
  };
  
  distribution: Array<{
    range: string; // '0-0.01%', '0.01-0.1%', etc.
    holderCount: number;
    totalBalance: number;
    percentage: number;
  }>;
  
  lastUpdated: string;
}
```

#### 2. Get Top Holders
```typescript
GET /v1/analytics/tokens/:tokenAddress/holders/top

Query Parameters:
- chainId: string
- limit: number (default: 100, max: 1000)
- excludeContracts: boolean (default: false)
- excludeExchanges: boolean (default: false)

Response:
{
  tokenAddress: string;
  holders: Array<{
    rank: number;
    walletAddress: string;
    balance: number;
    balanceUsd: number;
    supplyPercentage: number;
    holderType: string;
    isContract: boolean;
    isExchange: boolean;
    
    behavior: {
      firstSeen: string;
      lastActive: string;
      holdingPeriodDays: number;
      transactionCount: number;
    };
  }>;
}
```

#### 3. Get Holder Behavior
```typescript
GET /v1/analytics/tokens/:tokenAddress/holders/behavior

Query Parameters:
- chainId: string
- timeRange: '7d' | '30d' | '90d' | '1y'

Response:
{
  tokenAddress: string;
  timeRange: string;
  
  behavior: {
    avgHoldingPeriod: number; // days
    holderChurnRate: number; // %
    newHolders: number;
    exitedHolders: number;
    loyaltyScore: number; // 0-100
  };
  
  ageDistribution: Array<{
    ageRange: string; // '0-7d', '7-30d', etc.
    holderCount: number;
    percentage: number;
  }>;
  
  trends: {
    holderGrowth: Array<{ timestamp: string; count: number }>;
    whaleActivity: Array<{ timestamp: string; accumulation: number; distribution: number }>;
  };
}
```

#### 4. Get Distribution History
```typescript
GET /v1/analytics/tokens/:tokenAddress/holders/history

Query Parameters:
- chainId: string
- timeRange: '7d' | '30d' | '90d' | '1y'
- granularity: 'daily' | 'weekly'

Response:
{
  tokenAddress: string;
  history: Array<{
    timestamp: string;
    totalHolders: number;
    giniCoefficient: number;
    concentrationScore: number;
    top10Percentage: number;
    whaleCount: number;
    whalePercentage: number;
  }>;
  
  trends: {
    holderGrowthRate: number; // %
    concentrationTrend: 'increasing' | 'decreasing' | 'stable';
    whaleActivityTrend: 'accumulating' | 'distributing' | 'neutral';
  };
}
```

#### 5. Create Distribution Alert
```typescript
POST /v1/analytics/tokens/:tokenAddress/holders/alerts

Request Body:
{
  alertType: 'whale_accumulation' | 'whale_distribution' | 'concentration_increase' | 'holder_count_change';
  threshold: number; // e.g., 0.5 for 0.5% supply
  channels: Array<'email' | 'webhook' | 'push'>;
}

Response:
{
  alertId: string;
  status: 'active';
  createdAt: string;
}
```

---

## Implementation Plan

### Phase 1: Data Collection (2 days)
- Create database schema
- Implement holder tracking
- Build distribution calculation engine
- Create snapshot job

### Phase 2: API Implementation (2 days)
- Implement 5 API endpoints
- Add caching layer
- Create API documentation
- Integration tests

### Phase 3: Testing (2 days)
- Performance testing
- Accuracy validation
- Alert testing

---

## Dependencies

- Story 1.3: Alert Engine
- Story 1.4: Advanced Query Processor
- Blockchain indexing infrastructure

---

## Success Metrics

- API response time <500ms (p95)
- Data freshness <10 minutes
- Gini coefficient accuracy >99%
- Support 10,000+ tokens

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-14  
**Author**: AI Development Team

