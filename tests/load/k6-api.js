/**
 * k6 Load Testing Script - API Endpoints
 * 
 * Description: Load test for DeFiLlama API endpoints
 * Author: Augment Agent (Claude Sonnet 4)
 * Version: 1.0
 * Date: 2025-10-14
 * 
 * Target: 10,000 concurrent connections, <200ms latency
 * 
 * Usage: k6 run tests/load/k6-api.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '5m', target: 1000 },   // Ramp up to 1,000 users
    { duration: '10m', target: 5000 },  // Ramp up to 5,000 users
    { duration: '5m', target: 10000 },  // Ramp up to 10,000 users
    { duration: '10m', target: 10000 }, // Stay at 10,000 users
    { duration: '5m', target: 0 },      // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],   // 95% of requests < 200ms
    http_req_failed: ['rate<0.05'],     // Error rate < 5%
    errors: ['rate<0.05'],              // Custom error rate < 5%
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test scenarios
export default function () {
  // Test 1: Health check
  testHealthCheck();
  
  // Test 2: Get protocols
  testGetProtocols();
  
  // Test 3: Get TVL data
  testGetTVL();
  
  // Test 4: Get protocol details
  testGetProtocolDetails();
  
  sleep(1);
}

function testHealthCheck() {
  const res = http.get(`${BASE_URL}/health`);
  
  const success = check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
}

function testGetProtocols() {
  const res = http.get(`${BASE_URL}/api/protocols`);
  
  const success = check(res, {
    'protocols status is 200': (r) => r.status === 200,
    'protocols response time < 200ms': (r) => r.timings.duration < 200,
    'protocols response has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) && data.length > 0;
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
}

function testGetTVL() {
  const res = http.get(`${BASE_URL}/api/tvl`);
  
  const success = check(res, {
    'TVL status is 200': (r) => r.status === 200,
    'TVL response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
}

function testGetProtocolDetails() {
  const protocolId = Math.floor(Math.random() * 100) + 1;
  const res = http.get(`${BASE_URL}/api/protocols/${protocolId}`);
  
  const success = check(res, {
    'protocol details status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'protocol details response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed');
}

