#!/usr/bin/env bash

################################################################################
# Docker Volumes Restore Script
# 
# Description: Restore Docker volumes from tar.gz backups
# Author: Augment Agent (Claude Sonnet 4)
# Version: 1.0
# Date: 2025-10-14
#
# Usage: ./restore-volumes.sh <volume_name> <backup_file|latest>
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/volumes}"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
LOG_FILE="$LOG_DIR/restore-volumes.log"

SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
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

send_slack_notification() {
    [[ -n "$SLACK_WEBHOOK_URL" ]] && curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🔴 Volume Restore Failed: $1\"}" "$SLACK_WEBHOOK_URL" 2>/dev/null || true
}

find_latest_backup() {
    local volume_name="$1"
    local latest=$(find "$BACKUP_DIR" -name "${volume_name}_*.tar.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    [[ -z "$latest" ]] && { log_error "No backup files found for volume: $volume_name"; exit 1; }
    echo "$latest"
}

validate_backup() {
    local backup_file="$1"
    [[ ! -f "$backup_file" ]] && { log_error "Backup file not found: $backup_file"; return 1; }
    [[ ! -s "$backup_file" ]] && { log_error "Backup file is empty"; return 1; }
    tar tzf "$backup_file" >/dev/null 2>&1 || { log_error "Backup file is corrupted"; return 1; }
    log_info "Backup validation passed"
    return 0
}

restore_volume() {
    local volume_name="$1"
    local backup_file="$2"
    
    log_info "Starting volume restore: $volume_name"
    
    # Check if volume exists
    if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
        log_info "Creating volume: $volume_name"
        docker volume create "$volume_name" 2>>"$LOG_FILE"
    fi
    
    # Restore volume from backup
    log_info "Restoring volume from backup..."
    if docker run --rm \
        -v "$volume_name:/volume" \
        -v "$BACKUP_DIR:/backup" \
        alpine \
        sh -c "cd /volume && tar xzf /backup/$(basename "$backup_file")" 2>>"$LOG_FILE"; then
        
        log_info "Volume restore completed"
        return 0
    else
        log_error "Volume restore failed"
        send_slack_notification "Failed to restore volume $volume_name"
        return 1
    fi
}

verify_restore() {
    local volume_name="$1"
    
    log_info "Verifying volume restore..."
    
    # Check if volume exists
    if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
        log_error "Volume does not exist after restore"
        return 1
    fi
    
    # Count files in volume
    local file_count=$(docker run --rm -v "$volume_name:/volume" alpine find /volume -type f | wc -l)
    log_info "Files found: $file_count"
    
    log_info "Volume verification passed"
    return 0
}

main() {
    [[ $# -lt 2 ]] && { echo "Usage: $0 <volume_name> <backup_file|latest>"; exit 1; }
    
    local volume_name="$1"
    local backup_file="$2"
    
    [[ "$backup_file" == "latest" ]] && backup_file=$(find_latest_backup "$volume_name")
    
    log_info "=========================================="
    log_info "Volume Restore Started: $volume_name"
    log_info "=========================================="
    
    mkdir -p "$LOG_DIR"
    
    validate_backup "$backup_file" || exit 1
    restore_volume "$volume_name" "$backup_file" || exit 1
    verify_restore "$volume_name" || exit 1
    
    echo ""
    echo "=========================================="
    echo "Volume Restore Summary"
    echo "=========================================="
    echo "Volume: $volume_name"
    echo "Backup File: $(basename "$backup_file")"
    echo "Backup Size: $(du -h "$backup_file" | cut -f1)"
    echo "Log File: $LOG_FILE"
    echo "=========================================="
    echo ""
    
    log_info "=========================================="
    log_info "Volume Restore Completed Successfully"
    log_info "=========================================="
}

main "$@"

