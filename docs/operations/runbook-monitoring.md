# Monitoring Runbook

## Overview

This runbook provides procedures for monitoring DeFiLlama On-Chain Services using CloudWatch, X-Ray, and custom metrics.

## CloudWatch Dashboards

### Main Dashboard
**URL:** CloudWatch Console → Dashboards → `defillama-overview-{stage}`

**Widgets:**
- Active WebSocket connections
- Lambda invocations
- SQS messages
- Error rates
- Latency metrics

**When to Check:** Daily, during deployments, during incidents

### Lambda Dashboard
**URL:** CloudWatch Console → Dashboards → `defillama-lambda-{stage}`

**Widgets:**
- Invocations by function
- Duration (p50, p95, p99)
- Errors by function
- Concurrent executions
- Memory utilization
- Business metrics (subscriptions, events, alerts, queries)

**When to Check:** Performance issues, high costs, capacity planning

### WebSocket Dashboard
**URL:** CloudWatch Console → Dashboards → `defillama-websocket-{stage}`

**Widgets:**
- Active connections
- Connection rate
- Message throughput
- Error rate
- Latency (p50, p95, p99)
- Subscriptions by protocol

**When to Check:** Connection issues, latency issues, user complaints

### Redis Dashboard
**URL:** CloudWatch Console → Dashboards → `defillama-redis-{stage}`

**Widgets:**
- CPU utilization
- Memory utilization
- Cache hit rate
- Active connections
- Evictions
- Replication lag

**When to Check:** Performance issues, cache misses, memory issues

### SQS Dashboard
**URL:** CloudWatch Console → Dashboards → `defillama-sqs-{stage}`

**Widgets:**
- Visible messages
- In-flight messages
- Message age
- Throughput
- Messages received
- Messages deleted
- DLQ messages
- Not visible messages

**When to Check:** Queue backlog, processing delays, DLQ messages

## CloudWatch Alarms

### Priority 1 (Critical) - Immediate Action Required

| Alarm | Threshold | Action |
|-------|-----------|--------|
| Lambda High Error Rate | >5% | Investigate immediately, consider rollback |
| Lambda High Throttle Rate | >0.1% | Increase concurrency limits |
| Lambda High Concurrency | >800 | Scale up or optimize functions |
| Redis High CPU | >90% | Scale up instance or optimize queries |
| Redis High Memory | >90% | Scale up instance or increase evictions |
| SQS High Queue Depth | >1000 | Increase Lambda concurrency or investigate processing issues |
| SQS DLQ Messages | >0 | Investigate failed messages |

### Priority 2 (High) - Action Required Within 1 Hour

| Alarm | Threshold | Action |
|-------|-----------|--------|
| Lambda Medium Error Rate | >1% | Investigate errors, plan fix |
| Lambda High Duration | p95 >500ms | Optimize function code |
| Redis Medium CPU | >80% | Plan capacity increase |
| Redis Medium Memory | >85% | Plan capacity increase |
| Redis High Evictions | >100 | Increase memory or optimize cache |
| WebSocket High Error Rate | >1% | Investigate connection issues |
| WebSocket High Latency | p95 >200ms | Optimize message processing |

### Priority 3 (Medium) - Action Required Within 24 Hours

| Alarm | Threshold | Action |
|-------|-----------|--------|
| Redis Low Cache Hit Rate | <80% | Optimize cache strategy |
| SQS High Message Age | >10 min | Investigate processing delays |

## X-Ray Tracing

### X-Ray Groups

1. **Errors Group**
   - Filter: `error = true`
   - Use: Identify all errors across services

2. **Slow Traces Group**
   - Filter: `responsetime > 1`
   - Use: Identify performance bottlenecks

3. **WebSocket Group**
   - Filter: `service("defillama-websocket")`
   - Use: Monitor WebSocket performance

4. **Alerts Group**
   - Filter: `service("defillama-alerts")`
   - Use: Monitor alert processing

### Analyzing Traces

