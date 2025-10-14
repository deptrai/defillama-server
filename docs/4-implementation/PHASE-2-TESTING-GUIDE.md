# Phase 2 Testing Guide

**Project:** DeFiLlama On-Chain Services Platform  
**Phase:** Phase 2 - Advanced DeFi Analytics & Portfolio Analysis  
**Date:** 2025-10-14  
**Version:** 1.0  

---

## 1. Testing Strategy Overview

### 1.1 Testing Pyramid

```
           ┌─────────────┐
           │   E2E (5%)  │  ← Real-world scenarios
           ├─────────────┤
           │ Integration │  ← API + DB + Cache
           │    (25%)    │
           ├─────────────┤
           │    Unit     │  ← Business logic
           │    (70%)    │
           └─────────────┘
```

### 1.2 Coverage Targets

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 80%+ coverage
- **E2E Tests**: Critical paths only
- **Performance Tests**: All API endpoints

---

## 2. Unit Testing

### 2.1 APY Calculator Tests

```typescript
// tests/unit/analytics/apy-calculator.test.ts
import { APYCalculator } from '../../../src/analytics/protocol/apy-calculator';

describe('APYCalculator', () => {
  let calculator: APYCalculator;

  beforeEach(() => {
    calculator = new APYCalculator();
  });

  describe('calculateAPY', () => {
    it('should calculate APY from APR with daily compounding', () => {
      const apr = 0.10; // 10% APR
      const apy = calculator.calculateAPY(apr, 365);
      expect(apy).toBeCloseTo(0.1052, 4); // ~10.52% APY
    });

    it('should calculate APY from APR with weekly compounding', () => {
      const apr = 0.10;
      const apy = calculator.calculateAPY(apr, 52);
      expect(apy).toBeCloseTo(0.1047, 4);
    });

    it('should handle zero APR', () => {
      const apy = calculator.calculateAPY(0, 365);
      expect(apy).toBe(0);
    });

    it('should handle negative APR', () => {
      const apy = calculator.calculateAPY(-0.05, 365);
      expect(apy).toBeLessThan(0);
    });

    it('should handle very high APR', () => {
      const apr = 10.0; // 1000% APR
      const apy = calculator.calculateAPY(apr, 365);
      expect(apy).toBeGreaterThan(10);
    });
  });

  describe('calculateHistoricalAPY', () => {
    it('should calculate average APY from historical data', () => {
      const metrics = [
        { timestamp: new Date('2025-10-14'), apy7d: 0.12 },
        { timestamp: new Date('2025-10-13'), apy7d: 0.11 },
        { timestamp: new Date('2025-10-12'), apy7d: 0.10 },
      ];
      
      const result = calculator.calculateHistoricalAPY(metrics);
      expect(result.average).toBeCloseTo(0.11, 2);
    });

    it('should calculate APY volatility', () => {
      const metrics = [
        { timestamp: new Date('2025-10-14'), apy7d: 0.15 },
        { timestamp: new Date('2025-10-13'), apy7d: 0.10 },
        { timestamp: new Date('2025-10-12'), apy7d: 0.05 },
      ];
      
      const result = calculator.calculateHistoricalAPY(metrics);
      expect(result.volatility).toBeGreaterThan(0);
    });

    it('should calculate APY trend', () => {
      const metrics = [
        { timestamp: new Date('2025-10-14'), apy7d: 0.12 },
        { timestamp: new Date('2025-10-13'), apy7d: 0.11 },
        { timestamp: new Date('2025-10-12'), apy7d: 0.10 },
      ];
      
      const result = calculator.calculateHistoricalAPY(metrics);
      expect(result.trend).toBeGreaterThan(0); // Upward trend
    });
  });
});
```

### 2.2 Risk Scoring Engine Tests

