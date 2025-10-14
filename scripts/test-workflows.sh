#!/bin/bash

# Test CI/CD Workflows
# This script validates and tests GitHub Actions workflows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo "CI/CD Workflows Testing"
echo -e "========================================${NC}"
echo ""

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test 1: Validate YAML Syntax
echo -e "${BLUE}========================================"
echo "Test 1: YAML Syntax Validation"
echo -e "========================================${NC}"
echo ""

WORKFLOWS=(
  ".github/workflows/test.yml"
  ".github/workflows/build.yml"
  ".github/workflows/deploy-staging.yml"
  ".github/workflows/deploy-production.yml"
  ".github/workflows/security-scan.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if [ -f "$workflow" ]; then
    echo -n "Validating $workflow... "
    if python3 -c "import yaml; yaml.safe_load(open('$workflow'))" 2>/dev/null; then
      echo -e "${GREEN}✓ Valid${NC}"
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      echo -e "${RED}✗ Invalid YAML${NC}"
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
  else
    echo -e "${YELLOW}⚠ File not found: $workflow${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
done

echo ""

# Test 2: Check Required Secrets
echo -e "${BLUE}========================================"
echo "Test 2: Required Secrets Check"
echo -e "========================================${NC}"
echo ""

REQUIRED_SECRETS=(
  "STAGING_HOST"
  "STAGING_USER"
  "STAGING_SSH_KEY"
  "PRODUCTION_HOST"
  "PRODUCTION_USER"
  "PRODUCTION_SSH_KEY"
)

echo "Required secrets for deployment:"
for secret in "${REQUIRED_SECRETS[@]}"; do
  echo "  - $secret"
done
echo ""
echo -e "${YELLOW}Note: Secrets must be configured in GitHub repository settings${NC}"
echo ""

# Test 3: Check Workflow Triggers
echo -e "${BLUE}========================================"
echo "Test 3: Workflow Triggers Validation"
echo -e "========================================${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "on:" .github/workflows/test.yml && \
   grep -q "pull_request:" .github/workflows/test.yml && \
   grep -q "push:" .github/workflows/test.yml; then
  echo -e "${GREEN}✓${NC} Test workflow has correct triggers (PR + push)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Test workflow triggers are incorrect"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "workflow_dispatch:" .github/workflows/build.yml; then
  echo -e "${GREEN}✓${NC} Build workflow has manual trigger"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Build workflow missing manual trigger"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "workflow_dispatch:" .github/workflows/deploy-production.yml && \
   grep -q "inputs:" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Production workflow has manual trigger with inputs"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Production workflow missing manual trigger or inputs"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 4: Check Docker Compose Files
echo -e "${BLUE}========================================"
echo "Test 4: Docker Compose Files Check"
echo -e "========================================${NC}"
echo ""

COMPOSE_FILES=(
  "docker-compose.yml"
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

# Test 5: Check Environment Files
echo -e "${BLUE}========================================"
echo "Test 5: Environment Files Check"
echo -e "========================================${NC}"
echo ""

ENV_FILES=(
  "defi/.env"
)

for file in "${ENV_FILES[@]}"; do
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${YELLOW}⚠${NC} $file not found (will need .env.staging and .env.production)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
done

echo ""

# Test 6: Simulate Test Workflow
echo -e "${BLUE}========================================"
echo "Test 6: Simulate Test Workflow"
echo -e "========================================${NC}"
echo ""

echo "Simulating test workflow steps..."
echo ""

# Check if pnpm is installed
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if command -v pnpm &> /dev/null; then
  echo -e "${GREEN}✓${NC} pnpm is installed"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${YELLOW}⚠${NC} pnpm not installed (required for workflows)"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Check if Docker is running
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if docker ps &> /dev/null; then
  echo -e "${GREEN}✓${NC} Docker is running"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Docker is not running"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Check if PostgreSQL container is running
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if docker ps | grep -q "defillama-postgres"; then
  echo -e "${GREEN}✓${NC} PostgreSQL container is running"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${YELLOW}⚠${NC} PostgreSQL container not running"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Check if Redis container is running
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if docker ps | grep -q "defillama-redis"; then
  echo -e "${GREEN}✓${NC} Redis container is running"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${YELLOW}⚠${NC} Redis container not running"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 7: Check Workflow Jobs
echo -e "${BLUE}========================================"
echo "Test 7: Workflow Jobs Validation"
echo -e "========================================${NC}"
echo ""

# Test workflow jobs
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "jobs:" .github/workflows/test.yml && \
   grep -q "test:" .github/workflows/test.yml && \
   grep -q "lint:" .github/workflows/test.yml && \
   grep -q "security:" .github/workflows/test.yml; then
  echo -e "${GREEN}✓${NC} Test workflow has all required jobs (test, lint, security)"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Test workflow missing required jobs"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Build workflow jobs
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "build:" .github/workflows/build.yml && \
   grep -q "matrix:" .github/workflows/build.yml; then
  echo -e "${GREEN}✓${NC} Build workflow has matrix build job"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Build workflow missing matrix build"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Deploy staging jobs
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "deploy:" .github/workflows/deploy-staging.yml && \
   grep -q "rollback:" .github/workflows/deploy-staging.yml; then
  echo -e "${GREEN}✓${NC} Deploy staging has deploy and rollback jobs"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Deploy staging missing required jobs"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Deploy production jobs
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "approval:" .github/workflows/deploy-production.yml && \
   grep -q "deploy-blue:" .github/workflows/deploy-production.yml && \
   grep -q "traffic-shift" .github/workflows/deploy-production.yml; then
  echo -e "${GREEN}✓${NC} Deploy production has approval, blue deployment, and traffic shifting"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗${NC} Deploy production missing required jobs"
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
  echo -e "${GREEN}✓ All workflow tests passed!${NC}"
  echo ""
  exit 0
else
  echo -e "${YELLOW}⚠ Some workflow tests failed or require manual setup${NC}"
  echo ""
  exit 1
fi

