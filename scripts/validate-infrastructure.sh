#!/bin/bash

# DeFiLlama Infrastructure Validation Script
# This script validates infrastructure components after deployment

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

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_fail() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if stage is provided
if [ -z "$1" ]; then
    log_error "Usage: ./validate-infrastructure.sh <stage>"
    log_info "Stages: dev, staging, prod"
    exit 1
fi

STAGE=$1
REGION=${AWS_REGION:-eu-central-1}
VALIDATION_RESULTS=()
FAILED_CHECKS=0

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid stage: $STAGE"
    log_info "Valid stages: dev, staging, prod"
    exit 1
fi

log_info "Validating infrastructure for $STAGE environment in $REGION"
log_info ""

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured"
    log_info "Run: aws configure"
    exit 1
fi

# 1. Validate VPC
log_info "1. Validating VPC..."
VPC_ID=$(aws ec2 describe-vpcs --region $REGION --filters "Name=tag:Name,Values=defillama-vpc-$STAGE" --query 'Vpcs[0].VpcId' --output text 2>/dev/null || echo "")

if [ ! -z "$VPC_ID" ] && [ "$VPC_ID" != "None" ]; then
    log_success "VPC found: $VPC_ID"
    VALIDATION_RESULTS+=("VPC: PASS")
    
    # Check subnets
    SUBNET_COUNT=$(aws ec2 describe-subnets --region $REGION --filters "Name=vpc-id,Values=$VPC_ID" --query 'length(Subnets)' --output text 2>/dev/null || echo "0")
    if [ "$SUBNET_COUNT" -ge 4 ]; then
        log_success "Subnets found: $SUBNET_COUNT (expected: 4)"
        VALIDATION_RESULTS+=("Subnets: PASS")
    else
        log_fail "Subnets found: $SUBNET_COUNT (expected: 4)"
        VALIDATION_RESULTS+=("Subnets: FAIL")
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
else
    log_warn "VPC not found (may not be deployed yet)"
    VALIDATION_RESULTS+=("VPC: SKIP")
fi

# 2. Validate Security Groups
log_info "2. Validating Security Groups..."
SG_COUNT=$(aws ec2 describe-security-groups --region $REGION --filters "Name=tag:Environment,Values=$STAGE" --query 'length(SecurityGroups)' --output text 2>/dev/null || echo "0")

if [ "$SG_COUNT" -gt 0 ]; then
    log_success "Security Groups found: $SG_COUNT"
    VALIDATION_RESULTS+=("Security Groups: PASS")
else
    log_warn "Security Groups not found (may not be deployed yet)"
    VALIDATION_RESULTS+=("Security Groups: SKIP")
fi

# 3. Validate Lambda Functions
log_info "3. Validating Lambda Functions..."
LAMBDA_FUNCTIONS=$(aws lambda list-functions --region $REGION --query "Functions[?starts_with(FunctionName, 'defillama-$STAGE')].FunctionName" --output text 2>/dev/null || echo "")

if [ ! -z "$LAMBDA_FUNCTIONS" ]; then
    LAMBDA_COUNT=$(echo "$LAMBDA_FUNCTIONS" | wc -w)
    log_success "Lambda Functions found: $LAMBDA_COUNT"
    VALIDATION_RESULTS+=("Lambda Functions: PASS")
    
    # Check each Lambda function
    for func in $LAMBDA_FUNCTIONS; do
        # Check if function is active
        STATE=$(aws lambda get-function --function-name $func --region $REGION --query 'Configuration.State' --output text 2>/dev/null || echo "")
        if [ "$STATE" = "Active" ]; then
            log_success "  - $func: Active"
        else
            log_fail "  - $func: $STATE"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    done
else
    log_fail "Lambda Functions not found"
    VALIDATION_RESULTS+=("Lambda Functions: FAIL")
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 4. Validate API Gateway
log_info "4. Validating API Gateway..."
API_COUNT=$(aws apigatewayv2 get-apis --region $REGION --query "length(Items[?contains(Name, 'defillama-$STAGE')])" --output text 2>/dev/null || echo "0")

if [ "$API_COUNT" -gt 0 ]; then
    log_success "API Gateway found: $API_COUNT API(s)"
    VALIDATION_RESULTS+=("API Gateway: PASS")
else
    log_fail "API Gateway not found"
    VALIDATION_RESULTS+=("API Gateway: FAIL")
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 5. Validate DynamoDB Table
log_info "5. Validating DynamoDB Table..."
TABLE_NAME="prod-table"  # Adjust based on your table name
TABLE_STATUS=$(aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION --query 'Table.TableStatus' --output text 2>/dev/null || echo "")

if [ "$TABLE_STATUS" = "ACTIVE" ]; then
    log_success "DynamoDB Table: $TABLE_NAME (Active)"
    VALIDATION_RESULTS+=("DynamoDB: PASS")
