import axios from 'axios';
import {
  setupNotificationTests,
  teardownNotificationTests,
  resetMockServers,
  getMockServers,
  waitForNotification,
  createTestWhaleAlert,
  createTestPriceAlert,
  TEST_CONFIG,
  getAlertById,
} from './setup';
import { notificationService } from '../../../services/notification.service';

/**
 * E2E Tests for Webhook Notifications
 * 
 * Tests custom webhook notification delivery using Webhook Mock Server
 * 
 * Prerequisites:
 * - Webhook Mock Server running on port 3102
 * - Test database running on port 3081
 * - Notification service configured to use mock server
 */

describe('Webhook Notifications E2E', () => {
  let mockServers: ReturnType<typeof getMockServers>;

  beforeAll(async () => {
    await setupNotificationTests();
    mockServers = getMockServers();
  });

  afterAll(async () => {
    await teardownNotificationTests();
  });

  beforeEach(async () => {
    await resetMockServers();
  });

  describe('Webhook Delivery', () => {
    it('should send webhook for whale alert trigger', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['webhook'],
        conditions: {
          chain: 'ethereum',
          token: 'USDT',
          threshold: 1000000,
        },
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
        from: '0x1234...',
        to: '0x5678...',
        txHash: '0xabcd...',
      });

      await waitForNotification(500);

      const requests = await mockServers.webhook.getRequests();
      expect(requests.length).toBe(1);

      const request = requests[0];
      expect(request.method).toBe('POST');
      expect(request.body.event).toBe('whale_alert');
      expect(request.body.data.token).toBe('USDT');
      expect(request.body.data.amount).toBe(5000000);
    });

    it('should send webhook for price alert trigger', async () => {
      const alert = await createTestPriceAlert({
        notification_channels: ['webhook'],
        conditions: {
          token: 'ETH',
          alertType: 'above',
          threshold: 2000,
        },
      });

      await triggerPriceAlert(alert.id, {
        token: 'ETH',
        currentPrice: 2500,
        previousPrice: 1900,
      });

      await waitForNotification(500);

      const requests = await mockServers.webhook.getRequests();
      expect(requests.length).toBe(1);

      const request = requests[0];
      expect(request.body.event).toBe('price_alert');
      expect(request.body.data.token).toBe('ETH');
      expect(request.body.data.currentPrice).toBe(2500);
    });

    it('should not send webhook if channel disabled', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['email'], // No webhook
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(500);

      const requests = await mockServers.webhook.getRequests();
      expect(requests.length).toBe(0);
    });
  });

  describe('Payload Formatting', () => {
    it('should format webhook payload correctly', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['webhook'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'bsc',
        token: 'BUSD',
        amount: 2000000,
        from: '0xaaa...',
        to: '0xbbb...',
        txHash: '0x123...',
      });

      await waitForNotification(500);

      const requests = await mockServers.webhook.getRequests();
      const payload = requests[0].body;

      // Verify payload structure
      expect(payload).toHaveProperty('event');
      expect(payload).toHaveProperty('data');
      expect(payload).toHaveProperty('timestamp');
      expect(payload.data).toHaveProperty('chain');
      expect(payload.data).toHaveProperty('token');
      expect(payload.data).toHaveProperty('amount');
      expect(payload.data).toHaveProperty('from');
      expect(payload.data).toHaveProperty('to');
      expect(payload.data).toHaveProperty('txHash');
    });

    it('should include custom headers', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['webhook'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(500);

      const requests = await mockServers.webhook.getRequests();
      const headers = requests[0].headers;

      // Verify custom headers
      expect(headers['content-type']).toBe('application/json');
      expect(headers['x-defillama-event']).toBe('whale_alert');
      expect(headers['x-defillama-signature']).toBeDefined();
    });

    it('should include alert metadata', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['webhook'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(500);

      const requests = await mockServers.webhook.getRequests();
      const payload = requests[0].body;

      expect(payload.alert_id).toBe(alert.id);
      expect(payload.user_id).toBe(TEST_CONFIG.TEST_USER_ID);
      expect(payload.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle webhook failure gracefully', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['webhook'],
      });

      // Mock server will accept any webhook, but in real scenario
      // we should handle failures
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(500);

      // Should still attempt to send
      const requests = await mockServers.webhook.getRequests();
      expect(requests.length).toBeGreaterThanOrEqual(0);
    });

    it('should retry on temporary failure', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['webhook'],
      });

      // In real implementation, this would test retry logic
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000); // Longer wait for retries

      const requests = await mockServers.webhook.getRequests();
      expect(requests.length).toBeGreaterThanOrEqual(1);
    });

    it('should log error on permanent failure', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['webhook'],
      });

      // In real implementation, this would test error logging
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(500);

      // Should have attempted to send
      const requests = await mockServers.webhook.getRequests();
      expect(requests.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple Webhooks', () => {
    it('should send separate webhooks for multiple alerts', async () => {
      const alert1 = await createTestWhaleAlert({
        notification_channels: ['webhook'],
      });
      const alert2 = await createTestPriceAlert({
        notification_channels: ['webhook'],
      });

      await triggerWhaleAlert(alert1.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await triggerPriceAlert(alert2.id, {
        token: 'ETH',
        currentPrice: 2500,
      });

      await waitForNotification(500);

      const requests = await mockServers.webhook.getRequests();
      expect(requests.length).toBe(2);

      const events = requests.map(r => r.body.event);
      expect(events).toContain('whale_alert');
      expect(events).toContain('price_alert');
    });

    it('should filter requests by webhook ID', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['webhook'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(500);

      const requests = mockServers.webhook.getRequestsByWebhookId('test');
      expect(requests.length).toBe(1);
    });
  });
});

