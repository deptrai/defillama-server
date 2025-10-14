#!/bin/bash

# Test Deploy Staging Workflow
# This script validates staging deployment configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo "Deploy Staging Workflow Testing"
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
if [ -f ".github/workflows/deploy-staging.yml" ]; then
  echo -e "${GREEN}✓${NC} Deploy staging workflow exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Deploy staging workflow not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 2: Required Jobs
echo -e "${BLUE}Test 2: Required Jobs Validation${NC}"
echo ""

REQUIRED_JOBS=("test" "build" "deploy" "rollback")

for job in "${REQUIRED_JOBS[@]}"; do
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if grep -q "$job:" .github/workflows/deploy-staging.yml; then
    echo -e "${GREEN}✓${NC} Job '$job' exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗${NC} Job '$job' not found"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
done

echo ""

# Test 3: Docker Compose Files
echo -e "${BLUE}Test 3: Docker Compose Files${NC}"
echo ""

COMPOSE_FILES=(
  "docker-compose.supabase.yml"
  "docker-compose.monitoring.yml"
)

for file in "${COMPOSE_FILES[@]}"; do
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗${NC} $file not found"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
done

echo ""

# Test 4: Health Check Steps
echo -e "${BLUE}Test 4: Health Check Steps${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Wait for services to be healthy" .github/workflows/deploy-staging.yml; then
  echo -e "${GREEN}✓${NC} Health check step exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Health check step not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Run smoke tests" .github/workflows/deploy-staging.yml; then
  echo -e "${GREEN}✓${NC} Smoke tests step exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Smoke tests step not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 5: Rollback Configuration
echo -e "${BLUE}Test 5: Rollback Configuration${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Rollback deployment" .github/workflows/deploy-staging.yml; then
  echo -e "${GREEN}✓${NC} Rollback step exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Rollback step not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Backup current deployment" .github/workflows/deploy-staging.yml; then
  echo -e "${GREEN}✓${NC} Backup step exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Backup step not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 6: Notification Configuration
echo -e "${BLUE}Test 6: Notification Configuration${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Notify Slack - Success" .github/workflows/deploy-staging.yml; then
  echo -e "${GREEN}✓${NC} Success notification exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Success notification not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Notify Slack - Failure" .github/workflows/deploy-staging.yml; then
  echo -e "${GREEN}✓${NC} Failure notification exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Failure notification not found"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 7: Environment Configuration
echo -e "${BLUE}Test 7: Environment Configuration${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "environment:" .github/workflows/deploy-staging.yml && \
   grep -q "name: staging" .github/workflows/deploy-staging.yml; then
  echo -e "${GREEN}✓${NC} Staging environment configured"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Staging environment not configured"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 8: SSH Configuration
echo -e "${BLUE}Test 8: SSH Configuration${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "Setup SSH" .github/workflows/deploy-staging.yml && \
   grep -q "STAGING_SSH_KEY" .github/workflows/deploy-staging.yml; then
  echo -e "${GREEN}✓${NC} SSH configuration exists"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} SSH configuration not found"
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
  echo -e "${GREEN}✓ All staging deployment tests passed!${NC}"
  echo ""
  exit 0
else
  echo -e "${YELLOW}⚠ Some staging deployment tests failed${NC}"
  echo ""
  exit 1
fi

