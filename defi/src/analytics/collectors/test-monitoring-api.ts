/**
 * Manual Test Script: Monitoring API
 * Story: 3.1.1 - Smart Money Identification (Enhancement 4)
 * 
 * Test monitoring dashboard and metrics endpoints
 * 
 * Usage:
 *   npx ts-node src/analytics/collectors/test-monitoring-api.ts
 */

const BASE_URL = 'http://localhost:3000/v1/analytics/smart-money';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const url = `${BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  return {
    status: response.status,
    data,
  };
}

/**
 * Test 1: Get monitoring dashboard
 */
async function testGetMonitoringDashboard() {
  try {
    const response = await makeRequest('/monitoring');
    
    if (response.status === 200 && response.data.success) {
      const dashboard = response.data.data;
      
      // Verify dashboard structure
      if (
        dashboard.cache &&
        dashboard.job &&
        dashboard.api &&
        dashboard.volatility &&
        dashboard.timestamp
      ) {
        results.push({
          name: 'Get Monitoring Dashboard',
          passed: true,
          data: dashboard,
        });
      } else {
        results.push({
          name: 'Get Monitoring Dashboard',
          passed: false,
          error: 'Invalid dashboard structure',
        });
      }
    } else {
      results.push({
        name: 'Get Monitoring Dashboard',
        passed: false,
        error: `Status: ${response.status}`,
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Get Monitoring Dashboard',
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 2: Get cache metrics
 */
async function testGetCacheMetrics() {
  try {
    const response = await makeRequest('/monitoring/cache');
    
    if (response.status === 200 && response.data.success) {
      const metrics = response.data.data;
      
      // Verify metrics structure
      if (
        typeof metrics.hits === 'number' &&
        typeof metrics.misses === 'number' &&
        typeof metrics.hitRate === 'number' &&
        typeof metrics.totalRequests === 'number'
      ) {
        results.push({
          name: 'Get Cache Metrics',
          passed: true,
          data: metrics,
        });
      } else {
        results.push({
          name: 'Get Cache Metrics',
          passed: false,
          error: 'Invalid metrics structure',
        });
      }
    } else {
      results.push({
        name: 'Get Cache Metrics',
        passed: false,
        error: `Status: ${response.status}`,
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Get Cache Metrics',
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 3: Get job metrics
 */
async function testGetJobMetrics() {
  try {
    const response = await makeRequest('/monitoring/job');
    
    if (response.status === 200 && response.data.success) {
      const metrics = response.data.data;
      
      // Verify metrics structure
      if (
        typeof metrics.totalRuns === 'number' &&
        typeof metrics.successfulRuns === 'number' &&
        typeof metrics.failedRuns === 'number' &&
        typeof metrics.avgDuration === 'number'
      ) {
        results.push({
          name: 'Get Job Metrics',
          passed: true,
          data: metrics,
        });
      } else {
        results.push({
          name: 'Get Job Metrics',
          passed: false,
          error: 'Invalid metrics structure',
        });
      }
    } else {
      results.push({
        name: 'Get Job Metrics',
        passed: false,
        error: `Status: ${response.status}`,
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Get Job Metrics',
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 4: Get API metrics
 */
async function testGetAPIMetrics() {
  try {
    const response = await makeRequest('/monitoring/api');
    
    if (response.status === 200 && response.data.success) {
      const metrics = response.data.data;
      
      // Verify metrics structure
      if (
        typeof metrics.totalRequests === 'number' &&
        typeof metrics.avgResponseTime === 'number' &&
        typeof metrics.errorRate === 'number'
      ) {
        results.push({
          name: 'Get API Metrics',
          passed: true,
          data: metrics,
        });
      } else {
        results.push({
          name: 'Get API Metrics',
          passed: false,
          error: 'Invalid metrics structure',
        });
      }
    } else {
      results.push({
        name: 'Get API Metrics',
        passed: false,
        error: `Status: ${response.status}`,
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Get API Metrics',
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 5: Generate some API traffic to populate metrics
 */
async function testGenerateTraffic() {
  try {
    // Make 10 requests to wallets endpoint
    for (let i = 0; i < 10; i++) {
      await makeRequest('/wallets?limit=10');
    }
    
    results.push({
      name: 'Generate API Traffic',
      passed: true,
      data: { requests: 10 },
    });
  } catch (error: any) {
    results.push({
      name: 'Generate API Traffic',
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Test 6: Verify metrics updated after traffic
 */
async function testMetricsAfterTraffic() {
  try {
    const response = await makeRequest('/monitoring');
    
    if (response.status === 200 && response.data.success) {
      const dashboard = response.data.data;
      
      // Verify API metrics show traffic
      if (dashboard.api.totalRequests > 0) {
        results.push({
          name: 'Metrics After Traffic',
          passed: true,
          data: {
            totalRequests: dashboard.api.totalRequests,
            avgResponseTime: dashboard.api.avgResponseTime,
            cacheHitRate: dashboard.cache.hitRate,
          },
        });
      } else {
        results.push({
          name: 'Metrics After Traffic',
          passed: false,
          error: 'No traffic recorded',
        });
      }
    } else {
      results.push({
        name: 'Metrics After Traffic',
        passed: false,
        error: `Status: ${response.status}`,
      });
    }
  } catch (error: any) {
    results.push({
      name: 'Metrics After Traffic',
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Testing Monitoring API...\n');

  await testGetMonitoringDashboard();
  await testGetCacheMetrics();
  await testGetJobMetrics();
  await testGetAPIMetrics();
  await testGenerateTraffic();
  
  // Wait a bit for metrics to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testMetricsAfterTraffic();

  // Print results
  console.log('\n📊 Test Results:\n');
  
  let passed = 0;
  let failed = 0;

  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.name}`);
    
    if (result.passed) {
      passed++;
      if (result.data) {
        console.log(`   Data:`, JSON.stringify(result.data, null, 2));
      }
    } else {
      failed++;
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

