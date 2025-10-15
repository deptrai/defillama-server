/**
 * Cross-Chain Aggregation Engine
 * Story: 2.2.3 - Cross-chain Portfolio Aggregation
 * 
 * Aggregates wallet portfolio data across multiple blockchains into a unified view.
 * Provides breakdown calculations, transaction aggregation, and performance metrics.
 */

import { query } from '../db/connection';

// ============================================================================
// Interfaces
// ============================================================================

export interface CrossChainPortfolio {
  userId: string;
  walletAddresses: Record<string, string[]>; // { chainId: [addresses] }
  totalNetWorthUsd: number;
  netWorthChange24h: number;
  netWorthChange7d: number;
  netWorthChange30d: number;
  totalAssets: number;
  totalChains: number;
  totalWallets: number;
  assetBreakdown: Record<string, number>; // { tokenSymbol: valueUsd }
  chainBreakdown: Record<string, number>; // { chainId: valueUsd }
  categoryBreakdown: Record<string, number>; // { category: valueUsd }
  totalPnl: number;
  totalRoi: number;
  lastUpdated: string;
}

export interface CrossChainAsset {
  chainId: string;
  walletAddress: string;
  tokenAddress: string | null;
  tokenSymbol: string;
  tokenName: string;
  balance: number;
  balanceUsd: number;
  priceUsd: number;
  category: string;
  isNative: boolean;
  isWrapped: boolean;
  isBridged: boolean;
  costBasisUsd: number;
  unrealizedPnl: number;
  roi: number;
}

export interface CrossChainTransaction {
  chainId: string;
  walletAddress: string;
  txHash: string;
  timestamp: string;
  type: string; // 'transfer', 'swap', 'stake', 'unstake', 'claim'
  tokenSymbol: string;
  amount: number;
  valueUsd: number;
  from: string;
  to: string;
}

export interface PerformanceMetrics {
  totalPnl: number;
  totalRoi: number;
  pnlByChain: Record<string, number>;
  pnlByToken: Record<string, number>;
  bestPerformers: Array<{ tokenSymbol: string; roi: number; pnl: number }>;
  worstPerformers: Array<{ tokenSymbol: string; roi: number; pnl: number }>;
}

// ============================================================================
// CrossChainAggregationEngine Class
// ============================================================================

