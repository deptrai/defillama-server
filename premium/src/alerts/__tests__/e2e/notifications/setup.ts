import { getTelegramMockServer } from '../../../../../tests/mocks/telegram-mock-server';
import { getDiscordMockServer } from '../../../../../tests/mocks/discord-mock-server';
import { getWebhookMockServer } from '../../../../../tests/mocks/webhook-mock-server';
import postgres from 'postgres';

/**
 * E2E Test Setup for Notification Tests
 * 
 * This file sets up the test environment for notification E2E tests:
 * - Mock servers (Telegram, Discord, Webhook)
 * - Test database
 * - Test data
 */

// Mock server instances
let telegramMock: ReturnType<typeof getTelegramMockServer>;
let discordMock: ReturnType<typeof getDiscordMockServer>;
let webhookMock: ReturnType<typeof getWebhookMockServer>;

// Database connection
let sql: ReturnType<typeof postgres>;

// Test configuration
export const TEST_CONFIG = {
  // Mock server ports
  TELEGRAM_MOCK_PORT: 3100,
  DISCORD_MOCK_PORT: 3101,
  WEBHOOK_MOCK_PORT: 3102,
  
  // MailHog configuration
  MAILHOG_SMTP_PORT: 3103,
  MAILHOG_WEB_PORT: 3104,
  MAILHOG_HOST: 'localhost',
  
  // Test database
  TEST_DB_URL: process.env.PREMIUM_DB || process.env.ALERTS_DB || process.env.TEST_DB || 'postgresql://postgres:postgres123@localhost:3080/defillama',
  
  // Test user
  TEST_USER_ID: 'test-user-123',
  TEST_USER_EMAIL: 'test@example.com',
  
  // Test notification channels
  TEST_TELEGRAM_CHAT_ID: '123456789',
  TEST_DISCORD_WEBHOOK_URL: 'http://localhost:3101/api/webhooks/test-webhook/test-token',
  TEST_WEBHOOK_URL: 'http://localhost:3102/webhook/test',
};

/**
 * Setup function - called before all tests
 */
