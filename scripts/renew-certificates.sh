#!/bin/bash

# Renew Let's Encrypt SSL/TLS certificates for DeFiLlama
# This script should be run periodically (e.g., via cron)

set -e

# Configuration
DOMAIN="${DOMAIN:-defillama.local}"
DATA_PATH="./certbot"
LOG_FILE="$DATA_PATH/logs/renewal-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== DeFiLlama Certificate Renewal ===${NC}" | tee -a "$LOG_FILE"
echo "Date: $(date)" | tee -a "$LOG_FILE"
echo "Domain: $DOMAIN" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Check if certificates exist
if [ ! -d "$DATA_PATH/conf/live/$DOMAIN" ]; then
    echo -e "${RED}Error: No certificates found for $DOMAIN${NC}" | tee -a "$LOG_FILE"
    echo "Please run init-letsencrypt.sh first" | tee -a "$LOG_FILE"
    exit 1
fi

# Check certificate expiration
echo -e "${GREEN}Checking certificate expiration...${NC}" | tee -a "$LOG_FILE"
CERT_FILE="$DATA_PATH/conf/live/$DOMAIN/fullchain.pem"
EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

echo "Certificate expires: $EXPIRY_DATE" | tee -a "$LOG_FILE"
echo "Days until expiry: $DAYS_UNTIL_EXPIRY" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Renew if less than 30 days until expiry
if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
    echo -e "${GREEN}Certificate is still valid for $DAYS_UNTIL_EXPIRY days${NC}" | tee -a "$LOG_FILE"
    echo "No renewal needed" | tee -a "$LOG_FILE"
    exit 0
fi

echo -e "${YELLOW}Certificate expires in $DAYS_UNTIL_EXPIRY days${NC}" | tee -a "$LOG_FILE"
echo "Starting renewal process..." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Renew certificate
echo -e "${GREEN}Renewing certificate...${NC}" | tee -a "$LOG_FILE"
if docker-compose -f docker-compose.ssl.yml run --rm certbot renew 2>&1 | tee -a "$LOG_FILE"; then
    echo -e "${GREEN}Certificate renewed successfully${NC}" | tee -a "$LOG_FILE"
    
    # Reload nginx
    echo -e "${GREEN}Reloading nginx...${NC}" | tee -a "$LOG_FILE"
    docker-compose -f docker-compose.ssl.yml exec nginx-ssl nginx -s reload 2>&1 | tee -a "$LOG_FILE"
    
    echo -e "${GREEN}=== Renewal complete! ===${NC}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Certificate renewal failed${NC}" | tee -a "$LOG_FILE"
    echo "Check logs at: $LOG_FILE" | tee -a "$LOG_FILE"
    exit 1
fi

echo "" | tee -a "$LOG_FILE"
echo "Log saved to: $LOG_FILE" | tee -a "$LOG_FILE"

