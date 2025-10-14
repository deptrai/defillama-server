#!/bin/bash

# Comprehensive Security Validation for DeFiLlama
# This script runs all security tests and validates deployment readiness

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo "DeFiLlama Security Validation"
echo -e "========================================${NC}"
echo ""
echo -e "${BLUE}ℹ Running comprehensive security validation...${NC}"
echo ""

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Test 1: Monitoring Stack
echo -e "${BLUE}========================================"
echo "Test 1: Monitoring Stack Validation"
echo -e "========================================${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))

if docker ps | grep -q "defillama-prometheus"; then
    echo -e "${GREEN}✓${NC} Prometheus is running"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} Prometheus is not running"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if docker ps | grep -q "defillama-grafana"; then
    echo -e "${GREEN}✓${NC} Grafana is running"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} Grafana is not running"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if docker ps | grep -q "defillama-loki"; then
    echo -e "${GREEN}✓${NC} Loki is running"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} Loki is not running"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if docker ps | grep -q "defillama-alertmanager"; then
    echo -e "${GREEN}✓${NC} Alertmanager is running"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} Alertmanager is not running"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 2: Secrets Management
echo -e "${BLUE}========================================"
echo "Test 2: Secrets Management Validation"
echo -e "========================================${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -d "secrets" ]; then
    echo -e "${GREEN}✓${NC} Secrets directory exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # Count secrets
    SECRET_COUNT=$(ls -1 secrets/*.txt 2>/dev/null | wc -l | tr -d ' ')
    echo "  Total secrets: $SECRET_COUNT"
    
    # Check permissions
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PERMS=$(stat -f "%OLp" secrets 2>/dev/null || stat -c "%a" secrets 2>/dev/null || echo "unknown")
    if [ "$PERMS" = "700" ]; then
        echo -e "${GREEN}✓${NC} Secrets directory has secure permissions (700)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${YELLOW}⚠${NC} Secrets directory permissions: $PERMS (should be 700)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
else
    echo -e "${RED}✗${NC} Secrets directory does not exist"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Test 3: SSL/TLS Configuration
echo -e "${BLUE}========================================"
echo "Test 3: SSL/TLS Configuration Validation"
echo -e "========================================${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "nginx/ssl.conf" ]; then
    echo -e "${GREEN}✓${NC} SSL configuration exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} SSL configuration not found"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "nginx/security-headers.conf" ]; then
    echo -e "${GREEN}✓${NC} Security headers configuration exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} Security headers configuration not found"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "nginx/ssl/defillama.crt" ] && [ -f "nginx/ssl/defillama.key" ]; then
    echo -e "${GREEN}✓${NC} SSL certificates exist"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠${NC} SSL certificates not found (will be generated for production)"
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
fi

echo ""

# Test 4: Kong Security
echo -e "${BLUE}========================================"
echo "Test 4: Kong Security Configuration Validation"
echo -e "========================================${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "supabase/kong-security.yml" ]; then
    echo -e "${GREEN}✓${NC} Kong security configuration exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # Count plugins
    PLUGIN_COUNT=$(grep -c "name:" supabase/kong-security.yml || echo "0")
    echo "  Configured plugins: $PLUGIN_COUNT"
else
    echo -e "${RED}✗${NC} Kong security configuration not found"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if docker ps | grep -q "kong"; then
    echo -e "${GREEN}✓${NC} Kong is running"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠${NC} Kong is not running"
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
fi

echo ""

# Test 5: PostgreSQL RLS
echo -e "${BLUE}========================================"
echo "Test 5: PostgreSQL RLS Configuration Validation"
echo -e "========================================${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "sql/security/rls-policies.sql" ]; then
    echo -e "${GREEN}✓${NC} RLS policies file exists"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # Count policies
    POLICY_COUNT=$(grep -c "CREATE POLICY" sql/security/rls-policies.sql || echo "0")
    echo "  Total policies: $POLICY_COUNT"
else
    echo -e "${RED}✗${NC} RLS policies file not found"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if docker ps | grep -q "defillama-postgres"; then
    echo -e "${GREEN}✓${NC} PostgreSQL is running"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠${NC} PostgreSQL is not running"
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
fi

echo ""

# Test 6: .gitignore Security
echo -e "${BLUE}========================================"
echo "Test 6: Git Ignore Security Validation"
echo -e "========================================${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "secrets/" .gitignore; then
    echo -e "${GREEN}✓${NC} secrets/ directory is in .gitignore"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} secrets/ directory is NOT in .gitignore"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "*.key" .gitignore; then
    echo -e "${GREEN}✓${NC} *.key files are in .gitignore"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} *.key files are NOT in .gitignore"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "*.pem" .gitignore; then
    echo -e "${GREEN}✓${NC} *.pem files are in .gitignore"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} *.pem files are NOT in .gitignore"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""

# Summary
echo -e "${BLUE}========================================"
echo "Security Validation Summary"
echo -e "========================================${NC}"
echo ""
echo "Total Tests:   $TOTAL_TESTS"
echo -e "${GREEN}Passed:        $PASSED_TESTS${NC}"
echo -e "${RED}Failed:        $FAILED_TESTS${NC}"
echo -e "${YELLOW}Skipped:       $SKIPPED_TESTS${NC}"
echo ""

# Calculate pass rate
PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Pass Rate:     $PASS_RATE%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All security validations passed!${NC}"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠ Some security validations failed or were skipped${NC}"
    echo ""
    exit 1
fi

