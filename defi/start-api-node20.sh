#!/usr/bin/env bash

# Start API server with Node.js v20 LTS
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "🔄 Switching to Node.js v20 LTS..."
nvm use 20.19.1

echo "✅ Current Node.js version:"
node -v

echo ""
echo "🚀 Starting API server..."
API2_SKIP_SUBPATH=true npm run api2-dev

