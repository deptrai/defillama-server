#!/usr/bin/env bash

################################################################################
# Docker Volumes Backup Script
# 
# Description: Automated Docker volumes backup with compression and retention
# Author: Augment Agent (Claude Sonnet 4)
# Version: 1.0
# Date: 2025-10-14
#
# Features:
# - Automated tar archive backup
# - Gzip compression
# - Retention policy (7 daily, 4 weekly, 12 monthly)
# - Error handling and logging
# - Slack notifications on failure
#
# Usage: ./backup-volumes.sh
################################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/volumes}"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
LOG_FILE="$LOG_DIR/backup-volumes.log"

# Docker Volumes to backup
VOLUMES=(
    "postgres_data"
    "redis_data"
)

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
            --data "{\"text\":\"🔴 Docker Volumes Backup Failed: $message\"}" \
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
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    
    log_info "Prerequisites check passed"
}

backup_volume() {
    local volume_name="$1"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/${volume_name}_${timestamp}.tar.gz"
    
    log_info "Backing up volume: $volume_name"
    
    # Check if volume exists
    if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
        log_warn "Volume '$volume_name' does not exist, skipping..."
        return 0
    fi
    
    # Create backup using temporary container
    log_info "Creating tar archive..."
    if docker run --rm \
        -v "$volume_name:/volume" \
        -v "$BACKUP_DIR:/backup" \
        alpine \
        tar czf "/backup/$(basename "$backup_file")" -C /volume . 2>>"$LOG_FILE"; then
        
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log_info "Volume backup created: $backup_file ($backup_size)"
        echo "$backup_file"
        return 0
    else
        log_error "Volume backup failed: $volume_name"
        send_slack_notification "Failed to backup volume $volume_name"
        rm -f "$backup_file"
        return 1
    fi
}

verify_backup() {
    local backup_file="$1"
    
    log_info "Verifying backup: $(basename "$backup_file")"
    
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
    
    # Verify tar.gz integrity
    if ! tar tzf "$backup_file" >/dev/null 2>&1; then
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
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$DAILY_RETENTION -delete
    
    # Weekly backups: Keep last 4 weeks (28 days)
    local weekly_retention=$((WEEKLY_RETENTION * 7))
    log_info "Cleaning up weekly backups (keep last $WEEKLY_RETENTION weeks)..."
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$weekly_retention -delete
    
    # Monthly backups: Keep last 12 months (365 days)
    local monthly_retention=$((MONTHLY_RETENTION * 30))
    log_info "Cleaning up monthly backups (keep last $MONTHLY_RETENTION months)..."
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$monthly_retention -delete
    
    # Count remaining backups
    local backup_count=$(find "$BACKUP_DIR" -name "*.tar.gz" -type f | wc -l)
    log_info "Retention policy applied. Remaining backups: $backup_count"
}

print_summary() {
    local backup_files=("$@")
    local total_size=0
    
    echo ""
    echo "=========================================="
    echo "Docker Volumes Backup Summary"
    echo "=========================================="
    
    for backup_file in "${backup_files[@]}"; do
        if [[ -f "$backup_file" ]]; then
            local size=$(du -h "$backup_file" | cut -f1)
            echo "✓ $(basename "$backup_file") - $size"
        fi
    done
    
    local backup_count=$(find "$BACKUP_DIR" -name "*.tar.gz" -type f | wc -l)
    echo ""
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
    log_info "Docker Volumes Backup Started"
    log_info "=========================================="
    
    # Check prerequisites
    check_prerequisites
    
    # Backup all volumes
    local backup_files=()
    local failed_volumes=()
    
    for volume in "${VOLUMES[@]}"; do
        local backup_file
        if backup_file=$(backup_volume "$volume"); then
            if [[ -n "$backup_file" ]] && verify_backup "$backup_file"; then
                backup_files+=("$backup_file")
            else
                failed_volumes+=("$volume")
            fi
        else
            failed_volumes+=("$volume")
        fi
    done
    
    # Apply retention policy
    apply_retention_policy
    
    # Print summary
    print_summary "${backup_files[@]}"
    
    # Check for failures
    if [[ ${#failed_volumes[@]} -gt 0 ]]; then
        log_error "Some volumes failed to backup: ${failed_volumes[*]}"
        send_slack_notification "Failed volumes: ${failed_volumes[*]}"
        exit 1
    fi
    
    log_info "=========================================="
    log_info "Docker Volumes Backup Completed Successfully"
    log_info "=========================================="
}

# Run main function
main "$@"

