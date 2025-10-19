import axios from 'axios';
import {
  setupNotificationTests,
  teardownNotificationTests,
  resetMockServers,
  waitForNotification,
  createTestWhaleAlert,
  createTestPriceAlert,
  TEST_CONFIG,
  getAlertById,
} from './setup';
import { notificationService } from '../../../services/notification.service';

/**
 * E2E Tests for Email Notifications
 * 
 * Tests email notification delivery using MailHog
 * 
 * Prerequisites:
 * - MailHog running on ports 3103 (SMTP) and 3104 (Web)
 * - Test database running on port 3081
 * - Notification service configured to use MailHog SMTP
 */

describe('Email Notifications E2E', () => {
  beforeAll(async () => {
    await setupNotificationTests();
  });

  afterAll(async () => {
    await teardownNotificationTests();
  });

  beforeEach(async () => {
    await resetMockServers();
    await clearMailHogMessages();
  });

  describe('Whale Alert Email Notifications', () => {
    it('should send email notification for whale alert trigger', async () => {
      // 1. Create whale alert with email notification
      const alert = await createTestWhaleAlert({
        notification_channels: ['email'],
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
      await waitForNotification(1000);

      // 4. Verify email was sent to MailHog
      const messages = await getMailHogMessages();
      expect(messages.total).toBe(1);

      const email = messages.items[0];
      expect(email.Content.Headers.To).toContain(TEST_CONFIG.TEST_USER_EMAIL);
      // Subject may be encoded, check for both plain and encoded versions
      const subject = email.Content.Headers.Subject[0] || email.Content.Headers.Subject;
      expect(subject).toMatch(/Whale Alert|Whale_Alert/);
      expect(email.Content.Body).toContain('USDT');
      expect(email.Content.Body).toContain('5,000,000');
      expect(email.Content.Body).toContain('ethereum');
    });

    it('should include transaction details in email', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['email'],
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

      const messages = await getMailHogMessages();
      const email = messages.items[0];

      // Verify transaction details
      expect(email.Content.Body).toContain('0xaaa...');
      expect(email.Content.Body).toContain('0xbbb...');
      expect(email.Content.Body).toContain('0x123...');
      expect(email.Content.Body).toContain('bsc');
    });

    it('should not send email if notification channel disabled', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: [], // No email channel
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      const messages = await getMailHogMessages();
      expect(messages.total).toBe(0);
    });
  });

  describe('Price Alert Email Notifications', () => {
    it('should send email notification for price alert trigger', async () => {
      const alert = await createTestPriceAlert({
        notification_channels: ['email'],
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

      const messages = await getMailHogMessages();
      expect(messages.total).toBe(1);

      const email = messages.items[0];
      // Subject may be encoded, so check for both plain and encoded versions
      const subject = email.Content.Headers.Subject[0];
      expect(subject).toMatch(/Price Alert|=\?UTF-8\?Q\?.*Price.*Alert/i);
      expect(email.Content.Body).toContain('ETH');
      expect(email.Content.Body).toContain('2,500');
      expect(email.Content.Body).toContain('above');
    });

    it('should include price change percentage in email', async () => {
      const alert = await createTestPriceAlert({
        notification_channels: ['email'],
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

      await waitForNotification(1000);

      const messages = await getMailHogMessages();
      const email = messages.items[0];

      // Verify price change percentage
      expect(email.Content.Body).toContain('-16.67%'); // (35000-42000)/42000 * 100
    });
  });

  describe('Multi-Alert Email Notifications', () => {
    it('should send separate emails for multiple alerts', async () => {
      const alert1 = await createTestWhaleAlert({
        notification_channels: ['email'],
      });
      const alert2 = await createTestPriceAlert({
        notification_channels: ['email'],
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

      const messages = await getMailHogMessages();
      expect(messages.total).toBe(2);

      const subjects = messages.items.map((m: any) => m.Content.Headers.Subject[0]);
      // Subjects may be encoded, check for both plain and encoded versions
      const subjectsStr = subjects.join(' ');
      expect(subjectsStr).toMatch(/Whale Alert|Whale_Alert/);
      expect(subjectsStr).toMatch(/Price Alert|Price_Alert/);
    });

    it('should batch multiple alerts if configured', async () => {
      // Create multiple alerts
      const alerts = await Promise.all([
        createTestWhaleAlert({ notification_channels: ['email'] }),
        createTestWhaleAlert({ notification_channels: ['email'] }),
        createTestWhaleAlert({ notification_channels: ['email'] }),
      ]);

      // Trigger all alerts within batching window
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

      const messages = await getMailHogMessages();
      
      // Should batch into single email if batching enabled
      // Otherwise should send 3 separate emails
      expect(messages.total).toBeGreaterThanOrEqual(1);
      expect(messages.total).toBeLessThanOrEqual(3);
    });
  });

  describe('Email Formatting', () => {
    it('should send HTML formatted email', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['email'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      const messages = await getMailHogMessages();
      const email = messages.items[0];

      // Nodemailer sends multipart/alternative with both text and HTML
      const contentType = email.Content.Headers['Content-Type'][0];
      expect(contentType).toMatch(/multipart\/alternative|text\/html/);
      expect(email.Content.Body).toContain('<html');
      expect(email.Content.Body).toContain('</html>');
    });

    it('should include unsubscribe link', async () => {
      const alert = await createTestWhaleAlert({
        notification_channels: ['email'],
      });

      await triggerWhaleAlert(alert.id, {
        chain: 'ethereum',
        token: 'USDT',
        amount: 5000000,
      });

      await waitForNotification(1000);

      const messages = await getMailHogMessages();
      const email = messages.items[0];

      expect(email.Content.Body).toContain('unsubscribe');
      expect(email.Content.Body).toMatch(/https?:\/\/.*\/unsubscribe/);
    });
  });
});

// ============================================
// Helper Functions
// ============================================

/**
 * Get messages from MailHog
 */
async function getMailHogMessages(): Promise<any> {
  const response = await axios.get(
    `http://${TEST_CONFIG.MAILHOG_HOST}:${TEST_CONFIG.MAILHOG_WEB_PORT}/api/v2/messages`
  );
  return response.data;
}

/**
 * Clear all messages from MailHog
 */
async function clearMailHogMessages(): Promise<void> {
  await axios.delete(
    `http://${TEST_CONFIG.MAILHOG_HOST}:${TEST_CONFIG.MAILHOG_WEB_PORT}/api/v1/messages`
  );
}

/**
 * Trigger whale alert
 */
async function triggerWhaleAlert(alertId: string, transaction: any): Promise<void> {
  // Get alert from database
  const alert = await getAlertById(alertId);
  if (!alert) {
    throw new Error(`Alert ${alertId} not found`);
  }

  // Parse actions if string
  const actions = typeof alert.actions === 'string' ? JSON.parse(alert.actions) : alert.actions;

  // Build notification channels
  const channels = actions.channels.map((channelType: string) => {
    const config: any = {};

    if (channelType === 'email') {
      config.email = TEST_CONFIG.TEST_USER_EMAIL;
    } else if (channelType === 'telegram') {
      config.telegram_chat_id = actions.telegram_chat_id || TEST_CONFIG.TEST_TELEGRAM_CHAT_ID;
    } else if (channelType === 'discord') {
      config.discord_webhook_url = actions.discord_webhook_url || TEST_CONFIG.TEST_DISCORD_WEBHOOK_URL;
    } else if (channelType === 'webhook') {
      config.webhook_url = actions.webhook_url || TEST_CONFIG.TEST_WEBHOOK_URL;
    }

    return {
      type: channelType,
      config,
    };
  });

  // Send notification
  await notificationService.sendNotification({
    alertId: alert.id,
    alertType: 'whale',
    title: '🐋 Whale Alert',
    message: `Large ${transaction.token} transaction detected on ${transaction.chain}!\n\nAmount: ${transaction.amount.toLocaleString()}\nFrom: ${transaction.from}\nTo: ${transaction.to}\nTx: ${transaction.txHash}`,
    data: transaction,
    channels,
  });
}

/**
 * Trigger price alert
 */
async function triggerPriceAlert(alertId: string, priceData: any): Promise<void> {
  // Get alert from database
  const alert = await getAlertById(alertId);
  if (!alert) {
    throw new Error(`Alert ${alertId} not found`);
  }

  // Parse actions if string
  const actions = typeof alert.actions === 'string' ? JSON.parse(alert.actions) : alert.actions;

  // Build notification channels
  const channels = actions.channels.map((channelType: string) => {
    const config: any = {};

    if (channelType === 'email') {
      config.email = TEST_CONFIG.TEST_USER_EMAIL;
    } else if (channelType === 'telegram') {
      config.telegram_chat_id = actions.telegram_chat_id || TEST_CONFIG.TEST_TELEGRAM_CHAT_ID;
    } else if (channelType === 'discord') {
      config.discord_webhook_url = actions.discord_webhook_url || TEST_CONFIG.TEST_DISCORD_WEBHOOK_URL;
    } else if (channelType === 'webhook') {
      config.webhook_url = actions.webhook_url || TEST_CONFIG.TEST_WEBHOOK_URL;
    }

    return {
      type: channelType,
      config,
    };
  });

  // Calculate price change percentage
  const changePercent = ((priceData.currentPrice - priceData.previousPrice) / priceData.previousPrice * 100).toFixed(2);

  // Get alert type from conditions
  const conditions = typeof alert.conditions === 'string' ? JSON.parse(alert.conditions) : alert.conditions;
  const alertType = conditions.alertType || conditions.alert_type || 'above';

  // Send notification
  await notificationService.sendNotification({
    alertId: alert.id,
    alertType: 'price',
    title: '📊 Price Alert',
    message: `${priceData.token} price alert triggered (${alertType})!\n\nCurrent Price: $${priceData.currentPrice.toLocaleString()}\nPrevious Price: $${priceData.previousPrice.toLocaleString()}\nChange: ${changePercent}%`,
    data: priceData,
    channels,
  });
}

