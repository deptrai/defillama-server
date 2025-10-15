/**
 * Portfolio Valuation Engine
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * Provides real-time portfolio valuation and multi-chain aggregation.
 */

import { query } from '../db/connection';

export interface PortfolioSummary {
  walletAddress: string;
  totalValueUsd: number;
  chains: Array<{
    chainId: string;
    valueUsd: number;
    tokenCount: number;
    protocolCount: number;
  }>;
  performance: {
    pnl24h: number;
    pnl7d: number;
    pnl30d: number;
    pnlAllTime: number;
    roiAllTime: number;
  };
  risk: {
    concentrationScore: number;
    diversificationScore: number;
    topHoldingPct: number;
  };
  lastUpdated: string;
}

export interface ChainPortfolio {
  chainId: string;
  totalValueUsd: number;
  tokenCount: number;
  protocolCount: number;
  pnl24h: number;
  pnl7d: number;
  pnl30d: number;
  pnlAllTime: number;
  roiAllTime: number;
  concentrationScore: number;
  diversificationScore: number;
  lastUpdated: string;
}

/**
 * Portfolio Valuation Engine
 * Singleton pattern for efficient resource management
 */
export class PortfolioValuationEngine {
  private static instance: PortfolioValuationEngine;

  private constructor() {}

  public static getInstance(): PortfolioValuationEngine {
    if (!PortfolioValuationEngine.instance) {
      PortfolioValuationEngine.instance = new PortfolioValuationEngine();
    }
    return PortfolioValuationEngine.instance;
  }

  /**
   * Get portfolio summary for a wallet across all chains
   */
  async getPortfolioSummary(
    walletAddress: string,
    chains?: string[]
  ): Promise<PortfolioSummary> {
    // Get chain-level portfolios
    const chainPortfolios = await this.getChainPortfolios(walletAddress, chains);

    if (chainPortfolios.length === 0) {
      throw new Error(`No portfolio found for wallet ${walletAddress}`);
    }

    // Aggregate across chains
    const totalValueUsd = chainPortfolios.reduce((sum, p) => sum + p.totalValueUsd, 0);
    const totalPnl24h = chainPortfolios.reduce((sum, p) => sum + p.pnl24h, 0);
    const totalPnl7d = chainPortfolios.reduce((sum, p) => sum + p.pnl7d, 0);
    const totalPnl30d = chainPortfolios.reduce((sum, p) => sum + p.pnl30d, 0);
    const totalPnlAllTime = chainPortfolios.reduce((sum, p) => sum + p.pnlAllTime, 0);

    // Calculate weighted average ROI
    const totalCostBasis = totalValueUsd - totalPnlAllTime;
    const roiAllTime = totalCostBasis > 0 ? totalPnlAllTime / totalCostBasis : 0;

    // Get top holding percentage for risk metrics
    const topHoldingPct = await this.getTopHoldingPercentage(walletAddress, chains);

    // Calculate weighted average concentration and diversification scores
    const avgConcentration = chainPortfolios.reduce(
      (sum, p) => sum + p.concentrationScore * p.totalValueUsd,
      0
    ) / totalValueUsd;

    const avgDiversification = chainPortfolios.reduce(
      (sum, p) => sum + p.diversificationScore * p.totalValueUsd,
      0
    ) / totalValueUsd;

    return {
      walletAddress,
      totalValueUsd,
      chains: chainPortfolios.map(p => ({
        chainId: p.chainId,
        valueUsd: p.totalValueUsd,
        tokenCount: p.tokenCount,
        protocolCount: p.protocolCount,
      })),
      performance: {
        pnl24h: totalPnl24h,
        pnl7d: totalPnl7d,
        pnl30d: totalPnl30d,
        pnlAllTime: totalPnlAllTime,
        roiAllTime,
      },
      risk: {
        concentrationScore: avgConcentration,
        diversificationScore: avgDiversification,
        topHoldingPct,
      },
      lastUpdated: chainPortfolios[0].lastUpdated,
    };
  }

  /**
   * Get portfolio data for each chain
   */
  async getChainPortfolios(
    walletAddress: string,
    chains?: string[]
  ): Promise<ChainPortfolio[]> {
    let sql = `
      SELECT 
        chain_id,
        total_value_usd,
        token_count,
        protocol_count,
        pnl_24h,
        pnl_7d,
        pnl_30d,
        pnl_all_time,
        roi_all_time,
        concentration_score,
        diversification_score,
        last_updated
      FROM wallet_portfolios
      WHERE wallet_address = $1
    `;

    const params: any[] = [walletAddress];

    if (chains && chains.length > 0) {
      sql += ` AND chain_id = ANY($2)`;
      params.push(chains);
    }

    sql += ` ORDER BY total_value_usd DESC`;

    const result = await query<ChainPortfolio>(sql, params);

    return result.rows.map(row => ({
      chainId: row.chain_id,
      totalValueUsd: parseFloat(row.total_value_usd as any),
      tokenCount: row.token_count,
      protocolCount: row.protocol_count,
      pnl24h: parseFloat(row.pnl_24h as any),
      pnl7d: parseFloat(row.pnl_7d as any),
      pnl30d: parseFloat(row.pnl_30d as any),
      pnlAllTime: parseFloat(row.pnl_all_time as any),
      roiAllTime: parseFloat(row.roi_all_time as any),
      concentrationScore: parseFloat(row.concentration_score as any),
      diversificationScore: parseFloat(row.diversification_score as any),
      lastUpdated: row.last_updated as any,
    }));
  }

  /**
   * Get top holding percentage across all chains
   */
  async getTopHoldingPercentage(
    walletAddress: string,
    chains?: string[]
  ): Promise<number> {
    let sql = `
      SELECT 
        MAX(wh.value_usd) AS top_holding_value,
        SUM(wp.total_value_usd) AS total_portfolio_value
      FROM wallet_holdings wh
      JOIN wallet_portfolios wp ON wh.portfolio_id = wp.id
      WHERE wp.wallet_address = $1
    `;

    const params: any[] = [walletAddress];

    if (chains && chains.length > 0) {
      sql += ` AND wp.chain_id = ANY($2)`;
      params.push(chains);
    }

    const result = await query<{
      top_holding_value: string;
      total_portfolio_value: string;
    }>(sql, params);

    if (result.rows.length === 0 || !result.rows[0].top_holding_value) {
      return 0;
    }

    const topHoldingValue = parseFloat(result.rows[0].top_holding_value);
    const totalPortfolioValue = parseFloat(result.rows[0].total_portfolio_value);

    return totalPortfolioValue > 0 ? (topHoldingValue / totalPortfolioValue) * 100 : 0;
  }

  /**
   * Get total portfolio value across all chains
   */
  async getTotalValue(walletAddress: string, chains?: string[]): Promise<number> {
    const summary = await this.getPortfolioSummary(walletAddress, chains);
    return summary.totalValueUsd;
  }

  /**
   * Get portfolio count (number of chains with holdings)
   */
  async getPortfolioCount(walletAddress: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS count
      FROM wallet_portfolios
      WHERE wallet_address = $1
    `;

    const result = await query<{ count: string }>(sql, [walletAddress]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Check if wallet has any portfolio
   */
  async hasPortfolio(walletAddress: string): Promise<boolean> {
    const count = await this.getPortfolioCount(walletAddress);
    return count > 0;
  }
}

