# E2E Testing Guide for DeFiLlama Premium Alerts

## 📋 Overview

This document provides a comprehensive guide to End-to-End (E2E) testing for the DeFiLlama Premium Alerts feature.

## 🎯 What is E2E Testing?

**End-to-End (E2E) Testing** validates the complete flow of the application from start to finish, testing:
- Real API Gateway events
- Lambda controller functions
- Service layer business logic
- **Real PostgreSQL database operations**
- Complete request/response cycle

### Differences from Other Test Types

| Test Type | Database | Scope | Speed | Purpose |
|-----------|----------|-------|-------|---------|
| **Unit Tests** | None | Single function/class | Very Fast (~0.1s) | Test isolated logic |
| **Integration Tests** | Mocked | Controller + Service | Fast (~1s) | Test component interaction |
| **E2E Tests** | Real PostgreSQL | Full stack (API → DB) | Slower (~5-10s) | Test complete flow |

## 🏗️ E2E Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     E2E Test Suite                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Mock API Gateway Event                                 │
│     ↓                                                       │
│  2. Lambda Controller (createWhaleAlert, etc.)             │
│     ↓                                                       │
│  3. Service Layer (WhaleAlertService, PriceAlertService)   │
│     ↓                                                       │
│  4. REAL PostgreSQL Database                               │
│     ↓                                                       │
│  5. Verify Response & Database State                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
premium/
├── src/alerts/__tests__/e2e/
│   ├── README.md                    # E2E test documentation
│   ├── setup.ts                     # Database setup utilities
│   ├── global-setup.ts              # Jest global setup
│   ├── global-teardown.ts           # Jest global teardown
│   ├── jest-setup.ts                # Jest environment setup
│   ├── whale-alert.e2e.test.ts      # Whale alert E2E tests (3 test suites)
│   └── price-alert.e2e.test.ts      # Price alert E2E tests (4 test suites)
├── jest.e2e.config.js               # Jest E2E configuration
├── scripts/
│   └── setup-test-db.sh             # Database setup script
└── docs/
    └── E2E-TESTING.md               # This file
```

## 🧪 Test Coverage

### Whale Alert E2E Tests (3 Test Suites, 9 Tests)

**File:** `src/alerts/__tests__/e2e/whale-alert.e2e.test.ts`

1. **Complete Whale Alert E2E Flow** (1 test)
   - ✅ Create whale alert
   - ✅ Get all whale alerts
   - ✅ Get whale alert by ID
   - ✅ Update whale alert
   - ✅ Toggle whale alert (enable/disable)
   - ✅ Delete whale alert
   - ✅ Verify deletion (404 response)

2. **Validation and Error Handling** (2 tests)
   - ✅ Reject invalid whale alert data
   - ✅ Return 404 for non-existent alert

3. **Pagination and Filtering** (2 tests)
   - ✅ Support pagination (page, limit)
   - ✅ Support filtering by status (active/inactive)

### Price Alert E2E Tests (4 Test Suites, 11 Tests)

**File:** `src/alerts/__tests__/e2e/price-alert.e2e.test.ts`

1. **Complete Price Alert E2E Flow** (1 test)
   - ✅ Create price alert
   - ✅ Get all price alerts
   - ✅ Get price alert by ID
   - ✅ Update price alert
   - ✅ Toggle price alert (enable/disable)
   - ✅ Delete price alert
   - ✅ Verify deletion (404 response)

2. **Validation and Error Handling** (2 tests)
   - ✅ Reject invalid price alert data
   - ✅ Return 404 for non-existent alert

3. **Alert Limit Validation (Pro Tier)** (1 test)
   - ✅ Enforce 200 alert limit for Pro tier users

4. **Pagination and Filtering** (3 tests)
   - ✅ Support pagination (page, limit)
   - ✅ Support filtering by status (active/inactive)
   - ✅ Support filtering by alert_type (above/below)

### Total E2E Test Coverage
- **Test Suites:** 7
- **Tests:** 20
- **Coverage:** Complete CRUD operations, validation, pagination, filtering, business logic

## 🚀 Quick Start

### 1. Database Setup

**Option A: Local PostgreSQL (Recommended)**
```bash
# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Run setup script
cd premium
./scripts/setup-test-db.sh

# Set environment variable
export TEST_DB="postgresql://localhost:5432/defillama_test"
```

**Option B: Docker PostgreSQL**
```bash
# Run PostgreSQL in Docker
docker run -d \
  --name defillama-test-db \
  -e POSTGRES_DB=defillama_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5432:5432 \
  postgres:14

# Set environment variable
export TEST_DB="postgresql://test:test@localhost:5432/defillama_test"
```

### 2. Run E2E Tests

```bash
cd premium

# Run all E2E tests
pnpm test:e2e

# Run specific E2E test file
pnpm test:e2e -- whale-alert.e2e.test.ts
pnpm test:e2e -- price-alert.e2e.test.ts

# Run with coverage
pnpm test:e2e -- --coverage

