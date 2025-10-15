/**
 * Manual Test Script for Yield Opportunities API
 * Story: 2.1.2 - Yield Opportunity Scanner
 * 
 * Run: npx ts-node --transpile-only src/api2/routes/analytics/yield-opportunities/tests/manual-test.ts
 */

import * as handlers from '../handlers';

// Mock Request and Response classes
class MockRequest {
  constructor(
    public query: any = {},
    public params: any = {},
    public body: any = {}
  ) {}
}

class MockResponse {
  private statusCode: number = 200;
  private data: any = null;
  private headers: Record<string, string> = {};

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.data = data;
    return this;
  }

  setHeaders(headers: Record<string, string>) {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  removeHeader(name: string) {
    delete this.headers[name];
    return this;
  }

  getResult() {
    return {
      statusCode: this.statusCode,
      data: this.data,
      headers: this.headers,
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Yield Opportunities API Endpoints\n');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: GET /yield-opportunities (default params)
  totalTests++;
  console.log('TEST 1: GET /yield-opportunities (default params)');
  try {
    const req = new MockRequest();
    const res = new MockResponse();
    await handlers.getOpportunities(req as any, res as any);
    const result = res.getResult();
    
    if (result.statusCode === 200 && result.data.opportunities && result.data.total > 0) {
      console.log('✅ PASS - Got opportunities:', result.data.total);
      passedTests++;
    } else {
      console.log('❌ FAIL - Status:', result.statusCode, 'Data:', result.data);
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error);
  }
  console.log('');

  // Test 2: GET /yield-opportunities (with filters)
  totalTests++;
  console.log('TEST 2: GET /yield-opportunities (with filters)');
  try {
    const req = new MockRequest({ chains: ['ethereum'], minApy: 5, maxRiskScore: 30 });
    const res = new MockResponse();
    await handlers.getOpportunities(req as any, res as any);
    const result = res.getResult();
    
    if (result.statusCode === 200 && result.data.opportunities) {
      const allMatch = result.data.opportunities.every((o: any) => 
        o.chainId === 'ethereum' && o.apy >= 5 && o.riskScore <= 30
      );
      if (allMatch) {
        console.log('✅ PASS - Filters work correctly');
        passedTests++;
      } else {
        console.log('❌ FAIL - Filters not applied correctly');
      }
    } else {
      console.log('❌ FAIL - Status:', result.statusCode);
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error);
  }
  console.log('');

  // Test 3: GET /yield-opportunities (invalid params)
  totalTests++;
  console.log('TEST 3: GET /yield-opportunities (invalid params)');
  try {
    const req = new MockRequest({ minApy: 'invalid' });
    const res = new MockResponse();
    await handlers.getOpportunities(req as any, res as any);
    const result = res.getResult();
    
    if (result.statusCode === 400 && result.data.error === 'Validation failed') {
      console.log('✅ PASS - Validation error returned');
      passedTests++;
    } else {
      console.log('❌ FAIL - Expected 400, got:', result.statusCode);
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error);
  }
  console.log('');

  // Test 4: GET /yield-opportunities/:id/history
  totalTests++;
  console.log('TEST 4: GET /yield-opportunities/:id/history');
  try {
    // First get an opportunity ID
    const req1 = new MockRequest({}, {}, {});
    const res1 = new MockResponse();
    await handlers.getOpportunities(req1 as any, res1 as any);
    const opportunityId = res1.getResult().data.opportunities[0].id;

    const req = new MockRequest({ timeRange: '30d' }, { id: opportunityId });
    const res = new MockResponse();
    await handlers.getHistory(req as any, res as any);
    const result = res.getResult();
    
    if (result.statusCode === 200 && result.data.history && result.data.stats) {
      console.log('✅ PASS - Got history with', result.data.history.length, 'points');
      passedTests++;
    } else {
      console.log('❌ FAIL - Status:', result.statusCode);
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error);
  }
  console.log('');

  // Test 5: GET /yield-opportunities/top
  totalTests++;
  console.log('TEST 5: GET /yield-opportunities/top (highest_apy)');
  try {
    const req = new MockRequest({ category: 'highest_apy', limit: 5 });
    const res = new MockResponse();
    await handlers.getTop(req as any, res as any);
    const result = res.getResult();
    
    if (result.statusCode === 200 && result.data.opportunities.length === 5) {
      // Check if sorted by APY descending
      const sorted = result.data.opportunities.every((o: any, i: number, arr: any[]) => 
        i === 0 || arr[i - 1].apy >= o.apy
      );
      if (sorted) {
        console.log('✅ PASS - Top 5 opportunities sorted by APY');
        passedTests++;
      } else {
        console.log('❌ FAIL - Not sorted correctly');
      }
    } else {
      console.log('❌ FAIL - Status:', result.statusCode);
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error);
  }
  console.log('');

  // Test 6: GET /yield-opportunities/top (invalid category)
  totalTests++;
  console.log('TEST 6: GET /yield-opportunities/top (invalid category)');
  try {
    const req = new MockRequest({ category: 'invalid_category' });
    const res = new MockResponse();
    await handlers.getTop(req as any, res as any);
    const result = res.getResult();
    
    if (result.statusCode === 400) {
      console.log('✅ PASS - Validation error for invalid category');
      passedTests++;
    } else {
      console.log('❌ FAIL - Expected 400, got:', result.statusCode);
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error);
  }
  console.log('');

  // Test 7: POST /yield-alerts (create alert)
  totalTests++;
  console.log('TEST 7: POST /yield-alerts (create alert)');
  try {
    const req = new MockRequest({}, {}, {
      userId: 'test-user-123',
      alertType: 'yield_increase',
      threshold: 10,
      minApy: 5,
      maxRiskScore: 50,
      channels: ['email'],
    });
    const res = new MockResponse();
    await handlers.createAlert(req as any, res as any);
    const result = res.getResult();
    
    if (result.statusCode === 201 && result.data.id) {
      console.log('✅ PASS - Alert created with ID:', result.data.id);
      passedTests++;
      
      // Clean up
      const { alertMatchingEngine } = await import('../../../../../analytics/engines/alert-matching-engine');
      await alertMatchingEngine.deleteAlert(result.data.id);
    } else {
      console.log('❌ FAIL - Status:', result.statusCode);
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error);
  }
  console.log('');

  // Test 8: POST /yield-alerts (invalid data)
  totalTests++;
  console.log('TEST 8: POST /yield-alerts (invalid data)');
  try {
    const req = new MockRequest({}, {}, {
      userId: 'test-user-123',
      // Missing required fields
    });
    const res = new MockResponse();
    await handlers.createAlert(req as any, res as any);
    const result = res.getResult();
    
    if (result.statusCode === 400) {
      console.log('✅ PASS - Validation error for missing fields');
      passedTests++;
    } else {
      console.log('❌ FAIL - Expected 400, got:', result.statusCode);
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error);
  }
  console.log('');

  // Test 9: GET /yield-alerts
  totalTests++;
  console.log('TEST 9: GET /yield-alerts');
  try {
    // Create an alert first
    const { alertMatchingEngine } = await import('../../../../../analytics/engines/alert-matching-engine');
    const alert = await alertMatchingEngine.createAlert({
      userId: 'test-user-456',
      alertType: 'yield_increase',
      threshold: 10,
      channels: ['email'],
      enabled: true,
    });

    const req = new MockRequest({ userId: 'test-user-456' });
    const res = new MockResponse();
    await handlers.getAlerts(req as any, res as any);
    const result = res.getResult();
    
    if (result.statusCode === 200 && result.data.alerts.length > 0) {
      console.log('✅ PASS - Got alerts for user');
      passedTests++;
    } else {
      console.log('❌ FAIL - Status:', result.statusCode);
    }

    // Clean up
    await alertMatchingEngine.deleteAlert(alert.id);
  } catch (error) {
    console.log('❌ FAIL - Error:', error);
  }
  console.log('');

  // Test 10: GET /yield-alerts (missing userId)
  totalTests++;
  console.log('TEST 10: GET /yield-alerts (missing userId)');
  try {
    const req = new MockRequest({});
    const res = new MockResponse();
    await handlers.getAlerts(req as any, res as any);
    const result = res.getResult();
    
    if (result.statusCode === 400) {
      console.log('✅ PASS - Validation error for missing userId');
      passedTests++;
    } else {
      console.log('❌ FAIL - Expected 400, got:', result.statusCode);
    }
  } catch (error) {
    console.log('❌ FAIL - Error:', error);
  }
  console.log('');

  // Summary
  console.log('═'.repeat(50));
  console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed`);
  console.log('═'.repeat(50));

  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

