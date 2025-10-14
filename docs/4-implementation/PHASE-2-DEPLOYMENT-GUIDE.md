# Phase 2 Deployment Guide

**Project:** DeFiLlama On-Chain Services Platform  
**Phase:** Phase 2 - Advanced DeFi Analytics & Portfolio Analysis  
**Date:** 2025-10-14  
**Version:** 1.0  

---

## 1. Deployment Overview

### 1.1 Deployment Strategy

**Blue-Green Deployment:**
- Zero downtime deployments
- Instant rollback capability
- Traffic switching via API Gateway

**Deployment Environments:**
- **Development**: Feature testing, integration testing
- **Staging**: Pre-production validation, performance testing
- **Production**: Live environment

### 1.2 Deployment Pipeline

```
┌──────────────┐
│  Git Push    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  GitHub      │  ← Trigger on push to main
│  Actions     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Build &     │  ← TypeScript compilation, tests
│  Test        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Security    │  ← Dependency scan, SAST
│  Scan        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Deploy to   │  ← AWS CDK deploy
│  Staging     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  E2E Tests   │  ← Automated testing
│  on Staging  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Manual      │  ← Approval required
│  Approval    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Deploy to   │  ← Blue-green deployment
│  Production  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Smoke       │  ← Health checks
│  Tests       │
└──────────────┘
```

---

## 2. Pre-Deployment Checklist

### 2.1 Code Quality

```bash
# Run all checks
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:coverage

# Verify coverage thresholds
# - Unit tests: 90%+
# - Integration tests: 80%+
```

### 2.2 Security Checks

```bash
# Dependency vulnerability scan
pnpm audit

# Fix vulnerabilities
pnpm audit fix

# SAST (Static Application Security Testing)
pnpm run security:scan

# Secrets detection
git secrets --scan
```

### 2.3 Database Migrations

```bash
# Test migrations on staging
pnpm run migrate:up --env=staging

# Verify migration success
pnpm run migrate:status --env=staging

# Create rollback plan
pnpm run migrate:down --dry-run --env=staging
```

### 2.4 Configuration Validation

```bash
# Validate environment variables
pnpm run config:validate --env=production

# Check AWS credentials
aws sts get-caller-identity

# Verify secrets in AWS Secrets Manager
aws secretsmanager list-secrets --region us-east-1
```

---

## 3. Deployment Procedures

### 3.1 Deploy to Staging

```bash
# Set environment
export ENVIRONMENT=staging
export AWS_REGION=us-east-1

# Build application
pnpm run build

# Run database migrations
pnpm run migrate:up --env=staging

# Deploy infrastructure
cd infrastructure
pnpm run cdk deploy \
  --context environment=staging \
  --require-approval never

# Verify deployment
pnpm run smoke-test --env=staging
```

### 3.2 Deploy to Production

```bash
# Set environment
export ENVIRONMENT=production
export AWS_REGION=us-east-1

# Create deployment tag
git tag -a v2.0.0 -m "Phase 2: Advanced Analytics & Portfolio Analysis"
git push origin v2.0.0

# Build application
pnpm run build

# Run database migrations (with backup)
pnpm run db:backup --env=production
pnpm run migrate:up --env=production

# Deploy infrastructure (blue-green)
cd infrastructure
pnpm run cdk deploy \
  --context environment=production \
  --context deploymentType=blue-green \
  --require-approval never

# Verify green environment
pnpm run smoke-test --env=production --target=green

# Switch traffic to green
pnpm run traffic:switch --env=production --target=green

# Monitor for 15 minutes
pnpm run monitor --env=production --duration=15m

# If successful, decommission blue environment
pnpm run cleanup:blue --env=production
```

### 3.3 Rollback Procedure

```bash
# Immediate rollback (switch traffic back to blue)
pnpm run traffic:switch --env=production --target=blue

# Rollback database migrations
pnpm run migrate:down --env=production --steps=1

# Restore from backup (if needed)
pnpm run db:restore --env=production --backup-id=<backup-id>

# Verify rollback
pnpm run smoke-test --env=production
```

---

## 4. AWS CDK Deployment

### 4.1 CDK Stack Structure

```typescript
// infrastructure/lib/phase2-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';

export class Phase2Stack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'Phase2VPC', {
      maxAzs: 3,
      natGateways: 2,
    });

    // RDS PostgreSQL
    const database = new rds.DatabaseInstance(this, 'Phase2Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_3,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.R6G,
        ec2.InstanceSize.XLARGE2
      ),
      vpc,
      multiAz: true,
      allocatedStorage: 500,
      storageType: rds.StorageType.GP3,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true,
    });

    // ElastiCache Redis
    const redis = new elasticache.CfnCacheCluster(this, 'Phase2Redis', {
      cacheNodeType: 'cache.r6g.xlarge',
      engine: 'redis',
      numCacheNodes: 2,
      vpcSecurityGroupIds: [securityGroup.securityGroupId],
      cacheSubnetGroupName: subnetGroup.ref,
    });

    // Lambda Functions
    const protocolAnalyticsLambda = new lambda.Function(
      this,
      'ProtocolAnalytics',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset('dist/protocol-analytics'),
        environment: {
          DB_HOST: database.dbInstanceEndpointAddress,
          REDIS_HOST: redis.attrRedisEndpointAddress,
          CACHE_TTL: '300',
        },
        timeout: cdk.Duration.seconds(30),
        memorySize: 1024,
        reservedConcurrentExecutions: 100,
        vpc,
      }
    );

    // API Gateway
    const api = new apigateway.RestApi(this, 'Phase2API', {
      restApiName: 'DeFiLlama Phase 2 API',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        tracingEnabled: true,
      },
    });

    // API Resources
    const analyticsResource = api.root.addResource('analytics');
    const protocolResource = analyticsResource.addResource('protocol');
    const protocolIdResource = protocolResource.addResource('{protocolId}');
    const performanceResource = protocolIdResource.addResource('performance');

    performanceResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(protocolAnalyticsLambda),
      {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: apiKeyAuthorizer,
      }
    );

    // CloudWatch Alarms
    new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
      metric: protocolAnalyticsLambda.metricDuration({
        statistic: 'p95',
      }),
      threshold: 500,
      evaluationPeriods: 2,
      alarmDescription: 'API latency exceeds 500ms (p95)',
    });

    // Outputs
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.dbInstanceEndpointAddress,
      description: 'RDS database endpoint',
    });
  }
}
```

