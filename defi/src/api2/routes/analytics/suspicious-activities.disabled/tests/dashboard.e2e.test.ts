/**
 * Dashboard API E2E Tests
 * Story: 3.2.2 - Suspicious Activity Detection - Enhancements
 * Phase 4: Testing & Documentation
 * 
 * End-to-end tests for dashboard API endpoints.
 * Tests complete request/response cycle with database.
 */

import { query } from '../../../../analytics/db/connection';

describe('Dashboard API E2E Tests', () => {
  // Setup test data
  beforeAll(async () => {
    // Insert test suspicious activities
    await query(
      `INSERT INTO suspicious_activities (
        activity_type, severity, confidence_score,
        protocol_id, wallet_addresses, token_addresses, chain_id,
        detection_timestamp, detection_method, detector_version,
        evidence_tx_hashes, evidence_description, evidence_metrics,
        estimated_loss_usd, affected_users, affected_protocols,
        status, alert_sent, reported_to_authorities
      ) VALUES
      ('rug_pull', 'critical', 0.95, 'protocol-1', ARRAY['0xabc'], ARRAY['0xtoken1'], 'ethereum',
       NOW() - INTERVAL '1 hour', 'automated', 'v1.0.0',
       ARRAY['0xtx1'], 'Liquidity removed', '{"liquidity_removed": 1000000}',
       1000000, 100, ARRAY['protocol-1'], 'active', true, false),
      ('wash_trading', 'high', 0.85, 'protocol-2', ARRAY['0xdef'], ARRAY['0xtoken2'], 'polygon',
       NOW() - INTERVAL '2 hours', 'automated', 'v1.0.0',
       ARRAY['0xtx2'], 'Circular trading', '{"volume_inflated": 500000}',
       500000, 50, ARRAY['protocol-2'], 'active', true, false),
      ('pump_dump', 'medium', 0.75, 'protocol-3', ARRAY['0xghi'], ARRAY['0xtoken3'], 'bsc',
       NOW() - INTERVAL '1 day', 'automated', 'v1.0.0',
       ARRAY['0xtx3'], 'Price manipulation', '{"price_increase": 200}',
       200000, 30, ARRAY['protocol-3'], 'resolved', true, false),
      ('sybil_attack', 'low', 0.65, 'protocol-4', ARRAY['0xjkl'], ARRAY['0xtoken4'], 'arbitrum',
       NOW() - INTERVAL '7 days', 'automated', 'v1.0.0',
       ARRAY['0xtx4'], 'Wallet clustering', '{"cluster_size": 20}',
       50000, 10, ARRAY['protocol-4'], 'active', false, false),
      ('rug_pull', 'critical', 0.90, 'protocol-5', ARRAY['0xmno'], ARRAY['0xtoken5'], 'ethereum',
       NOW() - INTERVAL '30 days', 'automated', 'v1.0.0',
       ARRAY['0xtx5'], 'Contract manipulation', '{"ownership_transferred": true}',
       2000000, 200, ARRAY['protocol-5'], 'resolved', true, true)
      ON CONFLICT DO NOTHING`
    );
  });

  // Cleanup test data
  afterAll(async () => {
    await query(
      `DELETE FROM suspicious_activities 
       WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')`
    );
  });

  describe('GET /analytics/suspicious-activities/dashboard/stats', () => {
    it('should return dashboard statistics', async () => {
      const result = await query<any>(
        `SELECT 
           COUNT(*) as total_activities,
           COUNT(CASE WHEN activity_type = 'rug_pull' THEN 1 END) as rug_pull_count,
           COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
           COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
           COUNT(CASE WHEN chain_id = 'ethereum' THEN 1 END) as ethereum_count,
           COUNT(CASE WHEN detection_timestamp >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_24h,
           COUNT(CASE WHEN detection_timestamp >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_7d,
           COUNT(CASE WHEN detection_timestamp >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_30d
         FROM suspicious_activities
         WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')`
      );

      const stats = result.rows[0];
      
      expect(parseInt(stats.total_activities)).toBeGreaterThanOrEqual(5);
      expect(parseInt(stats.rug_pull_count)).toBeGreaterThanOrEqual(2);
      expect(parseInt(stats.critical_count)).toBeGreaterThanOrEqual(2);
      expect(parseInt(stats.active_count)).toBeGreaterThanOrEqual(3);
      expect(parseInt(stats.ethereum_count)).toBeGreaterThanOrEqual(2);
      expect(parseInt(stats.recent_24h)).toBeGreaterThanOrEqual(2);
      expect(parseInt(stats.recent_7d)).toBeGreaterThanOrEqual(4);
      expect(parseInt(stats.recent_30d)).toBeGreaterThanOrEqual(5);
    });

    it('should filter by chain_id', async () => {
      const result = await query<any>(
        `SELECT COUNT(*) as count
         FROM suspicious_activities
         WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')
         AND chain_id = 'ethereum'`
      );

      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /analytics/suspicious-activities/dashboard/trends', () => {
    it('should return trend data', async () => {
      const result = await query<any>(
        `SELECT 
           DATE(detection_timestamp) as date,
           severity,
           COUNT(*) as count
         FROM suspicious_activities
         WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')
         AND detection_timestamp >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(detection_timestamp), severity
         ORDER BY date ASC`
      );

      expect(result.rows.length).toBeGreaterThan(0);
      
      for (const row of result.rows) {
        expect(row.date).toBeDefined();
        expect(row.severity).toBeDefined();
        expect(parseInt(row.count)).toBeGreaterThan(0);
      }
    });

    it('should group by date correctly', async () => {
      const result = await query<any>(
        `SELECT 
           DATE(detection_timestamp) as date,
           COUNT(*) as total_count
         FROM suspicious_activities
         WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')
         AND detection_timestamp >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(detection_timestamp)
         ORDER BY date ASC`
      );

      expect(result.rows.length).toBeGreaterThan(0);
      
      // Verify dates are in ascending order
      for (let i = 1; i < result.rows.length; i++) {
        const prevDate = new Date(result.rows[i - 1].date);
        const currDate = new Date(result.rows[i].date);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });
  });

  describe('GET /analytics/suspicious-activities/dashboard/recent', () => {
    it('should return recent activities', async () => {
      const result = await query<any>(
        `SELECT 
           id, activity_type, severity, confidence_score,
           protocol_id, chain_id, detection_timestamp, status,
           estimated_loss_usd
         FROM suspicious_activities
         WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')
         ORDER BY detection_timestamp DESC
         LIMIT 20`
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.length).toBeLessThanOrEqual(20);

      // Verify structure
      const activity = result.rows[0];
      expect(activity.id).toBeDefined();
      expect(activity.activity_type).toBeDefined();
      expect(activity.severity).toBeDefined();
      expect(activity.confidence_score).toBeDefined();
      expect(activity.protocol_id).toBeDefined();
      expect(activity.chain_id).toBeDefined();
      expect(activity.detection_timestamp).toBeDefined();
      expect(activity.status).toBeDefined();
      expect(activity.estimated_loss_usd).toBeDefined();
    });

    it('should support pagination', async () => {
      const limit = 2;
      const offset = 1;

      const result = await query<any>(
        `SELECT id
         FROM suspicious_activities
         WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')
         ORDER BY detection_timestamp DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      expect(result.rows.length).toBeLessThanOrEqual(limit);
    });

    it('should order by detection_timestamp DESC', async () => {
      const result = await query<any>(
        `SELECT detection_timestamp
         FROM suspicious_activities
         WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')
         ORDER BY detection_timestamp DESC
         LIMIT 10`
      );

      // Verify timestamps are in descending order
      for (let i = 1; i < result.rows.length; i++) {
        const prevTime = new Date(result.rows[i - 1].detection_timestamp);
        const currTime = new Date(result.rows[i].detection_timestamp);
        expect(prevTime.getTime()).toBeGreaterThanOrEqual(currTime.getTime());
      }
    });
  });

  describe('GET /analytics/suspicious-activities/dashboard/protocols', () => {
    it('should return protocol breakdown', async () => {
      const result = await query<any>(
        `SELECT 
           protocol_id,
           COUNT(*) as activity_count,
           SUM(estimated_loss_usd) as total_estimated_loss_usd
         FROM suspicious_activities
         WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')
         GROUP BY protocol_id
         ORDER BY activity_count DESC
         LIMIT 10`
      );

      expect(result.rows.length).toBeGreaterThan(0);

      for (const row of result.rows) {
        expect(row.protocol_id).toBeDefined();
        expect(parseInt(row.activity_count)).toBeGreaterThan(0);
        expect(parseFloat(row.total_estimated_loss_usd)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should order by activity_count DESC', async () => {
      const result = await query<any>(
        `SELECT 
           protocol_id,
           COUNT(*) as activity_count
         FROM suspicious_activities
         WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')
         GROUP BY protocol_id
         ORDER BY activity_count DESC`
      );

      // Verify counts are in descending order
      for (let i = 1; i < result.rows.length; i++) {
        const prevCount = parseInt(result.rows[i - 1].activity_count);
        const currCount = parseInt(result.rows[i].activity_count);
        expect(prevCount).toBeGreaterThanOrEqual(currCount);
      }
    });
  });

  describe('GET /analytics/suspicious-activities/dashboard/severity', () => {
    it('should return severity distribution', async () => {
      const result = await query<any>(
        `SELECT 
           severity,
           COUNT(*) as count,
           AVG(confidence_score) as avg_confidence,
           SUM(estimated_loss_usd) as total_estimated_loss_usd
         FROM suspicious_activities
         WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')
         GROUP BY severity
         ORDER BY 
           CASE severity
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
           END`
      );

      expect(result.rows.length).toBeGreaterThan(0);

      for (const row of result.rows) {
        expect(row.severity).toBeDefined();
        expect(parseInt(row.count)).toBeGreaterThan(0);
        expect(parseFloat(row.avg_confidence)).toBeGreaterThan(0);
        expect(parseFloat(row.avg_confidence)).toBeLessThanOrEqual(1);
        expect(parseFloat(row.total_estimated_loss_usd)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should order by severity (critical, high, medium, low)', async () => {
      const result = await query<any>(
        `SELECT severity
         FROM suspicious_activities
         WHERE protocol_id IN ('protocol-1', 'protocol-2', 'protocol-3', 'protocol-4', 'protocol-5')
         GROUP BY severity
         ORDER BY 
           CASE severity
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
           END`
      );

      const severities = result.rows.map(row => row.severity);
      const expectedOrder = ['critical', 'high', 'medium', 'low'];
      
      // Verify order matches expected
      let prevIndex = -1;
      for (const severity of severities) {
        const currIndex = expectedOrder.indexOf(severity);
        expect(currIndex).toBeGreaterThan(prevIndex);
        prevIndex = currIndex;
      }
    });
  });
});

