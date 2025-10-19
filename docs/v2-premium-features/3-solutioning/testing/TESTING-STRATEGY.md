# Testing Strategy - DeFiLlama Premium Features v2.0

**Version**: 2.0.0  
**Last Updated**: 2025-10-19

---

## Overview

Comprehensive testing strategy for DeFiLlama Premium Features v2.0 covering unit tests, integration tests, E2E tests, performance tests, and security tests.

**Testing Pyramid**:
```
        /\
       /  \  E2E Tests (10%)
      /____\
     /      \  Integration Tests (30%)
    /________\
   /          \  Unit Tests (60%)
  /__________\
```

**Coverage Targets**:
- Unit Tests: 80%+ code coverage
- Integration Tests: 70%+ API coverage
- E2E Tests: 100% critical user flows
- Performance Tests: All high-traffic endpoints
- Security Tests: All authentication & authorization flows

---

## 1. Unit Testing

### 1.1 Backend Unit Tests

**Framework**: Jest + TypeScript  
**Coverage Target**: 80%+

**Test Categories**:
- Service layer logic
- Data validation
- Business rules
- Utility functions
- Error handling

**Example: Alert Rule Service**

```typescript
// alert-rule.service.test.ts
import { AlertRuleService } from './alert-rule.service';
import { PrismaClient } from '@prisma/client';

describe('AlertRuleService', () => {
  let service: AlertRuleService;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    service = new AlertRuleService(prisma);
  });

  describe('createWhaleAlert', () => {
    it('should create whale alert with valid threshold', async () => {
      const rule = await service.createRule({
        user_id: 'user-123',
        rule_type: 'whale_movement',
        conditions: {
          threshold: 100000,
          tokens: ['ETH'],
          chains: ['ethereum']
        }
      });

      expect(rule.id).toBeDefined();
      expect(rule.rule_type).toBe('whale_movement');
      expect(rule.conditions.threshold).toBe(100000);
    });

    it('should reject threshold below minimum', async () => {
      await expect(
        service.createRule({
          user_id: 'user-123',
          rule_type: 'whale_movement',
          conditions: { threshold: 50000 }
        })
      ).rejects.toThrow('Threshold must be >= $100,000');
    });

    it('should validate wallet addresses', async () => {
      await expect(
        service.createRule({
          user_id: 'user-123',
          rule_type: 'whale_movement',
          conditions: {
            threshold: 100000,
            wallets: ['invalid-address']
          }
        })
      ).rejects.toThrow('Invalid wallet address');
    });
  });

  describe('evaluateRule', () => {
    it('should trigger alert when threshold exceeded', () => {
      const rule = {
        conditions: { threshold: 100000 }
      };
      const event = {
        amount: 150000,
        token: 'ETH'
      };

      const result = service.evaluateRule(rule, event);
      expect(result.shouldTrigger).toBe(true);
    });

    it('should not trigger when below threshold', () => {
      const rule = {
        conditions: { threshold: 100000 }
      };
      const event = {
        amount: 50000,
        token: 'ETH'
      };

      const result = service.evaluateRule(rule, event);
      expect(result.shouldTrigger).toBe(false);
    });
  });
});
```

**Run Unit Tests**:
```bash
npm run test:unit
npm run test:unit:coverage
```

---

## 2. Integration Testing

### 2.1 API Integration Tests

**Framework**: Supertest + Jest  
**Coverage Target**: 70%+ API endpoints

**Test Categories**:
- API endpoint functionality
- Request/response validation
- Database operations
- External service integrations
- Error handling

**Example: Alert API Integration Test**

```typescript
// alert-api.integration.test.ts
import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';

describe('Alert API Integration', () => {
  let prisma: PrismaClient;
  let authToken: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    // Get auth token
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password'
      });
    authToken = response.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /alerts/rules', () => {
    it('should create whale alert rule', async () => {
      const response = await request(app)
        .post('/v2/alerts/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rule_type: 'whale_movement',
          conditions: {
            threshold: 100000,
            tokens: ['ETH']
          },
          notification_channels: {
            email: true
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.rule_type).toBe('whale_movement');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/v2/alerts/rules')
        .send({
          rule_type: 'whale_movement',
          conditions: { threshold: 100000 }
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 with invalid data', async () => {
      const response = await request(app)
        .post('/v2/alerts/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rule_type: 'invalid_type'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /alerts/history', () => {
    it('should return alert history with pagination', async () => {
      const response = await request(app)
        .get('/v2/alerts/history?page=1&limit=50')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.alerts).toBeInstanceOf(Array);
      expect(response.body.total).toBeDefined();
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(50);
    });

    it('should filter by chain and token', async () => {
      const response = await request(app)
        .get('/v2/alerts/history?chain=ethereum&token=ETH')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.alerts.forEach(alert => {
        expect(alert.event_data.chain).toBe('ethereum');
        expect(alert.event_data.token).toBe('ETH');
      });
    });
  });
});
```

