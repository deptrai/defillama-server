#!/usr/bin/env bash

################################################################################
# Redis Restore Script
# 
# Description: Restore Redis database from RDB backup
# Author: Augment Agent (Claude Sonnet 4)
# Version: 1.0
# Date: 2025-10-14
#
# Usage: ./restore-redis.sh <backup_file|latest>
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/redis}"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
LOG_FILE="$LOG_DIR/restore-redis.log"

REDIS_CONTAINER="${REDIS_CONTAINER:-defillama-redis}"
REDIS_DATA_DIR="/data"
REDIS_RDB_FILE="dump.rdb"

SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
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
        --data "{\"text\":\"🔴 Redis Restore Failed: $1\"}" "$SLACK_WEBHOOK_URL" 2>/dev/null || true
}

find_latest_backup() {
    local latest=$(find "$BACKUP_DIR" -name "redis_*.rdb.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    [[ -z "$latest" ]] && { log_error "No backup files found"; exit 1; }
    echo "$latest"
}

validate_backup() {
    local backup_file="$1"
    [[ ! -f "$backup_file" ]] && { log_error "Backup file not found: $backup_file"; return 1; }
    [[ ! -s "$backup_file" ]] && { log_error "Backup file is empty"; return 1; }
    gzip -t "$backup_file" 2>/dev/null || { log_error "Backup file is corrupted"; return 1; }
    log_info "Backup validation passed"
    return 0
}

restore_redis() {
    local backup_file="$1"
    
    log_info "Starting Redis restore..."
    
    # Stop Redis
    log_info "Stopping Redis container..."
    docker stop "$REDIS_CONTAINER" 2>>"$LOG_FILE"
    
    # Restore RDB file
    log_info "Restoring RDB file..."
    gunzip -c "$backup_file" | docker run --rm -i \
        -v "$(docker volume inspect redis_data --format '{{.Mountpoint}}'):/data" \
        alpine sh -c "cat > /data/$REDIS_RDB_FILE" 2>>"$LOG_FILE"
    
    # Start Redis
    log_info "Starting Redis container..."
    docker start "$REDIS_CONTAINER" 2>>"$LOG_FILE"
    
    # Wait for Redis to be ready
    log_info "Waiting for Redis to be ready..."
    local max_wait=30
    local waited=0
    while [[ $waited -lt $max_wait ]]; do
        if docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null | grep -q "PONG"; then
            log_info "Redis is ready"
            return 0
        fi
        sleep 1
        waited=$((waited + 1))
    done
    
    log_error "Redis failed to start"
    send_slack_notification "Redis failed to start after restore"
    return 1
}

verify_restore() {
    log_info "Verifying Redis restore..."
    
    # Check if Redis is running
    if ! docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_error "Redis is not responding"
        return 1
    fi
    
    # Get key count
    local key_count=$(docker exec "$REDIS_CONTAINER" redis-cli DBSIZE 2>/dev/null | grep -oE '[0-9]+' || echo "0")
    log_info "Keys found: $key_count"
    
    log_info "Redis verification passed"
    return 0
}

main() {
    [[ $# -lt 1 ]] && { echo "Usage: $0 <backup_file|latest>"; exit 1; }
    
    local backup_file="$1"
    [[ "$backup_file" == "latest" ]] && backup_file=$(find_latest_backup)
    
    log_info "=========================================="
    log_info "Redis Restore Started"
    log_info "=========================================="
    
    mkdir -p "$LOG_DIR"
    
    validate_backup "$backup_file" || exit 1
    restore_redis "$backup_file" || exit 1
    verify_restore || exit 1
    
    echo ""
    echo "=========================================="
    echo "Redis Restore Summary"
    echo "=========================================="
    echo "Backup File: $(basename "$backup_file")"
    echo "Backup Size: $(du -h "$backup_file" | cut -f1)"
    echo "Log File: $LOG_FILE"
    echo "=========================================="
    echo ""
    
    log_info "=========================================="
    log_info "Redis Restore Completed Successfully"
    log_info "=========================================="
}

main "$@"

