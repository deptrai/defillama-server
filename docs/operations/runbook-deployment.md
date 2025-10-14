# Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying DeFiLlama On-Chain Services to AWS.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Serverless Framework installed (`npm install -g serverless`)
- Node.js 20+ and pnpm installed
- Access to GitHub repository
- Access to AWS Console (for verification)

## Deployment Environments

| Environment | Purpose | Auto-Deploy | Approval Required |
|-------------|---------|-------------|-------------------|
| dev | Development testing | Yes (on push to dev branch) | No |
| staging | Pre-production testing | Yes (on merge to main) | No |
| prod | Production | No | Yes (manual approval) |

## Standard Deployment Procedure

### 1. Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] Database migrations prepared (if any)
- [ ] Environment variables updated (if needed)
- [ ] Backup created (production only)
- [ ] Deployment window scheduled (production only)
- [ ] Stakeholders notified (production only)

### 2. Development Deployment

```bash
# Run tests
cd defi
pnpm test

# Deploy to dev
./scripts/deploy.sh dev

# Verify deployment
curl https://dev-api.llama.fi/health
```

### 3. Staging Deployment

Staging deployments are automated via GitHub Actions when code is merged to `main` branch.

**Manual deployment (if needed):**

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Run smoke tests
pnpm test:e2e -- --env=staging

# Verify deployment
curl https://staging-api.llama.fi/health
```

### 4. Production Deployment

Production deployments use blue-green strategy with gradual traffic shifting.

**Via GitHub Actions (Recommended):**

1. Go to GitHub Actions → Deploy to Production workflow
2. Click "Run workflow"
3. Enter version tag (e.g., `v1.2.3`)
4. Approve deployment in GitHub
5. Monitor deployment progress
6. Verify each traffic shift stage

**Manual deployment (emergency only):**

```bash
# Create backup first
./scripts/backup.sh prod --all

# Deploy to production
./scripts/deploy.sh prod

# Monitor for 10 minutes
# Check CloudWatch dashboards
# Check CloudWatch alarms
# Check X-Ray traces

# If issues detected, rollback immediately
./scripts/rollback.sh prod
```

## Blue-Green Deployment Process

### Traffic Shifting Stages

1. **Deploy Blue Environment** (0% traffic)
   - Deploy new version to blue environment
   - Run smoke tests
   - Verify health checks

2. **Shift 10% Traffic** (10% blue, 90% green)
   - Monitor for 5 minutes
   - Check error rates
   - Check latency metrics
   - Auto-rollback if alarms trigger

3. **Shift 50% Traffic** (50% blue, 50% green)
   - Monitor for 5 minutes
   - Compare metrics between blue and green
   - Auto-rollback if alarms trigger

4. **Shift 100% Traffic** (100% blue, 0% green)
   - Monitor for 10 minutes
   - Verify all metrics stable
   - Keep green environment for 24 hours (rollback capability)

### Monitoring During Deployment

**Key Metrics to Watch:**

- Lambda error rate (should be <1%)
- Lambda duration (p95 should be <500ms)
- API Gateway 5xx errors (should be 0)
- WebSocket connection errors (should be <0.1%)
- Redis cache hit rate (should be >80%)
- DynamoDB throttling (should be 0)

**CloudWatch Dashboards:**

- Main Dashboard: System overview
- Lambda Dashboard: Function metrics
- WebSocket Dashboard: Connection metrics
- Redis Dashboard: Cache metrics
- SQS Dashboard: Queue metrics

## Rollback Procedure

### Automatic Rollback

Automatic rollback is triggered when:
- Lambda error rate >5%
- Lambda throttle rate >0.1%
- API Gateway 5xx errors >10 in 5 minutes
- WebSocket connection errors >1%

### Manual Rollback

```bash
# Rollback to previous version
./scripts/rollback.sh prod

# Or rollback to specific version
./scripts/rollback.sh prod <version-number>

# Verify rollback
curl https://api.llama.fi/health

