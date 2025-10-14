#!/usr/bin/env bash

################################################################################
# PostgreSQL Backup Script
# 
# Description: Automated PostgreSQL database backup with compression and retention
# Author: Augment Agent (Claude Sonnet 4)
# Version: 1.0
# Date: 2025-10-14
#
# Features:
# - Automated pg_dump backup
# - Gzip compression
# - Retention policy (7 daily, 4 weekly, 12 monthly)
# - Error handling and logging
# - Slack notifications on failure
#
# Usage: ./backup-postgres.sh
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/postgres}"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
LOG_FILE="$LOG_DIR/backup-postgres.log"

# PostgreSQL Configuration
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-defillama-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-defillama}"

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
            --data "{\"text\":\"🔴 PostgreSQL Backup Failed: $message\"}" \
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
    
    # Check if PostgreSQL container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
        log_error "PostgreSQL container '$POSTGRES_CONTAINER' is not running"
        send_slack_notification "PostgreSQL container not running"
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    
    log_info "Prerequisites check passed"
}

create_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/postgres_${POSTGRES_DB}_${timestamp}.sql.gz"
    
    log_info "Starting PostgreSQL backup..."
    log_info "Database: $POSTGRES_DB"
    log_info "Backup file: $backup_file"
    
    # Create backup using pg_dump
    if docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --format=plain \
        --no-owner \
        --no-acl \
        2>>"$LOG_FILE" | gzip > "$backup_file"; then
        
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log_info "Backup created successfully: $backup_file ($backup_size)"
        echo "$backup_file"
        return 0
    else
        log_error "Backup failed"
        send_slack_notification "pg_dump failed for database $POSTGRES_DB"
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
    find "$BACKUP_DIR" -name "postgres_*.sql.gz" -type f -mtime +$DAILY_RETENTION -delete
    
    # Weekly backups: Keep last 4 weeks (28 days)
    local weekly_retention=$((WEEKLY_RETENTION * 7))
    log_info "Cleaning up weekly backups (keep last $WEEKLY_RETENTION weeks)..."
    find "$BACKUP_DIR" -name "postgres_*.sql.gz" -type f -mtime +$weekly_retention -delete
    
    # Monthly backups: Keep last 12 months (365 days)
    local monthly_retention=$((MONTHLY_RETENTION * 30))
    log_info "Cleaning up monthly backups (keep last $MONTHLY_RETENTION months)..."
    find "$BACKUP_DIR" -name "postgres_*.sql.gz" -type f -mtime +$monthly_retention -delete
    
    # Count remaining backups
    local backup_count=$(find "$BACKUP_DIR" -name "postgres_*.sql.gz" -type f | wc -l)
    log_info "Retention policy applied. Remaining backups: $backup_count"
}

print_summary() {
    local backup_file="$1"
    local backup_size=$(du -h "$backup_file" | cut -f1)
    local backup_count=$(find "$BACKUP_DIR" -name "postgres_*.sql.gz" -type f | wc -l)
    
    echo ""
    echo "=========================================="
    echo "PostgreSQL Backup Summary"
    echo "=========================================="
    echo "Database: $POSTGRES_DB"
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
    log_info "PostgreSQL Backup Started"
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
    log_info "PostgreSQL Backup Completed Successfully"
    log_info "=========================================="
}

# Run main function
main "$@"

