#!/bin/bash

# DeFiLlama Cost Report Script
# This script generates a cost report for AWS resources

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_section() {
    echo -e "${BLUE}[====]${NC} $1"
}

# Check if stage is provided
if [ -z "$1" ]; then
    log_error "Usage: ./cost-report.sh <stage> [--days <days>]"
    log_info "Stages: dev, staging, prod, all"
    log_info "Options:"
    log_info "  --days <days>   Number of days to analyze (default: 30)"
    exit 1
fi

STAGE=$1
DAYS=30

# Parse options
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --days)
            DAYS=$2
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod|all)$ ]]; then
    log_error "Invalid stage: $STAGE"
    log_info "Valid stages: dev, staging, prod, all"
    exit 1
fi

log_info "Generating cost report for $STAGE environment"
log_info "Period: Last $DAYS days"

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured"
    log_info "Run: aws configure"
    exit 1
fi

# Calculate date range
END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -d "$DAYS days ago" +%Y-%m-%d 2>/dev/null || date -v-${DAYS}d +%Y-%m-%d)

log_info "Date range: $START_DATE to $END_DATE"
log_info ""

# Function to get cost for a service
get_service_cost() {
    local service=$1
    local filter=$2
    
    aws ce get-cost-and-usage \
        --time-period Start=$START_DATE,End=$END_DATE \
        --granularity MONTHLY \
        --metrics "UnblendedCost" \
        --filter "$filter" \
        --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
        --output text 2>/dev/null || echo "0"
}

# Lambda costs
log_section "Lambda Costs"
LAMBDA_FILTER='{"Dimensions":{"Key":"SERVICE","Values":["AWS Lambda"]}}'
if [ "$STAGE" != "all" ]; then
    LAMBDA_FILTER='{"And":[{"Dimensions":{"Key":"SERVICE","Values":["AWS Lambda"]}},{"Tags":{"Key":"Environment","Values":["'$STAGE'"]}}]}'
fi
LAMBDA_COST=$(get_service_cost "Lambda" "$LAMBDA_FILTER")
log_info "Lambda: \$$LAMBDA_COST"

# API Gateway costs
log_section "API Gateway Costs"
APIGW_FILTER='{"Dimensions":{"Key":"SERVICE","Values":["Amazon API Gateway"]}}'
if [ "$STAGE" != "all" ]; then
    APIGW_FILTER='{"And":[{"Dimensions":{"Key":"SERVICE","Values":["Amazon API Gateway"]}},{"Tags":{"Key":"Environment","Values":["'$STAGE'"]}}]}'
fi
APIGW_COST=$(get_service_cost "API Gateway" "$APIGW_FILTER")
log_info "API Gateway: \$$APIGW_COST"

# DynamoDB costs
log_section "DynamoDB Costs"
DYNAMODB_FILTER='{"Dimensions":{"Key":"SERVICE","Values":["Amazon DynamoDB"]}}'
if [ "$STAGE" != "all" ]; then
    DYNAMODB_FILTER='{"And":[{"Dimensions":{"Key":"SERVICE","Values":["Amazon DynamoDB"]}},{"Tags":{"Key":"Environment","Values":["'$STAGE'"]}}]}'
fi
DYNAMODB_COST=$(get_service_cost "DynamoDB" "$DYNAMODB_FILTER")
log_info "DynamoDB: \$$DYNAMODB_COST"

# ElastiCache (Redis) costs
log_section "ElastiCache (Redis) Costs"
REDIS_FILTER='{"Dimensions":{"Key":"SERVICE","Values":["Amazon ElastiCache"]}}'
if [ "$STAGE" != "all" ]; then
    REDIS_FILTER='{"And":[{"Dimensions":{"Key":"SERVICE","Values":["Amazon ElastiCache"]}},{"Tags":{"Key":"Environment","Values":["'$STAGE'"]}}]}'
fi
REDIS_COST=$(get_service_cost "ElastiCache" "$REDIS_FILTER")
log_info "ElastiCache: \$$REDIS_COST"

# RDS costs
log_section "RDS Costs"
RDS_FILTER='{"Dimensions":{"Key":"SERVICE","Values":["Amazon Relational Database Service"]}}'
if [ "$STAGE" != "all" ]; then
    RDS_FILTER='{"And":[{"Dimensions":{"Key":"SERVICE","Values":["Amazon Relational Database Service"]}},{"Tags":{"Key":"Environment","Values":["'$STAGE'"]}}]}'
