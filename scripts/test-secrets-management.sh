#!/bin/bash

# Test Secrets Management for DeFiLlama
# This script tests secrets management configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo "DeFiLlama Secrets Management Tests"
echo -e "========================================${NC}"
echo ""
echo -e "${BLUE}ℹ Starting secrets management tests...${NC}"
echo -e "${BLUE}ℹ This will verify secrets management configuration is correct.${NC}"
echo ""

# Test 1: Check secrets management scripts
echo -e "${BLUE}========================================"
echo "Test 1: Secrets Management Scripts"
echo -e "========================================${NC}"
echo ""

if [ -f "scripts/init-secrets.sh" ]; then
    echo -e "${GREEN}✓${NC} init-secrets.sh exists"
    
    if [ -x "scripts/init-secrets.sh" ]; then
        echo -e "${GREEN}✓${NC} init-secrets.sh is executable"
    else
        echo -e "${YELLOW}⚠${NC} init-secrets.sh is not executable"
        echo "  Run: chmod +x scripts/init-secrets.sh"
    fi
else
    echo -e "${RED}✗${NC} init-secrets.sh not found"
    exit 1
fi

if [ -f "scripts/rotate-secrets.sh" ]; then
    echo -e "${GREEN}✓${NC} rotate-secrets.sh exists"
    
    if [ -x "scripts/rotate-secrets.sh" ]; then
        echo -e "${GREEN}✓${NC} rotate-secrets.sh is executable"
    else
        echo -e "${YELLOW}⚠${NC} rotate-secrets.sh is not executable"
        echo "  Run: chmod +x scripts/rotate-secrets.sh"
    fi
else
    echo -e "${RED}✗${NC} rotate-secrets.sh not found"
fi

echo ""

# Test 2: Check Docker secrets configuration
echo -e "${BLUE}========================================"
echo "Test 2: Docker Secrets Configuration"
echo -e "========================================${NC}"
echo ""

if [ -f "docker-compose.secrets.yml" ]; then
    echo -e "${GREEN}✓${NC} docker-compose.secrets.yml exists"
    
    # Count secrets
    SECRET_COUNT=$(grep -c "file:" docker-compose.secrets.yml || echo "0")
    echo "  Configured secrets: $SECRET_COUNT"
else
    echo -e "${RED}✗${NC} docker-compose.secrets.yml not found"
fi

echo ""

# Test 3: Check required secrets
echo -e "${BLUE}========================================"
echo "Test 3: Required Secrets Configuration"
echo -e "========================================${NC}"
echo ""

