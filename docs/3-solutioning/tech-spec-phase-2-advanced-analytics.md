# Technical Specification - Phase 2: Advanced DeFi Analytics & Portfolio Analysis

**Project:** DeFiLlama On-Chain Services Platform  
**Epic ID:** on-chain-services-v1  
**Phase:** Phase 2 - Enhancement  
**Date:** 2025-10-14  
**Architect:** Luis  
**Version:** 1.0  

---

## 1. Overview and Scope

### 1.1 Executive Summary

This technical specification defines the implementation details for Phase 2 of the On-Chain Services Platform, focusing on **Advanced DeFi Analytics** and **Portfolio Analysis** features. Building upon Phase 1's real-time infrastructure (WebSocket, Alert Engine, Query Processor), Phase 2 delivers sophisticated analytical tools for DeFi researchers, active traders, and protocol teams.

**Business Objectives:**
- Target: $600K ARR, 1,500 premium users
- Enable data-driven investment decisions
- Provide competitive intelligence tools
- Support protocol optimization strategies

**Technical Objectives:**
- Extend existing architecture with minimal disruption
- Maintain <500ms API response time (p95)
- Support 1000+ protocols across 100+ chains
- Achieve 99.9% API availability
- Enable horizontal scaling for future growth

### 1.2 Scope

**In Scope:**
- **Feature 2.1: Advanced DeFi Analytics**
  - Protocol Performance Dashboard (Story 2.1.1)
  - Yield Opportunity Scanner (Story 2.1.2)
  - Liquidity Analysis Tools (Story 2.1.3)

- **Feature 2.2: Portfolio Analysis**
  - Wallet Portfolio Tracking (Story 2.2.1)
  - Holder Distribution Analysis (Story 2.2.2)

**Out of Scope:**
- Machine learning-based predictive analytics (Phase 3)
- Smart money tracking (Phase 3)
- MEV detection (Phase 3)
- Risk monitoring system (Phase 3)
- Mobile application development
- Blockchain node infrastructure

### 1.3 Architecture Alignment

Phase 2 extends the existing serverless architecture:
- **Compute**: AWS Lambda for all business logic
- **Storage**: PostgreSQL (primary), Redis (cache), DynamoDB (sessions)
- **API**: REST endpoints via API Gateway
- **Real-time**: WebSocket connections (Phase 1)
- **Monitoring**: CloudWatch, X-Ray, custom dashboards

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Dashboard  │  Mobile App  │  API Clients  │  Trading Bots  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  CloudFront CDN  │  API Gateway v2  │  Rate Limiting            │
│  Authentication  │  Request Routing │  Load Balancing           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER (Phase 2)                   │
├─────────────────────────────────────────────────────────────────┤
│  Protocol Analytics API  │  Yield Scanner API                   │
│  Liquidity Analysis API  │  Portfolio Tracking API              │
│  Holder Distribution API │  Query Processor (Phase 1)           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PROCESSING LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  APY/APR Calculator      │  Risk Scoring Engine                 │
│  Cohort Analyzer         │  Gini Coefficient Calculator         │
│  IL Calculator           │  Portfolio Aggregator                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Primary)    │  Redis Cache (Hot Data)              │
│  TimescaleDB (Metrics)   │  S3 (Historical Data)                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Interaction Flow

**Protocol Performance Dashboard Flow:**
```
Client Request → API Gateway → Protocol Analytics Lambda →
Redis Cache Check → PostgreSQL Query → APY/APR Calculation →
Cohort Analysis → Response Caching → Client Response
```

**Yield Opportunity Scanner Flow:**
```
Client Request → API Gateway → Yield Scanner Lambda →
Redis Cache Check → PostgreSQL Query → Risk Scoring →
Yield Ranking → Alert Check → Response Caching → Client Response
```

**Portfolio Tracking Flow:**
```
Client Request → API Gateway → Portfolio Tracking Lambda →
Multi-Chain Data Aggregation → Balance Calculation →
Performance Analysis → Redis Cache → Client Response
```

