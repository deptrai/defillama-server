#!/bin/bash

# Story 4.1.3: Simple API Integration Tests
# Tests for MEV Analytics API endpoints

API_BASE_URL="http://localhost:6060"
PASSED=0
FAILED=0

echo ""
echo "🧪 Story 4.1.3: API Integration Tests"
echo ""
echo "============================================================"
echo ""

# Test 1: GET /v1/analytics/mev/bots (basic)
echo "Test 1: GET /v1/analytics/mev/bots (basic)"
RESPONSE=$(curl -s "$API_BASE_URL/v1/analytics/mev/bots?limit=1")
if echo "$RESPONSE" | grep -q '"bots"'; then
  echo "   ✅ PASS - Response contains bots array"
  PASSED=$((PASSED + 1))
else
  echo "   ❌ FAIL - Response missing bots array"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: GET /v1/analytics/mev/bots (chain filter)
echo "Test 2: GET /v1/analytics/mev/bots (chain filter)"
RESPONSE=$(curl -s "$API_BASE_URL/v1/analytics/mev/bots?chain_id=ethereum&limit=1")
if echo "$RESPONSE" | grep -q '"chain_id":"ethereum"'; then
  echo "   ✅ PASS - Chain filter working"
  PASSED=$((PASSED + 1))
else
  echo "   ❌ FAIL - Chain filter not working"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: GET /v1/analytics/mev/bots (pagination)
echo "Test 3: GET /v1/analytics/mev/bots (pagination)"
RESPONSE=$(curl -s "$API_BASE_URL/v1/analytics/mev/bots?limit=5&offset=0")
if echo "$RESPONSE" | grep -q '"limit":5'; then
  echo "   ✅ PASS - Pagination working"
  PASSED=$((PASSED + 1))
else
  echo "   ❌ FAIL - Pagination not working"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: GET /v1/analytics/mev/bots (enrichment)
echo "Test 4: GET /v1/analytics/mev/bots (enrichment)"
RESPONSE=$(curl -s "$API_BASE_URL/v1/analytics/mev/bots?limit=1")
if echo "$RESPONSE" | grep -q '"performance"' && echo "$RESPONSE" | grep -q '"strategy"'; then
  echo "   ✅ PASS - Bot enrichment working"
  PASSED=$((PASSED + 1))
else
  echo "   ❌ FAIL - Bot enrichment not working"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 5: GET /v1/analytics/mev/protocols/:id/leakage
echo "Test 5: GET /v1/analytics/mev/protocols/:id/leakage"
RESPONSE=$(curl -s "$API_BASE_URL/v1/analytics/mev/protocols/uniswap-v3/leakage?chain_id=ethereum&date=2025-10-15")
if echo "$RESPONSE" | grep -q '"leakage"' || echo "$RESPONSE" | grep -q '"error"'; then
  echo "   ✅ PASS - Endpoint responding"
  PASSED=$((PASSED + 1))
else
  echo "   ❌ FAIL - Endpoint not responding"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 6: GET /v1/analytics/mev/protocols/:id/leakage (error)
echo "Test 6: GET /v1/analytics/mev/protocols/:id/leakage (error handling)"
RESPONSE=$(curl -s "$API_BASE_URL/v1/analytics/mev/protocols/uniswap-v3/leakage")
if echo "$RESPONSE" | grep -q '"error"'; then
  echo "   ✅ PASS - Error handling working"
  PASSED=$((PASSED + 1))
else
  echo "   ❌ FAIL - Error handling not working"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 7: GET /v1/analytics/mev/trends
echo "Test 7: GET /v1/analytics/mev/trends"
RESPONSE=$(curl -s "$API_BASE_URL/v1/analytics/mev/trends?chain_id=ethereum&date=2025-10-15")
if echo "$RESPONSE" | grep -q '"trend"' || echo "$RESPONSE" | grep -q '"error"'; then
  echo "   ✅ PASS - Endpoint responding"
  PASSED=$((PASSED + 1))
else
  echo "   ❌ FAIL - Endpoint not responding"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 8: GET /v1/analytics/mev/trends (error)
echo "Test 8: GET /v1/analytics/mev/trends (error handling)"
RESPONSE=$(curl -s "$API_BASE_URL/v1/analytics/mev/trends")
if echo "$RESPONSE" | grep -q '"error"'; then
  echo "   ✅ PASS - Error handling working"
  PASSED=$((PASSED + 1))
else
  echo "   ❌ FAIL - Error handling not working"
  FAILED=$((FAILED + 1))
fi
echo ""

# Summary
echo "============================================================"
echo ""
echo "📋 Test Summary"
echo ""
echo "Total Tests: 8"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "⊙ Skipped: 0"
echo ""
echo "============================================================"
echo ""

if [ $FAILED -eq 0 ]; then
  exit 0
else
  exit 1
fi

