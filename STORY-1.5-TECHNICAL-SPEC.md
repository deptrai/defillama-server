# Story 1.5: Infrastructure and Deployment - Technical Specification

**Status:** Ready for Implementation  
**Version:** 1.0  
**Last Updated:** 2025-10-14

---

## 1. Architecture Overview

### 1.1 Network Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud (VPC)                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Public Subnets (2 AZs)                   │ │
│  │  ┌──────────────────┐         ┌──────────────────┐         │ │
│  │  │  Internet Gateway │         │   NAT Gateway    │         │ │
│  │  └──────────────────┘         └──────────────────┘         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Private Subnets (2 AZs)                   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │   Lambda     │  │    Redis     │  │     RDS      │     │ │
│  │  │  Functions   │  │ ElastiCache  │  │  PostgreSQL  │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      VPC Endpoints                          │ │
│  │  S3 | DynamoDB | SQS | SNS | Secrets Manager | CloudWatch  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Security Layers                           │
│                                                                   │
│  Layer 1: Network Isolation (VPC, Subnets, NACLs)               │
│  Layer 2: Security Groups (Least Privilege)                     │
│  Layer 3: IAM Roles and Policies (Least Privilege)              │
│  Layer 4: Encryption (TLS 1.3 in transit, KMS at rest)          │
│  Layer 5: WAF (API Gateway protection)                          │
│  Layer 6: Secrets Management (AWS Secrets Manager)              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CloudWatch Monitoring                         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  WebSocket   │  │    Lambda    │  │    Redis     │          │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    X-Ray Tracing                          │   │
│  │  Request → Lambda → Redis → DynamoDB → Response          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 CloudWatch Alarms                         │   │
│  │  Latency | Errors | Throttles | CPU | Memory | Queue     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Actions CI/CD                        │
│                                                                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │   Test   │ → │  Build   │ → │ Staging  │ → │   Prod   │    │
│  │ Workflow │   │ Workflow │   │  Deploy  │   │  Deploy  │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘    │
│                                      ↓              ↓            │
│                                  ┌────────┐    ┌────────┐       │
│                                  │ Staging│    │  Prod  │       │
│                                  │  Env   │    │  Env   │       │
│                                  └────────┘    └────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. VPC Design

### 2.1 CIDR Blocks

**VPC CIDR:** 10.0.0.0/16 (65,536 IPs)

**Subnets:**
- Public Subnet 1 (AZ-a): 10.0.1.0/24 (256 IPs)
- Public Subnet 2 (AZ-b): 10.0.2.0/24 (256 IPs)
- Private Subnet 1 (AZ-a): 10.0.10.0/24 (256 IPs)
- Private Subnet 2 (AZ-b): 10.0.11.0/24 (256 IPs)

**Reserved IPs:**
- 10.0.0.0/20: Reserved for future expansion
- 10.0.20.0/22: Reserved for database subnets
- 10.0.24.0/22: Reserved for cache subnets

### 2.2 Routing Tables

**Public Route Table:**
- 10.0.0.0/16 → local
- 0.0.0.0/0 → Internet Gateway

**Private Route Table:**
- 10.0.0.0/16 → local
- 0.0.0.0/0 → NAT Gateway

### 2.3 Gateway Configurations

**Internet Gateway:**
- Attached to VPC
- Routes traffic from public subnets to internet

**NAT Gateway:**
- Deployed in public subnet (AZ-a)
- Provides internet access for private subnets
- Elastic IP attached

**VPC Endpoints:**
- S3 Gateway Endpoint (no data transfer charges)
- DynamoDB Gateway Endpoint (no data transfer charges)
- SQS Interface Endpoint
- SNS Interface Endpoint
- Secrets Manager Interface Endpoint
- CloudWatch Logs Interface Endpoint

---

## 3. Security Design

### 3.1 Security Groups

#### Lambda Security Group
```yaml
Ingress: None (Lambda initiates connections)
Egress:
  - Port 6379 → Redis Security Group (Redis)
  - Port 5432 → RDS Security Group (PostgreSQL)
  - Port 443 → 0.0.0.0/0 (HTTPS to internet)
  - Port 443 → VPC Endpoints (AWS services)
```

#### Redis Security Group
```yaml
Ingress:
  - Port 6379 ← Lambda Security Group
Egress:
  - Port 443 → 0.0.0.0/0 (CloudWatch metrics)
```

#### RDS Security Group
```yaml
Ingress:
  - Port 5432 ← Lambda Security Group
Egress:
  - Port 443 → 0.0.0.0/0 (CloudWatch metrics)
```

