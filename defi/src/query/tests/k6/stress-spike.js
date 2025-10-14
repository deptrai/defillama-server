/**
 * k6 Stress & Spike Test
 * Tests system limits, spike scenarios, and error handling under extreme load
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
    // Stress Test: Gradually increase load to find breaking point
    { duration: '1m', target: 50 },   // Ramp up to 50 VUs
    { duration: '2m', target: 50 },   // Stay at 50 VUs
    { duration: '1m', target: 100 },  // Ramp up to 100 VUs
    { duration: '2m', target: 100 },  // Stay at 100 VUs
    { duration: '1m', target: 200 },  // Ramp up to 200 VUs
    { duration: '2m', target: 200 },  // Stay at 200 VUs
    { duration: '1m', target: 300 },  // Ramp up to 300 VUs
    { duration: '2m', target: 300 },  // Stay at 300 VUs

    // Spike Test: Sudden spike in load
    { duration: '10s', target: 500 }, // Sudden spike to 500 VUs
    { duration: '1m', target: 500 },  // Stay at 500 VUs
    { duration: '10s', target: 100 }, // Drop back to 100 VUs

    // Recovery Test
    { duration: '2m', target: 100 },  // Stay at 100 VUs (recovery)
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // More lenient thresholds
    http_req_failed: ['rate<0.05'],                   // Error rate < 5%
    errors: ['rate<0.05'],
    query_duration: ['p(95)<2000', 'p(99)<5000'],
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
  console.log('🚀 Starting Stress & Spike Test');
  console.log('📊 Test Configuration:');
  console.log('   - Stress Test: 50 → 100 → 200 → 300 VUs');
  console.log('   - Spike Test: Sudden spike to 500 VUs');
  console.log('   - Duration: ~17 minutes');
  console.log('   - Thresholds: P95 < 2s, P99 < 5s, Error rate < 5%');
  console.log('   - Goal: Find system breaking point and test recovery');
  console.log('');
}

export function teardown(data) {
  console.log('✅ Stress & Spike Test Complete');
}

export function handleSummary(data) {
  return {
    'stress-spike-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

