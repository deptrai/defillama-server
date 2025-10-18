/**
 * Price Alert Integration Tests
 * Story 1.1.2: Configure Price Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 *
 * Integration tests for price alert flow (Controller + Service)
 */

// Set env variable BEFORE importing service
process.env.PREMIUM_DB = 'postgresql://test:test@localhost:5432/test';

// Mock postgres at module level
// Use var instead of const to allow hoisting
// mockSql needs to be a function that can be called as a template literal
var mockSql: any = jest.fn().mockResolvedValue([]);
mockSql.unsafe = jest.fn().mockResolvedValue([]);

jest.mock('postgres', () => {
  return jest.fn(() => mockSql);
});

import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  createPriceAlert,
  getPriceAlerts,
  getPriceAlertById,
  updatePriceAlert,
  deletePriceAlert,
  togglePriceAlert,
} from '../controllers/price-alert.controller';
import { priceAlertService } from '../services/price-alert.service';

describe('Price Alert Integration Tests', () => {
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
    path: '/v2/premium/alerts/price',
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
      path: '/v2/premium/alerts/price',
      stage: 'dev',
      requestId: 'request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource-id',
      resourcePath: '/v2/premium/alerts/price',
    },
    resource: '/v2/premium/alerts/price',
    ...overrides,
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Complete Price Alert Flow', () => {
    it('should create, get, update, toggle, and delete a price alert', async () => {
      // Step 1: Create price alert
      const createData = {
        name: 'ETH Price Alert',
        description: 'Alert when ETH crosses $3000',
        type: 'price',
        conditions: {
          token: 'ETH',
          chain: 'ethereum',
          alert_type: 'above',
          threshold: 3000,
          auto_disable: true,
        },
        actions: {
          channels: ['email', 'push'],
        },
        enabled: true,
        throttle_minutes: 5,
      };
      
      // Mock getUserTier() - subscription query
      mockSql.mockResolvedValueOnce([{ tier: 'premium', status: 'active' }]);

      // Mock count (for limit check)
      mockSql.mockResolvedValueOnce([{ count: '50' }]);

      // Mock insert
      const createdAlert = {
        id: mockAlertId,
        user_id: mockUserId,
        ...createData,
        conditions: createData.conditions,
        actions: createData.actions,
        last_triggered_at: null,
        created_at: '2025-10-18T00:00:00Z',
        updated_at: '2025-10-18T00:00:00Z',
      };
      mockSql.mockResolvedValueOnce([createdAlert]);
      
      const createEvent = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify(createData),
      });
      
      const createResponse = await createPriceAlert(createEvent);
      expect(createResponse.statusCode).toBe(201);
      
      const createdData = JSON.parse(createResponse.body).data;
      expect(createdData.id).toBe(mockAlertId);
      expect(createdData.conditions.threshold).toBe(3000);
      
      // Step 2: Get all price alerts
      mockSql.unsafe.mockResolvedValueOnce([{ count: '1' }]);
      mockSql.unsafe.mockResolvedValueOnce([createdAlert]);
      
      const getEvent = mockEvent({
        httpMethod: 'GET',
      });
      
      const getResponse = await getPriceAlerts(getEvent);
      expect(getResponse.statusCode).toBe(200);
      
      const getData = JSON.parse(getResponse.body).data;
      expect(getData.data).toHaveLength(1);
      expect(getData.data[0].id).toBe(mockAlertId);
      
      // Step 3: Get price alert by ID
      mockSql.mockResolvedValueOnce([createdAlert]);
      
      const getByIdEvent = mockEvent({
        httpMethod: 'GET',
        pathParameters: { id: mockAlertId },
      });
      
      const getByIdResponse = await getPriceAlertById(getByIdEvent);
      expect(getByIdResponse.statusCode).toBe(200);
      
      const getByIdData = JSON.parse(getByIdResponse.body).data;
      expect(getByIdData.id).toBe(mockAlertId);
      
      // Step 4: Update price alert
      const updateData = {
        conditions: {
          threshold: 3500,
        },
      };
      
      const updatedAlert = {
        ...createdAlert,
        conditions: {
          ...createdAlert.conditions,
          threshold: 3500,
        },
      };
      
      // Mock getById for update
      mockSql.mockResolvedValueOnce([createdAlert]);
      
      // Mock update
      mockSql.mockResolvedValueOnce([updatedAlert]);
      
      const updateEvent = mockEvent({
        httpMethod: 'PUT',
        pathParameters: { id: mockAlertId },
        body: JSON.stringify(updateData),
      });
      
      const updateResponse = await updatePriceAlert(updateEvent);
      expect(updateResponse.statusCode).toBe(200);
      
      const updatedData = JSON.parse(updateResponse.body).data;
      expect(updatedData.conditions.threshold).toBe(3500);
      
      // Step 5: Toggle price alert (disable)
      const toggledAlert = {
        ...updatedAlert,
        enabled: false,
      };
      
      mockSql.mockResolvedValueOnce([toggledAlert]);
      
      const toggleEvent = mockEvent({
        httpMethod: 'PATCH',
        pathParameters: { id: mockAlertId },
        body: JSON.stringify({ enabled: false }),
      });
      
      const toggleResponse = await togglePriceAlert(toggleEvent);
      expect(toggleResponse.statusCode).toBe(200);
      
      const toggledData = JSON.parse(toggleResponse.body).data;
      expect(toggledData.enabled).toBe(false);
      
      // Step 6: Delete price alert
      mockSql.mockResolvedValueOnce({ count: 1 });
      
      const deleteEvent = mockEvent({
        httpMethod: 'DELETE',
        pathParameters: { id: mockAlertId },
      });
      
      const deleteResponse = await deletePriceAlert(deleteEvent);
      expect(deleteResponse.statusCode).toBe(200);
      
      const deleteData = JSON.parse(deleteResponse.body).data;
      expect(deleteData.message).toBe('Price alert deleted successfully');
    });
  });
  
  describe('Error Handling Flow', () => {
    it('should handle validation errors correctly', async () => {
      const invalidData = {
        type: 'price',
        // Missing required fields
      };
      
      const event = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify(invalidData),
      });
      
      const response = await createPriceAlert(event);
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
      expect(JSON.parse(response.body).error).toContain('Validation failed');
    });
    
    it('should handle alert limit exceeded correctly', async () => {
      // Mock count (200 alerts - limit reached) - FIRST call
      mockSql.mockResolvedValueOnce([{ count: '200' }]);

      // Mock getUserTier() - subscription query (pro tier) - SECOND call
      mockSql.mockResolvedValueOnce([{ tier: 'pro', status: 'active' }]);
      
      const createData = {
        name: 'Test Alert',
        type: 'price',
        conditions: {
          token: 'ETH',
          chain: 'ethereum',
          alert_type: 'above',
          threshold: 3000,
          auto_disable: false,
        },
        actions: {
          channels: ['email'],
        },
        enabled: true,
        throttle_minutes: 5,
      };
      
      const event = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify(createData),
      });
      
      const response = await createPriceAlert(event);
      
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).success).toBe(false);
      expect(JSON.parse(response.body).error).toContain('Alert limit exceeded');
    });
    
    it('should handle not found errors correctly', async () => {
      // Mock getById returning null
      mockSql.mockResolvedValueOnce([]);
      
      const event = mockEvent({
        httpMethod: 'GET',
        pathParameters: { id: 'non-existent-id' },
      });
      
      const response = await getPriceAlertById(event);
      
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).success).toBe(false);
      expect(JSON.parse(response.body).error).toContain('not found');
    });
  });
  
  describe('Pagination and Filtering Flow', () => {
    it('should handle pagination correctly', async () => {
      // Mock count (100 alerts)
      mockSql.unsafe.mockResolvedValueOnce([{ count: '100' }]);
      
      // Mock select (page 2, 10 per page)
      const mockAlerts = Array.from({ length: 10 }, (_, i) => ({
        id: `alert-${i + 10}`,
        user_id: mockUserId,
        name: `Alert ${i + 10}`,
        type: 'price',
        conditions: {},
        actions: {},
        enabled: true,
        throttle_minutes: 5,
        last_triggered_at: null,
        created_at: '2025-10-18T00:00:00Z',
        updated_at: '2025-10-18T00:00:00Z',
      }));
      mockSql.unsafe.mockResolvedValueOnce(mockAlerts);
      
      const event = mockEvent({
        httpMethod: 'GET',
        queryStringParameters: {
          page: '2',
          per_page: '10',
        },
      });
      
      const response = await getPriceAlerts(event);
      
      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body).data;
      expect(data.data).toHaveLength(10);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.per_page).toBe(10);
      expect(data.pagination.total).toBe(100);
      expect(data.pagination.total_pages).toBe(10);
    });
    
    it('should handle filtering correctly', async () => {
      // Mock count (filtered)
      mockSql.unsafe.mockResolvedValueOnce([{ count: '5' }]);
      
      // Mock select (filtered)
      const mockAlerts = Array.from({ length: 5 }, (_, i) => ({
        id: `alert-${i}`,
        user_id: mockUserId,
        name: `ETH Alert ${i}`,
        type: 'price',
        conditions: {
          token: 'ETH',
          chain: 'ethereum',
          alert_type: 'above',
          threshold: 3000,
        },
        actions: {},
        enabled: true,
        throttle_minutes: 5,
        last_triggered_at: null,
        created_at: '2025-10-18T00:00:00Z',
        updated_at: '2025-10-18T00:00:00Z',
      }));
      mockSql.unsafe.mockResolvedValueOnce(mockAlerts);
      
      const event = mockEvent({
        httpMethod: 'GET',
        queryStringParameters: {
          status: 'active',
          chain: 'ethereum',
          alert_type: 'above',
        },
      });
      
      const response = await getPriceAlerts(event);
      
      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body).data;
      expect(data.data).toHaveLength(5);
      expect(data.data.every((alert: any) => alert.conditions.chain === 'ethereum')).toBe(true);
      expect(data.data.every((alert: any) => alert.conditions.alert_type === 'above')).toBe(true);
    });
  });
});

