/**
 * k6 Load Testing Script - Database
 * 
 * Description: Load test for database queries via API
 * Author: Augment Agent (Claude Sonnet 4)
 * Version: 1.0
 * Date: 2025-10-14
 * 
 * Target: High query throughput, <200ms latency
 * 
 * Usage: k6 run tests/load/k6-database.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const dbQueries = new Counter('db_queries');
const dbLatency = new Trend('db_latency');
const dbErrors = new Rate('db_errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 50 },     // Ramp up to 50 users
    { duration: '3m', target: 200 },    // Ramp up to 200 users
    { duration: '5m', target: 500 },    // Ramp up to 500 users
    { duration: '5m', target: 500 },    // Stay at 500 users
    { duration: '2m', target: 0 },      // Ramp down to 0 users
  ],
  thresholds: {
    db_latency: ['p(95)<200'],          // 95% of queries < 200ms
    db_errors: ['rate<0.01'],           // Error rate < 1%
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test 1: Simple SELECT query
  testSimpleQuery();
  
  // Test 2: JOIN query
  testJoinQuery();
  
  // Test 3: Aggregation query
  testAggregationQuery();
  
  // Test 4: Time-series query
  testTimeSeriesQuery();
  
  sleep(1);
}

function testSimpleQuery() {
  const res = http.get(`${BASE_URL}/api/protocols?limit=10`);
  
  const success = check(res, {
    'simple query status is 200': (r) => r.status === 200,
    'simple query response time < 100ms': (r) => r.timings.duration < 100,
  });
  
  dbQueries.add(1);
  dbLatency.add(res.timings.duration);
  dbErrors.add(!success);
}

function testJoinQuery() {
  const protocolId = Math.floor(Math.random() * 100) + 1;
  const res = http.get(`${BASE_URL}/api/protocols/${protocolId}/tvl`);
  
  const success = check(res, {
    'join query status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'join query response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  dbQueries.add(1);
  dbLatency.add(res.timings.duration);
  dbErrors.add(!success);
}

function testAggregationQuery() {
  const res = http.get(`${BASE_URL}/api/tvl/total`);
  
  const success = check(res, {
    'aggregation query status is 200': (r) => r.status === 200,
    'aggregation query response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  dbQueries.add(1);
  dbLatency.add(res.timings.duration);
  dbErrors.add(!success);
}

function testTimeSeriesQuery() {
  const days = Math.floor(Math.random() * 30) + 1;
  const res = http.get(`${BASE_URL}/api/tvl/history?days=${days}`);
  
  const success = check(res, {
    'time-series query status is 200': (r) => r.status === 200,
    'time-series query response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  dbQueries.add(1);
  dbLatency.add(res.timings.duration);
  dbErrors.add(!success);
}

