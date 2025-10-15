/**
 * Liquidity Depth Engine
 * Story: 2.1.3 - Liquidity Analysis Tools
 * 
 * Calculates liquidity depth, slippage estimates, and price impact
 * for different AMM models (Uniswap V2/V3, Curve, Balancer).
 */

import { query } from '../db/connection';

// ============================================================================
// Types
// ============================================================================

export interface DepthLevel {
  price: number;
  amount: number;
  total: number; // Cumulative amount
}

export interface DepthChart {
  poolId: string;
  poolName: string;
  poolType: string;
  midPrice: number;
  depth: {
    bids: DepthLevel[];
    asks: DepthLevel[];
    spread: number;
    spreadBps: number; // Spread in basis points
  };
  priceImpact: {
    buy: Record<string, number>; // '1k', '10k', '100k', '1m'
    sell: Record<string, number>;
  };
  slippage: {
    buy: Record<string, number>;
    sell: Record<string, number>;
  };
}

export interface PoolData {
  id: string;
  poolName: string;
  poolType: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Reserve: number;
  token1Reserve: number;
  token0PriceUsd: number;
  token1PriceUsd: number;
  feeTier: number;
  totalLiquidity: number;
  // V3 specific
  tickLower?: number;
  tickUpper?: number;
  currentTick?: number;
}

// ============================================================================
// Liquidity Depth Engine
// ============================================================================

export class LiquidityDepthEngine {
  private static instance: LiquidityDepthEngine;

  private constructor() {}

  public static getInstance(): LiquidityDepthEngine {
    if (!LiquidityDepthEngine.instance) {
      LiquidityDepthEngine.instance = new LiquidityDepthEngine();
    }
    return LiquidityDepthEngine.instance;
  }

  /**
   * Get depth chart for a pool
   */
  public async getDepthChart(poolId: string, levels: number = 20): Promise<DepthChart> {
    // Get pool data
    const poolResult = await query<PoolData>(
      `SELECT 
        id,
        pool_name as "poolName",
        pool_type as "poolType",
        token0_symbol as "token0Symbol",
        token1_symbol as "token1Symbol",
        token0_reserve as "token0Reserve",
        token1_reserve as "token1Reserve",
        token0_price_usd as "token0PriceUsd",
        token1_price_usd as "token1PriceUsd",
        fee_tier as "feeTier",
        total_liquidity as "totalLiquidity",
        tick_lower as "tickLower",
        tick_upper as "tickUpper",
        current_tick as "currentTick"
      FROM liquidity_pools
      WHERE id = $1`,
      [poolId]
    );

    if (poolResult.rows.length === 0) {
      throw new Error(`Pool not found: ${poolId}`);
    }

    const pool = poolResult.rows[0];

    // Calculate mid price
    const midPrice = this.calculateMidPrice(pool);

    // Generate depth levels based on pool type
    const { bids, asks } = this.generateDepthLevels(pool, midPrice, levels);

    // Calculate spread
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk - bestBid;
    const spreadBps = (spread / midPrice) * 10000;

    // Calculate price impact and slippage for standard trade sizes
    const tradeSizes = { '1k': 1000, '10k': 10000, '100k': 100000, '1m': 1000000 };
    const priceImpact = { buy: {}, sell: {} };
    const slippage = { buy: {}, sell: {} };

    for (const [label, size] of Object.entries(tradeSizes)) {
      priceImpact.buy[label] = this.calculatePriceImpact(pool, size, 'buy', midPrice);
      priceImpact.sell[label] = this.calculatePriceImpact(pool, size, 'sell', midPrice);
      slippage.buy[label] = this.calculateSlippage(pool, size, 'buy', midPrice);
      slippage.sell[label] = this.calculateSlippage(pool, size, 'sell', midPrice);
    }

    return {
      poolId: pool.id,
      poolName: pool.poolName,
      poolType: pool.poolType,
      midPrice,
      depth: {
        bids,
        asks,
        spread,
        spreadBps,
      },
      priceImpact,
      slippage,
    };
  }

  /**
   * Calculate mid price based on pool type
   */
  private calculateMidPrice(pool: PoolData): number {
    if (pool.poolType === 'uniswap_v2' || pool.poolType === 'uniswap_v3') {
      // Constant product: price = reserve1 / reserve0
      return pool.token1Reserve / pool.token0Reserve;
    } else if (pool.poolType === 'curve_stable') {
      // Stable swap: price ≈ 1 (with small deviation)
      return pool.token1PriceUsd / pool.token0PriceUsd;
    } else if (pool.poolType === 'balancer_weighted') {
      // Weighted pool: price based on reserves and weights
      return pool.token1Reserve / pool.token0Reserve;
    }
    return pool.token1Reserve / pool.token0Reserve;
  }

