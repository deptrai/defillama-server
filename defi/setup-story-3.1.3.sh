#!/usr/bin/env bash

# Setup Script for Story 3.1.3: Performance Attribution
# Applies migrations and seeds test data

set -e

echo "🚀 Setting up Story 3.1.3: Performance Attribution"
echo "=================================================="
echo ""

# Apply migrations
echo "📦 Applying migrations..."
echo ""

echo "  ✅ Migration 023: wallet_performance_metrics"
cat src/analytics/migrations/023-create-wallet-performance-metrics.sql | docker exec -i chainlens-postgres psql -U defillama -d defillama 2>&1 | tail -10

echo "  ✅ Migration 024: wallet_performance_snapshots"
cat src/analytics/migrations/024-create-wallet-performance-snapshots.sql | docker exec -i chainlens-postgres psql -U defillama -d defillama 2>&1 | tail -10

echo "  ✅ Migration 025: wallet_strategy_attribution"
cat src/analytics/migrations/025-create-wallet-strategy-attribution.sql | docker exec -i chainlens-postgres psql -U defillama -d defillama 2>&1 | tail -10

echo ""
echo "📥 Seeding test data..."
echo ""

echo "  ✅ Seed: performance_metrics (5 wallets)"
cat src/analytics/db/seed-performance-metrics.sql | docker exec -i chainlens-postgres psql -U defillama -d defillama 2>&1 | tail -15

echo "  ✅ Seed: performance_snapshots (30 days for 1 wallet)"
cat src/analytics/db/seed-performance-snapshots.sql | docker exec -i chainlens-postgres psql -U defillama -d defillama 2>&1 | tail -15

echo "  ✅ Seed: strategy_attribution (5 wallets)"
cat src/analytics/db/seed-strategy-attribution.sql | docker exec -i chainlens-postgres psql -U defillama -d defillama 2>&1 | tail -15

echo ""
echo "🧪 Verifying setup..."
echo ""

# Verify tables exist
echo "  📊 Table counts:"
docker exec -i chainlens-postgres psql -U defillama -d defillama -c "
SELECT 
  'wallet_performance_metrics' as table_name,
  COUNT(*) as record_count
FROM wallet_performance_metrics
UNION ALL
SELECT 
  'wallet_performance_snapshots',
  COUNT(*)
FROM wallet_performance_snapshots
UNION ALL
SELECT 
  'wallet_strategy_attribution',
  COUNT(*)
FROM wallet_strategy_attribution
ORDER BY table_name;
" 2>&1

echo ""
echo "✅ Story 3.1.3 setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Run unit tests: npm test -- --testPathPattern='performance-calculator|strategy-classifier'"
echo "  2. Start API server: npm run api2-dev"
echo "  3. Test endpoints:"
echo "     - GET /v1/smart-money/wallets/0x1234567890abcdef1234567890abcdef12345678/performance"
echo "     - GET /v1/smart-money/wallets/0x1234567890abcdef1234567890abcdef12345678/performance/snapshots"
echo "     - GET /v1/smart-money/wallets/0x1234567890abcdef1234567890abcdef12345678/performance/strategy"
echo ""

