/**
 * Manual Test Script: Smart Money API
 * Story: 3.1.1 - Smart Money Identification
 * 
 * Tests the GET /v1/analytics/smart-money/wallets endpoint
 * 
 * Usage:
 *   npx ts-node --transpile-only src/analytics/collectors/test-smart-money-api.ts
 */

const API_BASE_URL = 'http://localhost:3000/v1';

interface TestCase {
  name: string;
  endpoint: string;
  expectedStatus: number;
  validate?: (data: any) => void;
}

/**
 * Make HTTP GET request
 */
async function get(url: string): Promise<{ status: number; data: any }> {
  const response = await fetch(url);
  const data = await response.json();
  return { status: response.status, data };
}

/**
 * Run test case
 */
async function runTest(test: TestCase): Promise<boolean> {
  console.log(`\n🧪 Test: ${test.name}`);
  console.log(`   URL: ${test.endpoint}`);

  try {
    const { status, data } = await get(test.endpoint);

    // Check status code
    if (status !== test.expectedStatus) {
      console.log(`   ❌ FAILED: Expected status ${test.expectedStatus}, got ${status}`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      return false;
    }

    // Run custom validation
    if (test.validate) {
      test.validate(data);
    }

    console.log(`   ✅ PASSED`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Main test suite
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Smart Money API Test Suite');
  console.log('Story: 3.1.1 - Smart Money Identification');
  console.log('='.repeat(80));

  const tests: TestCase[] = [
    // Test 1: Basic request (default parameters)
    {
      name: 'GET /wallets - Default parameters',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets`,
      expectedStatus: 200,
      validate: (data) => {
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Response should have data array');
        }
        if (!data.pagination) {
          throw new Error('Response should have pagination object');
        }
        if (data.pagination.page !== 1) {
          throw new Error('Default page should be 1');
        }
        if (data.pagination.limit !== 20) {
          throw new Error('Default limit should be 20');
        }
        console.log(`   📊 Found ${data.data.length} wallets (total: ${data.pagination.total})`);
      },
    },

    // Test 2: Filter by chain
    {
      name: 'GET /wallets - Filter by chain (ethereum)',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets?chains=ethereum`,
      expectedStatus: 200,
      validate: (data) => {
        if (data.data.length > 0) {
          const allEthereum = data.data.every((w: any) => w.chainId === 'ethereum');
          if (!allEthereum) {
            throw new Error('All wallets should be on ethereum chain');
          }
        }
        console.log(`   📊 Found ${data.data.length} ethereum wallets`);
      },
    },

    // Test 3: Filter by multiple chains
    {
      name: 'GET /wallets - Filter by multiple chains',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets?chains=ethereum,polygon`,
      expectedStatus: 200,
      validate: (data) => {
        if (data.data.length > 0) {
          const validChains = data.data.every((w: any) => 
            w.chainId === 'ethereum' || w.chainId === 'polygon'
          );
          if (!validChains) {
            throw new Error('All wallets should be on ethereum or polygon');
          }
        }
        console.log(`   📊 Found ${data.data.length} wallets on ethereum/polygon`);
      },
    },

    // Test 4: Filter by minimum score
    {
      name: 'GET /wallets - Filter by minScore=80',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets?minScore=80`,
      expectedStatus: 200,
      validate: (data) => {
        if (data.data.length > 0) {
          const allHighScore = data.data.every((w: any) => w.smartMoneyScore >= 80);
          if (!allHighScore) {
            throw new Error('All wallets should have score >= 80');
          }
        }
        console.log(`   📊 Found ${data.data.length} wallets with score >= 80`);
      },
    },

    // Test 5: Filter by verified status
    {
      name: 'GET /wallets - Filter by verified=true',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets?verified=true`,
      expectedStatus: 200,
      validate: (data) => {
        if (data.data.length > 0) {
          const allVerified = data.data.every((w: any) => w.verified === true);
          if (!allVerified) {
            throw new Error('All wallets should be verified');
          }
        }
        console.log(`   📊 Found ${data.data.length} verified wallets`);
      },
    },

    // Test 6: Filter by wallet type
    {
      name: 'GET /wallets - Filter by walletType=whale',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets?walletType=whale`,
      expectedStatus: 200,
      validate: (data) => {
        if (data.data.length > 0) {
          const allWhales = data.data.every((w: any) => w.walletType === 'whale');
          if (!allWhales) {
            throw new Error('All wallets should be whales');
          }
        }
        console.log(`   📊 Found ${data.data.length} whale wallets`);
      },
    },

    // Test 7: Sort by ROI
    {
      name: 'GET /wallets - Sort by ROI (descending)',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets?sortBy=roi&sortOrder=desc&limit=10`,
      expectedStatus: 200,
      validate: (data) => {
        if (data.data.length > 1) {
          for (let i = 0; i < data.data.length - 1; i++) {
            if (data.data[i].roiAllTime < data.data[i + 1].roiAllTime) {
              throw new Error('Wallets should be sorted by ROI descending');
            }
          }
        }
        console.log(`   📊 Top wallet ROI: ${data.data[0]?.roiAllTime || 'N/A'}`);
      },
    },

    // Test 8: Sort by total trades
    {
      name: 'GET /wallets - Sort by trades (descending)',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets?sortBy=trades&sortOrder=desc&limit=10`,
      expectedStatus: 200,
      validate: (data) => {
        if (data.data.length > 1) {
          for (let i = 0; i < data.data.length - 1; i++) {
            if (data.data[i].totalTrades < data.data[i + 1].totalTrades) {
              throw new Error('Wallets should be sorted by trades descending');
            }
          }
        }
        console.log(`   📊 Top wallet trades: ${data.data[0]?.totalTrades || 'N/A'}`);
      },
    },

    // Test 9: Pagination (page 2)
    {
      name: 'GET /wallets - Pagination (page 2, limit 5)',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets?page=2&limit=5`,
      expectedStatus: 200,
      validate: (data) => {
        if (data.pagination.page !== 2) {
          throw new Error('Page should be 2');
        }
        if (data.pagination.limit !== 5) {
          throw new Error('Limit should be 5');
        }
        if (data.data.length > 5) {
          throw new Error('Should return at most 5 results');
        }
        console.log(`   📊 Page 2: ${data.data.length} wallets`);
      },
    },

    // Test 10: Combined filters
    {
      name: 'GET /wallets - Combined filters',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets?chains=ethereum&minScore=70&walletType=trader&sortBy=score&limit=10`,
      expectedStatus: 200,
      validate: (data) => {
        if (data.data.length > 0) {
          const valid = data.data.every((w: any) => 
            w.chainId === 'ethereum' &&
            w.smartMoneyScore >= 70 &&
            w.walletType === 'trader'
          );
          if (!valid) {
            throw new Error('All wallets should match combined filters');
          }
        }
        console.log(`   📊 Found ${data.data.length} ethereum traders with score >= 70`);
      },
    },

    // Test 11: Invalid minScore (should fail)
    {
      name: 'GET /wallets - Invalid minScore (should return 400)',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets?minScore=150`,
      expectedStatus: 400,
      validate: (data) => {
        if (!data.error) {
          throw new Error('Should return error object');
        }
        console.log(`   📊 Error message: ${data.message}`);
      },
    },

    // Test 12: Invalid walletType (should fail)
    {
      name: 'GET /wallets - Invalid walletType (should return 400)',
      endpoint: `${API_BASE_URL}/analytics/smart-money/wallets?walletType=invalid`,
      expectedStatus: 400,
      validate: (data) => {
        if (!data.error) {
          throw new Error('Should return error object');
        }
        console.log(`   📊 Error message: ${data.message}`);
      },
    },
  ];

  // Run all tests
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await runTest(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('Test Summary');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${tests.length}`);
  console.log('='.repeat(80));

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

