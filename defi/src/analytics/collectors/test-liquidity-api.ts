/**
 * Manual Test Script for Liquidity Analysis API
 * Story: 2.1.3 - Liquidity Analysis Tools
 * 
 * Run with: ts-node defi/src/analytics/collectors/test-liquidity-api.ts
 */

import { query } from '../db/connection';

const BASE_URL = 'http://localhost:3000/v1/analytics';

async function testAPI() {
  console.log('🧪 Testing Liquidity Analysis API Endpoints\n');

  // Get a sample pool ID from database
  const poolResult = await query<any>('SELECT id, pool_name FROM liquidity_pools LIMIT 1', []);
  if (poolResult.rows.length === 0) {
    console.error('❌ No pools found in database. Run seed script first.');
    process.exit(1);
  }
  const samplePoolId = poolResult.rows[0].id;
  const samplePoolName = poolResult.rows[0].pool_name;
  console.log(`📊 Using sample pool: ${samplePoolName} (${samplePoolId})\n`);

  // Get a sample LP ID
  const lpResult = await query<any>('SELECT id FROM liquidity_providers LIMIT 1', []);
  const sampleLpId = lpResult.rows.length > 0 ? lpResult.rows[0].id : null;

  const tests = [
    {
      name: 'Test 1: GET /liquidity-pools (list all pools)',
      url: `${BASE_URL}/liquidity-pools?limit=5`,
      method: 'GET',
    },
    {
      name: 'Test 2: GET /liquidity-pools (filter by protocol)',
      url: `${BASE_URL}/liquidity-pools?protocolId=uniswap-v2&limit=5`,
      method: 'GET',
    },
    {
      name: 'Test 3: GET /liquidity-pools (filter by chain)',
      url: `${BASE_URL}/liquidity-pools?chainId=ethereum&limit=5`,
      method: 'GET',
    },
    {
      name: 'Test 4: GET /liquidity-pools/:id/depth',
      url: `${BASE_URL}/liquidity-pools/${samplePoolId}/depth?levels=5`,
      method: 'GET',
    },
    {
      name: 'Test 5: GET /liquidity-pools/:id/providers',
      url: `${BASE_URL}/liquidity-pools/${samplePoolId}/providers?limit=5`,
      method: 'GET',
    },
    {
      name: 'Test 6: GET /liquidity-pools/:id/impermanent-loss (all LPs)',
      url: `${BASE_URL}/liquidity-pools/${samplePoolId}/impermanent-loss`,
      method: 'GET',
    },
    ...(sampleLpId ? [{
      name: 'Test 7: GET /liquidity-pools/:id/impermanent-loss (specific LP)',
      url: `${BASE_URL}/liquidity-pools/${samplePoolId}/impermanent-loss?lpId=${sampleLpId}`,
      method: 'GET',
    }] : []),
    {
      name: 'Test 8: GET /liquidity-migrations (all)',
      url: `${BASE_URL}/liquidity-migrations?limit=5`,
      method: 'GET',
    },
    {
      name: 'Test 9: GET /liquidity-migrations (filter by reason)',
      url: `${BASE_URL}/liquidity-migrations?reason=higher_apy&limit=5`,
      method: 'GET',
    },
    {
      name: 'Test 10: GET /liquidity-migrations (filter by protocol)',
      url: `${BASE_URL}/liquidity-migrations?fromProtocolId=uniswap-v2&limit=5`,
      method: 'GET',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n${test.name}`);
      console.log(`URL: ${test.url}`);

      const response = await fetch(test.url);
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Status: ${response.status}`);
        console.log(`📦 Response keys: ${Object.keys(data).join(', ')}`);
        
        // Show sample data
        if (data.pools && data.pools.length > 0) {
          console.log(`   Found ${data.pools.length} pools`);
        } else if (data.depthChart) {
          console.log(`   Depth chart levels: ${data.depthChart.bids?.length || 0}`);
        } else if (data.positions) {
          console.log(`   Found ${data.positions.length} LP positions`);
        } else if (data.migrations) {
          console.log(`   Found ${data.migrations.length} migrations`);
        } else if (data.lpData) {
          console.log(`   Found ${data.lpData.length} LP IL data`);
        } else if (data.impermanentLoss) {
          console.log(`   IL: ${data.impermanentLoss.impermanentLossPct?.toFixed(2)}%`);
        }

        passed++;
      } else {
        console.log(`❌ Status: ${response.status}`);
        console.log(`   Error: ${data.error || data.message}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(60)}\n`);

  if (failed === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed. Check the output above.');
  }

  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
testAPI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

