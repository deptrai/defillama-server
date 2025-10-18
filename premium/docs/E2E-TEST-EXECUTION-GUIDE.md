# E2E Test Execution Guide

## 🎯 Overview

This guide demonstrates how to execute E2E tests for DeFiLlama Premium Alerts with real database connection.

## 📋 Prerequisites Checklist

Before running E2E tests, ensure you have:

- [ ] PostgreSQL 14+ installed (or Docker)
- [ ] Test database created
- [ ] `TEST_DB` environment variable set
- [ ] All dependencies installed (`pnpm install`)

## 🚀 Step-by-Step Execution

### Step 1: Database Setup

#### Option A: Local PostgreSQL (Recommended for macOS/Linux)

```bash
# 1. Install PostgreSQL (if not already installed)
# macOS
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql-14
sudo service postgresql start

# 2. Create test database
createdb defillama_test

# 3. Verify database connection
psql defillama_test -c "SELECT version();"

# 4. Set environment variable
export TEST_DB="postgresql://localhost:5432/defillama_test"

# 5. Verify environment variable
echo $TEST_DB
```

#### Option B: Docker PostgreSQL (Recommended for Windows/Cross-platform)

```bash
# 1. Pull PostgreSQL image
docker pull postgres:14

# 2. Run PostgreSQL container
docker run -d \
  --name defillama-test-db \
  -e POSTGRES_DB=defillama_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5432:5432 \
  postgres:14

# 3. Wait for container to be ready (5-10 seconds)
sleep 10

# 4. Verify container is running
docker ps | grep defillama-test-db

# 5. Test database connection
docker exec defillama-test-db psql -U test -d defillama_test -c "SELECT version();"

# 6. Set environment variable
export TEST_DB="postgresql://test:test@localhost:5432/defillama_test"

# 7. Verify environment variable
echo $TEST_DB
```

#### Option C: Use Existing Database (Not Recommended for Production)

```bash
# WARNING: E2E tests will create and delete test data
# Only use this with development/staging databases

export TEST_DB="postgresql://user:password@host:5432/database"
```

### Step 2: Install Dependencies

```bash
cd /Users/mac_1/Documents/GitHub/defillama/defillama-server/premium

# Install dependencies (if not already installed)
pnpm install

# Verify installation
pnpm list | grep jest
pnpm list | grep postgres
```

### Step 3: Run E2E Tests

#### Run All E2E Tests

```bash
# Set environment variable (if not already set)
export TEST_DB="postgresql://test:test@localhost:5432/defillama_test"

# Run all E2E tests
pnpm test:e2e
```

**Expected Output:**
```
🚀 Starting E2E Test Suite...

✅ Test database schema created
✅ Test data seeded
✅ E2E test environment ready

 PASS  src/alerts/__tests__/e2e/whale-alert.e2e.test.ts
  Whale Alert E2E Tests
    Complete Whale Alert E2E Flow
      ✓ should create, get, update, toggle, and delete a whale alert (1234 ms)
    Validation and Error Handling
      ✓ should reject invalid whale alert data (45 ms)
      ✓ should return 404 for non-existent alert (32 ms)
    Pagination and Filtering
      ✓ should support pagination (156 ms)
      ✓ should support filtering by status (142 ms)

 PASS  src/alerts/__tests__/e2e/price-alert.e2e.test.ts
  Price Alert E2E Tests
    Complete Price Alert E2E Flow
      ✓ should create, get, update, toggle, and delete a price alert (1456 ms)
    Validation and Error Handling
      ✓ should reject invalid price alert data (48 ms)
      ✓ should return 404 for non-existent alert (35 ms)
    Alert Limit Validation (Pro Tier)
      ✓ should enforce 200 alert limit for Pro tier users (89 ms)
    Pagination and Filtering
      ✓ should support pagination (178 ms)
      ✓ should support filtering by status (165 ms)
      ✓ should support filtering by alert_type (152 ms)

🧹 Cleaning up E2E test environment...
✅ Test data cleaned up
✅ Test database connection closed
✅ E2E test environment cleaned up

Test Suites: 2 passed, 2 total
Tests:       20 passed, 20 total
Snapshots:   0 total
Time:        12.456 s
Ran all test suites matching /e2e/i.
```

#### Run Specific E2E Test File

```bash
# Whale alert E2E tests only
pnpm test:e2e -- whale-alert.e2e.test.ts

# Price alert E2E tests only
pnpm test:e2e -- price-alert.e2e.test.ts
```

#### Run with Coverage

```bash
pnpm test:e2e -- --coverage
```

