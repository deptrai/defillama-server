/**
 * Alert History E2E Tests
 * Story: 1.1.5 - View Whale Alert History
 */

import { getAlertsDBConnection } from '../../../common/utils/db';
import { alertHistoryService } from '../../services/alert-history.service';
import { whaleAlertService } from '../../services/whale-alert.service';

describe('Alert History E2E', () => {
  const db = getAlertsDBConnection();
  const testUserId = 'test-user-history-e2e';
  let testRuleId: string;
  let testHistoryIds: string[] = [];

  beforeAll(async () => {
    // Create test whale alert rule
    const rule = await whaleAlertService.createWhaleAlertRule(testUserId, {
      name: 'Test Whale Alert for History',
      description: 'Test alert for history E2E tests',
      type: 'whale',
      conditions: {
        min_amount_usd: 1000000,
        tokens: ['ETH', 'USDT'],
        chains: ['ethereum', 'arbitrum'],
      },
      actions: {
        channels: ['email', 'telegram'],
      },
      enabled: true,
      throttle_minutes: 5,
    });
    testRuleId = rule.id;
    console.log('Created test rule:', testRuleId);

    // Create test alert history entries
    const histories = await Promise.all([
      // Whale alert - Ethereum - ETH
      alertHistoryService.createAlertHistory({
        rule_id: testRuleId,
        user_id: testUserId,
        event_data: {
          chain: 'ethereum',
          token: 'ETH',
          amount_usd: 1500000,
          from: '0x123...',
          to: '0x456...',
          tx_hash: '0xabc...',
        },
        notification_channels: ['email', 'telegram'],
        notification_status: 'sent',
        delivery_status: { email: 'sent', telegram: 'sent' },
      }),
      // Whale alert - Arbitrum - USDT
      alertHistoryService.createAlertHistory({
        rule_id: testRuleId,
        user_id: testUserId,
        event_data: {
          chain: 'arbitrum',
          token: 'USDT',
          amount_usd: 2000000,
          from: '0x789...',
          to: '0xdef...',
          tx_hash: '0xghi...',
        },
        notification_channels: ['email'],
        notification_status: 'sent',
        delivery_status: { email: 'sent' },
      }),
      // Whale alert - Ethereum - USDT (failed notification)
      alertHistoryService.createAlertHistory({
        rule_id: testRuleId,
        user_id: testUserId,
        event_data: {
          chain: 'ethereum',
          token: 'USDT',
          amount_usd: 3000000,
          from: '0xjkl...',
          to: '0xmno...',
          tx_hash: '0xpqr...',
        },
        notification_channels: ['email', 'telegram'],
        notification_status: 'failed',
        delivery_status: { email: 'failed', telegram: 'failed' },
        notification_error: 'Network error',
      }),
    ]);

    testHistoryIds = histories.map(h => h.id);
    console.log('Created test histories:', testHistoryIds.length, 'entries');

    // Verify data was inserted
    const verify = await db`SELECT COUNT(*) as count FROM alert_history WHERE user_id = ${testUserId}`;
    console.log('Verified alert_history count:', verify[0].count);
  });

  afterAll(async () => {
    // Clean up test data
    await db`DELETE FROM alert_history WHERE user_id = ${testUserId}`;
    await db`DELETE FROM alert_rules WHERE user_id = ${testUserId}`;

    // Close database connection
    await db.end({ timeout: 2 });
  });

  describe('GET /v2/premium/alerts/history', () => {
    beforeEach(async () => {
      // Verify test data exists
      const [{ count }] = await db`SELECT COUNT(*) as count FROM alert_history WHERE user_id = ${testUserId}`;
      if (parseInt(count) === 0) {
        throw new Error('Test data not found! beforeAll() may have failed.');
      }
    });

    it('should get all alert history for user', async () => {
      const result = await alertHistoryService.getAlertHistory(testUserId);

      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.per_page).toBe(50);
    });

    it('should filter by chain', async () => {
      // Try different JSONB query approaches
      const chainFilter = JSON.stringify({ chain: 'ethereum' });
      const approach1 = await db`
        SELECT COUNT(*) as count
        FROM alert_history ah
        WHERE ah.user_id = ${testUserId}
          AND ah.event_data @> ${chainFilter}::jsonb
      `;
      console.log('Approach 1 (@> operator):', approach1[0].count);

      const approach2 = await db.unsafe(`
        SELECT COUNT(*) as count
        FROM alert_history ah
        WHERE ah.user_id = $1
          AND ah.event_data->>'chain' = $2
      `, [testUserId, 'ethereum']);
      console.log('Approach 2 (unsafe with params):', approach2[0].count);

      const result = await alertHistoryService.getAlertHistory(testUserId, {
        chain: 'ethereum',
      });
      console.log('Service result:', result.data.length);

      expect(result.data).toHaveLength(2);
      result.data.forEach(entry => {
        expect(entry.event_data.chain).toBe('ethereum');
      });
    });

    it('should filter by token', async () => {
      const result = await alertHistoryService.getAlertHistory(testUserId, {
        token: 'USDT',
      });

      expect(result.data).toHaveLength(2);
      result.data.forEach(entry => {
        expect(entry.event_data.token).toBe('USDT');
      });
    });

    it('should filter by alert_type', async () => {
      const result = await alertHistoryService.getAlertHistory(testUserId, {
        alert_type: 'whale',
      });

      expect(result.data).toHaveLength(3);
      result.data.forEach(entry => {
        expect(entry.alert_type).toBe('whale');
      });
    });

    it('should sort by date descending (default)', async () => {
      const result = await alertHistoryService.getAlertHistory(testUserId, {
        sort_by: 'date',
        sort_order: 'desc',
      });

      expect(result.data).toHaveLength(3);
      // Most recent first
      for (let i = 0; i < result.data.length - 1; i++) {
        expect(result.data[i].triggered_at.getTime()).toBeGreaterThanOrEqual(
          result.data[i + 1].triggered_at.getTime()
        );
      }
    });

    it('should sort by amount descending', async () => {
      const result = await alertHistoryService.getAlertHistory(testUserId, {
        sort_by: 'amount',
        sort_order: 'desc',
      });

      expect(result.data).toHaveLength(3);
      // Highest amount first
      expect(result.data[0].event_data.amount_usd).toBe(3000000);
      expect(result.data[1].event_data.amount_usd).toBe(2000000);
      expect(result.data[2].event_data.amount_usd).toBe(1500000);
    });

    it('should paginate results', async () => {
      const page1 = await alertHistoryService.getAlertHistory(testUserId, {
        page: 1,
        per_page: 2,
      });

      expect(page1.data).toHaveLength(2);
      expect(page1.pagination.total).toBe(3);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.per_page).toBe(2);
      expect(page1.pagination.total_pages).toBe(2);

      const page2 = await alertHistoryService.getAlertHistory(testUserId, {
        page: 2,
        per_page: 2,
      });

      expect(page2.data).toHaveLength(1);
      expect(page2.pagination.page).toBe(2);
    });

    it('should export as CSV', async () => {
      const csv = await alertHistoryService.exportAlertHistory(testUserId, 'csv');

      expect(csv).toContain('id,rule_name,alert_type,chain,token,amount_usd');
      expect(csv).toContain('ethereum');
      expect(csv).toContain('ETH');
      expect(csv).toContain('1500000');
    });

    it('should export as JSON', async () => {
      const json = await alertHistoryService.exportAlertHistory(testUserId, 'json');
      const data = JSON.parse(json);

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(3);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('event_data');
    });
  });

  describe('GET /v2/premium/alerts/history/{id}', () => {
    it('should get single alert history entry', async () => {
      const entry = await alertHistoryService.getAlertHistoryById(testUserId, testHistoryIds[0]);

      expect(entry).toBeDefined();
      expect(entry?.id).toBe(testHistoryIds[0]);
      expect(entry?.user_id).toBe(testUserId);
      expect(entry?.rule_id).toBe(testRuleId);
    });

    it('should return null if not found', async () => {
      const entry = await alertHistoryService.getAlertHistoryById(testUserId, 'non-existent-id');

      expect(entry).toBeNull();
    });

    it('should verify user ownership', async () => {
      const entry = await alertHistoryService.getAlertHistoryById('other-user', testHistoryIds[0]);

      expect(entry).toBeNull();
    });
  });

  describe('Alert History Creation', () => {
    it('should create alert history with notification status', async () => {
      const entry = await alertHistoryService.createAlertHistory({
        rule_id: testRuleId,
        user_id: testUserId,
        event_data: {
          chain: 'polygon',
          token: 'MATIC',
          amount_usd: 500000,
          from: '0xstu...',
          to: '0xvwx...',
          tx_hash: '0xyz...',
        },
        notification_channels: ['email'],
        notification_status: 'sent',
        delivery_status: { email: 'sent' },
      });

      expect(entry).toBeDefined();
      expect(entry.notification_status).toBe('sent');
      expect(entry.notification_channels).toEqual(['email']);
      expect(entry.delivery_status).toEqual({ email: 'sent' });
      expect(entry.notified_at).toBeDefined();

      // Clean up
      await db`DELETE FROM alert_history WHERE id = ${entry.id}`;
    });

    it('should create alert history with failed notification', async () => {
      const entry = await alertHistoryService.createAlertHistory({
        rule_id: testRuleId,
        user_id: testUserId,
        event_data: {
          chain: 'bsc',
          token: 'BNB',
          amount_usd: 750000,
          from: '0xaaa...',
          to: '0xbbb...',
          tx_hash: '0xccc...',
        },
        notification_channels: ['telegram'],
        notification_status: 'failed',
        delivery_status: { telegram: 'failed' },
        notification_error: 'Telegram API error',
      });

      expect(entry).toBeDefined();
      expect(entry.notification_status).toBe('failed');
      expect(entry.notification_error).toBe('Telegram API error');

      // Clean up
      await db`DELETE FROM alert_history WHERE id = ${entry.id}`;
    });
  });
});

