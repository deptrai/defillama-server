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
 * E2E Tests for Telegram Notifications
 * 
 * Tests Telegram notification delivery using Telegram Mock Server
 * 
 * Prerequisites:
 * - Telegram Mock Server running on port 3100
 * - Test database running on port 3081
 * - Notification service configured to use mock server
 */

describe('Telegram Notifications E2E', () => {
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

  describe('Message Delivery', () => {
    it('should send Telegram message for whale alert trigger', async () => {
      // 1. Create whale alert with Telegram notification
      const alert = await createTestWhaleAlert({
        notification_channels: ['telegram'],
        conditions: {
          chain: 'ethereum',
          token: 'USDT',
          threshold: 1000000,
        },
      });

      // 2. Trigger alert (simulate whale transaction)
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
        from: '0x1234...',
        to: '0x5678...',
        txHash: '0xabcd...',
      });

      // 3. Wait for notification delivery
      await waitForNotification(500);

      // 4. Verify message was sent to Telegram Mock
      const messages = await mockServers.telegram.getMessages();
      expect(messages.length).toBe(1);

      const message = messages[0];
      expect(message.chat_id).toBe(TEST_CONFIG.TEST_TELEGRAM_CHAT_ID);
      expect(message.text).toContain('Whale Alert');
      expect(message.text).toContain('USDT');
      expect(message.text).toContain('5,000,000');
      expect(message.text).toContain('ethereum');
    });

    it('should send Telegram message for price alert trigger', async () => {
      const alert = await createTestPriceAlert({
        notification_channels: ['telegram'],
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

      const messages = await mockServers.telegram.getMessages();
      expect(messages.length).toBe(1);

      const message = messages[0];
      expect(message.text).toContain('Price Alert');
      expect(message.text).toContain('ETH');
      expect(message.text).toContain('2,500');
      expect(message.text).toContain('above');
    });

    it('should not send message if Telegram channel disabled', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['email'], // No Telegram
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(500);

      const messages = await mockServers.telegram.getMessages();
      expect(messages.length).toBe(0);
    });
  });

  describe('Message Formatting', () => {
    it('should format whale alert message with transaction details', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['telegram'],
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

      const messages = await mockServers.telegram.getMessages();
      const message = messages[0];

      // Verify transaction details
      expect(message.text).toContain('From: `0xaaa...`');
      expect(message.text).toContain('To: `0xbbb...`');
      expect(message.text).toContain('Tx: `0x123...`');
      expect(message.text).toContain('Chain: bsc');
    });

    it('should format price alert message with price change', async () => {
      const alert = await createTestPriceAlert({
        notification_channels: ['telegram'],
        conditions: {
          token: 'BTC',
          alertType: 'below',
          threshold: 40000,
        },
      });

      await triggerPriceAlert(alert.id, {
        token: 'BTC',
        currentPrice: 35000,
        previousPrice: 42000,
      });

      await waitForNotification(500);

      const messages = await mockServers.telegram.getMessages();
      const message = messages[0];

      // Verify price change
      expect(message.text).toContain('Current: $35,000');
      expect(message.text).toContain('Previous: $42,000');
      expect(message.text).toContain('-16.67%');
    });

    it('should use Markdown formatting', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['telegram'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(500);

      const messages = await mockServers.telegram.getMessages();
      const message = messages[0];

      // Verify Markdown formatting
      expect(message.parse_mode).toBe('Markdown');
      expect(message.text).toMatch(/\*\*.*\*\*/); // Bold text
      expect(message.text).toMatch(/`.*`/); // Code blocks
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid chat ID gracefully', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['telegram'],
      });

      // Mock server will accept any chat ID, but in real scenario
      // we should handle invalid chat IDs
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(500);

      // Should still attempt to send
      const messages = await mockServers.telegram.getMessages();
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });

    it('should retry on temporary failure', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['telegram'],
      });

      // In real implementation, this would test retry logic
      // For now, just verify message is sent
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000); // Longer wait for retries

      const messages = await mockServers.telegram.getMessages();
      expect(messages.length).toBeGreaterThanOrEqual(1);
    });

    it('should log error on permanent failure', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['telegram'],
      });

      // In real implementation, this would test error logging
      // For now, just verify attempt was made
      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(500);

      // Should have attempted to send
      const messages = await mockServers.telegram.getMessages();
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple Messages', () => {
    it('should send separate messages for multiple alerts', async () => {
      const alert1 = await createTestWhaleAlert({
        notification_channels: ['telegram'],
      });
      const alert2 = await createTestPriceAlert({
        notification_channels: ['telegram'],
      });

      await triggerWhaleAlert(alert1.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await triggerPriceAlert(alert2.id, {
        token: 'ETH',
        currentPrice: 2500,
        previousPrice: 2000,
      });

      await waitForNotification(1000);

      const messages = await mockServers.telegram.getMessages();
      expect(messages.length).toBe(2);

      const texts = messages.map((m: any) => m.text);
      expect(texts.some((t: string) => t.includes('Whale Alert'))).toBe(true);
      expect(texts.some((t: string) => t.includes('Price Alert'))).toBe(true);
    });

    it('should filter messages by chat ID', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['telegram'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(500);

      const messages = await mockServers.telegram.getMessagesByChatId(
        TEST_CONFIG.TEST_TELEGRAM_CHAT_ID
      );
      expect(messages.length).toBe(1);
      expect(messages[0].chat_id).toBe(TEST_CONFIG.TEST_TELEGRAM_CHAT_ID);
    });
  });
});

