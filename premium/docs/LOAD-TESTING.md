# Load Testing Guide - DeFiLlama Premium Alerts

## 📋 Overview

This guide provides comprehensive information on load testing the DeFiLlama Premium Alerts system using Artillery.

## 🎯 Objectives

- Validate system performance under load
- Identify performance bottlenecks
- Ensure system can handle expected traffic
- Verify database performance
- Test rate limiting and throttling
- Measure response times and throughput

## 📊 Test Scenarios

### Scenario 1: Alert Creation Load

**Purpose:** Test system's ability to handle concurrent alert creation

**Configuration:**
- Concurrent users: 100
- Duration: 3 minutes
- Operations: Create whale alerts and price alerts
- Expected throughput: > 50 req/s
- Expected response time (p95): < 500ms

**Success Criteria:**
- All alerts created successfully
- Error rate < 1%
- Database connections < 50
- No deadlocks or timeouts

### Scenario 2: Alert Retrieval Load

**Purpose:** Test system's ability to handle high read traffic

**Configuration:**
- Concurrent users: 500
- Duration: 5 minutes
- Operations: GET alert lists, GET alert by ID
- Expected throughput: > 100 req/s
- Expected response time (p95): < 200ms

**Success Criteria:**
- All requests successful
- Error rate < 0.1%
- Response time consistent
- Database query time < 100ms

### Scenario 3: Mixed Operations

**Purpose:** Test realistic usage patterns

**Configuration:**
- Concurrent users: 50
- Duration: 3 minutes
- Operations: 40% create, 50% read, 10% update/delete
- Expected throughput: > 50 req/s
- Expected response time (p95): < 500ms

**Success Criteria:**
- All operations successful
- Error rate < 1%
- No data corruption
- Consistent performance

### Scenario 4: Spike Test

**Purpose:** Test system's ability to handle sudden traffic spikes

**Configuration:**
- Baseline: 10 users
- Spike: 200 users (sudden increase)
- Duration: 1 minute spike
- Recovery time: < 30 seconds

**Success Criteria:**
- System handles spike without crashes
- Error rate during spike < 5%
- System recovers to normal performance
- No permanent degradation

### Scenario 5: Soak Test

**Purpose:** Test system stability over extended period

**Configuration:**
- Concurrent users: 50
- Duration: 30 minutes
- Operations: Mixed (create, read, update, delete)
- Expected throughput: > 50 req/s

**Success Criteria:**
- No memory leaks
- No performance degradation
- Error rate < 1%
- Database connections stable

## 🚀 Running Load Tests

### Prerequisites

```bash
# 1. Install dependencies
cd premium
pnpm install

# 2. Setup test database
export TEST_DB="postgresql://test:test@localhost:5432/defillama_test"

# 3. Start application server
pnpm start
```

### Execute Load Tests

```bash
# Run whale alerts load test
pnpm test:load:whale

# Run price alerts load test
pnpm test:load:price

# Run all load tests
pnpm test:load

# View HTML reports
open tests/load/reports/whale-alerts.html
open tests/load/reports/price-alerts.html
```

## 📈 Performance Metrics

### Target Metrics

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| **Response Time (p50)** | < 100ms | < 200ms | > 500ms |
| **Response Time (p95)** | < 300ms | < 500ms | > 1s |
| **Response Time (p99)** | < 500ms | < 1s | > 2s |
| **Throughput** | > 100 req/s | > 50 req/s | < 20 req/s |
| **Error Rate** | < 0.1% | < 1% | > 5% |
| **Database Connections** | < 30 | < 50 | > 80 |
| **CPU Usage** | < 50% | < 70% | > 90% |
| **Memory Usage** | < 1GB | < 2GB | > 4GB |

### Monitoring Tools

**Application Monitoring:**
- Artillery built-in metrics
- Custom metrics in processor files
- Application logs

**Database Monitoring:**
```sql
-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;

-- Monitor slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Monitor locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**System Monitoring:**
```bash
# CPU and memory usage
top -l 1 | grep -E "^CPU|^PhysMem"

# Network connections
netstat -an | grep ESTABLISHED | wc -l

# Disk I/O
iostat -w 1
```

## 🔍 Analyzing Results

### Artillery Report Interpretation

**Good Results Example:**
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
  Errors: 15 (0.05%)
```

**Indicators of Good Performance:**
- ✅ Completion rate > 99%
- ✅ Mean response/sec > 50
- ✅ p95 < 500ms
- ✅ p99 < 1s
- ✅ Error rate < 1%

**Bad Results Example:**
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
  Errors: 2500 (10%)