---

## 3. Data Architecture

### 3.1 Data Storage Strategy

**Hot Data (Redis - <5 minute TTL):**
- Current protocol performance metrics
- Real-time yield opportunities
- Active portfolio valuations
- Cached query results
- User session data

**Warm Data (PostgreSQL - Real-time access):**
- Protocol performance history
- Yield opportunity snapshots
- Wallet holdings and transactions
- Token holder distributions
- User alert configurations

**Cold Data (S3 - Archival):**
- Historical metrics (>90 days)
- Audit logs
- Backup snapshots
- Analytics exports

### 3.2 Data Flow Architecture

**Real-time Data Pipeline:**
```
Blockchain Data → Protocol Adapters → PostgreSQL →
Lambda Triggers → Redis Cache Update → WebSocket Broadcast
```

**Analytics Data Pipeline:**
```
Raw Metrics → Aggregation Jobs → Calculated Metrics →
PostgreSQL Storage → Redis Cache → API Endpoints
```

**Portfolio Data Pipeline:**
```
Multi-Chain RPCs → Balance Collectors → Normalization →
PostgreSQL Storage → Portfolio Aggregation → Cache → API
```

---

## 4. Database Schema Design

### 4.1 Protocol Performance Tables

#### protocol_performance_metrics
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

#### protocol_yield_sources
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

#### protocol_user_cohorts
```sql
CREATE TABLE protocol_user_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  cohort_date DATE NOT NULL,
  period_number INTEGER NOT NULL,
  
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

### 4.2 Yield Opportunity Tables

#### yield_opportunities
```sql
CREATE TABLE yield_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  pool_id VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Pool Info
  pool_name VARCHAR(255) NOT NULL,
  pool_type VARCHAR(50) NOT NULL,
  token_symbols VARCHAR(255)[],
  
  -- Yield Metrics
  apy DECIMAL(10, 4) NOT NULL,
  apr DECIMAL(10, 4),
  base_apy DECIMAL(10, 4),
  reward_apy DECIMAL(10, 4),
  auto_compound BOOLEAN DEFAULT FALSE,
  
  -- TVL and Volume
  tvl DECIMAL(20, 2) NOT NULL,
  volume_24h DECIMAL(20, 2),
  volume_7d DECIMAL(20, 2),
  
  -- Risk Metrics
  risk_score INTEGER,
  risk_category VARCHAR(20),
  audit_status VARCHAR(50),
  protocol_age_days INTEGER,
  
  -- Performance
  yield_volatility DECIMAL(10, 4),
  yield_stability_score DECIMAL(5, 2),
  
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_yield_opportunities_protocol_id ON yield_opportunities(protocol_id);
CREATE INDEX idx_yield_opportunities_chain_id ON yield_opportunities(chain_id);
CREATE INDEX idx_yield_opportunities_apy ON yield_opportunities(apy DESC);
CREATE INDEX idx_yield_opportunities_risk_score ON yield_opportunities(risk_score);
CREATE INDEX idx_yield_opportunities_composite ON yield_opportunities(apy DESC, risk_score, tvl DESC);
```

---

## 5. API Specifications

### 5.1 Protocol Performance API

#### GET /v1/analytics/protocol/:protocolId/performance

**Request:**
```typescript
interface PerformanceRequest {
  protocolId: string;
  timeRange: '7d' | '30d' | '90d' | '1y' | 'all';
  metrics?: string[]; // Optional filter
}
```

**Response:**
```typescript
interface PerformanceResponse {
  protocolId: string;
  timeRange: string;
  metrics: {
    apy: {
      current: number;
      trend: number;
      history: Array<{ timestamp: string; value: number }>;
    };
    users: {
      dau: number;
      wau: number;
      mau: number;
      growth: number;
      retention: number;
    };
    revenue: {
      daily: number;
      weekly: number;
      monthly: number;
      trend: number;
      breakdown: {
        tradingFees: number;
        withdrawalFees: number;
        performanceFees: number;
      };
    };
  };
}
```

**Performance Requirements:**
- Response time: <500ms (p95)
- Cache TTL: 5 minutes
- Rate limit: 100 requests/minute (free), 1000 requests/minute (pro)

---

## 6. Implementation Details

### 6.1 APY/APR Calculation Engine

```typescript
// APY Calculation with Compound Interest
export class APYCalculator {
  /**
   * Calculate APY from APR with compounding
   * APY = (1 + APR/n)^n - 1
   * where n = compounding periods per year
   */
  calculateAPY(apr: number, compoundingPeriods: number = 365): number {
    return Math.pow(1 + apr / compoundingPeriods, compoundingPeriods) - 1;
  }

