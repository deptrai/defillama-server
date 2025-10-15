#!/bin/bash

# Test API endpoints with Node.js v20 LTS
# This script temporarily switches to Node.js v20, starts the API server, tests endpoints, then switches back to v22

echo "🔄 Switching to Node.js v20 LTS..."
source ~/.nvm/nvm.sh
nvm use 20.19.1

echo "✅ Current Node.js version:"
node -v

echo ""
echo "🚀 Starting API server..."
API2_SKIP_SUBPATH=true npm run api2-dev &
SERVER_PID=$!

echo "⏳ Waiting 20 seconds for server to start..."
sleep 20

echo ""
echo "🧪 Testing API endpoints..."
npx tsx src/analytics/collectors/test-patterns-api.ts

echo ""
echo "🛑 Stopping API server..."
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "🔄 Switching back to Node.js v22..."
nvm use 22.18.0

echo "✅ Current Node.js version:"
node -v

echo ""
echo "✅ Test completed!"

