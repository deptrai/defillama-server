/**
 * E2E Test Helpers
 * Shared utilities for end-to-end testing
 */

import { QueryRequest, QueryResponse } from '../../types';
import { handler } from '../../handlers/advanced-query';
import { APIGatewayProxyEvent } from 'aws-lambda';
import getDBConnection, { closeDBConnection } from '../../db/connection';
import { getRedisClient } from '../../../utils/shared/redis';

// ============================================================================
// Test Environment Setup
// ============================================================================

export async function setupTestEnvironment(): Promise<void> {
  // Database connection is already established via getDBConnection()
  // Redis connection is already established via getRedisClient()
  console.log('✓ Test environment ready');
}

export async function teardownTestEnvironment(): Promise<void> {
  await closeDBConnection();
  console.log('✓ Test environment cleaned up');
}

// ============================================================================
// Mock API Gateway Event
// ============================================================================

export function createMockEvent(body: any, headers: Record<string, string> = {}): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/v1/query/advanced',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: 'test-account',
      apiId: 'test-api',
      protocol: 'HTTP/1.1',
      httpMethod: 'POST',
      path: '/v1/query/advanced',
      stage: 'test',
      requestId: `test-${Date.now()}`,
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
      identity: {
        cognitoIdentityPoolId: null,
        accountId: null,
        cognitoIdentityId: null,
        caller: null,
        sourceIp: '127.0.0.1',
        principalOrgId: null,
        accessKey: null,
        cognitoAuthenticationType: null,
        cognitoAuthenticationProvider: null,
        userArn: null,
        userAgent: 'jest-test',
        user: null,
        apiKey: null,
        apiKeyId: null,
        clientCert: null,
      },
      authorizer: null,
      resourceId: 'test-resource',
      resourcePath: '/v1/query/advanced',
    },
    resource: '/v1/query/advanced',
  };
}

// ============================================================================
// Execute Query Helper
// ============================================================================

export async function executeQuery(query: QueryRequest, headers: Record<string, string> = {}): Promise<QueryResponse> {
  const event = createMockEvent(query, headers);
  const response = await handler(event);

  if (response.statusCode !== 200) {
    throw new Error(`Query failed: ${response.body}`);
  }

  return JSON.parse(response.body);
}

// ============================================================================
// Test Data Generators
// ============================================================================

export function generateSimpleQuery(): QueryRequest {
  return {
    table: 'protocols',
    fields: ['id', 'name', 'category', 'chains'],
    pagination: {
      page: 1,
      limit: 10,
    },
  };
}

export function generateFilterQuery(category: string = 'Dexes'): QueryRequest {
  return {
    table: 'protocols',
    fields: ['id', 'name', 'category', 'chains'],
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
      limit: 10,
    },
  };
}

export function generateComplexFilterQuery(): QueryRequest {
  return {
    table: 'protocols',
    fields: ['id', 'name', 'category', 'chains'],
    filters: {
      operator: 'AND',
      conditions: [
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
        {
          field: 'chains',
          operator: 'contains',
          value: 'Ethereum',
        },
      ],
    },
    pagination: {
      page: 1,
      limit: 10,
    },
  };
}

export function generateAggregationQuery(): QueryRequest {
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
      limit: 10,
    },
  };
}

export function generatePaginationQuery(page: number, limit: number): QueryRequest {
  return {
    table: 'protocols',
    fields: ['id', 'name', 'category'],
    pagination: {
      page,
      limit,
    },
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateResponseStructure(response: QueryResponse): void {
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('count');
  expect(response).toHaveProperty('executionTime');
  expect(response).toHaveProperty('cacheHit');
  expect(Array.isArray(response.data)).toBe(true);
  expect(typeof response.count).toBe('number');
  expect(typeof response.executionTime).toBe('number');
  expect(typeof response.cacheHit).toBe('boolean');
}

export function validatePaginationResponse(response: QueryResponse): void {
  validateResponseStructure(response);
  expect(response).toHaveProperty('page');
  expect(response).toHaveProperty('limit');
  expect(response).toHaveProperty('totalPages');
  expect(typeof response.page).toBe('number');
  expect(typeof response.limit).toBe('number');
}

export function validateAggregationResponse(response: QueryResponse): void {
  validateResponseStructure(response);
  expect(response.data.length).toBeGreaterThan(0);

  // Check that aggregation fields exist
  const firstRow = response.data[0];
  expect(firstRow).toHaveProperty('total_tvl');
  expect(firstRow).toHaveProperty('avg_tvl');
  expect(firstRow).toHaveProperty('count');
}

// ============================================================================
// Database Helpers
// ============================================================================

export async function getProtocolCount(): Promise<number> {
  const db = await getDBConnection();
  const result = await db.unsafe('SELECT COUNT(*) as count FROM protocols');
  return parseInt(result[0].count, 10);
}

export async function getProtocolsByCategory(category: string): Promise<any[]> {
  const db = await getDBConnection();
  return await db.unsafe('SELECT * FROM protocols WHERE category = $1', [category]);
}

export async function getTVLByChain(chain: string): Promise<any[]> {
  const db = await getDBConnection();
  return await db.unsafe('SELECT * FROM protocol_tvl WHERE chain = $1 LIMIT 10', [chain]);
}

// ============================================================================
// Cache Helpers
// ============================================================================

export async function clearCache(): Promise<void> {
  const redis = await getRedisClient();
  const keys = await redis.keys('query:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export async function getCacheKeys(): Promise<string[]> {
  const redis = await getRedisClient();
  return await redis.keys('query:*');
}

// ============================================================================
// Wait Helper
// ============================================================================

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

