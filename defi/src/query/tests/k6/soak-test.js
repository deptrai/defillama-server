/**
 * k6 Soak Test
 * Long-running test to identify memory leaks, resource exhaustion, and stability issues
 */

import { sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import {
  mixedWorkload,
  errorRate,
  queryDuration,
  requestCounter,
} from './test-helpers.js';

// ============================================================================
// Test Configuration
// ============================================================================

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 VUs
    { duration: '30m', target: 50 },  // Stay at 50 VUs for 30 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.02'],
    query_duration: ['p(95)<1000', 'p(99)<2000'],
  },
};

// ============================================================================
// Test Scenarios
// ============================================================================

export default function () {
  // Execute mixed workload
  mixedWorkload();
}

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

export function setup() {
  console.log('🚀 Starting Soak Test');
  console.log('📊 Test Configuration:');
  console.log('   - Load: 50 VUs sustained for 30 minutes');
  console.log('   - Duration: ~34 minutes');
  console.log('   - Thresholds: P95 < 1s, P99 < 2s, Error rate < 2%');
  console.log('   - Goal: Identify memory leaks and long-term stability issues');
  console.log('');
}

export function teardown(data) {
  console.log('✅ Soak Test Complete');
}

export function handleSummary(data) {
  return {
    'soak-test-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

