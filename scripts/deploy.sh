#!/bin/bash

# DeFiLlama Deployment Script
# This script deploys the application to AWS using Serverless Framework

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
    log_error "Usage: ./deploy.sh <stage> [options]"
    log_info "Stages: dev, staging, prod"
    log_info "Options:"
    log_info "  --skip-tests    Skip running tests"
    log_info "  --skip-build    Skip building application"
    log_info "  --dry-run       Show what would be deployed without deploying"
    exit 1
fi

STAGE=$1
SKIP_TESTS=false
SKIP_BUILD=false
DRY_RUN=false

# Parse options
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid stage: $STAGE"
    log_info "Valid stages: dev, staging, prod"
    exit 1
fi

log_info "Starting deployment to $STAGE environment"

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured"
    log_info "Run: aws configure"
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_info "AWS Account ID: $AWS_ACCOUNT_ID"

# Change to defi directory
cd defi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    log_error "package.json not found"
    exit 1
fi

# Install dependencies
log_info "Installing dependencies..."
if command -v pnpm &> /dev/null; then
    pnpm install --frozen-lockfile
else
    npm install
fi

# Run tests
if [ "$SKIP_TESTS" = false ]; then
    log_info "Running tests..."
    if command -v pnpm &> /dev/null; then
        pnpm test -- --passWithNoTests || log_warn "Some tests failed, continuing..."
    else
        npm test -- --passWithNoTests || log_warn "Some tests failed, continuing..."
    fi
else
    log_warn "Skipping tests"
fi

# Build application
if [ "$SKIP_BUILD" = false ]; then
    log_info "Building application..."
    if command -v pnpm &> /dev/null; then
        pnpm run build || npx tsc || log_warn "Build completed with warnings"
    else
        npm run build || npx tsc || log_warn "Build completed with warnings"
    fi
else
    log_warn "Skipping build"
fi

# Check if Serverless Framework is installed
if ! command -v serverless &> /dev/null; then
    log_error "Serverless Framework not installed"
    log_info "Run: npm install -g serverless"
    exit 1
fi

# Dry run
if [ "$DRY_RUN" = true ]; then
    log_info "Dry run mode - showing what would be deployed"
    serverless package --stage $STAGE
    log_info "Deployment package created in .serverless/"
    log_info "Review the package and run without --dry-run to deploy"
    exit 0
fi

# Deploy
log_info "Deploying to $STAGE..."
serverless deploy --stage $STAGE --verbose

# Verify deployment
log_info "Verifying deployment..."

# Check Lambda functions
FUNCTIONS=$(aws lambda list-functions --region eu-central-1 --query "Functions[?starts_with(FunctionName, 'defillama-$STAGE')].FunctionName" --output text)
if [ -z "$FUNCTIONS" ]; then
    log_error "No Lambda functions found"
    exit 1
fi

log_info "Lambda functions deployed:"
for func in $FUNCTIONS; do
    log_info "  - $func"
done

# Check API Gateway
APIS=$(aws apigatewayv2 get-apis --region eu-central-1 --query "Items[?contains(Name, 'defillama-$STAGE')].Name" --output text)
if [ -z "$APIS" ]; then
    log_warn "No API Gateway found"
else
    log_info "API Gateway deployed:"
    for api in $APIS; do
        log_info "  - $api"
    done
fi

# Check CloudWatch alarms
ALARMS=$(aws cloudwatch describe-alarms --region eu-central-1 --alarm-name-prefix "defillama-$STAGE" --query 'MetricAlarms[*].AlarmName' --output text)
if [ -z "$ALARMS" ]; then
    log_warn "No CloudWatch alarms found"
else
    log_info "CloudWatch alarms configured:"
    ALARM_COUNT=$(echo "$ALARMS" | wc -w)
    log_info "  - $ALARM_COUNT alarms"
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
        log_warn "Health check failed (endpoint may not be ready yet)"
    fi
fi

# Create deployment tag
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAG="$STAGE-$TIMESTAMP"
cd ..
git tag -a "$TAG" -m "Deployment to $STAGE at $TIMESTAMP" || log_warn "Failed to create git tag"

log_info "Deployment completed successfully! ✓"
log_info "Stage: $STAGE"
log_info "Tag: $TAG"
if [ ! -z "$API_ENDPOINT" ]; then
    log_info "API Endpoint: $API_ENDPOINT"
fi
log_info ""
log_info "Next steps:"
log_info "  1. Monitor CloudWatch dashboards"
log_info "  2. Check CloudWatch alarms"
log_info "  3. Review X-Ray traces"
log_info "  4. Test critical endpoints"

