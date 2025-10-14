# ADR-003: Phase 2 Architecture Decisions

**Status**: Accepted  
**Date**: 2025-10-14  
**Architect**: Luis  
**Context**: Phase 2 - Advanced DeFi Analytics & Portfolio Analysis  

---

## ADR-003.1: Multi-Chain Data Aggregation Strategy

### Status
**Accepted**

### Context
Phase 2 requires aggregating data from 100+ blockchains for portfolio tracking and analytics. We need to decide on the data collection and aggregation strategy.

### Decision
**Parallel data collection with chain-specific adapters**

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                   Portfolio Aggregator                      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌────────▼────────┐  ┌──────▼──────┐
│  EVM Adapter  │  │ Solana Adapter  │  │ Cosmos...   │
└───────┬───────┘  └────────┬────────┘  └──────┬──────┘
        │                   │                   │
┌───────▼───────────────────▼───────────────────▼──────┐
│           Normalized Data Layer (PostgreSQL)         │
└──────────────────────────────────────────────────────┘
```

**Implementation:**
- Chain-specific adapters for data collection
- Parallel execution using Promise.all()
- Normalized data model for cross-chain consistency
- Retry logic with exponential backoff
- Circuit breaker for failing chains

### Consequences

**Positive:**
- ✅ Scalable to 100+ chains
- ✅ Fast aggregation (<2s for 10 chains)
- ✅ Isolated failures (one chain failure doesn't affect others)
- ✅ Easy to add new chains

**Negative:**
- ❌ Complex adapter maintenance
- ❌ Inconsistent data freshness across chains
- ❌ Higher RPC costs

**Mitigation:**
- Standardized adapter interface
- Monitoring per chain
- RPC endpoint pooling and caching

---

## ADR-003.2: Risk Scoring Algorithm

### Status
**Accepted**

### Context
Yield opportunities and protocols need risk assessment to help users make informed decisions. We need a transparent, explainable risk scoring system.

### Decision
**Multi-factor weighted risk scoring (0-100 scale)**

**Risk Factors:**
```typescript
interface RiskFactors {
  tvl: {
    weight: 0.25,
    scoring: {
      '>$100M': 10,
      '$10M-$100M': 30,
      '$1M-$10M': 50,
      '$100K-$1M': 70,
      '<$100K': 90
    }
  },
  audit: {
    weight: 0.30,
    scoring: {
      'multiple_audits': 10,
      'single_audit': 30,
      'in_progress': 50,
      'none': 90
    }
  },
  age: {
    weight: 0.20,
    scoring: {
      '>2_years': 10,
      '1-2_years': 30,
      '6-12_months': 50,
      '3-6_months': 70,
      '<3_months': 90
    }
  },
  volatility: {
    weight: 0.25,
    scoring: {
      '<5%': 10,
      '5-10%': 30,
      '10-20%': 50,
      '20-50%': 70,
      '>50%': 90
    }
  }
}
```

**Risk Categories:**
- 0-30: Low Risk (Green)
- 31-60: Medium Risk (Yellow)
- 61-100: High Risk (Red)

### Consequences

**Positive:**
- ✅ Transparent and explainable
- ✅ Easy to understand (0-100 scale)
- ✅ Customizable weights
- ✅ Supports risk-adjusted yield rankings

**Negative:**
- ❌ Subjective weight assignments
- ❌ May not capture all risk factors
- ❌ Requires regular calibration

**Mitigation:**
- Regular review and adjustment of weights
- User feedback integration
- Additional risk factors in future versions

---

## ADR-003.3: Portfolio Performance Calculation

### Status
**Accepted**

### Context
Users need accurate P&L and ROI calculations for their portfolios. We need to handle cost basis tracking, multi-chain positions, and historical performance.

### Decision
**FIFO (First-In-First-Out) cost basis with snapshot-based performance tracking**

**Implementation:**
```typescript
interface PerformanceCalculation {
  method: 'FIFO';
  costBasis: {
    tracking: 'per_token_per_chain';
    updates: 'on_transaction';
  };
  snapshots: {
    frequency: 'hourly';
    retention: '90_days';
  };
  calculations: {
    unrealizedPnL: 'current_value - cost_basis';
    realizedPnL: 'exit_value - cost_basis';
    roi: '(current_value - cost_basis) / cost_basis';
  };
}
```

**Data Flow:**
```
Transaction → Cost Basis Update → Portfolio Snapshot →
Performance Calculation → Cache → API Response
```

### Consequences

**Positive:**
- ✅ Industry-standard method (FIFO)
- ✅ Accurate P&L tracking
- ✅ Historical performance analysis
- ✅ Tax reporting compatible

**Negative:**
- ❌ Complex transaction tracking
- ❌ Storage overhead for snapshots
- ❌ Computation intensive for large portfolios

**Mitigation:**
- Efficient database indexing
- Snapshot compression
- Incremental calculations
- Background processing for large portfolios

---

## ADR-003.4: Gini Coefficient for Holder Distribution

### Status
**Accepted**

### Context
Token holder distribution analysis requires a standard metric to measure inequality. We need a widely recognized, mathematically sound metric.

### Decision
**Gini Coefficient (0-1 scale) with additional concentration metrics**

**Formula:**
```
Gini = |1 - Σ(2i - n - 1) * x_i / (n * Σx_i)|

