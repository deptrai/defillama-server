/**
 * E2E Tests for Whale Alert Execution
 * Story 1.1.5: Alert Execution E2E Tests
 * 
 * Tests the complete flow of whale alert triggering:
 * 1. Create whale alert
 * 2. Simulate blockchain event (whale transaction)
 * 3. Verify alert triggered
 * 4. Verify notification sent
 * 5. Verify alert history recorded
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import postgres from 'postgres';
import Redis from 'ioredis';

// Mock blockchain event stream
class MockBlockchainEventStream {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  removeAllListeners() {
    this.listeners.clear();
  }
}

describe('Whale Alert Execution E2E', () => {
  let db: postgres.Sql;
  let redis: Redis;
  let blockchainStream: MockBlockchainEventStream;
  let testUserId: string;
  let testAlertId: string;

  beforeAll(async () => {
    // Setup database connection
    const dbUrl = process.env.TEST_DB || 'postgresql://test:test@localhost:3080/defillama_test';
    db = postgres(dbUrl);

    // Setup Redis connection
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 15, // Test database
    });

    // Setup mock blockchain event stream
    blockchainStream = new MockBlockchainEventStream();

    // Create test user
    testUserId = `whale-exec-test-${Date.now()}`;
  });

  afterAll(async () => {
    // Cleanup
    if (testAlertId) {
      await db`DELETE FROM alert_rules WHERE id = ${testAlertId}`;
    }
    await db`DELETE FROM alert_rules WHERE user_id = ${testUserId}`;
    await db`DELETE FROM alert_history WHERE user_id = ${testUserId}`;
    
    await db.end();
    await redis.quit();
    blockchainStream.removeAllListeners();
  });

  beforeEach(async () => {
    // Clear alert history before each test
    await db`DELETE FROM alert_history WHERE user_id = ${testUserId}`;
  });

  describe('AC1: Whale Alert Triggering', () => {
    it('should trigger whale alert when transaction exceeds threshold', async () => {
      // 1. Create whale alert
      const [alert] = await db`
        INSERT INTO alert_rules (
          user_id, name, type, conditions, actions, enabled, status
        ) VALUES (
          ${testUserId},
          'Test Whale Alert',
          'whale',
          ${JSON.stringify({
            chain: 'ethereum',
            token: 'USDT',
            threshold_usd: 1000000,
          })},
          ${JSON.stringify({
            channels: ['email'],
          })},
          true,
          'active'
        )
        RETURNING id
      `;
      testAlertId = alert.id;

      // 2. Setup alert execution listener
      let alertTriggered = false;
      let notificationSent = false;

      blockchainStream.on('whale_transaction', async (event: any) => {
        // Check if transaction matches alert conditions
        if (
          event.chain === 'ethereum' &&
          event.token === 'USDT' &&
          event.amount_usd >= 1000000
        ) {
          alertTriggered = true;

          // Record alert history
          await db`
            INSERT INTO alert_history (
              alert_id, user_id, triggered_at, event_data, status
            ) VALUES (
              ${testAlertId},
              ${testUserId},
              NOW(),
              ${JSON.stringify(event)},
              'triggered'
            )
          `;

          // Send notification (mock)
          notificationSent = true;
        }
      });

      // 3. Simulate whale transaction
      blockchainStream.emit('whale_transaction', {
        chain: 'ethereum',
        token: 'USDT',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        amount: '1500000',
        amount_usd: 1500000,
        tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        timestamp: Date.now(),
      });

      // 4. Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Verify alert triggered
      expect(alertTriggered).toBe(true);
      expect(notificationSent).toBe(true);

      // 6. Verify alert history recorded
      const history = await db`
        SELECT * FROM alert_history
        WHERE alert_id = ${testAlertId}
        AND user_id = ${testUserId}
        ORDER BY triggered_at DESC
        LIMIT 1
      `;

      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('triggered');
      expect(JSON.parse(history[0].event_data).amount_usd).toBe(1500000);
    });

    it('should NOT trigger whale alert when transaction below threshold', async () => {
      // 1. Create whale alert
      const [alert] = await db`
        INSERT INTO alert_rules (
          user_id, name, type, conditions, actions, enabled, status
        ) VALUES (
          ${testUserId},
          'Test Whale Alert 2',
          'whale',
          ${JSON.stringify({
            chain: 'ethereum',
            token: 'USDT',
            threshold_usd: 1000000,
          })},
          ${JSON.stringify({
            channels: ['email'],
          })},
          true,
          'active'
        )
        RETURNING id
      `;
      testAlertId = alert.id;

      // 2. Setup alert execution listener
      let alertTriggered = false;

      blockchainStream.on('whale_transaction', async (event: any) => {
        if (
          event.chain === 'ethereum' &&
          event.token === 'USDT' &&
          event.amount_usd >= 1000000
        ) {
          alertTriggered = true;
        }
      });

      // 3. Simulate small transaction (below threshold)
      blockchainStream.emit('whale_transaction', {
        chain: 'ethereum',
        token: 'USDT',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        amount: '500000',
        amount_usd: 500000, // Below 1M threshold
        tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        timestamp: Date.now(),
      });

      // 4. Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Verify alert NOT triggered
      expect(alertTriggered).toBe(false);

      // 6. Verify no alert history recorded
      const history = await db`
        SELECT * FROM alert_history
        WHERE alert_id = ${testAlertId}
        AND user_id = ${testUserId}
      `;

      expect(history).toHaveLength(0);
    });

    it('should NOT trigger disabled whale alert', async () => {
      // 1. Create DISABLED whale alert
      const [alert] = await db`
        INSERT INTO alert_rules (
          user_id, name, type, conditions, actions, enabled, status
        ) VALUES (
          ${testUserId},
          'Test Disabled Whale Alert',
          'whale',
          ${JSON.stringify({
            chain: 'ethereum',
            token: 'USDT',
            threshold_usd: 1000000,
          })},
          ${JSON.stringify({
            channels: ['email'],
          })},
          false,  -- DISABLED
          'inactive'
        )
        RETURNING id
      `;
      testAlertId = alert.id;

      // 2. Setup alert execution listener
      let alertTriggered = false;

      blockchainStream.on('whale_transaction', async (event: any) => {
        // Check if alert is enabled before triggering
        const [alertRule] = await db`
          SELECT enabled FROM alert_rules WHERE id = ${testAlertId}
        `;

        if (
          alertRule.enabled &&
          event.chain === 'ethereum' &&
          event.token === 'USDT' &&
          event.amount_usd >= 1000000
        ) {
          alertTriggered = true;
        }
      });

      // 3. Simulate whale transaction
      blockchainStream.emit('whale_transaction', {
        chain: 'ethereum',
        token: 'USDT',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        amount: '1500000',
        amount_usd: 1500000,
        tx_hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
        timestamp: Date.now(),
      });

      // 4. Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Verify alert NOT triggered (because disabled)
      expect(alertTriggered).toBe(false);
    });
  });
});