  /**
   * Generate depth levels (order book simulation)
   */
  private generateDepthLevels(
    pool: PoolData,
    midPrice: number,
    levels: number
  ): { bids: DepthLevel[]; asks: DepthLevel[] } {
    const bids: DepthLevel[] = [];
    const asks: DepthLevel[] = [];

    // Generate price levels around mid price
    const priceStep = midPrice * 0.001; // 0.1% steps

    let cumulativeBid = 0;
    let cumulativeAsk = 0;

    for (let i = 0; i < levels; i++) {
      // Bid side (below mid price)
      const bidPrice = midPrice - priceStep * (i + 1);
      const bidAmount = this.calculateLiquidityAtPrice(pool, bidPrice, 'bid');
      cumulativeBid += bidAmount;
      bids.push({ price: bidPrice, amount: bidAmount, total: cumulativeBid });

      // Ask side (above mid price)
      const askPrice = midPrice + priceStep * (i + 1);
      const askAmount = this.calculateLiquidityAtPrice(pool, askPrice, 'ask');
      cumulativeAsk += askAmount;
      asks.push({ price: askPrice, amount: askAmount, total: cumulativeAsk });
    }

    return { bids, asks };
  }

  /**
   * Calculate available liquidity at a specific price
   */
  private calculateLiquidityAtPrice(pool: PoolData, price: number, side: 'bid' | 'ask'): number {
    if (pool.poolType === 'uniswap_v2') {
      // Constant product formula: x * y = k
      // Liquidity available = sqrt(k) / price_deviation
      const k = pool.token0Reserve * pool.token1Reserve;
      const midPrice = pool.token1Reserve / pool.token0Reserve;
      const priceDeviation = Math.abs(price - midPrice) / midPrice;
      return Math.sqrt(k) * (1 - priceDeviation) * 0.1; // Simplified approximation
    } else if (pool.poolType === 'curve_stable') {
      // Stable swap has high liquidity near peg
      const midPrice = pool.token1PriceUsd / pool.token0PriceUsd;
      const priceDeviation = Math.abs(price - midPrice) / midPrice;
      return pool.totalLiquidity * 0.01 * (1 - priceDeviation * 10); // Higher liquidity near peg
    } else if (pool.poolType === 'uniswap_v3') {
      // Concentrated liquidity - check if price is in range
      if (pool.currentTick !== undefined && pool.tickLower !== undefined && pool.tickUpper !== undefined) {
        const priceToTick = Math.log(price) / Math.log(1.0001);
        if (priceToTick >= pool.tickLower && priceToTick <= pool.tickUpper) {
          return pool.totalLiquidity * 0.02; // High liquidity in range
        }
      }
      return pool.totalLiquidity * 0.001; // Low liquidity out of range
    }
    return pool.totalLiquidity * 0.01;
  }

  /**
   * Calculate price impact for a trade
   */
  private calculatePriceImpact(pool: PoolData, tradeSize: number, side: 'buy' | 'sell', midPrice: number): number {
    if (pool.poolType === 'uniswap_v2') {
      // Constant product: Δp/p = Δx / (x + Δx)
      const reserve = side === 'buy' ? pool.token0Reserve : pool.token1Reserve;
      const impact = tradeSize / (reserve + tradeSize);
      return impact * 100; // Return as percentage
    } else if (pool.poolType === 'curve_stable') {
      // Stable swap has lower price impact
      const impact = (tradeSize / pool.totalLiquidity) * 0.1;
      return Math.min(impact * 100, 5); // Cap at 5%
    } else if (pool.poolType === 'uniswap_v3') {
      // Concentrated liquidity - higher impact if out of range
      const reserve = side === 'buy' ? pool.token0Reserve : pool.token1Reserve;
      const impact = tradeSize / (reserve * 2); // Concentrated liquidity factor
      return impact * 100;
    }
    return (tradeSize / pool.totalLiquidity) * 100;
  }

  /**
   * Calculate slippage for a trade
   */
  private calculateSlippage(pool: PoolData, tradeSize: number, side: 'buy' | 'sell', midPrice: number): number {
    // Slippage = price impact + fees
    const priceImpact = this.calculatePriceImpact(pool, tradeSize, side, midPrice);
    const feeImpact = pool.feeTier * 100; // Convert to percentage
    return priceImpact + feeImpact;
  }

  /**
   * Get bid/ask spread for a pool
   */
  public async getSpread(poolId: string): Promise<{ spread: number; spreadBps: number; midPrice: number }> {
    const poolResult = await query<any>(
      `SELECT
        bid_ask_spread::FLOAT as spread,
        (token1_reserve / token0_reserve)::FLOAT as "midPrice"
      FROM liquidity_pools
      WHERE id = $1`,
      [poolId]
    );

    if (poolResult.rows.length === 0) {
      throw new Error(`Pool not found: ${poolId}`);
    }

    const { spread, midPrice } = poolResult.rows[0];
    const spreadBps = (spread / midPrice) * 10000;

    return { spread, spreadBps, midPrice };
  }
}

// Export singleton instance
export const liquidityDepthEngine = LiquidityDepthEngine.getInstance();

