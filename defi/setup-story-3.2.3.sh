#!/bin/bash

# Setup script for Story 3.2.3: Compliance Monitoring
# Phase 1: Database Setup

set -e

echo "========================================="
echo "Story 3.2.3: Compliance Monitoring"
echo "Phase 1: Database Setup"
echo "========================================="
echo ""

# Database connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="defillama"
DB_USER="defillama"
DB_PASSWORD="defillama123"

# Check if PostgreSQL is running
echo "Checking PostgreSQL connection..."
if ! docker exec chainlens-postgres pg_isready -U $DB_USER > /dev/null 2>&1; then
  echo "❌ PostgreSQL is not running. Please start the database first."
  exit 1
fi
echo "✅ PostgreSQL is running"
echo ""

# Run migration
echo "Running migration: 036-create-compliance-screenings.sql..."
cat src/analytics/migrations/036-create-compliance-screenings.sql | \
  docker exec -i chainlens-postgres psql -U $DB_USER -d $DB_NAME
if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully"
else
  echo "❌ Migration failed"
  exit 1
fi
echo ""

# Insert seed data
echo "Inserting seed data: seed-compliance-screenings.sql..."
cat src/analytics/db/seed-compliance-screenings.sql | \
  docker exec -i chainlens-postgres psql -U $DB_USER -d $DB_NAME
if [ $? -eq 0 ]; then
  echo "✅ Seed data inserted successfully"
else
  echo "❌ Seed data insertion failed"
  exit 1
fi
echo ""

# Verify setup
echo "Verifying database setup..."
docker exec -i chainlens-postgres psql -U $DB_USER -d $DB_NAME -c "
SELECT 
  'compliance_screenings' as table_name,
  COUNT(*) as row_count
FROM compliance_screenings;
"
echo ""

echo "========================================="
echo "✅ Phase 1: Database Setup - COMPLETE"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Implement Phase 2: Sanctions Screening"
echo "2. Implement Phase 3: AML Monitoring"
echo "3. Implement Phase 4: KYC Support"
echo "4. Implement Phase 5: PEP Screening"
echo "5. Implement Phase 6: Adverse Media Screening"
echo "6. Implement Phase 7: API Development"
echo "7. Implement Phase 8: Testing & Documentation"