# Monitor for 10 minutes
# Check CloudWatch dashboards
# Check CloudWatch alarms
```

## Database Migration Procedure

### Pre-Migration

1. Create database backup
2. Test migration on staging
3. Prepare rollback script
4. Schedule maintenance window (if needed)

### Migration Steps

```bash
# 1. Create backup
./scripts/backup.sh prod --rds

# 2. Run migration
cd sql/migrations
psql -h <rds-endpoint> -U postgres -d defillama < <migration-file>.sql

# 3. Verify migration
psql -h <rds-endpoint> -U postgres -d defillama -c "\dt"

# 4. Test application
curl https://api.llama.fi/health
```

### Rollback Migration

```bash
# Run rollback script
psql -h <rds-endpoint> -U postgres -d defillama < <rollback-file>.sql

# Verify rollback
psql -h <rds-endpoint> -U postgres -d defillama -c "\dt"
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# API health
curl https://api.llama.fi/health

# WebSocket health
wscat -c wss://api.llama.fi

# Database health
psql -h <rds-endpoint> -U postgres -d defillama -c "SELECT 1"

# Redis health
redis-cli -h <redis-endpoint> ping
```

### 2. Functional Tests

- [ ] User authentication works
- [ ] WebSocket connections work
- [ ] Real-time events are delivered
- [ ] Alerts are triggered correctly
- [ ] Queries return correct results

### 3. Performance Tests

- [ ] API response time <200ms (p95)
- [ ] WebSocket latency <100ms (p95)
- [ ] Database query time <50ms (p95)
- [ ] Cache hit rate >80%

### 4. Monitoring Verification

- [ ] CloudWatch dashboards show data
- [ ] CloudWatch alarms are active
- [ ] X-Ray traces are being collected
- [ ] Logs are being written to CloudWatch Logs

## Troubleshooting

### Deployment Fails

**Symptoms:** Serverless deploy command fails

**Possible Causes:**
- AWS credentials expired
- CloudFormation stack in UPDATE_ROLLBACK_FAILED state
- Resource limits exceeded
- IAM permissions insufficient

**Resolution:**
1. Check AWS credentials: `aws sts get-caller-identity`
2. Check CloudFormation stack status in AWS Console
3. Check CloudFormation events for error details
4. Fix the issue and retry deployment

### Health Check Fails After Deployment

**Symptoms:** Health endpoint returns 5xx error

**Possible Causes:**
- Lambda function not deployed correctly
- Environment variables missing
- Database connection failed
- Redis connection failed

**Resolution:**
1. Check Lambda function logs in CloudWatch
2. Verify environment variables in Lambda console
3. Test database connection
4. Test Redis connection
5. Rollback if issue cannot be resolved quickly

### High Error Rate After Deployment

**Symptoms:** CloudWatch alarms triggered, error rate >5%

**Possible Causes:**
- Code bug introduced
- Breaking API change
- Database schema mismatch
- External service unavailable

**Resolution:**
1. Check X-Ray traces for error details
2. Check Lambda function logs
3. Identify root cause
4. If critical, rollback immediately
5. If non-critical, deploy hotfix

## Emergency Procedures

### Complete System Failure

1. **Immediate Actions:**
   - Trigger incident response
   - Notify stakeholders
   - Rollback to last known good version

2. **Investigation:**
   - Check CloudWatch dashboards
   - Check CloudWatch alarms
   - Check X-Ray traces
   - Check Lambda logs
   - Check database status
   - Check Redis status

3. **Recovery:**
   - Restore from backup if needed
   - Deploy hotfix if possible
   - Communicate status to users

### Data Loss

1. **Immediate Actions:**
   - Stop all writes to database
   - Assess extent of data loss
   - Notify stakeholders

2. **Recovery:**
   - Restore from most recent backup
   - Replay events from DynamoDB Streams (if available)
   - Verify data integrity

3. **Post-Recovery:**
   - Investigate root cause
   - Implement preventive measures
   - Update runbooks

## Contacts

- **On-Call Engineer:** [Slack channel]
- **DevOps Team:** [Slack channel]
- **Database Admin:** [Slack channel]
- **Security Team:** [Slack channel]

## References

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/)
- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [X-Ray Documentation](https://docs.aws.amazon.com/xray/)