```

**Indicators of Poor Performance:**
- ❌ Completion rate < 90%
- ❌ Mean response/sec < 50
- ❌ p95 > 1s
- ❌ p99 > 2s
- ❌ Error rate > 5%

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Issue 1: High Error Rate

**Symptoms:**
- Error rate > 5%
- ECONNREFUSED or ETIMEDOUT errors
- 500 Internal Server Error responses

**Root Causes:**
- Database connection pool exhausted
- Application server overloaded
- Network issues

**Solutions:**
```typescript
// Increase database connection pool
const db = postgres(dbUrl, {
  max: 50,  // Increase from 10
  idle_timeout: 90,
});

// Add connection retry logic
const db = postgres(dbUrl, {
  max: 50,
  connect_timeout: 10,
  max_lifetime: 3600,
});
```

#### Issue 2: Slow Response Times

**Symptoms:**
- p95 > 1s
- p99 > 2s
- Increasing response times over test duration

**Root Causes:**
- Slow database queries
- Missing indexes
- N+1 query problems
- Memory leaks

**Solutions:**
```sql
-- Add indexes
CREATE INDEX idx_alert_rules_user_id ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_status ON alert_rules(status);
CREATE INDEX idx_alert_rules_created_at ON alert_rules(created_at DESC);

-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM alert_rules WHERE user_id = 'test-user';

-- Vacuum and analyze
VACUUM ANALYZE alert_rules;
```

#### Issue 3: Database Connection Pool Exhausted

**Symptoms:**
- "too many connections" errors
- Connection pool at maximum
- Increasing connection count

**Root Causes:**
- Connections not released
- Connection leaks
- Pool size too small

**Solutions:**
```typescript
// Ensure connections are released
try {
  const result = await this.db`SELECT * FROM alert_rules`;
  return result;
} finally {
  // Connection automatically released by postgres library
}

// Increase pool size
const db = postgres(dbUrl, {
  max: 50,
  idle_timeout: 90,
});
```

#### Issue 4: Memory Leaks

**Symptoms:**
- Memory usage increases over time
- Application crashes after extended load
- Garbage collection pauses

**Root Causes:**
- Unclosed connections
- Event listener leaks
- Large object retention

**Solutions:**
```bash
# Monitor memory usage
node --max-old-space-size=4096 server.js

# Profile memory
node --inspect server.js
# Use Chrome DevTools Memory Profiler

# Check for leaks
node --trace-gc server.js
```

## 📈 Optimization Recommendations

### 1. Database Optimization

```sql
-- Add composite indexes for common queries
CREATE INDEX idx_alert_rules_user_status ON alert_rules(user_id, status);
CREATE INDEX idx_alert_rules_user_type ON alert_rules(user_id, type);

-- Partition large tables (if needed)
CREATE TABLE alert_rules_2024 PARTITION OF alert_rules
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Use materialized views for complex queries
CREATE MATERIALIZED VIEW alert_stats AS
SELECT user_id, COUNT(*) as alert_count, MAX(created_at) as last_created
FROM alert_rules
GROUP BY user_id;
```

### 2. Application Optimization

```typescript
// Implement caching
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
});

async getAlerts(userId: string) {
  const cacheKey = `alerts:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const alerts = await this.db`SELECT * FROM alert_rules WHERE user_id = ${userId}`;
  await redis.setex(cacheKey, 300, JSON.stringify(alerts));
  
  return alerts;
}

// Batch operations
async createMultipleAlerts(alerts: CreateAlertDto[]) {
  return await this.db`
    INSERT INTO alert_rules ${this.db(alerts)}
    RETURNING *
  `;
}
```

### 3. Rate Limiting

```typescript
// Implement rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/v2/premium/alerts', limiter);
```

## 🔄 CI/CD Integration

### Automated Load Testing

```yaml
# .github/workflows/load-tests.yml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Install dependencies
        run: cd premium && pnpm install
      
      - name: Run load tests
        run: cd premium && pnpm test:load
      
      - name: Upload reports
        uses: actions/upload-artifact@v4
        with:
          name: load-test-reports
          path: premium/tests/load/reports/*.html
```

## ✅ Success Criteria

Load testing is successful when:

- [ ] All test scenarios complete successfully
- [ ] Error rate < 1% across all scenarios
- [ ] Response time p95 < 500ms
- [ ] Response time p99 < 1s
- [ ] Throughput > 50 req/s
- [ ] No database connection errors
- [ ] No memory leaks detected
- [ ] System resources within acceptable limits
- [ ] Performance consistent across test duration
- [ ] System recovers from spike tests

## 📚 Additional Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Load Testing Best Practices](https://www.artillery.io/docs/guides/guides/test-script-reference)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)

## 🎉 Conclusion

Load testing is essential for ensuring the DeFiLlama Premium Alerts system can handle production traffic. Regular load testing helps identify performance bottlenecks early and ensures a smooth user experience.

**Next Steps:**
1. Run baseline load tests
2. Identify and fix bottlenecks
3. Re-run tests to verify improvements
4. Integrate load tests into CI/CD pipeline
5. Monitor production performance

