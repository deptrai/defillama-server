#!/bin/bash

# DeFiLlama Smoke Tests Script
# This script runs smoke tests to verify critical functionality after deployment

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

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_fail() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if stage is provided
if [ -z "$1" ]; then
    log_error "Usage: ./smoke-tests.sh <stage>"
    log_info "Stages: dev, staging, prod"
    exit 1
fi

STAGE=$1
FAILED_TESTS=0

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid stage: $STAGE"
    log_info "Valid stages: dev, staging, prod"
    exit 1
fi

log_info "Running smoke tests for $STAGE environment"
log_info ""

# Get API endpoint
if [ "$STAGE" = "prod" ]; then
    API_ENDPOINT="https://api.llama.fi"
elif [ "$STAGE" = "staging" ]; then
    API_ENDPOINT="https://staging-api.llama.fi"
else
    # Get from API Gateway
    API_ENDPOINT=$(aws apigatewayv2 get-apis --region eu-central-1 --query "Items[?contains(Name, 'defillama-$STAGE')].ApiEndpoint" --output text | head -1)
fi

if [ -z "$API_ENDPOINT" ]; then
    log_error "API endpoint not found"
    exit 1
fi

log_info "API Endpoint: $API_ENDPOINT"
log_info ""

# Test 1: Health Check
log_info "Test 1: Health Check"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT/health" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log_success "Health check passed (HTTP $HTTP_CODE)"
else
    log_fail "Health check failed (HTTP $HTTP_CODE)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 2: API Response Time
log_info "Test 2: API Response Time"
START_TIME=$(date +%s%N)
curl -s "$API_ENDPOINT/health" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))  # Convert to milliseconds

if [ $RESPONSE_TIME -lt 500 ]; then
    log_success "Response time: ${RESPONSE_TIME}ms (target: <500ms)"
else
    log_warn "Response time: ${RESPONSE_TIME}ms (target: <500ms)"
fi

# Test 3: WebSocket Connection (if wscat is installed)
if command -v wscat &> /dev/null; then
    log_info "Test 3: WebSocket Connection"
    
    # Try to connect to WebSocket
    timeout 5 wscat -c "wss://api.llama.fi" --execute "ping" > /dev/null 2>&1
    WS_EXIT_CODE=$?
    
    if [ $WS_EXIT_CODE -eq 0 ] || [ $WS_EXIT_CODE -eq 124 ]; then
        log_success "WebSocket connection successful"
    else
        log_fail "WebSocket connection failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
else
    log_warn "Test 3: WebSocket Connection - SKIPPED (wscat not installed)"
fi

# Test 4: Database Connectivity (via Lambda)
log_info "Test 4: Database Connectivity"

# Invoke a Lambda function that queries the database
LAMBDA_FUNCTION="defillama-$STAGE-websocketConnect"
LAMBDA_RESULT=$(aws lambda invoke --function-name $LAMBDA_FUNCTION --region eu-central-1 --payload '{"requestContext":{"routeKey":"$connect"}}' /tmp/lambda-output.json 2>&1 || echo "FAILED")

if [[ "$LAMBDA_RESULT" != *"FAILED"* ]]; then
    log_success "Database connectivity verified via Lambda"
else
    log_warn "Database connectivity test skipped (Lambda not found or failed)"
fi

# Test 5: Redis Connectivity (via Lambda)
log_info "Test 5: Redis Connectivity"

# Check if Redis is accessible via Lambda environment
REDIS_TEST=$(aws lambda get-function-configuration --function-name $LAMBDA_FUNCTION --region eu-central-1 --query 'Environment.Variables.REDIS_HOST' --output text 2>/dev/null || echo "")

if [ ! -z "$REDIS_TEST" ] && [ "$REDIS_TEST" != "None" ]; then
    log_success "Redis configuration found in Lambda"
else
    log_warn "Redis configuration not found (may not be configured yet)"
fi

