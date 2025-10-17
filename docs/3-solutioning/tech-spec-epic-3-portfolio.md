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
│  │ TimescaleDB  │  │ Redis Cache  │  │ WebSocket    │     │
│  │ (Snapshots)  │  │              │  │ (Real-time)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. DATA MODEL

### 3.1 Database Schema (TimescaleDB)

```sql
-- Portfolio Snapshots (Time-Series)
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  total_value NUMERIC NOT NULL,
  chain_breakdown JSONB NOT NULL,
  asset_breakdown JSONB NOT NULL,
  category_breakdown JSONB NOT NULL
);

-- Convert to hypertable
SELECT create_hypertable('portfolio_snapshots', 'timestamp');

-- Retention policy (90 days)
SELECT add_retention_policy('portfolio_snapshots', INTERVAL '90 days');

-- Compression policy (7 days)
ALTER TABLE portfolio_snapshots SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'user_id'
);
SELECT add_compression_policy('portfolio_snapshots', INTERVAL '7 days');

-- Portfolio Assets
CREATE TABLE portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chain VARCHAR(50) NOT NULL,
  asset VARCHAR(100) NOT NULL,
  balance NUMERIC NOT NULL,
  value_usd NUMERIC NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_portfolio_assets_user_id ON portfolio_assets(user_id);
```

---

## 4. API SPECIFICATION

### 4.1 REST API Endpoints

**Get Portfolio Overview**:
```
GET /v1/portfolio
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "totalValue": 100000,
    "chains": [
      { "chain": "ethereum", "value": 50000 },
      { "chain": "polygon", "value": 30000 },
      { "chain": "arbitrum", "value": 20000 }
    ],
    "assets": [
      { "asset": "ETH", "balance": 10, "value": 20000 },
      { "asset": "USDC", "balance": 50000, "value": 50000 }
    ],
    "categories": [
      { "category": "DeFi", "value": 60000 },
      { "category": "NFT", "value": 20000 },
      { "category": "Staking", "value": 20000 }
    ]
  }
}
```

**Get Performance Metrics**:
```
GET /v1/portfolio/performance?period=30d
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "period": "30d",
    "startValue": 90000,
    "endValue": 100000,
    "absoluteGain": 10000,
    "percentageGain": 11.11,
    "roi": 11.11,
    "sharpeRatio": 1.5
  }
}
```

**Get Historical Performance**:
```
GET /v1/portfolio/history?period=90d&interval=1d
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": [
    { "timestamp": "2025-07-19T00:00:00Z", "value": 90000 },
    { "timestamp": "2025-07-20T00:00:00Z", "value": 92000 },
    ...
    { "timestamp": "2025-10-17T00:00:00Z", "value": 100000 }
  ]
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
- **Database**: TimescaleDB 2.14+ (time-series)
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

- Test portfolio aggregation
- Test performance calculations
- Test asset allocation
- Target: 80% code coverage

### 6.2 Integration Tests

- Test multi-chain data fetching
- Test real-time updates
- Test historical data queries

### 6.3 Performance Tests

- Test 125K users × 24 snapshots/day = 3M snapshots/day
- Test query performance (<2s)
- Test WebSocket scalability (10K concurrent connections)

---

## 7. DEPLOYMENT

### 7.1 Infrastructure

- **Lambda**: Portfolio API
- **ECS Fargate**: Portfolio Aggregator (background job)
- **TimescaleDB**: RDS (db.r6g.large)
- **Redis**: ElastiCache (cache.r6g.large)
- **WebSocket**: ECS Fargate

### 7.2 Deployment Strategy

- Blue-green deployment
- Canary deployment for high-risk changes

---

**END OF DOCUMENT**

