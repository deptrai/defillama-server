/**
 * Whale Alert Service Tests
 * Story 1.1.1: Configure Whale Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 *
 * Test Coverage:
 * - create (3 tests)
 * - get (3 tests)
 * - getById (2 tests)
 * - update (3 tests)
 * - delete (2 tests)
 * - toggle (1 test)
 * - count (1 test)
 * Total: 15 tests
 */

// Set env variable BEFORE importing service
process.env.PREMIUM_DB = 'postgresql://test:test@localhost:5432/test';

// Mock postgres BEFORE importing service
// mockSql needs to be a function that returns a Promise (for template literal calls)
const mockSql: any = jest.fn().mockResolvedValue([]);
mockSql.unsafe = jest.fn().mockResolvedValue([]);

jest.mock('postgres', () => {
  return jest.fn(() => mockSql);
});

import { WhaleAlertService } from '../whale-alert.service';

describe('WhaleAlertService', () => {
  let service: WhaleAlertService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset mockSql but restore default implementation
    mockSql.mockReset();
    mockSql.mockResolvedValue([]);

    if (mockSql.unsafe) {
      mockSql.unsafe.mockReset();
      mockSql.unsafe.mockResolvedValue([]);
    }

    // Create service instance
    service = new WhaleAlertService();
  });

  // ============================================================================
  // create Tests
  // ============================================================================

  describe('create', () => {
    it('should create whale alert successfully', async () => {
      const mockAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user_123',
        name: 'Test Alert',
        description: 'Test description',
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSql.mockResolvedValue([mockAlert]);

      const data = {
        name: 'Test Alert',
        description: 'Test description',
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
      };

      const result = await service.create('user_123', data);

      expect(result).toEqual(mockAlert);
      expect(mockSql).toHaveBeenCalled();
    });

    it('should create whale alert without description', async () => {
      const mockAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user_123',
        name: 'Test Alert',
        description: null,
        type: 'whale',
        conditions: {},
        actions: {},
        enabled: true,
        throttle_minutes: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSql.mockResolvedValue([mockAlert]);

      const data = {
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
      };

      const result = await service.create('user_123', data);

      expect(result).toEqual(mockAlert);
    });

    it('should throw error if creation fails', async () => {
      mockSql.mockRejectedValue(new Error('Database error'));

      const data = {
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
      };

      await expect(service.create('user_123', data)).rejects.toThrow('Database error');
    });
  });

  // ============================================================================
  // get Tests
  // ============================================================================

  describe('get', () => {
    it('should get whale alerts with pagination', async () => {
      const mockAlerts = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: 'user_123',
          name: 'Alert 1',
          type: 'whale',
          conditions: {},
          actions: {},
          enabled: true,
          throttle_minutes: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          user_id: 'user_123',
          name: 'Alert 2',
          type: 'whale',
          conditions: {},
          actions: {},
          enabled: true,
          throttle_minutes: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSql.mockResolvedValue(mockAlerts);

      const result = await service.get('user_123', 1, 20);

      expect(result).toEqual(mockAlerts);
      expect(mockSql).toHaveBeenCalled();
    });

    it('should get whale alerts with page 2', async () => {
      // Mock count query
      mockSql.mockResolvedValueOnce([{ count: '0' }]);
      // Mock select query
      mockSql.mockResolvedValueOnce([]);

      const result = await service.get('user_123', 2, 20);

      expect(result).toEqual([]);
      expect(mockSql).toHaveBeenCalled();
    });

    it('should return empty array if no alerts found', async () => {
      // Mock count query
      mockSql.mockResolvedValueOnce([{ count: '0' }]);
      // Mock select query
      mockSql.mockResolvedValueOnce([]);

      const result = await service.get('user_123', 1, 20);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // getById Tests
  // ============================================================================

  describe('getById', () => {
    it('should get whale alert by ID', async () => {
      const mockAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user_123',
        name: 'Test Alert',
        type: 'whale',
        conditions: {},
        actions: {},
        enabled: true,
        throttle_minutes: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSql.mockResolvedValue([mockAlert]);

      const result = await service.getById('user_123', '123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockAlert);
      expect(mockSql).toHaveBeenCalled();
    });

    it('should return null if alert not found', async () => {
      mockSql.mockResolvedValue([]);

      const result = await service.getById('user_123', 'non-existent-id');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // update Tests
  // ============================================================================

  describe('update', () => {
    it('should update whale alert successfully', async () => {
      const mockAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user_123',
        name: 'Updated Alert',
        type: 'whale',
        conditions: {},
        actions: {},
        enabled: true,
        throttle_minutes: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSql.mockResolvedValue([mockAlert]);

      const data = {
        name: 'Updated Alert',
        throttle_minutes: 10,
      };

      const result = await service.update('user_123', '123e4567-e89b-12d3-a456-426614174000', data);

      expect(result).toEqual(mockAlert);
      expect(mockSql).toHaveBeenCalled();
    });

    it('should update only provided fields', async () => {
      const mockAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user_123',
        name: 'Original Name',
        type: 'whale',
        conditions: {},
        actions: {},
        enabled: false,
        throttle_minutes: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSql.mockResolvedValue([mockAlert]);

      const data = {
        enabled: false,
      };

      const result = await service.update('user_123', '123e4567-e89b-12d3-a456-426614174000', data);

      expect(result).toEqual(mockAlert);
    });

    it('should return null if alert not found', async () => {
      mockSql.mockResolvedValue([]);

      const data = {
        name: 'Updated Alert',
      };

      const result = await service.update('user_123', 'non-existent-id', data);

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // delete Tests
  // ============================================================================

  describe('delete', () => {
    it('should delete whale alert successfully', async () => {
      mockSql.mockResolvedValue([{ id: '123e4567-e89b-12d3-a456-426614174000' }]);

      const result = await service.delete('user_123', '123e4567-e89b-12d3-a456-426614174000');

      expect(result).toBe(true);
      expect(mockSql).toHaveBeenCalled();
    });

    it('should return false if alert not found', async () => {
      mockSql.mockResolvedValue([]);

      const result = await service.delete('user_123', 'non-existent-id');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // toggle Tests
  // ============================================================================

  describe('toggle', () => {
    it('should toggle whale alert enabled status', async () => {
      const mockAlert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'user_123',
        name: 'Test Alert',
        type: 'whale',
        conditions: {},
        actions: {},
        enabled: false,
        throttle_minutes: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSql.mockResolvedValue([mockAlert]);

      const result = await service.toggle('user_123', '123e4567-e89b-12d3-a456-426614174000', false);

      expect(result).toEqual(mockAlert);
      expect(mockSql).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // count Tests
  // ============================================================================

  describe('count', () => {
    it('should count whale alerts for user', async () => {
      mockSql.mockResolvedValue([{ count: '5' }]);

      const result = await service.count('user_123');

      expect(result).toBe(5);
      expect(mockSql).toHaveBeenCalled();
    });
  });
});

