/**
 * Tests for LP Analysis Engine
 * Story: 2.1.3 - Liquidity Analysis Tools
 */

import { lpAnalysisEngine } from '../lp-analysis-engine';
import { query } from '../../db/connection';

describe('LPAnalysisEngine', () => {
  let testPoolId: string;
  let testWalletAddress: string;

  beforeAll(async () => {
    // Get a test pool ID and wallet address
    const poolResult = await query<{ id: string }>(
      `SELECT id FROM liquidity_pools LIMIT 1`
    );
    testPoolId = poolResult.rows[0].id;

    const walletResult = await query<{ walletAddress: string }>(
      `SELECT wallet_address as "walletAddress" FROM liquidity_providers WHERE is_active = true LIMIT 1`
    );
    testWalletAddress = walletResult.rows[0].walletAddress;
  });

  describe('getLPPositions', () => {
    it('should get all positions for a pool', async () => {
      const positions = await lpAnalysisEngine.getLPPositions({ poolId: testPoolId });

      expect(positions).toBeDefined();
      expect(Array.isArray(positions)).toBe(true);
      expect(positions.length).toBeGreaterThan(0);

      const position = positions[0];
      expect(position.id).toBeDefined();
      expect(position.poolId).toBe(testPoolId);
      expect(position.walletAddress).toBeDefined();
    });

    it('should get positions for a wallet', async () => {
      const positions = await lpAnalysisEngine.getLPPositions({ walletAddress: testWalletAddress });

      expect(positions).toBeDefined();
      expect(positions.length).toBeGreaterThan(0);
      positions.forEach(p => {
        expect(p.walletAddress).toBe(testWalletAddress);
      });
    });

    it('should filter by active status', async () => {
      const activePositions = await lpAnalysisEngine.getLPPositions({ isActive: true });
      const inactivePositions = await lpAnalysisEngine.getLPPositions({ isActive: false });

      expect(activePositions.length).toBeGreaterThan(0);
      activePositions.forEach(p => {
        expect(p.isActive).toBe(true);
      });

      if (inactivePositions.length > 0) {
        inactivePositions.forEach(p => {
          expect(p.isActive).toBe(false);
        });
      }
    });

    it('should sort by different criteria', async () => {
      const byValue = await lpAnalysisEngine.getLPPositions({ sortBy: 'value', limit: 5 });
      const byFees = await lpAnalysisEngine.getLPPositions({ sortBy: 'fees', limit: 5 });
      const byRoi = await lpAnalysisEngine.getLPPositions({ sortBy: 'roi', limit: 5 });

      expect(byValue.length).toBeGreaterThan(0);
      expect(byFees.length).toBeGreaterThan(0);
      expect(byRoi.length).toBeGreaterThan(0);

      // Check descending order
      for (let i = 1; i < byValue.length; i++) {
        expect(byValue[i].positionValueUsd).toBeLessThanOrEqual(byValue[i - 1].positionValueUsd);
      }
    });

    it('should support pagination', async () => {
      const page1 = await lpAnalysisEngine.getLPPositions({ limit: 5, offset: 0 });
      const page2 = await lpAnalysisEngine.getLPPositions({ limit: 5, offset: 5 });

      expect(page1.length).toBeGreaterThan(0);
      expect(page2.length).toBeGreaterThan(0);

      // Pages should have different positions
      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });
  });

  describe('getLPProfitability', () => {
    it('should calculate profitability for a wallet', async () => {
      const profitability = await lpAnalysisEngine.getLPProfitability(testWalletAddress);

      expect(profitability).toBeDefined();
      expect(profitability.walletAddress).toBe(testWalletAddress);
      expect(profitability.totalPositions).toBeGreaterThan(0);
      expect(profitability.totalValueUsd).toBeGreaterThanOrEqual(0);
      expect(profitability.totalFeesEarned).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple positions', async () => {
      // Get a wallet with multiple positions
      const result = await query<{ walletAddress: string }>(
        `SELECT wallet_address as "walletAddress" 
         FROM liquidity_providers 
         GROUP BY wallet_address 
         HAVING COUNT(*) > 1 
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const wallet = result.rows[0].walletAddress;
        const profitability = await lpAnalysisEngine.getLPProfitability(wallet);

        expect(profitability.totalPositions).toBeGreaterThan(1);
      }
    });

    it('should calculate annualized ROI correctly', async () => {
      const profitability = await lpAnalysisEngine.getLPProfitability(testWalletAddress);

      expect(profitability.annualizedRoi).toBeDefined();
      expect(typeof profitability.annualizedRoi).toBe('number');

      // Annualized ROI should be scaled by 365 / avg age
      if (profitability.averagePositionAgeDays > 0) {
        const expectedAnnualized = profitability.averageRoi * (365 / profitability.averagePositionAgeDays);
        expect(profitability.annualizedRoi).toBeCloseTo(expectedAnnualized, 2);
      }
    });

    it('should handle wallets with no positions', async () => {
      const profitability = await lpAnalysisEngine.getLPProfitability('0x0000000000000000000000000000000000000000');

      expect(profitability.totalPositions).toBe(0);
      expect(profitability.totalValueUsd).toBe(0);
      expect(profitability.totalFeesEarned).toBe(0);
    });
  });

  describe('analyzeLPPatterns', () => {
    it('should analyze patterns for a pool', async () => {
      const patterns = await lpAnalysisEngine.analyzeLPPatterns({ poolId: testPoolId });

      expect(patterns).toBeDefined();
      expect(patterns.poolId).toBe(testPoolId);
      expect(patterns.totalPositions).toBeGreaterThan(0);
      expect(patterns.activePositions).toBeGreaterThanOrEqual(0);
      expect(patterns.exitedPositions).toBeGreaterThanOrEqual(0);
      expect(patterns.totalPositions).toBe(patterns.activePositions + patterns.exitedPositions);
    });

    it('should analyze patterns for a wallet', async () => {
      const patterns = await lpAnalysisEngine.analyzeLPPatterns({ walletAddress: testWalletAddress });

      expect(patterns).toBeDefined();
      expect(patterns.walletAddress).toBe(testWalletAddress);
      expect(patterns.totalPositions).toBeGreaterThan(0);
    });

    it('should calculate churn rate correctly', async () => {
      const patterns = await lpAnalysisEngine.analyzeLPPatterns({ poolId: testPoolId });

      expect(patterns.churnRate).toBeGreaterThanOrEqual(0);
      expect(patterns.churnRate).toBeLessThanOrEqual(1);

      // Churn rate = exited / total
      const expectedChurn = patterns.totalPositions > 0 
        ? patterns.exitedPositions / patterns.totalPositions 
        : 0;
      expect(patterns.churnRate).toBeCloseTo(expectedChurn, 4);
    });

    it('should calculate average holding period', async () => {
      const patterns = await lpAnalysisEngine.analyzeLPPatterns({ poolId: testPoolId });

      expect(patterns.averageHoldingPeriod).toBeGreaterThanOrEqual(0);
      expect(typeof patterns.averageHoldingPeriod).toBe('number');
    });
  });

  describe('rankLPs', () => {
    it('should rank by position value', async () => {
      const rankings = await lpAnalysisEngine.rankLPs(testPoolId, 'value', 5);

      expect(rankings).toBeDefined();
      expect(rankings.length).toBeGreaterThan(0);
      expect(rankings.length).toBeLessThanOrEqual(5);

      // Check descending order
      for (let i = 1; i < rankings.length; i++) {
        expect(rankings[i].value).toBeLessThanOrEqual(rankings[i - 1].value);
      }

      // Check rank numbers
      rankings.forEach((r, idx) => {
        expect(r.rank).toBe(idx + 1);
      });
    });

    it('should rank by fees earned', async () => {
      const rankings = await lpAnalysisEngine.rankLPs(testPoolId, 'fees', 5);

      expect(rankings).toBeDefined();
      expect(rankings.length).toBeGreaterThan(0);

      // Check descending order
      for (let i = 1; i < rankings.length; i++) {
        expect(rankings[i].value).toBeLessThanOrEqual(rankings[i - 1].value);
      }
    });

    it('should rank by ROI', async () => {
      const rankings = await lpAnalysisEngine.rankLPs(testPoolId, 'roi', 5);

      expect(rankings).toBeDefined();
      expect(rankings.length).toBeGreaterThan(0);

      // Check descending order
      for (let i = 1; i < rankings.length; i++) {
        expect(rankings[i].value).toBeLessThanOrEqual(rankings[i - 1].value);
      }
    });
  });

  describe('calculateConcentration', () => {
    it('should calculate Gini coefficient', async () => {
      const metrics = await lpAnalysisEngine.calculateConcentration(testPoolId);

      expect(metrics).toBeDefined();
      expect(metrics.giniCoefficient).toBeGreaterThanOrEqual(0);
      expect(metrics.giniCoefficient).toBeLessThanOrEqual(1);
    });

    it('should calculate HHI', async () => {
      const metrics = await lpAnalysisEngine.calculateConcentration(testPoolId);

      expect(metrics.hhi).toBeGreaterThanOrEqual(0);
      expect(metrics.hhi).toBeLessThanOrEqual(10000);
    });

    it('should calculate top N% shares', async () => {
      const metrics = await lpAnalysisEngine.calculateConcentration(testPoolId);

      expect(metrics.top10PercentShare).toBeGreaterThanOrEqual(0);
      expect(metrics.top10PercentShare).toBeLessThanOrEqual(100);
      expect(metrics.top1PercentShare).toBeGreaterThanOrEqual(0);
      expect(metrics.top1PercentShare).toBeLessThanOrEqual(100);

      // Top 1% should be <= Top 10%
      expect(metrics.top1PercentShare).toBeLessThanOrEqual(metrics.top10PercentShare);
    });

    it('should handle edge cases', async () => {
      // Test with pool that has few LPs
      const result = await query<{ id: string }>(
        `SELECT lp.pool_id as id
         FROM liquidity_providers lp
         WHERE lp.is_active = true
         GROUP BY lp.pool_id
         HAVING COUNT(*) = 1
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        const poolId = result.rows[0].id;
        const metrics = await lpAnalysisEngine.calculateConcentration(poolId);

        expect(metrics.totalLPs).toBe(1);
        expect(metrics.giniCoefficient).toBe(0); // Perfect equality with 1 LP
        expect(metrics.top10PercentShare).toBe(100);
        expect(metrics.top1PercentShare).toBe(100);
      }
    });
  });
});

