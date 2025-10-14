#!/bin/bash

# Test Deploy Production Workflow
# This script validates production deployment configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo "Deploy Production Workflow Testing"
echo -e "========================================${NC}"
echo ""

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test 1: Workflow File Validation
echo -e "${BLUE}Test 1: Workflow File Validation${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f ".github/workflows/deploy-production.yml" ]; then
  echo -e "${GREEN}✓${NC} Deploy production workflow exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Deploy production workflow not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 2: Manual Approval
echo -e "${BLUE}Test 2: Manual Approval Configuration${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "approval:" .github/workflows/deploy-production.yml && \
   grep -q "production-approval" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Manual approval configured"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Manual approval not configured"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "workflow_dispatch:" .github/workflows/deploy-production.yml && \
   grep -q "inputs:" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Manual trigger with inputs configured"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Manual trigger not configured"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 3: Blue-Green Deployment
echo -e "${BLUE}Test 3: Blue-Green Deployment Configuration${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "deploy-blue:" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Blue deployment job exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Blue deployment job not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "promote-blue-to-green:" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Blue to green promotion job exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Blue to green promotion not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 4: Traffic Shifting
echo -e "${BLUE}Test 4: Traffic Shifting Configuration${NC}"
echo ""

TRAFFIC_STAGES=("traffic-shift-10" "traffic-shift-50" "traffic-shift-100")

for stage in "${TRAFFIC_STAGES[@]}"; do
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if grep -q "$stage:" .github/workflows/deploy-production.yml; then
    echo -e "${GREEN}✓${NC} Traffic stage '$stage' exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗${NC} Traffic stage '$stage' not found"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
done

echo ""

# Test 5: Health Checks
echo -e "${BLUE}Test 5: Health Check Configuration${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Wait for blue environment to be healthy" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Blue environment health check exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Blue environment health check not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Run smoke tests on blue" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Blue environment smoke tests exist"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Blue environment smoke tests not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 6: Monitoring Periods
echo -e "${BLUE}Test 6: Monitoring Periods${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Monitor for 5 minutes" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} 5-minute monitoring periods configured"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} 5-minute monitoring not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Monitor for 10 minutes" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} 10-minute monitoring period configured"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} 10-minute monitoring not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 7: Nginx Configuration
echo -e "${BLUE}Test 7: Nginx Load Balancing${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Configure Nginx" .github/workflows/deploy-production.yml && \
   grep -q "upstream backend" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Nginx load balancing configured"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Nginx load balancing not configured"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 8: Backup Configuration
echo -e "${BLUE}Test 8: Backup Configuration${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Backup current green" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Green environment backup configured"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Green environment backup not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 9: Deployment Tagging
echo -e "${BLUE}Test 9: Deployment Tagging${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Tag successful deployment" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Deployment tagging configured"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Deployment tagging not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 10: Notification Configuration
echo -e "${BLUE}Test 10: Notification Configuration${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Notify Slack - Success" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Success notification configured"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Success notification not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 11: Environment Configuration
echo -e "${BLUE}Test 11: Environment Configuration${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "PRODUCTION_HOST" .github/workflows/deploy-production.yml && \
   grep -q "PRODUCTION_USER" .github/workflows/deploy-production.yml && \
   grep -q "PRODUCTION_SSH_KEY" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Production environment variables configured"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Production environment variables not configured"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Summary
echo -e "${BLUE}========================================"
echo "Testing Summary"
echo -e "========================================${NC}"
echo ""
echo "Total Tests:   $TOTAL_TESTS"
echo -e "${GREEN}Passed:        $PASSED_TESTS${NC}"
echo -e "${RED}Failed:        $FAILED_TESTS${NC}"
echo ""

# Calculate pass rate
PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Pass Rate:     $PASS_RATE%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ All production deployment tests passed!${NC}"
  echo ""
  exit 0
else
  echo -e "${YELLOW}⚠ Some production deployment tests failed${NC}"
  echo ""
  exit 1
fi

