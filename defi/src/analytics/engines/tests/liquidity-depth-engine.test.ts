/**
 * Tests for Liquidity Depth Engine
 * Story: 2.1.3 - Liquidity Analysis Tools
 */

import { liquidityDepthEngine } from '../liquidity-depth-engine';
import { query } from '../../db/connection';

describe('LiquidityDepthEngine', () => {
  let testPoolId: string;

  beforeAll(async () => {
    // Get a test pool ID
    const result = await query<{ id: string }>(
      `SELECT id FROM liquidity_pools WHERE pool_type = 'uniswap_v2' LIMIT 1`
    );
    testPoolId = result.rows[0].id;
  });

  describe('getDepthChart', () => {
    it('should return depth chart for a pool', async () => {
      const depthChart = await liquidityDepthEngine.getDepthChart(testPoolId);

      expect(depthChart).toBeDefined();
      expect(depthChart.poolId).toBe(testPoolId);
      expect(depthChart.poolName).toBeDefined();
      expect(depthChart.poolType).toBe('uniswap_v2');
      expect(depthChart.midPrice).toBeGreaterThan(0);
    });

    it('should have bids and asks', async () => {
      const depthChart = await liquidityDepthEngine.getDepthChart(testPoolId);

      expect(depthChart.depth.bids).toBeDefined();
      expect(depthChart.depth.asks).toBeDefined();
      expect(depthChart.depth.bids.length).toBeGreaterThan(0);
      expect(depthChart.depth.asks.length).toBeGreaterThan(0);
    });

    it('should have correct bid/ask ordering', async () => {
      const depthChart = await liquidityDepthEngine.getDepthChart(testPoolId);

      // Bids should be below mid price
      depthChart.depth.bids.forEach(bid => {
        expect(bid.price).toBeLessThan(depthChart.midPrice);
      });

      // Asks should be above mid price
      depthChart.depth.asks.forEach(ask => {
        expect(ask.price).toBeGreaterThan(depthChart.midPrice);
      });
    });

    it('should have cumulative totals', async () => {
      const depthChart = await liquidityDepthEngine.getDepthChart(testPoolId);

      // Check cumulative totals are increasing
      for (let i = 1; i < depthChart.depth.bids.length; i++) {
        expect(depthChart.depth.bids[i].total).toBeGreaterThanOrEqual(
          depthChart.depth.bids[i - 1].total
        );
      }

      for (let i = 1; i < depthChart.depth.asks.length; i++) {
        expect(depthChart.depth.asks[i].total).toBeGreaterThanOrEqual(
          depthChart.depth.asks[i - 1].total
        );
      }
    });

    it('should calculate spread correctly', async () => {
      const depthChart = await liquidityDepthEngine.getDepthChart(testPoolId);

      expect(depthChart.depth.spread).toBeGreaterThan(0);
      expect(depthChart.depth.spreadBps).toBeGreaterThan(0);

      // Spread should be the difference between best ask and best bid
      const bestBid = depthChart.depth.bids[0].price;
      const bestAsk = depthChart.depth.asks[0].price;
      expect(depthChart.depth.spread).toBeCloseTo(bestAsk - bestBid, 6);
    });

    it('should calculate price impact for different trade sizes', async () => {
      const depthChart = await liquidityDepthEngine.getDepthChart(testPoolId);

      expect(depthChart.priceImpact.buy['1k']).toBeDefined();
      expect(depthChart.priceImpact.buy['10k']).toBeDefined();
      expect(depthChart.priceImpact.buy['100k']).toBeDefined();
      expect(depthChart.priceImpact.buy['1m']).toBeDefined();

      // Larger trades should have higher price impact
      expect(depthChart.priceImpact.buy['10k']).toBeGreaterThan(depthChart.priceImpact.buy['1k']);
      expect(depthChart.priceImpact.buy['100k']).toBeGreaterThan(depthChart.priceImpact.buy['10k']);
      expect(depthChart.priceImpact.buy['1m']).toBeGreaterThan(depthChart.priceImpact.buy['100k']);
    });

    it('should calculate slippage for different trade sizes', async () => {
      const depthChart = await liquidityDepthEngine.getDepthChart(testPoolId);

      expect(depthChart.slippage.buy['1k']).toBeDefined();
      expect(depthChart.slippage.sell['1k']).toBeDefined();

      // Slippage should be greater than price impact (includes fees)
      expect(depthChart.slippage.buy['1k']).toBeGreaterThan(depthChart.priceImpact.buy['1k']);
    });

    it('should throw error for non-existent pool', async () => {
      await expect(
        liquidityDepthEngine.getDepthChart('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Pool not found');
    });
  });

  describe('getSpread', () => {
    it('should return spread for a pool', async () => {
      const spread = await liquidityDepthEngine.getSpread(testPoolId);

      expect(spread).toBeDefined();
      expect(spread.spread).toBeGreaterThan(0);
      expect(spread.spreadBps).toBeGreaterThan(0);
      expect(spread.midPrice).toBeGreaterThan(0);
    });

    it('should calculate spread in basis points correctly', async () => {
      const spread = await liquidityDepthEngine.getSpread(testPoolId);

      // spreadBps = (spread / midPrice) * 10000
      const expectedBps = (spread.spread / spread.midPrice) * 10000;
      expect(spread.spreadBps).toBeCloseTo(expectedBps, 2);
    });
  });

  describe('Pool Type Specific Tests', () => {
    it('should handle Uniswap V2 pools', async () => {
      const result = await query<{ id: string }>(
        `SELECT id FROM liquidity_pools WHERE pool_type = 'uniswap_v2' LIMIT 1`
      );
      const poolId = result.rows[0].id;

      const depthChart = await liquidityDepthEngine.getDepthChart(poolId);
      expect(depthChart.poolType).toBe('uniswap_v2');
      expect(depthChart.midPrice).toBeGreaterThan(0);
    });

    it('should handle Uniswap V3 pools', async () => {
      const result = await query<{ id: string }>(
        `SELECT id FROM liquidity_pools WHERE pool_type = 'uniswap_v3' LIMIT 1`
      );
      if (result.rows.length > 0) {
        const poolId = result.rows[0].id;
        const depthChart = await liquidityDepthEngine.getDepthChart(poolId);
        expect(depthChart.poolType).toBe('uniswap_v3');
      }
    });

    it('should handle Curve stable pools', async () => {
      const result = await query<{ id: string }>(
        `SELECT id FROM liquidity_pools WHERE pool_type = 'curve_stable' LIMIT 1`
      );
      if (result.rows.length > 0) {
        const poolId = result.rows[0].id;
        const depthChart = await liquidityDepthEngine.getDepthChart(poolId);
        expect(depthChart.poolType).toBe('curve_stable');
        // Curve pools should have lower price impact
        expect(depthChart.priceImpact.buy['100k']).toBeLessThan(5); // Should be < 5%
      }
    });

    it('should handle Balancer weighted pools', async () => {
      const result = await query<{ id: string }>(
        `SELECT id FROM liquidity_pools WHERE pool_type = 'balancer_weighted' LIMIT 1`
      );
      if (result.rows.length > 0) {
        const poolId = result.rows[0].id;
        const depthChart = await liquidityDepthEngine.getDepthChart(poolId);
        expect(depthChart.poolType).toBe('balancer_weighted');
      }
    });
  });

  describe('Price Impact Calculations', () => {
    it('should have price impact for both buy and sell', async () => {
      const depthChart = await liquidityDepthEngine.getDepthChart(testPoolId);

      // Buy and sell impacts should both be positive
      const buyImpact = depthChart.priceImpact.buy['10k'];
      const sellImpact = depthChart.priceImpact.sell['10k'];
      expect(buyImpact).toBeGreaterThan(0);
      expect(sellImpact).toBeGreaterThan(0);

      // Both should be reasonable for 10k trade
      expect(buyImpact).toBeLessThan(100); // Less than 100% for 10k trade
      expect(sellImpact).toBeLessThan(100);
    });

    it('should have reasonable price impact values', async () => {
      const depthChart = await liquidityDepthEngine.getDepthChart(testPoolId);

      // Price impact should be >= 0% (can exceed 100% for large trades on small pools)
      Object.values(depthChart.priceImpact.buy).forEach(impact => {
        expect(impact).toBeGreaterThanOrEqual(0);
      });

      // Small trades should have reasonable impact
      expect(depthChart.priceImpact.buy['1k']).toBeLessThan(10); // < 10%
    });
  });

  describe('Slippage Calculations', () => {
    it('should include fees in slippage', async () => {
      const depthChart = await liquidityDepthEngine.getDepthChart(testPoolId);

      // Slippage = price impact + fees
      // So slippage should always be >= price impact
      Object.keys(depthChart.slippage.buy).forEach(size => {
        expect(depthChart.slippage.buy[size]).toBeGreaterThanOrEqual(
          depthChart.priceImpact.buy[size]
        );
      });
    });

    it('should have reasonable slippage values', async () => {
      const depthChart = await liquidityDepthEngine.getDepthChart(testPoolId);

      // Slippage should be >= 0% (can exceed 100% for large trades on small pools)
      Object.values(depthChart.slippage.buy).forEach(slippage => {
        expect(slippage).toBeGreaterThanOrEqual(0);
      });

      // Small trades should have reasonable slippage
      expect(depthChart.slippage.buy['1k']).toBeLessThan(15); // < 15%
    });
  });

  describe('Edge Cases', () => {
    it('should handle custom number of levels', async () => {
      const depthChart10 = await liquidityDepthEngine.getDepthChart(testPoolId, 10);
      const depthChart30 = await liquidityDepthEngine.getDepthChart(testPoolId, 30);

      expect(depthChart10.depth.bids.length).toBe(10);
      expect(depthChart30.depth.bids.length).toBe(30);
    });

    it('should handle pools with low liquidity', async () => {
      // Get pool with lowest liquidity
      const result = await query<{ id: string }>(
        `SELECT id FROM liquidity_pools ORDER BY total_liquidity ASC LIMIT 1`
      );
      const poolId = result.rows[0].id;

      const depthChart = await liquidityDepthEngine.getDepthChart(poolId);
      expect(depthChart).toBeDefined();
      // Low liquidity pools should have higher price impact
      expect(depthChart.priceImpact.buy['1k']).toBeGreaterThan(0);
      // Large trades on small pools can have very high impact
      expect(depthChart.priceImpact.buy['1m']).toBeGreaterThan(depthChart.priceImpact.buy['1k']);
    });

    it('should handle pools with high liquidity', async () => {
      // Get pool with highest liquidity
      const result = await query<{ id: string }>(
        `SELECT id FROM liquidity_pools ORDER BY total_liquidity DESC LIMIT 1`
      );
      const poolId = result.rows[0].id;

      const depthChart = await liquidityDepthEngine.getDepthChart(poolId);
      expect(depthChart).toBeDefined();
      // High liquidity pools should have lower price impact for small trades
      expect(depthChart.priceImpact.buy['1k']).toBeLessThan(1); // Should be < 1%
      expect(depthChart.priceImpact.buy['10k']).toBeLessThan(5); // Should be < 5%
    });
  });
});