where:
- n = number of holders
- x_i = balance of holder i (sorted ascending)
- i = holder index (1 to n)
```

**Interpretation:**
- 0.0-0.3: Highly equal distribution
- 0.3-0.5: Moderately equal distribution
- 0.5-0.7: Moderately unequal distribution
- 0.7-1.0: Highly unequal distribution

**Additional Metrics:**
- Top 10/50/100 holder percentages
- Whale count (>1% supply)
- Holder type distribution

### Consequences

**Positive:**
- ✅ Widely recognized metric
- ✅ Mathematically sound
- ✅ Easy to interpret
- ✅ Comparable across tokens

**Negative:**
- ❌ Computation intensive for large holder sets
- ❌ Sensitive to outliers
- ❌ Doesn't capture holder behavior

**Mitigation:**
- Efficient sorting algorithms
- Caching of calculated values
- Complementary metrics (top holder %, whale count)
- Regular recalculation (daily)

---

## ADR-003.5: Caching Strategy for Analytics Data

### Status
**Accepted**

### Context
Analytics queries can be expensive (complex aggregations, multi-chain data). We need an effective caching strategy to maintain <500ms response times.

### Decision
**Multi-layer caching with TTL-based invalidation**

**Cache Layers:**
```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Redis (Hot Data)                             │
│  - TTL: 5 minutes                                       │
│  - Data: Current metrics, recent queries               │
└─────────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────┐
│  Layer 2: PostgreSQL Materialized Views                │
│  - Refresh: Every 5 minutes                            │
│  - Data: Aggregated metrics, summaries                 │
└─────────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────┐
│  Layer 3: PostgreSQL (Source of Truth)                 │
│  - Data: Raw metrics, transactions, holdings           │
└─────────────────────────────────────────────────────────┘
```

**Cache Keys:**
```typescript
interface CacheKeys {
  // Protocol analytics
  'analytics:protocol:{protocolId}:performance:{timeRange}': PerformanceData;
  'analytics:yield:{filters_hash}': YieldOpportunity[];
  
  // Portfolio
  'portfolio:{walletAddress}': AggregatedPortfolio;
  'portfolio:{walletAddress}:holdings': Holding[];
  
  // Holder distribution
  'holders:{tokenAddress}:distribution': DistributionMetrics;
  'holders:{tokenAddress}:top': TopHolder[];
}
```

**TTL Strategy:**
- Real-time data: 1 minute
- Analytics data: 5 minutes
- Historical data: 1 hour
- Aggregations: 15 minutes

### Consequences

**Positive:**
- ✅ Fast response times (<100ms cache hits)
- ✅ Reduced database load
- ✅ Scalable to high traffic
- ✅ Cost-effective

**Negative:**
- ❌ Data staleness (up to 5 minutes)
- ❌ Cache invalidation complexity
- ❌ Memory overhead

**Mitigation:**
- Clear TTL documentation
- Cache warming for popular queries
- Proactive cache invalidation on data updates
- Memory monitoring and alerts

---

## ADR-003.6: API Rate Limiting Strategy

### Status
**Accepted**

### Context
Phase 2 APIs are computationally expensive. We need to prevent abuse while providing good UX for legitimate users.

### Decision
**Tiered rate limiting with token bucket algorithm**

**Rate Limit Tiers:**
```typescript
interface RateLimits {
  free: {
    requests_per_minute: 100,
    burst: 20,
    concurrent_connections: 5
  },
  basic: {
    requests_per_minute: 500,
    burst: 50,
    concurrent_connections: 20
  },
  pro: {
    requests_per_minute: 1000,
    burst: 100,
    concurrent_connections: 50
  },
  enterprise: {
    requests_per_minute: 10000,
    burst: 500,
    concurrent_connections: 200
  }
}
```

**Implementation:**
- Token bucket algorithm (Redis-based)
- Per-API-key tracking
- Graceful degradation (429 responses)
- Rate limit headers in responses

**Response Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1697299200
```

### Consequences

**Positive:**
- ✅ Prevents abuse
- ✅ Fair resource allocation
- ✅ Revenue opportunity (paid tiers)
- ✅ Predictable costs

**Negative:**
- ❌ May frustrate legitimate users
- ❌ Requires monitoring and adjustment
- ❌ Additional infrastructure (Redis)

**Mitigation:**
- Clear rate limit documentation
- Generous free tier
- Upgrade prompts in responses
- Monitoring and alerting

---

## ADR-003.7: Database Partitioning Strategy

### Status
**Accepted**

### Context
Time-series data (metrics, transactions, snapshots) will grow rapidly. We need an efficient partitioning strategy for performance and maintenance.

### Decision
**Time-based partitioning with automatic partition management**

**Partitioning Strategy:**
```sql
-- Partition by month for metrics
CREATE TABLE protocol_metrics (
  ...
) PARTITION BY RANGE (timestamp);

CREATE TABLE protocol_metrics_2025_10 PARTITION OF protocol_metrics
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Automatic partition creation
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
BEGIN
  partition_date := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
  partition_name := 'protocol_metrics_' || to_char(partition_date, 'YYYY_MM');
  
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF protocol_metrics
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    partition_date,
    partition_date + INTERVAL '1 month'
  );
END;
$$ LANGUAGE plpgsql;
```

**Retention Policy:**
- Hot data: 30 days (current + 1 month partition)
- Warm data: 90 days (3 months partitions)
- Cold data: Archive to S3 after 90 days

### Consequences

**Positive:**
- ✅ Improved query performance
- ✅ Efficient data archival
- ✅ Easier maintenance
- ✅ Reduced storage costs

**Negative:**
- ❌ Complex partition management
- ❌ Query complexity for cross-partition queries
- ❌ Backup complexity

**Mitigation:**
- Automated partition creation/deletion
- Partition-aware query optimization
- Partition-level backups

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-14  
**Status**: Accepted  
**Review Date**: 2026-01-14 (Quarterly review)

