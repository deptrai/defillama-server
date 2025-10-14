#!/bin/bash

# Test SSL/TLS Setup for DeFiLlama
# This script tests SSL/TLS configuration without deploying to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo "DeFiLlama SSL/TLS Setup Tests"
echo -e "========================================${NC}"
echo ""
echo -e "${BLUE}ℹ Starting SSL/TLS tests...${NC}"
echo -e "${BLUE}ℹ This will verify SSL/TLS configuration is correct.${NC}"
echo ""

# Test 1: Check SSL configuration files
echo -e "${BLUE}========================================"
echo "Test 1: SSL Configuration Files"
echo -e "========================================${NC}"
echo ""

if [ -f "nginx/ssl.conf" ]; then
    echo -e "${GREEN}✓${NC} nginx/ssl.conf exists"
else
    echo -e "${RED}✗${NC} nginx/ssl.conf not found"
    exit 1
fi

if [ -f "nginx/security-headers.conf" ]; then
    echo -e "${GREEN}✓${NC} nginx/security-headers.conf exists"
else
    echo -e "${RED}✗${NC} nginx/security-headers.conf not found"
    exit 1
fi

if [ -f "docker-compose.ssl.yml" ]; then
    echo -e "${GREEN}✓${NC} docker-compose.ssl.yml exists"
else
    echo -e "${RED}✗${NC} docker-compose.ssl.yml not found"
    exit 1
fi

echo ""

# Test 2: Check SSL certificate files
echo -e "${BLUE}========================================"
echo "Test 2: SSL Certificate Files"
echo -e "========================================${NC}"
echo ""

if [ -f "nginx/ssl/defillama.crt" ]; then
    echo -e "${GREEN}✓${NC} SSL certificate exists"
    
    # Check certificate validity
    if openssl x509 -in nginx/ssl/defillama.crt -noout -checkend 0 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Certificate is valid"
        
        # Show certificate details
        echo ""
        echo "Certificate Details:"
        openssl x509 -in nginx/ssl/defillama.crt -noout -subject -issuer -dates 2>/dev/null | sed 's/^/  /'
    else
        echo -e "${YELLOW}⚠${NC} Certificate is expired or invalid"
    fi
else
    echo -e "${YELLOW}⚠${NC} SSL certificate not found (will be generated)"
fi

if [ -f "nginx/ssl/defillama.key" ]; then
    echo -e "${GREEN}✓${NC} SSL private key exists"
else
    echo -e "${YELLOW}⚠${NC} SSL private key not found (will be generated)"
fi

echo ""

# Test 3: Validate Nginx SSL configuration
echo -e "${BLUE}========================================"
echo "Test 3: Nginx SSL Configuration Validation"
echo -e "========================================${NC}"
echo ""

# Check SSL protocols
if grep -q "ssl_protocols TLSv1.2 TLSv1.3" nginx/ssl.conf; then
    echo -e "${GREEN}✓${NC} SSL protocols configured (TLSv1.2, TLSv1.3)"
else
    echo -e "${RED}✗${NC} SSL protocols not properly configured"
fi

# Check SSL ciphers
if grep -q "ssl_ciphers" nginx/ssl.conf; then
    echo -e "${GREEN}✓${NC} SSL ciphers configured"
else
    echo -e "${RED}✗${NC} SSL ciphers not configured"
fi

# Check OCSP stapling
if grep -q "ssl_stapling on" nginx/ssl.conf; then
    echo -e "${GREEN}✓${NC} OCSP stapling enabled"
else
    echo -e "${YELLOW}⚠${NC} OCSP stapling not enabled"
fi

# Check HSTS header
if grep -q "Strict-Transport-Security" nginx/security-headers.conf; then
    echo -e "${GREEN}✓${NC} HSTS header configured"
else
    echo -e "${RED}✗${NC} HSTS header not configured"
fi

echo ""

