/**
 * Asset Allocation Engine
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * Provides asset allocation breakdown by token, protocol, chain, and category.
 */

import { query } from '../db/connection';

export interface AllocationItem {
  name: string;
  valueUsd: number;
  allocationPct: number;
  tokenCount?: number;
  holdings?: number;
}

export interface AllocationBreakdown {
  walletAddress: string;
  groupBy: 'token' | 'protocol' | 'chain' | 'category';
  allocation: AllocationItem[];
  totalValueUsd: number;
}

export interface HoldingDetail {
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  chainId: string;
  balance: number;
  valueUsd: number;
  allocationPct: number;
  protocolId: string | null;
  positionType: string;
  unrealizedPnl: number;
  roi: number;
  lastUpdated: string;
}

/**
 * Asset Allocation Engine
 * Singleton pattern for efficient resource management
 */
export class AssetAllocationEngine {
  private static instance: AssetAllocationEngine;

  private constructor() {}

  public static getInstance(): AssetAllocationEngine {
    if (!AssetAllocationEngine.instance) {
      AssetAllocationEngine.instance = new AssetAllocationEngine();
    }
    return AssetAllocationEngine.instance;
  }

  /**
   * Get asset allocation breakdown
   */
  async getAllocation(
    walletAddress: string,
    groupBy: 'token' | 'protocol' | 'chain' | 'category',
    minAllocation?: number
  ): Promise<AllocationBreakdown> {
    let allocation: AllocationItem[];

    switch (groupBy) {
      case 'token':
        allocation = await this.getAllocationByToken(walletAddress, minAllocation);
        break;
      case 'protocol':
        allocation = await this.getAllocationByProtocol(walletAddress, minAllocation);
        break;
      case 'chain':
        allocation = await this.getAllocationByChain(walletAddress, minAllocation);
        break;
      case 'category':
        allocation = await this.getAllocationByCategory(walletAddress, minAllocation);
        break;
      default:
        throw new Error(`Invalid groupBy: ${groupBy}`);
    }

    const totalValueUsd = allocation.reduce((sum, item) => sum + item.valueUsd, 0);

    return {
      walletAddress,
      groupBy,
      allocation,
      totalValueUsd,
    };
  }

  /**
   * Get allocation by token
   */
  async getAllocationByToken(
    walletAddress: string,
    minAllocation?: number
  ): Promise<AllocationItem[]> {
    let sql = `
      SELECT 
        wh.token_symbol AS name,
        SUM(wh.value_usd) AS value_usd,
        COUNT(*) AS holdings
      FROM wallet_holdings wh
      JOIN wallet_portfolios wp ON wh.portfolio_id = wp.id
      WHERE wp.wallet_address = $1
      GROUP BY wh.token_symbol
    `;

    const params: any[] = [walletAddress];

    if (minAllocation !== undefined) {
      sql += ` HAVING (SUM(wh.value_usd) / (SELECT SUM(total_value_usd) FROM wallet_portfolios WHERE wallet_address = $1)) * 100 >= $2`;
      params.push(minAllocation);
    }

    sql += ` ORDER BY value_usd DESC`;

    const result = await query<{
      name: string;
      value_usd: string;
      holdings: string;
    }>(sql, params);

    const totalValue = result.rows.reduce((sum, row) => sum + parseFloat(row.value_usd), 0);

    return result.rows.map(row => ({
      name: row.name,
      valueUsd: parseFloat(row.value_usd),
      allocationPct: totalValue > 0 ? (parseFloat(row.value_usd) / totalValue) * 100 : 0,
      holdings: parseInt(row.holdings),
    }));
  }

  /**
   * Get allocation by protocol
   */
  async getAllocationByProtocol(
    walletAddress: string,
    minAllocation?: number
  ): Promise<AllocationItem[]> {
    let sql = `
      SELECT 
        COALESCE(wh.protocol_id, 'wallet') AS name,
        SUM(wh.value_usd) AS value_usd,
        COUNT(DISTINCT wh.token_symbol) AS token_count,
        COUNT(*) AS holdings
      FROM wallet_holdings wh
      JOIN wallet_portfolios wp ON wh.portfolio_id = wp.id
      WHERE wp.wallet_address = $1
      GROUP BY COALESCE(wh.protocol_id, 'wallet')
    `;

    const params: any[] = [walletAddress];

    if (minAllocation !== undefined) {
      sql += ` HAVING (SUM(wh.value_usd) / (SELECT SUM(total_value_usd) FROM wallet_portfolios WHERE wallet_address = $1)) * 100 >= $2`;
      params.push(minAllocation);
    }

    sql += ` ORDER BY value_usd DESC`;

    const result = await query<{
      name: string;
      value_usd: string;
      token_count: string;
      holdings: string;
    }>(sql, params);

    const totalValue = result.rows.reduce((sum, row) => sum + parseFloat(row.value_usd), 0);

    return result.rows.map(row => ({
      name: row.name,
      valueUsd: parseFloat(row.value_usd),
      allocationPct: totalValue > 0 ? (parseFloat(row.value_usd) / totalValue) * 100 : 0,
      tokenCount: parseInt(row.token_count),
      holdings: parseInt(row.holdings),
    }));
  }

