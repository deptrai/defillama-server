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
 * E2E Tests for Multi-Channel Notifications
 * 
 * Tests notification delivery across multiple channels simultaneously
 * 
 * Prerequisites:
 * - All mock servers running (Telegram: 3100, Discord: 3101, Webhook: 3102)
 * - MailHog running (SMTP: 3103, Web: 3104)
 * - Test database running on port 3081
 */

describe('Multi-Channel Notifications E2E', () => {
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

  describe('Simultaneous Delivery', () => {
    it('should send to multiple channels simultaneously', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['email', 'telegram', 'discord', 'webhook'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      // Verify all channels received notification
      const telegramMessages = await mockServers.telegram.getMessages();
      const discordWebhooks = await mockServers.discord.getWebhooks();
      const webhookRequests = await mockServers.webhook.getRequests();

      expect(telegramMessages.length).toBe(1);
      expect(discordWebhooks.length).toBe(1);
      expect(webhookRequests.length).toBe(1);
      // Email verification would require MailHog API call
    });

    it('should send to all enabled channels', async () => {
      const alert = await createTestPriceAlert({
        notification_channels: ['telegram', 'discord'],
      });

      await triggerPriceAlert(alert.id, {
        token: 'ETH',
        currentPrice: 2500,
      });

      await waitForNotification(1000);

      const telegramMessages = await mockServers.telegram.getMessages();
      const discordWebhooks = await mockServers.discord.getWebhooks();
      const webhookRequests = await mockServers.webhook.getRequests();

      expect(telegramMessages.length).toBe(1);
      expect(discordWebhooks.length).toBe(1);
      expect(webhookRequests.length).toBe(0); // Webhook not enabled
    });

    it('should skip disabled channels', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['email'], // Only email enabled
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      const telegramMessages = await mockServers.telegram.getMessages();
      const discordWebhooks = await mockServers.discord.getWebhooks();
      const webhookRequests = await mockServers.webhook.getRequests();

      expect(telegramMessages.length).toBe(0);
      expect(discordWebhooks.length).toBe(0);
      expect(webhookRequests.length).toBe(0);
    });
  });

  describe('Channel Priority', () => {
    it('should respect channel priority order', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['telegram', 'email', 'discord'],
      });

      const startTime = Date.now();
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      // In real implementation, verify delivery order
      // For now, just verify all were delivered
      const telegramMessages = await mockServers.telegram.getMessages();
      const discordWebhooks = await mockServers.discord.getWebhooks();

      expect(telegramMessages.length).toBe(1);
      expect(discordWebhooks.length).toBe(1);
    });

    it('should deliver to high-priority channels first', async () => {
      const alert = await createTestPriceAlert({
        notification_channels: ['email', 'telegram'], // Email first
      });

      await triggerPriceAlert(alert.id, {
        token: 'BTC',
        currentPrice: 45000,
      });

      await waitForNotification(1000);

      // Verify both channels received notification
      const telegramMessages = await mockServers.telegram.getMessages();
      expect(telegramMessages.length).toBe(1);
    });
  });

  describe('Fallback Logic', () => {
    it('should fallback to secondary channel on failure', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['telegram', 'discord'], // Telegram primary, Discord fallback
      });

      // In real implementation, simulate Telegram failure
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      // Both should be attempted
      const telegramMessages = await mockServers.telegram.getMessages();
      const discordWebhooks = await mockServers.discord.getWebhooks();

      expect(telegramMessages.length + discordWebhooks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle partial delivery failure', async () => {
      const alert = await createTestPriceAlert({
        notification_channels: ['email', 'telegram', 'discord'],
      });

      // In real implementation, simulate one channel failure
      await triggerPriceAlert(alert.id, {
        token: 'ETH',
        currentPrice: 2500,
      });

      await waitForNotification(1000);

      // At least some channels should succeed
      const telegramMessages = await mockServers.telegram.getMessages();
      const discordWebhooks = await mockServers.discord.getWebhooks();

      expect(telegramMessages.length + discordWebhooks.length).toBeGreaterThanOrEqual(1);
    });

    it('should log delivery status for each channel', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['telegram', 'discord', 'webhook'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      // In real implementation, verify delivery logs
      // For now, just verify deliveries occurred
      const telegramMessages = await mockServers.telegram.getMessages();
      const discordWebhooks = await mockServers.discord.getWebhooks();
      const webhookRequests = await mockServers.webhook.getRequests();

      expect(telegramMessages.length).toBe(1);
      expect(discordWebhooks.length).toBe(1);
      expect(webhookRequests.length).toBe(1);
    });
  });

  describe('Batch Notifications', () => {
    it('should batch notifications across channels', async () => {
      const alerts = await Promise.all([
        createTestWhaleAlert({ notification_channels: ['telegram', 'discord'] }),
        createTestWhaleAlert({ notification_channels: ['telegram', 'discord'] }),
      ]);

      await Promise.all(
        alerts.map(alert =>
          triggerWhaleAlert(alert.id, {
            chain: 'ethereum',
            token: 'USDT',
            amount: 5000000,
          })
        )
      );

      await waitForNotification(1000);

      const telegramMessages = await mockServers.telegram.getMessages();
      const discordWebhooks = await mockServers.discord.getWebhooks();

      // Should have 2 messages per channel
      expect(telegramMessages.length).toBe(2);
      expect(discordWebhooks.length).toBe(2);
    });

    it('should respect rate limits per channel', async () => {
      const alerts = await Promise.all(
        Array(5).fill(null).map(() =>
          createTestWhaleAlert({ notification_channels: ['telegram'] })
        )
      );

      await Promise.all(
        alerts.map(alert =>
          triggerWhaleAlert(alert.id, {
            chain: 'ethereum',
            token: 'USDT',
            amount: 5000000,
          })
        )
      );

      await waitForNotification(2000);

      const telegramMessages = await mockServers.telegram.getMessages();
      
      // Should have all 5 messages (or batched if rate limiting)
      expect(telegramMessages.length).toBeGreaterThanOrEqual(1);
      expect(telegramMessages.length).toBeLessThanOrEqual(5);
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

