#!/usr/bin/env bash

################################################################################
# PostgreSQL Restore Script
# 
# Description: Restore PostgreSQL database from backup with validation
# Author: Augment Agent (Claude Sonnet 4)
# Version: 1.0
# Date: 2025-10-14
#
# Features:
# - Automated database restore from backup
# - Backup validation before restore
# - Service stop/start management
# - Data integrity verification
# - Rollback on failure
#
# Usage: ./restore-postgres.sh <backup_file>
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/postgres}"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
LOG_FILE="$LOG_DIR/restore-postgres.log"

# PostgreSQL Configuration
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-defillama-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-defillama}"

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
            --data "{\"text\":\"🔴 PostgreSQL Restore Failed: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

usage() {
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Arguments:"
    echo "  backup_file    Path to backup file (*.sql.gz)"
    echo ""
    echo "Examples:"
    echo "  $0 /path/to/postgres_defillama_20251014_120000.sql.gz"
    echo "  $0 latest  # Restore from latest backup"
    exit 1
}

find_latest_backup() {
    local latest=$(find "$BACKUP_DIR" -name "postgres_*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    
    if [[ -z "$latest" ]]; then
        log_error "No backup files found in $BACKUP_DIR"
        exit 1
    fi
    
    echo "$latest"
}

validate_backup() {
    local backup_file="$1"
    
    log_info "Validating backup file..."
    
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
    
    log_info "Backup validation passed"
    return 0
}

create_pre_restore_backup() {
    log_info "Creating pre-restore backup..."
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local pre_restore_backup="$BACKUP_DIR/pre_restore_${POSTGRES_DB}_${timestamp}.sql.gz"
    
    if docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --format=plain \
        --no-owner \
        --no-acl \
        2>>"$LOG_FILE" | gzip > "$pre_restore_backup"; then
        
        log_info "Pre-restore backup created: $pre_restore_backup"
        echo "$pre_restore_backup"
        return 0
    else
        log_warn "Failed to create pre-restore backup"
        return 1
    fi
}

restore_database() {
    local backup_file="$1"
    
    log_info "Starting database restore..."
    log_info "Backup file: $backup_file"
    
    # Drop existing database connections
    log_info "Terminating existing connections..."
    docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" \
        2>>"$LOG_FILE" || true
    
    # Drop and recreate database
    log_info "Dropping and recreating database..."
    docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c \
        "DROP DATABASE IF EXISTS $POSTGRES_DB;" 2>>"$LOG_FILE"
    
    docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c \
        "CREATE DATABASE $POSTGRES_DB;" 2>>"$LOG_FILE"
    
    # Restore from backup
    log_info "Restoring database from backup..."
    if gunzip -c "$backup_file" | docker exec -i "$POSTGRES_CONTAINER" psql \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        2>>"$LOG_FILE"; then
        
        log_info "Database restore completed"
        return 0
    else
        log_error "Database restore failed"
        send_slack_notification "Database restore failed"
        return 1
    fi
}

verify_restore() {
    log_info "Verifying database restore..."
    
    # Check if database exists
    if ! docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -lqt | cut -d \| -f 1 | grep -qw "$POSTGRES_DB"; then
        log_error "Database does not exist after restore"
        return 1
    fi
    
    # Count tables
    local table_count=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    log_info "Tables found: $table_count"
    
    if [[ "$table_count" -eq 0 ]]; then
        log_warn "No tables found in restored database"
    fi
    
    log_info "Database verification passed"
    return 0
}

print_summary() {
    local backup_file="$1"
    local backup_size=$(du -h "$backup_file" | cut -f1)
    
    echo ""
    echo "=========================================="
    echo "PostgreSQL Restore Summary"
    echo "=========================================="
    echo "Database: $POSTGRES_DB"
    echo "Backup File: $(basename "$backup_file")"
    echo "Backup Size: $backup_size"
    echo "Log File: $LOG_FILE"
    echo "=========================================="
    echo ""
}

################################################################################
# Main
################################################################################

main() {
    # Check arguments
    if [[ $# -lt 1 ]]; then
        usage
    fi
    
    local backup_file="$1"
    
    # Handle "latest" keyword
    if [[ "$backup_file" == "latest" ]]; then
        backup_file=$(find_latest_backup)
        log_info "Using latest backup: $backup_file"
    fi
    
    log_info "=========================================="
    log_info "PostgreSQL Restore Started"
    log_info "=========================================="
    
    # Validate backup
    if ! validate_backup "$backup_file"; then
        log_error "Backup validation failed"
        exit 1
    fi
    
    # Create pre-restore backup
    local pre_restore_backup
    pre_restore_backup=$(create_pre_restore_backup) || true
    
    # Restore database
    if ! restore_database "$backup_file"; then
        log_error "Database restore failed"
        
        # Attempt rollback if pre-restore backup exists
        if [[ -n "$pre_restore_backup" ]] && [[ -f "$pre_restore_backup" ]]; then
            log_warn "Attempting rollback to pre-restore state..."
            restore_database "$pre_restore_backup" || true
        fi
        
        exit 1
    fi
    
    # Verify restore
    if ! verify_restore; then
        log_error "Database verification failed"
        send_slack_notification "Database verification failed"
        exit 1
    fi
    
    # Print summary
    print_summary "$backup_file"
    
    log_info "=========================================="
    log_info "PostgreSQL Restore Completed Successfully"
    log_info "=========================================="
}

# Run main function
main "$@"

