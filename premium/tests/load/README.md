# Load Testing for DeFiLlama Premium Alerts

## 📋 Overview

This directory contains load testing scenarios for the DeFiLlama Premium Alerts system using Artillery.

## 🎯 Test Scenarios

### 1. Whale Alerts Load Test (`whale-alerts.yml`)

**Test Phases:**
- Warm up: 10 users/sec for 60 seconds
- Sustained load: 50 users/sec for 120 seconds
- Peak load: 100 users/sec for 60 seconds
- Cool down: 5 users/sec for 30 seconds

**Scenarios (weighted):**
- Create Whale Alert (40%)
- Get Whale Alerts List (50%)
- Update Whale Alert (5%)
- Toggle Whale Alert (3%)
- Delete Whale Alert (2%)

### 2. Price Alerts Load Test (`price-alerts.yml`)

**Test Phases:**
- Warm up: 10 users/sec for 60 seconds
- Sustained load: 50 users/sec for 120 seconds
- Peak load: 100 users/sec for 60 seconds
- Cool down: 5 users/sec for 30 seconds

**Scenarios (weighted):**
- Create Price Alert (40%)
- Get Price Alerts List (50%)
- Get Price Alert by ID (5%)
- Update Price Alert (3%)
- Delete Price Alert (2%)

## 🚀 Running Load Tests

### Prerequisites

```bash
# Install dependencies
cd premium
pnpm install

# Ensure test database is running
export TEST_DB="postgresql://test:test@localhost:5432/defillama_test"

# Start the application server (in another terminal)
pnpm start
```

### Run Whale Alerts Load Test

```bash
# Run whale alerts load test
pnpm artillery run tests/load/whale-alerts.yml

# Run with HTML report
pnpm artillery run tests/load/whale-alerts.yml --output tests/load/reports/whale-alerts.json
pnpm artillery report tests/load/reports/whale-alerts.json --output tests/load/reports/whale-alerts.html

# Open report in browser
open tests/load/reports/whale-alerts.html
```

### Run Price Alerts Load Test

```bash
# Run price alerts load test
pnpm artillery run tests/load/price-alerts.yml

# Run with HTML report
pnpm artillery run tests/load/price-alerts.yml --output tests/load/reports/price-alerts.json
pnpm artillery report tests/load/reports/price-alerts.json --output tests/load/reports/price-alerts.html

# Open report in browser
open tests/load/reports/price-alerts.html
```

### Run All Load Tests

```bash
# Run all load tests sequentially
pnpm test:load
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

