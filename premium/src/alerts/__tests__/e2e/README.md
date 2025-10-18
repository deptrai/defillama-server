# E2E Tests for DeFiLlama Premium Alerts

## Overview

End-to-End (E2E) tests for the Premium Alerts feature, testing the complete flow from API Gateway events through Lambda controllers and services to the PostgreSQL database.

## Test Coverage

### Whale Alert E2E Tests (`whale-alert.e2e.test.ts`)
- ✅ Complete CRUD lifecycle (Create → Read → Update → Toggle → Delete)
- ✅ Validation and error handling
- ✅ Pagination and filtering
- ✅ Real database operations

### Price Alert E2E Tests (`price-alert.e2e.test.ts`)
- ✅ Complete CRUD lifecycle (Create → Read → Update → Toggle → Delete)
- ✅ Validation and error handling
- ✅ Alert limit validation (Pro tier: 200 alerts)
- ✅ Pagination and filtering
- ✅ Real database operations

## Prerequisites

### 1. Database Setup

You need a PostgreSQL database for E2E testing. You can use:

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Create test database
createdb defillama_test

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

**Option C: Use Existing PREMIUM_DB**
```bash
# If you already have PREMIUM_DB set, E2E tests will use it
# WARNING: E2E tests will create and delete test data
export PREMIUM_DB="postgresql://user:pass@host:5432/database"
```

### 2. Environment Variables

Set the database connection string:

```bash
# Recommended: Use separate test database
export TEST_DB="postgresql://localhost:5432/defillama_test"

# Or use existing PREMIUM_DB (not recommended for production)
export PREMIUM_DB="postgresql://localhost:5432/defillama_dev"
```

## Running E2E Tests

### Run All E2E Tests
```bash
cd premium
pnpm test:e2e
```

### Run Specific E2E Test File
```bash
# Whale alert E2E tests only
pnpm test:e2e -- whale-alert.e2e.test.ts

# Price alert E2E tests only
pnpm test:e2e -- price-alert.e2e.test.ts
```

### Run All Tests (Unit + Integration + E2E)
```bash
pnpm test:all
```

### Run with Coverage
```bash
pnpm test:e2e -- --coverage
```

## Test Structure

```
premium/src/alerts/__tests__/e2e/
├── README.md                    # This file
├── setup.ts                     # Database setup and teardown utilities
├── global-setup.ts              # Jest global setup (runs once before all tests)
├── global-teardown.ts           # Jest global teardown (runs once after all tests)
├── jest-setup.ts                # Jest setup (runs before each test file)
├── whale-alert.e2e.test.ts      # Whale alert E2E tests
└── price-alert.e2e.test.ts      # Price alert E2E tests
```

## How E2E Tests Work

### 1. Global Setup (Before All Tests)
- Creates database schema (alert_rules, subscriptions tables)
- Seeds test data (test users with Pro and Premium tiers)

### 2. Test Execution
- Each test creates real API Gateway events
- Calls Lambda controller functions
- Controllers call service layer
- Services execute real SQL queries against test database
- Verifies database state and API responses

### 3. Global Teardown (After All Tests)
- Cleans up test data
- Closes database connections

## Test Data

### Test Users
- `test-user-pro`: Pro tier user (200 alert limit)
- `test-user-premium`: Premium tier user (unlimited alerts)

### Test Alerts
- Created during tests
- Automatically cleaned up after each test suite
- Prefixed with "E2E Test" or "Pagination Test"

## Differences from Integration Tests

| Aspect | Integration Tests | E2E Tests |
|--------|------------------|-----------|
| Database | Mocked (jest.mock) | Real PostgreSQL |
| Scope | Controller + Service logic | Full stack (API → DB) |
| Speed | Fast (~1s) | Slower (~5-10s) |
| Isolation | Complete | Requires DB setup |
| Purpose | Test business logic | Test full integration |

## Troubleshooting

### Error: "Database connection string not found"
```bash
# Set TEST_DB or PREMIUM_DB environment variable
export TEST_DB="postgresql://localhost:5432/defillama_test"
```

### Error: "relation 'alert_rules' does not exist"
```bash
# Database schema not created. Check global setup logs
# Ensure database exists and is accessible
psql $TEST_DB -c "SELECT version();"
```

### Error: "Connection refused"
```bash
# PostgreSQL not running
brew services start postgresql@14  # macOS
sudo service postgresql start      # Linux
docker start defillama-test-db     # Docker
```

### Tests Timeout
```bash
# Increase timeout in jest.e2e.config.js
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

## CI/CD Integration

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
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
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

## Best Practices

1. **Use Separate Test Database**: Never run E2E tests against production database
2. **Clean Up After Tests**: Always clean up test data in `afterAll` hooks
3. **Idempotent Tests**: Tests should be able to run multiple times
4. **Realistic Data**: Use realistic test data that matches production patterns
5. **Test Isolation**: Each test should be independent and not rely on other tests
6. **Error Scenarios**: Test both success and failure cases
7. **Performance**: Monitor test execution time and optimize slow tests

## Future Enhancements

- [ ] Add E2E tests for notification delivery (email, Telegram, Discord)
- [ ] Add E2E tests for alert triggering and execution
- [ ] Add E2E tests for webhook integrations
- [ ] Add load testing for concurrent alert operations
- [ ] Add E2E tests for alert history and audit logs
- [ ] Add E2E tests for multi-user scenarios
- [ ] Add E2E tests for rate limiting and throttling

## Support

For issues or questions about E2E tests:
1. Check this README
2. Review test logs for error messages
3. Verify database connection and schema
4. Check environment variables
5. Contact the development team

