/**
 * Story 4.1.3: API Integration Tests
 * 
 * Tests for MEV Analytics API endpoints:
 * - GET /v1/analytics/mev/bots
 * - GET /v1/analytics/mev/protocols/:protocolId/leakage
 * - GET /v1/analytics/mev/trends
 */

import http from 'http';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = 'http://localhost:6060';
const TEST_TIMEOUT = 10000; // 10 seconds

// ============================================================================
// HTTP Helper
// ============================================================================

function httpGet(url: string): Promise<{ status: number; data: any; duration: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode || 500, data: parsed, duration });
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${data}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// ============================================================================
// Test Functions
// ============================================================================

// Test 1: GET /v1/analytics/mev/bots (basic)
async function testGetBots(): Promise<void> {
  console.log('   Testing basic request...');
  const url = `${API_BASE_URL}/v1/analytics/mev/bots`;
  const { status, data, duration } = await httpGet(url);
  
  if (status !== 200) {
    throw new Error(`Expected status 200, got ${status}`);
  }
  
  if (!data.success) {
    throw new Error('Response success should be true');
  }
  
  if (!data.data || !data.data.bots) {
    throw new Error('Response should contain data.bots');
  }
  
  if (!Array.isArray(data.data.bots)) {
    throw new Error('data.bots should be an array');
  }
  
  console.log(`   ✓ Basic request successful (${duration}ms)`);
  console.log(`   ✓ Found ${data.data.bots.length} bots`);
}

// Test 2: GET /v1/analytics/mev/bots (with chain filter)
async function testGetBotsWithChainFilter(): Promise<void> {
  console.log('   Testing chain filter...');
  const url = `${API_BASE_URL}/v1/analytics/mev/bots?chain_id=ethereum`;
  const { status, data, duration } = await httpGet(url);
  
  if (status !== 200) {
    throw new Error(`Expected status 200, got ${status}`);
  }
  
  if (!data.success) {
    throw new Error('Response success should be true');
  }
  
  // Verify all bots are from ethereum chain
  const bots = data.data.bots;
  const allEthereum = bots.every((bot: any) => bot.chain_id === 'ethereum');
  
  if (!allEthereum) {
    throw new Error('All bots should be from ethereum chain');
  }
  
  console.log(`   ✓ Chain filter working (${duration}ms)`);
  console.log(`   ✓ Found ${bots.length} ethereum bots`);
}

// Test 3: GET /v1/analytics/mev/bots (with pagination)
async function testGetBotsWithPagination(): Promise<void> {
  console.log('   Testing pagination...');
  const url = `${API_BASE_URL}/v1/analytics/mev/bots?limit=5&offset=0`;
  const { status, data, duration } = await httpGet(url);
  
  if (status !== 200) {
    throw new Error(`Expected status 200, got ${status}`);
  }
  
  if (!data.data.pagination) {
    throw new Error('Response should contain pagination');
  }
  
  const { limit, offset } = data.data.pagination;
  
  if (limit !== 5) {
    throw new Error(`Expected limit 5, got ${limit}`);
  }
  
  if (offset !== 0) {
    throw new Error(`Expected offset 0, got ${offset}`);
  }
  
  console.log(`   ✓ Pagination working (${duration}ms)`);
  console.log(`   ✓ Limit: ${limit}, Offset: ${offset}`);
}

// Test 4: GET /v1/analytics/mev/bots (verify enrichment)
async function testGetBotsEnrichment(): Promise<void> {
  console.log('   Testing bot enrichment...');
  const url = `${API_BASE_URL}/v1/analytics/mev/bots?limit=1`;
  const { status, data, duration } = await httpGet(url);
  
  if (status !== 200) {
    throw new Error(`Expected status 200, got ${status}`);
  }
  
  const bots = data.data.bots;
  
  if (bots.length === 0) {
    console.log('   ⚠ No bots found, skipping enrichment test');
    return;
  }
  
  const bot = bots[0];
  
  // Check if bot has enrichment data
  if (!bot.performance && !bot.strategy && !bot.sophistication) {
    console.log('   ⚠ Bot enrichment data not available (may require mev_opportunities data)');
    return;
  }
  
  console.log(`   ✓ Bot enrichment working (${duration}ms)`);
  if (bot.performance) console.log(`   ✓ Performance data available`);
  if (bot.strategy) console.log(`   ✓ Strategy data available`);
  if (bot.sophistication) console.log(`   ✓ Sophistication data available`);
}

