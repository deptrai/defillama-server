#!/bin/bash

# Start API server with nohup (persistent background process)

cd /Users/mac_1/Documents/GitHub/defillama/defillama-server/defi

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node 18
nvm use 18 || { echo "Failed to switch to Node 18"; exit 1; }

# Verify Node version
NODE_VERSION=$(node --version)
echo "✅ Node version: $NODE_VERSION"

if [[ ! "$NODE_VERSION" =~ ^v18\. ]]; then
  echo "❌ ERROR: Node version must be 18.x, got $NODE_VERSION"
  exit 1
fi

# Set port
export PORT=5010

# Kill existing process on port 5010
echo "🔍 Checking for existing process on port 5010..."
EXISTING_PID=$(lsof -ti:5010)
if [ ! -z "$EXISTING_PID" ]; then
  echo "⚠️  Killing existing process: $EXISTING_PID"
  kill -9 $EXISTING_PID
  sleep 2
fi

# Start server with nohup
echo "🚀 Starting API server on port 5010 with nohup..."
nohup npx ts-node --logError --transpile-only src/api2/index.ts > api-server.log 2>&1 &

# Get PID
SERVER_PID=$!
echo "✅ Server started with PID: $SERVER_PID"
echo "📝 Logs: tail -f defi/api-server.log"
echo "🔍 Test: curl http://localhost:5010/health"
echo "⏹️  Stop: kill $SERVER_PID"

# Wait a bit and check if server is running
sleep 5
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Server is running!"
  lsof -i:5010 -P -n | grep LISTEN || echo "⚠️  Port 5010 not listening yet..."
else
  echo "❌ Server failed to start. Check api-server.log"
  tail -20 api-server.log
  exit 1
fi

