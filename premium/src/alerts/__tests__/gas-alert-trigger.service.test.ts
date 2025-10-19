/**
 * Gas Alert Trigger Service Unit Tests
 * Story: 1.3 - Gas Fee Alerts
 * Phase 3: Alert Triggering
 */

import { GasAlertTriggerService } from '../services/gas-alert-trigger.service';
import { gasAlertService, GasAlert } from '../services/gas-alert.service';
import { notificationService } from '../services/notification.service';
import { alertHistoryService } from '../services/alert-history.service';
import { GasPriceData } from '../services/gas-price-monitor.service';

// Mock database connection
jest.mock('../../common/utils/db', () => ({
  getAlertsDBConnection: jest.fn(() => jest.fn()),
}));

// Mock dependencies
jest.mock('../services/gas-alert.service');
jest.mock('../services/notification.service');
jest.mock('../services/alert-history.service');
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    zrangebyscore: jest.fn().mockResolvedValue([]),
  }));
});

describe('GasAlertTriggerService', () => {
  let service: GasAlertTriggerService;
  let mockGasAlertService: jest.Mocked<typeof gasAlertService>;
  let mockNotificationService: jest.Mocked<typeof notificationService>;
  let mockAlertHistoryService: jest.Mocked<typeof alertHistoryService>;

  const mockGasPrices: GasPriceData = {
    chain: 'ethereum',
    slow: 10,
    standard: 15,
    fast: 20,
    instant: 25,
    timestamp: new Date().toISOString(),
  };

  const mockAlert: GasAlert = {
    id: 'alert-1',
    user_id: 'user-1',
    name: 'Test Gas Alert',
    description: 'Test alert',
    type: 'gas',
    conditions: {
      chain: 'ethereum',
      threshold_gwei: 20,
      alert_type: 'below',
      gas_type: 'standard',
    },
    actions: {
      channels: ['email'],
      email: 'test@example.com',
    },
    enabled: true,
    throttle_minutes: 60,
    last_triggered_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    service = new GasAlertTriggerService();
    mockGasAlertService = gasAlertService as jest.Mocked<typeof gasAlertService>;
    mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;
    mockAlertHistoryService = alertHistoryService as jest.Mocked<typeof alertHistoryService>;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('checkAlerts()', () => {
    it('should check all active alerts for a chain', async () => {
      mockGasAlertService.getActiveAlertsByChain.mockResolvedValue([mockAlert]);
      mockNotificationService.sendNotification.mockResolvedValue([
        { channel: 'email', success: true, messageId: 'msg-1' },
      ]);
      mockAlertHistoryService.createAlertHistory.mockResolvedValue({} as any);

      await service.checkAlerts('ethereum', mockGasPrices);

      expect(mockGasAlertService.getActiveAlertsByChain).toHaveBeenCalledWith('ethereum');
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
      expect(mockAlertHistoryService.createAlertHistory).toHaveBeenCalled();
    });

    it('should skip if no active alerts', async () => {
      mockGasAlertService.getActiveAlertsByChain.mockResolvedValue([]);

      await service.checkAlerts('ethereum', mockGasPrices);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should skip throttled alerts', async () => {
      const throttledAlert: GasAlert = {
        ...mockAlert,
        last_triggered_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        throttle_minutes: 60,
      };

      mockGasAlertService.getActiveAlertsByChain.mockResolvedValue([throttledAlert]);

      await service.checkAlerts('ethereum', mockGasPrices);

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockGasAlertService.getActiveAlertsByChain.mockRejectedValue(new Error('Database error'));

      await expect(service.checkAlerts('ethereum', mockGasPrices)).resolves.not.toThrow();
    });
  });

  describe('shouldTriggerBelow()', () => {
    it('should trigger when price is below threshold', () => {
      const alert: GasAlert = {
        ...mockAlert,
        conditions: {
          ...mockAlert.conditions,
          threshold_gwei: 20,
          gas_type: 'standard' as const,
        },
      };

      const gasPrices = { ...mockGasPrices, standard: 15 };

      const result = service['shouldTriggerBelow'](alert, gasPrices);

      expect(result).toBe(true);
    });

    it('should trigger when price equals threshold', () => {
      const alert: GasAlert = {
        ...mockAlert,
        conditions: {
          ...mockAlert.conditions,
          threshold_gwei: 15,
          gas_type: 'standard' as const,
        },
      };

      const gasPrices = { ...mockGasPrices, standard: 15 };

      const result = service['shouldTriggerBelow'](alert, gasPrices);

      expect(result).toBe(true);
    });

    it('should not trigger when price is above threshold', () => {
      const alert: GasAlert = {
        ...mockAlert,
        conditions: {
          ...mockAlert.conditions,
          threshold_gwei: 10,
          gas_type: 'standard' as const,
        },
      };

      const gasPrices = { ...mockGasPrices, standard: 15 };

      const result = service['shouldTriggerBelow'](alert, gasPrices);

      expect(result).toBe(false);
    });
  });

  describe('shouldTriggerSpike()', () => {
    it('should trigger when price spikes 100%', async () => {
      const alert: GasAlert = {
        ...mockAlert,
        conditions: {
          ...mockAlert.conditions,
          alert_type: 'spike' as const,
          gas_type: 'standard' as const,
        },
      };

      const gasPrices = { ...mockGasPrices, standard: 30 }; // 30 Gwei

      // Mock historical price (10 minutes ago) = 15 Gwei
      // Spike = (30 - 15) / 15 * 100 = 100%
      jest.spyOn(service as any, 'getGasPriceAt').mockResolvedValue(15);

      const result = await service['shouldTriggerSpike'](alert, gasPrices);

      expect(result).toBe(true);
    });

    it('should trigger when price spikes >100%', async () => {
      const alert: GasAlert = {
        ...mockAlert,
        conditions: {
          ...mockAlert.conditions,
          alert_type: 'spike' as const,
          gas_type: 'standard' as const,
        },
      };

      const gasPrices = { ...mockGasPrices, standard: 40 }; // 40 Gwei

      // Mock historical price = 15 Gwei
      // Spike = (40 - 15) / 15 * 100 = 166.67%
      jest.spyOn(service as any, 'getGasPriceAt').mockResolvedValue(15);

      const result = await service['shouldTriggerSpike'](alert, gasPrices);

      expect(result).toBe(true);
    });

    it('should not trigger when price spikes <100%', async () => {
      const alert: GasAlert = {
        ...mockAlert,
        conditions: {
          ...mockAlert.conditions,
          alert_type: 'spike' as const,
          gas_type: 'standard' as const,
        },
      };

      const gasPrices = { ...mockGasPrices, standard: 25 }; // 25 Gwei

      // Mock historical price = 15 Gwei
      // Spike = (25 - 15) / 15 * 100 = 66.67%
      jest.spyOn(service as any, 'getGasPriceAt').mockResolvedValue(15);

      const result = await service['shouldTriggerSpike'](alert, gasPrices);

      expect(result).toBe(false);
    });

    it('should not trigger when no historical price found', async () => {
      const alert: GasAlert = {
        ...mockAlert,
        conditions: {
          ...mockAlert.conditions,
          alert_type: 'spike' as const,
        },
      };

      jest.spyOn(service as any, 'getGasPriceAt').mockResolvedValue(null);

      const result = await service['shouldTriggerSpike'](alert, mockGasPrices);

      expect(result).toBe(false);
    });
  });

  describe('isThrottled()', () => {
    it('should return false when alert never triggered', () => {
      const alert: GasAlert = { ...mockAlert, last_triggered_at: null };

      const result = service['isThrottled'](alert);

      expect(result).toBe(false);
    });

    it('should return true when within throttle period', () => {
      const alert: GasAlert = {
        ...mockAlert,
        last_triggered_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        throttle_minutes: 60,
      };

      const result = service['isThrottled'](alert);

      expect(result).toBe(true);
    });

    it('should return false when outside throttle period', () => {
      const alert: GasAlert = {
        ...mockAlert,
        last_triggered_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 90 minutes ago
        throttle_minutes: 60,
      };

      const result = service['isThrottled'](alert);

      expect(result).toBe(false);
    });
  });

  describe('formatNotificationPayload()', () => {
    it('should format payload for below threshold alert', () => {
      const alert: GasAlert = {
        ...mockAlert,
        conditions: {
          ...mockAlert.conditions,
          alert_type: 'below' as const,
          threshold_gwei: 20,
          gas_type: 'standard' as const,
        },
      };

      const payload = service['formatNotificationPayload'](alert, mockGasPrices);

      expect(payload.alertType).toBe('gas');
      expect(payload.title).toContain('Below Threshold');
      expect(payload.message).toContain('dropped to');
      expect(payload.data.chain).toBe('ethereum');
      expect(payload.data.current_price).toBe(15);
    });

    it('should format payload for spike alert', () => {
      const alert: GasAlert = {
        ...mockAlert,
        conditions: {
          ...mockAlert.conditions,
          alert_type: 'spike' as const,
        },
      };

      const payload = service['formatNotificationPayload'](alert, mockGasPrices);

      expect(payload.alertType).toBe('gas');
      expect(payload.title).toContain('Price Spike');
      expect(payload.message).toContain('spiked to');
    });
  });
});

