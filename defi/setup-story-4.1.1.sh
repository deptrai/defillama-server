#!/bin/bash

# Setup Script for Story 4.1.1: MEV Opportunity Detection
# Date: 2025-10-16
# Description: Run migration and seed data for MEV opportunities table

set -e  # Exit on error

echo "🚀 ========================================"
echo "✅ Story 4.1.1: MEV Opportunity Detection"
echo "🚀 ========================================"
echo ""

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-defillama}"
DB_PASSWORD="${DB_PASSWORD:-defillama123}"
DB_NAME="${DB_NAME:-defillama}"

echo "📊 Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."
if ! docker exec chainlens-postgres pg_isready -U $DB_USER > /dev/null 2>&1; then
  echo "❌ Error: PostgreSQL is not running or not accessible"
  echo "   Please start PostgreSQL with: docker-compose up -d postgres"
  exit 1
fi
echo "✅ PostgreSQL is running"
echo ""

# Run migration
echo "📝 Running migration: 037-create-mev-opportunities.sql"
docker exec -i chainlens-postgres psql -U $DB_USER -d $DB_NAME < src/analytics/migrations/037-create-mev-opportunities.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully"
else
  echo "❌ Migration failed"
  exit 1
fi
echo ""

# Load seed data
echo "📊 Loading seed data: seed-mev-opportunities.sql"
docker exec -i chainlens-postgres psql -U $DB_USER -d $DB_NAME < src/analytics/db/seed-mev-opportunities.sql
if [ $? -eq 0 ]; then
  echo "✅ Seed data loaded successfully"
else
  echo "❌ Seed data loading failed"
  exit 1
fi
echo ""

# Verify data
echo "🔍 Verifying data..."
docker exec -i chainlens-postgres psql -U $DB_USER -d $DB_NAME -c "
SELECT 
  opportunity_type,
  COUNT(*) as count,
  ROUND(SUM(mev_profit_usd)::numeric, 2) as total_profit_usd,
  ROUND(AVG(confidence_score)::numeric, 2) as avg_confidence
FROM mev_opportunities
GROUP BY opportunity_type
ORDER BY opportunity_type;
"
echo ""

# Show total count
echo "📊 Total MEV Opportunities:"
docker exec -i chainlens-postgres psql -U $DB_USER -d $DB_NAME -c "
SELECT COUNT(*) as total_opportunities FROM mev_opportunities;
"
echo ""

echo "🎉 ========================================"
echo "✅ Story 4.1.1 Database Setup Complete!"
echo "🎉 ========================================"
echo ""
echo "📋 Next Steps:"
echo "  1. Implement detection engines (Phase 2)"
echo "  2. Implement profit calculation (Phase 3)"
echo "  3. Implement API endpoints (Phase 4)"
echo "  4. Run integration tests (Phase 5)"
echo ""

