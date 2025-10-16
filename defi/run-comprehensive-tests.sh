#!/usr/bin/env bash

# Comprehensive API Testing Script
# Starts API server and runs all endpoint tests

set -e

echo "🚀 Comprehensive API Testing Suite"
echo "===================================="
echo ""

# Check if server is already running
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ API server is already running"
    echo ""
    
    # Run tests directly
    echo "🧪 Running comprehensive API tests..."
    echo ""
    cd "$(dirname "$0")"
    npx tsx src/analytics/collectors/comprehensive-api-test.ts
    exit $?
fi

echo "⚠️  API server is not running"
echo "Please start the API server manually:"
echo ""
echo "  # In a separate terminal:"
echo "  cd defi"
echo "  nvm use 20.19.1  # Switch to Node.js v20"
echo "  API2_SKIP_SUBPATH=true npm run api2-dev"
echo ""
echo "  # Then run this script again:"
echo "  ./run-comprehensive-tests.sh"
echo ""
exit 1

