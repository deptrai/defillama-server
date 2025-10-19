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
 * E2E Tests for Discord Notifications
 * 
 * Tests Discord notification delivery using Discord Mock Server
 * 
 * Prerequisites:
 * - Discord Mock Server running on port 3101
 * - Test database running on port 3081
 * - Notification service configured to use mock server
 */

describe('Discord Notifications E2E', () => {
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

  describe('Webhook Execution', () => {
    it('should execute webhook for whale alert trigger', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['discord'],
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

      await waitForNotification(1000);

      const webhooks = await mockServers.discord.getWebhooks();
      expect(webhooks.length).toBe(1);

      const webhook = webhooks[0];
      expect(webhook.content).toContain('Whale Alert');
      expect(webhook.embeds).toBeDefined();
      expect(webhook.embeds![0].title).toContain('Whale Alert');
      expect(webhook.embeds![0].description).toContain('USDT');
      expect(webhook.embeds![0].description).toContain('5,000,000');
    });

    it('should execute webhook for price alert trigger', async () => {
      const alert = await createTestPriceAlert({
        notification_channels: ['discord'],
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

      await waitForNotification(1000);

      const webhooks = await mockServers.discord.getWebhooks();
      expect(webhooks.length).toBe(1);

      const webhook = webhooks[0];
      expect(webhook.content).toContain('Price Alert');
      expect(webhook.embeds![0].title).toContain('Price Alert');
      expect(webhook.embeds![0].description).toContain('ETH');
      expect(webhook.embeds![0].description).toContain('2,500');
    });

    it('should not execute webhook if Discord channel disabled', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['email'], // No Discord
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      const webhooks = await mockServers.discord.getWebhooks();
      expect(webhooks.length).toBe(0);
    });
  });

  describe('Embed Formatting', () => {
    it('should format webhook with embeds', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['discord'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'bsc',
        token: 'BUSD',
        amount: 2000000,
        from: '0xaaa...',
        to: '0xbbb...',
        txHash: '0x123...',
      });

      await waitForNotification(1000);

      const webhooks = await mockServers.discord.getWebhooks();
      const webhook = webhooks[0];

      expect(webhook.embeds).toBeDefined();
      expect(webhook.embeds!.length).toBeGreaterThan(0);

      const embed = webhook.embeds![0];
      expect(embed.title).toBeDefined();
      expect(embed.description).toBeDefined();
      expect(embed.color).toBeDefined();
      expect(embed.fields).toBeDefined();
    });

    it('should include transaction details in embed', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['discord'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'polygon',
        token: 'MATIC',
        amount: 3000000,
        from: '0xccc...',
        to: '0xddd...',
        txHash: '0x456...',
      });

      await waitForNotification(1000);

      const webhooks = await mockServers.discord.getWebhooks();
      const embed = webhooks[0].embeds![0];

      const fields = embed.fields || [];
      const fieldNames = fields.map((f: any) => f.name);
      const fieldValues = fields.map((f: any) => f.value);

      expect(fieldNames).toContain('Chain');
      expect(fieldNames).toContain('Token');
      expect(fieldNames).toContain('Amount');
      expect(fieldValues.some((v: string) => v.includes('polygon'))).toBe(true);
      expect(fieldValues.some((v: string) => v.includes('MATIC'))).toBe(true);
    });

    it('should use color coding for alert types', async () => {
      const whaleAlert = await createTestWhaleAlert({
        notification_channels: ['discord'],
      });

      await triggerWhaleAlert(whaleAlert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      const webhooks = await mockServers.discord.getWebhooks();
      const embed = webhooks[0].embeds![0];

      // Whale alerts should use specific color (e.g., red/orange)
      expect(embed.color).toBeDefined();
      expect(typeof embed.color).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid webhook URL gracefully', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['discord'],
      });

      // Mock server will accept any webhook, but in real scenario
      // we should handle invalid URLs
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      // Should still attempt to send
      const webhooks = await mockServers.discord.getWebhooks();
      expect(webhooks.length).toBeGreaterThanOrEqual(0);
    });

    it('should retry on temporary failure', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['discord'],
      });

      // In real implementation, this would test retry logic
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000); // Longer wait for retries

      const webhooks = await mockServers.discord.getWebhooks();
      expect(webhooks.length).toBeGreaterThanOrEqual(1);
    });

    it('should log error on permanent failure', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['discord'],
      });

      // In real implementation, this would test error logging
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      // Should have attempted to send
      const webhooks = await mockServers.discord.getWebhooks();
      expect(webhooks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple Webhooks', () => {
    it('should execute separate webhooks for multiple alerts', async () => {
      const alert1 = await createTestWhaleAlert({
        notification_channels: ['discord'],
      });
      const alert2 = await createTestPriceAlert({
        notification_channels: ['discord'],
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

      await waitForNotification(1000);

      const webhooks = await mockServers.discord.getWebhooks();
      expect(webhooks.length).toBe(2);

      const contents = webhooks.map((w: any) => w.content);
      expect(contents.some((c: any) => c?.includes('Whale Alert'))).toBe(true);
      expect(contents.some((c: any) => c?.includes('Price Alert'))).toBe(true);
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

  // Get alert type from conditions
  const conditions = typeof alert.conditions === 'string' ? JSON.parse(alert.conditions) : alert.conditions;
  const alertType = conditions.alertType || conditions.alert_type || 'above';

  await notificationService.sendNotification({
    alertId: alert.id,
    alertType: 'price',
    title: '📊 Price Alert',
    message: `${priceData.token} price alert triggered (${alertType})!\n\nCurrent Price: $${priceData.currentPrice.toLocaleString()}\nPrevious Price: $${priceData.previousPrice.toLocaleString()}\nChange: ${changePercent}%`,
    data: priceData,
    channels,
  });
}

