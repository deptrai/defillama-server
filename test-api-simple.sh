#!/bin/bash

# Simple API test script
cd /Users/mac_1/Documents/GitHub/defillama/defillama-server/defi

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node 18
nvm use 18

# Show version
echo "Node version: $(node --version)"

# Set port
export PORT=5010

# Start server
echo "Starting API server on port 5010..."
npx ts-node --logError --transpile-only src/api2/index.ts

