/**
 * Wallet Scoring Background Job
 * Story: 3.1.1 - Smart Money Identification (Enhancement 2)
 * 
 * Auto-refreshes smart money scores every 15 minutes
 * - Batch process wallets
 * - Update scores and confidence levels
 * - Invalidate caches
 * - Ensure data freshness <15 minutes
 */

import { query } from '../db/connection';
import { SmartMoneyScorer, WalletData } from '../engines/smart-money-scorer';
import { SmartMoneyCache } from '../services/smart-money-cache';

interface WalletScoringJobOptions {
  batchSize?: number;
  intervalMinutes?: number;
}

interface WalletScoringStats {
  totalWallets: number;
  walletsProcessed: number;
  walletsUpdated: number;
  walletsFailed: number;
  duration: number;
  timestamp: Date;
}

/**
 * WalletScoringJob - Background job for refreshing smart money scores
 */
export class WalletScoringJob {
  private static instance: WalletScoringJob;
  private scorer: SmartMoneyScorer;
  private cache: SmartMoneyCache;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  // Default configuration
  private readonly DEFAULT_BATCH_SIZE = 50;
  private readonly DEFAULT_INTERVAL_MINUTES = 15;

  private constructor() {
    this.scorer = SmartMoneyScorer.getInstance();
    this.cache = SmartMoneyCache.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WalletScoringJob {
    if (!WalletScoringJob.instance) {
      WalletScoringJob.instance = new WalletScoringJob();
    }
    return WalletScoringJob.instance;
  }

  /**
   * Start the background job
   */
  public start(options?: WalletScoringJobOptions): void {
    if (this.intervalId) {
      console.log('Wallet scoring job is already running');
      return;
    }

    const intervalMinutes = options?.intervalMinutes || this.DEFAULT_INTERVAL_MINUTES;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`Starting wallet scoring job (interval: ${intervalMinutes} minutes)`);

    // Run immediately on start
    this.runJob(options).catch(error => {
      console.error('Error in initial wallet scoring job run:', error);
    });

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runJob(options).catch(error => {
        console.error('Error in wallet scoring job:', error);
      });
    }, intervalMs);
  }

  /**
   * Stop the background job
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Wallet scoring job stopped');
    }
  }

  /**
   * Run the scoring job once
   */
  public async runJob(options?: WalletScoringJobOptions): Promise<WalletScoringStats> {
    if (this.isRunning) {
      console.log('Wallet scoring job is already running, skipping this run');
      return {
        totalWallets: 0,
        walletsProcessed: 0,
        walletsUpdated: 0,
        walletsFailed: 0,
        duration: 0,
        timestamp: new Date(),
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const batchSize = options?.batchSize || this.DEFAULT_BATCH_SIZE;

    console.log(`Running wallet scoring job (batch size: ${batchSize})`);

    try {
      // Get total wallet count
      const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM smart_money_wallets'
      );
      const totalWallets = parseInt(countResult.rows[0].count, 10);

      let walletsProcessed = 0;
      let walletsUpdated = 0;
      let walletsFailed = 0;
      let offset = 0;

      // Process wallets in batches
      while (offset < totalWallets) {
        const batch = await this.fetchWalletBatch(offset, batchSize);
        
        if (batch.length === 0) {
          break;
        }

        const batchResults = await this.processBatch(batch);
        walletsProcessed += batchResults.processed;
        walletsUpdated += batchResults.updated;
        walletsFailed += batchResults.failed;

        offset += batchSize;
      }

      // Invalidate all caches after scoring update
      await this.cache.invalidateAll();

      const duration = Date.now() - startTime;
      const stats: WalletScoringStats = {
        totalWallets,
        walletsProcessed,
        walletsUpdated,
        walletsFailed,
        duration,
        timestamp: new Date(),
      };

      console.log(`Wallet scoring job completed:`, stats);

      return stats;
    } catch (error: any) {
      console.error('Error in wallet scoring job:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch a batch of wallets from database
   */
  private async fetchWalletBatch(offset: number, limit: number): Promise<WalletData[]> {
    const result = await query<any>(
      `SELECT 
        wallet_address,
        chain_id,
        total_pnl,
        roi_all_time,
        win_rate,
        sharpe_ratio,
        max_drawdown,
        total_trades,
        avg_trade_size,
        avg_holding_period_days,
        trading_style,
        risk_profile,
        verified
      FROM smart_money_wallets
      ORDER BY wallet_address
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(row => ({
      walletAddress: row.wallet_address,
      chainId: row.chain_id,
      totalPnl: parseFloat(row.total_pnl),
      roiAllTime: parseFloat(row.roi_all_time),
      winRate: parseFloat(row.win_rate),
      sharpeRatio: parseFloat(row.sharpe_ratio),
      maxDrawdown: parseFloat(row.max_drawdown),
      totalTrades: parseInt(row.total_trades, 10),
      avgTradeSize: parseFloat(row.avg_trade_size),
      avgHoldingPeriodDays: parseFloat(row.avg_holding_period_days),
      tradingStyle: row.trading_style,
      riskProfile: row.risk_profile,
      verified: row.verified,
    }));
  }

  /**
   * Process a batch of wallets
   */
  private async processBatch(wallets: WalletData[]): Promise<{
    processed: number;
    updated: number;
    failed: number;
  }> {
    let processed = 0;
    let updated = 0;
    let failed = 0;

    for (const wallet of wallets) {
      try {
        // Calculate new score
        const score = this.scorer.calculateScore(wallet);

        // Update database
        await query(
          `UPDATE smart_money_wallets
          SET 
            smart_money_score = $1,
            confidence_level = $2,
            last_updated = NOW()
          WHERE wallet_address = $3`,
          [score.smartMoneyScore, score.confidenceLevel, wallet.walletAddress]
        );

        processed++;
        updated++;
      } catch (error: any) {
        console.error(`Error processing wallet ${wallet.walletAddress}:`, error.message);
        processed++;
        failed++;
      }
    }

    return { processed, updated, failed };
  }

  /**
   * Get job status
   */
  public getStatus(): {
    isRunning: boolean;
    isScheduled: boolean;
  } {
    return {
      isRunning: this.isRunning,
      isScheduled: this.intervalId !== null,
    };
  }
}