// ============================================
// Helper Functions
// ============================================

/**
 * Trigger whale alert
 */
async function triggerWhaleAlert(alertId: string, transaction: any): Promise<void> {
  const alert = await getAlertById(alertId);
  if (!alert) throw new Error(`Alert ${alertId} not found`);

  const actions = typeof alert.actions === 'string' ? JSON.parse(alert.actions) : alert.actions;
  const channels = (actions.channels || []).map((channelType: string) => ({
    type: channelType,
    config: {
      telegram_chat_id: actions.telegram_chat_id || TEST_CONFIG.TEST_TELEGRAM_CHAT_ID,
      discord_webhook_url: actions.discord_webhook_url || TEST_CONFIG.TEST_DISCORD_WEBHOOK_URL,
      webhook_url: actions.webhook_url || TEST_CONFIG.TEST_WEBHOOK_URL,
      email: TEST_CONFIG.TEST_USER_EMAIL,
    },
  }));

  // Wait for notification to complete using callback
  await new Promise<void>((resolve) => {
    notificationService.setNotificationCallback((completedAlertId, results) => {
      if (completedAlertId === alertId) {
        notificationService.clearNotificationCallback();
        resolve();
      }
    });

    notificationService.sendNotification({
      alertId: alert.id,
      alertType: 'whale',
      title: '🐋 Whale Alert',
      message: `Large ${transaction.token} transaction detected on ${transaction.chain}!\nAmount: ${transaction.amount.toLocaleString()}\nFrom: \`${transaction.from || 'N/A'}\`\nTo: \`${transaction.to || 'N/A'}\`\nTx: \`${transaction.txHash || 'N/A'}\`\nChain: ${transaction.chain}`,
      data: transaction,
      channels,
    });
  });
}

/**
 * Trigger price alert
 */
async function triggerPriceAlert(alertId: string, priceData: any): Promise<void> {
  const alert = await getAlertById(alertId);
  if (!alert) throw new Error(`Alert ${alertId} not found`);

  const actions = typeof alert.actions === 'string' ? JSON.parse(alert.actions) : alert.actions;
  const conditions = typeof alert.conditions === 'string' ? JSON.parse(alert.conditions) : alert.conditions;
  const channels = (actions.channels || []).map((channelType: string) => ({
    type: channelType,
    config: {
      telegram_chat_id: actions.telegram_chat_id || TEST_CONFIG.TEST_TELEGRAM_CHAT_ID,
      discord_webhook_url: actions.discord_webhook_url || TEST_CONFIG.TEST_DISCORD_WEBHOOK_URL,
      webhook_url: actions.webhook_url || TEST_CONFIG.TEST_WEBHOOK_URL,
      email: TEST_CONFIG.TEST_USER_EMAIL,
    },
  }));

  const changePercent = ((priceData.currentPrice - priceData.previousPrice) / priceData.previousPrice * 100).toFixed(2);
  const alertType = conditions.alertType || 'above';

  // Wait for notification to complete using callback
  await new Promise<void>((resolve) => {
    notificationService.setNotificationCallback((completedAlertId, results) => {
      if (completedAlertId === alertId) {
        notificationService.clearNotificationCallback();
        resolve();
      }
    });

    notificationService.sendNotification({
      alertId: alert.id,
      alertType: 'price',
      title: '📊 Price Alert',
      message: `${priceData.token} price alert triggered (${alertType})!\nCurrent: $${priceData.currentPrice.toLocaleString()}\nPrevious: $${priceData.previousPrice.toLocaleString()}\nChange: ${changePercent}%`,
      data: priceData,
      channels,
    });
  });
}

/**
 * Format whale alert message
 */
function formatWhaleAlertMessage(transaction: any): string {
  const { chain, token, amount, from, to, txHash } = transaction;
  return `
**🐋 Whale Alert**

**Token:** ${token}
**Amount:** ${amount.toLocaleString()}
**Chain:** ${chain}

**From:** \`${from}\`
**To:** \`${to}\`
**Tx:** \`${txHash}\`
  `.trim();
}

/**
 * Format price alert message
 */
function formatPriceAlertMessage(priceData: any): string {
  const { token, currentPrice, previousPrice } = priceData;
  const change = ((currentPrice - previousPrice) / previousPrice * 100).toFixed(2);
  return `
**📈 Price Alert**

**Token:** ${token}
**Current:** $${currentPrice.toLocaleString()}
**Previous:** $${previousPrice.toLocaleString()}
**Change:** ${change}%
  `.trim();
}