export class CrossChainAggregationEngine {
  private static instance: CrossChainAggregationEngine;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): CrossChainAggregationEngine {
    if (!CrossChainAggregationEngine.instance) {
      CrossChainAggregationEngine.instance = new CrossChainAggregationEngine();
    }
    return CrossChainAggregationEngine.instance;
  }

  /**
   * Get aggregated portfolio for a user
   */
  async getPortfolio(userId: string): Promise<CrossChainPortfolio> {
    const sql = `
      SELECT 
        user_id,
        wallet_addresses,
        total_net_worth_usd,
        net_worth_change_24h,
        net_worth_change_7d,
        net_worth_change_30d,
        total_assets,
        total_chains,
        total_wallets,
        asset_breakdown,
        chain_breakdown,
        category_breakdown,
        total_pnl_usd,
        total_roi,
        last_updated
      FROM cross_chain_portfolios
      WHERE user_id = $1
    `;

    const result = await query<{
      user_id: string;
      wallet_addresses: any;
      total_net_worth_usd: string;
      net_worth_change_24h: string;
      net_worth_change_7d: string;
      net_worth_change_30d: string;
      total_assets: number;
      total_chains: number;
      total_wallets: number;
      asset_breakdown: any;
      chain_breakdown: any;
      category_breakdown: any;
      total_pnl_usd: string;
      total_roi: string;
      last_updated: string;
    }>(sql, [userId]);

    if (result.rows.length === 0) {
      throw new Error(`No cross-chain portfolio found for user ${userId}`);
    }

    const row = result.rows[0];

    return {
      userId: row.user_id,
      walletAddresses: row.wallet_addresses,
      totalNetWorthUsd: parseFloat(row.total_net_worth_usd),
      netWorthChange24h: parseFloat(row.net_worth_change_24h),
      netWorthChange7d: parseFloat(row.net_worth_change_7d),
      netWorthChange30d: parseFloat(row.net_worth_change_30d),
      totalAssets: row.total_assets,
      totalChains: row.total_chains,
      totalWallets: row.total_wallets,
      assetBreakdown: row.asset_breakdown,
      chainBreakdown: row.chain_breakdown,
      categoryBreakdown: row.category_breakdown,
      totalPnl: parseFloat(row.total_pnl_usd),
      totalRoi: parseFloat(row.total_roi),
      lastUpdated: row.last_updated,
    };
  }

  /**
   * Get detailed assets across all chains
   */
  async getAssets(
    userId: string,
    options?: {
      chainId?: string;
      category?: string;
      minValueUsd?: number;
    }
  ): Promise<CrossChainAsset[]> {
    // First get portfolio_id
    const portfolioSql = `
      SELECT id FROM cross_chain_portfolios WHERE user_id = $1
    `;
    const portfolioResult = await query<{ id: string }>(portfolioSql, [userId]);

    if (portfolioResult.rows.length === 0) {
      throw new Error(`No cross-chain portfolio found for user ${userId}`);
    }

    const portfolioId = portfolioResult.rows[0].id;

    // Build assets query with filters
    let sql = `
      SELECT 
        chain_id,
        wallet_address,
        token_address,
        token_symbol,
        token_name,
        balance,
        balance_usd,
        price_usd,
        category,
        is_native,
        is_wrapped,
        is_bridged,
        cost_basis_usd,
        unrealized_pnl,
        roi
      FROM cross_chain_assets
      WHERE portfolio_id = $1
    `;

    const params: any[] = [portfolioId];
    let paramIndex = 2;

    if (options?.chainId) {
      sql += ` AND chain_id = $${paramIndex}`;
      params.push(options.chainId);
      paramIndex++;
    }

    if (options?.category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(options.category);
      paramIndex++;
    }

    if (options?.minValueUsd) {
      sql += ` AND balance_usd >= $${paramIndex}`;
      params.push(options.minValueUsd);
      paramIndex++;
    }

    sql += ` ORDER BY balance_usd DESC`;

    const result = await query<{
      chain_id: string;
      wallet_address: string;
      token_address: string | null;
      token_symbol: string;
      token_name: string;
      balance: string;
      balance_usd: string;
      price_usd: string;
      category: string;
      is_native: boolean;
      is_wrapped: boolean;
      is_bridged: boolean;
      cost_basis_usd: string;
      unrealized_pnl: string;
      roi: string;
    }>(sql, params);

    return result.rows.map(row => ({
      chainId: row.chain_id,
      walletAddress: row.wallet_address,
      tokenAddress: row.token_address,
      tokenSymbol: row.token_symbol,
      tokenName: row.token_name,
      balance: parseFloat(row.balance),
      balanceUsd: parseFloat(row.balance_usd),
      priceUsd: parseFloat(row.price_usd),
      category: row.category,
      isNative: row.is_native,
      isWrapped: row.is_wrapped,
      isBridged: row.is_bridged,
      costBasisUsd: parseFloat(row.cost_basis_usd),
      unrealizedPnl: parseFloat(row.unrealized_pnl),
      roi: parseFloat(row.roi),
    }));
  }

  /**
   * Get asset breakdown (top N assets by value)
   */
  async getAssetBreakdown(userId: string, limit: number = 10): Promise<Record<string, number>> {
    const portfolio = await this.getPortfolio(userId);
    return portfolio.assetBreakdown;
  }

  /**
   * Get chain breakdown (value distribution by chain)
   */
  async getChainBreakdown(userId: string): Promise<Record<string, number>> {
    const portfolio = await this.getPortfolio(userId);
    return portfolio.chainBreakdown;
  }

  /**
   * Get category breakdown (value distribution by category)
   */
  async getCategoryBreakdown(userId: string): Promise<Record<string, number>> {
    const portfolio = await this.getPortfolio(userId);
    return portfolio.categoryBreakdown;
  }

  /**
   * Get performance metrics across all chains
   */
  async getPerformanceMetrics(userId: string): Promise<PerformanceMetrics> {
    const assets = await this.getAssets(userId);

    // Calculate total P&L and ROI
    const totalPnl = assets.reduce((sum, asset) => sum + asset.unrealizedPnl, 0);
    const totalCostBasis = assets.reduce((sum, asset) => sum + asset.costBasisUsd, 0);
    const totalRoi = totalCostBasis > 0 ? totalPnl / totalCostBasis : 0;

    // Calculate P&L by chain
    const pnlByChain: Record<string, number> = {};
    assets.forEach(asset => {
      if (!pnlByChain[asset.chainId]) {
        pnlByChain[asset.chainId] = 0;
      }
      pnlByChain[asset.chainId] += asset.unrealizedPnl;
    });

    // Calculate P&L by token
    const pnlByToken: Record<string, number> = {};
    assets.forEach(asset => {
      if (!pnlByToken[asset.tokenSymbol]) {
        pnlByToken[asset.tokenSymbol] = 0;
      }
      pnlByToken[asset.tokenSymbol] += asset.unrealizedPnl;
    });

    // Get best and worst performers
    const performers = assets
      .map(asset => ({
        tokenSymbol: asset.tokenSymbol,
        roi: asset.roi,
        pnl: asset.unrealizedPnl,
      }))
      .sort((a, b) => b.roi - a.roi);

    const bestPerformers = performers.slice(0, 5);
    const worstPerformers = performers.slice(-5).reverse();

    return {
      totalPnl,
      totalRoi,
      pnlByChain,
      pnlByToken,
      bestPerformers,
      worstPerformers,
    };
  }

  /**
   * Get cross-chain transactions (mock data for MVP)
   * In production, this would aggregate from multiple chain indexers
   */
  async getCrossChainTransactions(
    userId: string,
    options?: {
      chainId?: string;
      type?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ transactions: CrossChainTransaction[]; total: number }> {
    // For MVP, return mock transaction data
    // In production, this would query a transactions table or external indexers

    const portfolio = await this.getPortfolio(userId);
    const mockTransactions: CrossChainTransaction[] = [];

    // Generate mock transactions based on user's assets
    const assets = await this.getAssets(userId);
    let txCount = 0;

    for (const asset of assets) {
      // Generate 2-3 mock transactions per asset
      const numTxs = Math.floor(Math.random() * 2) + 2;

      for (let i = 0; i < numTxs; i++) {
        const types = ['transfer', 'swap', 'stake', 'unstake', 'claim'];
        const type = types[Math.floor(Math.random() * types.length)];

        mockTransactions.push({
          chainId: asset.chainId,
          walletAddress: asset.walletAddress,
          txHash: `0x${txCount.toString(16).padStart(64, '0')}`,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          type,
          tokenSymbol: asset.tokenSymbol,
          amount: asset.balance * (Math.random() * 0.3 + 0.1), // 10-40% of balance
          valueUsd: asset.balanceUsd * (Math.random() * 0.3 + 0.1),
          from: asset.walletAddress,
          to: `0x${Math.random().toString(16).substring(2, 42)}`,
        });

        txCount++;
      }
    }

    // Sort by timestamp descending
    mockTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply filters
    let filtered = mockTransactions;

    if (options?.chainId) {
      filtered = filtered.filter(tx => tx.chainId === options.chainId);
    }

    if (options?.type) {
      filtered = filtered.filter(tx => tx.type === options.type);
    }

    // Apply pagination
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      transactions: paginated,
      total: filtered.length,
    };
  }

  /**
   * Compare portfolio performance across chains
   */
  async compareChainPerformance(userId: string): Promise<
    Array<{
      chainId: string;
      valueUsd: number;
      pnl: number;
      roi: number;
      assetCount: number;
    }>
  > {
    const assets = await this.getAssets(userId);
    const chainBreakdown = await this.getChainBreakdown(userId);

    const chainStats: Record<
      string,
      { valueUsd: number; pnl: number; costBasis: number; assetCount: number }
    > = {};

    assets.forEach(asset => {
      if (!chainStats[asset.chainId]) {
        chainStats[asset.chainId] = {
          valueUsd: 0,
          pnl: 0,
          costBasis: 0,
          assetCount: 0,
        };
      }

      chainStats[asset.chainId].valueUsd += asset.balanceUsd;
      chainStats[asset.chainId].pnl += asset.unrealizedPnl;
      chainStats[asset.chainId].costBasis += asset.costBasisUsd;
      chainStats[asset.chainId].assetCount++;
    });

    return Object.entries(chainStats).map(([chainId, stats]) => ({
      chainId,
      valueUsd: stats.valueUsd,
      pnl: stats.pnl,
      roi: stats.costBasis > 0 ? stats.pnl / stats.costBasis : 0,
      assetCount: stats.assetCount,
    }));
  }
}

