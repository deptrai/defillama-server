/**
 * k6 Baseline Performance Test
 * Establishes baseline performance metrics for simple queries
 */

import { sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import {
  executeQuery,
  generateSimpleQuery,
  errorRate,
  queryDuration,
  cacheHitRate,
  requestCounter,
} from './test-helpers.js';

// ============================================================================
// Test Configuration
// ============================================================================

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 VUs
    { duration: '1m', target: 10 },   // Stay at 10 VUs
    { duration: '30s', target: 50 },  // Ramp up to 50 VUs
    { duration: '2m', target: 50 },   // Stay at 50 VUs
    { duration: '30s', target: 100 }, // Ramp up to 100 VUs
    { duration: '2m', target: 100 },  // Stay at 100 VUs
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    errors: ['rate<0.01'],                           // Custom error rate < 1%
    query_duration: ['p(95)<500', 'p(99)<1000'],    // Query duration thresholds
  },
};

// ============================================================================
// Test Scenarios
// ============================================================================

export default function () {
  // Generate simple query
  const query = generateSimpleQuery();

  // Execute query
  executeQuery(query, { test: 'baseline' });

  // Think time (simulate user reading results)
  sleep(1);
}

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

export function setup() {
  console.log('🚀 Starting Baseline Performance Test');
  console.log('📊 Test Configuration:');
  console.log('   - Stages: 10 VUs → 50 VUs → 100 VUs');
  console.log('   - Duration: ~7 minutes');
  console.log('   - Thresholds: P95 < 500ms, P99 < 1s, Error rate < 1%');
  console.log('');
}

export function teardown(data) {
  console.log('✅ Baseline Performance Test Complete');
}

export function handleSummary(data) {
  return {
    'baseline-performance-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

