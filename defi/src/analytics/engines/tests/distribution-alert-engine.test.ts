/**
 * Tests for DistributionAlertEngine
 * Story: 2.2.2 - Holder Distribution Analysis
 */

import { DistributionAlertEngine } from '../distribution-alert-engine';
import { query } from '../../db/connection';

jest.mock('../../db/connection');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('DistributionAlertEngine', () => {
  let engine: DistributionAlertEngine;

  beforeEach(() => {
    engine = DistributionAlertEngine.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DistributionAlertEngine.getInstance();
      const instance2 = DistributionAlertEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createAlert', () => {
    it('should create whale accumulation alert', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-1',
            user_id: 'user-1',
            token_address: '0xToken',
            chain_id: 'ethereum',
            alert_type: 'whale_accumulation',
            threshold: '0.5',
            channels: '["email","webhook"]',
            webhook_url: 'https://example.com/webhook',
            enabled: true,
            last_triggered: null,
            trigger_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      } as any);

      const result = await engine.createAlert({
        userId: 'user-1',
        tokenAddress: '0xToken',
        alertType: 'whale_accumulation',
        threshold: 0.5,
        channels: ['email', 'webhook'],
        webhookUrl: 'https://example.com/webhook',
      });

      expect(result.id).toBe('alert-1');
      expect(result.alertType).toBe('whale_accumulation');
      expect(result.threshold).toBe(0.5);
      expect(result.channels).toEqual(['email', 'webhook']);
      expect(result.enabled).toBe(true);
    });

    it('should create alert with default chain ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-2',
            user_id: 'user-1',
            token_address: '0xToken',
            chain_id: 'ethereum',
            alert_type: 'concentration_increase',
            threshold: '5.0',
            channels: '["email"]',
            webhook_url: null,
            enabled: true,
            last_triggered: null,
            trigger_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      } as any);

      const result = await engine.createAlert({
        userId: 'user-1',
        tokenAddress: '0xToken',
        alertType: 'concentration_increase',
        threshold: 5.0,
        channels: ['email'],
      });

      expect(result.chainId).toBe('ethereum');
    });

    it('should create alert with custom chain ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-3',
            user_id: 'user-1',
            token_address: '0xToken',
            chain_id: 'polygon',
            alert_type: 'whale_distribution',
            threshold: '1.0',
            channels: '["push"]',
            webhook_url: null,
            enabled: true,
            last_triggered: null,
            trigger_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      } as any);

      const result = await engine.createAlert({
        userId: 'user-1',
        tokenAddress: '0xToken',
        chainId: 'polygon',
        alertType: 'whale_distribution',
        threshold: 1.0,
        channels: ['push'],
      });

      expect(result.chainId).toBe('polygon');
    });
  });

  describe('getUserAlerts', () => {
    it('should get all alerts for a user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-1',
            user_id: 'user-1',
            token_address: '0xToken1',
            chain_id: 'ethereum',
            alert_type: 'whale_accumulation',
            threshold: '0.5',
            channels: '["email"]',
            webhook_url: null,
            enabled: true,
            last_triggered: null,
            trigger_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 'alert-2',
            user_id: 'user-1',
            token_address: '0xToken2',
            chain_id: 'ethereum',
            alert_type: 'concentration_increase',
            threshold: '5.0',
            channels: '["webhook"]',
            webhook_url: 'https://example.com',
            enabled: true,
            last_triggered: null,
            trigger_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      } as any);

      const result = await engine.getUserAlerts('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-1');
      expect(result[1].userId).toBe('user-1');
    });

    it('should filter alerts by token address', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-1',
            user_id: 'user-1',
            token_address: '0xToken1',
            chain_id: 'ethereum',
            alert_type: 'whale_accumulation',
            threshold: '0.5',
            channels: '["email"]',
            webhook_url: null,
            enabled: true,
            last_triggered: null,
            trigger_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      } as any);

      const result = await engine.getUserAlerts('user-1', '0xToken1');

      expect(result).toHaveLength(1);
      expect(result[0].tokenAddress).toBe('0xToken1');
    });

    it('should return empty array when no alerts found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.getUserAlerts('user-nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('updateAlert', () => {
    it('should update alert threshold', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-1',
            user_id: 'user-1',
            token_address: '0xToken',
            chain_id: 'ethereum',
            alert_type: 'whale_accumulation',
            threshold: '1.0',
            channels: '["email"]',
            webhook_url: null,
            enabled: true,
            last_triggered: null,
            trigger_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      } as any);

      const result = await engine.updateAlert('alert-1', { threshold: 1.0 });

      expect(result.threshold).toBe(1.0);
    });

    it('should update alert channels', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-1',
            user_id: 'user-1',
            token_address: '0xToken',
            chain_id: 'ethereum',
            alert_type: 'whale_accumulation',
            threshold: '0.5',
            channels: '["email","webhook","push"]',
            webhook_url: null,
            enabled: true,
            last_triggered: null,
            trigger_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      } as any);

      const result = await engine.updateAlert('alert-1', { channels: ['email', 'webhook', 'push'] });

      expect(result.channels).toEqual(['email', 'webhook', 'push']);
    });

    it('should disable alert', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-1',
            user_id: 'user-1',
            token_address: '0xToken',
            chain_id: 'ethereum',
            alert_type: 'whale_accumulation',
            threshold: '0.5',
            channels: '["email"]',
            webhook_url: null,
            enabled: false,
            last_triggered: null,
            trigger_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      } as any);

      const result = await engine.updateAlert('alert-1', { enabled: false });

      expect(result.enabled).toBe(false);
    });

    it('should update multiple fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-1',
            user_id: 'user-1',
            token_address: '0xToken',
            chain_id: 'ethereum',
            alert_type: 'whale_accumulation',
            threshold: '2.0',
            channels: '["webhook"]',
            webhook_url: 'https://new-webhook.com',
            enabled: true,
            last_triggered: null,
            trigger_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      } as any);

      const result = await engine.updateAlert('alert-1', {
        threshold: 2.0,
        channels: ['webhook'],
        webhookUrl: 'https://new-webhook.com',
      });

      expect(result.threshold).toBe(2.0);
      expect(result.channels).toEqual(['webhook']);
      expect(result.webhookUrl).toBe('https://new-webhook.com');
    });
  });

  describe('deleteAlert', () => {
    it('should delete alert', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await engine.deleteAlert('alert-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM holder_distribution_alerts WHERE id = $1',
        ['alert-1']
      );
    });
  });

  describe('checkAlerts', () => {
    it('should detect whale accumulation', async () => {
      // Get enabled alerts
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-1',
            alert_type: 'whale_accumulation',
            threshold: '0.5',
          },
        ],
      } as any);

      // Get snapshots
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            whale_percentage: '10.0',
            concentration_score: '70',
            total_holders: 55,
            timestamp: new Date(),
          },
          {
            whale_percentage: '9.0',
            concentration_score: '68',
            total_holders: 53,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        ],
      } as any);

      // Update trigger
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.checkAlerts('0xToken');

      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe('whale_accumulation');
      expect(result[0].change).toBeGreaterThanOrEqual(0.5);
    });

    it('should detect whale distribution', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-2',
            alert_type: 'whale_distribution',
            threshold: '0.5',
          },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            whale_percentage: '8.5',
            concentration_score: '68',
            total_holders: 55,
            timestamp: new Date(),
          },
          {
            whale_percentage: '9.5',
            concentration_score: '70',
            total_holders: 53,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.checkAlerts('0xToken');

      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe('whale_distribution');
      expect(result[0].change).toBeGreaterThanOrEqual(0.5);
    });

    it('should detect concentration increase', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-3',
            alert_type: 'concentration_increase',
            threshold: '5.0',
          },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            whale_percentage: '9.5',
            concentration_score: '75',
            total_holders: 55,
            timestamp: new Date(),
          },
          {
            whale_percentage: '9.0',
            concentration_score: '68',
            total_holders: 53,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.checkAlerts('0xToken');

      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe('concentration_increase');
      expect(result[0].change).toBeGreaterThanOrEqual(5.0);
    });

    it('should detect holder count change', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-4',
            alert_type: 'holder_count_change',
            threshold: '10.0',
          },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            whale_percentage: '9.5',
            concentration_score: '70',
            total_holders: 60,
            timestamp: new Date(),
          },
          {
            whale_percentage: '9.0',
            concentration_score: '68',
            total_holders: 50,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.checkAlerts('0xToken');

      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe('holder_count_change');
      expect(result[0].change).toBe(10);
    });

    it('should not trigger when threshold not met', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-1',
            alert_type: 'whale_accumulation',
            threshold: '1.0',
          },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            whale_percentage: '9.3',
            concentration_score: '70',
            total_holders: 55,
            timestamp: new Date(),
          },
          {
            whale_percentage: '9.0',
            concentration_score: '68',
            total_holders: 53,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        ],
      } as any);

      const result = await engine.checkAlerts('0xToken');

      expect(result).toHaveLength(0);
    });

    it('should handle insufficient snapshot data', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-1',
            alert_type: 'whale_accumulation',
            threshold: '0.5',
          },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            whale_percentage: '9.5',
            concentration_score: '70',
            total_holders: 55,
            timestamp: new Date(),
          },
        ],
      } as any);

      const result = await engine.checkAlerts('0xToken');

      expect(result).toHaveLength(0);
    });

    it('should update trigger count and timestamp', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'alert-1',
            alert_type: 'whale_accumulation',
            threshold: '0.5',
          },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            whale_percentage: '10.0',
            concentration_score: '70',
            total_holders: 55,
            timestamp: new Date(),
          },
          {
            whale_percentage: '9.0',
            concentration_score: '68',
            total_holders: 53,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await engine.checkAlerts('0xToken');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE holder_distribution_alerts'),
        ['alert-1']
      );
    });
  });
});

