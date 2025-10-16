#!/bin/bash

# Story 3.2.2: Suspicious Activity Detection - Setup Script
# This script applies database migrations and seeds test data

echo "========================================"
echo "Story 3.2.2: Suspicious Activity Detection"
echo "Database Setup"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0;33m' # No Color

# Database connection
DB_CONTAINER="chainlens-postgres"
DB_USER="defillama"
DB_NAME="defillama"

# Check if Docker container is running
if ! docker ps | grep -q $DB_CONTAINER; then
    echo -e "${RED}Error: Docker container $DB_CONTAINER is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Applying migration 033-create-suspicious-activities.sql${NC}"
cat src/analytics/migrations/033-create-suspicious-activities.sql | \
    docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME 2>&1 | tail -20

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration 033 applied successfully${NC}"
else
    echo -e "${RED}✗ Migration 033 failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Seeding suspicious activities data${NC}"
cat src/analytics/db/seed-suspicious-activities.sql | \
    docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME 2>&1 | tail -30

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Seed data loaded successfully${NC}"
else
    echo -e "${RED}✗ Seed data loading failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Verifying table creation${NC}"
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'suspicious_activities') as column_count,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = 'suspicious_activities' AND constraint_type = 'PRIMARY KEY') as pk_count,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'suspicious_activities') as index_count
FROM information_schema.tables 
WHERE table_name = 'suspicious_activities';
"

echo ""
echo -e "${YELLOW}Step 4: Verifying record counts${NC}"
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT 
    activity_type,
    severity,
    COUNT(*) as count,
    ROUND(AVG(confidence_score), 2) as avg_confidence,
    SUM(COALESCE(estimated_loss_usd, 0)) as total_loss_usd
FROM suspicious_activities
GROUP BY activity_type, severity
ORDER BY activity_type, severity;
"

echo ""
echo -e "${YELLOW}Step 5: Verifying status distribution${NC}"
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT 
    status,
    COUNT(*) as count,
    ROUND(AVG(confidence_score), 2) as avg_confidence
FROM suspicious_activities
GROUP BY status
ORDER BY status;
"

echo ""
echo "========================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Database tables created:"
echo "  - suspicious_activities (1 table)"
echo ""
echo "Records seeded:"
echo "  - Rug Pull: 5 records"
echo "  - Wash Trading: 5 records"
echo "  - Pump & Dump: 2 records"
echo "  - Sybil Attack: 3 records"
echo "  - Total: 15 records"
echo ""
echo "Next steps:"
echo "  1. Implement detection engines"
echo "  2. Run unit tests: npm test -- --testPathPattern='suspicious'"
echo "  3. Start API server: npm run api2-dev"
echo "  4. Run API tests: ./test-story-3.2.2-api.sh"
echo ""

