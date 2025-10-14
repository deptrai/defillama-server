#!/bin/bash

# Initialize Let's Encrypt SSL/TLS certificates for DeFiLlama
# This script obtains SSL certificates from Let's Encrypt using Certbot

set -e

# Configuration
DOMAIN="${DOMAIN:-defillama.local}"
EMAIL="${CERTBOT_EMAIL:-admin@defillama.com}"
STAGING="${CERTBOT_STAGING:-0}"
DATA_PATH="./certbot"
RSA_KEY_SIZE=4096

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== DeFiLlama Let's Encrypt Initialization ===${NC}"
echo ""

# Check if domain is set
if [ "$DOMAIN" = "defillama.local" ]; then
    echo -e "${RED}Error: DOMAIN environment variable is not set${NC}"
    echo "Please set DOMAIN to your actual domain name"
    echo "Example: export DOMAIN=defillama.com"
    exit 1
fi

# Check if email is set
if [ "$EMAIL" = "admin@defillama.com" ]; then
    echo -e "${YELLOW}Warning: Using default email address${NC}"
    echo "Consider setting CERTBOT_EMAIL environment variable"
fi

echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Staging: $STAGING"
echo ""

# Create directories
echo -e "${GREEN}Creating directories...${NC}"
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
mkdir -p "$DATA_PATH/www"
mkdir -p "$DATA_PATH/logs"

# Check if certificates already exist
if [ -d "$DATA_PATH/conf/live/$DOMAIN" ] && [ -f "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${YELLOW}Existing certificates found for $DOMAIN${NC}"
    read -p "Do you want to replace them? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing certificates"
        exit 0
    fi
    echo "Removing existing certificates..."
    rm -rf "$DATA_PATH/conf/live/$DOMAIN"
    rm -rf "$DATA_PATH/conf/archive/$DOMAIN"
    rm -rf "$DATA_PATH/conf/renewal/$DOMAIN.conf"
fi

# Download recommended TLS parameters
echo -e "${GREEN}Downloading recommended TLS parameters...${NC}"
if [ ! -e "$DATA_PATH/conf/options-ssl-nginx.conf" ] || [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
    echo "Downloading options-ssl-nginx.conf..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$DATA_PATH/conf/options-ssl-nginx.conf"
    
    echo "Downloading ssl-dhparams.pem..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$DATA_PATH/conf/ssl-dhparams.pem"
fi
echo ""

# Create dummy certificate for nginx to start
echo -e "${GREEN}Creating dummy certificate for $DOMAIN...${NC}"
path="/etc/letsencrypt/live/$DOMAIN"
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
docker-compose -f docker-compose.ssl.yml run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo ""

# Start nginx
echo -e "${GREEN}Starting nginx...${NC}"
docker-compose -f docker-compose.ssl.yml up -d nginx-ssl
echo ""

# Delete dummy certificate
echo -e "${GREEN}Deleting dummy certificate for $DOMAIN...${NC}"
docker-compose -f docker-compose.ssl.yml run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot
echo ""

# Request Let's Encrypt certificate
echo -e "${GREEN}Requesting Let's Encrypt certificate for $DOMAIN...${NC}"

# Select appropriate email arg
case "$EMAIL" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $EMAIL" ;;
esac

# Enable staging mode if needed
if [ $STAGING != "0" ]; then
    staging_arg="--staging"
    echo -e "${YELLOW}Using Let's Encrypt staging environment${NC}"
else
    staging_arg=""
    echo -e "${GREEN}Using Let's Encrypt production environment${NC}"
fi

# Request certificate
docker-compose -f docker-compose.ssl.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d studio.$DOMAIN \
    -d grafana.$DOMAIN \
    -d prometheus.$DOMAIN \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --force-renewal \
    --non-interactive" certbot
echo ""

# Reload nginx
echo -e "${GREEN}Reloading nginx...${NC}"
docker-compose -f docker-compose.ssl.yml exec nginx-ssl nginx -s reload
echo ""

echo -e "${GREEN}=== Certificate initialization complete! ===${NC}"
echo ""
echo "Certificates are stored in: $DATA_PATH/conf/live/$DOMAIN"
echo "Certificate renewal will happen automatically every 12 hours"
echo ""
echo "To manually renew certificates, run:"
echo "  docker-compose -f docker-compose.ssl.yml run --rm certbot renew"
echo ""
echo "To test SSL configuration, visit:"
echo "  https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""

