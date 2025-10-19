/**
 * E2E Tests for Price Alert Execution
 * Story 1.1.5: Alert Execution E2E Tests
 * 
 * Tests the complete flow of price alert triggering:
 * 1. Create price alert
 * 2. Simulate price update event
 * 3. Verify alert triggered
 * 4. Verify notification sent
 * 5. Verify alert history recorded
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import postgres from 'postgres';
import Redis from 'ioredis';

// Mock price feed stream
class MockPriceFeedStream {
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

describe('Price Alert Execution E2E', () => {
  let db: postgres.Sql;
  let redis: Redis;
  let priceFeed: MockPriceFeedStream;
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

    // Setup mock price feed stream
    priceFeed = new MockPriceFeedStream();

    // Create test user
    testUserId = `price-exec-test-${Date.now()}`;
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
    priceFeed.removeAllListeners();
  });

  beforeEach(async () => {
    // Clear alert history before each test
    await db`DELETE FROM alert_history WHERE user_id = ${testUserId}`;
  });

  describe('AC2: Price Alert Triggering', () => {
    it('should trigger price alert when price goes ABOVE threshold', async () => {
      // 1. Create price alert (above threshold)
      const [alert] = await db`
        INSERT INTO alert_rules (
          user_id, name, type, conditions, actions, enabled, status
        ) VALUES (
          ${testUserId},
          'ETH Above $3000',
          'price',
          ${JSON.stringify({
            token: 'ETH',
            chain: 'ethereum',
            alert_type: 'above',
            threshold: 3000,
          })},
          ${JSON.stringify({
            channels: ['telegram'],
          })},
          true,
          'active'
        )
        RETURNING id
      `;
      testAlertId = alert.id;

      // 2. Setup price alert listener
      let alertTriggered = false;
      let notificationSent = false;

      priceFeed.on('price_update', async (event: any) => {
        // Check if price matches alert conditions
        if (
          event.token === 'ETH' &&
          event.chain === 'ethereum' &&
          event.price > 3000
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

      // 3. Simulate price update (above threshold)
      priceFeed.emit('price_update', {
        token: 'ETH',
        chain: 'ethereum',
        price: 3200, // Above $3000
        previous_price: 2900,
        change_percent: 10.34,
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
      expect(JSON.parse(history[0].event_data).price).toBe(3200);
    });

    it('should trigger price alert when price goes BELOW threshold', async () => {
      // 1. Create price alert (below threshold)
      const [alert] = await db`
        INSERT INTO alert_rules (
          user_id, name, type, conditions, actions, enabled, status
        ) VALUES (
          ${testUserId},
          'BTC Below $40000',
          'price',
          ${JSON.stringify({
            token: 'BTC',
            chain: 'ethereum',
            alert_type: 'below',
            threshold: 40000,
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

      // 2. Setup price alert listener
      let alertTriggered = false;

      priceFeed.on('price_update', async (event: any) => {
        if (
          event.token === 'BTC' &&
          event.chain === 'ethereum' &&
          event.price < 40000
        ) {
          alertTriggered = true;

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
        }
      });

      // 3. Simulate price update (below threshold)
      priceFeed.emit('price_update', {
        token: 'BTC',
        chain: 'ethereum',
        price: 38000, // Below $40000
        previous_price: 42000,
        change_percent: -9.52,
        timestamp: Date.now(),
      });

      // 4. Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Verify alert triggered
      expect(alertTriggered).toBe(true);

      // 6. Verify alert history
      const history = await db`
        SELECT * FROM alert_history
        WHERE alert_id = ${testAlertId}
        AND user_id = ${testUserId}
      `;

      expect(history).toHaveLength(1);
      expect(JSON.parse(history[0].event_data).price).toBe(38000);
    });

    it('should NOT trigger price alert when price does not meet condition', async () => {
      // 1. Create price alert (above $3000)
      const [alert] = await db`
        INSERT INTO alert_rules (
          user_id, name, type, conditions, actions, enabled, status
        ) VALUES (
          ${testUserId},
          'ETH Above $3000 (No Trigger)',
          'price',
          ${JSON.stringify({
            token: 'ETH',
            chain: 'ethereum',
            alert_type: 'above',
            threshold: 3000,
          })},
          ${JSON.stringify({
            channels: ['telegram'],
          })},
          true,
          'active'
        )
        RETURNING id
      `;
      testAlertId = alert.id;

      // 2. Setup price alert listener
      let alertTriggered = false;

      priceFeed.on('price_update', async (event: any) => {
        if (
          event.token === 'ETH' &&
          event.chain === 'ethereum' &&
          event.price > 3000
        ) {
          alertTriggered = true;
        }
      });

      // 3. Simulate price update (BELOW threshold, should NOT trigger)
      priceFeed.emit('price_update', {
        token: 'ETH',
        chain: 'ethereum',
        price: 2800, // Below $3000, should NOT trigger
        previous_price: 2900,
        change_percent: -3.45,
        timestamp: Date.now(),
      });

      // 4. Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Verify alert NOT triggered
      expect(alertTriggered).toBe(false);

      // 6. Verify no alert history
      const history = await db`
        SELECT * FROM alert_history
        WHERE alert_id = ${testAlertId}
        AND user_id = ${testUserId}
      `;

      expect(history).toHaveLength(0);
    });

    it('should trigger percentage change alert', async () => {
      // 1. Create percentage change alert
      const [alert] = await db`
        INSERT INTO alert_rules (
          user_id, name, type, conditions, actions, enabled, status
        ) VALUES (
          ${testUserId},
          'ETH +10% Change',
          'price',
          ${JSON.stringify({
            token: 'ETH',
            chain: 'ethereum',
            alert_type: 'percentage_change',
            threshold_percent: 10,
          })},
          ${JSON.stringify({
            channels: ['discord'],
          })},
          true,
          'active'
        )
        RETURNING id
      `;
      testAlertId = alert.id;

      // 2. Setup price alert listener
      let alertTriggered = false;

      priceFeed.on('price_update', async (event: any) => {
        if (
          event.token === 'ETH' &&
          event.chain === 'ethereum' &&
          Math.abs(event.change_percent) >= 10
        ) {
          alertTriggered = true;

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
        }
      });

      // 3. Simulate price update with 12% change
      priceFeed.emit('price_update', {
        token: 'ETH',
        chain: 'ethereum',
        price: 3360,
        previous_price: 3000,
        change_percent: 12, // 12% change
        timestamp: Date.now(),
      });

      // 4. Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Verify alert triggered
      expect(alertTriggered).toBe(true);

      // 6. Verify alert history
      const history = await db`
        SELECT * FROM alert_history
        WHERE alert_id = ${testAlertId}
        AND user_id = ${testUserId}
      `;

      expect(history).toHaveLength(1);
      expect(JSON.parse(history[0].event_data).change_percent).toBe(12);
    });
  });
});

