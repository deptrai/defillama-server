/**
 * Manual Testing Script for Analytics API
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Phase: 2 - API Implementation
 * 
 * This script tests all 5 analytics endpoints without starting the server.
 * It directly calls the handler functions with mock request/response objects.
 */

import {
  getProtocolPerformance,
  getProtocolAPY,
  getProtocolUsers,
  getProtocolRevenue,
  getProtocolsBenchmark,
} from '../handlers';

// Mock request/response objects
class MockRequest {
  params: Record<string, string> = {};
  query: Record<string, string> = {};
  path_parameters: Record<string, string> = {};
  query_parameters: Record<string, string> = {};

  constructor(params: Record<string, string> = {}, query: Record<string, string> = {}) {
    this.params = params;
    this.query = query;
    this.path_parameters = params;
    this.query_parameters = query;
  }
}

class MockResponse {
  statusCode: number = 200;
  headers: Record<string, string> = {};
  body: any = null;
  
  status(code: number) {
    this.statusCode = code;
    return this;
  }
  
  header(name: string, value: string) {
    this.headers[name] = value;
    return this;
  }
  
  json(data: any) {
    this.body = data;
    return this;
  }
  
  send(data: any) {
    this.body = data;
    return this;
  }
}

// Test utilities
function printTestHeader(testName: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`TEST: ${testName}`);
  console.log('='.repeat(80));
}

