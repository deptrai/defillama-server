/**
 * Manual Test Script for Portfolio API
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * Tests all 5 portfolio API endpoints with various parameters
 */

const BASE_URL = 'http://localhost:3000/v1/analytics';

// Test wallets
const WHALE_WALLET = '0x1234567890123456789012345678901234567890';
const DEFI_FARMER = '0x2345678901234567890123456789012345678901';
const STABLECOIN_HOLDER = '0x4567890123456789012345678901234567890123';

interface TestResult {
  endpoint: string;
  status: 'PASS' | 'FAIL';
  responseTime: number;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  url: string,
  expectedStatus: number = 200
): Promise<void> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;
    
    if (response.status !== expectedStatus) {
      results.push({
        endpoint: name,
        status: 'FAIL',
        responseTime,
        error: `Expected status ${expectedStatus}, got ${response.status}`,
      });
      console.log(`❌ ${name}: Expected ${expectedStatus}, got ${response.status}`);
      return;
    }
    
    const data = await response.json();
    
    if (!data || (data.error && expectedStatus === 200)) {
      results.push({
        endpoint: name,
        status: 'FAIL',
        responseTime,
        error: `Unexpected error: ${data.error}`,
      });
      console.log(`❌ ${name}: ${data.error}`);
      return;
    }
    
    results.push({
      endpoint: name,
      status: 'PASS',
      responseTime,
    });
    
    console.log(`✅ ${name} (${responseTime}ms)`);
    console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    results.push({
      endpoint: name,
      status: 'FAIL',
      responseTime,
      error: error.message,
    });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log('🧪 Testing Portfolio API Endpoints\n');
  console.log('='.repeat(80));
  
  // Test 1: Portfolio Summary - Basic
  console.log('\n📊 Test 1: Portfolio Summary - Basic');
  await testEndpoint(
    'GET /portfolio/:walletAddress',
    `${BASE_URL}/portfolio/${WHALE_WALLET}`
  );
  
  // Test 2: Portfolio Summary - With chain filter
  console.log('\n📊 Test 2: Portfolio Summary - With chain filter');
  await testEndpoint(
    'GET /portfolio/:walletAddress?chains=ethereum',
    `${BASE_URL}/portfolio/${WHALE_WALLET}?chains=ethereum`
  );
  
  // Test 3: Portfolio Summary - Multiple chains
  console.log('\n📊 Test 3: Portfolio Summary - Multiple chains');
  await testEndpoint(
    'GET /portfolio/:walletAddress?chains=ethereum,arbitrum',
    `${BASE_URL}/portfolio/${WHALE_WALLET}?chains=ethereum,arbitrum`
  );
  
  // Test 4: Asset Allocation - By token
  console.log('\n📊 Test 4: Asset Allocation - By token');
  await testEndpoint(
    'GET /portfolio/:walletAddress/allocation?groupBy=token',
    `${BASE_URL}/portfolio/${WHALE_WALLET}/allocation?groupBy=token`
  );
  
  // Test 5: Asset Allocation - By protocol
  console.log('\n📊 Test 5: Asset Allocation - By protocol');
  await testEndpoint(
    'GET /portfolio/:walletAddress/allocation?groupBy=protocol',
    `${BASE_URL}/portfolio/${DEFI_FARMER}/allocation?groupBy=protocol`
  );
  
  // Test 6: Asset Allocation - By chain
  console.log('\n📊 Test 6: Asset Allocation - By chain');
  await testEndpoint(
    'GET /portfolio/:walletAddress/allocation?groupBy=chain',
    `${BASE_URL}/portfolio/${WHALE_WALLET}/allocation?groupBy=chain`
  );
  
  // Test 7: Asset Allocation - By category
  console.log('\n📊 Test 7: Asset Allocation - By category');
  await testEndpoint(
    'GET /portfolio/:walletAddress/allocation?groupBy=category',
    `${BASE_URL}/portfolio/${STABLECOIN_HOLDER}/allocation?groupBy=category`
  );
  
  // Test 8: Asset Allocation - With min allocation filter
  console.log('\n📊 Test 8: Asset Allocation - With min allocation filter');
  await testEndpoint(
    'GET /portfolio/:walletAddress/allocation?groupBy=token&minAllocation=10',
    `${BASE_URL}/portfolio/${WHALE_WALLET}/allocation?groupBy=token&minAllocation=10`
  );
  
  // Test 9: Holdings - Basic
  console.log('\n📊 Test 9: Holdings - Basic');
  await testEndpoint(
    'GET /portfolio/:walletAddress/holdings',
    `${BASE_URL}/portfolio/${WHALE_WALLET}/holdings`
  );
  
  // Test 10: Holdings - With pagination
  console.log('\n📊 Test 10: Holdings - With pagination');
  await testEndpoint(
    'GET /portfolio/:walletAddress/holdings?page=1&limit=5',
    `${BASE_URL}/portfolio/${WHALE_WALLET}/holdings?page=1&limit=5`
  );
  
  // Test 11: Holdings - With chain filter
  console.log('\n📊 Test 11: Holdings - With chain filter');
  await testEndpoint(
    'GET /portfolio/:walletAddress/holdings?chains=ethereum',
    `${BASE_URL}/portfolio/${WHALE_WALLET}/holdings?chains=ethereum`
  );
  
  // Test 12: Holdings - With min value filter
  console.log('\n📊 Test 12: Holdings - With min value filter');
  await testEndpoint(
    'GET /portfolio/:walletAddress/holdings?minValue=100000',
    `${BASE_URL}/portfolio/${WHALE_WALLET}/holdings?minValue=100000`
  );
  
  // Test 13: Performance - 7d
  console.log('\n📊 Test 13: Performance - 7d');
  await testEndpoint(
    'GET /portfolio/:walletAddress/performance?timeRange=7d',
    `${BASE_URL}/portfolio/${WHALE_WALLET}/performance?timeRange=7d`
  );
  
  // Test 14: Performance - 30d with ETH benchmark
  console.log('\n📊 Test 14: Performance - 30d with ETH benchmark');
  await testEndpoint(
    'GET /portfolio/:walletAddress/performance?timeRange=30d&benchmark=eth',
    `${BASE_URL}/portfolio/${WHALE_WALLET}/performance?timeRange=30d&benchmark=eth`
  );
  
  // Test 15: Performance - 90d with BTC benchmark
  console.log('\n📊 Test 15: Performance - 90d with BTC benchmark');
  await testEndpoint(
    'GET /portfolio/:walletAddress/performance?timeRange=90d&benchmark=btc',
    `${BASE_URL}/portfolio/${DEFI_FARMER}/performance?timeRange=90d&benchmark=btc`
  );
  
  // Test 16: Compare Wallets - 2 wallets
  console.log('\n📊 Test 16: Compare Wallets - 2 wallets');
  await testEndpoint(
    'GET /portfolio/compare?wallets=...&timeRange=30d',
    `${BASE_URL}/portfolio/compare?wallets=${WHALE_WALLET},${DEFI_FARMER}&timeRange=30d`
  );
  
  // Test 17: Compare Wallets - 3 wallets
  console.log('\n📊 Test 17: Compare Wallets - 3 wallets');
  await testEndpoint(
    'GET /portfolio/compare?wallets=...&timeRange=7d',
    `${BASE_URL}/portfolio/compare?wallets=${WHALE_WALLET},${DEFI_FARMER},${STABLECOIN_HOLDER}&timeRange=7d`
  );
  
  // Test 18: Error - Invalid wallet address
  console.log('\n📊 Test 18: Error - Invalid wallet address');
  await testEndpoint(
    'GET /portfolio/:walletAddress (invalid)',
    `${BASE_URL}/portfolio/0xInvalid`,
    400
  );
  
  // Test 19: Error - Non-existent wallet
  console.log('\n📊 Test 19: Error - Non-existent wallet');
  await testEndpoint(
    'GET /portfolio/:walletAddress (not found)',
    `${BASE_URL}/portfolio/0x0000000000000000000000000000000000000000`,
    404
  );
  
  // Test 20: Error - Invalid groupBy
  console.log('\n📊 Test 20: Error - Invalid groupBy');
  await testEndpoint(
    'GET /portfolio/:walletAddress/allocation?groupBy=invalid',
    `${BASE_URL}/portfolio/${WHALE_WALLET}/allocation?groupBy=invalid`,
    400
  );
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📈 Test Summary\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  const maxResponseTime = Math.max(...results.map(r => r.responseTime));
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`⏱️  Max Response Time: ${maxResponseTime}ms`);
  console.log(`📊 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`   - ${r.endpoint}: ${r.error}`);
      });
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run tests
runTests().catch(console.error);

