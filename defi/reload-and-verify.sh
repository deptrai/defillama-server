#!/usr/bin/env bash

# Reload seed data and verify implementation

set -e

echo "🔄 Reloading Seed Data & Verifying Implementation"
echo "=================================================="
echo ""

# Reload wallet trades seed data
echo "📥 Reloading wallet_trades seed data..."
cat src/analytics/db/seed-wallet-trades.sql | docker exec -i chainlens-postgres psql -U defillama -d defillama 2>&1 | tail -20
echo ""

# Run verification
echo "🧪 Running comprehensive verification..."
cat verify-implementation.sql | docker exec -i chainlens-postgres psql -U defillama -d defillama 2>&1

echo ""
echo "✅ Reload and verification complete!"