**Run Integration Tests**:
```bash
npm run test:integration
```

---

## 3. End-to-End (E2E) Testing

### 3.1 Critical User Flows

**Framework**: Playwright  
**Coverage Target**: 100% critical flows

**Test Scenarios**:
1. User Registration & Login
2. Create Whale Alert → Receive Notification
3. Configure Price Alert → Trigger Alert
4. Generate Tax Report → Download PDF
5. View Portfolio → Export Data

**Example: E2E Whale Alert Flow**

```typescript
// whale-alert.e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Whale Alert E2E Flow', () => {
  test('should create whale alert and receive notification', async ({ page }) => {
    // 1. Login
    await page.goto('https://defillama.com/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. Navigate to Alerts
    await page.click('text=Alerts');
    await expect(page).toHaveURL('/alerts');

    // 3. Create Whale Alert
    await page.click('text=Create Alert');
    await page.selectOption('[name="rule_type"]', 'whale_movement');
    await page.fill('[name="threshold"]', '100000');
    await page.check('[name="email_notification"]');
    await page.click('button:has-text("Create")');

    // 4. Verify Alert Created
    await expect(page.locator('text=Alert created successfully')).toBeVisible();
    await expect(page.locator('.alert-rule')).toContainText('Whale Movement');

    // 5. Simulate Whale Transaction (via API)
    // ... trigger test transaction

    // 6. Verify Notification Received
    await page.goto('/alerts/history');
    await expect(page.locator('.alert-history-item').first()).toBeVisible();
    await expect(page.locator('.alert-history-item').first())
      .toContainText('Whale Movement Detected');
  });
});
```

**Run E2E Tests**:
```bash
npm run test:e2e
npm run test:e2e:headed  # With browser UI
```

---

## 4. Performance Testing

### 4.1 Load Testing

**Framework**: k6  
**Target**: 1M+ events/day, <5s latency

**Test Scenarios**:
- Alert rule evaluation: 1000 RPS
- API endpoints: 100 RPS per endpoint
- WebSocket connections: 10K concurrent
- Database queries: <100ms p95

**Example: k6 Load Test**

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Stay at 100 RPS
    { duration: '2m', target: 200 },  // Ramp to 200 RPS
    { duration: '5m', target: 200 },  // Stay at 200 RPS
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% < 5s
    http_req_failed: ['rate<0.01'],    // <1% errors
  },
};

export default function () {
  const token = 'your-test-token';
  
  const response = http.get('https://api.defillama.com/v2/alerts/history', {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 5s': (r) => r.timings.duration < 5000,
  });

  sleep(1);
}
```

**Run Load Tests**:
```bash
k6 run load-test.js
```

---

## 5. Security Testing

### 5.1 Authentication & Authorization

**Test Cases**:
- ✅ JWT token validation
- ✅ Token expiration handling
- ✅ Role-based access control
- ✅ API key validation
- ✅ Rate limiting

### 5.2 Input Validation

**Test Cases**:
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ CSRF protection
- ✅ Input sanitization

### 5.3 Security Scan

**Tools**:
- OWASP ZAP
- Snyk (dependency scanning)
- SonarQube (code quality)

**Run Security Tests**:
```bash
npm run test:security
npm audit
```

---

## 6. Test Automation

### 6.1 CI/CD Pipeline

**GitHub Actions Workflow**:

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:unit:coverage
      - uses: codecov/codecov-action@v2

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## 7. Test Data Management

### 7.1 Test Database

**Setup**:
```bash
# Create test database
createdb defillama_test

# Run migrations
npm run migrate:test

# Seed test data
npm run seed:test
```

### 7.2 Mock Data

**Factories**:
```typescript
// factories/alert-rule.factory.ts
export const createAlertRule = (overrides = {}) => ({
  id: uuid(),
  user_id: 'test-user',
  rule_type: 'whale_movement',
  conditions: { threshold: 100000 },
  is_active: true,
  ...overrides
});
```

---

## Success Metrics

**Test Coverage**:
- ✅ Unit Tests: 80%+ coverage
- ✅ Integration Tests: 70%+ API coverage
- ✅ E2E Tests: 100% critical flows
- ✅ Performance: <5s p95 latency
- ✅ Security: 0 critical vulnerabilities

**CI/CD**:
- ✅ All tests pass before merge
- ✅ Automated deployment on success
- ✅ Rollback on test failure

---

**Last Updated**: 2025-10-19  
**Maintained by**: QA Team