  /**
   * Calculate historical APY trend
   */
  async calculateHistoricalAPY(
    protocolId: string,
    timeRange: string
  ): Promise<APYTrend> {
    const metrics = await this.getHistoricalMetrics(protocolId, timeRange);
    
    return {
      current: this.calculateAPY(metrics.currentAPR),
      average: this.calculateAverage(metrics.apyHistory),
      volatility: this.calculateVolatility(metrics.apyHistory),
      trend: this.calculateTrend(metrics.apyHistory)
    };
  }
}
```

### 6.2 Risk Scoring Algorithm

```typescript
// Risk Scoring Engine
export class RiskScoringEngine {
  /**
   * Calculate risk score (0-100)
   * Lower score = lower risk
   */
  calculateRiskScore(opportunity: YieldOpportunity): number {
    const weights = {
      tvl: 0.25,
      audit: 0.30,
      age: 0.20,
      volatility: 0.25
    };

    const tvlScore = this.scoreTVL(opportunity.tvl);
    const auditScore = this.scoreAudit(opportunity.auditStatus);
    const ageScore = this.scoreAge(opportunity.protocolAgeDays);
    const volatilityScore = this.scoreVolatility(opportunity.yieldVolatility);

    return (
      tvlScore * weights.tvl +
      auditScore * weights.audit +
      ageScore * weights.age +
      volatilityScore * weights.volatility
    );
  }

  private scoreTVL(tvl: number): number {
    // Higher TVL = lower risk
    if (tvl > 100_000_000) return 10; // $100M+
    if (tvl > 10_000_000) return 30;  // $10M+
    if (tvl > 1_000_000) return 50;   // $1M+
    if (tvl > 100_000) return 70;     // $100K+
    return 90; // <$100K
  }

  private scoreAudit(status: string): number {
    const scores = {
      'multiple_audits': 10,
      'single_audit': 30,
      'in_progress': 50,
      'none': 90
    };
    return scores[status] || 90;
  }
}
```

### 6.3 Cohort Analysis Engine

```typescript
// User Cohort Analyzer
export class CohortAnalyzer {
  /**
   * Calculate cohort retention metrics
   */
  async analyzeCohort(
    protocolId: string,
    cohortDate: Date
  ): Promise<CohortMetrics> {
    const cohortUsers = await this.getCohortUsers(protocolId, cohortDate);
    const periods = await this.getRetentionPeriods(cohortDate);

    const metrics: CohortMetrics = {
      cohortDate,
      cohortSize: cohortUsers.length,
      periods: []
    };

    for (const period of periods) {
      const activeUsers = await this.getActiveUsers(
        cohortUsers,
        period.startDate,
        period.endDate
      );

      metrics.periods.push({
        periodNumber: period.number,
        activeUsers: activeUsers.length,
        retentionRate: (activeUsers.length / cohortUsers.length) * 100,
        avgTransactionValue: this.calculateAvgValue(activeUsers),
        totalVolume: this.calculateTotalVolume(activeUsers)
      });
    }

    return metrics;
  }

