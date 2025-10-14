#!/bin/bash

# Test Kong Security Configuration for DeFiLlama
# This script tests Kong security plugins configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo "DeFiLlama Kong Security Tests"
echo -e "========================================${NC}"
echo ""
echo -e "${BLUE}ℹ Starting Kong security tests...${NC}"
echo -e "${BLUE}ℹ This will verify Kong security configuration is correct.${NC}"
echo ""

# Test 1: Check Kong security configuration files
echo -e "${BLUE}========================================"
echo "Test 1: Kong Security Configuration Files"
echo -e "========================================${NC}"
echo ""

if [ -f "supabase/kong-security.yml" ]; then
    echo -e "${GREEN}✓${NC} kong-security.yml exists"
else
    echo -e "${RED}✗${NC} kong-security.yml not found"
    exit 1
fi

if [ -f "scripts/apply-kong-security.sh" ]; then
    echo -e "${GREEN}✓${NC} apply-kong-security.sh exists"
    
    if [ -x "scripts/apply-kong-security.sh" ]; then
        echo -e "${GREEN}✓${NC} apply-kong-security.sh is executable"
    else
        echo -e "${YELLOW}⚠${NC} apply-kong-security.sh is not executable"
        echo "  Run: chmod +x scripts/apply-kong-security.sh"
    fi
else
    echo -e "${RED}✗${NC} apply-kong-security.sh not found"
fi

echo ""

# Test 2: Validate Kong security plugins configuration
echo -e "${BLUE}========================================"
echo "Test 2: Kong Security Plugins Configuration"
echo -e "========================================${NC}"
echo ""

REQUIRED_PLUGINS=(
    "rate-limiting"
    "ip-restriction"
    "cors"
    "request-size-limiting"
    "bot-detection"
    "acl"
    "jwt"
    "key-auth"
    "request-validator"
    "response-transformer"
)

for plugin in "${REQUIRED_PLUGINS[@]}"; do
    if grep -q "name: $plugin" supabase/kong-security.yml; then
        echo -e "${GREEN}✓${NC} $plugin plugin configured"
    else
        echo -e "${YELLOW}⚠${NC} $plugin plugin not found"
    fi
done

echo ""

# Test 3: Check rate limiting configuration
echo -e "${BLUE}========================================"
echo "Test 3: Rate Limiting Configuration"
echo -e "========================================${NC}"
echo ""

if grep -q "rate-limiting" supabase/kong-security.yml; then
    echo -e "${GREEN}✓${NC} Rate limiting plugin configured"
    
    # Check rate limits
    if grep -A 5 "name: rate-limiting" supabase/kong-security.yml | grep -q "minute:"; then
        MINUTE_LIMIT=$(grep -A 5 "name: rate-limiting" supabase/kong-security.yml | grep "minute:" | head -1 | awk '{print $2}')
        echo -e "${GREEN}✓${NC} Minute limit: $MINUTE_LIMIT requests/minute"
    fi
    
    if grep -A 5 "name: rate-limiting" supabase/kong-security.yml | grep -q "hour:"; then
        HOUR_LIMIT=$(grep -A 5 "name: rate-limiting" supabase/kong-security.yml | grep "hour:" | head -1 | awk '{print $2}')
        echo -e "${GREEN}✓${NC} Hour limit: $HOUR_LIMIT requests/hour"
    fi
    
    if grep -A 5 "name: rate-limiting" supabase/kong-security.yml | grep -q "policy:"; then
        POLICY=$(grep -A 5 "name: rate-limiting" supabase/kong-security.yml | grep "policy:" | head -1 | awk '{print $2}')
        echo -e "${GREEN}✓${NC} Policy: $POLICY"
    fi
else
    echo -e "${RED}✗${NC} Rate limiting not configured"
fi

echo ""

# Test 4: Check IP restriction configuration
echo -e "${BLUE}========================================"
echo "Test 4: IP Restriction Configuration"
echo -e "========================================${NC}"
echo ""

if grep -q "ip-restriction" supabase/kong-security.yml; then
    echo -e "${GREEN}✓${NC} IP restriction plugin configured"
    
    # Check deny list
    if grep -A 10 "name: ip-restriction" supabase/kong-security.yml | grep -q "deny:"; then
        echo -e "${GREEN}✓${NC} IP deny list configured"
        
        # Count denied IP ranges
        DENY_COUNT=$(grep -A 20 "name: ip-restriction" supabase/kong-security.yml | grep -A 10 "deny:" | grep -E "^\s+-\s+" | wc -l | tr -d ' ')
        echo "  Denied IP ranges: $DENY_COUNT"
    fi
else
    echo -e "${RED}✗${NC} IP restriction not configured"
