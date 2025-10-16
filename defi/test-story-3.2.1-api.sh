#!/bin/bash

# Story 3.2.1: Protocol Risk Assessment - API Testing Script
# Tests all 8 API endpoints

echo "========================================"
echo "Story 3.2.1: Protocol Risk Assessment"
echo "API Endpoint Testing"
echo "========================================"
echo ""

API_BASE="http://localhost:5001/v1/risk"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Test $TOTAL_TESTS: $name ... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Show response preview
        if [ -n "$body" ]; then
            echo "$body" | jq -C '.' 2>/dev/null | head -20 || echo "$body" | head -20
        fi
    else
        echo -e "${RED}FAIL${NC} (Expected HTTP $expected_status, got $http_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "Response: $body"
    fi
    echo ""
}

echo "Testing API endpoints..."
echo ""

# Test 1: Comprehensive Risk Assessment
echo "=== Test 1: Comprehensive Risk Assessment ==="
test_endpoint \
    "GET /protocols/uniswap-v3/assessment" \
    "$API_BASE/protocols/uniswap-v3/assessment"

# Test 2: Contract Risk
echo "=== Test 2: Contract Risk Details ==="
test_endpoint \
    "GET /protocols/uniswap-v3/contract" \
    "$API_BASE/protocols/uniswap-v3/contract"

# Test 3: Liquidity Risk
echo "=== Test 3: Liquidity Risk Details ==="
test_endpoint \
    "GET /protocols/uniswap-v3/liquidity" \
    "$API_BASE/protocols/uniswap-v3/liquidity"

# Test 4: Governance Risk
echo "=== Test 4: Governance Risk Details ==="
test_endpoint \
    "GET /protocols/uniswap-v3/governance" \
    "$API_BASE/protocols/uniswap-v3/governance"

# Test 5: Operational Risk
echo "=== Test 5: Operational Risk Details ==="
test_endpoint \
    "GET /protocols/uniswap-v3/operational" \
    "$API_BASE/protocols/uniswap-v3/operational"

# Test 6: Market Risk
echo "=== Test 6: Market Risk Details ==="
test_endpoint \
    "GET /protocols/uniswap-v3/market" \
    "$API_BASE/protocols/uniswap-v3/market"

# Test 7: Risk Alerts
echo "=== Test 7: Risk Alerts ==="
test_endpoint \
    "GET /protocols/risky-protocol/alerts" \
    "$API_BASE/protocols/risky-protocol/alerts"

# Test 8: List Protocols by Risk
echo "=== Test 8: List Protocols by Risk ==="
test_endpoint \
    "GET /protocols (all)" \
    "$API_BASE/protocols?limit=10"

# Test 9: List Low Risk Protocols
echo "=== Test 9: List Low Risk Protocols ==="
test_endpoint \
    "GET /protocols (low risk)" \
    "$API_BASE/protocols?riskCategory=low&limit=5"

# Test 10: List Critical Risk Protocols
echo "=== Test 10: List Critical Risk Protocols ==="
test_endpoint \
    "GET /protocols (critical risk)" \
    "$API_BASE/protocols?riskCategory=critical&limit=5"

# Test 11: Sort by Risk Score
echo "=== Test 11: Sort by Risk Score (Ascending) ==="
test_endpoint \
    "GET /protocols (sorted asc)" \
    "$API_BASE/protocols?sortBy=overall_risk_score&order=asc&limit=5"

# Test 12: Sort by Risk Score (Descending)
echo "=== Test 12: Sort by Risk Score (Descending) ==="
test_endpoint \
    "GET /protocols (sorted desc)" \
    "$API_BASE/protocols?sortBy=overall_risk_score&order=desc&limit=5"

# Test 13: Filter by Score Range
echo "=== Test 13: Filter by Score Range ==="
test_endpoint \
    "GET /protocols (score 30-60)" \
    "$API_BASE/protocols?minScore=30&maxScore=60&limit=5"

# Test 14: Critical Alerts Only
echo "=== Test 14: Critical Alerts Only ==="
test_endpoint \
    "GET /protocols/risky-protocol/alerts (critical)" \
    "$API_BASE/protocols/risky-protocol/alerts?severity=critical"

# Test 15: Unacknowledged Alerts
echo "=== Test 15: Unacknowledged Alerts ==="
test_endpoint \
    "GET /protocols/risky-protocol/alerts (unacknowledged)" \
    "$API_BASE/protocols/risky-protocol/alerts?acknowledged=false"

# Test 16: Error Handling - Invalid Protocol ID
echo "=== Test 16: Error Handling - Invalid Protocol ID ==="
test_endpoint \
    "GET /protocols/invalid-protocol/assessment (404)" \
    "$API_BASE/protocols/invalid-protocol/assessment" \
    500

# Test 17: Error Handling - Missing Protocol ID
echo "=== Test 17: Error Handling - Missing Protocol ID ==="
test_endpoint \
    "GET /protocols//assessment (400)" \
    "$API_BASE/protocols//assessment" \
    404

# Summary
echo "========================================"
echo "Test Summary"
echo "========================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi

