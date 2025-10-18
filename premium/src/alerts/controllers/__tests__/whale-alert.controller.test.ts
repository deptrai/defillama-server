/**
 * Whale Alert Controller Tests
 * Story 1.1.1: Configure Whale Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 *
 * Test Coverage:
 * - createWhaleAlert (2 tests)
 * - getWhaleAlerts (2 tests)
 * - getWhaleAlertById (2 tests)
 * - updateWhaleAlert (2 tests)
 * - deleteWhaleAlert (1 test)
 * - toggleWhaleAlert (1 test)
 * Total: 10 tests
 */

// Set env variable BEFORE importing service
process.env.PREMIUM_DB = 'postgresql://test:test@localhost:5432/test';

// Mock the service
jest.mock('../../services/whale-alert.service');

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  createWhaleAlert,
  getWhaleAlerts,
  getWhaleAlertById,
  updateWhaleAlert,
  deleteWhaleAlert,
  toggleWhaleAlert,
} from '../whale-alert.controller';
import { whaleAlertService } from '../../services/whale-alert.service';

describe('Whale Alert Controller', () => {
  const mockUserId = 'user_123';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  // ============================================================================
  // createWhaleAlert Tests
  // ============================================================================

  describe('createWhaleAlert', () => {
    it('should create whale alert successfully', async () => {
      const mockAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user_123',
        name: 'Test Alert',
        type: 'whale' as const,
        conditions: {
          min_amount_usd: 1000000,
          tokens: ['ETH', 'WETH'],
          chains: ['ethereum', 'arbitrum'],
        },
        actions: {
          channels: ['email', 'push'] as ('email' | 'push' | 'webhook' | 'telegram' | 'discord')[],
        },
        enabled: true,
        throttle_minutes: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (whaleAlertService.createWhaleAlertRule as jest.Mock).mockResolvedValue(mockAlert);

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          name: 'Test Alert',
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
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: mockUserId,
            },
          },
        } as any,
      };

      const result: APIGatewayProxyResult = await createWhaleAlert(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockAlert,
      });
      expect(whaleAlertService.createWhaleAlertRule).toHaveBeenCalledWith('user_123', expect.any(Object));
    });

    it('should return 401 if user is not authenticated', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
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
        requestContext: {} as any,
      };

      const result: APIGatewayProxyResult = await createWhaleAlert(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Unauthorized',
      });
    });
  });

  // ============================================================================
  // getWhaleAlerts Tests
  // ============================================================================

  describe('getWhaleAlerts', () => {
    it('should get whale alerts with pagination', async () => {
      const mockAlerts = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: 'user_123',
          name: 'Alert 1',
          type: 'whale' as const,
          conditions: {
            min_amount_usd: 1000000,
            tokens: ['ETH'],
            chains: ['ethereum'],
          },
          actions: {
            channels: ['email'] as ('email' | 'push' | 'webhook' | 'telegram' | 'discord')[],
          },
          enabled: true,
          throttle_minutes: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (whaleAlertService.getWhaleAlertRules as jest.Mock).mockResolvedValue({
        data: mockAlerts,
        pagination: {
          total: 1,
          page: 1,
          per_page: 20,
          total_pages: 1,
        },
      });

      const event: Partial<APIGatewayProxyEvent> = {
        queryStringParameters: {
          page: '1',
          per_page: '20',
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: mockUserId,
            },
          },
        } as any,
      };

      const result: APIGatewayProxyResult = await getWhaleAlerts(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.data).toEqual(mockAlerts);
      expect(body.data.pagination).toEqual({
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        queryStringParameters: {},
        requestContext: {} as any,
      };

      const result: APIGatewayProxyResult = await getWhaleAlerts(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // getWhaleAlertById Tests
  // ============================================================================

  describe('getWhaleAlertById', () => {
    it('should get whale alert by ID', async () => {
      const mockAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user_123',
        name: 'Test Alert',
        type: 'whale' as const,
        conditions: {
          min_amount_usd: 1000000,
          tokens: ['ETH'],
          chains: ['ethereum'],
        },
        actions: {
          channels: ['email'] as ('email' | 'push' | 'webhook' | 'telegram' | 'discord')[],
        },
        enabled: true,
        throttle_minutes: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (whaleAlertService.getWhaleAlertRuleById as jest.Mock).mockResolvedValue(mockAlert);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          id: '123e4567-e89b-12d3-a456-426614174000',
        },
        requestContext: {
          authorizer: {
            claims: { sub: mockUserId },
          },
        } as any,
      };

      const result: APIGatewayProxyResult = await getWhaleAlertById(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockAlert,
      });
    });

    it('should return 404 if alert not found', async () => {
      (whaleAlertService.getWhaleAlertRuleById as jest.Mock).mockResolvedValue(null);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          id: 'non-existent-id',
        },
        requestContext: {
          authorizer: {
            claims: { sub: mockUserId },
          },
        } as any,
      };

      const result: APIGatewayProxyResult = await getWhaleAlertById(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: 'Alert rule not found',
      });
    });
  });

  // ============================================================================
  // updateWhaleAlert Tests
  // ============================================================================

  describe('updateWhaleAlert', () => {
    it('should update whale alert successfully', async () => {
      const mockAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user_123',
        name: 'Updated Alert',
        type: 'whale' as const,
        conditions: {
          min_amount_usd: 1000000,
          tokens: ['ETH'],
          chains: ['ethereum'],
        },
        actions: {
          channels: ['email'] as ('email' | 'push' | 'webhook' | 'telegram' | 'discord')[],
        },
        enabled: true,
        throttle_minutes: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (whaleAlertService.updateWhaleAlertRule as jest.Mock).mockResolvedValue(mockAlert);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          id: '123e4567-e89b-12d3-a456-426614174000',
        },
        body: JSON.stringify({
          name: 'Updated Alert',
          throttle_minutes: 10,
        }),
        requestContext: {
          authorizer: {
            claims: { sub: mockUserId },
          },
        } as any,
      };

      const result: APIGatewayProxyResult = await updateWhaleAlert(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockAlert,
      });
    });

    it('should return 404 if alert not found', async () => {
      (whaleAlertService.updateWhaleAlertRule as jest.Mock).mockResolvedValue(null);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          id: 'non-existent-id',
        },
        body: JSON.stringify({
          name: 'Updated Alert',
        }),
        requestContext: {
          authorizer: {
            claims: { sub: mockUserId },
          },
        } as any,
      };

      const result: APIGatewayProxyResult = await updateWhaleAlert(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
    });
  });

  // ============================================================================
  // deleteWhaleAlert Tests
  // ============================================================================

  describe('deleteWhaleAlert', () => {
    it('should delete whale alert successfully', async () => {
      (whaleAlertService.deleteWhaleAlertRule as jest.Mock).mockResolvedValue(true);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          id: '123e4567-e89b-12d3-a456-426614174000',
        },
        requestContext: {
          authorizer: {
            claims: { sub: mockUserId },
          },
        } as any,
      };

      const result: APIGatewayProxyResult = await deleteWhaleAlert(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: {
          message: 'Alert rule deleted successfully',
        },
      });
    });
  });

  // ============================================================================
  // toggleWhaleAlert Tests
  // ============================================================================

  describe('toggleWhaleAlert', () => {
    it('should toggle whale alert successfully', async () => {
      const mockAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user_123',
        name: 'Test Alert',
        type: 'whale' as const,
        conditions: {
          min_amount_usd: 1000000,
          tokens: ['ETH'],
          chains: ['ethereum'],
        },
        actions: {
          channels: ['email'] as ('email' | 'push' | 'webhook' | 'telegram' | 'discord')[],
        },
        enabled: false,
        throttle_minutes: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (whaleAlertService.toggleWhaleAlertRule as jest.Mock).mockResolvedValue(mockAlert);

      const event: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          id: '123e4567-e89b-12d3-a456-426614174000',
        },
        body: JSON.stringify({
          enabled: false,
        }),
        requestContext: {
          authorizer: {
            claims: { sub: mockUserId },
          },
        } as any,
      };

      const result: APIGatewayProxyResult = await toggleWhaleAlert(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockAlert,
      });
    });
  });
});

