#!/bin/bash

# Simple API test script
cd /Users/mac_1/Documents/GitHub/defillama/defillama-server/defi

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node 18 (MUST be explicit)
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

# Start server
echo "🚀 Starting API server on port 5010..."
npx ts-node --logError --transpile-only src/api2/index.ts

