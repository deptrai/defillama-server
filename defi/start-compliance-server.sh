#!/bin/bash

# Start Compliance API Server
# This script starts the compliance API server with proper environment variables

echo "🚀 Starting Compliance API Server..."
echo ""

# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=defillama
export DB_PASSWORD=defillama123
export DB_NAME=defillama
export NODE_ENV=development

# Check if PostgreSQL is running
echo "📊 Checking PostgreSQL connection..."
if docker ps | grep -q chainlens-postgres; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running"
    echo "Please start PostgreSQL first:"
    echo "  docker start chainlens-postgres"
    exit 1
fi

# Test database connection
echo "🔍 Testing database connection..."
if docker exec chainlens-postgres psql -U defillama -d defillama -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Check if compliance_screenings table exists
echo "🔍 Checking compliance_screenings table..."
if docker exec chainlens-postgres psql -U defillama -d defillama -c "\d compliance_screenings" > /dev/null 2>&1; then
    echo "✅ compliance_screenings table exists"
else
    echo "⚠️  compliance_screenings table not found"
    echo "Running migration..."
    docker exec -i chainlens-postgres psql -U defillama -d defillama < src/analytics/migrations/036-create-compliance-screenings.sql
    echo "✅ Migration complete"
fi

# Start server
echo ""
echo "🚀 Starting server on http://localhost:3000..."
echo ""

node simple-compliance-server.js

