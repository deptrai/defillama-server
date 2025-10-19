# Load Testing for DeFiLlama Premium Alerts

**Story**: 1.1.3 - Load Testing
**Status**: ✅ COMPLETE
**Tools**: Artillery, k6

## 📋 Overview

This directory contains comprehensive load testing scenarios for the DeFiLlama Premium Alerts system using Artillery and k6.

## 🎯 Test Scenarios

### 1. **Comprehensive Load Test** (`alerts.yml`)

**Duration**: ~5 minutes
**Test Phases:**
- Warm up: 60s @ 10 users/sec
- Sustained: 120s @ 50 users/sec
- Peak: 60s @ 100 users/sec
- Ramp down: 30s @ 10 users/sec

**Scenarios (weighted):**
- Create Whale Alert (20%)
- Get Whale Alerts (50%)
- Get Whale Alert by ID (20%)
- Update Whale Alert (5%)
- Toggle Whale Alert (3%)
- Delete Whale Alert (2%)
- Create Price Alert (20%)
- Get Price Alerts (50%)
- Create Gas Alert (15%)
- Get Gas Predictions (30%)
- Get Current Gas Prices (40%)
- Mixed Operations (10%)

**Performance Targets:**
- Error Rate: < 1%
- p95 Response Time: < 500ms
- p99 Response Time: < 1000ms

### 2. **Spike Test** (`spike-test.yml`)

**Duration**: ~2.5 minutes
**Test Phases:**
- Baseline: 60s @ 10 users/sec
- **SPIKE**: 30s @ 200 users/sec
- Recovery: 60s @ 10 users/sec

**Purpose**: Test system resilience under sudden traffic spikes

**Scenarios:**
- Read Operations (80%) - GET requests
- Write Operations (20%) - POST requests

**Performance Targets:**
- Error Rate: < 5% (during spike)
- p95 Response Time: < 1000ms

### 3. **Soak Test** (`soak-test.yml`)

**Duration**: 30 minutes
**Load**: Sustained 50 users/sec

**Purpose**: Test system stability over extended period, detect memory leaks

**Scenarios:**
- Realistic User Flow (100%)
  - Check gas prices
  - Get gas predictions
  - List whale alerts
  - List price alerts
  - Create whale alert (10% of users)

**Performance Targets:**
- Error Rate: < 0.5%
- p95 Response Time: < 400ms
- p99 Response Time: < 800ms

### 4. **k6 Load Test** (`alerts.k6.js`)

**Duration**: ~9 minutes
**Stages:**
- Warm up: 1m → 10 users
- Ramp up: 2m → 50 users
- Peak: 3m @ 100 users
- Ramp down: 2m → 50 users
- Cool down: 1m → 0 users

**Custom Metrics:**
- `alert_creation_time` - Time to create alerts
- `alert_retrieval_time` - Time to retrieve alerts
- `gas_query_time` - Time to query gas data
- `total_requests` - Total request counter
- `errors` - Custom error rate

**Scenarios (weighted):**
- Create Whale Alert (10%)
- Create Price Alert (20%)
- Create Gas Alert (10%)
- Get Whale Alerts (20%)
- Get Price Alerts (20%)
- Get Gas Predictions (10%)
- Get Current Gas Prices (10%)

**Performance Targets:**
- p95 Response Time: < 500ms
- p99 Response Time: < 1000ms
- Error Rate: < 1%

## 🚀 Running Load Tests

### Prerequisites

```bash
# Install dependencies
cd defillama-server/premium
pnpm install

# Ensure server is running
pnpm dev  # or pnpm start
```

### Run Artillery Tests

```bash
# Basic load test (5 minutes)
artillery run tests/load/alerts.yml

# Spike test (2.5 minutes)
artillery run tests/load/spike-test.yml

# Soak test (30 minutes)
artillery run tests/load/soak-test.yml

# Generate HTML report
artillery run --output report.json tests/load/alerts.yml
artillery report report.json
```

### Run k6 Tests

```bash
# Basic load test
k6 run tests/load/alerts.k6.js

# With custom base URL
k6 run --env BASE_URL=http://localhost:4000 tests/load/alerts.k6.js

# Generate HTML report
k6 run --out json=report.json tests/load/alerts.k6.js
```

## 📊 Performance Metrics

### Target Metrics

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Response Time (p95) | < 300ms | < 500ms | > 1s |
| Response Time (p99) | < 500ms | < 1s | > 2s |
| Throughput | > 100 req/s | > 50 req/s | < 20 req/s |
| Error Rate | < 0.1% | < 1% | > 5% |
| Database Connections | < 30 | < 50 | > 80 |

### Monitoring During Tests

**Application Metrics:**
- Response time (min, max, median, p95, p99)
- Throughput (requests per second)
- Error rate (percentage)
- Concurrent users

**Database Metrics:**
- Query execution time
- Connection pool usage
- Slow queries (> 1s)
- Deadlocks

**System Metrics:**
- CPU usage
- Memory usage
- Disk I/O
- Network I/O

## 🔍 Analyzing Results

### Artillery Report Sections

1. **Summary**
   - Total requests
   - Total errors
   - Success rate
   - Duration

2. **Response Times**
   - Min, max, median
   - p95, p99 percentiles
   - Distribution histogram

3. **Throughput**
   - Requests per second
   - Scenarios per second
   - Virtual users

4. **Errors**
   - Error count by type
   - Error rate over time

### Example Good Results

