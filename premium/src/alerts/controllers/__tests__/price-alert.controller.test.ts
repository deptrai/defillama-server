/**
 * Price Alert Controller Tests
 * Story 1.1.2: Configure Price Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 */

// Set env variable BEFORE importing service
process.env.PREMIUM_DB = 'postgresql://test:test@localhost:5432/test';

// Mock the service
jest.mock('../../services/price-alert.service');

import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  createPriceAlert,
  getPriceAlerts,
  getPriceAlertById,
  updatePriceAlert,
  deletePriceAlert,
  togglePriceAlert,
} from '../price-alert.controller';
import { priceAlertService } from '../../services/price-alert.service';

describe('Price Alert Controller', () => {
  const mockUserId = 'user-123';
  const mockAlertId = 'alert-456';
  
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
  
  const mockPriceAlert = {
    id: mockAlertId,
    user_id: mockUserId,
    name: 'ETH Price Alert',
    description: 'Alert when ETH crosses $3000',
    type: 'price' as const,
    conditions: {
      token: 'ETH',
      chain: 'ethereum',
      alert_type: 'above' as const,
      threshold: 3000,
      auto_disable: true,
    },
    actions: {
      channels: ['email', 'push'],
    },
    enabled: true,
    throttle_minutes: 5,
    last_triggered_at: null,
    created_at: '2025-10-18T00:00:00Z',
    updated_at: '2025-10-18T00:00:00Z',
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createPriceAlert', () => {
    it('should create a price alert successfully', async () => {
      const requestBody = {
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
      
      (priceAlertService.create as jest.Mock).mockResolvedValue(mockPriceAlert);
      
      const event = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify(requestBody),
      });
      
      const response = await createPriceAlert(event);
      
      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        data: mockPriceAlert,
      });
      expect(priceAlertService.create).toHaveBeenCalledWith(mockUserId, requestBody);
    });
    
    it('should return 400 for invalid request body', async () => {
      const event = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({
          type: 'price',
          // Missing required fields
        }),
      });
      
      const response = await createPriceAlert(event);
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });
    
    it('should return 403 when alert limit is exceeded', async () => {
      (priceAlertService.create as jest.Mock).mockRejectedValue(
        new Error('Alert limit exceeded. Pro tier allows maximum 200 price alerts.')
      );
      
      const event = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({
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
        }),
      });
      
      const response = await createPriceAlert(event);
      
      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });
  
  describe('getPriceAlerts', () => {
    it('should get all price alerts successfully', async () => {
      const mockResult = {
        data: [mockPriceAlert],
        pagination: {
          total: 1,
          page: 1,
          per_page: 20,
          total_pages: 1,
        },
      };
      
      (priceAlertService.get as jest.Mock).mockResolvedValue(mockResult);
      
      const event = mockEvent({
        httpMethod: 'GET',
      });
      
      const response = await getPriceAlerts(event);
      
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        data: mockResult,
      });
      expect(priceAlertService.get).toHaveBeenCalledWith(mockUserId, {});
    });
    
    it('should support pagination and filtering', async () => {
      const mockResult = {
        data: [mockPriceAlert],
        pagination: {
          total: 1,
          page: 2,
          per_page: 10,
          total_pages: 1,
        },
      };
      
      (priceAlertService.get as jest.Mock).mockResolvedValue(mockResult);
      
      const event = mockEvent({
        httpMethod: 'GET',
        queryStringParameters: {
          page: '2',
          per_page: '10',
          status: 'active',
          chain: 'ethereum',
          alert_type: 'above',
        },
      });
      
      const response = await getPriceAlerts(event);
      
      expect(response.statusCode).toBe(200);
      expect(priceAlertService.get).toHaveBeenCalledWith(mockUserId, {
        page: 2,
        per_page: 10,
        status: 'active',
        chain: 'ethereum',
        alert_type: 'above',
      });
    });
  });
  
  describe('getPriceAlertById', () => {
    it('should get a price alert by ID successfully', async () => {
      (priceAlertService.getById as jest.Mock).mockResolvedValue(mockPriceAlert);
      
      const event = mockEvent({
        httpMethod: 'GET',
        pathParameters: { id: mockAlertId },
      });
      
      const response = await getPriceAlertById(event);
      
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        data: mockPriceAlert,
      });
      expect(priceAlertService.getById).toHaveBeenCalledWith(mockUserId, mockAlertId);
    });
    
    it('should return 404 when alert not found', async () => {
      (priceAlertService.getById as jest.Mock).mockResolvedValue(null);
      
      const event = mockEvent({
        httpMethod: 'GET',
        pathParameters: { id: mockAlertId },
      });
      
      const response = await getPriceAlertById(event);
      
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).success).toBe(false);
    });
    
    it('should return 400 when alert ID is missing', async () => {
      const event = mockEvent({
        httpMethod: 'GET',
        pathParameters: null,
      });
      
      const response = await getPriceAlertById(event);
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });
  
  describe('updatePriceAlert', () => {
    it('should update a price alert successfully', async () => {
      const updateData = {
        threshold: 3500,
      };
      
      const updatedAlert = {
        ...mockPriceAlert,
        conditions: {
          ...mockPriceAlert.conditions,
          threshold: 3500,
        },
      };
      
      (priceAlertService.update as jest.Mock).mockResolvedValue(updatedAlert);
      
      const event = mockEvent({
        httpMethod: 'PUT',
        pathParameters: { id: mockAlertId },
        body: JSON.stringify({ conditions: updateData }),
      });
      
      const response = await updatePriceAlert(event);
      
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        data: updatedAlert,
      });
    });
    
    it('should return 404 when alert not found', async () => {
      (priceAlertService.update as jest.Mock).mockRejectedValue(
        new Error('Price alert not found')
      );
      
      const event = mockEvent({
        httpMethod: 'PUT',
        pathParameters: { id: mockAlertId },
        body: JSON.stringify({ threshold: 3500 }),
      });
      
      const response = await updatePriceAlert(event);
      
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });
  
  describe('deletePriceAlert', () => {
    it('should delete a price alert successfully', async () => {
      (priceAlertService.delete as jest.Mock).mockResolvedValue(true);
      
      const event = mockEvent({
        httpMethod: 'DELETE',
        pathParameters: { id: mockAlertId },
      });
      
      const response = await deletePriceAlert(event);
      
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        data: { message: 'Price alert deleted successfully' },
      });
      expect(priceAlertService.delete).toHaveBeenCalledWith(mockUserId, mockAlertId);
    });
    
    it('should return 404 when alert not found', async () => {
      (priceAlertService.delete as jest.Mock).mockResolvedValue(false);
      
      const event = mockEvent({
        httpMethod: 'DELETE',
        pathParameters: { id: mockAlertId },
      });
      
      const response = await deletePriceAlert(event);
      
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });
  
  describe('togglePriceAlert', () => {
    it('should toggle price alert successfully', async () => {
      const toggledAlert = {
        ...mockPriceAlert,
        enabled: false,
      };
      
      (priceAlertService.toggle as jest.Mock).mockResolvedValue(toggledAlert);
      
      const event = mockEvent({
        httpMethod: 'PATCH',
        pathParameters: { id: mockAlertId },
        body: JSON.stringify({ enabled: false }),
      });
      
      const response = await togglePriceAlert(event);
      
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        success: true,
        data: toggledAlert,
      });
      expect(priceAlertService.toggle).toHaveBeenCalledWith(mockUserId, mockAlertId, false);
    });
    
    it('should return 400 when enabled field is missing', async () => {
      const event = mockEvent({
        httpMethod: 'PATCH',
        pathParameters: { id: mockAlertId },
        body: JSON.stringify({}),
      });
      
      const response = await togglePriceAlert(event);
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });
});

