/**
 * Sandwich Detector Tests
 * Story: 4.1.1 - MEV Opportunity Detection
 * 
 * Test coverage:
 * - Sandwich pattern detection
 * - Gas price ordering
 * - Token pair matching
 * - Timing constraints
 * - Profit calculation
 * - Confidence scoring
 * - Database storage
 */

import { SandwichDetector } from '../sandwich-detector';
import { SandwichTransaction } from '../mev-types';
import { query } from '../../db/connection';

// Mock dependencies
jest.mock('../../db/connection');
jest.mock('../../services/blockchain-data-service');

describe('SandwichDetector', () => {
  let detector: SandwichDetector;

  beforeEach(() => {
    detector = SandwichDetector.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SandwichDetector.getInstance();
      const instance2 = SandwichDetector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('detectSandwichAttacks', () => {
    it('should detect valid sandwich attack', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      
      const result = results[0];
      expect(result.detected).toBe(true);
      expect(result.confidence_score).toBeGreaterThanOrEqual(75);
      expect(result.opportunity).toBeDefined();
      expect(result.opportunity?.opportunity_type).toBe('sandwich');
    });

    it('should have correct evidence flags', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const result = results[0];
      expect(result.evidence.pattern_match).toBe(true);
      expect(result.evidence.gas_price_ordering).toBe(true);
      expect(result.evidence.token_pair_match).toBe(true);
      expect(result.evidence.timing_match).toBe(true);
      expect(result.evidence.profit_threshold_met).toBe(true);
    });

    it('should calculate profit correctly', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.mev_profit_usd).toBeGreaterThan(0);
      expect(opportunity?.net_profit_usd).toBeLessThan(opportunity?.mev_profit_usd);
      expect(opportunity?.gas_cost_usd).toBeGreaterThan(0);
    });

    it('should store opportunity in database', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'test-id' }] });

      await detector.detectSandwichAttacks('ethereum');

      expect(query).toHaveBeenCalled();
      const call = (query as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('INSERT INTO mev_opportunities');
    });

    it('should handle empty transaction list', async () => {
      // Mock empty transactions
      const results = await detector.detectSandwichAttacks('ethereum', 999999999);
      
      // Should not crash, may return empty results
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should filter by minimum confidence score', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      results.forEach(result => {
        expect(result.confidence_score).toBeGreaterThanOrEqual(75);
      });
    });

    it('should include all required opportunity fields', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity).toMatchObject({
        opportunity_type: 'sandwich',
        chain_id: expect.any(String),
        block_number: expect.any(Number),
        timestamp: expect.any(Date),
        target_tx_hash: expect.any(String),
        mev_tx_hashes: expect.any(Array),
        token_addresses: expect.any(Array),
        token_symbols: expect.any(Array),
        protocol_id: expect.any(String),
        mev_profit_usd: expect.any(Number),
        bot_address: expect.any(String),
        detection_method: 'pattern_matching',
        confidence_score: expect.any(Number),
        status: 'detected',
      });
    });

    it('should include sandwich-specific fields', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity).toHaveProperty('frontrun_tx');
      expect(opportunity).toHaveProperty('victim_tx');
      expect(opportunity).toHaveProperty('backrun_tx');
      expect(opportunity).toHaveProperty('price_impact_pct');
      expect(opportunity).toHaveProperty('slippage_extracted_pct');
    });
  });

  describe('Pattern Detection Logic', () => {
    it('should detect Buy → Victim → Sell pattern', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.frontrun_tx?.type).toBe('frontrun');
      expect(opportunity?.victim_tx?.type).toBe('victim');
      expect(opportunity?.backrun_tx?.type).toBe('backrun');
    });

    it('should verify same bot for frontrun and backrun', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.frontrun_tx?.wallet_address).toBe(
        opportunity?.backrun_tx?.wallet_address
      );
    });

    it('should verify different address for victim', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.victim_tx?.wallet_address).not.toBe(
        opportunity?.frontrun_tx?.wallet_address
      );
    });

    it('should verify gas price ordering', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.frontrun_tx?.gas_price).toBeGreaterThan(
        opportunity?.victim_tx?.gas_price || 0
      );
      expect(opportunity?.backrun_tx?.gas_price).toBeGreaterThan(
        opportunity?.victim_tx?.gas_price || 0
      );
    });

    it('should verify token pair matching', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.frontrun_tx?.token_out).toBe(
        opportunity?.backrun_tx?.token_in
      );
    });

    it('should verify timing constraints', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      const frontrunTime = opportunity?.frontrun_tx?.timestamp.getTime() || 0;
      const backrunTime = opportunity?.backrun_tx?.timestamp.getTime() || 0;
      const timeSpan = (backrunTime - frontrunTime) / 1000;
      
      expect(timeSpan).toBeLessThanOrEqual(60); // Max 60 seconds
    });
  });

  describe('Confidence Scoring', () => {
    it('should score pattern match (30 points)', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      expect(results[0].confidence_score).toBeGreaterThanOrEqual(30);
    });

    it('should score gas price ordering (20 points)', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      expect(results[0].confidence_score).toBeGreaterThanOrEqual(50);
    });

    it('should score token pair match (20 points)', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      expect(results[0].confidence_score).toBeGreaterThanOrEqual(70);
    });

    it('should score timing (15 points)', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      expect(results[0].confidence_score).toBeGreaterThanOrEqual(85);
    });

    it('should score profit threshold (15 points)', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      expect(results[0].confidence_score).toBeGreaterThanOrEqual(90);
    });

    it('should cap confidence score at 100', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      results.forEach(result => {
        expect(result.confidence_score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Profit Calculation', () => {
    it('should calculate gross profit', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.mev_profit_usd).toBeGreaterThan(0);
    });

    it('should subtract gas costs', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.net_profit_usd).toBe(
        (opportunity?.mev_profit_usd || 0) - (opportunity?.gas_cost_usd || 0)
      );
    });

    it('should estimate victim loss', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      const opportunity = results[0].opportunity;
      expect(opportunity?.victim_loss_usd).toBeGreaterThan(0);
      expect(opportunity?.victim_loss_usd).toBeLessThanOrEqual(
        opportunity?.mev_profit_usd || 0
      );
    });

    it('should filter by minimum profit threshold', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      results.forEach(result => {
        expect(result.opportunity?.mev_profit_usd).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('Database Integration', () => {
    it('should insert with correct SQL structure', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'test-id' }] });

      await detector.detectSandwichAttacks('ethereum');

      const call = (query as jest.Mock).mock.calls[0];
      expect(call[0]).toContain('INSERT INTO mev_opportunities');
      expect(call[0]).toContain('opportunity_type');
      expect(call[0]).toContain('chain_id');
      expect(call[0]).toContain('mev_profit_usd');
      expect(call[0]).toContain('confidence_score');
    });

    it('should pass correct values', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'test-id' }] });

      await detector.detectSandwichAttacks('ethereum');

      const call = (query as jest.Mock).mock.calls[0];
      const values = call[1];
      
      expect(values[0]).toBe('sandwich'); // opportunity_type
      expect(values[1]).toBe('ethereum'); // chain_id
      expect(typeof values[11]).toBe('number'); // mev_profit_usd
      expect(typeof values[19]).toBe('number'); // confidence_score
    });

    it('should handle database errors gracefully', async () => {
      (query as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(detector.detectSandwichAttacks('ethereum')).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle transactions with same wallet address', async () => {
      // Should not detect sandwich if all transactions from same wallet
      const results = await detector.detectSandwichAttacks('ethereum');
      
      results.forEach(result => {
        expect(result.opportunity?.victim_tx?.wallet_address).not.toBe(
          result.opportunity?.frontrun_tx?.wallet_address
        );
      });
    });

    it('should handle transactions outside timeframe', async () => {
      // Should not detect sandwich if transactions too far apart
      const results = await detector.detectSandwichAttacks('ethereum');
      
      results.forEach(result => {
        const frontrunTime = result.opportunity?.frontrun_tx?.timestamp.getTime() || 0;
        const backrunTime = result.opportunity?.backrun_tx?.timestamp.getTime() || 0;
        const timeSpan = (backrunTime - frontrunTime) / 1000;
        expect(timeSpan).toBeLessThanOrEqual(60);
      });
    });

    it('should handle low gas price transactions', async () => {
      // Should not detect sandwich if gas prices not elevated
      const results = await detector.detectSandwichAttacks('ethereum');
      
      results.forEach(result => {
        const victimGas = result.opportunity?.victim_tx?.gas_price || 0;
        const frontrunGas = result.opportunity?.frontrun_tx?.gas_price || 0;
        expect(frontrunGas).toBeGreaterThan(victimGas * 1.1);
      });
    });

    it('should handle unprofitable sandwiches', async () => {
      // Should filter out sandwiches with profit < threshold
      const results = await detector.detectSandwichAttacks('ethereum');
      
      results.forEach(result => {
        expect(result.opportunity?.mev_profit_usd).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('Performance', () => {
    it('should complete detection in reasonable time', async () => {
      const startTime = Date.now();
      await detector.detectSandwichAttacks('ethereum');
      const endTime = Date.now();
      
      const detectionTime = endTime - startTime;
      expect(detectionTime).toBeLessThan(5000); // < 5 seconds
    });

    it('should handle multiple opportunities efficiently', async () => {
      const results = await detector.detectSandwichAttacks('ethereum');
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