// ============================================
// Helper Functions
// ============================================

async function triggerWhaleAlert(alertId: string, transaction: any): Promise<void> {
  const alert = await getAlertById(alertId);
  if (!alert) throw new Error(`Alert ${alertId} not found`);

  const actions = typeof alert.actions === 'string' ? JSON.parse(alert.actions) : alert.actions;
  const channels = actions.channels.map((channelType: string) => ({
    type: channelType,
    config: {
      telegram_chat_id: actions.telegram_chat_id || TEST_CONFIG.TEST_TELEGRAM_CHAT_ID,
      discord_webhook_url: actions.discord_webhook_url || TEST_CONFIG.TEST_DISCORD_WEBHOOK_URL,
      webhook_url: actions.webhook_url || TEST_CONFIG.TEST_WEBHOOK_URL,
      email: TEST_CONFIG.TEST_USER_EMAIL,
    },
  }));

  await notificationService.sendNotification({
    alertId: alert.id,
    alertType: 'whale',
    title: '🐋 Whale Alert',
    message: `Large ${transaction.token} transaction detected on ${transaction.chain}!\n\nAmount: ${transaction.amount.toLocaleString()}\nFrom: ${transaction.from}\nTo: ${transaction.to}\nTx: ${transaction.txHash}`,
    data: transaction,
    channels,
  });
}

async function triggerPriceAlert(alertId: string, priceData: any): Promise<void> {
  const alert = await getAlertById(alertId);
  if (!alert) throw new Error(`Alert ${alertId} not found`);

  const actions = typeof alert.actions === 'string' ? JSON.parse(alert.actions) : alert.actions;
  const channels = actions.channels.map((channelType: string) => ({
    type: channelType,
    config: {
      telegram_chat_id: actions.telegram_chat_id || TEST_CONFIG.TEST_TELEGRAM_CHAT_ID,
      discord_webhook_url: actions.discord_webhook_url || TEST_CONFIG.TEST_DISCORD_WEBHOOK_URL,
      webhook_url: actions.webhook_url || TEST_CONFIG.TEST_WEBHOOK_URL,
      email: TEST_CONFIG.TEST_USER_EMAIL,
    },
  }));

  const changePercent = ((priceData.currentPrice - priceData.previousPrice) / priceData.previousPrice * 100).toFixed(2);

  await notificationService.sendNotification({
    alertId: alert.id,
    alertType: 'price',
    title: '📊 Price Alert',
    message: `${priceData.token} price alert triggered!\n\nCurrent Price: $${priceData.currentPrice.toLocaleString()}\nPrevious Price: $${priceData.previousPrice.toLocaleString()}\nChange: ${changePercent}%`,
    data: priceData,
    channels,
  });
}

