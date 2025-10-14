/**
 * k6 Pagination Load Test
 * Tests pagination performance with different page sizes and deep pagination
 */

import { group, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import {
  executeQuery,
  generatePaginationQuery,
  paginationScenario,
  queryDuration,
} from './test-helpers.js';

// ============================================================================
// Test Configuration
// ============================================================================

export const options = {
  stages: [
    { duration: '30s', target: 15 },  // Ramp up to 15 VUs
    { duration: '2m', target: 15 },   // Stay at 15 VUs
    { duration: '30s', target: 30 },  // Ramp up to 30 VUs
    { duration: '2m', target: 30 },   // Stay at 30 VUs
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    query_duration: ['p(95)<800', 'p(99)<1500'],
  },
};

// ============================================================================
// Test Scenarios
// ============================================================================

export default function () {
  // Test 1: Small Page Size (10 items)
  group('Small Page Size (10 items)', function () {
    const query = generatePaginationQuery(1, 10);
    executeQuery(query, { test: 'small_page' });
    sleep(0.3);
  });

  // Test 2: Medium Page Size (50 items)
  group('Medium Page Size (50 items)', function () {
    const query = generatePaginationQuery(1, 50);
    executeQuery(query, { test: 'medium_page' });
    sleep(0.3);
  });

  // Test 3: Large Page Size (100 items)
  group('Large Page Size (100 items)', function () {
    const query = generatePaginationQuery(1, 100);
    executeQuery(query, { test: 'large_page' });
    sleep(0.3);
  });

  // Test 4: Deep Pagination (Page 10)
  group('Deep Pagination (Page 10)', function () {
    const query = generatePaginationQuery(10, 50);
    executeQuery(query, { test: 'deep_pagination_10' });
    sleep(0.3);
  });

  // Test 5: Very Deep Pagination (Page 50)
  group('Very Deep Pagination (Page 50)', function () {
    const query = generatePaginationQuery(50, 50);
    executeQuery(query, { test: 'deep_pagination_50' });
    sleep(0.3);
  });

  // Test 6: Extremely Deep Pagination (Page 100)
  group('Extremely Deep Pagination (Page 100)', function () {
    const query = generatePaginationQuery(100, 50);
    executeQuery(query, { test: 'deep_pagination_100' });
    sleep(0.3);
  });

  sleep(1);
}

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

export function setup() {
  console.log('🚀 Starting Pagination Load Test');
  console.log('📊 Test Configuration:');
  console.log('   - Stages: 15 VUs → 30 VUs');
  console.log('   - Duration: ~5.5 minutes');
  console.log('   - Page Sizes: 10, 50, 100 items');
  console.log('   - Deep Pagination: Pages 10, 50, 100');
  console.log('   - Thresholds: P95 < 800ms, P99 < 1.5s');
  console.log('');
}

export function teardown(data) {
  console.log('✅ Pagination Load Test Complete');
}

export function handleSummary(data) {
  return {
    'pagination-load-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