  /**
   * Calculate DAU/WAU/MAU metrics
   */
  async calculateUserMetrics(
    protocolId: string,
    date: Date
  ): Promise<UserMetrics> {
    const dau = await this.getActiveUsers(protocolId, date, 'day');
    const wau = await this.getActiveUsers(protocolId, date, 'week');
    const mau = await this.getActiveUsers(protocolId, date, 'month');

    return {
      dau: dau.length,
      wau: wau.length,
      mau: mau.length,
      dauWauRatio: (dau.length / wau.length) * 100,
      wauMauRatio: (wau.length / mau.length) * 100,
      stickiness: (dau.length / mau.length) * 100
    };
  }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Coverage Target**: 90%+

**Test Cases:**
```typescript
describe('APYCalculator', () => {
  it('should calculate APY from APR correctly', () => {
    const calculator = new APYCalculator();
    const apy = calculator.calculateAPY(0.10, 365); // 10% APR
    expect(apy).toBeCloseTo(0.1052, 4); // ~10.52% APY
  });

  it('should handle zero APR', () => {
    const calculator = new APYCalculator();
    const apy = calculator.calculateAPY(0, 365);
    expect(apy).toBe(0);
  });
});

describe('RiskScoringEngine', () => {
  it('should score low risk for high TVL + audited protocol', () => {
    const engine = new RiskScoringEngine();
    const score = engine.calculateRiskScore({
      tvl: 150_000_000,
      auditStatus: 'multiple_audits',
      protocolAgeDays: 800,
      yieldVolatility: 0.03
    });
    expect(score).toBeLessThan(30); // Low risk
  });

  it('should score high risk for low TVL + unaudited protocol', () => {
    const engine = new RiskScoringEngine();
    const score = engine.calculateRiskScore({
      tvl: 50_000,
      auditStatus: 'none',
      protocolAgeDays: 60,
      yieldVolatility: 0.60
    });
    expect(score).toBeGreaterThan(60); // High risk
  });
});
```

### 7.2 Integration Tests

**Test Scenarios:**
1. Protocol performance API with real database
2. Yield opportunity scanner with multiple protocols
3. Cache hit/miss scenarios
4. Rate limiting enforcement
5. Multi-chain data aggregation

```typescript
describe('Protocol Performance API Integration', () => {
  it('should return performance metrics for valid protocol', async () => {
    const response = await request(app)
      .get('/v1/analytics/protocol/uniswap-v3/performance?timeRange=30d')
      .set('Authorization', 'Bearer test-api-key')
      .expect(200);

    expect(response.body).toHaveProperty('metrics');
    expect(response.body.metrics).toHaveProperty('apy');
    expect(response.body.metrics).toHaveProperty('users');
    expect(response.body.metrics).toHaveProperty('revenue');
  });

  it('should return cached data on second request', async () => {
    const start1 = Date.now();
    await request(app).get('/v1/analytics/protocol/uniswap-v3/performance');
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await request(app).get('/v1/analytics/protocol/uniswap-v3/performance');
    const time2 = Date.now() - start2;

    expect(time2).toBeLessThan(time1 * 0.5); // Cache should be 2x faster
  });
});
```

### 7.3 Performance Tests

**Load Testing with k6:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },  // Stay at 500 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  const response = http.get(
    'https://api.defillama.com/v1/analytics/protocol/uniswap-v3/performance',
    {
      headers: { 'Authorization': 'Bearer test-api-key' },
    }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

---

## 8. Deployment Strategy

### 8.1 Infrastructure as Code (AWS CDK)

