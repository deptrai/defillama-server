/**
 * k6 Cache Performance Test
 * Tests cache hit/miss scenarios and cache effectiveness
 */

import { group, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import {
  executeQuery,
  generateSimpleQuery,
  generateFilterQuery,
  cacheTestScenario,
  cacheHitRate,
  queryDuration,
} from './test-helpers.js';

// ============================================================================
// Test Configuration
// ============================================================================

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 VUs
    { duration: '2m', target: 10 },   // Stay at 10 VUs
    { duration: '30s', target: 30 },  // Ramp up to 30 VUs
    { duration: '2m', target: 30 },   // Stay at 30 VUs
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    cache_hits: ['rate>0.5'], // Expect >50% cache hit rate
    query_duration: ['p(95)<500'],
  },
};

// ============================================================================
// Test Scenarios
// ============================================================================

export default function () {
  // Test 1: Cache Miss → Cache Hit Pattern
  group('Cache Hit/Miss Pattern', function () {
    cacheTestScenario();
  });

  // Test 2: Repeated Queries (High Cache Hit Rate)
  group('Repeated Queries', function () {
    const query = generateSimpleQuery();

    // Execute same query 3 times
    for (let i = 0; i < 3; i++) {
      executeQuery(query, { test: 'repeated_query', iteration: i });
      sleep(0.1);
    }
  });

  // Test 3: Different Queries (Low Cache Hit Rate)
  group('Different Queries', function () {
    // Execute 3 different queries
    for (let i = 0; i < 3; i++) {
      const query = generateFilterQuery();
      executeQuery(query, { test: 'different_query', iteration: i });
      sleep(0.1);
    }
  });

  sleep(1);
}

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

export function setup() {
  console.log('🚀 Starting Cache Performance Test');
  console.log('📊 Test Configuration:');
  console.log('   - Stages: 10 VUs → 30 VUs');
  console.log('   - Duration: ~5.5 minutes');
  console.log('   - Test Scenarios: Cache hit/miss, repeated queries, different queries');
  console.log('   - Thresholds: P95 < 500ms, Cache hit rate > 50%');
  console.log('');
}

export function teardown(data) {
  console.log('✅ Cache Performance Test Complete');
}

export function handleSummary(data) {
  return {
    'cache-performance-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

