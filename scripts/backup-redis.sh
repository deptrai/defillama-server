#!/usr/bin/env bash

################################################################################
# Redis Backup Script
# 
# Description: Automated Redis RDB snapshot backup with compression and retention
# Author: Augment Agent (Claude Sonnet 4)
# Version: 1.0
# Date: 2025-10-14
#
# Features:
# - Automated BGSAVE backup
# - Gzip compression
# - Retention policy (7 daily, 4 weekly, 12 monthly)
# - Error handling and logging
# - Slack notifications on failure
#
# Usage: ./backup-redis.sh
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/redis}"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
LOG_FILE="$LOG_DIR/backup-redis.log"

# Redis Configuration
REDIS_CONTAINER="${REDIS_CONTAINER:-defillama-redis}"
REDIS_DATA_DIR="/data"
REDIS_RDB_FILE="dump.rdb"

# Retention Configuration
DAILY_RETENTION=7
WEEKLY_RETENTION=4
MONTHLY_RETENTION=12

# Notification Configuration
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

################################################################################
# Functions
################################################################################

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "$@"
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    log "WARN" "$@"
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $*"
}

send_slack_notification() {
    local message="$1"
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔴 Redis Backup Failed: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running"
        send_slack_notification "Docker is not running"
        exit 1
    fi
    
    # Check if Redis container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
        log_error "Redis container '$REDIS_CONTAINER' is not running"
        send_slack_notification "Redis container not running"
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    
    log_info "Prerequisites check passed"
}

create_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/redis_${timestamp}.rdb.gz"
    
    log_info "Starting Redis backup..."
    log_info "Backup file: $backup_file"
    
    # Trigger BGSAVE
    log_info "Triggering BGSAVE..."
    if ! docker exec "$REDIS_CONTAINER" redis-cli BGSAVE 2>>"$LOG_FILE"; then
        log_error "BGSAVE command failed"
        send_slack_notification "BGSAVE command failed"
        return 1
    fi
    
    # Wait for BGSAVE to complete
    log_info "Waiting for BGSAVE to complete..."
    local max_wait=60  # Maximum 60 seconds
    local waited=0
    while [[ $waited -lt $max_wait ]]; do
        local lastsave=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE 2>/dev/null || echo "0")
        local current_time=$(date +%s)
        
        # If LASTSAVE is recent (within last 5 seconds), backup is complete
        if [[ $((current_time - lastsave)) -lt 5 ]]; then
            log_info "BGSAVE completed"
            break
        fi
        
        sleep 1
        waited=$((waited + 1))
    done
    
    if [[ $waited -ge $max_wait ]]; then
        log_warn "BGSAVE timeout, proceeding anyway..."
    fi
    
    # Copy RDB file from container
    log_info "Copying RDB file from container..."
    if docker exec "$REDIS_CONTAINER" cat "$REDIS_DATA_DIR/$REDIS_RDB_FILE" 2>>"$LOG_FILE" | gzip > "$backup_file"; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log_info "Backup created successfully: $backup_file ($backup_size)"
        echo "$backup_file"
        return 0
    else
        log_error "Backup failed"
        send_slack_notification "Failed to copy RDB file"
        rm -f "$backup_file"
        return 1
    fi
}

verify_backup() {
    local backup_file="$1"
    
    log_info "Verifying backup integrity..."
    
    # Check if file exists
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    # Check if file is not empty
    if [[ ! -s "$backup_file" ]]; then
        log_error "Backup file is empty: $backup_file"
        return 1
    fi
    
    # Verify gzip integrity
    if ! gzip -t "$backup_file" 2>/dev/null; then
        log_error "Backup file is corrupted: $backup_file"
        return 1
    fi
    
    log_info "Backup verification passed"
    return 0
}

apply_retention_policy() {
    log_info "Applying retention policy..."
    
    # Daily backups: Keep last 7 days
    log_info "Cleaning up daily backups (keep last $DAILY_RETENTION)..."
    find "$BACKUP_DIR" -name "redis_*.rdb.gz" -type f -mtime +$DAILY_RETENTION -delete
    
    # Weekly backups: Keep last 4 weeks (28 days)
    local weekly_retention=$((WEEKLY_RETENTION * 7))
    log_info "Cleaning up weekly backups (keep last $WEEKLY_RETENTION weeks)..."
    find "$BACKUP_DIR" -name "redis_*.rdb.gz" -type f -mtime +$weekly_retention -delete
    
    # Monthly backups: Keep last 12 months (365 days)
    local monthly_retention=$((MONTHLY_RETENTION * 30))
    log_info "Cleaning up monthly backups (keep last $MONTHLY_RETENTION months)..."
    find "$BACKUP_DIR" -name "redis_*.rdb.gz" -type f -mtime +$monthly_retention -delete
    
    # Count remaining backups
    local backup_count=$(find "$BACKUP_DIR" -name "redis_*.rdb.gz" -type f | wc -l)
    log_info "Retention policy applied. Remaining backups: $backup_count"
}

print_summary() {
    local backup_file="$1"
    local backup_size=$(du -h "$backup_file" | cut -f1)
    local backup_count=$(find "$BACKUP_DIR" -name "redis_*.rdb.gz" -type f | wc -l)
    
    echo ""
    echo "=========================================="
    echo "Redis Backup Summary"
    echo "=========================================="
    echo "Backup File: $(basename "$backup_file")"
    echo "Backup Size: $backup_size"
    echo "Total Backups: $backup_count"
    echo "Backup Directory: $BACKUP_DIR"
    echo "Log File: $LOG_FILE"
    echo "=========================================="
    echo ""
}

################################################################################
# Main
################################################################################

main() {
    log_info "=========================================="
    log_info "Redis Backup Started"
    log_info "=========================================="
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    local backup_file
    if ! backup_file=$(create_backup); then
        log_error "Backup creation failed"
        exit 1
    fi
    
    # Verify backup
    if ! verify_backup "$backup_file"; then
        log_error "Backup verification failed"
        send_slack_notification "Backup verification failed"
        exit 1
    fi
    
    # Apply retention policy
    apply_retention_policy
    
    # Print summary
    print_summary "$backup_file"
    
    log_info "=========================================="
    log_info "Redis Backup Completed Successfully"
    log_info "=========================================="
}

# Run main function
main "$@"

