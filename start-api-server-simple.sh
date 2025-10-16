#!/bin/bash

echo "🚀 Starting DeFi API Server on Port 5010"
echo "========================================"
echo "🕒 $(date)"
echo ""

# Kill existing processes on port 5010
echo "🛑 Checking for existing processes on port 5010..."
if lsof -ti:5010 > /dev/null 2>&1; then
    echo "   Found process on port 5010, killing..."
    lsof -ti:5010 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Navigate to defi directory
cd /Users/mac_1/Documents/GitHub/defillama/defillama-server/defi

# Load nvm and use Node 20
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

# Set environment variables
export API_PORT=5010
export WS_PORT=5011
export NODE_ENV=development

echo "📦 Environment:"
echo "   API_PORT: $API_PORT"
echo "   WS_PORT: $WS_PORT"
echo "   NODE_ENV: $NODE_ENV"
echo "   Node Version: $(node --version)"
echo "   npm Version: $(npm --version)"
echo ""

# Start API server
echo "🚀 Starting API server..."
echo "   Command: npm run api2-dev"
echo ""

npm run api2-dev 2>&1 &
API_PID=$!

echo "   Process ID: $API_PID"
echo ""

# Wait for server to start
echo "⏳ Waiting for server to start (15 seconds)..."
sleep 15

# Check if process is still running
if ps -p $API_PID > /dev/null 2>&1; then
    echo "✅ API server process is running (PID: $API_PID)"
else
    echo "❌ API server process died"
    exit 1
fi

# Check if port is listening
echo "🔍 Checking if port 5010 is listening..."
if lsof -i:5010 -P -n | grep LISTEN > /dev/null 2>&1; then
    echo "✅ Port 5010 is listening"
else
    echo "⚠️  Port 5010 is not listening yet"
fi

# Try to connect to API
echo "🔍 Testing API endpoint..."
if curl -s --max-time 5 "http://localhost:5010/health" > /dev/null 2>&1; then
    echo "✅ API health endpoint responding"
elif curl -s --max-time 5 "http://localhost:5010/" > /dev/null 2>&1; then
    echo "✅ API root endpoint responding"
else
    echo "⚠️  API not responding yet (may still be starting)"
fi

echo ""
echo "📊 Server Status:"
echo "   Process: $(ps -p $API_PID -o comm= 2>/dev/null || echo 'Not running')"
echo "   Port: $(lsof -i:5010 -P -n | grep LISTEN | awk '{print $1, $2}' || echo 'Not listening')"
echo ""

echo "🎯 Access Points:"
echo "   API Server: http://localhost:5010/"
echo "   Health Check: http://localhost:5010/health"
echo "   MEV Opportunities: http://localhost:5010/v1/analytics/mev/opportunities"
echo ""

echo "📝 Logs:"
echo "   Follow logs: tail -f /Users/mac_1/Documents/GitHub/defillama/defillama-server/defi/api-server.log"
echo "   Kill server: kill $API_PID"
echo ""

echo "✅ Startup script complete!"
echo "   Server PID: $API_PID"
echo "   Check status: ps -p $API_PID"

