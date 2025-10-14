# Backup and Recovery Runbook

## Overview

This runbook provides procedures for backing up and restoring DeFiLlama On-Chain Services data.

## Backup Strategy

### Automated Backups

| Resource | Frequency | Retention | Method |
|----------|-----------|-----------|--------|
| RDS | Daily at 2 AM UTC | 30 days (prod), 7 days (dev/staging) | AWS Backup |
| DynamoDB | Continuous (PITR) | 35 days | Point-in-Time Recovery |
| Redis | Daily at 3 AM UTC | 7 days | ElastiCache Snapshots |
| S3 | Versioning enabled | 90 days | S3 Versioning |

### Manual Backups

Use manual backups before:
- Major deployments
- Database migrations
- Configuration changes
- Data cleanup operations

## Backup Procedures

### Create Manual Backup

```bash
# Backup all resources
./scripts/backup.sh prod --all

# Backup specific resource
./scripts/backup.sh prod --rds
./scripts/backup.sh prod --dynamodb
./scripts/backup.sh prod --redis
```

### Verify Backup

```bash
# List RDS snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier defillama-prod \
  --region eu-central-1

# List DynamoDB backups
aws dynamodb list-backups \
  --table-name prod-table \
  --region eu-central-1

# List Redis snapshots
aws elasticache describe-snapshots \
  --region eu-central-1
```

## Recovery Procedures

### RDS Recovery

**Point-in-Time Recovery:**

```bash
# Restore to specific time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier defillama-prod \
  --target-db-instance-identifier defillama-prod-restored \
  --restore-time 2024-01-15T10:00:00Z \
  --region eu-central-1
```

**Snapshot Recovery:**

```bash
# Restore from snapshot
./scripts/restore.sh prod <snapshot-id> --rds
```

### DynamoDB Recovery

**Point-in-Time Recovery:**

```bash
# Restore to specific time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name prod-table \
  --target-table-name prod-table-restored \
  --restore-date-time 2024-01-15T10:00:00Z \
  --region eu-central-1
```

**Backup Recovery:**

```bash
# Restore from backup
./scripts/restore.sh prod <backup-arn> --dynamodb
```

### Redis Recovery

```bash
# Restore from snapshot
./scripts/restore.sh prod <snapshot-name> --redis
```

## Disaster Recovery

### Recovery Time Objective (RTO)

| Severity | RTO | Description |
|----------|-----|-------------|
| P1 | <1 hour | Complete service outage |
| P2 | <4 hours | Partial service degradation |
| P3 | <24 hours | Minor data loss |

### Recovery Point Objective (RPO)

| Resource | RPO | Description |
|----------|-----|-------------|
| RDS | <5 minutes | Point-in-time recovery |
| DynamoDB | <1 second | Continuous backup |
| Redis | <24 hours | Daily snapshots |

### DR Procedure

1. **Assess Damage**
   - Identify affected resources
   - Determine data loss extent
   - Estimate recovery time

2. **Notify Stakeholders**
   - Create incident
   - Notify team
   - Update status page

3. **Restore from Backup**
   - Select appropriate backup
   - Restore to new resources
   - Verify data integrity

4. **Update Configuration**
   - Update connection strings
   - Update DNS records
   - Update environment variables

5. **Test and Verify**
   - Run smoke tests
   - Verify data integrity
   - Test critical functionality

6. **Switch Traffic**
   - Update load balancer
   - Monitor metrics
   - Verify no errors

## Backup Monitoring

### Daily Checks

- [ ] Verify automated backups completed
- [ ] Check backup status in AWS Backup
- [ ] Review backup logs for errors
- [ ] Verify backup retention policies

### Weekly Checks

- [ ] Test restore procedure (non-prod)
- [ ] Verify backup encryption
- [ ] Review backup costs
- [ ] Update backup documentation

## Backup Best Practices

1. **Test Restores Regularly** - Test restore procedure monthly
2. **Encrypt Backups** - Use KMS encryption for all backups
3. **Monitor Backup Status** - Set up alarms for backup failures
4. **Document Procedures** - Keep runbooks up to date
5. **Automate Where Possible** - Use AWS Backup for automation
6. **Verify Data Integrity** - Check restored data after recovery

## Contacts

- **On-Call Engineer:** [Slack channel]
- **Database Admin:** [Slack channel]
- **AWS Support:** [Support Portal]

## References

- [AWS Backup Documentation](https://docs.aws.amazon.com/aws-backup/)
- [RDS Backup Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_CommonTasks.BackupRestore.html)
- [DynamoDB Backup Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BackupRestore.html)

