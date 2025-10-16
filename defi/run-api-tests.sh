#!/usr/bin/env bash

# Run API Tests with Node.js v20 LTS
# This script starts the API server and runs comprehensive endpoint tests

set -e

echo "🚀 API Testing Suite"
echo "===================="
echo ""

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Switch to Node.js v20
echo "🔄 Switching to Node.js v20 LTS..."
nvm use 20.19.1

echo "✅ Current Node.js version:"
node -v
echo ""

# Start API server in background
echo "🚀 Starting API server..."
cd "$(dirname "$0")"
API2_SKIP_SUBPATH=true npm run api2-dev > /tmp/api-server.log 2>&1 &
SERVER_PID=$!

echo "  Server PID: $SERVER_PID"
echo "  Log file: /tmp/api-server.log"
echo ""

# Wait for server to start
echo "⏳ Waiting for server to start (30 seconds)..."
sleep 30

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Server failed to start!"
    echo "Last 20 lines of log:"
    tail -20 /tmp/api-server.log
    exit 1
fi

echo "✅ Server started successfully!"
echo ""

# Check if server is responding
echo "🔍 Checking server health..."
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ Server is responding!"
else
    echo "⚠️  Server health check failed (endpoint may not exist)"
fi
echo ""

# Run endpoint tests
echo "🧪 Running endpoint tests..."
echo ""
chmod +x test-all-endpoints.sh
./test-all-endpoints.sh

# Stop server
echo ""
echo "🛑 Stopping API server..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

echo "✅ Server stopped"
echo ""

# Switch back to Node.js v22
echo "🔄 Switching back to Node.js v22..."
nvm use 22.18.0

echo "✅ Current Node.js version:"
node -v
echo ""

echo "✅ All tests completed!"