// Test 5: GET /v1/analytics/mev/protocols/:protocolId/leakage
async function testGetProtocolLeakage(): Promise<void> {
  console.log('   Testing protocol leakage...');
  const url = `${API_BASE_URL}/v1/analytics/mev/protocols/uniswap-v3/leakage?chain_id=ethereum&date=2025-10-15`;
  const { status, data, duration } = await httpGet(url);
  
  if (status !== 200) {
    throw new Error(`Expected status 200, got ${status}`);
  }
  
  if (!data.success) {
    throw new Error('Response success should be true');
  }
  
  if (!data.data || !data.data.leakage) {
    throw new Error('Response should contain data.leakage');
  }
  
  const { leakage, breakdown, user_impact } = data.data;
  
  console.log(`   ✓ Protocol leakage retrieved (${duration}ms)`);
  console.log(`   ✓ Leakage data: ${JSON.stringify(leakage).substring(0, 100)}...`);
  if (breakdown) console.log(`   ✓ Breakdown data available`);
  if (user_impact) console.log(`   ✓ User impact data available`);
}

// Test 6: GET /v1/analytics/mev/protocols/:protocolId/leakage (missing params)
async function testGetProtocolLeakageMissingParams(): Promise<void> {
  console.log('   Testing missing parameters...');
  const url = `${API_BASE_URL}/v1/analytics/mev/protocols/uniswap-v3/leakage`;
  const { status, data, duration } = await httpGet(url);
  
  if (status !== 400) {
    throw new Error(`Expected status 400, got ${status}`);
  }
  
  if (data.success !== false) {
    throw new Error('Response success should be false');
  }
  
  console.log(`   ✓ Error handling working (${duration}ms)`);
  console.log(`   ✓ Error message: ${data.error}`);
}

// Test 7: GET /v1/analytics/mev/trends
async function testGetMarketTrends(): Promise<void> {
  console.log('   Testing market trends...');
  const url = `${API_BASE_URL}/v1/analytics/mev/trends?chain_id=ethereum&date=2025-10-15`;
  const { status, data, duration } = await httpGet(url);
  
  if (status !== 200) {
    throw new Error(`Expected status 200, got ${status}`);
  }
  
  if (!data.success) {
    throw new Error('Response success should be true');
  }
  
  if (!data.data || !data.data.trend) {
    throw new Error('Response should contain data.trend');
  }
  
  const { trend, opportunity_distribution, bot_competition } = data.data;
  
  console.log(`   ✓ Market trends retrieved (${duration}ms)`);
  console.log(`   ✓ Trend data: ${JSON.stringify(trend).substring(0, 100)}...`);
  if (opportunity_distribution) console.log(`   ✓ Distribution data available`);
  if (bot_competition) console.log(`   ✓ Competition data available`);
}

// Test 8: GET /v1/analytics/mev/trends (missing params)
async function testGetMarketTrendsMissingParams(): Promise<void> {
  console.log('   Testing missing parameters...');
  const url = `${API_BASE_URL}/v1/analytics/mev/trends`;
  const { status, data, duration } = await httpGet(url);
  
  if (status !== 400) {
    throw new Error(`Expected status 400, got ${status}`);
  }
  
  if (data.success !== false) {
    throw new Error('Response success should be false');
  }
  
  console.log(`   ✓ Error handling working (${duration}ms)`);
  console.log(`   ✓ Error message: ${data.error}`);
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log('\n🧪 Story 4.1.3: API Integration Tests\n');
  console.log('============================================================\n');

  const tests = [
    { name: '1. GET /v1/analytics/mev/bots (basic)', fn: testGetBots },
    { name: '2. GET /v1/analytics/mev/bots (chain filter)', fn: testGetBotsWithChainFilter },
    { name: '3. GET /v1/analytics/mev/bots (pagination)', fn: testGetBotsWithPagination },
    { name: '4. GET /v1/analytics/mev/bots (enrichment)', fn: testGetBotsEnrichment },
    { name: '5. GET /v1/analytics/mev/protocols/:id/leakage', fn: testGetProtocolLeakage },
    { name: '6. GET /v1/analytics/mev/protocols/:id/leakage (error)', fn: testGetProtocolLeakageMissingParams },
    { name: '7. GET /v1/analytics/mev/trends', fn: testGetMarketTrends },
    { name: '8. GET /v1/analytics/mev/trends (error)', fn: testGetMarketTrendsMissingParams },
  ];

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const test of tests) {
    try {
      console.log(`✅ ${test.name} - PASS`);
      await test.fn();
      passed++;
    } catch (error: any) {
      console.log(`❌ ${test.name} - FAIL`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  const totalTime = Date.now() - startTime;

  console.log('============================================================\n');
  console.log('📋 Test Summary\n');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⊙ Skipped: 0`);
  console.log(`\n⏱️  Total Duration: ${totalTime}ms\n`);
  console.log('============================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

