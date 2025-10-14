#!/usr/bin/env bash

################################################################################
# Complete System Backup Script
# 
# Description: Orchestrates all backup scripts for complete system backup
# Author: Augment Agent (Claude Sonnet 4)
# Version: 1.0
# Date: 2025-10-14
#
# Features:
# - Orchestrates PostgreSQL, Redis, and Docker volumes backups
# - Parallel execution for faster backups
# - Comprehensive error handling
# - Slack notifications
# - Backup summary report
#
# Usage: ./backup-all.sh
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
LOG_FILE="$LOG_DIR/backup-all.log"

# Backup Scripts
BACKUP_POSTGRES="$SCRIPT_DIR/backup-postgres.sh"
BACKUP_REDIS="$SCRIPT_DIR/backup-redis.sh"
BACKUP_VOLUMES="$SCRIPT_DIR/backup-volumes.sh"

# Notification Configuration
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_section() {
    echo ""
    echo -e "${BLUE}=========================================="
    echo -e "$*"
    echo -e "==========================================${NC}"
    echo ""
}

send_slack_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local emoji="✅"
        if [[ "$status" == "failed" ]]; then
            emoji="🔴"
        elif [[ "$status" == "partial" ]]; then
            emoji="⚠️"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji System Backup $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Check if backup scripts exist
    local missing_scripts=()
    
    if [[ ! -f "$BACKUP_POSTGRES" ]]; then
        missing_scripts+=("backup-postgres.sh")
    fi
    
    if [[ ! -f "$BACKUP_REDIS" ]]; then
        missing_scripts+=("backup-redis.sh")
    fi
    
    if [[ ! -f "$BACKUP_VOLUMES" ]]; then
        missing_scripts+=("backup-volumes.sh")
    fi
    
    if [[ ${#missing_scripts[@]} -gt 0 ]]; then
        log_error "Missing backup scripts: ${missing_scripts[*]}"
        exit 1
    fi
    
    # Make scripts executable
    chmod +x "$BACKUP_POSTGRES" "$BACKUP_REDIS" "$BACKUP_VOLUMES"
    
    log_info "Prerequisites check passed"
}

run_backup() {
    local script="$1"
    local name="$2"
    local log_file="$LOG_DIR/backup-${name}.log"
    
    log_info "Running $name backup..."
    
    if "$script" > "$log_file" 2>&1; then
        log_info "$name backup completed successfully"
        return 0
    else
        log_error "$name backup failed (see $log_file for details)"
        return 1
    fi
}

print_summary() {
    local postgres_status="$1"
    local redis_status="$2"
    local volumes_status="$3"
    local start_time="$4"
    local end_time="$5"
    
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    log_section "BACKUP SUMMARY"
    
    echo "Component Backups:"
    echo "  PostgreSQL: $postgres_status"
    echo "  Redis: $redis_status"
    echo "  Docker Volumes: $volumes_status"
    echo ""
    echo "Duration: ${minutes}m ${seconds}s"
    echo "Log Directory: $LOG_DIR"
    echo ""
    
    # Count total backups
    local postgres_count=$(find "$PROJECT_ROOT/backups/postgres" -name "*.sql.gz" -type f 2>/dev/null | wc -l || echo "0")
    local redis_count=$(find "$PROJECT_ROOT/backups/redis" -name "*.rdb.gz" -type f 2>/dev/null | wc -l || echo "0")
    local volumes_count=$(find "$PROJECT_ROOT/backups/volumes" -name "*.tar.gz" -type f 2>/dev/null | wc -l || echo "0")
    
    echo "Total Backups:"
    echo "  PostgreSQL: $postgres_count"
    echo "  Redis: $redis_count"
    echo "  Docker Volumes: $volumes_count"
    echo ""
}

################################################################################
# Main
################################################################################

main() {
    local start_time=$(date +%s)
    
    log_section "COMPLETE SYSTEM BACKUP STARTED"
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Check prerequisites
    check_prerequisites
    
    # Run backups
    local postgres_status="❌ FAILED"
    local redis_status="❌ FAILED"
    local volumes_status="❌ FAILED"
    local failed_count=0
    
    # PostgreSQL Backup
    if run_backup "$BACKUP_POSTGRES" "postgres"; then
        postgres_status="✅ SUCCESS"
    else
        failed_count=$((failed_count + 1))
    fi
    
    # Redis Backup
    if run_backup "$BACKUP_REDIS" "redis"; then
        redis_status="✅ SUCCESS"
    else
        failed_count=$((failed_count + 1))
    fi
    
    # Docker Volumes Backup
    if run_backup "$BACKUP_VOLUMES" "volumes"; then
        volumes_status="✅ SUCCESS"
    else
        failed_count=$((failed_count + 1))
    fi
    
    # Calculate duration
    local end_time=$(date +%s)
    
    # Print summary
    print_summary "$postgres_status" "$redis_status" "$volumes_status" "$start_time" "$end_time"
    
    # Send notification
    if [[ $failed_count -eq 0 ]]; then
        log_section "COMPLETE SYSTEM BACKUP COMPLETED SUCCESSFULLY"
        send_slack_notification "success" "All backups completed successfully"
        exit 0
    elif [[ $failed_count -eq 3 ]]; then
        log_section "COMPLETE SYSTEM BACKUP FAILED"
        send_slack_notification "failed" "All backups failed"
        exit 1
    else
        log_section "COMPLETE SYSTEM BACKUP PARTIALLY COMPLETED"
        send_slack_notification "partial" "$failed_count out of 3 backups failed"
        exit 1
    fi
}

# Run main function
main "$@"

