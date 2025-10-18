/**
 * Shared Test Utilities
 * Common test helpers and mocks
 * 
 * Optimization Phase 1: Code Consolidation
 * Reduces test setup duplication
 */

import { APIGatewayProxyEvent } from 'aws-lambda';

// ============================================================================
// Mock Event Helpers
// ============================================================================

/**
 * Create a mock API Gateway event
 * 
 * @param overrides - Partial event properties to override
 * @returns Mock API Gateway event
 * 
 * @example
 * const event = createMockEvent({
 *   httpMethod: 'POST',
 *   body: JSON.stringify({ name: 'Test' }),
 * });
 */
export function createMockEvent(
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: 'test-account',
      apiId: 'test-api',
      authorizer: {
        claims: {
          sub: 'test-user-123',
        },
      },
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-agent',
        userArn: null,
      },
      path: '/',
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: '/',
    },
    resource: '/',
    ...overrides,
  } as APIGatewayProxyEvent;
}

// ============================================================================
// Mock Alert Helpers
// ============================================================================

/**
 * Create a mock whale alert
 * 
 * @param overrides - Partial alert properties to override
 * @returns Mock whale alert
 * 
 * @example
 * const alert = createMockWhaleAlert({
 *   name: 'Custom Alert',
 *   enabled: false,
 * });
 */
export function createMockWhaleAlert(overrides: any = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: 'test-user-123',
    name: 'Test Whale Alert',
    description: 'Test description',
    type: 'whale' as const,
    conditions: {
      min_amount_usd: 1000000,
      tokens: ['ETH', 'WETH'],
      chains: ['ethereum', 'arbitrum'],
    },
    actions: {
      channels: ['email', 'push'] as const,
    },
    enabled: true,
    throttle_minutes: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock price alert
 * 
 * @param overrides - Partial alert properties to override
 * @returns Mock price alert
 * 
 * @example
 * const alert = createMockPriceAlert({
 *   conditions: { threshold: 3500 },
 * });
 */
export function createMockPriceAlert(overrides: any = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: 'test-user-123',
    name: 'Test Price Alert',
    description: 'Test description',
    type: 'price' as const,
    conditions: {
      token: 'ETH',
      chain: 'ethereum',
      alert_type: 'above' as const,
      threshold: 3000,
      auto_disable: true,
    },
    actions: {
      channels: ['email', 'push'] as const,
    },
    enabled: true,
    throttle_minutes: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Mock Pagination Helpers
// ============================================================================

/**
 * Create mock pagination result
 * 
 * @param data - Array of data items
 * @param page - Current page number
 * @param per_page - Items per page
 * @returns Mock pagination result
 * 
 * @example
 * const result = createMockPaginationResult([alert1, alert2], 1, 20);
 */
export function createMockPaginationResult<T>(
  data: T[],
  page: number = 1,
  per_page: number = 20
) {
  return {
    data,
    pagination: {
      total: data.length,
      page,
      per_page,
      total_pages: Math.ceil(data.length / per_page),
    },
  };
}

// ============================================================================
// Mock Database Helpers
// ============================================================================

/**
 * Create a mock SQL function for testing
 * 
 * @returns Mock SQL function
 * 
 * @example
 * const mockSql = createMockSql();
 * mockSql.mockResolvedValue([mockAlert]);
 */
export function createMockSql() {
  const mockSql = jest.fn() as any;
  mockSql.begin = jest.fn((callback: any) => callback(mockSql));
  return mockSql;
}

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate a random UUID
 * 
 * @returns Random UUID string
 */
export function generateUUID(): string {
  return '123e4567-e89b-12d3-a456-426614174000';
}

/**
 * Generate a random user ID
 * 
 * @returns Random user ID string
 */
export function generateUserId(): string {
  return `user_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate a random timestamp
 * 
 * @returns ISO timestamp string
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a response is successful
 * 
 * @param response - API Gateway response
 * @param expectedStatusCode - Expected status code (default: 200)
 * 
 * @example
 * assertSuccessResponse(response, 201);
 */
export function assertSuccessResponse(
  response: any,
  expectedStatusCode: number = 200
) {
  expect(response.statusCode).toBe(expectedStatusCode);
  const body = JSON.parse(response.body);
  expect(body.success).toBe(true);
  expect(body.data).toBeDefined();
}

/**
 * Assert that a response is an error
 * 
 * @param response - API Gateway response
 * @param expectedStatusCode - Expected status code
 * @param expectedError - Expected error message (optional)
 * 
 * @example
 * assertErrorResponse(response, 400, 'Validation failed');
 */
export function assertErrorResponse(
  response: any,
  expectedStatusCode: number,
  expectedError?: string
) {
  expect(response.statusCode).toBe(expectedStatusCode);
  const body = JSON.parse(response.body);
  expect(body.success).toBe(false);
  expect(body.error).toBeDefined();
  if (expectedError) {
    expect(body.error).toContain(expectedError);
  }
}

