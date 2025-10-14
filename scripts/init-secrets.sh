#!/bin/bash

# Initialize Docker Secrets for DeFiLlama
# Generates secure random secrets and stores them in files

set -e

# Configuration
SECRETS_DIR="./secrets"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== DeFiLlama Secrets Initialization ===${NC}"
echo ""

# Create secrets directory
echo -e "${GREEN}Creating secrets directory...${NC}"
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

# Function to generate random secret
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 "$length" | tr -d '\n'
}

# Function to create secret file
create_secret() {
    local name=$1
    local value=$2
    local file="$SECRETS_DIR/${name}.txt"
    
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Secret already exists: $name${NC}"
        read -p "Do you want to regenerate it? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Keeping existing secret: $name"
            return
        fi
    fi
    
    echo "$value" > "$file"
    chmod 600 "$file"
    echo -e "${GREEN}Created secret: $name${NC}"
}

# Generate database secrets
echo -e "${GREEN}Generating database secrets...${NC}"
create_secret "postgres_password" "$(generate_secret 32)"
create_secret "postgres_jwt_secret" "$(generate_secret 64)"
echo ""

# Generate API secrets
echo -e "${GREEN}Generating API secrets...${NC}"
create_secret "anon_key" "$(generate_secret 64)"
create_secret "service_role_key" "$(generate_secret 64)"
echo ""

# Generate auth secrets
echo -e "${GREEN}Generating auth secrets...${NC}"
create_secret "jwt_secret" "$(generate_secret 64)"

# SMTP password (user input)
if [ ! -f "$SECRETS_DIR/smtp_password.txt" ]; then
    echo -e "${YELLOW}Enter SMTP password (or press Enter to generate random):${NC}"
    read -s smtp_pass
    if [ -z "$smtp_pass" ]; then
        smtp_pass=$(generate_secret 32)
    fi
    create_secret "smtp_password" "$smtp_pass"
else
    echo -e "${YELLOW}SMTP password already exists${NC}"
fi
echo ""

# External API keys (user input)
echo -e "${GREEN}Generating external API keys...${NC}"

if [ ! -f "$SECRETS_DIR/defillama_api_key.txt" ]; then
    echo -e "${YELLOW}Enter DeFiLlama API key (or press Enter to skip):${NC}"
    read defillama_key
    if [ -n "$defillama_key" ]; then
        create_secret "defillama_api_key" "$defillama_key"
    else
        create_secret "defillama_api_key" "placeholder-key"
        echo -e "${YELLOW}Created placeholder key. Update later.${NC}"
    fi
else
    echo -e "${YELLOW}DeFiLlama API key already exists${NC}"
fi

if [ ! -f "$SECRETS_DIR/etherscan_api_key.txt" ]; then
    echo -e "${YELLOW}Enter Etherscan API key (or press Enter to skip):${NC}"
    read etherscan_key
    if [ -n "$etherscan_key" ]; then
        create_secret "etherscan_api_key" "$etherscan_key"
    else
        create_secret "etherscan_api_key" "placeholder-key"
        echo -e "${YELLOW}Created placeholder key. Update later.${NC}"
    fi
else
    echo -e "${YELLOW}Etherscan API key already exists${NC}"
fi
echo ""

# Monitoring secrets
echo -e "${GREEN}Generating monitoring secrets...${NC}"
create_secret "grafana_admin_password" "$(generate_secret 32)"

if [ ! -f "$SECRETS_DIR/alertmanager_slack_webhook.txt" ]; then
    echo -e "${YELLOW}Enter Slack webhook URL (or press Enter to skip):${NC}"
    read slack_webhook
    if [ -n "$slack_webhook" ]; then
        create_secret "alertmanager_slack_webhook" "$slack_webhook"
    else
        create_secret "alertmanager_slack_webhook" "https://hooks.slack.com/services/placeholder"
        echo -e "${YELLOW}Created placeholder webhook. Update later.${NC}"
    fi
else
    echo -e "${YELLOW}Slack webhook already exists${NC}"
fi
echo ""

# Create .gitignore for secrets
echo -e "${GREEN}Creating .gitignore for secrets...${NC}"
cat > "$SECRETS_DIR/.gitignore" << EOF
# Ignore all secret files
*.txt

# Except this .gitignore
!.gitignore
EOF
echo ""

# Create secrets summary
echo -e "${GREEN}=== Secrets Summary ===${NC}"
echo ""
echo "Secrets directory: $SECRETS_DIR"
echo "Total secrets: $(ls -1 "$SECRETS_DIR"/*.txt 2>/dev/null | wc -l)"
echo ""
echo "Database secrets:"
echo "  - postgres_password"
echo "  - postgres_jwt_secret"
echo ""
echo "API secrets:"
echo "  - anon_key"
echo "  - service_role_key"
echo ""
echo "Auth secrets:"
echo "  - jwt_secret"
echo "  - smtp_password"
echo ""
echo "External API keys:"
echo "  - defillama_api_key"
echo "  - etherscan_api_key"
echo ""
echo "Monitoring secrets:"
echo "  - grafana_admin_password"
echo "  - alertmanager_slack_webhook"
echo ""

echo -e "${GREEN}=== Secrets initialization complete! ===${NC}"
echo ""
echo "IMPORTANT:"
echo "  1. Secrets are stored in: $SECRETS_DIR"
echo "  2. Secrets directory is protected with chmod 700"
echo "  3. Secret files are protected with chmod 600"
echo "  4. Secrets are excluded from git via .gitignore"
echo "  5. NEVER commit secrets to version control"
echo ""
echo "To use secrets with Docker Compose:"
echo "  docker-compose -f docker-compose.secrets.yml up -d"
echo ""
echo "To rotate secrets:"
echo "  ./scripts/rotate-secrets.sh"
echo ""

