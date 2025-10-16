#!/bin/bash

# Setup script for Story 3.2.1: Protocol Risk Assessment
# This script applies migrations and seeds test data

set -e

echo "========================================="
echo "Story 3.2.1: Protocol Risk Assessment"
echo "Database Setup Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Database connection details
DB_CONTAINER="chainlens-postgres"
DB_USER="defillama"
DB_NAME="defillama"

echo -e "${YELLOW}Step 1: Applying migrations...${NC}"
echo ""

# Apply migrations in order
migrations=(
  "026-create-protocol-risk-assessments.sql"
  "027-create-protocol-contract-risks.sql"
  "028-create-protocol-liquidity-risks.sql"
  "029-create-protocol-governance-risks.sql"
  "030-create-protocol-operational-risks.sql"
  "031-create-protocol-market-risks.sql"
  "032-create-protocol-risk-alerts.sql"
)

for migration in "${migrations[@]}"; do
  echo -e "${YELLOW}Applying migration: $migration${NC}"
  cat "src/analytics/migrations/$migration" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration applied successfully${NC}"
  else
    echo -e "${RED}✗ Migration failed${NC}"
    exit 1
  fi
  echo ""
done

echo -e "${GREEN}All migrations applied successfully!${NC}"
echo ""

echo -e "${YELLOW}Step 2: Seeding test data...${NC}"
echo ""

# Seed data files
seed_files=(
  "seed-protocol-risk-assessments.sql"
  "seed-protocol-contract-risks.sql"
  "seed-protocol-liquidity-risks.sql"
  "seed-protocol-governance-risks.sql"
  "seed-protocol-operational-risks.sql"
  "seed-protocol-market-risks.sql"
  "seed-protocol-risk-alerts.sql"
)

for seed_file in "${seed_files[@]}"; do
  echo -e "${YELLOW}Seeding data: $seed_file${NC}"
  cat "src/analytics/db/$seed_file" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME 2>&1 | tail -20
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Data seeded successfully${NC}"
  else
    echo -e "${RED}✗ Seeding failed${NC}"
    exit 1
  fi
  echo ""
done

echo -e "${GREEN}All data seeded successfully!${NC}"
echo ""

echo -e "${YELLOW}Step 3: Verifying database setup...${NC}"
echo ""

# Verify table creation and record counts
echo "Checking table record counts..."
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME <<EOF
SELECT 
  'protocol_risk_assessments' as table_name, 
  COUNT(*) as record_count 
FROM protocol_risk_assessments
UNION ALL
SELECT 
  'protocol_contract_risks', 
  COUNT(*) 
FROM protocol_contract_risks
UNION ALL
SELECT 
  'protocol_liquidity_risks', 
  COUNT(*) 
FROM protocol_liquidity_risks
UNION ALL
SELECT 
  'protocol_governance_risks', 
  COUNT(*) 
FROM protocol_governance_risks
UNION ALL
SELECT 
  'protocol_operational_risks', 
  COUNT(*) 
FROM protocol_operational_risks
UNION ALL
SELECT 
  'protocol_market_risks', 
  COUNT(*) 
FROM protocol_market_risks
UNION ALL
SELECT 
  'protocol_risk_alerts', 
  COUNT(*) 
FROM protocol_risk_alerts;
EOF

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Expected record counts:"
echo "  - protocol_risk_assessments: 10"
echo "  - protocol_contract_risks: 10"
echo "  - protocol_liquidity_risks: 10"
echo "  - protocol_governance_risks: 10"
echo "  - protocol_operational_risks: 10"
echo "  - protocol_market_risks: 10"
echo "  - protocol_risk_alerts: 10"
echo ""
echo "Next steps:"
echo "  1. Run unit tests: npm test -- --testPathPattern='risk'"
echo "  2. Start API server: npm run api2-dev"
echo "  3. Test endpoints:"
echo "     curl http://localhost:5001/v1/risk/protocols/uniswap-v3/assessment"
echo "     curl http://localhost:5001/v1/risk/protocols/risky-protocol/alerts"
echo ""