```typescript
// tests/unit/analytics/risk-scoring-engine.test.ts
import { RiskScoringEngine } from '../../../src/analytics/yield/risk-scoring-engine';

describe('RiskScoringEngine', () => {
  let engine: RiskScoringEngine;

  beforeEach(() => {
    engine = new RiskScoringEngine();
  });

  describe('calculateRiskScore', () => {
    it('should score low risk for high TVL + audited protocol', () => {
      const opportunity = {
        tvl: 150_000_000,
        auditStatus: 'multiple_audits',
        protocolAgeDays: 800,
        yieldVolatility: 0.03,
      };
      
      const score = engine.calculateRiskScore(opportunity);
      expect(score).toBeLessThan(30); // Low risk
    });

    it('should score high risk for low TVL + unaudited protocol', () => {
      const opportunity = {
        tvl: 50_000,
        auditStatus: 'none',
        protocolAgeDays: 60,
        yieldVolatility: 0.60,
      };
      
      const score = engine.calculateRiskScore(opportunity);
      expect(score).toBeGreaterThan(60); // High risk
    });

    it('should score medium risk for mixed factors', () => {
      const opportunity = {
        tvl: 5_000_000,
        auditStatus: 'single_audit',
        protocolAgeDays: 200,
        yieldVolatility: 0.15,
      };
      
      const score = engine.calculateRiskScore(opportunity);
      expect(score).toBeGreaterThanOrEqual(30);
      expect(score).toBeLessThanOrEqual(60);
    });
  });

  describe('classifyRisk', () => {
    it('should classify as low risk', () => {
      const category = engine.classifyRisk(25);
      expect(category).toBe('low');
    });

    it('should classify as medium risk', () => {
      const category = engine.classifyRisk(45);
      expect(category).toBe('medium');
    });

    it('should classify as high risk', () => {
      const category = engine.classifyRisk(75);
      expect(category).toBe('high');
    });
  });
});
```

### 2.3 Gini Coefficient Calculator Tests

```typescript
// tests/unit/holders/gini-calculator.test.ts
import { GiniCoefficientCalculator } from '../../../src/holders/gini-calculator';

describe('GiniCoefficientCalculator', () => {
  let calculator: GiniCoefficientCalculator;

  beforeEach(() => {
    calculator = new GiniCoefficientCalculator();
  });

  describe('calculateGini', () => {
    it('should return 0 for perfect equality', () => {
      const balances = [100, 100, 100, 100, 100];
      const gini = calculator.calculateGini(balances);
      expect(gini).toBeCloseTo(0, 2);
    });

    it('should return ~1 for perfect inequality', () => {
      const balances = [0, 0, 0, 0, 10000];
      const gini = calculator.calculateGini(balances);
      expect(gini).toBeGreaterThan(0.8);
    });

    it('should calculate moderate inequality', () => {
      const balances = [10, 20, 30, 40, 100];
      const gini = calculator.calculateGini(balances);
      expect(gini).toBeGreaterThan(0.2);
      expect(gini).toBeLessThan(0.5);
    });

    it('should handle empty array', () => {
      const gini = calculator.calculateGini([]);
      expect(gini).toBe(0);
    });

    it('should handle single holder', () => {
      const gini = calculator.calculateGini([1000]);
      expect(gini).toBe(0);
    });
  });

  describe('classifyDistribution', () => {
    it('should classify as highly equal', () => {
      const classification = calculator.classifyDistribution(0.2);
      expect(classification).toBe('highly_equal');
    });

    it('should classify as moderately equal', () => {
      const classification = calculator.classifyDistribution(0.4);
      expect(classification).toBe('moderately_equal');
    });

    it('should classify as moderately unequal', () => {
      const classification = calculator.classifyDistribution(0.6);
      expect(classification).toBe('moderately_unequal');
    });

    it('should classify as highly unequal', () => {
      const classification = calculator.classifyDistribution(0.8);
      expect(classification).toBe('highly_unequal');
    });
  });
});
```

---

## 3. Integration Testing

### 3.1 Protocol Performance API Integration Tests

