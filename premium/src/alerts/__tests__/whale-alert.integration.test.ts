/**
 * Whale Alert Integration Tests
 * Story 1.1.1: Configure Whale Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 *
 * Integration tests for whale alert flow (Controller + Service)
 */

// Set env variable BEFORE importing service
process.env.PREMIUM_DB = 'postgresql://test:test@localhost:5432/test';

// Mock postgres at module level
var mockSql: any = jest.fn().mockResolvedValue([]);
mockSql.unsafe = jest.fn().mockResolvedValue([]);

jest.mock('postgres', () => {
  return jest.fn(() => mockSql);
});

import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  createWhaleAlert,
  getWhaleAlerts,
  getWhaleAlertById,
  updateWhaleAlert,
  deleteWhaleAlert,
  toggleWhaleAlert,
} from '../controllers/whale-alert.controller';
import { whaleAlertService } from '../services/whale-alert.service';

describe('Whale Alert Integration Tests', () => {
  const mockUserId = 'user-integration-123';
  const mockAlertId = 'alert-integration-456';

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Reset mockSql but keep it as a function
    mockSql.mockReset();
    mockSql.mockResolvedValue([]);

    if (mockSql.unsafe) {
      mockSql.unsafe.mockReset();
      mockSql.unsafe.mockResolvedValue([]);
    }
  });
  
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
      apiId: 'api-id',
      authorizer: {
        claims: {
          sub: mockUserId,
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
      resourceId: 'resource-id',
      resourcePath: '/v2/premium/alerts/whale',
    },
    resource: '/v2/premium/alerts/whale',
    ...overrides,
  });

  const mockWhaleAlert = {
    id: mockAlertId,
    user_id: mockUserId,
    name: 'ETH Whale Alert',
    description: 'Alert for large ETH transfers',
    type: 'whale' as const,
    conditions: {
      min_amount_usd: 1000000,
      tokens: ['ETH', 'WETH'],
      chains: ['ethereum', 'arbitrum'],
    },
    actions: {
      channels: ['email', 'push'],
    },
    enabled: true,
    throttle_minutes: 5,
    created_at: '2025-10-18T00:00:00Z',
    updated_at: '2025-10-18T00:00:00Z',
  };

  describe('Complete Whale Alert Flow', () => {
    it('should handle complete whale alert lifecycle', async () => {
      const requestBody = {
        name: 'ETH Whale Alert',
        description: 'Alert for large ETH transfers',
        type: 'whale',
        conditions: {
          min_amount_usd: 1000000,
          tokens: ['ETH', 'WETH'],
          chains: ['ethereum', 'arbitrum'],
        },
        actions: {
          channels: ['email', 'push'],
        },
        enabled: true,
        throttle_minutes: 5,
      };

      // Mock create
      mockSql.mockResolvedValueOnce([mockWhaleAlert]);

      // 1. Create whale alert
      const createEvent = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify(requestBody),
      });

      const createResponse = await createWhaleAlert(createEvent);
      expect(createResponse.statusCode).toBe(201);
      const createBody = JSON.parse(createResponse.body);
      expect(createBody.success).toBe(true);
      expect(createBody.data).toEqual(mockWhaleAlert);

      // Mock get list
      mockSql.mockResolvedValueOnce([{ count: '1' }]);
      mockSql.mockResolvedValueOnce([mockWhaleAlert]);

      // 2. Get whale alerts
      const getEvent = mockEvent({
        queryStringParameters: { page: '1', per_page: '20' },
      });

      const getResponse = await getWhaleAlerts(getEvent);
      expect(getResponse.statusCode).toBe(200);
      const getBody = JSON.parse(getResponse.body);
      expect(getBody.success).toBe(true);
      expect(getBody.data.data).toEqual([mockWhaleAlert]);

      // Mock get by ID
      mockSql.mockResolvedValueOnce([mockWhaleAlert]);

      // 3. Get whale alert by ID
      const getByIdEvent = mockEvent({
        pathParameters: { id: mockAlertId },
      });

      const getByIdResponse = await getWhaleAlertById(getByIdEvent);
      expect(getByIdResponse.statusCode).toBe(200);
      const getByIdBody = JSON.parse(getByIdResponse.body);
      expect(getByIdBody.success).toBe(true);
      expect(getByIdBody.data).toEqual(mockWhaleAlert);

      // Mock update (postgres helper call + main query)
      const updatedAlert = { ...mockWhaleAlert, name: 'Updated Alert' };
      mockSql.mockResolvedValue([updatedAlert]); // Set default for all calls

      // 4. Update whale alert
      const updateEvent = mockEvent({
        httpMethod: 'PUT',
        pathParameters: { id: mockAlertId },
        body: JSON.stringify({ name: 'Updated Alert' }),
      });

      const updateResponse = await updateWhaleAlert(updateEvent);
      expect(updateResponse.statusCode).toBe(200);
      const updateBody = JSON.parse(updateResponse.body);
      expect(updateBody.success).toBe(true);
      expect(updateBody.data.name).toBe('Updated Alert');

      // Mock toggle
      const toggledAlert = { ...mockWhaleAlert, enabled: false };
      mockSql.mockResolvedValueOnce([toggledAlert]);

      // 5. Toggle whale alert
      const toggleEvent = mockEvent({
        httpMethod: 'PATCH',
        pathParameters: { id: mockAlertId },
        body: JSON.stringify({ enabled: false }),
      });

      const toggleResponse = await toggleWhaleAlert(toggleEvent);
      expect(toggleResponse.statusCode).toBe(200);
      const toggleBody = JSON.parse(toggleResponse.body);
      expect(toggleBody.success).toBe(true);
      expect(toggleBody.data.enabled).toBe(false);

      // Mock delete
      mockSql.mockResolvedValueOnce([mockWhaleAlert]);

      // 6. Delete whale alert
      const deleteEvent = mockEvent({
        httpMethod: 'DELETE',
        pathParameters: { id: mockAlertId },
      });

      const deleteResponse = await deleteWhaleAlert(deleteEvent);
      expect(deleteResponse.statusCode).toBe(200);
      const deleteBody = JSON.parse(deleteResponse.body);
      expect(deleteBody.success).toBe(true);
      expect(deleteBody.data.message).toBe('Alert rule deleted successfully');
    });
  });

  describe('Validation', () => {
    it('should reject invalid whale alert data', async () => {
      const invalidBody = {
        name: '', // Invalid: empty name
        type: 'whale',
        conditions: {
          min_amount_usd: -1000, // Invalid: negative amount
        },
        actions: {
          channels: [],
        },
      };

      const event = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify(invalidBody),
      });

      const response = await createWhaleAlert(event);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSql.mockRejectedValueOnce(new Error('Database connection failed'));

      const event = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({
          name: 'Test Alert',
          type: 'whale',
          conditions: {
            min_amount_usd: 1000000,
            tokens: ['ETH'],
            chains: ['ethereum'],
          },
          actions: {
            channels: ['email'],
          },
        }),
      });

      const response = await createWhaleAlert(event);
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Internal server error');
    });
  });
});