### 4.2 CDK Deployment Commands

```bash
# Install CDK
npm install -g aws-cdk

# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT-ID/REGION

# Synthesize CloudFormation template
cdk synth

# Diff changes
cdk diff

# Deploy stack
cdk deploy --require-approval never

# Deploy specific stack
cdk deploy Phase2Stack

# Destroy stack (careful!)
cdk destroy Phase2Stack
```

---

## 5. Database Migration

### 5.1 Migration Script

```typescript
// migrations/010_protocol_performance.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('protocol_performance_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('protocol_id', 255).notNullable();
    table.timestamp('timestamp').notNullable();
    
    // APY/APR Metrics
    table.decimal('apy_7d', 10, 4);
    table.decimal('apy_30d', 10, 4);
    table.decimal('apy_90d', 10, 4);
    table.decimal('apy_1y', 10, 4);
    
    // User Metrics
    table.integer('dau');
    table.integer('wau');
    table.integer('mau');
    
    // Revenue Metrics
    table.decimal('daily_revenue', 20, 2);
    table.decimal('weekly_revenue', 20, 2);
    table.decimal('monthly_revenue', 20, 2);
    
    table.timestamps(true, true);
    
    // Indexes
    table.index('protocol_id');
    table.index('timestamp');
    table.index(['protocol_id', 'timestamp']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('protocol_performance_metrics');
}
```

### 5.2 Migration Commands

```bash
# Run migrations
pnpm run migrate:up

# Rollback last migration
pnpm run migrate:down

# Rollback all migrations
pnpm run migrate:rollback

# Check migration status
pnpm run migrate:status

# Create new migration
pnpm run migrate:make migration_name
```

---

## 6. Monitoring and Alerting

### 6.1 CloudWatch Dashboard

```typescript
// infrastructure/lib/monitoring-stack.ts
const dashboard = new cloudwatch.Dashboard(this, 'Phase2Dashboard', {
  dashboardName: 'DeFiLlama-Phase2',
});

dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'API Latency (p95)',
    left: [
      protocolAnalyticsLambda.metricDuration({ statistic: 'p95' }),
      yieldScannerLambda.metricDuration({ statistic: 'p95' }),
      portfolioTrackerLambda.metricDuration({ statistic: 'p95' }),
    ],
  }),
  new cloudwatch.GraphWidget({
    title: 'Request Rate',
    left: [
      protocolAnalyticsLambda.metricInvocations(),
      yieldScannerLambda.metricInvocations(),
      portfolioTrackerLambda.metricInvocations(),
    ],
  }),
  new cloudwatch.GraphWidget({
    title: 'Error Rate',
    left: [
      protocolAnalyticsLambda.metricErrors(),
      yieldScannerLambda.metricErrors(),
      portfolioTrackerLambda.metricErrors(),
    ],
  }),
  new cloudwatch.GraphWidget({
    title: 'Cache Hit Rate',
    left: [cacheHitRateMetric],
  })
);
```

### 6.2 Alerting Rules

```typescript
// High latency alarm
new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
  metric: lambda.metricDuration({ statistic: 'p95' }),
  threshold: 500,
  evaluationPeriods: 2,
  alarmDescription: 'API latency exceeds 500ms (p95)',
  actionsEnabled: true,
});

// High error rate alarm
new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
  metric: lambda.metricErrors({ statistic: 'sum' }),
  threshold: 10,
  evaluationPeriods: 1,
  alarmDescription: 'Error rate exceeds 10 errors/minute',
  actionsEnabled: true,
});

// Database connection alarm
new cloudwatch.Alarm(this, 'DatabaseConnectionAlarm', {
  metric: database.metricDatabaseConnections(),
  threshold: 80,
  evaluationPeriods: 2,
  alarmDescription: 'Database connections exceed 80%',
  actionsEnabled: true,
});
```

---

## 7. Post-Deployment Verification

### 7.1 Smoke Tests

```bash
# Run smoke tests
pnpm run smoke-test --env=production

# Test critical endpoints
curl -H "Authorization: Bearer $API_KEY" \
  https://api.defillama.com/v1/analytics/protocol/uniswap-v3/performance

# Verify database connectivity
pnpm run db:health-check --env=production

# Verify cache connectivity
pnpm run cache:health-check --env=production
```

### 7.2 Monitoring Checklist

- ✅ API latency <500ms (p95)
- ✅ Error rate <1%
- ✅ Cache hit rate >90%
- ✅ Database connections <80%
- ✅ Lambda concurrent executions <80%
- ✅ All alarms in OK state
- ✅ No errors in CloudWatch Logs

---

**Version**: 1.0  
**Last Updated**: 2025-10-14  
**Status**: Ready for Use

