/**
 * Portfolio Refresh Job
 * Enhancement 3: Background Refresh Job for Cross-chain Portfolio
 * 
 * Auto-refreshes portfolio data every 5 minutes:
 * - Fetches real-time prices from DeFiLlama API
 * - Recalculates portfolio breakdowns
 * - Updates database
 * - Invalidates cache
 * 
 * Ensures data freshness <5 minutes
 */

import { query } from '../db/connection';
import { PriceFetcher } from '../services/price-fetcher';
import { PortfolioCache } from '../services/portfolio-cache';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 10; // Process 10 users at a time

interface PortfolioRow {
  id: string;
  user_id: string;
  wallet_addresses: Record<string, string[]>;
  total_net_worth_usd: string;
  total_assets: number;
  total_chains: number;
  total_wallets: number;
}

interface AssetRow {
  id: string;
  portfolio_id: string;
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
}

/**
 * PortfolioRefreshJob - Background job for refreshing portfolio data
 */
export class PortfolioRefreshJob {
  private static instance: PortfolioRefreshJob;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private priceFetcher: PriceFetcher;
  private portfolioCache: PortfolioCache;

  private constructor() {
    this.priceFetcher = PriceFetcher.getInstance();
    this.portfolioCache = PortfolioCache.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PortfolioRefreshJob {
    if (!PortfolioRefreshJob.instance) {
      PortfolioRefreshJob.instance = new PortfolioRefreshJob();
    }
    return PortfolioRefreshJob.instance;
  }

  /**
   * Start the background job
   */
  public start(): void {
    if (this.intervalId) {
      console.log('Portfolio refresh job already running');
      return;
    }

    console.log('Starting portfolio refresh job (interval: 5 minutes)');

    // Run immediately on start
    this.refresh().catch((error) => {
      console.error('Error in initial portfolio refresh:', error);
    });

    // Then run every 5 minutes
    this.intervalId = setInterval(() => {
      this.refresh().catch((error) => {
        console.error('Error in portfolio refresh:', error);
      });
    }, REFRESH_INTERVAL);
  }

  /**
   * Stop the background job
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Portfolio refresh job stopped');
    }
  }

  /**
   * Refresh portfolio data for all users
   */
  private async refresh(): Promise<void> {
    if (this.isRunning) {
      console.log('Portfolio refresh already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[Portfolio Refresh] Starting refresh...');

      // Get all portfolios
      const portfoliosResult = await query<PortfolioRow>(
        'SELECT id, user_id, wallet_addresses, total_net_worth_usd, total_assets, total_chains, total_wallets FROM cross_chain_portfolios ORDER BY user_id'
      );

      const portfolios = portfoliosResult.rows;
      console.log(`[Portfolio Refresh] Found ${portfolios.length} portfolios to refresh`);

      if (portfolios.length === 0) {
        console.log('[Portfolio Refresh] No portfolios to refresh');
        return;
      }

      // Process in batches
      let refreshedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < portfolios.length; i += BATCH_SIZE) {
        const batch = portfolios.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (portfolio) => {
            try {
              await this.refreshPortfolio(portfolio);
              refreshedCount++;
            } catch (error: any) {
              console.error(
                `[Portfolio Refresh] Error refreshing portfolio ${portfolio.user_id}:`,
                error.message
              );
              errorCount++;
            }
          })
        );

        console.log(
          `[Portfolio Refresh] Progress: ${Math.min(i + BATCH_SIZE, portfolios.length)}/${portfolios.length}`
        );
      }

      const duration = Date.now() - startTime;
      console.log(
        `[Portfolio Refresh] Completed in ${duration}ms - Refreshed: ${refreshedCount}, Errors: ${errorCount}`
      );
    } catch (error: any) {
      console.error('[Portfolio Refresh] Fatal error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Refresh a single portfolio
   */
  private async refreshPortfolio(portfolio: PortfolioRow): Promise<void> {
    // Get all assets for this portfolio
    const assetsResult = await query<AssetRow>(
      'SELECT * FROM cross_chain_assets WHERE portfolio_id = $1',
      [portfolio.id]
    );

    const assets = assetsResult.rows;

    if (assets.length === 0) {
      return; // No assets to refresh
    }

    // Fetch latest prices for all assets
    const tokens = assets.map((asset) => ({
      chainId: asset.chain_id,
      tokenAddress: asset.token_address,
    }));

    const prices = await this.priceFetcher.getPrices(tokens);

    // Update asset prices and balances
    let totalNetWorth = 0;
    const assetBreakdown: Record<string, number> = {};
    const chainBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};

    for (const asset of assets) {
      const priceKey = `${asset.chain_id}:${asset.token_address || 'native'}`;
      const newPrice = prices[priceKey];

      if (newPrice) {
        const balance = parseFloat(asset.balance);
        const newBalanceUsd = balance * newPrice;
        const costBasis = parseFloat(asset.cost_basis_usd);
        const unrealizedPnl = newBalanceUsd - costBasis;
        const roi = costBasis > 0 ? unrealizedPnl / costBasis : 0;

        // Update asset in database
        await query(
          `UPDATE cross_chain_assets 
           SET price_usd = $1, balance_usd = $2, unrealized_pnl = $3, roi = $4, last_updated = NOW()
           WHERE id = $5`,
          [newPrice, newBalanceUsd, unrealizedPnl, roi, asset.id]
        );

        // Accumulate breakdowns
        totalNetWorth += newBalanceUsd;
        assetBreakdown[asset.token_symbol] =
          (assetBreakdown[asset.token_symbol] || 0) + newBalanceUsd;
        chainBreakdown[asset.chain_id] =
          (chainBreakdown[asset.chain_id] || 0) + newBalanceUsd;
        categoryBreakdown[asset.category] =
          (categoryBreakdown[asset.category] || 0) + newBalanceUsd;
      }
    }

    // Calculate total P&L and ROI
    const totalCostBasis = assets.reduce(
      (sum, asset) => sum + parseFloat(asset.cost_basis_usd),
      0
    );
    const totalPnl = totalNetWorth - totalCostBasis;
    const totalRoi = totalCostBasis > 0 ? totalPnl / totalCostBasis : 0;

    // Update portfolio in database
    await query(
      `UPDATE cross_chain_portfolios 
       SET total_net_worth_usd = $1, 
           asset_breakdown = $2, 
           chain_breakdown = $3, 
           category_breakdown = $4,
           total_pnl_usd = $5,
           total_roi = $6,
           last_updated = NOW()
       WHERE id = $7`,
      [
        totalNetWorth,
        JSON.stringify(assetBreakdown),
        JSON.stringify(chainBreakdown),
        JSON.stringify(categoryBreakdown),
        totalPnl,
        totalRoi,
        portfolio.id,
      ]
    );

    // Invalidate cache for this user
    await this.portfolioCache.invalidateUser(portfolio.user_id);
  }

  /**
   * Get job status
   */
  public getStatus(): {
    isRunning: boolean;
    intervalId: NodeJS.Timeout | null;
  } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId,
    };
  }
}