1. **Open X-Ray Console**
2. **Select Group** (e.g., Errors)
3. **Select Time Range** (e.g., Last 1 hour)
4. **Analyze Service Map** - Identify bottlenecks
5. **View Trace Details** - Identify root cause
6. **Check Annotations** - Custom metadata

## Custom Metrics

### Business Metrics

```typescript
// Subscriptions
await incrementSubscriptions('ethereum', 1);

// Events
await incrementEvents('ethereum', 10);

// Alerts
await incrementAlerts('price_change', 1);

// Queries
await incrementQueries('advanced', 1);
```

### Performance Metrics

```typescript
// Query latency
await recordQueryLatency(150, 'advanced');

// Cache hit rate
await recordCacheHitRate(0.85);

// WebSocket latency
await recordWebSocketLatency(50);

// Database latency
await recordDatabaseLatency(30);
```

### Error Metrics

```typescript
// Validation errors
await incrementValidationErrors('invalid_protocol');

// Processing errors
await incrementProcessingErrors('alert_engine');

// Database errors
await incrementDatabaseErrors('connection_timeout');

// External API errors
await incrementExternalAPIErrors('coingecko');
```

## Log Analysis

### CloudWatch Logs Insights Queries

**Find Errors:**
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

**Find Slow Queries:**
```
fields @timestamp, duration, queryType
| filter duration > 500
| sort duration desc
| limit 50
```

**Find Failed Alerts:**
```
fields @timestamp, alertId, error
| filter error != ""
| sort @timestamp desc
| limit 100
```

**WebSocket Connection Errors:**
```
fields @timestamp, connectionId, error
| filter error like /connection/
| sort @timestamp desc
| limit 100
```

## Performance Monitoring

### Key Performance Indicators (KPIs)

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API Response Time (p95) | <200ms | >300ms | >500ms |
| WebSocket Latency (p95) | <100ms | >150ms | >200ms |
| Database Query Time (p95) | <50ms | >100ms | >200ms |
| Cache Hit Rate | >80% | <70% | <60% |
| Error Rate | <0.1% | >1% | >5% |
| Availability | >99.9% | <99.5% | <99% |

### Daily Monitoring Checklist

- [ ] Check all CloudWatch dashboards
- [ ] Review CloudWatch alarms (any triggered?)
- [ ] Check X-Ray service map (any errors?)
- [ ] Review Lambda function logs (any errors?)
- [ ] Check SQS queue depths (any backlog?)
- [ ] Check DLQ messages (any failed messages?)
- [ ] Review cost report (any anomalies?)

### Weekly Monitoring Checklist

- [ ] Review performance trends
- [ ] Check capacity utilization
- [ ] Review error patterns
- [ ] Analyze slow queries
- [ ] Review cache hit rates
- [ ] Check backup status
- [ ] Review security logs

## Alerting

### Slack Notifications

Alarms are sent to Slack channels:
- **P1 Alarms:** `#defillama-critical`
- **P2 Alarms:** `#defillama-alerts`
- **P3 Alarms:** `#defillama-monitoring`

### Email Notifications

Critical alarms are also sent via email to:
- On-call engineer
- DevOps team lead

### PagerDuty Integration

P1 alarms trigger PagerDuty incidents for immediate response.

## Troubleshooting

### High Error Rate

1. Check X-Ray traces for error details
2. Check Lambda function logs
3. Identify error pattern (specific function, time range)
4. Check recent deployments
5. Rollback if needed

### High Latency

1. Check X-Ray service map for bottlenecks
2. Check database query performance
3. Check Redis cache hit rate
4. Check external API latency
5. Optimize slow components

### High Costs

1. Run cost report: `./scripts/cost-report.sh prod`
2. Identify expensive services
3. Check for resource over-provisioning
4. Optimize Lambda memory allocation
5. Review DynamoDB capacity settings

## Contacts

- **On-Call Engineer:** [Slack channel]
- **DevOps Team:** [Slack channel]
- **Monitoring Team:** [Slack channel]

## References

- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [X-Ray Documentation](https://docs.aws.amazon.com/xray/)
- [CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html)

