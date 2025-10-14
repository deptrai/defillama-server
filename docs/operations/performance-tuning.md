# Performance Tuning Guide

## Overview

This guide provides strategies for optimizing performance of DeFiLlama On-Chain Services.

## Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API Response Time (p95) | <200ms | >300ms | >500ms |
| WebSocket Latency (p95) | <100ms | >150ms | >200ms |
| Database Query Time (p95) | <50ms | >100ms | >200ms |
| Cache Hit Rate | >80% | <70% | <60% |
| Lambda Cold Start | <1s | >2s | >3s |

## Lambda Optimization

### Memory Allocation

Test different memory settings:

```bash
# Test with AWS Lambda Power Tuning
npm install -g aws-lambda-power-tuning

# Run power tuning
aws-lambda-power-tuning \
  --function-name defillama-prod-websocketConnect \
  --memory-values 256,384,512,768,1024 \
  --num-invocations 100
```

**Recommendations:**
- WebSocket functions: 512MB
- Query functions: 768MB
- Alert functions: 384MB
- Notification functions: 256MB

### Cold Start Optimization

1. **Minimize Dependencies**
   - Use tree-shaking
   - Remove unused packages
   - Use lightweight alternatives

2. **Use Provisioned Concurrency**
   - For hot functions only
   - Target: 10-20 instances
   - Monitor utilization

3. **Optimize Initialization**
   - Move initialization outside handler
   - Reuse connections
   - Cache static data

### Connection Pooling

```typescript
// Database connection pool
const pool = new Pool({
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
});

// Redis connection pool
const redis = new Redis({
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});
```

## Database Optimization

### Query Optimization

1. **Use Indexes**
   - Create indexes for frequently queried columns
   - Use composite indexes for multi-column queries
   - Monitor index usage

2. **Optimize Queries**
   - Use EXPLAIN ANALYZE
   - Avoid SELECT *
   - Use pagination
   - Limit result sets

3. **Connection Pooling**
   - Max connections: 10 per Lambda
   - Idle timeout: 30 seconds
   - Reuse connections

### Slow Query Analysis

```sql
-- Enable slow query log
ALTER SYSTEM SET log_min_duration_statement = 100;

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Redis Optimization

### Cache Strategy

1. **Cache Frequently Accessed Data**
   - Protocol metadata
   - User preferences
   - Query results

2. **Set Appropriate TTLs**
   - Static data: 24 hours
   - Dynamic data: 5 minutes
   - Real-time data: 30 seconds

3. **Use Cache Warming**
   - Pre-populate cache on startup
   - Refresh cache before expiry
   - Use background jobs

### Cache Hit Rate Optimization

```typescript
// Monitor cache hit rate
const hits = await redis.get('cache:hits');
const misses = await redis.get('cache:misses');
const hitRate = hits / (hits + misses);

// Target: >80%
if (hitRate < 0.8) {
  // Increase TTL
  // Add more data to cache
  // Implement cache warming
}
```

## API Gateway Optimization

### Throttling Settings

| Environment | Burst Limit | Rate Limit |
|-------------|-------------|------------|
| dev | 1000 | 500 req/s |
| staging | 2000 | 1000 req/s |
| prod | 5000 | 2000 req/s |

### Caching

- Enable API Gateway caching for GET requests
- TTL: 5 minutes
- Cache key: Query parameters

## WebSocket Optimization

### Connection Management

1. **Connection Pooling**
   - Reuse connections
   - Implement connection limits
   - Monitor active connections

2. **Message Batching**
   - Batch multiple messages
   - Reduce WebSocket overhead
   - Target: 10-50 messages per batch

3. **Compression**
   - Enable WebSocket compression
   - Reduce message size
   - Expected improvement: 30-50%

## DynamoDB Optimization

### Partition Key Design

- Use high-cardinality partition keys
- Avoid hot partitions
- Use composite keys if needed

### Query Patterns

1. **Use Query Instead of Scan**
   - Query is 10-100x faster
   - Use indexes for queries
   - Avoid full table scans

2. **Use Batch Operations**
   - BatchGetItem for multiple reads
   - BatchWriteItem for multiple writes
   - Reduce API calls

3. **Use Projection Expressions**
   - Fetch only needed attributes
   - Reduce data transfer
   - Improve latency

## Monitoring Performance

### X-Ray Analysis

1. **Identify Bottlenecks**
   - Check service map
   - Find slow subsegments
   - Analyze trace details

2. **Optimize Slow Traces**
   - Target: <1 second
   - Focus on p95, p99
   - Optimize slowest operations

### CloudWatch Metrics

Monitor these metrics:
- Lambda duration (p50, p95, p99)
- Lambda concurrent executions
- API Gateway latency
- DynamoDB consumed capacity
- Redis CPU utilization

## Load Testing

### Tools

- **Artillery:** For API load testing
- **k6:** For WebSocket load testing
- **AWS Lambda Power Tuning:** For Lambda optimization

### Test Scenarios

1. **Baseline Test**
   - 100 concurrent users
   - 10 minutes duration
   - Measure baseline performance

2. **Stress Test**
   - Gradually increase load
   - Find breaking point
   - Identify bottlenecks

3. **Spike Test**
   - Sudden traffic spike
   - Test auto-scaling
   - Verify resilience

## Performance Optimization Checklist

### Weekly

- [ ] Review X-Ray traces
- [ ] Check slow queries
- [ ] Monitor cache hit rate
- [ ] Review Lambda duration
- [ ] Check API latency

### Monthly

- [ ] Run load tests
- [ ] Optimize slow queries
- [ ] Review Lambda memory allocation
- [ ] Optimize cache strategy
- [ ] Update performance targets

### Quarterly

- [ ] Comprehensive performance audit
- [ ] Update architecture for performance
- [ ] Evaluate new AWS services
- [ ] Review and update SLAs

## References

- [AWS Lambda Performance](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Performance](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [ElastiCache Performance](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/BestPractices.html)

