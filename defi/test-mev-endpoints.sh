#!/bin/bash

# Test Script for Story 4.1.1: MEV Opportunity Detection API Endpoints
# Date: 2025-10-16
# Description: Integration tests for all 4 MEV API endpoints

set -e  # Exit on error

echo "🚀 =============================================="
echo "✅ Story 4.1.1: MEV API Integration Tests"
echo "🚀 =============================================="
echo ""

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
API_VERSION="v1"

echo "📊 API Configuration:"
echo "  Base URL: $API_BASE_URL"
echo "  Version: $API_VERSION"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
  local test_name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="${5:-200}"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 Test: $test_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Method: $method"
  echo "Endpoint: $endpoint"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$API_BASE_URL/$API_VERSION/$endpoint")
  else
    echo "Data: $data"
    response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$API_BASE_URL/$API_VERSION/$endpoint")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  echo ""
  echo "Status Code: $http_code"
  echo "Response Body:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  echo ""
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAILED (Expected: $expected_status, Got: $http_code)${NC}"
    ((TESTS_FAILED++))
  fi
  echo ""
}

# Test 1: List MEV Opportunities (Default)
test_endpoint \
  "List MEV Opportunities - Default Parameters" \
  "GET" \
  "analytics/mev/opportunities" \
  "" \
  200

# Test 2: List MEV Opportunities (Filtered by Type)
test_endpoint \
  "List MEV Opportunities - Filter by Sandwich Type" \
  "GET" \
  "analytics/mev/opportunities?opportunity_type=sandwich&limit=5" \
  "" \
  200

# Test 3: List MEV Opportunities (Filtered by Chain)
test_endpoint \
  "List MEV Opportunities - Filter by Ethereum Chain" \
  "GET" \
  "analytics/mev/opportunities?chain_id=ethereum&limit=10" \
  "" \
  200

# Test 4: List MEV Opportunities (Sorted by Profit)
test_endpoint \
  "List MEV Opportunities - Sort by Profit DESC" \
  "GET" \
  "analytics/mev/opportunities?sort_by=mev_profit_usd&sort_order=desc&limit=5" \
  "" \
  200

# Test 5: List MEV Opportunities (Pagination)
test_endpoint \
  "List MEV Opportunities - Pagination (Page 2)" \
  "GET" \
  "analytics/mev/opportunities?page=2&limit=5" \
  "" \
  200

# Test 6: Get MEV Opportunity by ID (First get an ID)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Getting first MEV opportunity ID..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
first_id=$(curl -s "$API_BASE_URL/$API_VERSION/analytics/mev/opportunities?limit=1" | jq -r '.opportunities[0].id' 2>/dev/null)

if [ -n "$first_id" ] && [ "$first_id" != "null" ]; then
  echo "Found ID: $first_id"
  echo ""
  
  test_endpoint \
    "Get MEV Opportunity by ID" \
    "GET" \
    "analytics/mev/opportunities/$first_id" \
    "" \
    200
else
  echo -e "${YELLOW}⚠️  Could not get MEV opportunity ID, skipping test${NC}"
  echo ""
fi

# Test 7: Get MEV Stats
test_endpoint \
  "Get MEV Statistics" \
  "GET" \
  "analytics/mev/stats" \
  "" \
  200

# Test 8: Get MEV Stats (Filtered by Type)
test_endpoint \
  "Get MEV Statistics - Filter by Sandwich Type" \
  "GET" \
  "analytics/mev/stats?opportunity_type=sandwich" \
  "" \
  200

# Test 9: Get MEV Stats (Filtered by Chain)
test_endpoint \
  "Get MEV Statistics - Filter by Ethereum Chain" \
  "GET" \
  "analytics/mev/stats?chain_id=ethereum" \
  "" \
  200

# Test 10: Detect MEV Opportunities (Sandwich)
test_endpoint \
  "Detect MEV Opportunities - Sandwich Attack" \
  "POST" \
  "analytics/mev/detect" \
  '{"chain_id":"ethereum","detection_type":"sandwich","block_number":18500000}' \
  200

# Test 11: Detect MEV Opportunities (Frontrun)
test_endpoint \
  "Detect MEV Opportunities - Frontrunning" \
  "POST" \
  "analytics/mev/detect" \
  '{"chain_id":"ethereum","detection_type":"frontrun","block_number":18500000}' \
  200

# Test 12: Detect MEV Opportunities (Arbitrage)
test_endpoint \
  "Detect MEV Opportunities - Arbitrage" \
  "POST" \
  "analytics/mev/detect" \
  '{"chain_id":"ethereum","detection_type":"arbitrage","token_address":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"}' \
  200

# Test 13: Detect MEV Opportunities (Liquidation)
test_endpoint \
  "Detect MEV Opportunities - Liquidation" \
  "POST" \
  "analytics/mev/detect" \
  '{"chain_id":"ethereum","detection_type":"liquidation","protocol_id":"aave-v3"}' \
  200

# Test 14: Detect MEV Opportunities (Backrun)
test_endpoint \
  "Detect MEV Opportunities - Backrunning" \
  "POST" \
  "analytics/mev/detect" \
  '{"chain_id":"ethereum","detection_type":"backrun","block_number":18500000}' \
  200

# Test 15: Error Handling - Invalid Chain ID
test_endpoint \
  "Error Handling - Invalid Chain ID" \
  "GET" \
  "analytics/mev/opportunities?chain_id=invalid_chain" \
  "" \
  400

# Test 16: Error Handling - Invalid Opportunity Type
test_endpoint \
  "Error Handling - Invalid Opportunity Type" \
  "GET" \
  "analytics/mev/opportunities?opportunity_type=invalid_type" \
  "" \
  400

# Test 17: Error Handling - Invalid Sort Field
test_endpoint \
  "Error Handling - Invalid Sort Field" \
  "GET" \
  "analytics/mev/opportunities?sort_by=invalid_field" \
  "" \
  400

# Test 18: Error Handling - Invalid Detection Type
test_endpoint \
  "Error Handling - Invalid Detection Type" \
  "POST" \
  "analytics/mev/detect" \
  '{"chain_id":"ethereum","detection_type":"invalid_type"}' \
  400

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($TESTS_PASSED/$TOTAL_TESTS)*100}")

echo "Total Tests: $TOTAL_TESTS"
echo "Success Rate: $SUCCESS_RATE%"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
  exit 1
fi

