#!/bin/bash

# Rotate Docker Secrets for DeFiLlama
# Generates new secrets and updates Docker services

set -e

# Configuration
SECRETS_DIR="./secrets"
BACKUP_DIR="./secrets/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== DeFiLlama Secrets Rotation ===${NC}"
echo "Date: $(date)"
echo ""

# Check if secrets directory exists
if [ ! -d "$SECRETS_DIR" ]; then
    echo -e "${RED}Error: Secrets directory not found: $SECRETS_DIR${NC}"
    echo "Please run init-secrets.sh first"
    exit 1
fi

# Create backup directory
echo -e "${GREEN}Creating backup directory...${NC}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Backup current secrets
BACKUP_FILE="$BACKUP_DIR/secrets-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
echo -e "${GREEN}Backing up current secrets...${NC}"
tar -czf "$BACKUP_FILE" -C "$SECRETS_DIR" $(ls "$SECRETS_DIR"/*.txt 2>/dev/null | xargs -n1 basename)
chmod 600 "$BACKUP_FILE"
echo -e "${GREEN}Backup saved to: $BACKUP_FILE${NC}"
echo ""

# Function to generate random secret
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 "$length" | tr -d '\n'
}

# Function to rotate secret
rotate_secret() {
    local name=$1
    local file="$SECRETS_DIR/${name}.txt"
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}Secret not found: $name${NC}"
        return
    fi
    
    echo -e "${GREEN}Rotating secret: $name${NC}"
    local new_value=$(generate_secret 64)
    echo "$new_value" > "$file"
    chmod 600 "$file"
}

# Select secrets to rotate
echo -e "${GREEN}Select secrets to rotate:${NC}"
echo "1. All secrets"
echo "2. Database secrets only"
echo "3. API secrets only"
echo "4. Auth secrets only"
echo "5. Monitoring secrets only"
echo "6. Custom selection"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo -e "${GREEN}Rotating all secrets...${NC}"
        rotate_secret "postgres_password"
        rotate_secret "postgres_jwt_secret"
        rotate_secret "anon_key"
        rotate_secret "service_role_key"
        rotate_secret "jwt_secret"
        rotate_secret "grafana_admin_password"
        ;;
    2)
        echo -e "${GREEN}Rotating database secrets...${NC}"
        rotate_secret "postgres_password"
        rotate_secret "postgres_jwt_secret"
        ;;
    3)
        echo -e "${GREEN}Rotating API secrets...${NC}"
        rotate_secret "anon_key"
        rotate_secret "service_role_key"
        ;;
    4)
        echo -e "${GREEN}Rotating auth secrets...${NC}"
        rotate_secret "jwt_secret"
        ;;
    5)
        echo -e "${GREEN}Rotating monitoring secrets...${NC}"
        rotate_secret "grafana_admin_password"
        ;;
    6)
        echo -e "${GREEN}Custom selection:${NC}"
        echo "Enter secret names (space-separated):"
        read -a secrets
        for secret in "${secrets[@]}"; do
            rotate_secret "$secret"
        done
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
echo ""

# Restart services
echo -e "${GREEN}Restarting services to apply new secrets...${NC}"
read -p "Do you want to restart services now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Restarting services...${NC}"
    docker-compose -f docker-compose.secrets.yml down
    docker-compose -f docker-compose.secrets.yml up -d
    echo -e "${GREEN}Services restarted${NC}"
else
    echo -e "${YELLOW}Services not restarted. Remember to restart manually:${NC}"
    echo "  docker-compose -f docker-compose.secrets.yml down"
    echo "  docker-compose -f docker-compose.secrets.yml up -d"
fi
echo ""

echo -e "${GREEN}=== Secrets rotation complete! ===${NC}"
echo ""
echo "Backup saved to: $BACKUP_FILE"
echo ""
echo "To rollback, run:"
echo "  tar -xzf $BACKUP_FILE -C $SECRETS_DIR"
echo "  docker-compose -f docker-compose.secrets.yml down"
echo "  docker-compose -f docker-compose.secrets.yml up -d"
echo ""