  /**
   * Get allocation by chain
   */
  async getAllocationByChain(
    walletAddress: string,
    minAllocation?: number
  ): Promise<AllocationItem[]> {
    let sql = `
      SELECT 
        wp.chain_id AS name,
        wp.total_value_usd AS value_usd,
        wp.token_count,
        wp.protocol_count AS holdings
      FROM wallet_portfolios wp
      WHERE wp.wallet_address = $1
    `;

    const params: any[] = [walletAddress];

    if (minAllocation !== undefined) {
      sql += ` AND (wp.total_value_usd / (SELECT SUM(total_value_usd) FROM wallet_portfolios WHERE wallet_address = $1)) * 100 >= $2`;
      params.push(minAllocation);
    }

    sql += ` ORDER BY value_usd DESC`;

    const result = await query<{
      name: string;
      value_usd: string;
      token_count: string;
      holdings: string;
    }>(sql, params);

    const totalValue = result.rows.reduce((sum, row) => sum + parseFloat(row.value_usd), 0);

    return result.rows.map(row => ({
      name: row.name,
      valueUsd: parseFloat(row.value_usd),
      allocationPct: totalValue > 0 ? (parseFloat(row.value_usd) / totalValue) * 100 : 0,
      tokenCount: parseInt(row.token_count),
      holdings: parseInt(row.holdings),
    }));
  }

  /**
   * Get allocation by category (DeFi, Stablecoin, etc.)
   */
  async getAllocationByCategory(
    walletAddress: string,
    minAllocation?: number
  ): Promise<AllocationItem[]> {
    // Categorize tokens based on symbol
    const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'LUSD'];
    const defiTokens = ['UNI', 'AAVE', 'CRV', 'SNX', 'MKR', 'COMP', 'SUSHI', 'GMX'];

    let sql = `
      SELECT 
        CASE 
          WHEN wh.token_symbol = ANY($2) THEN 'Stablecoin'
          WHEN wh.token_symbol = ANY($3) THEN 'DeFi'
          WHEN wh.token_symbol IN ('WETH', 'ETH', 'WBTC', 'BTC') THEN 'Blue Chip'
          ELSE 'Other'
        END AS name,
        SUM(wh.value_usd) AS value_usd,
        COUNT(DISTINCT wh.token_symbol) AS token_count,
        COUNT(*) AS holdings
      FROM wallet_holdings wh
      JOIN wallet_portfolios wp ON wh.portfolio_id = wp.id
      WHERE wp.wallet_address = $1
      GROUP BY name
    `;

    const params: any[] = [walletAddress, stablecoins, defiTokens];

    if (minAllocation !== undefined) {
      sql += ` HAVING (SUM(wh.value_usd) / (SELECT SUM(total_value_usd) FROM wallet_portfolios WHERE wallet_address = $1)) * 100 >= $4`;
      params.push(minAllocation);
    }

    sql += ` ORDER BY value_usd DESC`;

    const result = await query<{
      name: string;
      value_usd: string;
      token_count: string;
      holdings: string;
    }>(sql, params);

    const totalValue = result.rows.reduce((sum, row) => sum + parseFloat(row.value_usd), 0);

    return result.rows.map(row => ({
      name: row.name,
      valueUsd: parseFloat(row.value_usd),
      allocationPct: totalValue > 0 ? (parseFloat(row.value_usd) / totalValue) * 100 : 0,
      tokenCount: parseInt(row.token_count),
      holdings: parseInt(row.holdings),
    }));
  }

  /**
   * Get detailed holdings for a wallet
   */
  async getHoldings(
    walletAddress: string,
    options?: {
      chains?: string[];
      minValue?: number;
      page?: number;
      limit?: number;
    }
  ): Promise<{ holdings: HoldingDetail[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        wh.token_symbol,
        wh.token_name,
        wh.token_address,
        wp.chain_id,
        wh.balance,
        wh.value_usd,
        wh.allocation_pct,
        wh.protocol_id,
        wh.position_type,
        wh.unrealized_pnl,
        wh.roi,
        wh.last_updated
      FROM wallet_holdings wh
      JOIN wallet_portfolios wp ON wh.portfolio_id = wp.id
      WHERE wp.wallet_address = $1
    `;

    const params: any[] = [walletAddress];
    let paramIndex = 2;

    if (options?.chains && options.chains.length > 0) {
      sql += ` AND wp.chain_id = ANY($${paramIndex})`;
      params.push(options.chains);
      paramIndex++;
    }

    if (options?.minValue !== undefined) {
      sql += ` AND wh.value_usd >= $${paramIndex}`;
      params.push(options.minValue);
      paramIndex++;
    }

    sql += ` ORDER BY wh.value_usd DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query<any>(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(*) AS total
      FROM wallet_holdings wh
      JOIN wallet_portfolios wp ON wh.portfolio_id = wp.id
      WHERE wp.wallet_address = $1
    `;

    const countParams: any[] = [walletAddress];
    let countParamIndex = 2;

    if (options?.chains && options.chains.length > 0) {
      countSql += ` AND wp.chain_id = ANY($${countParamIndex})`;
      countParams.push(options.chains);
      countParamIndex++;
    }

    if (options?.minValue !== undefined) {
      countSql += ` AND wh.value_usd >= $${countParamIndex}`;
      countParams.push(options.minValue);
    }

    const countResult = await query<{ total: string }>(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    return {
      holdings: result.rows.map(row => ({
        tokenSymbol: row.token_symbol,
        tokenName: row.token_name,
        tokenAddress: row.token_address,
        chainId: row.chain_id,
        balance: parseFloat(row.balance),
        valueUsd: parseFloat(row.value_usd),
        allocationPct: parseFloat(row.allocation_pct),
        protocolId: row.protocol_id,
        positionType: row.position_type,
        unrealizedPnl: parseFloat(row.unrealized_pnl),
        roi: parseFloat(row.roi),
        lastUpdated: row.last_updated,
      })),
      total,
    };
  }
}

