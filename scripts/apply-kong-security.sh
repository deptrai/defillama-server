#!/bin/bash

# Apply Kong Security Configuration for DeFiLlama
# This script applies security plugins to Kong API Gateway

set -e

# Configuration
KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://localhost:8001}"
KONG_CONFIG_FILE="${KONG_CONFIG_FILE:-supabase/kong-security.yml}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== DeFiLlama Kong Security Configuration ===${NC}"
echo ""

# Check if Kong is running
echo -e "${GREEN}Checking Kong status...${NC}"
if ! curl -s -f "$KONG_ADMIN_URL" > /dev/null; then
    echo -e "${RED}Error: Kong Admin API is not accessible at $KONG_ADMIN_URL${NC}"
    echo "Please ensure Kong is running:"
    echo "  docker-compose -f docker-compose.supabase.yml up -d kong"
    exit 1
fi
echo -e "${GREEN}Kong is running${NC}"
echo ""

# Check if deck is installed
if ! command -v deck &> /dev/null; then
    echo -e "${YELLOW}Warning: deck CLI is not installed${NC}"
    echo "Installing deck..."
    
    # Detect OS
    OS="$(uname -s)"
    case "${OS}" in
        Linux*)     
            curl -sL https://github.com/Kong/deck/releases/download/v1.28.2/deck_1.28.2_linux_amd64.tar.gz -o deck.tar.gz
            tar -xf deck.tar.gz -C /tmp
            sudo mv /tmp/deck /usr/local/bin/
            rm deck.tar.gz
            ;;
        Darwin*)    
            curl -sL https://github.com/Kong/deck/releases/download/v1.28.2/deck_1.28.2_darwin_amd64.tar.gz -o deck.tar.gz
            tar -xf deck.tar.gz -C /tmp
            sudo mv /tmp/deck /usr/local/bin/
            rm deck.tar.gz
            ;;
        *)          
            echo -e "${RED}Unsupported OS: ${OS}${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}deck installed successfully${NC}"
fi
echo ""

# Validate configuration file
echo -e "${GREEN}Validating configuration file...${NC}"
if [ ! -f "$KONG_CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file not found: $KONG_CONFIG_FILE${NC}"
    exit 1
fi

if ! deck validate --state "$KONG_CONFIG_FILE"; then
    echo -e "${RED}Error: Configuration file validation failed${NC}"
    exit 1
fi
echo -e "${GREEN}Configuration file is valid${NC}"
echo ""

# Backup current configuration
echo -e "${GREEN}Backing up current Kong configuration...${NC}"
BACKUP_FILE="kong-backup-$(date +%Y%m%d-%H%M%S).yml"
deck dump --output-file "$BACKUP_FILE" --kong-addr "$KONG_ADMIN_URL"
echo -e "${GREEN}Backup saved to: $BACKUP_FILE${NC}"
echo ""

# Show diff
echo -e "${GREEN}Showing configuration diff...${NC}"
deck diff --state "$KONG_CONFIG_FILE" --kong-addr "$KONG_ADMIN_URL" || true
echo ""

# Confirm before applying
read -p "Do you want to apply this configuration? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Configuration not applied"
    exit 0
fi

# Apply configuration
echo -e "${GREEN}Applying Kong security configuration...${NC}"
if deck sync --state "$KONG_CONFIG_FILE" --kong-addr "$KONG_ADMIN_URL"; then
    echo -e "${GREEN}Configuration applied successfully${NC}"
else
    echo -e "${RED}Error: Failed to apply configuration${NC}"
    echo "Restoring from backup..."
    deck sync --state "$BACKUP_FILE" --kong-addr "$KONG_ADMIN_URL"
    echo -e "${YELLOW}Configuration restored from backup${NC}"
    exit 1
fi
echo ""

# Verify configuration
echo -e "${GREEN}Verifying configuration...${NC}"
echo "Services:"
curl -s "$KONG_ADMIN_URL/services" | jq -r '.data[] | "  - \(.name)"'
echo ""
echo "Routes:"
curl -s "$KONG_ADMIN_URL/routes" | jq -r '.data[] | "  - \(.name)"'
echo ""
echo "Plugins:"
curl -s "$KONG_ADMIN_URL/plugins" | jq -r '.data[] | "  - \(.name) (\(.enabled))"'
echo ""

echo -e "${GREEN}=== Kong security configuration complete! ===${NC}"
echo ""
echo "Backup saved to: $BACKUP_FILE"
echo ""
echo "To rollback, run:"
echo "  deck sync --state $BACKUP_FILE --kong-addr $KONG_ADMIN_URL"
echo ""