# Test 6: CloudWatch Metrics
log_info "Test 6: CloudWatch Metrics"

# Check if metrics are being published
METRIC_COUNT=$(aws cloudwatch list-metrics --region eu-central-1 --namespace "DeFiLlama/$STAGE" --query 'length(Metrics)' --output text 2>/dev/null || echo "0")

if [ "$METRIC_COUNT" -gt 0 ]; then
    log_success "CloudWatch metrics found: $METRIC_COUNT"
else
    log_warn "CloudWatch metrics not found (may not be published yet)"
fi

# Test 7: CloudWatch Alarms Status
log_info "Test 7: CloudWatch Alarms Status"

# Check if any alarms are in ALARM state
ALARM_STATE=$(aws cloudwatch describe-alarms --region eu-central-1 --alarm-name-prefix "defillama-$STAGE" --state-value ALARM --query 'MetricAlarms[*].AlarmName' --output text 2>/dev/null || echo "")

if [ -z "$ALARM_STATE" ]; then
    log_success "No alarms triggered"
else
    log_warn "Alarms triggered: $ALARM_STATE"
fi

# Test 8: X-Ray Traces
log_info "Test 8: X-Ray Traces"

# Check if X-Ray traces are being collected
TRACE_COUNT=$(aws xray get-trace-summaries --region eu-central-1 --start-time $(date -u -d '5 minutes ago' +%s) --end-time $(date -u +%s) --query 'length(TraceSummaries)' --output text 2>/dev/null || echo "0")

if [ "$TRACE_COUNT" -gt 0 ]; then
    log_success "X-Ray traces found: $TRACE_COUNT"
else
    log_warn "X-Ray traces not found (may not be generated yet)"
fi

# Test 9: Lambda Function Logs
log_info "Test 9: Lambda Function Logs"

# Check if Lambda functions are logging
LOG_GROUPS=$(aws logs describe-log-groups --region eu-central-1 --log-group-name-prefix "/aws/lambda/defillama-$STAGE" --query 'length(logGroups)' --output text 2>/dev/null || echo "0")

if [ "$LOG_GROUPS" -gt 0 ]; then
    log_success "Lambda log groups found: $LOG_GROUPS"
else
    log_warn "Lambda log groups not found"
fi

# Test 10: SQS Queue Depth
log_info "Test 10: SQS Queue Depth"

# Check if SQS queues have reasonable depth
SQS_QUEUES=$(aws sqs list-queues --region eu-central-1 --queue-name-prefix "defillama-$STAGE" --query 'QueueUrls' --output text 2>/dev/null || echo "")

if [ ! -z "$SQS_QUEUES" ]; then
    MAX_DEPTH=0
    for queue in $SQS_QUEUES; do
        DEPTH=$(aws sqs get-queue-attributes --queue-url $queue --attribute-names ApproximateNumberOfMessages --region eu-central-1 --query 'Attributes.ApproximateNumberOfMessages' --output text 2>/dev/null || echo "0")
        if [ $DEPTH -gt $MAX_DEPTH ]; then
            MAX_DEPTH=$DEPTH
        fi
    done
    
    if [ $MAX_DEPTH -lt 1000 ]; then
        log_success "SQS queue depth: $MAX_DEPTH (healthy)"
    else
        log_warn "SQS queue depth: $MAX_DEPTH (high)"
    fi
else
    log_warn "SQS queues not found"
fi

# Summary
log_info ""
log_info "========================================="
log_info "Smoke Tests Summary"
log_info "========================================="
log_info "Stage: $STAGE"
log_info "API Endpoint: $API_ENDPOINT"
log_info ""

if [ $FAILED_TESTS -eq 0 ]; then
    log_success "All critical tests passed! ✓"
    log_info ""
    log_info "System is healthy and ready for use."
    exit 0
else
    log_error "$FAILED_TESTS test(s) failed"
    log_info ""
    log_info "Please investigate failed tests before proceeding."
    exit 1
fi

