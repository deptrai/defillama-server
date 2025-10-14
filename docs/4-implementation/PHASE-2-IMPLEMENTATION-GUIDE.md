# Phase 2 Implementation Guide

**Project:** DeFiLlama On-Chain Services Platform  
**Phase:** Phase 2 - Advanced DeFi Analytics & Portfolio Analysis  
**Date:** 2025-10-14  
**Version:** 1.0  

---

## 1. Overview

This guide provides step-by-step instructions for implementing Phase 2 features. It covers setup, development workflow, testing, and deployment procedures.

---

## 2. Prerequisites

### 2.1 Required Tools

```bash
# Node.js and pnpm
node --version  # v20.x or higher
pnpm --version  # v8.x or higher

# PostgreSQL
psql --version  # v15.x or higher

# Redis
redis-cli --version  # v7.x or higher

# AWS CLI
aws --version  # v2.x or higher

# Docker (for local development)
docker --version  # v24.x or higher
```

### 2.2 Environment Setup

```bash
# Clone repository
git clone https://github.com/DefiLlama/defillama-server.git
cd defillama-server

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Configure environment variables
cat > .env << EOF
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=defillama
DB_USER=defillama
DB_PASSWORD=defillama123

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# API
API_KEY_SALT=your-random-salt
RATE_LIMIT_ENABLED=true

# Monitoring
CLOUDWATCH_ENABLED=true
XRAY_ENABLED=true
EOF
```

### 2.3 Database Setup

```bash
# Start PostgreSQL (Docker)
docker run -d \
  --name defillama-postgres \
  -e POSTGRES_DB=defillama \
  -e POSTGRES_USER=defillama \
  -e POSTGRES_PASSWORD=defillama123 \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg15

# Start Redis (Docker)
docker run -d \
  --name defillama-redis \
  -p 6379:6379 \
  redis:7-alpine

# Run migrations
pnpm run migrate:up

# Seed test data
pnpm run seed:dev
```

---

## 3. Development Workflow

### 3.1 Story Implementation Order

**Week 1-2: Story 2.1.1 - Protocol Performance Dashboard**
```bash
# Create feature branch
git checkout -b feature/story-2.1.1-protocol-performance

# Implementation steps:
# 1. Database schema
# 2. Data collection pipeline
# 3. APY/APR calculator
# 4. Cohort analyzer
# 5. API endpoints
# 6. Unit tests
# 7. Integration tests
```

**Week 3-4: Story 2.1.2 - Yield Opportunity Scanner**
```bash
git checkout -b feature/story-2.1.2-yield-scanner

# Implementation steps:
# 1. Database schema
# 2. Yield data collector
# 3. Risk scoring engine
# 4. API endpoints
# 5. Alert system integration
# 6. Tests
```

**Week 5-6: Story 2.1.3 - Liquidity Analysis Tools**
```bash
git checkout -b feature/story-2.1.3-liquidity-analysis

# Implementation steps:
# 1. Database schema
# 2. Liquidity depth analyzer
# 3. LP position tracker
# 4. IL calculator
# 5. API endpoints
# 6. Tests
```

**Week 7: Story 2.2.1 - Wallet Portfolio Tracking**
```bash
git checkout -b feature/story-2.2.1-portfolio-tracking

# Implementation steps:
# 1. Database schema
# 2. Multi-chain balance collector
# 3. Portfolio aggregator
# 4. Performance calculator
# 5. API endpoints
# 6. Tests
```

**Week 8: Story 2.2.2 - Holder Distribution Analysis**
```bash
git checkout -b feature/story-2.2.2-holder-distribution

# Implementation steps:
# 1. Database schema
# 2. Holder data collector
# 3. Gini coefficient calculator
# 4. API endpoints
# 5. Tests
```

### 3.2 Code Structure

```
defi/src/
├── analytics/
│   ├── protocol/
│   │   ├── apy-calculator.ts
│   │   ├── cohort-analyzer.ts
│   │   ├── revenue-aggregator.ts
│   │   └── performance-api.ts
│   ├── yield/
│   │   ├── yield-collector.ts
│   │   ├── risk-scoring-engine.ts
│   │   ├── yield-scanner-api.ts
│   │   └── yield-alerts.ts
│   ├── liquidity/
│   │   ├── depth-analyzer.ts
│   │   ├── lp-tracker.ts
│   │   ├── il-calculator.ts
│   │   └── liquidity-api.ts
│   └── portfolio/
│       ├── balance-collector.ts
│       ├── portfolio-aggregator.ts
│       ├── performance-calculator.ts
│       └── portfolio-api.ts
├── holders/
│   ├── holder-collector.ts
│   ├── gini-calculator.ts
│   ├── distribution-analyzer.ts
│   └── holder-api.ts
├── db/
│   ├── migrations/
│   │   ├── 010_protocol_performance.sql
│   │   ├── 011_yield_opportunities.sql
│   │   ├── 012_liquidity_pools.sql
│   │   ├── 013_wallet_portfolios.sql
│   │   └── 014_token_holders.sql
│   └── repositories/
│       ├── protocol-repository.ts
│       ├── yield-repository.ts
│       ├── liquidity-repository.ts
│       ├── portfolio-repository.ts
│       └── holder-repository.ts
├── cache/
│   ├── cache-manager.ts
│   ├── cache-keys.ts
│   └── cache-strategies.ts
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### 3.3 Development Commands

```bash
# Run development server
pnpm run dev