fi
RDS_COST=$(get_service_cost "RDS" "$RDS_FILTER")
log_info "RDS: \$$RDS_COST"

# S3 costs
log_section "S3 Costs"
S3_FILTER='{"Dimensions":{"Key":"SERVICE","Values":["Amazon Simple Storage Service"]}}'
if [ "$STAGE" != "all" ]; then
    S3_FILTER='{"And":[{"Dimensions":{"Key":"SERVICE","Values":["Amazon Simple Storage Service"]}},{"Tags":{"Key":"Environment","Values":["'$STAGE'"]}}]}'
fi
S3_COST=$(get_service_cost "S3" "$S3_FILTER")
log_info "S3: \$$S3_COST"

# CloudWatch costs
log_section "CloudWatch Costs"
CW_FILTER='{"Dimensions":{"Key":"SERVICE","Values":["Amazon CloudWatch"]}}'
if [ "$STAGE" != "all" ]; then
    CW_FILTER='{"And":[{"Dimensions":{"Key":"SERVICE","Values":["Amazon CloudWatch"]}},{"Tags":{"Key":"Environment","Values":["'$STAGE'"]}}]}'
fi
CW_COST=$(get_service_cost "CloudWatch" "$CW_FILTER")
log_info "CloudWatch: \$$CW_COST"

# VPC costs (NAT Gateway, VPC Endpoints)
log_section "VPC Costs"
VPC_FILTER='{"Dimensions":{"Key":"SERVICE","Values":["Amazon Virtual Private Cloud"]}}'
if [ "$STAGE" != "all" ]; then
    VPC_FILTER='{"And":[{"Dimensions":{"Key":"SERVICE","Values":["Amazon Virtual Private Cloud"]}},{"Tags":{"Key":"Environment","Values":["'$STAGE'"]}}]}'
fi
VPC_COST=$(get_service_cost "VPC" "$VPC_FILTER")
log_info "VPC: \$$VPC_COST"

# Calculate total
TOTAL_COST=$(echo "$LAMBDA_COST + $APIGW_COST + $DYNAMODB_COST + $REDIS_COST + $RDS_COST + $S3_COST + $CW_COST + $VPC_COST" | bc)

# Summary
log_info ""
log_section "Cost Summary"
log_info "Stage: $STAGE"
log_info "Period: $START_DATE to $END_DATE ($DAYS days)"
log_info ""
log_info "Service Breakdown:"
log_info "  Lambda:        \$$LAMBDA_COST"
log_info "  API Gateway:   \$$APIGW_COST"
log_info "  DynamoDB:      \$$DYNAMODB_COST"
log_info "  ElastiCache:   \$$REDIS_COST"
log_info "  RDS:           \$$RDS_COST"
log_info "  S3:            \$$S3_COST"
log_info "  CloudWatch:    \$$CW_COST"
log_info "  VPC:           \$$VPC_COST"
log_info "  ─────────────────────"
log_info "  Total:         \$$TOTAL_COST"
log_info ""

# Cost optimization recommendations
log_section "Cost Optimization Recommendations"

# Check Lambda costs
if (( $(echo "$LAMBDA_COST > 100" | bc -l) )); then
    log_warn "Lambda costs are high. Consider:"
    log_warn "  - Optimize function memory allocation"
    log_warn "  - Reduce function execution time"
    log_warn "  - Use provisioned concurrency only for hot functions"
fi

# Check DynamoDB costs
if (( $(echo "$DYNAMODB_COST > 50" | bc -l) )); then
    log_warn "DynamoDB costs are high. Consider:"
    log_warn "  - Use on-demand pricing for unpredictable workloads"
    log_warn "  - Enable auto-scaling for provisioned capacity"
    log_warn "  - Archive old data to S3"
fi

# Check Redis costs
if (( $(echo "$REDIS_COST > 100" | bc -l) )); then
    log_warn "ElastiCache costs are high. Consider:"
    log_warn "  - Right-size instance types"
    log_warn "  - Use reserved instances for production"
    log_warn "  - Optimize cache hit rate"
fi

# Check VPC costs
if (( $(echo "$VPC_COST > 50" | bc -l) )); then
    log_warn "VPC costs are high. Consider:"
    log_warn "  - Use VPC endpoints to reduce NAT Gateway costs"
    log_warn "  - Consolidate NAT Gateways across AZs"
    log_warn "  - Review data transfer patterns"
fi

log_info ""
log_info "Cost report completed! ✓"