export async function setupNotificationTests(): Promise<void> {
  console.log('Setting up notification E2E tests...');
  
  // 1. Start mock servers
  console.log('Starting mock servers...');
  telegramMock = getTelegramMockServer(TEST_CONFIG.TELEGRAM_MOCK_PORT);
  discordMock = getDiscordMockServer(TEST_CONFIG.DISCORD_MOCK_PORT);
  webhookMock = getWebhookMockServer(TEST_CONFIG.WEBHOOK_MOCK_PORT);
  
  await Promise.all([
    telegramMock.start(),
    discordMock.start(),
    webhookMock.start(),
  ]);
  
  console.log('Mock servers started');
  
  // 2. Connect to test database
  console.log('Connecting to test database...');
  sql = postgres(TEST_CONFIG.TEST_DB_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  
  // 3. Clean database
  console.log('Cleaning test database...');
  await cleanDatabase();
  
  // 4. Seed test data
  console.log('Seeding test data...');
  await seedTestData();
  
  console.log('Notification E2E tests setup complete');
}

/**
 * Teardown function - called after all tests
 */
export async function teardownNotificationTests(): Promise<void> {
  console.log('Tearing down notification E2E tests...');
  
  // 1. Stop mock servers
  console.log('Stopping mock servers...');
  await Promise.all([
    telegramMock.stop(),
    discordMock.stop(),
    webhookMock.stop(),
  ]);
  
  console.log('Mock servers stopped');
  
  // 2. Clean database
  console.log('Cleaning test database...');
  await cleanDatabase();
  
  // 3. Close database connection
  console.log('Closing database connection...');
  await sql.end();
  
  console.log('Notification E2E tests teardown complete');
}

/**
 * Clean database - remove all test data
 */
async function cleanDatabase(): Promise<void> {
  // Delete from alert_rules table (unified table for whale and price alerts)
  await sql`DELETE FROM alert_rules WHERE user_id = ${TEST_CONFIG.TEST_USER_ID}`;

  // Note: notification_channels table doesn't exist yet - notifications are stored in alert_rules.actions
  // Note: subscriptions table is shared, don't delete test user subscription
}

/**
 * Seed test data - create test user and subscription
 */
async function seedTestData(): Promise<void> {
  // Create test subscription (if not exists)
  await sql`
    INSERT INTO subscriptions (user_id, tier, status, created_at, updated_at)
    VALUES (
      ${TEST_CONFIG.TEST_USER_ID},
      'premium',
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING
  `;

  // Note: notification_channels table doesn't exist
  // Notification configs are stored in alert_rules.actions field
  // Each alert has its own notification channels configuration
}

/**
 * Reset mock servers - clear all captured data
 */
export async function resetMockServers(): Promise<void> {
  await Promise.all([
    fetch(`http://localhost:${TEST_CONFIG.TELEGRAM_MOCK_PORT}/messages`, { method: 'DELETE' }),
    fetch(`http://localhost:${TEST_CONFIG.DISCORD_MOCK_PORT}/webhooks`, { method: 'DELETE' }),
    fetch(`http://localhost:${TEST_CONFIG.WEBHOOK_MOCK_PORT}/requests`, { method: 'DELETE' }),
  ]);
}

/**
 * Get mock server instances for assertions
 */
export function getMockServers() {
  return {
    telegram: {
      getMessages: async () => {
        const response = await fetch(`http://localhost:${TEST_CONFIG.TELEGRAM_MOCK_PORT}/messages`);
        const data = await response.json() as any;
        return data.messages || [];
      },
      getMessagesByChatId: async (chatId: string) => {
        const response = await fetch(`http://localhost:${TEST_CONFIG.TELEGRAM_MOCK_PORT}/messages/${chatId}`);
        const data = await response.json() as any;
        return data.messages || [];
      },
      clearMessages: () => telegramMock.clearMessages(),
      sendMessage: (params: any) => telegramMock.sendMessage(params),
    },
    discord: {
      getWebhooks: async () => {
        const response = await fetch(`http://localhost:${TEST_CONFIG.DISCORD_MOCK_PORT}/webhooks`);
        const data = await response.json() as any;
        return data.webhooks || [];
      },
      getWebhooksById: async (id: string) => {
        const response = await fetch(`http://localhost:${TEST_CONFIG.DISCORD_MOCK_PORT}/webhooks/${id}`);
        const data = await response.json() as any;
        return data.webhooks || [];
      },
      clearWebhooks: () => discordMock.clearWebhooks(),
      executeWebhook: (params: any) => discordMock.executeWebhook(params),
    },
    webhook: {
      getRequests: async () => {
        const response = await fetch(`http://localhost:${TEST_CONFIG.WEBHOOK_MOCK_PORT}/requests`);
        const data = await response.json() as any;
        return data.requests || [];
      },
      clearRequests: () => webhookMock.clearRequests(),
    },
  };
}

/**
 * Get database connection for direct queries
 */
export function getDatabase() {
  return sql;
}

/**
 * Wait for notification delivery
 * Mock servers process requests synchronously, but we add a small delay
 * to simulate real-world async behavior
 */
export async function waitForNotification(delayMs: number = 100): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Create test whale alert
 */
export async function createTestWhaleAlert(overrides: any = {}) {
  const alert = {
    user_id: TEST_CONFIG.TEST_USER_ID,
    name: 'Test Whale Alert',
    type: 'whale',
    conditions: {
      chain: 'ethereum',
      token: 'USDT',
      threshold: 1000000,
      ...overrides.conditions,
    },
    actions: {
      channels: overrides.notification_channels || ['email', 'telegram'],
      telegram_chat_id: TEST_CONFIG.TEST_TELEGRAM_CHAT_ID,
      ...overrides.actions,
    },
    enabled: true,
    throttle_minutes: 5,
    ...overrides,
  };

  const [created] = await sql`
    INSERT INTO alert_rules (user_id, name, type, conditions, actions, enabled, throttle_minutes, created_at, updated_at)
    VALUES (
      ${alert.user_id},
      ${alert.name},
      ${alert.type},
      ${JSON.stringify(alert.conditions)},
      ${JSON.stringify(alert.actions)},
      ${alert.enabled},
      ${alert.throttle_minutes},
      NOW(),
      NOW()
    )
    RETURNING *
  `;

  return created;
}

/**
 * Create test price alert
 */
export async function createTestPriceAlert(overrides: any = {}) {
  const alert = {
    user_id: TEST_CONFIG.TEST_USER_ID,
    name: 'Test Price Alert',
    type: 'price',
    conditions: {
      token: 'ETH',
      chain: 'ethereum',
      alert_type: 'above',
      threshold: 2000,
      direction: 'up',
      ...overrides.conditions,
    },
    actions: {
      channels: overrides.notification_channels || ['email', 'discord'],
      discord_webhook_url: TEST_CONFIG.TEST_DISCORD_WEBHOOK_URL,
      telegram_chat_id: TEST_CONFIG.TEST_TELEGRAM_CHAT_ID,
      ...overrides.actions,
    },
    enabled: true,
    throttle_minutes: 5,
    ...overrides,
  };

  const [created] = await sql`
    INSERT INTO alert_rules (user_id, name, type, conditions, actions, enabled, throttle_minutes, created_at, updated_at)
    VALUES (
      ${alert.user_id},
      ${alert.name},
      ${alert.type},
      ${JSON.stringify(alert.conditions)},
      ${JSON.stringify(alert.actions)},
      ${alert.enabled},
      ${alert.throttle_minutes},
      NOW(),
      NOW()
    )
    RETURNING *
  `;

  return created;
}

/**
 * Get alert by ID
 */
export async function getAlertById(alertId: string): Promise<any> {
  const [alert] = await sql`
    SELECT * FROM alert_rules WHERE id = ${alertId}
  `;
  return alert;
}

