#!/bin/bash

# Setup Test Database for E2E Tests
# This script helps set up a local PostgreSQL database for E2E testing

set -e

echo "🚀 Setting up test database for E2E tests..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed!"
    echo ""
    echo "Please install PostgreSQL:"
    echo "  macOS:   brew install postgresql@14"
    echo "  Ubuntu:  sudo apt-get install postgresql-14"
    echo "  Docker:  docker run -d --name defillama-test-db -e POSTGRES_DB=defillama_test -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:14"
    exit 1
fi

# Database configuration
DB_NAME="${TEST_DB_NAME:-defillama_test}"
DB_USER="${TEST_DB_USER:-$USER}"
DB_HOST="${TEST_DB_HOST:-localhost}"
DB_PORT="${TEST_DB_PORT:-5432}"

echo "📊 Database Configuration:"
echo "  Name: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo ""

# Check if database exists
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "✅ Database '$DB_NAME' already exists"
else
    echo "📝 Creating database '$DB_NAME'..."
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    echo "✅ Database created"
fi

# Set environment variable
export TEST_DB="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

echo ""
echo "✅ Test database setup complete!"
echo ""
echo "To use this database for E2E tests, run:"
echo "  export TEST_DB=\"postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME\""
echo ""
echo "Or add to your ~/.bashrc or ~/.zshrc:"
echo "  echo 'export TEST_DB=\"postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME\"' >> ~/.bashrc"
echo ""
echo "Then run E2E tests:"
echo "  cd premium && pnpm test:e2e"

