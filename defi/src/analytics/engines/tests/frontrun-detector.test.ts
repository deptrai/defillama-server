/**
 * Frontrun Detector Tests
 * Story: 4.1.1 - MEV Opportunity Detection
 * 
 * Test coverage:
 * - High-value target identification
 * - Gas price premium detection
 * - Price impact estimation
 * - Timing advantage verification
 * - Profit calculation
 * - Confidence scoring
 * - Database storage
 */

import { FrontrunDetector } from '../frontrun-detector';
import { FrontrunTransaction } from '../mev-types';
import { query } from '../../db/connection';

// Mock dependencies
jest.mock('../../db/connection');
jest.mock('../../services/blockchain-data-service');

describe('FrontrunDetector', () => {
  let detector: FrontrunDetector;

  beforeEach(() => {
    detector = FrontrunDetector.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = FrontrunDetector.getInstance();
      const instance2 = FrontrunDetector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('detectFrontrunning', () => {
    it('should detect valid frontrun attack', async () => {
      const results = await detector.detectFrontrunning('ethereum');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      
      const result = results[0];
      expect(result.detected).toBe(true);
      expect(result.confidence_score).toBeGreaterThanOrEqual(75);
      expect(result.opportunity).toBeDefined();
      expect(result.opportunity?.opportunity_type).toBe('frontrun');
    });

    it('should have correct evidence flags', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const result = results[0];
      expect(result.evidence.high_value_target).toBe(true);
      expect(result.evidence.significant_price_impact).toBe(true);
      expect(result.evidence.gas_price_premium).toBe(true);
      expect(result.evidence.timing_advantage).toBe(true);
      expect(result.evidence.profit_threshold_met).toBe(true);
    });

    it('should calculate profit correctly', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.mev_profit_usd).toBeGreaterThan(0);
      expect(opportunity?.net_profit_usd).toBeLessThan(opportunity?.mev_profit_usd);
      expect(opportunity?.gas_cost_usd).toBeGreaterThan(0);
    });

    it('should store opportunity in database', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'test-id' }] });

      await detector.detectFrontrunning('ethereum');

      expect(query).toHaveBeenCalled();
      const call = (query as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('INSERT INTO mev_opportunities');
    });

    it('should filter by minimum confidence score', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        expect(result.confidence_score).toBeGreaterThanOrEqual(75);
      });
    });

    it('should include all required opportunity fields', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity).toMatchObject({
        opportunity_type: 'frontrun',
        chain_id: expect.any(String),
        block_number: expect.any(Number),
        timestamp: expect.any(Date),
        target_tx_hash: expect.any(String),
        mev_tx_hashes: expect.any(Array),
        token_addresses: expect.any(Array),
        mev_profit_usd: expect.any(Number),
        bot_address: expect.any(String),
        detection_method: 'price_impact_estimation',
        confidence_score: expect.any(Number),
        status: 'detected',
      });
    });

    it('should include frontrun-specific fields', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity).toHaveProperty('frontrun_tx');
      expect(opportunity).toHaveProperty('target_tx');
      expect(opportunity).toHaveProperty('price_impact_pct');
      expect(opportunity).toHaveProperty('frontrun_profit_usd');
      expect(opportunity).toHaveProperty('target_value_usd');
    });
  });

  describe('High-Value Target Identification', () => {
    it('should identify targets with value >= $10,000', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        const targetValue = result.opportunity?.target_value_usd || 0;
        expect(targetValue).toBeGreaterThanOrEqual(10000);
      });
    });

    it('should identify targets with price impact >= 1%', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        const priceImpact = result.opportunity?.price_impact_pct || 0;
        expect(priceImpact).toBeGreaterThanOrEqual(1.0);
      });
    });

    it('should verify target transaction details', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const target = results[0].opportunity?.target_tx;
      expect(target).toBeDefined();
      expect(target?.amount).toBeGreaterThan(0);
      expect(target?.price).toBeGreaterThan(0);
      expect(target?.estimated_price_impact).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe('Gas Price Premium Detection', () => {
    it('should detect frontrunners with 20%+ higher gas price', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        const frontrunGas = result.opportunity?.frontrun_tx?.gas_price || 0;
        const targetGas = result.opportunity?.target_tx?.gas_price || 0;
        expect(frontrunGas).toBeGreaterThanOrEqual(targetGas * 1.2);
      });
    });

    it('should verify gas price ordering', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.frontrun_tx?.gas_price).toBeGreaterThan(
        opportunity?.target_tx?.gas_price || 0
      );
    });

    it('should calculate gas costs correctly', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.gas_cost_usd).toBeGreaterThan(0);
      expect(opportunity?.gas_cost_usd).toBeLessThan(opportunity?.mev_profit_usd || 0);
    });
  });

  describe('Price Impact Estimation', () => {
    it('should estimate price impact for target', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.price_impact_pct).toBeGreaterThan(0);
    });

    it('should calculate profit from price impact', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.frontrun_profit_usd).toBeGreaterThan(0);
    });

    it('should verify significant price impact threshold', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        expect(result.evidence.significant_price_impact).toBe(true);
      });
    });
  });

  describe('Timing Advantage Verification', () => {
    it('should verify frontrun before target', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        const frontrunTime = result.opportunity?.frontrun_tx?.timestamp.getTime() || 0;
        const targetTime = result.opportunity?.target_tx?.timestamp.getTime() || 0;
        expect(frontrunTime).toBeLessThan(targetTime);
      });
    });

    it('should verify timing within 30 seconds', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        const frontrunTime = result.opportunity?.frontrun_tx?.timestamp.getTime() || 0;
        const targetTime = result.opportunity?.target_tx?.timestamp.getTime() || 0;
        const timeDiff = (targetTime - frontrunTime) / 1000;
        expect(timeDiff).toBeLessThanOrEqual(30);
      });
    });

    it('should verify timing advantage evidence', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        expect(result.evidence.timing_advantage).toBe(true);
      });
    });
  });

  describe('Confidence Scoring', () => {
    it('should score high-value target (25 points)', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      expect(results[0].confidence_score).toBeGreaterThanOrEqual(25);
    });

    it('should score significant price impact (25 points)', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      expect(results[0].confidence_score).toBeGreaterThanOrEqual(50);
    });

    it('should score gas price premium (20 points)', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      expect(results[0].confidence_score).toBeGreaterThanOrEqual(70);
    });

    it('should score timing advantage (15 points)', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      expect(results[0].confidence_score).toBeGreaterThanOrEqual(85);
    });

    it('should score profit threshold (15 points)', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      expect(results[0].confidence_score).toBeGreaterThanOrEqual(90);
    });

    it('should cap confidence score at 100', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      results.forEach(result => {
        expect(result.confidence_score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Profit Calculation', () => {
    it('should calculate gross profit from price impact', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.mev_profit_usd).toBeGreaterThan(0);
    });

    it('should subtract gas costs from gross profit', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const opportunity = results[0].opportunity;
      const expectedNet = (opportunity?.mev_profit_usd || 0) - (opportunity?.gas_cost_usd || 0);
      expect(opportunity?.net_profit_usd).toBeCloseTo(expectedNet, 2);
    });

    it('should estimate victim loss', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.victim_loss_usd).toBeGreaterThan(0);
      expect(opportunity?.victim_loss_usd).toBeLessThanOrEqual(
        opportunity?.mev_profit_usd || 0
      );
    });

    it('should filter by minimum profit threshold', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        expect(result.opportunity?.mev_profit_usd).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('Database Integration', () => {
    it('should insert with correct SQL structure', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'test-id' }] });

      await detector.detectFrontrunning('ethereum');

      const call = (query as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('INSERT INTO mev_opportunities');
      expect(call[0]).toContain('opportunity_type');
      expect(call[0]).toContain('detection_method');
    });

    it('should pass correct values', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'test-id' }] });

      await detector.detectFrontrunning('ethereum');

      const call = (query as jest.Mock).mock.calls[0];
      const values = call[1];
      
      expect(values[0]).toBe('frontrun'); // opportunity_type
      expect(values[1]).toBe('ethereum'); // chain_id
      expect(values[18]).toBe('price_impact_estimation'); // detection_method
    });

    it('should handle database errors gracefully', async () => {
      (query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(detector.detectFrontrunning('ethereum')).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should filter same wallet transactions', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        expect(result.opportunity?.frontrun_tx?.wallet_address).not.toBe(
          result.opportunity?.target_tx?.wallet_address
        );
      });
    });

    it('should filter different token transactions', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        expect(result.opportunity?.frontrun_tx?.token_address).toBe(
          result.opportunity?.target_tx?.token_address
        );
      });
    });

    it('should filter low gas price transactions', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        const frontrunGas = result.opportunity?.frontrun_tx?.gas_price || 0;
        const targetGas = result.opportunity?.target_tx?.gas_price || 0;
        expect(frontrunGas).toBeGreaterThanOrEqual(targetGas * 1.2);
      });
    });

    it('should filter transactions outside timeframe', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        const frontrunTime = result.opportunity?.frontrun_tx?.timestamp.getTime() || 0;
        const targetTime = result.opportunity?.target_tx?.timestamp.getTime() || 0;
        const timeDiff = (targetTime - frontrunTime) / 1000;
        expect(timeDiff).toBeLessThanOrEqual(30);
      });
    });

    it('should filter low-value targets', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        expect(result.opportunity?.target_value_usd).toBeGreaterThanOrEqual(10000);
      });
    });

    it('should filter low price impact targets', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      results.forEach(result => {
        expect(result.opportunity?.price_impact_pct).toBeGreaterThanOrEqual(1.0);
      });
    });
  });

  describe('Performance', () => {
    it('should complete detection in reasonable time', async () => {
      const startTime = Date.now();
      await detector.detectFrontrunning('ethereum');
      const endTime = Date.now();
      
      const detectionTime = endTime - startTime;
      expect(detectionTime).toBeLessThan(5000); // < 5 seconds
    });

    it('should handle multiple opportunities efficiently', async () => {
      const results = await detector.detectFrontrunning('ethereum');
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