else
    log_warn "DynamoDB Table not found or not active"
    VALIDATION_RESULTS+=("DynamoDB: SKIP")
fi

# 6. Validate ElastiCache (Redis)
log_info "6. Validating ElastiCache (Redis)..."
REDIS_CLUSTER=$(aws elasticache describe-replication-groups --region $REGION --query "ReplicationGroups[?contains(ReplicationGroupId, 'defillama-redis-$STAGE')].ReplicationGroupId" --output text 2>/dev/null || echo "")

if [ ! -z "$REDIS_CLUSTER" ]; then
    REDIS_STATUS=$(aws elasticache describe-replication-groups --replication-group-id $REDIS_CLUSTER --region $REGION --query 'ReplicationGroups[0].Status' --output text 2>/dev/null || echo "")
    if [ "$REDIS_STATUS" = "available" ]; then
        log_success "Redis Cluster: $REDIS_CLUSTER (Available)"
        VALIDATION_RESULTS+=("Redis: PASS")
    else
        log_fail "Redis Cluster: $REDIS_CLUSTER ($REDIS_STATUS)"
        VALIDATION_RESULTS+=("Redis: FAIL")
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
else
    log_warn "Redis Cluster not found (may not be deployed yet)"
    VALIDATION_RESULTS+=("Redis: SKIP")
fi

# 7. Validate SQS Queues
log_info "7. Validating SQS Queues..."
SQS_QUEUES=$(aws sqs list-queues --region $REGION --queue-name-prefix "defillama-$STAGE" --query 'QueueUrls' --output text 2>/dev/null || echo "")

if [ ! -z "$SQS_QUEUES" ]; then
    SQS_COUNT=$(echo "$SQS_QUEUES" | wc -w)
    log_success "SQS Queues found: $SQS_COUNT"
    VALIDATION_RESULTS+=("SQS Queues: PASS")
else
    log_warn "SQS Queues not found (may not be deployed yet)"
    VALIDATION_RESULTS+=("SQS Queues: SKIP")
fi

# 8. Validate CloudWatch Alarms
log_info "8. Validating CloudWatch Alarms..."
ALARM_COUNT=$(aws cloudwatch describe-alarms --region $REGION --alarm-name-prefix "defillama-$STAGE" --query 'length(MetricAlarms)' --output text 2>/dev/null || echo "0")

if [ "$ALARM_COUNT" -gt 0 ]; then
    log_success "CloudWatch Alarms found: $ALARM_COUNT"
    VALIDATION_RESULTS+=("CloudWatch Alarms: PASS")
else
    log_warn "CloudWatch Alarms not found (may not be deployed yet)"
    VALIDATION_RESULTS+=("CloudWatch Alarms: SKIP")
fi

# 9. Validate CloudWatch Dashboards
log_info "9. Validating CloudWatch Dashboards..."
DASHBOARD_COUNT=$(aws cloudwatch list-dashboards --region $REGION --dashboard-name-prefix "defillama-$STAGE" --query 'length(DashboardEntries)' --output text 2>/dev/null || echo "0")

if [ "$DASHBOARD_COUNT" -gt 0 ]; then
    log_success "CloudWatch Dashboards found: $DASHBOARD_COUNT"
    VALIDATION_RESULTS+=("CloudWatch Dashboards: PASS")
else
    log_warn "CloudWatch Dashboards not found (may not be deployed yet)"
    VALIDATION_RESULTS+=("CloudWatch Dashboards: SKIP")
fi

# 10. Validate X-Ray Tracing
log_info "10. Validating X-Ray Tracing..."
XRAY_GROUPS=$(aws xray get-groups --region $REGION --query "Groups[?contains(GroupName, 'defillama-$STAGE')].GroupName" --output text 2>/dev/null || echo "")

if [ ! -z "$XRAY_GROUPS" ]; then
    XRAY_COUNT=$(echo "$XRAY_GROUPS" | wc -w)
    log_success "X-Ray Groups found: $XRAY_COUNT"
    VALIDATION_RESULTS+=("X-Ray: PASS")
else
    log_warn "X-Ray Groups not found (may not be deployed yet)"
    VALIDATION_RESULTS+=("X-Ray: SKIP")
fi

# Summary
log_info ""
log_info "========================================="
log_info "Validation Summary"
log_info "========================================="
log_info "Stage: $STAGE"
log_info "Region: $REGION"
log_info ""
log_info "Results:"
for result in "${VALIDATION_RESULTS[@]}"; do
    if [[ "$result" == *"PASS"* ]]; then
        log_success "  $result"
    elif [[ "$result" == *"FAIL"* ]]; then
        log_fail "  $result"
    else
        log_warn "  $result"
    fi
done

log_info ""
if [ $FAILED_CHECKS -eq 0 ]; then
    log_success "All critical checks passed! ✓"
    exit 0
else
    log_error "$FAILED_CHECKS check(s) failed"
    exit 1
fi