```typescript
// tests/integration/analytics/protocol-performance-api.test.ts
import request from 'supertest';
import { app } from '../../../src/app';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/db';

describe('Protocol Performance API Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /v1/analytics/protocol/:protocolId/performance', () => {
    it('should return performance metrics for valid protocol', async () => {
      const response = await request(app)
        .get('/v1/analytics/protocol/uniswap-v3/performance?timeRange=30d')
        .set('Authorization', 'Bearer test-api-key')
        .expect(200);
      
      expect(response.body).toHaveProperty('protocolId', 'uniswap-v3');
      expect(response.body).toHaveProperty('timeRange', '30d');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('apy');
      expect(response.body.metrics).toHaveProperty('users');
      expect(response.body.metrics).toHaveProperty('revenue');
    });

    it('should return 404 for non-existent protocol', async () => {
      await request(app)
        .get('/v1/analytics/protocol/non-existent/performance')
        .set('Authorization', 'Bearer test-api-key')
        .expect(404);
    });

    it('should return 401 without API key', async () => {
      await request(app)
        .get('/v1/analytics/protocol/uniswap-v3/performance')
        .expect(401);
    });

    it('should return cached data on second request', async () => {
      const start1 = Date.now();
      await request(app)
        .get('/v1/analytics/protocol/uniswap-v3/performance')
        .set('Authorization', 'Bearer test-api-key');
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      await request(app)
        .get('/v1/analytics/protocol/uniswap-v3/performance')
        .set('Authorization', 'Bearer test-api-key');
      const time2 = Date.now() - start2;
      
      expect(time2).toBeLessThan(time1 * 0.5); // Cache should be 2x faster
    });

    it('should support different time ranges', async () => {
      const timeRanges = ['7d', '30d', '90d', '1y'];
      
      for (const timeRange of timeRanges) {
        const response = await request(app)
          .get(`/v1/analytics/protocol/uniswap-v3/performance?timeRange=${timeRange}`)
          .set('Authorization', 'Bearer test-api-key')
          .expect(200);
        
        expect(response.body.timeRange).toBe(timeRange);
      }
    });
  });
});
```

### 3.2 Portfolio Aggregation Integration Tests

```typescript
// tests/integration/portfolio/portfolio-aggregator.test.ts
import { PortfolioAggregator } from '../../../src/analytics/portfolio/portfolio-aggregator';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/db';

describe('Portfolio Aggregator Integration', () => {
  let aggregator: PortfolioAggregator;

  beforeAll(async () => {
    await setupTestDatabase();
    aggregator = new PortfolioAggregator(/* dependencies */);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('aggregatePortfolio', () => {
    it('should aggregate portfolio across multiple chains', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const chains = ['ethereum', 'polygon', 'arbitrum'];
      
      const portfolio = await aggregator.aggregatePortfolio(walletAddress, chains);
      
      expect(portfolio.walletAddress).toBe(walletAddress);
      expect(portfolio.holdings.length).toBeGreaterThan(0);
      expect(portfolio.totalValueUsd).toBeGreaterThan(0);
      expect(portfolio.performance).toBeDefined();
      expect(portfolio.risk).toBeDefined();
    });

    it('should handle empty portfolio', async () => {
      const walletAddress = '0x0000000000000000000000000000000000000000';
      const chains = ['ethereum'];
      
      const portfolio = await aggregator.aggregatePortfolio(walletAddress, chains);
      
      expect(portfolio.holdings.length).toBe(0);
      expect(portfolio.totalValueUsd).toBe(0);
    });

    it('should calculate risk metrics correctly', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const chains = ['ethereum'];
      
      const portfolio = await aggregator.aggregatePortfolio(walletAddress, chains);
      
      expect(portfolio.risk.concentrationScore).toBeGreaterThanOrEqual(0);
      expect(portfolio.risk.concentrationScore).toBeLessThanOrEqual(100);
      expect(portfolio.risk.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(portfolio.risk.diversificationScore).toBeLessThanOrEqual(100);
    });
  });
});
```

---

## 4. Performance Testing

### 4.1 k6 Load Test Script

```javascript
// tests/performance/protocol-analytics-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 1000 },  // Ramp up to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.defillama.com';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export default function () {
  const protocols = ['uniswap-v3', 'aave-v3', 'curve', 'compound-v3'];
  const protocol = protocols[Math.floor(Math.random() * protocols.length)];
  
  const response = http.get(
    `${BASE_URL}/v1/analytics/protocol/${protocol}/performance?timeRange=30d`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    }
  );
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has metrics': (r) => JSON.parse(r.body).metrics !== undefined,
  });
  
  errorRate.add(!success);
  
  sleep(1);
}
```

### 4.2 Running Performance Tests

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt-get install k6  # Ubuntu

# Run load test
k6 run tests/performance/protocol-analytics-load.js

# Run with custom parameters
k6 run \
  --env BASE_URL=https://staging-api.defillama.com \
  --env API_KEY=your-api-key \
  tests/performance/protocol-analytics-load.js

# Generate HTML report
k6 run --out json=results.json tests/performance/protocol-analytics-load.js
k6-reporter results.json --output results.html
```

---

**Version**: 1.0  
**Last Updated**: 2025-10-14  
**Status**: Ready for Use