```typescript
// Lambda function for protocol analytics
const protocolAnalyticsLambda = new lambda.Function(this, 'ProtocolAnalytics', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('dist/protocol-analytics'),
  environment: {
    DB_HOST: rdsInstance.dbInstanceEndpointAddress,
    REDIS_HOST: redisCluster.attrRedisEndpointAddress,
    CACHE_TTL: '300',
  },
  timeout: Duration.seconds(30),
  memorySize: 1024,
  reservedConcurrentExecutions: 100,
});

// API Gateway integration
const api = new apigateway.RestApi(this, 'AnalyticsAPI', {
  restApiName: 'DeFiLlama Analytics API',
  deployOptions: {
    stageName: 'prod',
    throttlingRateLimit: 1000,
    throttlingBurstLimit: 2000,
  },
});

const protocolResource = api.root.addResource('protocol');
const protocolIdResource = protocolResource.addResource('{protocolId}');
const performanceResource = protocolIdResource.addResource('performance');

performanceResource.addMethod(
  'GET',
  new apigateway.LambdaIntegration(protocolAnalyticsLambda),
  {
    authorizationType: apigateway.AuthorizationType.CUSTOM,
    authorizer: apiKeyAuthorizer,
  }
);
```

### 8.2 Monitoring and Alerting

**CloudWatch Metrics:**
```typescript
// Custom metrics
const apiLatencyMetric = new cloudwatch.Metric({
  namespace: 'DeFiLlama/Analytics',
  metricName: 'APILatency',
  statistic: 'p95',
  period: Duration.minutes(5),
});

// Alarms
new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
  metric: apiLatencyMetric,
  threshold: 500,
  evaluationPeriods: 2,
  alarmDescription: 'API latency exceeds 500ms (p95)',
  actionsEnabled: true,
});

// Dashboard
const dashboard = new cloudwatch.Dashboard(this, 'AnalyticsDashboard', {
  dashboardName: 'DeFiLlama-Analytics',
});

dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'API Latency (p95)',
    left: [apiLatencyMetric],
  }),
  new cloudwatch.GraphWidget({
    title: 'Request Rate',
    left: [requestRateMetric],
  }),
  new cloudwatch.GraphWidget({
    title: 'Error Rate',
    left: [errorRateMetric],
  })
);
```

---

## 9. Acceptance Criteria

### 9.1 Feature Acceptance

**Protocol Performance Dashboard:**
- ✅ Display APY/APR for 7d, 30d, 90d, 1y periods
- ✅ Show DAU/WAU/MAU metrics with trends
- ✅ Display revenue breakdown by source
- ✅ Support cohort retention analysis
- ✅ Enable protocol comparison

**Yield Opportunity Scanner:**
- ✅ List yield opportunities with risk scores
- ✅ Filter by chain, protocol, risk level
- ✅ Sort by APY, TVL, risk score
- ✅ Display historical yield trends
- ✅ Support yield alerts

**Liquidity Analysis Tools:**
- ✅ Show liquidity depth charts
- ✅ Display LP position profitability
- ✅ Calculate impermanent loss
- ✅ Track liquidity migrations
- ✅ Support multi-pool analysis

### 9.2 Performance Acceptance

- ✅ API response time <500ms (p95)
- ✅ Cache hit ratio >90%
- ✅ Support 1000+ concurrent requests
- ✅ Database query time <200ms (p95)
- ✅ Zero downtime deployments

### 9.3 Security Acceptance

- ✅ API key authentication enforced
- ✅ Rate limiting per tier
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CORS configuration
- ✅ Audit logging enabled

---

## 10. Traceability Matrix

| Requirement | Design Component | Implementation | Test Case |
|-------------|------------------|----------------|-----------|
| Protocol APY tracking | `protocol_performance_metrics` table | `APYCalculator` class | `test_apy_calculation` |
| Risk scoring | Risk scoring algorithm | `RiskScoringEngine` class | `test_risk_scoring` |
| User retention | `protocol_user_cohorts` table | `CohortAnalyzer` class | `test_cohort_analysis` |
| Yield opportunities | `yield_opportunities` table | Yield Scanner API | `test_yield_scanner` |
| Multi-chain support | Chain adapters | `PortfolioAggregator` | `test_multi_chain` |
| Caching | Redis + Materialized Views | `CacheManager` | `test_cache_performance` |
| Rate limiting | Token bucket algorithm | API Gateway config | `test_rate_limiting` |

---

**Version**: 1.0
**Last Updated**: 2025-10-14
**Status**: Ready for Implementation
**Review Date**: 2026-01-14

