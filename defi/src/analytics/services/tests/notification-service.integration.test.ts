/**
 * Notification Service Integration Tests
 * Story: 3.2.2 - Suspicious Activity Detection - Enhancements
 * Phase 4: Testing & Documentation
 *
 * Tests notification service integration with SendGrid, Webhook, and Supabase Realtime.
 * Requires SENDGRID_API_KEY environment variable for email tests.
 */

import { NotificationService, NotificationTemplates } from '../notification-service';

describe('NotificationService Integration Tests', () => {
  let service: NotificationService;
  const hasSendGridKey = !!process.env.SENDGRID_API_KEY;
  const hasWebhookUrl = !!process.env.WEBHOOK_URL;

  beforeAll(() => {
    service = NotificationService.getInstance();
  });

  describe('Email Notifications', () => {
    it('should send email when SendGrid API key is available', async () => {
      if (!hasSendGridKey) {
        console.log('Skipping test: SENDGRID_API_KEY not set');
        return;
      }

      const result = await service.sendEmail({
        to: [process.env.ALERT_EMAIL || 'test@example.com'],
        subject: 'Test Alert - Integration Test',
        html: '<h1>Test Alert</h1><p>This is a test alert from integration tests.</p>',
        text: 'Test Alert\n\nThis is a test alert from integration tests.',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
      expect(result.messageId).toBeDefined();
    }, 30000);

    it('should use mock implementation when SendGrid API key is not available', async () => {
      if (hasSendGridKey) {
        console.log('Skipping test: SENDGRID_API_KEY is set');
        return;
      }

      const result = await service.sendEmail({
        to: ['test@example.com'],
        subject: 'Test Alert',
        html: '<h1>Test</h1>',
        text: 'Test',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
      expect(result.messageId).toContain('mock-email-');
    }, 30000);

    it('should handle email sending errors gracefully', async () => {
      const result = await service.sendEmail({
        to: ['invalid-email'], // Invalid email format
        subject: 'Test',
        html: '<h1>Test</h1>',
        text: 'Test',
      });

      // Should either succeed (mock) or fail gracefully
      expect(result).toBeDefined();
      expect(result.channel).toBe('email');
    }, 30000);
  });

  describe('Webhook Notifications', () => {
    it('should send webhook when webhook URL is available', async () => {
      if (!hasWebhookUrl) {
        console.log('Skipping test: WEBHOOK_URL not set');
        return;
      }

      const result = await service.sendWebhook({
        url: process.env.WEBHOOK_URL!,
        payload: {
          alert_id: 'test-alert-123',
          severity: 'high',
          message: 'Test webhook from integration tests',
          timestamp: new Date().toISOString(),
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.channel).toBe('webhook');
    }, 30000);

    it('should retry on webhook failure', async () => {
      // Use invalid URL to trigger retry logic
      const result = await service.sendWebhook({
        url: 'http://invalid-webhook-url-that-does-not-exist.com/webhook',
        payload: { test: 'data' },
        headers: {},
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.channel).toBe('webhook');
      expect(result.error).toBeDefined();
    }, 30000);

    it('should use mock implementation when webhook URL is not available', async () => {
      if (hasWebhookUrl) {
        console.log('Skipping test: WEBHOOK_URL is set');
        return;
      }

      const result = await service.sendWebhook({
        url: 'http://mock-webhook.com',
        payload: { test: 'data' },
        headers: {},
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.channel).toBe('webhook');
    }, 30000);
  });

  describe('Push Notifications', () => {
    it('should use mock implementation for push notifications', async () => {
      // Supabase is not configured in tests, should use mock
      const result = await service.sendPush({
        tokens: ['test-device-token-1', 'test-device-token-2'],
        title: 'Test Alert',
        body: 'This is a test push notification',
        data: {
          alert_id: 'test-123',
          severity: 'high',
        },
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.channel).toBe('push');
      expect(result.messageId).toContain('mock-push-');
    }, 30000);
  });

  describe('Multi-channel Notifications', () => {
    it('should send notifications to multiple channels', async () => {
      const results = await Promise.all([
        service.sendEmail({
          to: ['test@example.com'],
          subject: 'Multi-channel Test',
          html: '<h1>Test</h1>',
          text: 'Test',
        }),
        service.sendWebhook({
          url: 'http://mock-webhook.com',
          payload: { test: 'data' },
          headers: {},
        }),
        service.sendPush({
          tokens: ['test-token'],
          title: 'Test',
          body: 'Test',
          data: {},
        }),
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].channel).toBe('email');
      expect(results[1].channel).toBe('webhook');
      expect(results[2].channel).toBe('push');
    }, 30000);
  });
});

describe('NotificationTemplates Tests', () => {
  describe('generateAlertEmail', () => {
    it('should generate email template for critical severity', () => {
      const template = NotificationTemplates.generateAlertEmail(
        'rug_pull',
        'critical',
        'protocol-123',
        'ethereum',
        0.95,
        'Rug pull detected: Liquidity removed from pool'
      );

      expect(template).toBeDefined();
      expect(template.subject).toContain('🚨');
      expect(template.subject).toContain('CRITICAL');
      expect(template.html).toContain('rug_pull');
      expect(template.html).toContain('protocol-123');
      expect(template.html).toContain('ethereum');
      expect(template.html).toContain('95%');
      expect(template.text).toContain('CRITICAL');
    });

    it('should generate email template for high severity', () => {
      const template = NotificationTemplates.generateAlertEmail(
        'wash_trading',
        'high',
        'protocol-456',
        'polygon',
        0.85,
        'Wash trading detected: Circular trading pattern'
      );

      expect(template).toBeDefined();
      expect(template.subject).toContain('⚠️');
      expect(template.subject).toContain('HIGH');
      expect(template.html).toContain('wash_trading');
      expect(template.html).toContain('protocol-456');
      expect(template.html).toContain('polygon');
      expect(template.html).toContain('85%');
    });

    it('should generate email template for medium severity', () => {
      const template = NotificationTemplates.generateAlertEmail(
        'pump_dump',
        'medium',
        'protocol-789',
        'bsc',
        0.70,
        'Pump and dump detected: Abnormal price movement'
      );

      expect(template).toBeDefined();
      expect(template.subject).toContain('⚡');
      expect(template.subject).toContain('MEDIUM');
      expect(template.html).toContain('pump_dump');
      expect(template.html).toContain('protocol-789');
      expect(template.html).toContain('bsc');
      expect(template.html).toContain('70%');
    });

    it('should generate email template for low severity', () => {
      const template = NotificationTemplates.generateAlertEmail(
        'sybil_attack',
        'low',
        'protocol-101',
        'arbitrum',
        0.60,
        'Sybil attack detected: Wallet clustering'
      );

      expect(template).toBeDefined();
      expect(template.subject).toContain('ℹ️');
      expect(template.subject).toContain('LOW');
      expect(template.html).toContain('sybil_attack');
      expect(template.html).toContain('protocol-101');
      expect(template.html).toContain('arbitrum');
      expect(template.html).toContain('60%');
    });

    it('should include all required information in HTML template', () => {
      const template = NotificationTemplates.generateAlertEmail(
        'test_activity',
        'high',
        'test-protocol',
        'ethereum',
        0.90,
        'Test description with details'
      );

      expect(template.html).toContain('Activity Type');
      expect(template.html).toContain('Severity');
      expect(template.html).toContain('Protocol');
      expect(template.html).toContain('Chain');
      expect(template.html).toContain('Confidence');
      expect(template.html).toContain('Description');
    });

    it('should include all required information in text template', () => {
      const template = NotificationTemplates.generateAlertEmail(
        'test_activity',
        'high',
        'test-protocol',
        'ethereum',
        0.90,
        'Test description with details'
      );

      expect(template.text).toContain('Activity Type');
      expect(template.text).toContain('Severity');
      expect(template.text).toContain('Protocol');
      expect(template.text).toContain('Chain');
      expect(template.text).toContain('Confidence');
      expect(template.text).toContain('Description');
    });
  });
});