```
Summary:
  Scenarios launched:  15000
  Scenarios completed: 14985
  Requests completed:  29970
  Mean response/sec:   99.9
  Response time (msec):
    min: 45
    max: 892
    median: 156
    p95: 287
    p99: 445
  Scenario duration (msec):
    min: 89
    max: 1234
    median: 312
    p95: 567
    p99: 789
  Errors:
    ECONNREFUSED: 15 (0.05%)
```

### Example Bad Results (Needs Optimization)

```
Summary:
  Scenarios launched:  15000
  Scenarios completed: 12500
  Requests completed:  25000
  Mean response/sec:   41.7
  Response time (msec):
    min: 234
    max: 5678
    median: 1234
    p95: 3456
    p99: 4567
  Errors:
    ETIMEDOUT: 2500 (10%)
    ECONNREFUSED: 500 (2%)
```

## 🐛 Troubleshooting

### Issue 1: High Error Rate

**Symptoms:**
- Error rate > 5%
- Many ECONNREFUSED or ETIMEDOUT errors

**Solutions:**
```bash
# Increase connection pool size
# In serverless.yml:
environment:
  DB_POOL_SIZE: 50

# Increase timeout
# In Artillery config:
config:
  timeout: 30
```

### Issue 2: Slow Response Times

**Symptoms:**
- p95 > 1s
- p99 > 2s

**Solutions:**
```bash
# Check database query performance
psql $TEST_DB -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Add database indexes
psql $TEST_DB -c "CREATE INDEX idx_alert_rules_user_id ON alert_rules(user_id);"
psql $TEST_DB -c "CREATE INDEX idx_alert_rules_status ON alert_rules(status);"

# Enable query caching (if applicable)
```

### Issue 3: Database Connection Pool Exhausted

**Symptoms:**
- "too many connections" errors
- Connection pool size at maximum

**Solutions:**
```bash
# Increase connection pool size
# In database connection config:
const db = postgres(dbUrl, {
  max: 50,  // Increase from 10
  idle_timeout: 90,
});

# Or reduce concurrent users in Artillery config
config:
  phases:
    - duration: 120
      arrivalRate: 25  # Reduce from 50
```

### Issue 4: Memory Leaks

**Symptoms:**
- Memory usage increases over time
- Application crashes after extended load

**Solutions:**
```bash
# Monitor memory usage
node --max-old-space-size=4096 server.js

# Check for memory leaks
node --inspect server.js
# Then use Chrome DevTools to profile memory

# Ensure database connections are properly closed
# In service methods:
async cleanup() {
  await this.db.end();
}
```

## 📈 Optimization Recommendations

### 1. Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_alert_rules_user_id ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_status ON alert_rules(status);
CREATE INDEX idx_alert_rules_type ON alert_rules(type);
CREATE INDEX idx_alert_rules_created_at ON alert_rules(created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM alert_rules WHERE user_id = 'test-user' AND status = 'active';

-- Vacuum and analyze tables
VACUUM ANALYZE alert_rules;
```

### 2. Connection Pool Tuning

```typescript
// Optimal connection pool configuration
const db = postgres(dbUrl, {
  max: 30,              // Maximum connections
  idle_timeout: 90,     // Close idle connections after 90s
  connect_timeout: 10,  // Connection timeout
  max_lifetime: 3600,   // Maximum connection lifetime (1 hour)
});
```

### 3. Caching (Optional)

```typescript
// Implement Redis caching for frequently accessed data
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: 3,
});

// Cache alert list
async getAlerts(userId: string) {
  const cacheKey = `alerts:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const alerts = await this.db`SELECT * FROM alert_rules WHERE user_id = ${userId}`;
  await redis.setex(cacheKey, 300, JSON.stringify(alerts)); // Cache for 5 minutes
  
  return alerts;
}
```

### 4. Rate Limiting

```typescript
// Implement rate limiting to prevent abuse
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later',
});

app.use('/v2/premium/alerts', limiter);
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Run daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: cd premium && pnpm install
      
      - name: Start server
        run: cd premium && pnpm start &
        env:
          TEST_DB: postgresql://test:test@localhost:5432/defillama_test
      
      - name: Wait for server
        run: sleep 10
      
      - name: Run load tests
        run: |
          cd premium
          pnpm artillery run tests/load/whale-alerts.yml --output tests/load/reports/whale-alerts.json
          pnpm artillery run tests/load/price-alerts.yml --output tests/load/reports/price-alerts.json
      
      - name: Generate reports
        run: |
          cd premium
          pnpm artillery report tests/load/reports/whale-alerts.json --output tests/load/reports/whale-alerts.html
          pnpm artillery report tests/load/reports/price-alerts.json --output tests/load/reports/price-alerts.html
      
      - name: Upload reports
        uses: actions/upload-artifact@v4
        with:
          name: load-test-reports
          path: premium/tests/load/reports/*.html
```

## 📚 Additional Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Load Testing Best Practices](https://www.artillery.io/docs/guides/guides/test-script-reference)
- [Performance Tuning Guide](../../docs/PERFORMANCE-TUNING.md)
- [Monitoring Setup](../../docs/MONITORING.md)

## ✅ Success Criteria

Load tests are successful when:

- [ ] All scenarios complete successfully
- [ ] Error rate < 1%
- [ ] Response time p95 < 500ms
- [ ] Response time p99 < 1s
- [ ] Throughput > 50 req/s
- [ ] No database connection errors
- [ ] No memory leaks
- [ ] System resources within acceptable limits

