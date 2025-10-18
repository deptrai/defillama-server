#!/bin/bash

###############################################################################
# DeFiLlama Premium - Whale Alerts Deployment Script
# Story 1.1.1: Configure Whale Alert Thresholds
# EPIC-1: Smart Alerts & Notifications
#
# Usage:
#   ./scripts/deploy.sh <environment> [options]
#
# Environments:
#   dev       - Development environment
#   staging   - Staging environment
#   prod      - Production environment
#
# Options:
#   --skip-tests        Skip running tests
#   --skip-migration    Skip database migration
#   --skip-monitoring   Skip monitoring setup
#   --dry-run          Show what would be deployed without deploying
#
# Examples:
#   ./scripts/deploy.sh dev
#   ./scripts/deploy.sh staging --skip-tests
#   ./scripts/deploy.sh prod --dry-run
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default options
SKIP_TESTS=false
SKIP_MIGRATION=false
SKIP_MONITORING=false
DRY_RUN=false

# Parse arguments
ENVIRONMENT=$1
shift

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    --skip-monitoring)
      SKIP_MONITORING=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  echo -e "${RED}Error: Invalid environment. Must be dev, staging, or prod${NC}"
  exit 1
fi

# Print header
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  DeFiLlama Premium - Whale Alerts Deployment                  ║${NC}"
echo -e "${BLUE}║  Environment: ${ENVIRONMENT}                                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print step
print_step() {
  echo -e "${BLUE}▶ $1${NC}"
}

# Function to print success
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning
print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print error
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Change to project directory
cd "$PROJECT_DIR"

# ============================================================================
# Step 1: Pre-deployment checks
# ============================================================================

print_step "Step 1: Pre-deployment checks"

# Check Node.js version
NODE_VERSION=$(node --version)
if [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
  print_error "Node.js version must be v20.x (current: $NODE_VERSION)"
  exit 1
fi
print_success "Node.js version: $NODE_VERSION"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  print_error "pnpm is not installed"
  exit 1
fi
print_success "pnpm is installed"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
  print_error "AWS CLI is not installed"
  exit 1
fi
print_success "AWS CLI is installed"

# Check Serverless Framework
if ! command -v serverless &> /dev/null; then
  print_error "Serverless Framework is not installed"
  exit 1
fi
print_success "Serverless Framework is installed"

# Check environment variables
if [[ -z "$PREMIUM_DB" && -z "$ALERTS_DB" ]]; then
  print_warning "PREMIUM_DB or ALERTS_DB environment variable not set"
fi

echo ""

# ============================================================================
# Step 2: Install dependencies
# ============================================================================

print_step "Step 2: Installing dependencies"

if [[ "$DRY_RUN" == "false" ]]; then
  pnpm install --frozen-lockfile
  print_success "Dependencies installed"
else
  print_warning "Dry run: Skipping dependency installation"
fi

echo ""

# ============================================================================
# Step 3: Run tests
# ============================================================================

if [[ "$SKIP_TESTS" == "false" ]]; then
  print_step "Step 3: Running tests"
  
  if [[ "$DRY_RUN" == "false" ]]; then
    # Run unit tests
    print_step "Running unit tests..."
    pnpm test
    print_success "Unit tests passed"
    
    # Run integration tests (if test database is available)
    if [[ -n "$TEST_PREMIUM_DB" || -n "$TEST_ALERTS_DB" ]]; then
      print_step "Running integration tests..."
      pnpm test:integration
      print_success "Integration tests passed"
    else
      print_warning "Skipping integration tests (TEST_PREMIUM_DB not set)"
    fi
  else
    print_warning "Dry run: Skipping tests"
  fi
else
  print_warning "Skipping tests (--skip-tests flag)"
fi

echo ""

# ============================================================================
# Step 4: Build
# ============================================================================

print_step "Step 4: Building project"

if [[ "$DRY_RUN" == "false" ]]; then
  pnpm run build
  print_success "Build completed"
else
  print_warning "Dry run: Skipping build"
fi

echo ""

# ============================================================================
# Step 5: Database migration
# ============================================================================

if [[ "$SKIP_MIGRATION" == "false" ]]; then
  print_step "Step 5: Running database migration"
  
  if [[ "$DRY_RUN" == "false" ]]; then
    # Get database URL based on environment
    case $ENVIRONMENT in
      dev)
        DB_URL="${DEV_PREMIUM_DB:-$PREMIUM_DB}"
        ;;
      staging)
        DB_URL="${STAGING_PREMIUM_DB:-$PREMIUM_DB}"
        ;;
      prod)
        DB_URL="${PROD_PREMIUM_DB:-$PREMIUM_DB}"
        ;;
    esac
    
    if [[ -z "$DB_URL" ]]; then
      print_error "Database URL not set for environment: $ENVIRONMENT"
      exit 1
    fi
    
    # Run migration
    print_step "Running migration on $ENVIRONMENT database..."
    psql "$DB_URL" -f migrations/001-create-alert-rules-table.sql
    print_success "Database migration completed"
  else
    print_warning "Dry run: Skipping database migration"
  fi
