import { APIGatewayProxyEvent } from 'aws-lambda';
import * as gasAlertController from '../controllers/gas-alert.controller';
import { gasAlertService } from '../services/gas-alert.service';
import { gasPriceMonitorService } from '../services/gas-price-monitor.service';

/**
 * Gas Alert Controller Unit Tests
 * 
 * Story 1.3: Gas Fee Alerts
 * Feature ID: F-003
 * EPIC-1: Smart Alerts & Notifications
 */

// Mock services
jest.mock('../services/gas-alert.service');
jest.mock('../services/gas-price-monitor.service');

describe('GasAlertController', () => {
  const mockUserId = 'user-123';

  const mockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v2/premium/alerts/gas',
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
      path: '/v2/premium/alerts/gas',
      stage: 'prod',
      requestId: 'request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource-id',
      resourcePath: '/v2/premium/alerts/gas',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      } as any,
    } as any,
    resource: '/v2/premium/alerts/gas',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGasAlert', () => {
    it('should create gas alert successfully', async () => {
      const mockAlert = {
        id: 'alert-123',
        user_id: mockUserId,
        name: 'Gas Alert',
        description: null,
        type: 'gas' as const,
        conditions: {
          chain: 'ethereum',
          threshold_gwei: 50,
          alert_type: 'below' as const,
        },
        actions: {
          channels: ['email'],
        },
        enabled: true,
        throttle_minutes: 60,
        last_triggered_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (gasAlertService.create as jest.Mock).mockResolvedValue(mockAlert);

      const event = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({
          chain: 'ethereum',
          thresholdGwei: 50,
          alertType: 'below',
          notificationChannels: ['email'],
          enabled: true,
          throttleMinutes: 60,
        }),
      });

      const result = await gasAlertController.createGasAlert(event);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockAlert,
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      const event = mockEvent({
        httpMethod: 'POST',
        requestContext: {
          ...mockEvent().requestContext,
          authorizer: undefined,
        } as any,
      });

      const result = await gasAlertController.createGasAlert(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('should return 400 when validation fails', async () => {
      const event = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({
          chain: 'invalid-chain',
          thresholdGwei: 50,
          alertType: 'below',
          notificationChannels: ['email'],
        }),
      });

      const result = await gasAlertController.createGasAlert(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).success).toBe(false);
    });

    it('should return 403 when alert limit exceeded', async () => {
      (gasAlertService.create as jest.Mock).mockRejectedValue(
        new Error('Alert limit exceeded. Pro tier allows up to 200 gas alerts.')
      );

      const event = mockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({
          chain: 'ethereum',
          thresholdGwei: 50,
          alertType: 'below',
          notificationChannels: ['email'],
        }),
      });

      const result = await gasAlertController.createGasAlert(event);

      expect(result.statusCode).toBe(403);
    });
  });

  describe('getGasAlerts', () => {
    it('should return paginated gas alerts', async () => {
      const mockAlerts = {
        data: [
          {
            id: 'alert-1',
            user_id: mockUserId,
            name: 'Gas Alert 1',
            description: null,
            type: 'gas' as const,
            conditions: { chain: 'ethereum', threshold_gwei: 50, alert_type: 'below' as const },
            actions: { channels: ['email'] },
            enabled: true,
            throttle_minutes: 60,
            last_triggered_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 1,
          per_page: 20,
          total: 1,
          total_pages: 1,
        },
      };

      (gasAlertService.findAll as jest.Mock).mockResolvedValue(mockAlerts);

      const event = mockEvent({
        queryStringParameters: {
          page: '1',
          per_page: '20',
        },
      });

      const result = await gasAlertController.getGasAlerts(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockAlerts,
      });
    });

    it('should return 400 when page is invalid', async () => {
      const event = mockEvent({
        queryStringParameters: {
          page: '0',
        },
      });

      const result = await gasAlertController.getGasAlerts(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Page must be >= 1',
      });
    });

    it('should return 400 when per_page is invalid', async () => {
      const event = mockEvent({
        queryStringParameters: {
          per_page: '101',
        },
      });

      const result = await gasAlertController.getGasAlerts(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Per page must be between 1 and 100',
      });
    });
  });

  describe('getGasAlertById', () => {
    it('should return gas alert by ID', async () => {
      const mockAlert = {
        id: 'alert-123',
        user_id: mockUserId,
        name: 'Gas Alert',
        description: null,
        type: 'gas' as const,
        conditions: { chain: 'ethereum', threshold_gwei: 50, alert_type: 'below' as const },
        actions: { channels: ['email'] },
        enabled: true,
        throttle_minutes: 60,
        last_triggered_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (gasAlertService.findById as jest.Mock).mockResolvedValue(mockAlert);

      const event = mockEvent({
        pathParameters: {
          id: 'alert-123',
        },
      });

      const result = await gasAlertController.getGasAlertById(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockAlert,
      });
    });

    it('should return 404 when alert not found', async () => {
      (gasAlertService.findById as jest.Mock).mockResolvedValue(null);

      const event = mockEvent({
        pathParameters: {
          id: 'non-existent',
        },
      });

      const result = await gasAlertController.getGasAlertById(event);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Alert not found',
      });
    });

    it('should return 400 when alert ID is missing', async () => {
      const event = mockEvent({
        pathParameters: null,
      });

      const result = await gasAlertController.getGasAlertById(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Alert ID is required',
      });
    });
  });

  describe('getCurrentGasPrices', () => {
    it('should return current gas prices', async () => {
      const mockGasPrices = {
        chain: 'ethereum',
        slow: 40,
        standard: 50,
        fast: 60,
        instant: 75,
        timestamp: new Date().toISOString(),
      };

      (gasPriceMonitorService.getCurrentGasPrices as jest.Mock).mockResolvedValue(mockGasPrices);

      const event = mockEvent({
        queryStringParameters: {
          chain: 'ethereum',
        },
      });

      const result = await gasAlertController.getCurrentGasPrices(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockGasPrices,
      });
    });

    it('should return 400 when chain parameter is missing', async () => {
      const event = mockEvent({
        queryStringParameters: null,
      });

      const result = await gasAlertController.getCurrentGasPrices(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Chain parameter is required',
      });
    });

    it('should return 400 when chain is unsupported', async () => {
      (gasPriceMonitorService.getCurrentGasPrices as jest.Mock).mockRejectedValue(
        new Error('Unsupported chain: invalid-chain')
      );

      const event = mockEvent({
        queryStringParameters: {
          chain: 'invalid-chain',
        },
      });

      const result = await gasAlertController.getCurrentGasPrices(event);

      expect(result.statusCode).toBe(400);
    });
  });
});

