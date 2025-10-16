/**
 * Compliance API E2E Tests
 * Story: 3.2.3 - Compliance Monitoring
 * Phase 8: Testing
 */

import request from 'supertest';
import { query } from '../../../../utils/db';

// Mock server setup (adjust based on your actual server setup)
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Compliance API E2E Tests', () => {
  describe('POST /v1/risk/compliance/screen', () => {
    it('should screen wallet with clear result', async () => {
      const response = await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen')
        .send({
          wallet_address: '0x1111111111111111111111111111111111111111',
          chain_id: 'ethereum',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.walletAddress).toBe('0x1111111111111111111111111111111111111111');
      expect(response.body.data.screeningResult).toBe('clear');
      expect(response.body.data.riskLevel).toBe('low');
      expect(response.body.data.riskScore).toBeLessThan(25);
    });

    it('should screen wallet with flagged result', async () => {
      const response = await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen')
        .send({
          wallet_address: '0x1234567890123456789012345678901234567890',
          chain_id: 'ethereum',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.screeningResult).toBe('flagged');
      expect(response.body.data.riskLevel).toBe('critical');
      expect(response.body.data.sanctions.match).toBe(true);
    });

    it('should return 400 if wallet_address is missing', async () => {
      const response = await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen')
        .send({
          chain_id: 'ethereum',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('wallet_address');
    });

    it('should use default chain_id if not provided', async () => {
      const response = await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen')
        .send({
          wallet_address: '0x1111111111111111111111111111111111111111',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should cache screening results', async () => {
      // First request
      const response1 = await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen')
        .send({
          wallet_address: '0x1111111111111111111111111111111111111111',
          chain_id: 'ethereum',
        })
        .expect(200);

      expect(response1.body.cached).toBeUndefined();

      // Second request (should be cached)
      const response2 = await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen')
        .send({
          wallet_address: '0x1111111111111111111111111111111111111111',
          chain_id: 'ethereum',
        })
        .expect(200);

      expect(response2.body.cached).toBe(true);
    });
  });

  describe('POST /v1/risk/compliance/screen/batch', () => {
    it('should batch screen multiple wallets', async () => {
      const response = await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen/batch')
        .send({
          wallet_addresses: [
            '0x1111111111111111111111111111111111111111',
            '0x1234567890123456789012345678901234567890',
            '0x5678901234567890123456789012345678901234',
          ],
          chain_id: 'ethereum',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].screeningResult).toBe('clear');
      expect(response.body.data[1].screeningResult).toBe('flagged');
      expect(response.body.data[2].screeningResult).toBe('review_required');
    });

    it('should return 400 if wallet_addresses is missing', async () => {
      const response = await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen/batch')
        .send({
          chain_id: 'ethereum',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('wallet_addresses');
    });

    it('should return 400 if wallet_addresses is not an array', async () => {
      const response = await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen/batch')
        .send({
          wallet_addresses: '0x1111111111111111111111111111111111111111',
          chain_id: 'ethereum',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('array');
    });

    it('should return 400 if more than 100 addresses', async () => {
      const addresses = Array(101).fill(0).map((_, i) => 
        `0x${i.toString().padStart(40, '0')}`
      );

      const response = await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen/batch')
        .send({
          wallet_addresses: addresses,
          chain_id: 'ethereum',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('100');
    });
  });

  describe('GET /v1/risk/compliance/screenings/:id', () => {
    let screeningId: number;

    beforeAll(async () => {
      // Create a screening first
      const response = await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen')
        .send({
          wallet_address: '0x1111111111111111111111111111111111111111',
          chain_id: 'ethereum',
        });

      screeningId = response.body.data.id;
    });

    it('should get screening by ID', async () => {
      const response = await request(API_BASE_URL)
        .get(`/v1/risk/compliance/screenings/${screeningId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(screeningId);
      expect(response.body.data.wallet_address).toBe('0x1111111111111111111111111111111111111111');
    });

    it('should return 404 if screening not found', async () => {
      const response = await request(API_BASE_URL)
        .get('/v1/risk/compliance/screenings/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should cache screening results', async () => {
      // First request
      const response1 = await request(API_BASE_URL)
        .get(`/v1/risk/compliance/screenings/${screeningId}`)
        .expect(200);

      expect(response1.body.cached).toBeUndefined();

      // Second request (should be cached)
      const response2 = await request(API_BASE_URL)
        .get(`/v1/risk/compliance/screenings/${screeningId}`)
        .expect(200);

      expect(response2.body.cached).toBe(true);
    });
  });

  describe('GET /v1/risk/compliance/screenings', () => {
    beforeAll(async () => {
      // Create multiple screenings
      await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen')
        .send({
          wallet_address: '0x1111111111111111111111111111111111111111',
          chain_id: 'ethereum',
        });

      await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen')
        .send({
          wallet_address: '0x1234567890123456789012345678901234567890',
          chain_id: 'ethereum',
        });
    });

    it('should list all screenings', async () => {
      const response = await request(API_BASE_URL)
        .get('/v1/risk/compliance/screenings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
    });

    it('should filter by wallet_address', async () => {
      const response = await request(API_BASE_URL)
        .get('/v1/risk/compliance/screenings')
        .query({ wallet_address: '0x1111111111111111111111111111111111111111' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((s: any) => 
        s.wallet_address === '0x1111111111111111111111111111111111111111'
      )).toBe(true);
    });

    it('should filter by screening_result', async () => {
      const response = await request(API_BASE_URL)
        .get('/v1/risk/compliance/screenings')
        .query({ screening_result: 'flagged' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((s: any) => 
        s.screening_result === 'flagged'
      )).toBe(true);
    });

    it('should filter by risk_level', async () => {
      const response = await request(API_BASE_URL)
        .get('/v1/risk/compliance/screenings')
        .query({ risk_level: 'critical' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((s: any) => 
        s.risk_level === 'critical'
      )).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(API_BASE_URL)
        .get('/v1/risk/compliance/screenings')
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should complete single screening within 5 seconds', async () => {
      const startTime = Date.now();
      await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen')
        .send({
          wallet_address: '0x1111111111111111111111111111111111111111',
          chain_id: 'ethereum',
        })
        .expect(200);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should complete batch screening within 10 seconds', async () => {
      const addresses = Array(10).fill(0).map((_, i) => 
        `0x${i.toString().padStart(40, '0')}`
      );

      const startTime = Date.now();
      await request(API_BASE_URL)
        .post('/v1/risk/compliance/screen/batch')
        .send({
          wallet_addresses: addresses,
          chain_id: 'ethereum',
        })
        .expect(200);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000);
    });
  });
});