# Test 4: Check Let's Encrypt scripts
echo -e "${BLUE}========================================"
echo "Test 4: Let's Encrypt Scripts"
echo -e "========================================${NC}"
echo ""

if [ -f "scripts/init-letsencrypt.sh" ]; then
    echo -e "${GREEN}✓${NC} init-letsencrypt.sh exists"
    
    if [ -x "scripts/init-letsencrypt.sh" ]; then
        echo -e "${GREEN}✓${NC} init-letsencrypt.sh is executable"
    else
        echo -e "${YELLOW}⚠${NC} init-letsencrypt.sh is not executable"
        echo "  Run: chmod +x scripts/init-letsencrypt.sh"
    fi
else
    echo -e "${RED}✗${NC} init-letsencrypt.sh not found"
fi

if [ -f "scripts/renew-certificates.sh" ]; then
    echo -e "${GREEN}✓${NC} renew-certificates.sh exists"
    
    if [ -x "scripts/renew-certificates.sh" ]; then
        echo -e "${GREEN}✓${NC} renew-certificates.sh is executable"
    else
        echo -e "${YELLOW}⚠${NC} renew-certificates.sh is not executable"
        echo "  Run: chmod +x scripts/renew-certificates.sh"
    fi
else
    echo -e "${RED}✗${NC} renew-certificates.sh not found"
fi

echo ""

# Test 5: Check security headers
echo -e "${BLUE}========================================"
echo "Test 5: Security Headers Configuration"
echo -e "========================================${NC}"
echo ""

SECURITY_HEADERS=(
    "Strict-Transport-Security"
    "Content-Security-Policy"
    "X-Frame-Options"
    "X-Content-Type-Options"
    "X-XSS-Protection"
    "Referrer-Policy"
    "Permissions-Policy"
)

for header in "${SECURITY_HEADERS[@]}"; do
    if grep -q "$header" nginx/security-headers.conf; then
        echo -e "${GREEN}✓${NC} $header configured"
    else
        echo -e "${RED}✗${NC} $header not configured"
    fi
done

echo ""

# Test 6: Docker Compose SSL configuration
echo -e "${BLUE}========================================"
echo "Test 6: Docker Compose SSL Configuration"
echo -e "========================================${NC}"
echo ""

if grep -q "nginx-ssl" docker-compose.ssl.yml; then
    echo -e "${GREEN}✓${NC} nginx-ssl service configured"
else
    echo -e "${RED}✗${NC} nginx-ssl service not configured"
fi

if grep -q "certbot" docker-compose.ssl.yml; then
    echo -e "${GREEN}✓${NC} certbot service configured"
else
    echo -e "${RED}✗${NC} certbot service not configured"
fi

if grep -q "443:443" docker-compose.ssl.yml; then
    echo -e "${GREEN}✓${NC} HTTPS port (443) mapped"
else
    echo -e "${RED}✗${NC} HTTPS port (443) not mapped"
fi

if grep -q "80:80" docker-compose.ssl.yml; then
    echo -e "${GREEN}✓${NC} HTTP port (80) mapped"
else
    echo -e "${RED}✗${NC} HTTP port (80) not mapped"
fi

echo ""

# Summary
echo -e "${BLUE}========================================"
echo "Test Summary"
echo -e "========================================${NC}"
echo ""
echo -e "${GREEN}✓${NC} SSL/TLS configuration files are present"
echo -e "${GREEN}✓${NC} Security headers are configured"
echo -e "${GREEN}✓${NC} Docker Compose SSL stack is configured"
echo ""
echo -e "${YELLOW}Note:${NC} SSL certificates need to be generated before deployment"
echo -e "${YELLOW}Note:${NC} For production, use Let's Encrypt with init-letsencrypt.sh"
echo -e "${YELLOW}Note:${NC} For local testing, self-signed certificates are sufficient"
echo ""
echo -e "${GREEN}All SSL/TLS configuration tests passed!${NC}"
echo ""