function printResult(res: MockResponse) {
  console.log(`\nStatus: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log(`Body:`, JSON.stringify(res.body, null, 2));
}

async function runTests() {
  console.log('🧪 Analytics API Manual Testing');
  console.log('================================\n');
  
  // Test 1: Protocol Performance - Valid Request
  printTestHeader('1. GET /analytics/protocol/:protocolId/performance - Valid');
  try {
    const req = new MockRequest(
      { protocolId: 'uniswap' },
      { timeRange: '30d', includeHistory: 'true' }
    );
    const res = new MockResponse();

    await getProtocolPerformance(req as any, res as any);
    printResult(res);

    if (res.statusCode === 200) {
      console.log('✅ PASS: Valid request returned 200');
    } else {
      console.log('❌ FAIL: Expected 200, got', res.statusCode);
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    console.log('Stack:', error.stack);
  }
  
  // Test 2: Protocol Performance - Invalid Protocol ID
  printTestHeader('2. GET /analytics/protocol/:protocolId/performance - Invalid Protocol ID');
  try {
    const req = new MockRequest(
      { protocolId: 'invalid@protocol' },
      { timeRange: '30d' }
    );
    const res = new MockResponse();
    
    await getProtocolPerformance(req as any, res as any);
    printResult(res);
    
    if (res.statusCode === 400) {
      console.log('✅ PASS: Invalid protocol ID returned 400');
    } else {
      console.log('❌ FAIL: Expected 400, got', res.statusCode);
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
  }
  
  // Test 3: Protocol APY - Valid Request
  printTestHeader('3. GET /analytics/protocol/:protocolId/apy - Valid');
  try {
    const req = new MockRequest(
      { protocolId: 'aave' },
      { timeRange: '90d' }
    );
    const res = new MockResponse();
    
    await getProtocolAPY(req as any, res as any);
    printResult(res);
    
    if (res.statusCode === 200) {
      console.log('✅ PASS: Valid request returned 200');
    } else {
      console.log('❌ FAIL: Expected 200, got', res.statusCode);
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
  }
  
  // Test 4: Protocol APY - Invalid Time Range
  printTestHeader('4. GET /analytics/protocol/:protocolId/apy - Invalid Time Range');
  try {
    const req = new MockRequest(
      { protocolId: 'aave' },
      { timeRange: '1d' }
    );
    const res = new MockResponse();
    
    await getProtocolAPY(req as any, res as any);
    printResult(res);
    
    if (res.statusCode === 400) {
      console.log('✅ PASS: Invalid time range returned 400');
    } else {
      console.log('❌ FAIL: Expected 400, got', res.statusCode);
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
  }
  
  // Test 5: Protocol Users - Valid Request
  printTestHeader('5. GET /analytics/protocol/:protocolId/users - Valid');
  try {
    const req = new MockRequest(
      { protocolId: 'compound' },
      { date: '2024-01-15', periods: '12' }
    );
    const res = new MockResponse();
    
    await getProtocolUsers(req as any, res as any);
    printResult(res);
    
    if (res.statusCode === 200) {
      console.log('✅ PASS: Valid request returned 200');
    } else {
      console.log('❌ FAIL: Expected 200, got', res.statusCode);
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
  }
  
  // Test 6: Protocol Users - Invalid Periods
  printTestHeader('6. GET /analytics/protocol/:protocolId/users - Invalid Periods');
  try {
    const req = new MockRequest(
      { protocolId: 'compound' },
      { periods: '30' }
    );
    const res = new MockResponse();
    
    await getProtocolUsers(req as any, res as any);
    printResult(res);
    
    if (res.statusCode === 400) {
      console.log('✅ PASS: Invalid periods returned 400');
    } else {
      console.log('❌ FAIL: Expected 400, got', res.statusCode);
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
  }
  
  // Test 7: Protocol Revenue - Valid Request
  printTestHeader('7. GET /analytics/protocol/:protocolId/revenue - Valid');
  try {
    const req = new MockRequest(
      { protocolId: 'curve' },
      { timeRange: '1y' }
    );
    const res = new MockResponse();
    
    await getProtocolRevenue(req as any, res as any);
    printResult(res);
    
    if (res.statusCode === 200) {
      console.log('✅ PASS: Valid request returned 200');
    } else {
      console.log('❌ FAIL: Expected 200, got', res.statusCode);
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
  }
  
  // Test 8: Protocols Benchmark - Valid Request
  printTestHeader('8. GET /analytics/protocols/benchmark - Valid');
  try {
    const req = new MockRequest(
      {},
      { protocolIds: 'uniswap,aave,compound', category: 'dex', metric: 'tvl' }
    );
    const res = new MockResponse();
    
    await getProtocolsBenchmark(req as any, res as any);
    printResult(res);
    
    if (res.statusCode === 200) {
      console.log('✅ PASS: Valid request returned 200');
    } else {
      console.log('❌ FAIL: Expected 200, got', res.statusCode);
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
  }
  
  // Test 9: Protocols Benchmark - Too Many Protocols
  printTestHeader('9. GET /analytics/protocols/benchmark - Too Many Protocols');
  try {
    const protocolIds = Array(21).fill('protocol').join(',');
    const req = new MockRequest(
      {},
      { protocolIds }
    );
    const res = new MockResponse();
    
    await getProtocolsBenchmark(req as any, res as any);
    printResult(res);
    
    if (res.statusCode === 400) {
      console.log('✅ PASS: Too many protocols returned 400');
    } else {
      console.log('❌ FAIL: Expected 400, got', res.statusCode);
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
  }
  
  // Test 10: Cache Headers Verification
  printTestHeader('10. Cache Headers Verification');
  try {
    const req = new MockRequest(
      { protocolId: 'uniswap' },
      { timeRange: '7d' }
    );
    const res = new MockResponse();
    
    await getProtocolPerformance(req as any, res as any);
    
    const hasExpires = 'Expires' in res.headers;
    const hasCacheControl = 'Cache-Control' in res.headers;
    
    console.log(`\nExpires header: ${hasExpires ? '✅' : '❌'}`);
    console.log(`Cache-Control header: ${hasCacheControl ? '✅' : '❌'}`);
    
    if (hasExpires && hasCacheControl) {
      console.log('✅ PASS: Cache headers present');
    } else {
      console.log('❌ FAIL: Missing cache headers');
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 Manual Testing Complete');
  console.log('='.repeat(80) + '\n');
}

// Run tests
runTests().catch(console.error);

