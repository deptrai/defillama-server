// k6 Load Test Script for DeFiLlama Premium Alerts
// Story 1.1.3: Load Testing with k6

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const alertCreationTime = new Trend('alert_creation_time');
const alertRetrievalTime = new Trend('alert_retrieval_time');
const gasQueryTime = new Trend('gas_query_time');
const totalRequests = new Counter('total_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Warm up to 10 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 100 },  // Peak at 100 users
    { duration: '2m', target: 50 },   // Ramp down to 50 users
    { duration: '1m', target: 0 },    // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.01'],                  // Error rate < 1%
    'errors': ['rate<0.01'],                           // Custom error rate < 1%
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/v2/premium';

// Test users
const TEST_USERS = [
  'k6-user-1',
  'k6-user-2',
  'k6-user-3',
  'k6-user-4',
  'k6-user-5',
];

// Helper function to get random user
function getRandomUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

// Helper function to get auth headers
function getHeaders(userId) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer test-token-${userId}`,
  };
}

// Test scenario 1: Create Whale Alert
export function createWhaleAlert() {
  const userId = getRandomUser();
  const payload = JSON.stringify({
    name: `k6 Whale Alert ${Date.now()}`,
    type: 'whale',
    conditions: {
      chain: 'ethereum',
      token: 'USDT',
      threshold_usd: 1000000,
    },
    actions: {
      channels: ['email'],
    },
    enabled: true,
  });

  const res = http.post(
    `${BASE_URL}${API_PREFIX}/alerts/whale`,
    payload,
    { headers: getHeaders(userId) }
  );

  totalRequests.add(1);
  alertCreationTime.add(res.timings.duration);

  const success = check(res, {
    'whale alert created': (r) => r.status === 201,
    'response has data': (r) => r.json('data') !== undefined,
  });

  errorRate.add(!success);
  sleep(1);

  return res.json('data.id');
}

// Test scenario 2: Get Whale Alerts (List)
export function getWhaleAlerts() {
  const userId = getRandomUser();
  const res = http.get(
    `${BASE_URL}${API_PREFIX}/alerts/whale?page=1&limit=20`,
    { headers: getHeaders(userId) }
  );

  totalRequests.add(1);
  alertRetrievalTime.add(res.timings.duration);

  const success = check(res, {
    'whale alerts retrieved': (r) => r.status === 200,
    'response has data': (r) => r.json('data') !== undefined,
  });

  errorRate.add(!success);
  sleep(0.5);
}

// Test scenario 3: Get Whale Alert by ID
export function getWhaleAlertById(alertId) {
  if (!alertId) return;

  const userId = getRandomUser();
  const res = http.get(
    `${BASE_URL}${API_PREFIX}/alerts/whale/${alertId}`,
    { headers: getHeaders(userId) }
  );

  totalRequests.add(1);
  alertRetrievalTime.add(res.timings.duration);

  const success = check(res, {
    'whale alert retrieved by id': (r) => r.status === 200,
    'response has data': (r) => r.json('data') !== undefined,
  });

  errorRate.add(!success);
  sleep(0.5);
}

// Test scenario 4: Create Price Alert
export function createPriceAlert() {
  const userId = getRandomUser();
  const payload = JSON.stringify({
    name: `k6 Price Alert ${Date.now()}`,
    type: 'price',
    conditions: {
      token: 'ETH',
      chain: 'ethereum',
      alert_type: 'above',
      threshold: 3000,
    },
    actions: {
      channels: ['telegram'],
    },
    enabled: true,
  });

  const res = http.post(
    `${BASE_URL}${API_PREFIX}/alerts/price`,
    payload,
    { headers: getHeaders(userId) }
  );

  totalRequests.add(1);
  alertCreationTime.add(res.timings.duration);

  const success = check(res, {
    'price alert created': (r) => r.status === 201,
    'response has data': (r) => r.json('data') !== undefined,
  });

  errorRate.add(!success);
  sleep(1);
}

// Test scenario 5: Get Price Alerts
export function getPriceAlerts() {
  const userId = getRandomUser();
  const res = http.get(
    `${BASE_URL}${API_PREFIX}/alerts/price?page=1&limit=20`,
    { headers: getHeaders(userId) }
  );

  totalRequests.add(1);
  alertRetrievalTime.add(res.timings.duration);

  const success = check(res, {
    'price alerts retrieved': (r) => r.status === 200,
    'response has data': (r) => r.json('data') !== undefined,
  });

  errorRate.add(!success);
  sleep(0.5);
}

// Test scenario 6: Create Gas Alert
export function createGasAlert() {
  const userId = getRandomUser();
  const payload = JSON.stringify({
    name: `k6 Gas Alert ${Date.now()}`,
    type: 'gas',
    conditions: {
      chain: 'ethereum',
      gas_type: 'standard',
      alert_type: 'below',
      threshold_gwei: 20,
    },
    actions: {
      channels: ['email'],
    },
    enabled: true,
  });

  const res = http.post(
    `${BASE_URL}${API_PREFIX}/alerts/gas`,
    payload,
    { headers: getHeaders(userId) }
  );

  totalRequests.add(1);
  alertCreationTime.add(res.timings.duration);

  const success = check(res, {
    'gas alert created': (r) => r.status === 201,
    'response has data': (r) => r.json('data') !== undefined,
  });

  errorRate.add(!success);
  sleep(1);
}

// Test scenario 7: Get Gas Predictions
export function getGasPredictions() {
  const userId = getRandomUser();
  const res = http.get(
    `${BASE_URL}${API_PREFIX}/gas/predictions?chain=ethereum`,
    { headers: getHeaders(userId) }
  );

  totalRequests.add(1);
  gasQueryTime.add(res.timings.duration);

  const success = check(res, {
    'gas predictions retrieved': (r) => r.status === 200,
    'response has data': (r) => r.json('data') !== undefined,
  });

  errorRate.add(!success);
  sleep(0.3);
}

// Test scenario 8: Get Current Gas Prices
export function getCurrentGasPrices() {
  const userId = getRandomUser();
  const res = http.get(
    `${BASE_URL}${API_PREFIX}/gas/current?chain=ethereum`,
    { headers: getHeaders(userId) }
  );

  totalRequests.add(1);
  gasQueryTime.add(res.timings.duration);

  const success = check(res, {
    'current gas prices retrieved': (r) => r.status === 200,
    'response has data': (r) => r.json('data') !== undefined,
  });

  errorRate.add(!success);
  sleep(0.2);
}

// Main test function
export default function () {
  const scenario = Math.random();

  if (scenario < 0.1) {
    // 10% - Create whale alert
    const alertId = createWhaleAlert();
    if (alertId) {
      getWhaleAlertById(alertId);
    }
  } else if (scenario < 0.3) {
    // 20% - Create price alert
    createPriceAlert();
  } else if (scenario < 0.4) {
    // 10% - Create gas alert
    createGasAlert();
  } else if (scenario < 0.6) {
    // 20% - Get whale alerts
    getWhaleAlerts();
  } else if (scenario < 0.8) {
    // 20% - Get price alerts
    getPriceAlerts();
  } else if (scenario < 0.9) {
    // 10% - Get gas predictions
    getGasPredictions();
  } else {
    // 10% - Get current gas prices
    getCurrentGasPrices();
  }
}

// Setup function (runs once at the start)
export function setup() {
  console.log('Starting k6 load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test users: ${TEST_USERS.length}`);
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Load test completed!');
}

