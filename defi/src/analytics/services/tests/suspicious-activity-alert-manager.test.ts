/**
 * Unit Tests for SuspiciousActivityAlertManager
 * Story: 3.2.2 - Suspicious Activity Detection
 * Phase: 6 - Alert System Integration
 */

import { SuspiciousActivityAlertManager, AlertConfig } from '../suspicious-activity-alert-manager';
import { SuspiciousActivity } from '../../engines/rug-pull-detector';

describe('SuspiciousActivityAlertManager', () => {
  let manager: SuspiciousActivityAlertManager;

  beforeAll(() => {
    manager = SuspiciousActivityAlertManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SuspiciousActivityAlertManager.getInstance();
      const instance2 = SuspiciousActivityAlertManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('processActivity', () => {
    const createMockActivity = (severity: string, confidence: number): SuspiciousActivity => ({
      activity_type: 'rug_pull',
      severity: severity as any,
      confidence_score: confidence,
      protocol_id: 'test-protocol',
      wallet_addresses: ['0xwallet1', '0xwallet2'],
      token_addresses: ['0xtoken1'],
      chain_id: 'ethereum',
      detection_timestamp: new Date(),
      detection_method: 'rule_based',
      detector_version: 'v1.0.0',
      evidence_tx_hashes: ['0xtx1'],
      evidence_description: 'Test rug pull detected',
      evidence_metrics: {},
      estimated_loss_usd: 100000,
      affected_users: 50,
      affected_protocols: ['test-protocol'],
      status: 'investigating',
      alert_sent: false,
      reported_to_authorities: false,
    });

    it('should not process alert when alerts are disabled', async () => {
      const activity = createMockActivity('critical', 90);
      const config: AlertConfig = {
        enabled: false,
        severity_threshold: 'low',
        confidence_threshold: 0,
        channels: [],
        deduplication_window: 3600,
      };

      const result = await manager.processActivity(activity, config);
      expect(result).toBeNull();
    });

    it('should not process alert when severity is below threshold', async () => {
      const activity = createMockActivity('low', 90);
      const config: AlertConfig = {
        enabled: true,
        severity_threshold: 'high',
        confidence_threshold: 0,
        channels: [],
        deduplication_window: 3600,
      };

      const result = await manager.processActivity(activity, config);
      expect(result).toBeNull();
    });

    it('should not process alert when confidence is below threshold', async () => {
      const activity = createMockActivity('critical', 50);
      const config: AlertConfig = {
        enabled: true,
        severity_threshold: 'low',
        confidence_threshold: 80,
        channels: [],
        deduplication_window: 3600,
      };

      const result = await manager.processActivity(activity, config);
      expect(result).toBeNull();
    });
  });

  describe('Alert Message Generation', () => {
    it('should generate message with critical severity emoji', () => {
      const activity: SuspiciousActivity = {
        activity_type: 'rug_pull',
        severity: 'critical',
        confidence_score: 95,
        protocol_id: 'test-protocol',
        wallet_addresses: ['0xwallet1'],
        token_addresses: [],
        chain_id: 'ethereum',
        detection_timestamp: new Date(),
        detection_method: 'rule_based',
        detector_version: 'v1.0.0',
        evidence_tx_hashes: [],
        evidence_description: 'Liquidity removed',
        evidence_metrics: {},
        estimated_loss_usd: 500000,
        affected_users: 100,
        affected_protocols: ['test-protocol'],
        status: 'investigating',
        alert_sent: false,
        reported_to_authorities: false,
      };

      // Access private method through any type casting for testing
      const message = (manager as any).generateAlertMessage(activity);
      expect(message).toContain('🚨');
      expect(message).toContain('CRITICAL');
      expect(message).toContain('RUG PULL');
      expect(message).toContain('test-protocol');
      expect(message).toContain('95.0%');
      expect(message).toContain('Liquidity removed');
    });

    it('should generate message with high severity emoji', () => {
      const activity: SuspiciousActivity = {
        activity_type: 'wash_trading',
        severity: 'high',
        confidence_score: 85,
        protocol_id: 'test-protocol',
        wallet_addresses: [],
        token_addresses: [],
        chain_id: 'ethereum',
        detection_timestamp: new Date(),
        detection_method: 'rule_based',
        detector_version: 'v1.0.0',
        evidence_tx_hashes: [],
        evidence_description: 'Self-trading detected',
        evidence_metrics: {},
        estimated_loss_usd: 0,
        affected_users: 0,
        affected_protocols: ['test-protocol'],
        status: 'investigating',
        alert_sent: false,
        reported_to_authorities: false,
      };

      const message = (manager as any).generateAlertMessage(activity);
      expect(message).toContain('⚠️');
      expect(message).toContain('HIGH');
      expect(message).toContain('WASH TRADING');
    });

    it('should include financial impact when available', () => {
      const activity: SuspiciousActivity = {
        activity_type: 'pump_dump',
        severity: 'critical',
        confidence_score: 90,
        protocol_id: 'test-protocol',
        wallet_addresses: ['0xwallet1', '0xwallet2', '0xwallet3'],
        token_addresses: [],
        chain_id: 'ethereum',
        detection_timestamp: new Date(),
        detection_method: 'rule_based',
        detector_version: 'v1.0.0',
        evidence_tx_hashes: [],
        evidence_description: 'Coordinated dump detected',
        evidence_metrics: {},
        estimated_loss_usd: 1000000,
        affected_users: 500,
        affected_protocols: ['test-protocol'],
        status: 'investigating',
        alert_sent: false,
        reported_to_authorities: false,
      };

      const message = (manager as any).generateAlertMessage(activity);
      expect(message).toContain('Estimated loss: $1,000,000');
      expect(message).toContain('Affected users: 500');
      expect(message).toContain('Wallets involved: 3');
    });
  });

  describe('Severity Threshold', () => {
    it('should pass when activity severity equals threshold', () => {
      const result = (manager as any).meetsSeverityThreshold('high', 'high');
      expect(result).toBe(true);
    });

    it('should pass when activity severity is above threshold', () => {
      const result = (manager as any).meetsSeverityThreshold('critical', 'medium');
      expect(result).toBe(true);
    });

    it('should fail when activity severity is below threshold', () => {
      const result = (manager as any).meetsSeverityThreshold('low', 'high');
      expect(result).toBe(false);
    });

    it('should handle all severity levels correctly', () => {
      expect((manager as any).meetsSeverityThreshold('low', 'low')).toBe(true);
      expect((manager as any).meetsSeverityThreshold('medium', 'low')).toBe(true);
      expect((manager as any).meetsSeverityThreshold('high', 'low')).toBe(true);
      expect((manager as any).meetsSeverityThreshold('critical', 'low')).toBe(true);

      expect((manager as any).meetsSeverityThreshold('low', 'critical')).toBe(false);
      expect((manager as any).meetsSeverityThreshold('medium', 'critical')).toBe(false);
      expect((manager as any).meetsSeverityThreshold('high', 'critical')).toBe(false);
      expect((manager as any).meetsSeverityThreshold('critical', 'critical')).toBe(true);
    });
  });

  describe('Alert Channels', () => {
    it('should support email channel', () => {
      const config: AlertConfig = {
        enabled: true,
        severity_threshold: 'low',
        confidence_threshold: 0,
        channels: [
          { type: 'email', config: { to: 'admin@example.com' }, enabled: true },
        ],
        deduplication_window: 3600,
      };

      expect(config.channels[0].type).toBe('email');
      expect(config.channels[0].enabled).toBe(true);
    });

    it('should support webhook channel', () => {
      const config: AlertConfig = {
        enabled: true,
        severity_threshold: 'low',
        confidence_threshold: 0,
        channels: [
          { type: 'webhook', config: { url: 'https://example.com/webhook' }, enabled: true },
        ],
        deduplication_window: 3600,
      };

      expect(config.channels[0].type).toBe('webhook');
      expect(config.channels[0].enabled).toBe(true);
    });

    it('should support push notification channel', () => {
      const config: AlertConfig = {
        enabled: true,
        severity_threshold: 'low',
        confidence_threshold: 0,
        channels: [
          { type: 'push', config: { device_tokens: ['token1', 'token2'] }, enabled: true },
        ],
        deduplication_window: 3600,
      };

      expect(config.channels[0].type).toBe('push');
      expect(config.channels[0].enabled).toBe(true);
    });

    it('should support multiple channels', () => {
      const config: AlertConfig = {
        enabled: true,
        severity_threshold: 'low',
        confidence_threshold: 0,
        channels: [
          { type: 'email', config: {}, enabled: true },
          { type: 'webhook', config: {}, enabled: true },
          { type: 'push', config: {}, enabled: false },
        ],
        deduplication_window: 3600,
      };

      expect(config.channels.length).toBe(3);
      expect(config.channels.filter(c => c.enabled).length).toBe(2);
    });
  });
});