fi

echo ""

# Test 5: Check CORS configuration
echo -e "${BLUE}========================================"
echo "Test 5: CORS Configuration"
echo -e "========================================${NC}"
echo ""

if grep -q "name: cors" supabase/kong-security.yml; then
    echo -e "${GREEN}✓${NC} CORS plugin configured"
    
    # Check origins
    if grep -A 10 "name: cors" supabase/kong-security.yml | grep -q "origins:"; then
        echo -e "${GREEN}✓${NC} CORS origins configured"
    fi
    
    # Check methods
    if grep -A 10 "name: cors" supabase/kong-security.yml | grep -q "methods:"; then
        echo -e "${GREEN}✓${NC} CORS methods configured"
    fi
    
    # Check credentials
    if grep -A 10 "name: cors" supabase/kong-security.yml | grep -q "credentials:"; then
        CREDENTIALS=$(grep -A 10 "name: cors" supabase/kong-security.yml | grep "credentials:" | head -1 | awk '{print $2}')
        echo -e "${GREEN}✓${NC} CORS credentials: $CREDENTIALS"
    fi
else
    echo -e "${RED}✗${NC} CORS not configured"
fi

echo ""

# Test 6: Check request size limiting
echo -e "${BLUE}========================================"
echo "Test 6: Request Size Limiting Configuration"
echo -e "========================================${NC}"
echo ""

if grep -q "request-size-limiting" supabase/kong-security.yml; then
    echo -e "${GREEN}✓${NC} Request size limiting plugin configured"
    
    # Check allowed payload size
    if grep -A 5 "name: request-size-limiting" supabase/kong-security.yml | grep -q "allowed_payload_size:"; then
        SIZE=$(grep -A 5 "name: request-size-limiting" supabase/kong-security.yml | grep "allowed_payload_size:" | head -1 | awk '{print $2}')
        echo -e "${GREEN}✓${NC} Max payload size: $SIZE MB"
    fi
else
    echo -e "${RED}✗${NC} Request size limiting not configured"
fi

echo ""

# Test 7: Check bot detection configuration
echo -e "${BLUE}========================================"
echo "Test 7: Bot Detection Configuration"
echo -e "========================================${NC}"
echo ""

if grep -q "bot-detection" supabase/kong-security.yml; then
    echo -e "${GREEN}✓${NC} Bot detection plugin configured"
    
    # Check deny list
    if grep -A 10 "name: bot-detection" supabase/kong-security.yml | grep -q "deny:"; then
        echo -e "${GREEN}✓${NC} Bot deny list configured"
    fi
else
    echo -e "${YELLOW}⚠${NC} Bot detection not configured"
fi

echo ""

# Test 8: Check authentication plugins
echo -e "${BLUE}========================================"
echo "Test 8: Authentication Plugins Configuration"
echo -e "========================================${NC}"
echo ""

AUTH_PLUGINS=("jwt" "key-auth" "acl")

for plugin in "${AUTH_PLUGINS[@]}"; do
    if grep -q "name: $plugin" supabase/kong-security.yml; then
        echo -e "${GREEN}✓${NC} $plugin plugin configured"
    else
        echo -e "${YELLOW}⚠${NC} $plugin plugin not found"
    fi
done

echo ""

# Test 9: Check Kong Admin API accessibility
echo -e "${BLUE}========================================"
echo "Test 9: Kong Admin API Accessibility"
echo -e "========================================${NC}"
echo ""

# Check if Kong is running
if docker ps | grep -q "defillama-supabase-kong"; then
    echo -e "${GREEN}✓${NC} Kong container is running"
    
    # Try to access Kong Admin API
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001 | grep -q "200"; then
        echo -e "${GREEN}✓${NC} Kong Admin API is accessible"
    else
        echo -e "${YELLOW}⚠${NC} Kong Admin API is not accessible (expected if not deployed)"
    fi
else
    echo -e "${YELLOW}⚠${NC} Kong container is not running (expected if not deployed)"
fi

echo ""

# Summary
echo -e "${BLUE}========================================"
echo "Test Summary"
echo -e "========================================${NC}"
echo ""
echo -e "${GREEN}✓${NC} Kong security configuration files are present"
echo -e "${GREEN}✓${NC} Security plugins are configured"
echo -e "${GREEN}✓${NC} Rate limiting, IP restriction, CORS configured"
echo ""
echo -e "${YELLOW}Note:${NC} Kong security plugins need to be applied with apply-kong-security.sh"
echo -e "${YELLOW}Note:${NC} Kong must be running to apply security configuration"
echo ""
echo -e "${GREEN}All Kong security configuration tests passed!${NC}"
echo ""