# Run tests
pnpm test                    # All tests
pnpm test:unit              # Unit tests only
pnpm test:integration       # Integration tests only
pnpm test:e2e               # E2E tests only
pnpm test:coverage          # With coverage report

# Linting and formatting
pnpm run lint               # Check code style
pnpm run lint:fix           # Fix code style
pnpm run format             # Format code

# Type checking
pnpm run typecheck          # Check TypeScript types

# Database operations
pnpm run migrate:up         # Run migrations
pnpm run migrate:down       # Rollback migrations
pnpm run seed:dev           # Seed development data
pnpm run seed:test          # Seed test data

# Build
pnpm run build              # Build for production
pnpm run build:watch        # Build with watch mode
```

---

## 4. Implementation Examples

### 4.1 Database Migration Example

```sql
-- migrations/010_protocol_performance.sql
-- Migration: Create protocol performance tables
-- Author: Luis
-- Date: 2025-10-14

BEGIN;

-- Create protocol_performance_metrics table
CREATE TABLE IF NOT EXISTS protocol_performance_metrics (
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

-- Create indexes
CREATE INDEX idx_protocol_performance_protocol_id 
  ON protocol_performance_metrics(protocol_id);
CREATE INDEX idx_protocol_performance_timestamp 
  ON protocol_performance_metrics(timestamp DESC);
CREATE INDEX idx_protocol_performance_composite 
  ON protocol_performance_metrics(protocol_id, timestamp DESC);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_protocol_performance_updated_at
  BEFORE UPDATE ON protocol_performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

### 4.2 Repository Pattern Example

```typescript
// db/repositories/protocol-repository.ts
import { Pool } from 'pg';
import { ProtocolPerformanceMetrics } from '../types';

export class ProtocolRepository {
  constructor(private pool: Pool) {}

  /**
   * Get protocol performance metrics
   */
  async getPerformanceMetrics(
    protocolId: string,
    timeRange: string
  ): Promise<ProtocolPerformanceMetrics[]> {
    const query = `
      SELECT *
      FROM protocol_performance_metrics
      WHERE protocol_id = $1
        AND timestamp >= NOW() - INTERVAL '1 ${timeRange}'
      ORDER BY timestamp DESC
    `;
    
    const result = await this.pool.query(query, [protocolId]);
    return result.rows;
  }

  /**
   * Insert performance metrics
   */
  async insertPerformanceMetrics(
    metrics: ProtocolPerformanceMetrics
  ): Promise<void> {
    const query = `
      INSERT INTO protocol_performance_metrics (
        protocol_id, timestamp, apy_7d, apy_30d, apy_90d,
        dau, wau, mau, daily_revenue, weekly_revenue
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (protocol_id, timestamp) DO UPDATE SET
        apy_7d = EXCLUDED.apy_7d,
        apy_30d = EXCLUDED.apy_30d,
        updated_at = NOW()
    `;
    
    await this.pool.query(query, [
      metrics.protocolId,
      metrics.timestamp,
      metrics.apy7d,
      metrics.apy30d,
      metrics.apy90d,
      metrics.dau,
      metrics.wau,
      metrics.mau,
      metrics.dailyRevenue,
      metrics.weeklyRevenue,
    ]);
  }
}
```

### 4.3 API Handler Example

```typescript
// analytics/protocol/performance-api.ts
import { Request, Response } from 'express';
import { ProtocolRepository } from '../../db/repositories/protocol-repository';
import { CacheManager } from '../../cache/cache-manager';
import { APYCalculator } from './apy-calculator';

export class ProtocolPerformanceAPI {
  constructor(
    private repository: ProtocolRepository,
    private cache: CacheManager,
    private apyCalculator: APYCalculator
  ) {}

  /**
   * GET /v1/analytics/protocol/:protocolId/performance
   */
  async getPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { protocolId } = req.params;
      const { timeRange = '30d' } = req.query;
      
      // Check cache
      const cacheKey = `analytics:protocol:${protocolId}:performance:${timeRange}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }
      
      // Fetch from database
      const metrics = await this.repository.getPerformanceMetrics(
        protocolId,
        timeRange as string
      );
      
      if (metrics.length === 0) {
        res.status(404).json({ error: 'Protocol not found' });
        return;
      }
      
      // Calculate aggregated metrics
      const response = {
        protocolId,
        timeRange,
        metrics: {
          apy: this.apyCalculator.calculateHistoricalAPY(metrics),
          users: this.calculateUserMetrics(metrics),
          revenue: this.calculateRevenueMetrics(metrics),
        },
      };
      
      // Cache response
      await this.cache.set(cacheKey, response, 300); // 5 minutes TTL
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching protocol performance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private calculateUserMetrics(metrics: ProtocolPerformanceMetrics[]) {
    const latest = metrics[0];
    return {
      dau: latest.dau,
      wau: latest.wau,
      mau: latest.mau,
      growth: this.calculateGrowth(metrics, 'mau'),
      retention: this.calculateRetention(metrics),
    };
  }

  private calculateRevenueMetrics(metrics: ProtocolPerformanceMetrics[]) {
    const latest = metrics[0];
    return {
      daily: latest.dailyRevenue,
      weekly: latest.weeklyRevenue,
      monthly: latest.monthlyRevenue,
      trend: this.calculateGrowth(metrics, 'monthlyRevenue'),
      breakdown: {
        tradingFees: latest.tradingFees,
        withdrawalFees: latest.withdrawalFees,
        performanceFees: latest.performanceFees,
      },
    };
  }
}
```

---

**Version**: 1.0  
**Last Updated**: 2025-10-14  
**Status**: Ready for Use

