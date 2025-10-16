#!/usr/bin/env bash

# Comprehensive API Endpoint Testing Script
# Tests all endpoints from Stories 2.2.2, 2.2.3, 3.1.1, and 3.1.2

set -e

BASE_URL="http://localhost:5001/v1"

echo "🧪 Comprehensive API Endpoint Testing"
echo "======================================"
echo ""

# Test wallet address from seed data
WALLET_ADDRESS="0x1234567890abcdef1234567890abcdef12345678"
TOKEN_ADDRESS="0xdac17f958d2ee523a2206206994597c13d831ec7" # USDT
USER_ID="user123"

echo "📍 Test Configuration:"
echo "  - Base URL: $BASE_URL"
echo "  - Wallet Address: $WALLET_ADDRESS"
echo "  - Token Address: $TOKEN_ADDRESS"
echo "  - User ID: $USER_ID"
echo ""

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    
    echo "Testing: $name"
    echo "  URL: $url"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "404" ]; then
        echo "  ✅ Status: $http_code"
        echo "  Response: ${body:0:100}..."
    else
        echo "  ❌ Status: $http_code"
        echo "  Error: $body"
    fi
    echo ""
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Story 3.1.2: Trade Pattern Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint \
    "Get Wallet Patterns" \
    "$BASE_URL/analytics/smart-money/wallets/$WALLET_ADDRESS/patterns"

test_endpoint \
    "Get Wallet Patterns (Filtered)" \
    "$BASE_URL/analytics/smart-money/wallets/$WALLET_ADDRESS/patterns?patternType=accumulation&limit=5"

test_endpoint \
    "Get Wallet Trades" \
    "$BASE_URL/analytics/smart-money/wallets/$WALLET_ADDRESS/trades"

test_endpoint \
    "Get Wallet Trades (Filtered)" \
    "$BASE_URL/analytics/smart-money/wallets/$WALLET_ADDRESS/trades?tradeType=buy&limit=5"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Story 3.1.1: Smart Money Identification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint \
    "Get Smart Money Wallets" \
    "$BASE_URL/analytics/smart-money/wallets?minScore=70&limit=10"

test_endpoint \
    "Get Wallet Details" \
    "$BASE_URL/analytics/smart-money/wallets/$WALLET_ADDRESS"

test_endpoint \
    "Get Wallet Metrics" \
    "$BASE_URL/analytics/smart-money/wallets/$WALLET_ADDRESS/metrics"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Story 2.2.2: Holder Distribution Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint \
    "Get Holder Distribution" \
    "$BASE_URL/analytics/tokens/$TOKEN_ADDRESS/holders/distribution"

test_endpoint \
    "Get Top Holders" \
    "$BASE_URL/analytics/tokens/$TOKEN_ADDRESS/holders/top?limit=10"

test_endpoint \
    "Get Holder Behavior" \
    "$BASE_URL/analytics/tokens/$TOKEN_ADDRESS/holders/behavior"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Story 2.2.3: Cross-chain Portfolio"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint \
    "Get Cross-chain Portfolio" \
    "$BASE_URL/analytics/portfolio/cross-chain/$USER_ID"

test_endpoint \
    "Get Cross-chain Holdings" \
    "$BASE_URL/analytics/portfolio/cross-chain/$USER_ID/holdings"

test_endpoint \
    "Get Cross-chain Performance" \
    "$BASE_URL/analytics/portfolio/cross-chain/$USER_ID/performance"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Testing Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

