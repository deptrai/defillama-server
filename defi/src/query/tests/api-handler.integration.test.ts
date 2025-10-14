/**
 * Integration Tests for API Handler
 * Tests full request flow with authentication, rate limiting, caching
 */

import { handler } from '../handlers/advanced-query';
import { APIGatewayProxyEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { getRedisClient } from '../../utils/shared/redis';

describe('API Handler Integration Tests', () => {
  let redis: any;
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  beforeAll(async () => {
    redis = await getRedisClient();
  });

  beforeEach(async () => {
    // Clear rate limit keys
    const keys = await redis.keys('rate_limit:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    // Clear cache keys
    const cacheKeys = await redis.keys('query:*');
    if (cacheKeys.length > 0) {
      await redis.del(...cacheKeys);
    }
  });

  afterAll(async () => {
    if (redis) {
      await redis.quit();
    }
  });

  /**
   * Helper function to create mock API Gateway event
   */
  function createMockEvent(body: any, headers: any = {}): APIGatewayProxyEvent {
    return {
      body: JSON.stringify(body),
      headers,
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/v1/query/advanced',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api',
        authorizer: null,
        protocol: 'HTTP/1.1',
        httpMethod: 'POST',
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
        path: '/v1/query/advanced',
        stage: 'test',
        requestId: `test-request-${Date.now()}`,
        requestTime: new Date().toISOString(),
        requestTimeEpoch: Date.now(),
        resourceId: 'test-resource',
        resourcePath: '/v1/query/advanced',
      },
      resource: '/v1/query/advanced',
      multiValueHeaders: {},
    } as any;
  }

  /**
   * Helper function to generate JWT token
   */
  function generateToken(userId: string, tier: string = 'free'): string {
    return jwt.sign({ userId, tier }, JWT_SECRET, { expiresIn: '1h' });
  }

  describe('Request Validation', () => {
    it('should reject request without table', async () => {
      const event = createMockEvent({});
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('Table name is required');
    });

    it('should reject request with invalid table', async () => {
      const event = createMockEvent({ table: 'invalid_table' });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('Invalid table');
    });

    it('should accept valid request', async () => {
      const event = createMockEvent({
        table: 'protocols',
        pagination: { page: 1, limit: 10 },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should allow anonymous requests', async () => {
      const event = createMockEvent({
        table: 'protocols',
        pagination: { page: 1, limit: 10 },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
    });

    it('should accept valid JWT token', async () => {
      const token = generateToken('user-123', 'pro');
      const event = createMockEvent(
        {
          table: 'protocols',
          pagination: { page: 1, limit: 10 },
        },
        { Authorization: `Bearer ${token}` }
      );
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
    });

    it('should reject invalid JWT token', async () => {
      const event = createMockEvent(
        {
          table: 'protocols',
          pagination: { page: 1, limit: 10 },
        },
        { Authorization: 'Bearer invalid-token' }
      );
      const response = await handler(event);

      // Should still work as anonymous (authentication is optional)
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it.skip('should enforce rate limit for anonymous users', async () => {
      const event = createMockEvent({
        table: 'protocols',
        pagination: { page: 1, limit: 10 },
      });

      // Make 11 requests (limit is 10 for anonymous)
      const responses = [];
      for (let i = 0; i < 11; i++) {
        const response = await handler(event);
        responses.push(response);
      }

      // First 10 should succeed
      for (let i = 0; i < 10; i++) {
        expect(responses[i].statusCode).toBe(200);
      }

      // 11th should be rate limited
      expect(responses[10].statusCode).toBe(429);
      const body = JSON.parse(responses[10].body);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    }, 10000);

    it.skip('should have higher rate limit for authenticated users', async () => {
      const token = generateToken('user-123', 'free');
      const event = createMockEvent(
        {
          table: 'protocols',
          pagination: { page: 1, limit: 10 },
        },
        { Authorization: `Bearer ${token}` }
      );

      // Make 15 requests (limit is 100 for free tier)
      const responses = [];
      for (let i = 0; i < 15; i++) {
        const response = await handler(event);
        responses.push(response);
      }

      // All should succeed
      for (let i = 0; i < 15; i++) {
        expect(responses[i].statusCode).toBe(200);
      }
    }, 10000);
  });

  describe('Caching', () => {
    it('should cache query results', async () => {
      const event = createMockEvent({
        table: 'protocols',
        filters: {
          and: [
            { field: 'category', operator: 'eq', value: 'DEX' },
          ],
        },
        pagination: { page: 1, limit: 10 },
      });

      // First request (cache miss)
      const response1 = await handler(event);
      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);
      expect(body1.metadata.cacheHit).toBe(false);

      // Second request (cache hit)
      const response2 = await handler(event);
      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body2.metadata.cacheHit).toBe(true);

      // Results should be identical
      expect(body2.data).toEqual(body1.data);
    });

    it('should return different results for different queries', async () => {
      const event1 = createMockEvent({
        table: 'protocols',
        filters: {
          and: [
            { field: 'category', operator: 'eq', value: 'DEX' },
          ],
        },
        pagination: { page: 1, limit: 10 },
      });

      const event2 = createMockEvent({
        table: 'protocols',
        filters: {
          and: [
            { field: 'category', operator: 'eq', value: 'Lending' },
          ],
        },
        pagination: { page: 1, limit: 10 },
      });

      const response1 = await handler(event1);
      const response2 = await handler(event2);

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      const body1 = JSON.parse(response1.body);
      const body2 = JSON.parse(response2.body);

      // Results should be different
      expect(body1.data).not.toEqual(body2.data);
    });
  });

  describe('Query Execution', () => {
    it('should execute simple query', async () => {
      const event = createMockEvent({
        table: 'protocols',
        pagination: { page: 1, limit: 10 },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.metadata.count).toBeGreaterThan(0);
      expect(body.metadata.executionTime).toBeGreaterThan(0);
    });

    it('should execute query with filters', async () => {
      const event = createMockEvent({
        table: 'protocol_tvl',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
            { field: 'tvl', operator: 'gt', value: 1000000 },
          ],
        },
        pagination: { page: 1, limit: 10 },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.every((row: any) => 
        row.chain === 'ethereum' && Number(row.tvl) > 1000000
      )).toBe(true);
    });

    it('should execute query with aggregations', async () => {
      const event = createMockEvent({
        table: 'protocol_tvl',
        aggregations: [
          { type: 'sum', field: 'tvl', alias: 'total_tvl' },
          { type: 'count', field: '*', alias: 'row_count' },
        ],
        groupBy: ['chain'],
        orderBy: [{ field: 'chain', direction: 'asc' }],
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].chain).toBeDefined();
      expect(body.data[0].total_tvl).toBeDefined();
      expect(body.data[0].row_count).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON body', async () => {
      const event = createMockEvent({}, {});
      event.body = 'invalid json';

      const response = await handler(event);
      expect(response.statusCode).toBe(500);
    });

    it('should handle query validation errors', async () => {
      const event = createMockEvent({
        table: 'protocols',
        filters: {
          and: [
            { field: 'invalid_field', operator: 'eq', value: 'test' },
          ],
        },
      });

      const response = await handler(event);
      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

