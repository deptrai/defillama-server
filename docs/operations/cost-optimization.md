# Cost Optimization Guide

## Overview

This guide provides strategies for optimizing AWS costs for DeFiLlama On-Chain Services.

## Cost Monitoring

### Generate Cost Report

```bash
# Monthly cost report
./scripts/cost-report.sh prod --days 30

# Weekly cost report
./scripts/cost-report.sh prod --days 7

# All environments
./scripts/cost-report.sh all --days 30
```

### Cost Allocation Tags

All resources are tagged with:
- `Environment`: dev/staging/prod
- `Service`: defillama
- `Component`: lambda/api/database/cache
- `CostCenter`: engineering

## Lambda Optimization

### Right-Size Memory

- **Current:** 512MB default
- **Recommendation:** Test with 256MB, 384MB, 512MB, 1024MB
- **Tool:** AWS Lambda Power Tuning
- **Expected Savings:** 20-30%

### Reduce Execution Time

- Optimize cold starts
- Use connection pooling
- Cache frequently accessed data
- Minimize dependencies

### Use Provisioned Concurrency Wisely

- Only for hot functions (>100 req/min)
- Use auto-scaling
- Monitor utilization (target 70%)

## DynamoDB Optimization

### Use On-Demand Pricing

- For unpredictable workloads
- For dev/staging environments
- Switch to provisioned for predictable prod workloads

### Enable Auto-Scaling

- Target utilization: 70%
- Min capacity: 10 (prod), 1 (dev/staging)
- Max capacity: 100

### Archive Old Data

- Move data >90 days to S3
- Use DynamoDB Streams for archival
- Expected savings: 40-50%

## ElastiCache (Redis) Optimization

### Right-Size Instances

| Environment | Current | Recommended | Savings |
|-------------|---------|-------------|---------|
| dev | t4g.micro | t4g.micro | 0% |
| staging | r7g.large | r7g.medium | 50% |
| prod | r7g.large | r7g.large | 0% |

### Use Reserved Instances

- 1-year term: 30% savings
- 3-year term: 50% savings
- Production only

### Optimize Cache Hit Rate

- Target: >80%
- Increase TTL for stable data
- Implement cache warming
- Monitor evictions

## RDS Optimization

### Right-Size Instances

- Monitor CPU, memory, IOPS
- Scale down if utilization <50%
- Use Graviton instances (20% cheaper)

### Use Reserved Instances

- 1-year term: 35% savings
- 3-year term: 60% savings
- Production only

### Optimize Storage

- Use gp3 instead of gp2 (20% cheaper)
- Right-size storage (monitor usage)
- Enable storage auto-scaling

## VPC Optimization

### Reduce NAT Gateway Costs

- Use VPC endpoints for AWS services
- Consolidate NAT Gateways
- Expected savings: 30-40%

### VPC Endpoints

Already implemented for:
- S3
- DynamoDB
- SQS
- SNS
- Secrets Manager
- CloudWatch Logs

## S3 Optimization

### Lifecycle Policies

- Transition to IA after 30 days
- Transition to Glacier after 90 days
- Delete after 365 days
- Expected savings: 50-60%

### Enable Intelligent-Tiering

- Automatic cost optimization
- No retrieval fees
- Recommended for all buckets

## CloudWatch Optimization

### Reduce Log Retention

- Dev: 7 days
- Staging: 14 days
- Prod: 30 days

### Use Log Insights Efficiently

- Limit query time range
- Use specific filters
- Cache query results

### Optimize Custom Metrics

- Reduce metric resolution (1 minute → 5 minutes)
- Aggregate metrics before publishing
- Expected savings: 20-30%

## Cost Optimization Checklist

### Monthly

- [ ] Review cost report
- [ ] Identify cost anomalies
- [ ] Right-size over-provisioned resources
- [ ] Delete unused resources
- [ ] Review reserved instance utilization

### Quarterly

- [ ] Evaluate reserved instance purchases
- [ ] Review auto-scaling policies
- [ ] Optimize Lambda memory allocation
- [ ] Review data retention policies
- [ ] Audit IAM permissions

### Annually

- [ ] Review architecture for cost efficiency
- [ ] Evaluate new AWS services
- [ ] Renegotiate enterprise agreements
- [ ] Update cost allocation tags

## Expected Cost Breakdown (Production)

| Service | Monthly Cost | Percentage |
|---------|--------------|------------|
| Lambda | $150 | 25% |
| ElastiCache | $200 | 33% |
| RDS | $100 | 17% |
| DynamoDB | $80 | 13% |
| VPC (NAT Gateway) | $45 | 8% |
| CloudWatch | $15 | 2% |
| S3 | $10 | 2% |
| **Total** | **$600** | **100%** |

## Cost Optimization Targets

| Environment | Current | Target | Savings |
|-------------|---------|--------|---------|
| dev | $50/month | $30/month | 40% |
| staging | $150/month | $100/month | 33% |
| prod | $800/month | $600/month | 25% |
| **Total** | **$1000/month** | **$730/month** | **27%** |

## References

- [AWS Cost Optimization](https://aws.amazon.com/pricing/cost-optimization/)
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
- [AWS Trusted Advisor](https://aws.amazon.com/premiumsupport/technology/trusted-advisor/)