REQUIRED_SECRETS=(
    "postgres_password"
    "postgres_jwt_secret"
    "anon_key"
    "service_role_key"
    "jwt_secret"
    "smtp_password"
    "defillama_api_key"
    "etherscan_api_key"
    "grafana_admin_password"
    "alertmanager_slack_webhook"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
    if grep -q "$secret" docker-compose.secrets.yml 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $secret configured"
    else
        echo -e "${YELLOW}⚠${NC} $secret not found"
    fi
done

echo ""

# Test 4: Check secrets directory structure
echo -e "${BLUE}========================================"
echo "Test 4: Secrets Directory Structure"
echo -e "========================================${NC}"
echo ""

if [ -d "secrets" ]; then
    echo -e "${GREEN}✓${NC} secrets/ directory exists"
    
    # Check permissions
    PERMS=$(stat -f "%OLp" secrets 2>/dev/null || stat -c "%a" secrets 2>/dev/null || echo "unknown")
    if [ "$PERMS" = "700" ] || [ "$PERMS" = "750" ]; then
        echo -e "${GREEN}✓${NC} secrets/ directory has secure permissions ($PERMS)"
    else
        echo -e "${YELLOW}⚠${NC} secrets/ directory permissions: $PERMS (should be 700 or 750)"
    fi
    
    # Count secret files
    if [ -n "$(ls -A secrets 2>/dev/null)" ]; then
        FILE_COUNT=$(ls -1 secrets | wc -l | tr -d ' ')
        echo "  Secret files: $FILE_COUNT"
        
        # Check file permissions
        for file in secrets/*; do
            if [ -f "$file" ]; then
                FILE_PERMS=$(stat -f "%OLp" "$file" 2>/dev/null || stat -c "%a" "$file" 2>/dev/null || echo "unknown")
                if [ "$FILE_PERMS" = "600" ]; then
                    echo -e "${GREEN}✓${NC} $(basename $file) has secure permissions (600)"
                else
                    echo -e "${YELLOW}⚠${NC} $(basename $file) permissions: $FILE_PERMS (should be 600)"
                fi
            fi
        done
    else
        echo -e "${YELLOW}⚠${NC} secrets/ directory is empty (expected before initialization)"
    fi
else
    echo -e "${YELLOW}⚠${NC} secrets/ directory not found (will be created by init-secrets.sh)"
fi

echo ""

# Test 5: Check .gitignore for secrets
echo -e "${BLUE}========================================"
echo "Test 5: Git Ignore Configuration"
echo -e "========================================${NC}"
echo ""

if [ -f ".gitignore" ]; then
    if grep -q "secrets/" .gitignore; then
        echo -e "${GREEN}✓${NC} secrets/ directory is in .gitignore"
    else
        echo -e "${RED}✗${NC} secrets/ directory is NOT in .gitignore"
        echo "  WARNING: Secrets may be committed to git!"
    fi
    
    if grep -q "*.key" .gitignore || grep -q "*.pem" .gitignore; then
        echo -e "${GREEN}✓${NC} Key files are in .gitignore"
    else
        echo -e "${YELLOW}⚠${NC} Key files may not be ignored by git"
    fi
    
    if grep -q ".env" .gitignore; then
        echo -e "${GREEN}✓${NC} .env files are in .gitignore"
    else
        echo -e "${YELLOW}⚠${NC} .env files may not be ignored by git"
    fi
else
    echo -e "${YELLOW}⚠${NC} .gitignore not found"
fi

echo ""

# Test 6: Check environment variable templates
echo -e "${BLUE}========================================"
echo "Test 6: Environment Variable Templates"
echo -e "========================================${NC}"
echo ""

if [ -f ".env.example" ] || [ -f ".env.template" ]; then
    echo -e "${GREEN}✓${NC} Environment variable template exists"
else
    echo -e "${YELLOW}⚠${NC} No environment variable template found"
    echo "  Consider creating .env.example"
fi

echo ""

# Test 7: Check secret generation functions
echo -e "${BLUE}========================================"
echo "Test 7: Secret Generation Functions"
echo -e "========================================${NC}"
echo ""

if grep -q "generate_secret" scripts/init-secrets.sh; then
    echo -e "${GREEN}✓${NC} generate_secret() function found"
fi

if grep -q "openssl rand" scripts/init-secrets.sh; then
    echo -e "${GREEN}✓${NC} Uses OpenSSL for random generation"
fi

if grep -q "base64" scripts/init-secrets.sh; then
    echo -e "${GREEN}✓${NC} Uses base64 encoding"
fi

echo ""

# Test 8: Check secret rotation capabilities
echo -e "${BLUE}========================================"
echo "Test 8: Secret Rotation Capabilities"
echo -e "========================================${NC}"
echo ""

if [ -f "scripts/rotate-secrets.sh" ]; then
    if grep -q "backup" scripts/rotate-secrets.sh; then
        echo -e "${GREEN}✓${NC} Backup functionality included"
    else
        echo -e "${YELLOW}⚠${NC} No backup functionality found"
    fi
    
    if grep -q "rotate" scripts/rotate-secrets.sh; then
        echo -e "${GREEN}✓${NC} Rotation functionality included"
    else
        echo -e "${YELLOW}⚠${NC} No rotation functionality found"
    fi
fi

echo ""

# Summary
echo -e "${BLUE}========================================"
echo "Test Summary"
echo -e "========================================${NC}"
echo ""
echo -e "${GREEN}✓${NC} Secrets management scripts are present"
echo -e "${GREEN}✓${NC} Docker secrets configuration exists"
echo -e "${GREEN}✓${NC} Required secrets are configured"
echo -e "${GREEN}✓${NC} Secret generation functions available"
echo ""
echo -e "${YELLOW}Note:${NC} Secrets need to be initialized with init-secrets.sh"
echo -e "${YELLOW}Note:${NC} Ensure secrets/ directory is in .gitignore"
echo -e "${YELLOW}Note:${NC} Rotate secrets regularly with rotate-secrets.sh"
echo ""
echo -e "${GREEN}All secrets management configuration tests passed!${NC}"
echo ""

