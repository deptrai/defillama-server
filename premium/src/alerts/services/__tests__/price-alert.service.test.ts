/**
 * Price Alert Service Tests
 * Story 1.1.2: Configure Price Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
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

import { PriceAlertService } from '../price-alert.service';

describe('PriceAlertService', () => {
  let service: PriceAlertService;

  const mockUserId = 'user-123';
  const mockAlertId = 'alert-456';

  const mockCreateData = {
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
      channels: ['email', 'push'] as ('email' | 'push' | 'webhook' | 'telegram' | 'discord')[],
    },
    enabled: true,
    throttle_minutes: 5,
  };

  const mockAlertRow = {
    id: mockAlertId,
    user_id: mockUserId,
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
      channels: ['email', 'push'] as ('email' | 'push' | 'webhook' | 'telegram' | 'discord')[],
    },
    enabled: true,
    throttle_minutes: 5,
    last_triggered_at: null,
    created_at: '2025-10-18T00:00:00Z',
    updated_at: '2025-10-18T00:00:00Z',
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset mockSql but restore default implementation
    mockSql.mockReset();
    mockSql.mockResolvedValue([]);

    mockSql.unsafe.mockReset();
    mockSql.unsafe.mockResolvedValue([]);

    // Create service instance
    service = new PriceAlertService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('create', () => {
    it('should create a price alert successfully', async () => {
      // Mock count query (called first)
      mockSql.mockResolvedValueOnce([{ count: '50' }]);

      // Mock getUserTier() query (called second)
      mockSql.mockResolvedValueOnce([{ tier: 'premium', status: 'active' }]);

      // Mock insert query
      mockSql.mockResolvedValueOnce([mockAlertRow]);

      const result = await service.create(mockUserId, mockCreateData);

      expect(result).toEqual(mockAlertRow);
      expect(mockSql).toHaveBeenCalledTimes(3); // count + getUserTier + insert
    });
    
    it('should throw error when alert limit is exceeded (Pro tier)', async () => {
      // Mock count query (200 alerts) - called first
      mockSql.mockResolvedValueOnce([{ count: '200' }]);

      // Mock getUserTier() query (pro tier) - called second
      mockSql.mockResolvedValueOnce([{ tier: 'pro', status: 'active' }]);

      await expect(service.create(mockUserId, mockCreateData)).rejects.toThrow(
        'Alert limit exceeded'
      );
    });
    
    it('should throw error for invalid threshold (price above)', async () => {
      const invalidData = {
        ...mockCreateData,
        conditions: {
          ...mockCreateData.conditions,
          threshold: 0,
        },
      };
      
      await expect(service.create(mockUserId, invalidData)).rejects.toThrow(
        'Validation failed'
      );
    });
    
    it('should throw error for invalid threshold (percentage change)', async () => {
      const invalidData = {
        ...mockCreateData,
        conditions: {
          ...mockCreateData.conditions,
          alert_type: 'change_percent' as const,
          threshold: 15, // Invalid: must be 5, 10, 20, 50, or 100
        },
      };
      
      await expect(service.create(mockUserId, invalidData)).rejects.toThrow(
        'Validation failed'
      );
    });
    
    it('should throw error for invalid threshold (volume spike)', async () => {
      const invalidData = {
        ...mockCreateData,
        conditions: {
          ...mockCreateData.conditions,
          alert_type: 'volume_spike' as const,
          threshold: 150, // Invalid: must be 100, 200, or 500
        },
      };
      
      await expect(service.create(mockUserId, invalidData)).rejects.toThrow(
        'Validation failed'
      );
    });
  });
  
  describe('get', () => {
    it('should get all price alerts with default pagination', async () => {
      // Mock count query
      mockSql.unsafe.mockResolvedValueOnce([{ count: '1' }]);
      
      // Mock select query
      mockSql.unsafe.mockResolvedValueOnce([mockAlertRow]);
      
      const result = await service.get(mockUserId);
      
      expect(result.data).toEqual([mockAlertRow]);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
      });
    });
    
    it('should support custom pagination', async () => {
      // Mock count query
      mockSql.unsafe.mockResolvedValueOnce([{ count: '100' }]);
      
      // Mock select query
      mockSql.unsafe.mockResolvedValueOnce([mockAlertRow]);
      
      const result = await service.get(mockUserId, {
        page: 2,
        per_page: 10,
      });
      
      expect(result.pagination).toEqual({
        total: 100,
        page: 2,
        per_page: 10,
        total_pages: 10,
      });
    });
    
    it('should support filtering by status (active)', async () => {
      mockSql.unsafe.mockResolvedValueOnce([{ count: '1' }]);
      mockSql.unsafe.mockResolvedValueOnce([mockAlertRow]);
      
      await service.get(mockUserId, { status: 'active' });
      
      // Verify WHERE clause includes enabled = true
      expect(mockSql.unsafe).toHaveBeenCalledWith(
        expect.stringContaining('enabled = true')
      );
    });
    
    it('should support filtering by chain', async () => {
      mockSql.unsafe.mockResolvedValueOnce([{ count: '1' }]);
      mockSql.unsafe.mockResolvedValueOnce([mockAlertRow]);
      
      await service.get(mockUserId, { chain: 'ethereum' });
      
      // Verify WHERE clause includes chain filter
      expect(mockSql.unsafe).toHaveBeenCalledWith(
        expect.stringContaining("conditions->>'chain' = 'ethereum'")
      );
    });
    
    it('should support filtering by alert_type', async () => {
      mockSql.unsafe.mockResolvedValueOnce([{ count: '1' }]);
      mockSql.unsafe.mockResolvedValueOnce([mockAlertRow]);
      
      await service.get(mockUserId, { alert_type: 'above' });
      
      // Verify WHERE clause includes alert_type filter
      expect(mockSql.unsafe).toHaveBeenCalledWith(
        expect.stringContaining("conditions->>'alert_type' = 'above'")
      );
    });
  });
  
  describe('getById', () => {
    it('should get a price alert by ID', async () => {
      mockSql.mockResolvedValueOnce([mockAlertRow]);
      
      const result = await service.getById(mockUserId, mockAlertId);
      
      expect(result).toEqual(mockAlertRow);
    });
    
    it('should return null when alert not found', async () => {
      mockSql.mockResolvedValueOnce([]);
      
      const result = await service.getById(mockUserId, mockAlertId);
      
      expect(result).toBeNull();
    });
  });
  
  describe('update', () => {
    it('should update a price alert successfully', async () => {
      const updateData = {
        conditions: {
          threshold: 3500,
        },
      };
      
      const updatedRow = {
        ...mockAlertRow,
        conditions: {
          ...mockAlertRow.conditions,
          threshold: 3500,
        },
      };
      
      // Mock getById
      mockSql.mockResolvedValueOnce([mockAlertRow]);
      
      // Mock update
      mockSql.mockResolvedValueOnce([updatedRow]);
      
      const result = await service.update(mockUserId, mockAlertId, updateData);
      
      expect(result.conditions.threshold).toBe(3500);
    });
    
    it('should throw error when alert not found', async () => {
      mockSql.mockResolvedValueOnce([]);
      
      await expect(
        service.update(mockUserId, mockAlertId, {})
      ).rejects.toThrow('Price alert not found');
    });
  });
  
  describe('delete', () => {
    it('should delete a price alert successfully', async () => {
      mockSql.mockResolvedValueOnce({ count: 1 });
      
      const result = await service.delete(mockUserId, mockAlertId);
      
      expect(result).toBe(true);
    });
    
    it('should return false when alert not found', async () => {
      mockSql.mockResolvedValueOnce({ count: 0 });
      
      const result = await service.delete(mockUserId, mockAlertId);
      
      expect(result).toBe(false);
    });
  });
  
  describe('toggle', () => {
    it('should toggle price alert to disabled', async () => {
      const toggledRow = {
        ...mockAlertRow,
        enabled: false,
      };
      
      mockSql.mockResolvedValueOnce([toggledRow]);
      
      const result = await service.toggle(mockUserId, mockAlertId, false);
      
      expect(result.enabled).toBe(false);
    });
    
    it('should toggle price alert to enabled', async () => {
      const toggledRow = {
        ...mockAlertRow,
        enabled: true,
      };
      
      mockSql.mockResolvedValueOnce([toggledRow]);
      
      const result = await service.toggle(mockUserId, mockAlertId, true);
      
      expect(result.enabled).toBe(true);
    });
    
    it('should throw error when alert not found', async () => {
      mockSql.mockResolvedValueOnce([]);
      
      await expect(
        service.toggle(mockUserId, mockAlertId, false)
      ).rejects.toThrow('Price alert not found');
    });
  });
  
  describe('count', () => {
    it('should count price alerts for a user', async () => {
      mockSql.mockResolvedValueOnce([{ count: '42' }]);
      
      const result = await service.count(mockUserId);
      
      expect(result).toBe(42);
    });
    
    it('should return 0 when user has no alerts', async () => {
      mockSql.mockResolvedValueOnce([{ count: '0' }]);
      
      const result = await service.count(mockUserId);
      
      expect(result).toBe(0);
    });
  });
});