### 3.2 IAM Roles and Policies

#### Lambda Execution Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/defillama-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage"
      ],
      "Resource": "arn:aws:sqs:*:*:defillama-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:defillama-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3.3 Encryption Strategy

**In Transit:**
- TLS 1.3 for all WebSocket connections
- TLS 1.2+ for all AWS service connections
- Redis with transit encryption enabled

**At Rest:**
- RDS encryption with KMS
- Redis encryption with KMS
- DynamoDB encryption with KMS
- S3 encryption with KMS
- Secrets Manager encryption (default)

### 3.4 Secrets Management

**Secrets in AWS Secrets Manager:**
- `defillama-redis-auth-token` - Redis authentication token
- `defillama-rds-password` - RDS master password
- `defillama-jwt-secret` - JWT signing secret
- `defillama-api-keys` - API keys for external services

**Rotation Policy:**
- Redis auth token: 90 days
- RDS password: 90 days
- JWT secret: 180 days
- API keys: Manual rotation

---

## 4. Monitoring Design

### 4.1 Dashboard Layouts

#### WebSocket Dashboard
**Widgets:**
1. Active Connections (Line chart, 5-minute intervals)
2. Connection Rate (Line chart, 1-minute intervals)
3. Message Throughput (Line chart, 1-minute intervals)
4. Connection Errors (Bar chart, 5-minute intervals)
5. Message Latency (Line chart, p50/p95/p99)
6. Top Protocols by Subscriptions (Pie chart)

#### Lambda Dashboard
**Widgets:**
1. Invocation Count (Line chart, 1-minute intervals)
2. Duration (Line chart, p50/p95/p99)
3. Error Rate (Line chart, 1-minute intervals)
4. Throttle Rate (Line chart, 1-minute intervals)
5. Concurrent Executions (Line chart, 1-minute intervals)
6. Memory Usage (Line chart, average)

#### Redis Dashboard
**Widgets:**
1. CPU Utilization (Line chart, 1-minute intervals)
2. Memory Usage (Line chart, 1-minute intervals)
3. Cache Hit Rate (Line chart, 5-minute intervals)
4. Connections (Line chart, 1-minute intervals)
5. Evictions (Line chart, 5-minute intervals)
6. Replication Lag (Line chart, 1-minute intervals)

#### SQS Dashboard
**Widgets:**
1. Messages Visible (Line chart, 1-minute intervals)
2. Messages In Flight (Line chart, 1-minute intervals)
3. Age of Oldest Message (Line chart, 1-minute intervals)
4. DLQ Depth (Line chart, 1-minute intervals)
5. Message Throughput (Line chart, 1-minute intervals)

### 4.2 Metrics Definitions

**Custom Metrics:**
```typescript
// Business Metrics
- DeFiLlama.Subscriptions.Active (Count)
- DeFiLlama.Events.Published (Count)
- DeFiLlama.Alerts.Triggered (Count)
- DeFiLlama.Queries.Executed (Count)

// Performance Metrics
- DeFiLlama.Query.Latency (Milliseconds)
- DeFiLlama.Cache.HitRate (Percent)
- DeFiLlama.WebSocket.MessageLatency (Milliseconds)

// Error Metrics
- DeFiLlama.Errors.Validation (Count)
- DeFiLlama.Errors.Processing (Count)
- DeFiLlama.Errors.Database (Count)
```

### 4.3 Alarm Thresholds

**Critical Alarms (P1):**
- Lambda error rate >5% for 5 minutes
- Redis CPU >90% for 10 minutes
- RDS CPU >90% for 10 minutes
- DLQ messages >10

**High Priority Alarms (P2):**
- Lambda error rate >1% for 10 minutes
- Lambda throttle rate >0.1% for 5 minutes
- Redis memory >90% for 10 minutes
- SQS queue depth >1000 for 10 minutes

**Medium Priority Alarms (P3):**
- Lambda duration p95 >500ms for 15 minutes
- Redis cache hit rate <80% for 15 minutes
- SQS message age >10 minutes

### 4.4 Log Aggregation

**Log Groups:**
- `/aws/lambda/defillama-*` - Lambda function logs
- `/aws/apigateway/websocket/*` - WebSocket API logs
- `/aws/elasticache/redis/*` - Redis slow logs
- `/aws/rds/instance/*` - RDS logs

**Log Retention:**
- Production: 30 days
- Staging: 7 days
- Development: 3 days