**Expected Output:**
```
--------------------------|---------|----------|---------|---------|-------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
--------------------------|---------|----------|---------|---------|-------------------
All files                 |   98.45 |    95.23 |   97.89 |   98.67 |                   
 controllers              |   98.12 |    94.56 |   97.45 |   98.34 |                   
  whale-alert.controller  |   98.34 |    95.12 |   97.89 |   98.56 | 145,267          
  price-alert.controller  |   97.89 |    93.98 |   97.01 |   98.12 | 178,289          
 services                 |   98.78 |    95.89 |   98.34 |   99.01 |                   
  whale-alert.service     |   98.56 |    95.45 |   98.12 |   98.89 | 234              
  price-alert.service     |   99.01 |    96.34 |   98.56 |   99.12 | 312              
--------------------------|---------|----------|---------|---------|-------------------
```

#### Run All Tests (Unit + Integration + E2E)

```bash
pnpm test:all
```

**Expected Output:**
```
# Unit Tests
Test Suites: 4 passed, 4 total
Tests:       60 passed, 60 total

# Integration Tests  
Test Suites: 2 passed, 2 total
Tests:       9 passed, 9 total

# E2E Tests
Test Suites: 2 passed, 2 total
Tests:       20 passed, 20 total

TOTAL: 89 tests passed
```

### Step 4: Verify Database State

After E2E tests complete, verify test data was cleaned up:

```bash
# Connect to test database
psql $TEST_DB

# Check for test data (should return 0 rows)
SELECT COUNT(*) FROM alert_rules WHERE user_id LIKE 'test-user-%';
SELECT COUNT(*) FROM subscriptions WHERE user_id LIKE 'test-user-%';

# Exit psql
\q
```

**Expected Output:**
```
 count 
-------
     0
(1 row)

 count 
-------
     0
(1 row)
```

## 🐛 Troubleshooting

### Issue 1: "Database connection string not found"

**Error:**
```
⚠️  WARNING: Neither TEST_DB nor PREMIUM_DB environment variable is set!
⚠️  E2E tests will fail without a database connection.
```

**Solution:**
```bash
# Set TEST_DB environment variable
export TEST_DB="postgresql://test:test@localhost:5432/defillama_test"

# Verify
echo $TEST_DB

# Re-run tests
pnpm test:e2e
```

### Issue 2: "relation 'alert_rules' does not exist"

**Error:**
```
error: relation "alert_rules" does not exist
```

**Solution:**
```bash
# Database schema not created
# Check if global setup ran successfully
pnpm test:e2e -- --verbose

# Manually create schema
psql $TEST_DB -f premium/src/alerts/__tests__/e2e/schema.sql
```

### Issue 3: "Connection refused"

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# PostgreSQL not running

# macOS
brew services start postgresql@14

# Linux
sudo service postgresql start

# Docker
docker start defillama-test-db

# Verify connection
psql $TEST_DB -c "SELECT 1;"
```

### Issue 4: Tests Timeout

**Error:**
```
Timeout - Async callback was not invoked within the 30000 ms timeout
```

**Solution:**
```bash
# Increase timeout in jest.e2e.config.js
# Change testTimeout from 30000 to 60000

# Or run with increased timeout
pnpm test:e2e -- --testTimeout=60000
```

### Issue 5: Port 5432 Already in Use

**Error:**
```
Error: bind: address already in use
```

**Solution:**
```bash
# Check what's using port 5432
lsof -i :5432

# Option A: Stop existing PostgreSQL
brew services stop postgresql@14

# Option B: Use different port for Docker
docker run -d \
  --name defillama-test-db \
  -e POSTGRES_DB=defillama_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 \
  postgres:14

# Update TEST_DB
export TEST_DB="postgresql://test:test@localhost:5433/defillama_test"
```

## 📊 Test Execution Metrics

### Performance Benchmarks

| Test Suite | Tests | Avg Time | Max Time |
|------------|-------|----------|----------|
| Whale Alert E2E | 9 | ~1.5s | ~2.5s |
| Price Alert E2E | 11 | ~1.8s | ~3.0s |
| **Total E2E** | **20** | **~12s** | **~15s** |

### Database Operations

| Operation | Count per Test | Total |
|-----------|---------------|-------|
| INSERT | 1-5 | ~50 |
| SELECT | 2-10 | ~100 |
| UPDATE | 0-2 | ~20 |
| DELETE | 1-5 | ~50 |

## 🔄 CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

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
      - name: Checkout code
        uses: actions/checkout@v3
      
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
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./premium/coverage/e2e/lcov.info
          flags: e2e
```

## ✅ Success Criteria

E2E tests are successful when:

- [ ] All 20 tests pass
- [ ] No database connection errors
- [ ] Test data is cleaned up after execution
- [ ] Total execution time < 20 seconds
- [ ] No memory leaks or hanging connections
- [ ] Coverage > 95%

## 📚 Additional Resources

- [E2E Test README](../src/alerts/__tests__/e2e/README.md)
- [E2E Testing Guide](./E2E-TESTING.md)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🤝 Support

For issues or questions:
1. Check this guide
2. Review test logs
3. Verify database connection
4. Check environment variables
5. Contact development team

