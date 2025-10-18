/**
 * Whale Alert E2E Tests
 * Story 1.1.1: Configure Whale Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 * 
 * E2E tests with REAL database connection
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  createWhaleAlert,
  getWhaleAlerts,
  getWhaleAlertById,
  updateWhaleAlert,
  deleteWhaleAlert,
  toggleWhaleAlert,
} from '../../controllers/whale-alert.controller';
import { getTestDb, cleanupTestData } from './setup';

describe('Whale Alert E2E Tests', () => {
  const testUserId = 'test-user-premium';
  let createdAlertId: string;

  // Clean up before and after all tests
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    const db = getTestDb();
    await db.end();
  });

  // Helper function to create mock API Gateway event
  const mockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v2/premium/alerts/whale',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      authorizer: {
        claims: {
          sub: testUserId,
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
      path: '/v2/premium/alerts/whale',
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: '/v2/premium/alerts/whale',
    },
    resource: '/v2/premium/alerts/whale',
    ...overrides,
  });

  describe('Complete Whale Alert E2E Flow', () => {
    it('should create, get, update, toggle, and delete a whale alert', async () => {
      // 1. CREATE whale alert
      const createData = {
        name: 'E2E Test Whale Alert',
        description: 'E2E test for whale movements',
        type: 'whale',
        conditions: {
          min_amount_usd: 1000000,
          tokens: ['USDT', 'USDC'],
          chains: ['ethereum', 'arbitrum'],
        },
        actions: {
          channels: ['email', 'telegram'],
        },
        enabled: true,
        throttle_minutes: 10,
      };

      const createEvent = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify(createData),
      });

      const createResponse = await createWhaleAlert(createEvent);
      if (createResponse.statusCode !== 201) {
        console.log('❌ Create whale alert failed:', createResponse.statusCode, JSON.parse(createResponse.body));
      }
      expect(createResponse.statusCode).toBe(201);
      
      const createBody = JSON.parse(createResponse.body);
      expect(createBody.success).toBe(true);
      expect(createBody.data).toHaveProperty('id');
      expect(createBody.data.name).toBe(createData.name);
      expect(createBody.data.user_id).toBe(testUserId);
      
      createdAlertId = createBody.data.id;

      // 2. GET all whale alerts
      const getEvent = mockEvent({
        httpMethod: 'GET',
      });

      const getResponse = await getWhaleAlerts(getEvent);
      expect(getResponse.statusCode).toBe(200);

      const getBody = JSON.parse(getResponse.body);
      expect(getBody.success).toBe(true);
      expect(getBody.data.data).toBeInstanceOf(Array);
      expect(getBody.data.data.length).toBeGreaterThan(0);
      expect(getBody.data.data[0].id).toBe(createdAlertId);

      // 3. GET whale alert by ID
      const getByIdEvent = mockEvent({
        httpMethod: 'GET',
        pathParameters: { id: createdAlertId },
      });

      const getByIdResponse = await getWhaleAlertById(getByIdEvent);
      expect(getByIdResponse.statusCode).toBe(200);
      
      const getByIdBody = JSON.parse(getByIdResponse.body);
      expect(getByIdBody.success).toBe(true);
      expect(getByIdBody.data.id).toBe(createdAlertId);
      expect(getByIdBody.data.name).toBe(createData.name);

      // 4. UPDATE whale alert
      const updateData = {
        name: 'Updated E2E Whale Alert',
        conditions: {
          chain: 'ethereum',
          token: 'USDT',
          threshold_usd: 2000000, // Updated threshold
          auto_disable: false,
        },
      };

      const updateEvent = mockEvent({
        httpMethod: 'PUT',
        pathParameters: { id: createdAlertId },
        body: JSON.stringify(updateData),
      });

      const updateResponse = await updateWhaleAlert(updateEvent);
      expect(updateResponse.statusCode).toBe(200);
      
      const updateBody = JSON.parse(updateResponse.body);
      expect(updateBody.success).toBe(true);
      expect(updateBody.data.name).toBe(updateData.name);
      expect(updateBody.data.conditions.threshold_usd).toBe(2000000);

      // 5. TOGGLE whale alert (disable)
      const toggleEvent = mockEvent({
        httpMethod: 'PATCH',
        pathParameters: { id: createdAlertId },
        body: JSON.stringify({ enabled: false }),
      });

      const toggleResponse = await toggleWhaleAlert(toggleEvent);
      expect(toggleResponse.statusCode).toBe(200);
      
      const toggleBody = JSON.parse(toggleResponse.body);
      expect(toggleBody.success).toBe(true);
      expect(toggleBody.data.enabled).toBe(false);

      // 6. DELETE whale alert
      const deleteEvent = mockEvent({
        httpMethod: 'DELETE',
        pathParameters: { id: createdAlertId },
      });

      const deleteResponse = await deleteWhaleAlert(deleteEvent);
      expect(deleteResponse.statusCode).toBe(200);
      
      const deleteBody = JSON.parse(deleteResponse.body);
      expect(deleteBody.success).toBe(true);

      // 7. Verify deletion - GET by ID should return 404
      const verifyDeleteResponse = await getWhaleAlertById(getByIdEvent);
      expect(verifyDeleteResponse.statusCode).toBe(404);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should reject invalid whale alert data', async () => {
      const invalidData = {
        name: 'Invalid Alert',
        type: 'whale',
        conditions: {
          chain: 'ethereum',
          // Missing required fields: token, threshold_usd
        },
        actions: {
          channels: ['email'],
        },
      };

      const event = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await createWhaleAlert(event);
      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Validation failed');
    });

    it('should return 404 for non-existent alert', async () => {
      const event = mockEvent({
        httpMethod: 'GET',
        pathParameters: { id: '00000000-0000-0000-0000-000000000000' },
      });

      const response = await getWhaleAlertById(event);
      expect(response.statusCode).toBe(404);
    });
  });

  describe('Pagination and Filtering', () => {
    beforeAll(async () => {
      // Create multiple alerts for pagination testing
      for (let i = 1; i <= 5; i++) {
        const createData = {
          name: `Pagination Test Alert ${i}`,
          type: 'whale',
          conditions: {
            chain: 'ethereum',
            token: 'USDT',
            threshold_usd: 1000000 * i,
            auto_disable: false,
          },
          actions: {
            channels: ['email'],
          },
          enabled: i % 2 === 0, // Alternate enabled/disabled
        };

        const event = mockEvent({
          httpMethod: 'POST',
          body: JSON.stringify(createData),
        });

        await createWhaleAlert(event);
      }
    });

    it('should support pagination', async () => {
      const event = mockEvent({
        httpMethod: 'GET',
        queryStringParameters: {
          page: '1',
          limit: '3',
        },
      });

      const response = await getWhaleAlerts(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.data.length).toBeLessThanOrEqual(3);
      expect(body.data.pagination).toHaveProperty('total');
      expect(body.data.pagination).toHaveProperty('page');
      expect(body.data.pagination).toHaveProperty('per_page');
    });

    it('should support filtering by status', async () => {
      const event = mockEvent({
        httpMethod: 'GET',
        queryStringParameters: {
          status: 'active',
        },
      });

      const response = await getWhaleAlerts(event);
      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.data.every((alert: any) => alert.enabled === true)).toBe(true);
    });
  });
});

