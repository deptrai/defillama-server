/**
 * k6 Complex Query Load Test
 * Tests performance of complex queries with filters, aggregations, and GROUP BY
 */

import { group, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import {
  executeQuery,
  generateFilterQuery,
  generateAggregationQuery,
  generateComplexFilterQuery,
  errorRate,
  queryDuration,
} from './test-helpers.js';

// ============================================================================
// Test Configuration
// ============================================================================

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 VUs
    { duration: '3m', target: 20 },   // Stay at 20 VUs
    { duration: '1m', target: 50 },   // Ramp up to 50 VUs
    { duration: '3m', target: 50 },   // Stay at 50 VUs
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // More lenient for complex queries
    http_req_failed: ['rate<0.02'],                   // Error rate < 2%
    errors: ['rate<0.02'],
    query_duration: ['p(95)<1000', 'p(99)<2000'],
  },
};

// ============================================================================
// Test Scenarios
// ============================================================================

export default function () {
  // Test 1: Simple Filter Queries
  group('Simple Filter Queries', function () {
    const query = generateFilterQuery();
    executeQuery(query, { test: 'simple_filter' });
    sleep(0.5);
  });

  // Test 2: Complex Filter Queries (AND/OR)
  group('Complex Filter Queries', function () {
    const query = generateComplexFilterQuery();
    executeQuery(query, { test: 'complex_filter' });
    sleep(0.5);
  });

  // Test 3: Aggregation Queries
  group('Aggregation Queries', function () {
    const query = generateAggregationQuery();
    executeQuery(query, { test: 'aggregation' });
    sleep(0.5);
  });

  // Think time
  sleep(1);
}

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

export function setup() {
  console.log('🚀 Starting Complex Query Load Test');
  console.log('📊 Test Configuration:');
  console.log('   - Stages: 20 VUs → 50 VUs');
  console.log('   - Duration: ~9 minutes');
  console.log('   - Query Types: Filters, Aggregations, GROUP BY');
  console.log('   - Thresholds: P95 < 1s, P99 < 2s, Error rate < 2%');
  console.log('');
}

export function teardown(data) {
  console.log('✅ Complex Query Load Test Complete');
}

export function handleSummary(data) {
  return {
    'complex-query-load-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