# Run all tests (unit + integration + E2E)
pnpm test:all
```

## 📊 Test Execution Flow

### Global Setup (Before All Tests)
```typescript
// src/alerts/__tests__/e2e/global-setup.ts
1. Create database schema (alert_rules, subscriptions tables)
2. Seed test data (test users with Pro and Premium tiers)
3. Log setup completion
```

### Test Execution
```typescript
// Each E2E test file
1. beforeAll: Clean up existing test data
2. Test: Create mock API Gateway event
3. Test: Call Lambda controller function
4. Test: Controller calls service layer
5. Test: Service executes real SQL queries
6. Test: Verify response and database state
7. afterAll: Clean up test data and close DB connection
```

### Global Teardown (After All Tests)
```typescript
// src/alerts/__tests__/e2e/global-teardown.ts
1. Clean up all test data
2. Close database connections
3. Log teardown completion
```

## 🔧 Configuration

### Jest E2E Config (`jest.e2e.config.js`)
```javascript
{
  testMatch: ['**/__tests__/e2e/**/*.e2e.test.ts'],
  testTimeout: 30000, // 30 seconds for database operations
  globalSetup: '<rootDir>/src/alerts/__tests__/e2e/global-setup.ts',
  globalTeardown: '<rootDir>/src/alerts/__tests__/e2e/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/src/alerts/__tests__/e2e/jest-setup.ts'],
}
```

### Environment Variables
```bash
# Required: Database connection string
export TEST_DB="postgresql://localhost:5432/defillama_test"

# Or use existing PREMIUM_DB (not recommended for production)
export PREMIUM_DB="postgresql://localhost:5432/defillama_dev"

# Optional: Node environment
export NODE_ENV="test"
```

## 🧹 Test Data Management

### Test Users
```typescript
// Created in global setup
{
  userId: 'test-user-pro',
  tier: 'pro',
  status: 'active',
  alertLimit: 200
}

{
  userId: 'test-user-premium',
  tier: 'premium',
  status: 'active',
  alertLimit: Unlimited
}
```

### Test Alerts
- Automatically created during tests
- Prefixed with "E2E Test" or "Pagination Test"
- Cleaned up in `afterAll` hooks
- All test data uses `user_id LIKE 'test-user-%'` pattern

### Cleanup Strategy
```typescript
// After each test suite
await db`
  DELETE FROM alert_rules
  WHERE user_id LIKE 'test-user-%'
`;
```

## 🐛 Troubleshooting

### Error: "Database connection string not found"
```bash
# Solution: Set TEST_DB environment variable
export TEST_DB="postgresql://localhost:5432/defillama_test"
```

### Error: "relation 'alert_rules' does not exist"
```bash
# Solution: Database schema not created
# Check global setup logs
# Verify database exists
psql $TEST_DB -c "SELECT version();"
```

### Error: "Connection refused"
```bash
# Solution: PostgreSQL not running
brew services start postgresql@14  # macOS
sudo service postgresql start      # Linux
docker start defillama-test-db     # Docker
```

### Tests Timeout
```bash
# Solution: Increase timeout in jest.e2e.config.js
testTimeout: 60000  # 60 seconds
```

### Clean Up Test Data Manually
```bash
# Connect to test database
psql $TEST_DB

# Delete test data
DELETE FROM alert_rules WHERE user_id LIKE 'test-user-%';
DELETE FROM subscriptions WHERE user_id LIKE 'test-user-%';
```

## 📈 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: defillama_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: cd premium && pnpm install
      
      - name: Run E2E tests
        env:
          TEST_DB: postgresql://test:test@localhost:5432/defillama_test
        run: cd premium && pnpm test:e2e
```

## ✅ Best Practices

1. **Use Separate Test Database**
   - Never run E2E tests against production database
   - Use `TEST_DB` instead of `PREMIUM_DB`

2. **Clean Up After Tests**
   - Always clean up test data in `afterAll` hooks
   - Use consistent test data prefixes (`test-user-%`)

3. **Idempotent Tests**
   - Tests should be able to run multiple times
   - Don't rely on specific database state

4. **Realistic Data**
   - Use realistic test data that matches production patterns
   - Test edge cases and boundary conditions

5. **Test Isolation**
   - Each test should be independent
   - Don't rely on execution order

6. **Error Scenarios**
   - Test both success and failure cases
   - Verify error messages and status codes

7. **Performance Monitoring**
   - Monitor test execution time
   - Optimize slow tests

## 🎯 Next Steps

After completing E2E tests, consider:

1. **Load Testing**
   - Test concurrent alert operations
   - Verify database performance under load

2. **Notification E2E Tests**
   - Test email delivery
   - Test Telegram/Discord webhooks

3. **Alert Execution E2E Tests**
   - Test alert triggering logic
   - Test notification delivery

4. **Multi-User Scenarios**
   - Test concurrent user operations
   - Test data isolation between users

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Serverless Framework](https://www.serverless.com/framework/docs)
- [AWS Lambda Testing](https://docs.aws.amazon.com/lambda/latest/dg/testing-functions.html)

## 🤝 Support

For issues or questions:
1. Check this documentation
2. Review test logs for error messages
3. Verify database connection and schema
4. Check environment variables
5. Contact the development team

