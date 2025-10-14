/**
 * k6 Test Helpers
 * Shared utilities and helpers for k6 load tests
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// Custom Metrics
// ============================================================================

export const errorRate = new Rate('errors');
export const queryDuration = new Trend('query_duration');
export const cacheHitRate = new Rate('cache_hits');
export const requestCounter = new Counter('requests');

// ============================================================================
// Configuration
// ============================================================================

export const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
export const API_ENDPOINT = `${BASE_URL}/v1/query/advanced`;

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate simple query (no filters)
 */
export function generateSimpleQuery() {
  return {
    table: 'protocols',
    fields: ['id', 'name', 'category', 'chains'],
    pagination: {
      page: 1,
      limit: 50,
    },
  };
}

/**
 * Generate query with filters
 */
export function generateFilterQuery() {
  const categories = ['Dexes', 'Lending', 'Yield', 'Bridge', 'Derivatives'];
  const category = categories[Math.floor(Math.random() * categories.length)];

  return {
    table: 'protocols',
    fields: ['id', 'name', 'category', 'chains', 'tvl'],
    filters: {
      operator: 'AND',
      conditions: [
        {
          field: 'category',
          operator: 'eq',
          value: category,
        },
      ],
    },
    pagination: {
      page: 1,
      limit: 50,
    },
  };
}

/**
 * Generate query with aggregations
 */
export function generateAggregationQuery() {
  return {
    table: 'protocol_tvl',
    fields: ['chain'],
    aggregations: [
      {
        type: 'sum',
        field: 'tvl',
        alias: 'total_tvl',
      },
      {
        type: 'avg',
        field: 'tvl',
        alias: 'avg_tvl',
      },
      {
        type: 'count',
        field: '*',
        alias: 'count',
      },
    ],
    groupBy: ['chain'],
    pagination: {
      page: 1,
      limit: 50,
    },
  };
}

/**
 * Generate query with complex filters
 */
export function generateComplexFilterQuery() {
  const chains = ['Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Optimism'];
  const selectedChains = chains.slice(0, Math.floor(Math.random() * 3) + 2);

  return {
    table: 'protocols',
    fields: ['id', 'name', 'category', 'chains'],
    filters: {
      operator: 'AND',
      conditions: [
        {
          field: 'chains',
          operator: 'contains',
          value: selectedChains[0],
        },
        {
          operator: 'OR',
          conditions: [
            {
              field: 'category',
              operator: 'eq',
              value: 'Dexes',
            },
            {
              field: 'category',
              operator: 'eq',
              value: 'Lending',
            },
          ],
        },
      ],
    },
    pagination: {
      page: 1,
      limit: 50,
    },
  };
}

/**
 * Generate pagination query
 */
export function generatePaginationQuery(page = 1, limit = 50) {
  return {
    table: 'protocols',
    fields: ['id', 'name', 'category'],
    pagination: {
      page,
      limit,
    },
  };
}

/**
 * Generate TVL query
 */
export function generateTVLQuery() {
  const protocolIds = Array.from({ length: 100 }, (_, i) => i + 1);
  const randomProtocolId = protocolIds[Math.floor(Math.random() * protocolIds.length)];

  return {
    table: 'protocol_tvl',
    fields: ['protocol_id', 'chain', 'tvl', 'timestamp'],
    filters: {
      operator: 'AND',
      conditions: [
        {
          field: 'protocol_id',
          operator: 'eq',
          value: randomProtocolId,
        },
      ],
    },
    pagination: {
      page: 1,
      limit: 100,
    },
  };
}

/**
 * Generate token price query
 */
export function generateTokenPriceQuery() {
  return {
    table: 'token_prices',
    fields: ['token_symbol', 'token_name', 'price', 'volume_24h', 'market_cap'],
    pagination: {
      page: 1,
      limit: 100,
    },
  };
}

// ============================================================================
// HTTP Request Helpers
// ============================================================================

/**
 * Execute query and track metrics
 */
export function executeQuery(query, tags = {}) {
  const payload = JSON.stringify(query);
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: Object.assign({ name: 'query' }, tags),
  };

  const response = http.post(API_ENDPOINT, payload, params);

  // Track metrics
  requestCounter.add(1);
  queryDuration.add(response.timings.duration);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch (e) {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Track errors
  errorRate.add(!success);

  // Track cache hits
  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      cacheHitRate.add(body.cacheHit === true);
    } catch (e) {
      // Ignore parse errors
    }
  }

  return response;
}

/**
 * Execute query with authentication
 */
export function executeAuthenticatedQuery(query, token, tags = {}) {
  const payload = JSON.stringify(query);
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: Object.assign({ name: 'authenticated_query' }, tags),
  };

  const response = http.post(API_ENDPOINT, payload, params);

  // Track metrics
  requestCounter.add(1);
  queryDuration.add(response.timings.duration);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);

  return response;
}

// ============================================================================
// Test Scenarios
// ============================================================================

/**
 * Mixed workload scenario
 */
export function mixedWorkload() {
  const scenarios = [
    generateSimpleQuery,
    generateFilterQuery,
    generateAggregationQuery,
    generateComplexFilterQuery,
    generateTVLQuery,
    generateTokenPriceQuery,
  ];

  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  const query = randomScenario();

  executeQuery(query, { scenario: 'mixed' });

  sleep(1); // 1 second think time
}

/**
 * Cache test scenario
 */
export function cacheTestScenario() {
  // Execute same query twice to test cache
  const query = generateSimpleQuery();

  // First request (cache miss)
  executeQuery(query, { scenario: 'cache_miss' });

  sleep(0.1);

  // Second request (cache hit)
  executeQuery(query, { scenario: 'cache_hit' });

  sleep(1);
}

/**
 * Pagination scenario
 */
export function paginationScenario() {
  const pages = [1, 2, 3, 5, 10];
  const randomPage = pages[Math.floor(Math.random() * pages.length)];

  const query = generatePaginationQuery(randomPage, 50);
  executeQuery(query, { scenario: 'pagination' });

  sleep(1);
}