**CloudWatch Insights Queries:**
```sql
-- Error rate by function
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)

-- Slow queries
fields @timestamp, @message
| filter @message like /duration/
| parse @message /duration: (?<duration>\d+)/
| filter duration > 1000
| sort duration desc

-- Top errors
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by @message
| sort count desc
| limit 10
```

---

## 5. CI/CD Design

### 5.1 Pipeline Stages

**Test Workflow:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (pnpm)
4. Run ESLint
5. Run unit tests (Jest)
6. Run integration tests
7. Upload coverage to Codecov
8. Comment PR with results

**Staging Deployment:**
1. Run test workflow
2. Build application (TypeScript → JavaScript)
3. Package Lambda functions
4. Deploy infrastructure (Serverless Framework)
5. Deploy Lambda functions
6. Run smoke tests
7. Notify Slack channel

**Production Deployment:**
1. Manual approval (required)
2. Run test workflow
3. Build application
4. Package Lambda functions
5. Deploy infrastructure (blue-green)
6. Deploy Lambda functions to new version
7. Run smoke tests on new version
8. Switch 10% traffic to new version
9. Monitor for 5 minutes
10. Switch 50% traffic
11. Monitor for 5 minutes
12. Switch 100% traffic
13. Monitor for 10 minutes
14. Rollback if errors >1%
15. Notify Slack channel

### 5.2 Environment Configurations

**Development:**
- Auto-deploy on push to `dev` branch
- Minimal resources (t4g.micro)
- No high availability
- 3-day log retention

**Staging:**
- Auto-deploy on push to `main` branch
- Production-like resources
- No high availability
- 7-day log retention

**Production:**
- Manual approval required
- Full resources (r7g.large)
- High availability (Multi-AZ)
- 30-day log retention

### 5.3 Deployment Strategy

**Blue-Green Deployment:**
1. Deploy new version (green) alongside current version (blue)
2. Run smoke tests on green
3. Gradually shift traffic: 10% → 50% → 100%
4. Monitor error rates and latency
5. Rollback to blue if errors detected
6. Keep blue for 24 hours before decommissioning

**Rollback Procedure:**
1. Detect issue (automated or manual)
2. Switch traffic back to blue version
3. Investigate issue in green version
4. Fix and redeploy
5. Notify team

---

## 6. Operational Procedures

### 6.1 Deployment Procedures

**Standard Deployment:**
1. Create feature branch
2. Implement changes
3. Run tests locally
4. Create pull request
5. Code review
6. Merge to main (auto-deploy to staging)
7. Validate in staging
8. Create production deployment request
9. Get approval
10. Deploy to production
11. Monitor for 24 hours

**Hotfix Deployment:**
1. Create hotfix branch from production
2. Implement fix
3. Run tests
4. Deploy directly to production (with approval)
5. Monitor closely
6. Backport to main branch

### 6.2 Monitoring Procedures

**Daily Monitoring:**
- Check CloudWatch dashboards
- Review alarm history
- Check cost reports
- Review error logs

**Weekly Monitoring:**
- Review performance trends
- Check capacity planning
- Review security logs
- Update documentation

**Monthly Monitoring:**
- Review cost optimization opportunities
- Update capacity planning
- Review and update alarms
- Conduct DR testing

### 6.3 Incident Response

**Severity Levels:**
- **P1 (Critical):** Service down, data loss
- **P2 (High):** Degraded performance, partial outage
- **P3 (Medium):** Minor issues, workaround available
- **P4 (Low):** Cosmetic issues, no impact

**Response Times:**
- P1: 15 minutes
- P2: 1 hour
- P3: 4 hours
- P4: 24 hours

**Incident Response Steps:**
1. Detect and alert
2. Acknowledge incident
3. Assess severity
4. Notify stakeholders
5. Investigate root cause
6. Implement fix or rollback
7. Verify resolution
8. Post-mortem analysis
9. Update runbooks

### 6.4 Backup and Restore

**Backup Schedule:**
- RDS: Automated daily backups (7-day retention)
- DynamoDB: Point-in-time recovery enabled
- Redis: Daily snapshots (7-day retention)
- S3: Versioning enabled

**Restore Procedures:**
- RDS: Restore from snapshot (15-30 minutes)
- DynamoDB: Point-in-time restore (5-10 minutes)
- Redis: Restore from snapshot (10-15 minutes)
- S3: Restore from version (immediate)

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-14  
**Author:** Augment Agent (Claude Sonnet 4)