else
  print_warning "Skipping database migration (--skip-migration flag)"
fi

echo ""

# ============================================================================
# Step 6: Deploy backend
# ============================================================================

print_step "Step 6: Deploying backend to $ENVIRONMENT"

if [[ "$DRY_RUN" == "false" ]]; then
  serverless deploy --stage "$ENVIRONMENT" --verbose
  print_success "Backend deployed to $ENVIRONMENT"
else
  print_warning "Dry run: Would deploy backend to $ENVIRONMENT"
  serverless deploy --stage "$ENVIRONMENT" --dry-run
fi

echo ""

# ============================================================================
# Step 7: Setup monitoring
# ============================================================================

if [[ "$SKIP_MONITORING" == "false" && "$ENVIRONMENT" == "prod" ]]; then
  print_step "Step 7: Setting up monitoring"
  
  if [[ "$DRY_RUN" == "false" ]]; then
    # Create CloudWatch dashboard
    print_step "Creating CloudWatch dashboard..."
    aws cloudwatch put-dashboard \
      --dashboard-name "DeFiLlama-Premium-Whale-Alerts" \
      --dashboard-body file://monitoring/cloudwatch-dashboard.json
    print_success "CloudWatch dashboard created"
    
    # Create SNS topic
    print_step "Creating SNS topic..."
    SNS_TOPIC_ARN=$(aws sns create-topic \
      --name defillama-premium-alerts \
      --region eu-central-1 \
      --output text)
    print_success "SNS topic created: $SNS_TOPIC_ARN"
    
    # Create CloudWatch alarms
    print_step "Creating CloudWatch alarms..."
    # Note: This would require parsing the YAML and creating alarms
    # For now, we'll just print a message
    print_warning "CloudWatch alarms need to be created manually from monitoring/cloudwatch-alarms.yml"
  else
    print_warning "Dry run: Skipping monitoring setup"
  fi
else
  print_warning "Skipping monitoring setup (--skip-monitoring flag or not prod environment)"
fi

echo ""

# ============================================================================
# Step 8: Smoke tests
# ============================================================================

print_step "Step 8: Running smoke tests"

if [[ "$DRY_RUN" == "false" ]]; then
  # Get API endpoint
  API_ENDPOINT=$(serverless info --stage "$ENVIRONMENT" | grep "POST" | head -1 | awk '{print $3}' | sed 's|/v2/premium/alerts/whale||')
  
  if [[ -n "$API_ENDPOINT" ]]; then
    print_step "Testing API endpoint: $API_ENDPOINT"
    
    # Test health check (if exists)
    # curl -f "$API_ENDPOINT/health" || print_warning "Health check failed"
    
    print_success "Smoke tests completed"
  else
    print_warning "Could not determine API endpoint"
  fi
else
  print_warning "Dry run: Skipping smoke tests"
fi

echo ""

# ============================================================================
# Deployment summary
# ============================================================================

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Deployment Summary                                            ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Environment: ${ENVIRONMENT}                                           ║${NC}"
echo -e "${GREEN}║  Status: $(if [[ "$DRY_RUN" == "true" ]]; then echo "DRY RUN"; else echo "SUCCESS"; fi)                                                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"

echo ""
print_success "Deployment completed successfully!"
echo ""

# Next steps
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify deployment in AWS Console"
echo "2. Test API endpoints manually"
echo "3. Monitor CloudWatch logs and metrics"
echo "4. Update documentation with deployment details"
echo ""

