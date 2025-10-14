#!/bin/bash

# DeFiLlama Backup Script
# This script creates backups of RDS, DynamoDB, and Redis

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

# Check if stage is provided
if [ -z "$1" ]; then
    log_error "Usage: ./backup.sh <stage> [--rds] [--dynamodb] [--redis] [--all]"
    log_info "Stages: dev, staging, prod"
    log_info "Options:"
    log_info "  --rds        Backup RDS only"
    log_info "  --dynamodb   Backup DynamoDB only"
    log_info "  --redis      Backup Redis only"
    log_info "  --all        Backup all resources (default)"
    exit 1
fi

STAGE=$1
BACKUP_RDS=false
BACKUP_DYNAMODB=false
BACKUP_REDIS=false

# Parse options
shift
if [ $# -eq 0 ]; then
    # Default: backup all
    BACKUP_RDS=true
    BACKUP_DYNAMODB=true
    BACKUP_REDIS=true
else
    while [[ $# -gt 0 ]]; do
        case $1 in
            --rds)
                BACKUP_RDS=true
                shift
                ;;
            --dynamodb)
                BACKUP_DYNAMODB=true
                shift
                ;;
            --redis)
                BACKUP_REDIS=true
                shift
                ;;
            --all)
                BACKUP_RDS=true
                BACKUP_DYNAMODB=true
                BACKUP_REDIS=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
fi

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid stage: $STAGE"
    log_info "Valid stages: dev, staging, prod"
    exit 1
fi

log_info "Starting backup for $STAGE environment"

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured"
    log_info "Run: aws configure"
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_RESULTS=()

# Backup RDS
if [ "$BACKUP_RDS" = true ]; then
    log_info "Creating RDS backup..."
    RDS_INSTANCE="defillama-$STAGE"
    SNAPSHOT_ID="defillama-$STAGE-manual-$TIMESTAMP"
    
    if aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE --region eu-central-1 &> /dev/null; then
        if aws rds create-db-snapshot --db-instance-identifier $RDS_INSTANCE --db-snapshot-identifier $SNAPSHOT_ID --region eu-central-1 &> /dev/null; then
            log_info "  ✓ RDS snapshot created: $SNAPSHOT_ID"
            BACKUP_RESULTS+=("RDS: $SNAPSHOT_ID")
        else
            log_error "  ✗ Failed to create RDS snapshot"
            BACKUP_RESULTS+=("RDS: FAILED")
        fi
    else
        log_warn "  RDS instance not found: $RDS_INSTANCE"
        BACKUP_RESULTS+=("RDS: NOT FOUND")
    fi
fi

# Backup DynamoDB
if [ "$BACKUP_DYNAMODB" = true ]; then
    log_info "Creating DynamoDB backup..."
    TABLE_NAME="prod-table"  # Adjust based on your table name
    BACKUP_NAME="defillama-$STAGE-manual-$TIMESTAMP"
    
    if aws dynamodb describe-table --table-name $TABLE_NAME --region eu-central-1 &> /dev/null; then
        BACKUP_ARN=$(aws dynamodb create-backup --table-name $TABLE_NAME --backup-name $BACKUP_NAME --region eu-central-1 --query 'BackupDetails.BackupArn' --output text 2>/dev/null)
        
        if [ ! -z "$BACKUP_ARN" ]; then
            log_info "  ✓ DynamoDB backup created: $BACKUP_NAME"
            BACKUP_RESULTS+=("DynamoDB: $BACKUP_NAME")
        else
            log_error "  ✗ Failed to create DynamoDB backup"
            BACKUP_RESULTS+=("DynamoDB: FAILED")
        fi
    else
        log_warn "  DynamoDB table not found: $TABLE_NAME"
        BACKUP_RESULTS+=("DynamoDB: NOT FOUND")
    fi
fi

# Backup Redis
if [ "$BACKUP_REDIS" = true ]; then
    log_info "Creating Redis backup..."
    REDIS_CLUSTER="defillama-redis-$STAGE"
    SNAPSHOT_NAME="defillama-$STAGE-manual-$TIMESTAMP"
    
    # Get replication group ID
    REPLICATION_GROUP=$(aws elasticache describe-replication-groups --region eu-central-1 --query "ReplicationGroups[?contains(ReplicationGroupId, '$REDIS_CLUSTER')].ReplicationGroupId" --output text 2>/dev/null | head -1)
    
    if [ ! -z "$REPLICATION_GROUP" ]; then
        if aws elasticache create-snapshot --replication-group-id $REPLICATION_GROUP --snapshot-name $SNAPSHOT_NAME --region eu-central-1 &> /dev/null; then
            log_info "  ✓ Redis snapshot created: $SNAPSHOT_NAME"
            BACKUP_RESULTS+=("Redis: $SNAPSHOT_NAME")
        else
            log_error "  ✗ Failed to create Redis snapshot"
            BACKUP_RESULTS+=("Redis: FAILED")
        fi
    else
        log_warn "  Redis cluster not found: $REDIS_CLUSTER"
        BACKUP_RESULTS+=("Redis: NOT FOUND")
    fi
fi

# Summary
log_info ""
log_info "Backup Summary:"
log_info "Stage: $STAGE"
log_info "Timestamp: $TIMESTAMP"
log_info ""
log_info "Results:"
for result in "${BACKUP_RESULTS[@]}"; do
    log_info "  - $result"
done

# Check if any backups failed
if [[ " ${BACKUP_RESULTS[@]} " =~ " FAILED " ]]; then
    log_error "Some backups failed"
    exit 1
fi

log_info ""
log_info "Backup completed successfully! ✓"
log_info ""
log_info "Backup retention:"
log_info "  - RDS: 7-30 days (automated)"
log_info "  - DynamoDB: Point-in-time recovery enabled"
log_info "  - Redis: 7 days (automated)"

