# Incident Response Runbook

## Overview

This runbook provides procedures for responding to incidents in DeFiLlama On-Chain Services.

## Incident Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| P1 (Critical) | Complete service outage | Immediate | API down, database unavailable, data loss |
| P2 (High) | Partial service degradation | <15 minutes | High error rate, slow response times, some features unavailable |
| P3 (Medium) | Minor issues | <1 hour | Non-critical errors, performance degradation |
| P4 (Low) | Cosmetic issues | <24 hours | UI glitches, minor bugs |

## Incident Response Process

### 1. Detection

**Automated Detection:**
- CloudWatch alarms trigger
- PagerDuty incident created
- Slack notification sent

**Manual Detection:**
- User reports
- Monitoring dashboard review
- Log analysis

### 2. Triage

1. **Assess Severity** - Determine P1/P2/P3/P4
2. **Create Incident** - Create incident in tracking system
3. **Notify Team** - Alert on-call engineer and relevant teams
4. **Assign Owner** - Assign incident commander

### 3. Investigation

1. **Check CloudWatch Dashboards** - Identify affected services
2. **Check CloudWatch Alarms** - Identify triggered alarms
3. **Check X-Ray Traces** - Identify error patterns
4. **Check Lambda Logs** - Identify error details
5. **Check Recent Changes** - Review recent deployments

### 4. Mitigation

**Immediate Actions:**
- Rollback recent deployment (if applicable)
- Scale up resources (if capacity issue)
- Disable problematic feature (if isolated issue)
- Failover to backup (if infrastructure issue)

**Temporary Workarounds:**
- Enable maintenance mode
- Redirect traffic
- Disable non-critical features

### 5. Resolution

1. **Implement Fix** - Deploy hotfix or permanent fix
2. **Verify Fix** - Test in staging first
3. **Deploy to Production** - Use standard deployment process
4. **Monitor** - Watch metrics for 30 minutes

### 6. Post-Incident

1. **Write Post-Mortem** - Document incident details
2. **Identify Root Cause** - Perform root cause analysis
3. **Create Action Items** - Prevent future occurrences
4. **Update Runbooks** - Improve documentation

## Common Incidents

### API Unavailable (P1)

**Symptoms:**
- Health endpoint returns 5xx
- All API requests failing
- CloudWatch alarm: Lambda High Error Rate

**Investigation:**
1. Check Lambda function status
2. Check API Gateway status
3. Check database connectivity
4. Check Redis connectivity
5. Check recent deployments

**Resolution:**
1. If recent deployment: Rollback immediately
2. If database issue: Failover to read replica
3. If Redis issue: Restart Redis cluster
4. If Lambda issue: Increase concurrency or memory

### High Error Rate (P2)

**Symptoms:**
- Error rate >5%
- CloudWatch alarm triggered
- X-Ray shows errors

**Investigation:**
1. Check X-Ray traces for error details
2. Check Lambda logs for stack traces
3. Identify error pattern (specific endpoint, function)
4. Check external dependencies

**Resolution:**
1. If code bug: Deploy hotfix
2. If external service: Implement circuit breaker
3. If rate limiting: Increase limits
4. If capacity: Scale up resources

### Database Connection Timeout (P2)

**Symptoms:**
- Database queries timing out
- Lambda logs show connection errors
- CloudWatch alarm: Database Errors

**Investigation:**
1. Check RDS metrics (CPU, connections, IOPS)
2. Check database logs
3. Check connection pool settings
4. Check slow queries

**Resolution:**
1. Increase connection pool size
2. Optimize slow queries
3. Scale up RDS instance
4. Add read replicas

### Redis High Memory (P2)

**Symptoms:**
- Redis memory >90%
- CloudWatch alarm triggered
- Cache evictions increasing

**Investigation:**
1. Check Redis metrics
2. Check cache hit rate
3. Check key distribution
4. Check TTL settings

**Resolution:**
1. Increase Redis instance size
2. Adjust eviction policy
3. Reduce TTL for less critical keys
4. Implement cache warming

### SQS Queue Backlog (P2)

**Symptoms:**
- SQS queue depth >1000
- Messages aging >10 minutes
- CloudWatch alarm triggered

**Investigation:**
1. Check Lambda processing rate
2. Check Lambda errors
3. Check Lambda concurrency
4. Check message size

**Resolution:**
1. Increase Lambda concurrency
2. Increase Lambda memory
3. Optimize message processing
4. Add more consumers

### DLQ Messages (P2)

**Symptoms:**
- Messages in Dead Letter Queue
- CloudWatch alarm triggered
- Processing failures

**Investigation:**
1. Check DLQ messages
2. Identify failure pattern
3. Check Lambda logs
4. Check message format

**Resolution:**
1. Fix code bug
2. Reprocess messages manually
3. Update message schema
4. Improve error handling

## Escalation

### When to Escalate

- Incident not resolved within SLA
- Incident severity increases
- Additional expertise needed
- Multiple services affected

### Escalation Path

1. **On-Call Engineer** → **Team Lead**
2. **Team Lead** → **Engineering Manager**
3. **Engineering Manager** → **CTO**

### External Escalation

- **AWS Support:** For AWS infrastructure issues
- **Third-Party Services:** For external service issues

## Communication

### Internal Communication

- **Slack:** Real-time updates in `#defillama-incidents`
- **Status Page:** Update internal status page
- **Email:** Send updates to stakeholders

### External Communication

- **Status Page:** Update public status page
- **Twitter:** Post status updates
- **Email:** Notify affected users

### Communication Template

```
**Incident Update**

**Status:** [Investigating/Identified/Monitoring/Resolved]
**Severity:** [P1/P2/P3/P4]
**Impact:** [Description of impact]
**Affected Services:** [List of services]
**Next Update:** [Time]

**Details:**
[Description of incident and actions taken]
```

## Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

## Summary
- **Date:** [Date]
- **Duration:** [Duration]
- **Severity:** [P1/P2/P3/P4]
- **Impact:** [Description]

## Timeline
- **HH:MM** - Incident detected
- **HH:MM** - Investigation started
- **HH:MM** - Root cause identified
- **HH:MM** - Mitigation applied
- **HH:MM** - Incident resolved

## Root Cause
[Detailed description of root cause]

## Resolution
[Description of how incident was resolved]

## Action Items
1. [Action item 1] - Owner: [Name] - Due: [Date]
2. [Action item 2] - Owner: [Name] - Due: [Date]

## Lessons Learned
- [Lesson 1]
- [Lesson 2]

## Prevention
- [Prevention measure 1]
- [Prevention measure 2]
```

## Contacts

- **On-Call Engineer:** [PagerDuty]
- **Team Lead:** [Slack/Phone]
- **Engineering Manager:** [Slack/Phone]
- **AWS Support:** [Support Portal]

## References

- [Incident Management Process](https://example.com)
- [PagerDuty Documentation](https://support.pagerduty.com/)
- [AWS Support](https://console.aws.amazon.com/support/)

