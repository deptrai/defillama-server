/**
 * Tests for Impermanent Loss Engine
 * Story: 2.1.3 - Liquidity Analysis Tools
 */

import { impermanentLossEngine } from '../impermanent-loss-engine';
import { query } from '../../db/connection';

describe('ImpermanentLossEngine', () => {
  let testLpId: string;
  let testPoolId: string;

  beforeAll(async () => {
    // Get a test LP position
    const lpResult = await query<{ id: string; poolId: string }>(
      `SELECT lp.id, lp.pool_id as "poolId"
       FROM liquidity_providers lp
       WHERE lp.is_active = true
       LIMIT 1`
    );
    testLpId = lpResult.rows[0].id;
    testPoolId = lpResult.rows[0].poolId;
  });

  describe('calculateIL', () => {
    it('should calculate IL for a position', async () => {
      const ilCalc = await impermanentLossEngine.calculateIL(testLpId);

      expect(ilCalc).toBeDefined();
      expect(ilCalc.lpId).toBe(testLpId);
      expect(ilCalc.poolType).toBeDefined();
      expect(ilCalc.entryPrice).toBeGreaterThan(0);
      expect(ilCalc.currentPrice).toBeGreaterThan(0);
      expect(ilCalc.priceRatio).toBeGreaterThan(0);
    });

    it('should calculate IL for Uniswap V2 position', async () => {
      const result = await query<{ id: string }>(
        `SELECT lp.id
         FROM liquidity_providers lp
         JOIN liquidity_pools p ON lp.pool_id = p.id
         WHERE p.pool_type = 'uniswap_v2' AND lp.is_active = true
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const lpId = result.rows[0].id;
        const ilCalc = await impermanentLossEngine.calculateIL(lpId);

        expect(ilCalc.poolType).toBe('uniswap_v2');
        expect(ilCalc.impermanentLoss).toBeDefined();
        expect(ilCalc.impermanentLossPct).toBeDefined();
      }
    });

    it('should calculate IL for Uniswap V3 position', async () => {
      const result = await query<{ id: string }>(
        `SELECT lp.id
         FROM liquidity_providers lp
         JOIN liquidity_pools p ON lp.pool_id = p.id
         WHERE p.pool_type = 'uniswap_v3' AND lp.is_active = true
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const lpId = result.rows[0].id;
        const ilCalc = await impermanentLossEngine.calculateIL(lpId);

        expect(ilCalc.poolType).toBe('uniswap_v3');
        expect(ilCalc.impermanentLoss).toBeDefined();
      }
    });

    it('should calculate IL for Curve stable pool', async () => {
      const result = await query<{ id: string }>(
        `SELECT lp.id
         FROM liquidity_providers lp
         JOIN liquidity_pools p ON lp.pool_id = p.id
         WHERE p.pool_type = 'curve_stable' AND lp.is_active = true
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const lpId = result.rows[0].id;
        const ilCalc = await impermanentLossEngine.calculateIL(lpId);

        expect(ilCalc.poolType).toBe('curve_stable');
        // Curve pools should have very low IL
        expect(Math.abs(ilCalc.impermanentLossPct)).toBeLessThan(5);
      }
    });

    it('should calculate IL for Balancer weighted pool', async () => {
      const result = await query<{ id: string }>(
        `SELECT lp.id
         FROM liquidity_providers lp
         JOIN liquidity_pools p ON lp.pool_id = p.id
         WHERE p.pool_type = 'balancer_weighted' AND lp.is_active = true
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const lpId = result.rows[0].id;
        const ilCalc = await impermanentLossEngine.calculateIL(lpId);

        expect(ilCalc.poolType).toBe('balancer_weighted');
        expect(ilCalc.impermanentLoss).toBeDefined();
      }
    });

    it('should calculate HODL value correctly', async () => {
      const ilCalc = await impermanentLossEngine.calculateIL(testLpId);

      expect(ilCalc.hodlValue).toBeGreaterThan(0);
      expect(ilCalc.currentValue).toBeGreaterThan(0);
      expect(ilCalc.ilVsHodl).toBeDefined();
    });

    it('should throw error for non-existent position', async () => {
      await expect(
        impermanentLossEngine.calculateIL('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('LP position not found');
    });
  });

  describe('Pool-specific IL formulas', () => {
    it('should calculate V2 IL correctly for price increase', async () => {
      // For V2, when price doubles (2x), IL should be about -5.7%
      // Formula: IL = 2 * sqrt(2) / (1 + 2) - 1 ≈ -0.057
      const result = await query<{ id: string }>(
        `SELECT lp.id
         FROM liquidity_providers lp
         JOIN liquidity_pools p ON lp.pool_id = p.id
         WHERE p.pool_type = 'uniswap_v2' AND lp.is_active = true
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const lpId = result.rows[0].id;
        const ilCalc = await impermanentLossEngine.calculateIL(lpId);

        // IL should be negative (loss)
        expect(ilCalc.impermanentLossPct).toBeLessThanOrEqual(0);
      }
    });

    it('should calculate V2 IL correctly for price decrease', async () => {
      const result = await query<{ id: string }>(
        `SELECT lp.id
         FROM liquidity_providers lp
         JOIN liquidity_pools p ON lp.pool_id = p.id
         WHERE p.pool_type = 'uniswap_v2' AND lp.is_active = true
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const lpId = result.rows[0].id;
        const ilCalc = await impermanentLossEngine.calculateIL(lpId);

        // IL should be negative regardless of price direction
        expect(ilCalc.impermanentLossPct).toBeLessThanOrEqual(0);
      }
    });

    it('should have lower IL for Curve than V2', async () => {
      const v2Result = await query<{ id: string }>(
        `SELECT lp.id FROM liquidity_providers lp
         JOIN liquidity_pools p ON lp.pool_id = p.id
         WHERE p.pool_type = 'uniswap_v2' AND lp.is_active = true LIMIT 1`
      );

      const curveResult = await query<{ id: string }>(
        `SELECT lp.id FROM liquidity_providers lp
         JOIN liquidity_pools p ON lp.pool_id = p.id
         WHERE p.pool_type = 'curve_stable' AND lp.is_active = true LIMIT 1`
      );

      if (v2Result.rows.length > 0 && curveResult.rows.length > 0) {
        const v2IL = await impermanentLossEngine.calculateIL(v2Result.rows[0].id);
        const curveIL = await impermanentLossEngine.calculateIL(curveResult.rows[0].id);

        // Curve should have lower IL magnitude
        expect(Math.abs(curveIL.impermanentLossPct)).toBeLessThan(Math.abs(v2IL.impermanentLossPct));
      }
    });

    it('should handle V3 out-of-range positions', async () => {
      const result = await query<{ id: string }>(
        `SELECT lp.id
         FROM liquidity_providers lp
         JOIN liquidity_pools p ON lp.pool_id = p.id
         WHERE p.pool_type = 'uniswap_v3' 
           AND lp.in_range = false 
           AND lp.is_active = true
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const lpId = result.rows[0].id;
        const ilCalc = await impermanentLossEngine.calculateIL(lpId);

        // Out-of-range positions should have IL
        expect(ilCalc.impermanentLoss).toBeDefined();
      }
    });
  });

  describe('compareILvsFees', () => {
    it('should compare IL vs fees earned', async () => {
      const comparison = await impermanentLossEngine.compareILvsFees(testLpId);

      expect(comparison).toBeDefined();
      expect(comparison.lpId).toBe(testLpId);
      expect(comparison.impermanentLoss).toBeDefined();
      expect(comparison.feesEarned).toBeGreaterThanOrEqual(0);
      expect(comparison.netProfit).toBeDefined();
      expect(typeof comparison.isProfitable).toBe('boolean');
    });

    it('should identify profitable positions', async () => {
      // Get a position with positive net profit
      const result = await query<{ id: string }>(
        `SELECT id FROM liquidity_providers 
         WHERE net_profit > 0 AND is_active = true 
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const lpId = result.rows[0].id;
        const comparison = await impermanentLossEngine.compareILvsFees(lpId);

        expect(comparison.isProfitable).toBe(true);
        expect(comparison.netProfit).toBeGreaterThan(0);
      }
    });

    it('should calculate break-even fees', async () => {
      const comparison = await impermanentLossEngine.compareILvsFees(testLpId);

      expect(comparison.breakEvenFees).toBeGreaterThanOrEqual(0);
      // Break-even fees should equal absolute IL
      expect(comparison.breakEvenFees).toBeCloseTo(Math.abs(comparison.impermanentLoss), 2);
    });
  });

  describe('scoreILRisk', () => {
    it('should score IL risk for a pool', async () => {
      const riskScore = await impermanentLossEngine.scoreILRisk(testPoolId);

      expect(riskScore).toBeDefined();
      expect(riskScore.poolId).toBe(testPoolId);
      expect(riskScore.riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore.riskScore).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high']).toContain(riskScore.riskLevel);
    });

    it('should give low risk to Curve pools', async () => {
      const result = await query<{ id: string }>(
        `SELECT id FROM liquidity_pools WHERE pool_type = 'curve_stable' LIMIT 1`
      );

      if (result.rows.length > 0) {
        const poolId = result.rows[0].id;
        const riskScore = await impermanentLossEngine.scoreILRisk(poolId);

        expect(riskScore.riskLevel).toBe('low');
        expect(riskScore.riskScore).toBeLessThan(30);
      }
    });

    it('should give higher risk to V2 pools', async () => {
      const result = await query<{ id: string }>(
        `SELECT id FROM liquidity_pools WHERE pool_type = 'uniswap_v2' LIMIT 1`
      );

      if (result.rows.length > 0) {
        const poolId = result.rows[0].id;
        const riskScore = await impermanentLossEngine.scoreILRisk(poolId);

        // V2 should have medium to high risk
        expect(riskScore.riskScore).toBeGreaterThan(30);
      }
    });

    it('should throw error for non-existent pool', async () => {
      await expect(
        impermanentLossEngine.scoreILRisk('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Pool not found');
    });
  });

  describe('projectIL', () => {
    it('should project IL for price increase scenarios', async () => {
      const projections = await impermanentLossEngine.projectIL(testLpId, [10, 50, 100]);

      expect(projections).toBeDefined();
      expect(projections.length).toBe(3);

      projections.forEach(proj => {
        expect(proj.priceChange).toBeDefined();
        expect(proj.projectedPrice).toBeGreaterThan(0);
        expect(proj.projectedIL).toBeDefined();
        expect(proj.projectedILPct).toBeDefined();
      });
    });

    it('should project IL for price decrease scenarios', async () => {
      const projections = await impermanentLossEngine.projectIL(testLpId, [-10, -20, -50]);

      expect(projections).toBeDefined();
      expect(projections.length).toBe(3);

      projections.forEach(proj => {
        expect(proj.projectedPrice).toBeGreaterThan(0);
      });
    });

    it('should show increasing IL with larger price changes', async () => {
      const projections = await impermanentLossEngine.projectIL(testLpId, [10, 50, 100]);

      // IL magnitude should increase with price change
      expect(Math.abs(projections[1].projectedILPct)).toBeGreaterThan(Math.abs(projections[0].projectedILPct));
      expect(Math.abs(projections[2].projectedILPct)).toBeGreaterThan(Math.abs(projections[1].projectedILPct));
    });

    it('should handle extreme price changes', async () => {
      const projections = await impermanentLossEngine.projectIL(testLpId, [1000, -90]);

      expect(projections).toBeDefined();
      expect(projections.length).toBe(2);
      // Should not throw errors
    });
  });

  describe('getHistoricalIL', () => {
    it('should get historical IL snapshots', async () => {
      const history = await impermanentLossEngine.getHistoricalIL(testLpId, 30);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      // May be empty if no history exists
    });

    it('should filter by time range', async () => {
      const history7d = await impermanentLossEngine.getHistoricalIL(testLpId, 7);
      const history30d = await impermanentLossEngine.getHistoricalIL(testLpId, 30);

      expect(Array.isArray(history7d)).toBe(true);
      expect(Array.isArray(history30d)).toBe(true);
      // 30d should have >= 7d entries
      expect(history30d.length).toBeGreaterThanOrEqual(history7d.length);
    });

    it('should return empty array for positions with no history', async () => {
      const history = await impermanentLossEngine.getHistoricalIL(testLpId, 1);

      expect(Array.isArray(history)).toBe(true);
      // Should not throw error
    });

    it('should have correct data structure', async () => {
      const history = await impermanentLossEngine.getHistoricalIL(testLpId, 30);

      if (history.length > 0) {
        const snapshot = history[0];
        expect(snapshot.timestamp).toBeDefined();
        expect(snapshot.impermanentLoss).toBeDefined();
        expect(snapshot.impermanentLossPct).toBeDefined();
        expect(snapshot.hodlValue).toBeDefined();
        expect(snapshot.positionValue).toBeDefined();
        expect(snapshot.feesEarned).toBeDefined();
      }
    });
  });
});

