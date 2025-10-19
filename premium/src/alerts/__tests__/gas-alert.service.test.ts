import { GasAlertService } from '../services/gas-alert.service';
import { CreateGasAlertDto, UpdateGasAlertDto } from '../dto';
import postgres from 'postgres';

/**
 * Gas Alert Service Unit Tests
 * 
 * Story 1.3: Gas Fee Alerts
 * Feature ID: F-003
 * EPIC-1: Smart Alerts & Notifications
 */

describe('GasAlertService', () => {
  let service: GasAlertService;
  let mockDb: any;
  const mockUserId = 'user-123';

  beforeEach(() => {
    // Mock database (postgres tagged template function)
    mockDb = jest.fn();

    service = new GasAlertService(mockDb as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a gas alert successfully', async () => {
      const createDto: CreateGasAlertDto = {
        chain: 'ethereum',
        thresholdGwei: 50,
        alertType: 'below',
        notificationChannels: ['email'],
        enabled: true,
        throttleMinutes: 60,
      };

      const mockAlert = {
        id: 'alert-123',
        user_id: mockUserId,
        name: 'Gas Alert',
        description: null,
        type: 'gas',
        conditions: {
          chain: 'ethereum',
          threshold_gwei: 50,
          alert_type: 'below',
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

      // Mock database calls
      mockDb
        .mockResolvedValueOnce([{ count: '0' }]) // Count query
        .mockResolvedValueOnce([{ tier: 'premium' }]) // User tier query
        .mockResolvedValueOnce([mockAlert]); // Insert query

      const result = await service.create(mockUserId, createDto);

      expect(result).toEqual(mockAlert);
      expect(mockDb).toHaveBeenCalledTimes(3);
    });

    it('should throw error when alert limit exceeded (Pro tier)', async () => {
      const createDto: CreateGasAlertDto = {
        chain: 'ethereum',
        thresholdGwei: 50,
        alertType: 'below',
        notificationChannels: ['email'],
        enabled: true,
        throttleMinutes: 60,
      };

      // Mock database calls
      mockDb
        .mockResolvedValueOnce([{ count: '200' }]) // Count query
        .mockResolvedValueOnce([{ tier: 'pro' }]); // User tier query

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        'Alert limit exceeded. Pro tier allows up to 200 gas alerts.'
      );
    });

    it('should create alert with webhook URL when webhook channel selected', async () => {
      const createDto: CreateGasAlertDto = {
        chain: 'ethereum',
        thresholdGwei: 50,
        alertType: 'below',
        notificationChannels: ['webhook'],
        webhookUrl: 'https://example.com/webhook',
        enabled: true,
        throttleMinutes: 60,
      };

      const mockAlert = {
        id: 'alert-123',
        user_id: mockUserId,
        name: 'Gas Alert',
        description: null,
        type: 'gas',
        conditions: {
          chain: 'ethereum',
          threshold_gwei: 50,
          alert_type: 'below',
        },
        actions: {
          channels: ['webhook'],
          webhook_url: 'https://example.com/webhook',
        },
        enabled: true,
        throttle_minutes: 60,
        last_triggered_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock database calls
      mockDb
        .mockResolvedValueOnce([{ count: '0' }]) // Count query
        .mockResolvedValueOnce([{ tier: 'premium' }]) // User tier query
        .mockResolvedValueOnce([mockAlert]); // Insert query

      const result = await service.create(mockUserId, createDto);

      expect(result.actions.webhook_url).toBe('https://example.com/webhook');
    });
  });

  describe('findAll', () => {
    it('should return paginated gas alerts', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          user_id: mockUserId,
          name: 'Gas Alert 1',
          description: null,
          type: 'gas',
          conditions: { chain: 'ethereum', threshold_gwei: 50, alert_type: 'below' },
          actions: { channels: ['email'] },
          enabled: true,
          throttle_minutes: 60,
          last_triggered_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'alert-2',
          user_id: mockUserId,
          name: 'Gas Alert 2',
          description: null,
          type: 'gas',
          conditions: { chain: 'polygon', threshold_gwei: 100, alert_type: 'spike' },
          actions: { channels: ['telegram'] },
          enabled: true,
          throttle_minutes: 30,
          last_triggered_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Mock database calls
      mockDb
        .mockResolvedValueOnce(mockAlerts) // Data query
        .mockResolvedValueOnce([{ count: '2' }]); // Count query

      const result = await service.findAll(mockUserId, 1, 20);

      expect(result.data).toEqual(mockAlerts);
      expect(result.pagination).toEqual({
        page: 1,
        per_page: 20,
        total: 2,
        total_pages: 1,
      });
    });

    it('should return empty array when no alerts found', async () => {
      // Mock database calls
      mockDb
        .mockResolvedValueOnce([]) // Data query
        .mockResolvedValueOnce([{ count: '0' }]); // Count query

      const result = await service.findAll(mockUserId, 1, 20);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('should return gas alert by ID', async () => {
      const mockAlert = {
        id: 'alert-123',
        user_id: mockUserId,
        name: 'Gas Alert',
        description: null,
        type: 'gas',
        conditions: { chain: 'ethereum', threshold_gwei: 50, alert_type: 'below' },
        actions: { channels: ['email'] },
        enabled: true,
        throttle_minutes: 60,
        last_triggered_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDb.mockResolvedValue([mockAlert]);

      const result = await service.findById(mockUserId, 'alert-123');

      expect(result).toEqual(mockAlert);
    });

    it('should return null when alert not found', async () => {
      mockDb.mockResolvedValue([]);

      const result = await service.findById(mockUserId, 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update gas alert successfully', async () => {
      const updateDto: UpdateGasAlertDto = {
        thresholdGwei: 100,
        enabled: false,
      };

      const existingAlert = {
        id: 'alert-123',
        user_id: mockUserId,
        name: 'Gas Alert',
        description: null,
        type: 'gas',
        conditions: { chain: 'ethereum', threshold_gwei: 50, alert_type: 'below' },
        actions: { channels: ['email'] },
        enabled: true,
        throttle_minutes: 60,
        last_triggered_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedAlert = {
        ...existingAlert,
        conditions: { ...existingAlert.conditions, threshold_gwei: 100 },
        enabled: false,
      };

      // Mock database calls
      mockDb
        .mockResolvedValueOnce([existingAlert]) // findById query
        .mockResolvedValueOnce([updatedAlert]); // Update query

      const result = await service.update(mockUserId, 'alert-123', updateDto);

      expect(result).toEqual(updatedAlert);
      expect(result?.conditions.threshold_gwei).toBe(100);
      expect(result?.enabled).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete gas alert successfully', async () => {
      mockDb.mockResolvedValue([{ id: 'alert-123' }]);

      const result = await service.delete(mockUserId, 'alert-123');

      expect(result).toBe(true);
    });

    it('should return false when alert not found', async () => {
      mockDb.mockResolvedValue([]);

      const result = await service.delete(mockUserId, 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('toggle', () => {
    it('should toggle gas alert enabled status', async () => {
      const mockAlert = {
        id: 'alert-123',
        user_id: mockUserId,
        name: 'Gas Alert',
        description: null,
        type: 'gas',
        conditions: { chain: 'ethereum', threshold_gwei: 50, alert_type: 'below' },
        actions: { channels: ['email'] },
        enabled: false,
        throttle_minutes: 60,
        last_triggered_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDb.mockResolvedValue([mockAlert]);

      const result = await service.toggle(mockUserId, 'alert-123', false);

      expect(result?.enabled).toBe(false);
    });
  });
});

