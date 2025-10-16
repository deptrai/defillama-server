/**
 * Comprehensive API Endpoint Tests
 * Tests all endpoints from Stories 2.2.2, 2.2.3, 3.1.1, and 3.1.2
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001/v1';

// Test data from seed files
const WALLET_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const TOKEN_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7'; // USDT
const USER_ID = 'user123';

interface TestResult {
  name: string;
  endpoint: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  dataCount?: number;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  endpoint: string,
  expectedStatus: number = 200
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status
    });
    
    const responseTime = Date.now() - startTime;
    const dataCount = Array.isArray(response.data) ? response.data.length : 
                     response.data?.data?.length || 0;
    
    if (response.status === expectedStatus) {
      return {
        name,
        endpoint,
        status: 'PASS',
        statusCode: response.status,
        responseTime,
        dataCount,
      };
    } else {
      return {
        name,
        endpoint,
        status: 'FAIL',
        statusCode: response.status,
        responseTime,
        error: `Expected ${expectedStatus}, got ${response.status}`,
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      name,
      endpoint,
      status: 'FAIL',
      responseTime,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('🧪 Comprehensive API Endpoint Tests');
  console.log('====================================\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Token: ${TOKEN_ADDRESS}`);
  console.log(`User: ${USER_ID}\n`);

  // Story 3.1.2: Trade Pattern Analysis
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Story 3.1.2: Trade Pattern Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.push(await testEndpoint(
    'Get Wallet Patterns',
    `/analytics/smart-money/wallets/${WALLET_ADDRESS}/patterns`
  ));

  results.push(await testEndpoint(
    'Get Wallet Patterns (Filtered - Accumulation)',
    `/analytics/smart-money/wallets/${WALLET_ADDRESS}/patterns?patternType=accumulation&limit=5`
  ));

  results.push(await testEndpoint(
    'Get Wallet Patterns (Filtered - Distribution)',
    `/analytics/smart-money/wallets/${WALLET_ADDRESS}/patterns?patternType=distribution&limit=5`
  ));

  results.push(await testEndpoint(
    'Get Wallet Patterns (Sorted by Confidence)',
    `/analytics/smart-money/wallets/${WALLET_ADDRESS}/patterns?sortBy=confidence&order=desc`
  ));

  results.push(await testEndpoint(
    'Get Wallet Trades',
    `/analytics/smart-money/wallets/${WALLET_ADDRESS}/trades`
  ));

  results.push(await testEndpoint(
    'Get Wallet Trades (Filtered - Buy)',
    `/analytics/smart-money/wallets/${WALLET_ADDRESS}/trades?tradeType=buy&limit=10`
  ));

  results.push(await testEndpoint(
    'Get Wallet Trades (Filtered - Sell)',
    `/analytics/smart-money/wallets/${WALLET_ADDRESS}/trades?tradeType=sell&limit=10`
  ));

  results.push(await testEndpoint(
    'Get Wallet Trades (Sorted by Amount)',
    `/analytics/smart-money/wallets/${WALLET_ADDRESS}/trades?sortBy=amount&order=desc`
  ));

  // Story 3.1.1: Smart Money Identification
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Story 3.1.1: Smart Money Identification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.push(await testEndpoint(
    'Get Smart Money Wallets',
    '/analytics/smart-money/wallets?minScore=70&limit=10'
  ));

  results.push(await testEndpoint(
    'Get Smart Money Wallets (High Score)',
    '/analytics/smart-money/wallets?minScore=85&limit=5'
  ));

  results.push(await testEndpoint(
    'Get Wallet Details',
    `/analytics/smart-money/wallets/${WALLET_ADDRESS}`
  ));

  results.push(await testEndpoint(
    'Get Wallet Metrics',
    `/analytics/smart-money/wallets/${WALLET_ADDRESS}/metrics`
  ));

  // Story 2.2.2: Holder Distribution Analysis
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Story 2.2.2: Holder Distribution Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.push(await testEndpoint(
    'Get Holder Distribution',
    `/analytics/tokens/${TOKEN_ADDRESS}/holders/distribution`
  ));

  results.push(await testEndpoint(
    'Get Top Holders',
    `/analytics/tokens/${TOKEN_ADDRESS}/holders/top?limit=10`
  ));

  results.push(await testEndpoint(
    'Get Top Holders (Limit 20)',
    `/analytics/tokens/${TOKEN_ADDRESS}/holders/top?limit=20`
  ));

  results.push(await testEndpoint(
    'Get Holder Behavior',
    `/analytics/tokens/${TOKEN_ADDRESS}/holders/behavior`
  ));

  // Story 2.2.3: Cross-chain Portfolio Aggregation
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Story 2.2.3: Cross-chain Portfolio');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.push(await testEndpoint(
    'Get Cross-chain Portfolio',
    `/analytics/portfolio/cross-chain/${USER_ID}`
  ));

  results.push(await testEndpoint(
    'Get Cross-chain Holdings',
    `/analytics/portfolio/cross-chain/${USER_ID}/holdings`
  ));

  results.push(await testEndpoint(
    'Get Cross-chain Performance',
    `/analytics/portfolio/cross-chain/${USER_ID}/performance`
  ));

  // Error Handling Tests
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Error Handling Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.push(await testEndpoint(
    'Invalid Wallet Address (404)',
    '/analytics/smart-money/wallets/0xinvalid/patterns',
    404
  ));

  results.push(await testEndpoint(
    'Invalid Token Address (404)',
    '/analytics/tokens/0xinvalid/holders/distribution',
    404
  ));

  results.push(await testEndpoint(
    'Invalid User ID (404)',
    '/analytics/portfolio/cross-chain/invalid-user',
    404
  ));

  // Print Results
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test Results Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${index + 1}. ${result.name}`);
    console.log(`   Endpoint: ${result.endpoint}`);
    console.log(`   Status: ${result.status} (${result.statusCode || 'N/A'})`);
    if (result.responseTime) {
      console.log(`   Response Time: ${result.responseTime}ms`);
    }
    if (result.dataCount !== undefined) {
      console.log(`   Data Count: ${result.dataCount} records`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Final Statistics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed} (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed / results.length) * 100).toFixed(1)}%)`);
  console.log(`⏭️  Skipped: ${skipped} (${((skipped / results.length) * 100).toFixed(1)}%)`);
  console.log('');

  const avgResponseTime = results
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
  console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms\n`);

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! 🎉\n');
    process.exit(0);
  } else {
    console.log('⚠️  SOME TESTS FAILED ⚠️\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});

