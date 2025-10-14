#!/usr/bin/env bash

################################################################################
# Complete System Restore Script
# 
# Description: Orchestrates all restore scripts for complete system recovery
# Author: Augment Agent (Claude Sonnet 4)
# Version: 1.0
# Date: 2025-10-14
#
# Usage: ./restore-all.sh [postgres_backup] [redis_backup] [volumes_backup]
#        ./restore-all.sh latest  # Restore all from latest backups
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
LOG_FILE="$LOG_DIR/restore-all.log"

RESTORE_POSTGRES="$SCRIPT_DIR/restore-postgres.sh"
RESTORE_REDIS="$SCRIPT_DIR/restore-redis.sh"
RESTORE_VOLUMES="$SCRIPT_DIR/restore-volumes.sh"

SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$1] ${*:2}" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "$@"
    echo -e "${GREEN}[INFO]${NC} $*"
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
        [[ "$status" == "failed" ]] && emoji="🔴"
        [[ "$status" == "partial" ]] && emoji="⚠️"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji System Restore $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    mkdir -p "$LOG_DIR"
    
    local missing_scripts=()
    [[ ! -f "$RESTORE_POSTGRES" ]] && missing_scripts+=("restore-postgres.sh")
    [[ ! -f "$RESTORE_REDIS" ]] && missing_scripts+=("restore-redis.sh")
    [[ ! -f "$RESTORE_VOLUMES" ]] && missing_scripts+=("restore-volumes.sh")
    
    if [[ ${#missing_scripts[@]} -gt 0 ]]; then
        log_error "Missing restore scripts: ${missing_scripts[*]}"
        exit 1
    fi
    
    chmod +x "$RESTORE_POSTGRES" "$RESTORE_REDIS" "$RESTORE_VOLUMES"
    log_info "Prerequisites check passed"
}

run_restore() {
    local script="$1"
    local name="$2"
    shift 2
    local args=("$@")
    local log_file="$LOG_DIR/restore-${name}.log"
    
    log_info "Running $name restore..."
    
    if "$script" "${args[@]}" > "$log_file" 2>&1; then
        log_info "$name restore completed successfully"
        return 0
    else
        log_error "$name restore failed (see $log_file for details)"
        return 1
    fi
}

main() {
    local start_time=$(date +%s)
    
    log_section "COMPLETE SYSTEM RESTORE STARTED"
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Parse arguments
    local postgres_backup="${1:-latest}"
    local redis_backup="${2:-latest}"
    local volumes_backup="${3:-latest}"
    
    log_info "PostgreSQL backup: $postgres_backup"
    log_info "Redis backup: $redis_backup"
    log_info "Volumes backup: $volumes_backup"
    
    # Check prerequisites
    check_prerequisites
    
    # Run restores
    local postgres_status="❌ FAILED"
    local redis_status="❌ FAILED"
    local volumes_status="❌ FAILED"
    local failed_count=0
    
    # PostgreSQL Restore
    if run_restore "$RESTORE_POSTGRES" "postgres" "$postgres_backup"; then
        postgres_status="✅ SUCCESS"
    else
        failed_count=$((failed_count + 1))
    fi
    
    # Redis Restore
    if run_restore "$RESTORE_REDIS" "redis" "$redis_backup"; then
        redis_status="✅ SUCCESS"
    else
        failed_count=$((failed_count + 1))
    fi
    
    # Docker Volumes Restore (postgres_data and redis_data)
    if run_restore "$RESTORE_VOLUMES" "volumes-postgres" "postgres_data" "$volumes_backup" && \
       run_restore "$RESTORE_VOLUMES" "volumes-redis" "redis_data" "$volumes_backup"; then
        volumes_status="✅ SUCCESS"
    else
        failed_count=$((failed_count + 1))
    fi
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    # Print summary
    log_section "RESTORE SUMMARY"
    echo "Component Restores:"
    echo "  PostgreSQL: $postgres_status"
    echo "  Redis: $redis_status"
    echo "  Docker Volumes: $volumes_status"
    echo ""
    echo "Duration: ${minutes}m ${seconds}s"
    echo "Log Directory: $LOG_DIR"
    echo ""
    
    # Send notification
    if [[ $failed_count -eq 0 ]]; then
        log_section "COMPLETE SYSTEM RESTORE COMPLETED SUCCESSFULLY"
        send_slack_notification "success" "All restores completed successfully"
        exit 0
    elif [[ $failed_count -eq 3 ]]; then
        log_section "COMPLETE SYSTEM RESTORE FAILED"
        send_slack_notification "failed" "All restores failed"
        exit 1
    else
        log_section "COMPLETE SYSTEM RESTORE PARTIALLY COMPLETED"
        send_slack_notification "partial" "$failed_count out of 3 restores failed"
        exit 1
    fi
}

main "$@"

