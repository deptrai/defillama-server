#!/bin/bash

# DeFiLlama Restore Script
# This script restores backups of RDS, DynamoDB, and Redis

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if stage and backup ID are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    log_error "Usage: ./restore.sh <stage> <backup-id> [--rds] [--dynamodb] [--redis]"
    log_info "Stages: dev, staging, prod"
    log_info "Backup ID: Snapshot/backup identifier"
    log_info "Options:"
    log_info "  --rds        Restore RDS only"
    log_info "  --dynamodb   Restore DynamoDB only"
    log_info "  --redis      Restore Redis only"
    exit 1
fi

STAGE=$1
BACKUP_ID=$2
RESTORE_RDS=false
RESTORE_DYNAMODB=false
RESTORE_REDIS=false

# Parse options
shift 2
if [ $# -eq 0 ]; then
    log_error "Please specify what to restore: --rds, --dynamodb, or --redis"
    exit 1
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        --rds)
            RESTORE_RDS=true
            shift
            ;;
        --dynamodb)
            RESTORE_DYNAMODB=true
            shift
            ;;
        --redis)
            RESTORE_REDIS=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid stage: $STAGE"
    log_info "Valid stages: dev, staging, prod"
    exit 1
fi

log_warn "⚠️  WARNING: This will restore data from backup"
log_warn "Stage: $STAGE"
log_warn "Backup ID: $BACKUP_ID"
log_warn ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Restore cancelled"
    exit 0
fi

log_info "Starting restore for $STAGE environment"

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured"
    log_info "Run: aws configure"
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESTORE_RESULTS=()

# Restore RDS
if [ "$RESTORE_RDS" = true ]; then
    log_info "Restoring RDS from snapshot..."
    NEW_INSTANCE="defillama-$STAGE-restored-$TIMESTAMP"
    
    if aws rds describe-db-snapshots --db-snapshot-identifier $BACKUP_ID --region eu-central-1 &> /dev/null; then
        log_info "  Creating new RDS instance: $NEW_INSTANCE"
        
        if aws rds restore-db-instance-from-db-snapshot \
            --db-instance-identifier $NEW_INSTANCE \
            --db-snapshot-identifier $BACKUP_ID \
            --region eu-central-1 &> /dev/null; then
            
            log_info "  ✓ RDS restore initiated: $NEW_INSTANCE"
            log_info "  Waiting for instance to be available (this may take 10-15 minutes)..."
            
            aws rds wait db-instance-available --db-instance-identifier $NEW_INSTANCE --region eu-central-1
            
            log_info "  ✓ RDS instance is now available"
            RESTORE_RESULTS+=("RDS: $NEW_INSTANCE")
        else
            log_error "  ✗ Failed to restore RDS"
            RESTORE_RESULTS+=("RDS: FAILED")
        fi
    else
        log_error "  RDS snapshot not found: $BACKUP_ID"
        RESTORE_RESULTS+=("RDS: SNAPSHOT NOT FOUND")
    fi
fi

# Restore DynamoDB
if [ "$RESTORE_DYNAMODB" = true ]; then
    log_info "Restoring DynamoDB from backup..."
    NEW_TABLE="defillama-$STAGE-restored-$TIMESTAMP"
    
    if aws dynamodb describe-backup --backup-arn $BACKUP_ID --region eu-central-1 &> /dev/null; then
        log_info "  Creating new DynamoDB table: $NEW_TABLE"
        
        if aws dynamodb restore-table-from-backup \
            --target-table-name $NEW_TABLE \
            --backup-arn $BACKUP_ID \
            --region eu-central-1 &> /dev/null; then
            
            log_info "  ✓ DynamoDB restore initiated: $NEW_TABLE"
            log_info "  Waiting for table to be active (this may take 5-10 minutes)..."
            
            aws dynamodb wait table-exists --table-name $NEW_TABLE --region eu-central-1
            
            log_info "  ✓ DynamoDB table is now active"
            RESTORE_RESULTS+=("DynamoDB: $NEW_TABLE")
        else
            log_error "  ✗ Failed to restore DynamoDB"
            RESTORE_RESULTS+=("DynamoDB: FAILED")
        fi
    else
        log_error "  DynamoDB backup not found: $BACKUP_ID"
        RESTORE_RESULTS+=("DynamoDB: BACKUP NOT FOUND")
    fi
fi

# Restore Redis
if [ "$RESTORE_REDIS" = true ]; then
    log_info "Restoring Redis from snapshot..."
    NEW_CLUSTER="defillama-redis-$STAGE-restored-$TIMESTAMP"
    
    if aws elasticache describe-snapshots --snapshot-name $BACKUP_ID --region eu-central-1 &> /dev/null; then
        log_info "  Creating new Redis cluster: $NEW_CLUSTER"
        
        # Get snapshot details
        SNAPSHOT_INFO=$(aws elasticache describe-snapshots --snapshot-name $BACKUP_ID --region eu-central-1 --query 'Snapshots[0]' --output json)
        
        if aws elasticache create-replication-group \
            --replication-group-id $NEW_CLUSTER \
            --replication-group-description "Restored from $BACKUP_ID" \
            --snapshot-name $BACKUP_ID \
            --region eu-central-1 &> /dev/null; then
            
            log_info "  ✓ Redis restore initiated: $NEW_CLUSTER"
            log_info "  Waiting for cluster to be available (this may take 10-15 minutes)..."
            
            # Wait for cluster to be available
            while true; do
                STATUS=$(aws elasticache describe-replication-groups --replication-group-id $NEW_CLUSTER --region eu-central-1 --query 'ReplicationGroups[0].Status' --output text 2>/dev/null || echo "")
                
                if [ "$STATUS" = "available" ]; then
                    break
                fi
                
                sleep 30
            done
            
            log_info "  ✓ Redis cluster is now available"
            RESTORE_RESULTS+=("Redis: $NEW_CLUSTER")
        else
            log_error "  ✗ Failed to restore Redis"
            RESTORE_RESULTS+=("Redis: FAILED")
        fi
    else
        log_error "  Redis snapshot not found: $BACKUP_ID"
        RESTORE_RESULTS+=("Redis: SNAPSHOT NOT FOUND")
    fi
fi

# Summary
log_info ""
log_info "Restore Summary:"
log_info "Stage: $STAGE"
log_info "Backup ID: $BACKUP_ID"
log_info "Timestamp: $TIMESTAMP"
log_info ""
log_info "Results:"
for result in "${RESTORE_RESULTS[@]}"; do
    log_info "  - $result"
done

# Check if any restores failed
if [[ " ${RESTORE_RESULTS[@]} " =~ " FAILED " ]]; then
    log_error "Some restores failed"
    exit 1
fi

log_info ""
log_info "Restore completed successfully! ✓"
log_info ""
log_info "Next steps:"
log_info "  1. Verify restored data"
log_info "  2. Update application configuration to use new resources"
log_info "  3. Test application functionality"
log_info "  4. Switch traffic to restored resources"
log_info "  5. Delete old resources after verification"

