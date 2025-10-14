#!/bin/bash

# DeFiLlama Rollback Script
# This script rolls back the application to a previous version

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if stage is provided
if [ -z "$1" ]; then
    log_error "Usage: ./rollback.sh <stage> [version]"
    log_info "Stages: dev, staging, prod"
    log_info "Version: Optional Lambda version number (default: previous version)"
    exit 1
fi

STAGE=$1
VERSION=$2

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid stage: $STAGE"
    log_info "Valid stages: dev, staging, prod"
    exit 1
fi

log_info "Starting rollback for $STAGE environment"

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured"
    log_info "Run: aws configure"
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_info "AWS Account ID: $AWS_ACCOUNT_ID"

# Get list of Lambda functions
log_info "Getting Lambda functions..."
FUNCTIONS=$(aws lambda list-functions --region eu-central-1 --query "Functions[?starts_with(FunctionName, 'defillama-$STAGE')].FunctionName" --output text)

if [ -z "$FUNCTIONS" ]; then
    log_error "No Lambda functions found for stage: $STAGE"
    exit 1
fi

log_info "Found Lambda functions:"
for func in $FUNCTIONS; do
    log_info "  - $func"
done

# If version not specified, get previous version
if [ -z "$VERSION" ]; then
    log_info "Getting previous version..."
    
    # Get current version from prod alias
    CURRENT_VERSION=$(aws lambda get-alias --function-name "defillama-$STAGE-websocketConnect" --name prod --region eu-central-1 --query 'FunctionVersion' --output text 2>/dev/null || echo "")
    
    if [ -z "$CURRENT_VERSION" ] || [ "$CURRENT_VERSION" = "\$LATEST" ]; then
        log_error "Cannot determine current version"
        log_info "Please specify version manually: ./rollback.sh $STAGE <version>"
        exit 1
    fi
    
    # Get previous version (current - 1)
    VERSION=$((CURRENT_VERSION - 1))
    
    if [ $VERSION -lt 1 ]; then
        log_error "No previous version available"
        exit 1
    fi
    
    log_info "Current version: $CURRENT_VERSION"
    log_info "Rolling back to version: $VERSION"
else
    log_info "Rolling back to specified version: $VERSION"
fi

# Confirm rollback
log_warn "This will rollback all Lambda functions to version $VERSION"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Rollback cancelled"
    exit 0
fi

# Rollback each Lambda function
log_info "Rolling back Lambda functions..."
FAILED_FUNCTIONS=()

for func in $FUNCTIONS; do
    log_info "Rolling back $func to version $VERSION..."
    
    # Check if version exists
    if ! aws lambda get-function --function-name $func --qualifier $VERSION --region eu-central-1 &> /dev/null; then
        log_warn "Version $VERSION not found for $func, skipping..."
        FAILED_FUNCTIONS+=("$func")
        continue
    fi
    
    # Update prod alias to point to rollback version
    if aws lambda update-alias --function-name $func --name prod --function-version $VERSION --region eu-central-1 &> /dev/null; then
        log_info "  ✓ Rolled back $func"
    else
        log_error "  ✗ Failed to rollback $func"
        FAILED_FUNCTIONS+=("$func")
    fi
done

# Check if any functions failed
if [ ${#FAILED_FUNCTIONS[@]} -gt 0 ]; then
    log_error "Rollback completed with errors"
    log_error "Failed functions:"
    for func in "${FAILED_FUNCTIONS[@]}"; do
        log_error "  - $func"
    done
    exit 1
fi

# Verify rollback
log_info "Verifying rollback..."
sleep 5

# Check CloudWatch alarms
ALARMS=$(aws cloudwatch describe-alarms --region eu-central-1 --alarm-name-prefix "defillama-$STAGE" --state-value ALARM --query 'MetricAlarms[*].AlarmName' --output text)

if [ ! -z "$ALARMS" ]; then
    log_warn "Some alarms are still triggered:"
    for alarm in $ALARMS; do
        log_warn "  - $alarm"
    done
else
    log_info "No alarms triggered ✓"
fi

# Get API endpoint
if [ "$STAGE" = "prod" ]; then
    API_ENDPOINT="https://api.llama.fi"
elif [ "$STAGE" = "staging" ]; then
    API_ENDPOINT="https://staging-api.llama.fi"
else
    API_ENDPOINT=$(aws apigatewayv2 get-apis --region eu-central-1 --query "Items[?contains(Name, 'defillama-$STAGE')].ApiEndpoint" --output text | head -1)
fi

# Test health endpoint
if [ ! -z "$API_ENDPOINT" ]; then
    log_info "Testing health endpoint: $API_ENDPOINT/health"
    if curl -f -s "$API_ENDPOINT/health" > /dev/null; then
        log_info "Health check passed ✓"
    else
        log_warn "Health check failed"
    fi
fi

# Create rollback tag
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAG="$STAGE-rollback-v$VERSION-$TIMESTAMP"
git tag -a "$TAG" -m "Rollback to version $VERSION for $STAGE at $TIMESTAMP" || log_warn "Failed to create git tag"

log_info "Rollback completed successfully! ✓"
log_info "Stage: $STAGE"
log_info "Version: $VERSION"
log_info "Tag: $TAG"
if [ ! -z "$API_ENDPOINT" ]; then
    log_info "API Endpoint: $API_ENDPOINT"
fi
log_info ""
log_info "Next steps:"
log_info "  1. Monitor CloudWatch dashboards for 10-15 minutes"
log_info "  2. Check CloudWatch alarms"
log_info "  3. Review X-Ray traces"
log_info "  4. Test critical endpoints"
log_info "  5. Investigate root cause of the issue"

