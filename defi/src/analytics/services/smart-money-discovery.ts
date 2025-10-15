/**
 * Smart Money Discovery Service
 * Story: 3.1.1 - Smart Money Identification
 * 
 * Automated discovery of smart money wallets based on criteria:
 * - Min trades: 50
 * - Min history: 90 days
 * - Min ROI: 20%
 * - Min win rate: 55%
 * - Min trade size: $1,000
 * 
 * Note: MVP uses mock data. Production would integrate with blockchain indexers.
 */

import { SmartMoneyScorer, WalletData, SmartMoneyScore } from '../engines/smart-money-scorer';
import { query } from '../db/connection';

export interface DiscoveryOptions {
  minTrades?: number;
  minHistoryDays?: number;
  minROI?: number;
  minWinRate?: number;
  minTradeSize?: number;
  limit?: number;
}

export interface DiscoveredWallet extends WalletData {
  score: SmartMoneyScore;
  discoveryTimestamp: Date;
}

/**
 * SmartMoneyDiscovery - Service for discovering smart money wallets
 */
export class SmartMoneyDiscovery {
  private static instance: SmartMoneyDiscovery;
  private scorer: SmartMoneyScorer;

  // Default criteria
  private defaultCriteria = {
    minTrades: 50,
    minHistoryDays: 90,
    minROI: 0.20, // 20%
    minWinRate: 55.0,
    minTradeSize: 1000,
  };

  private constructor() {
    this.scorer = SmartMoneyScorer.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SmartMoneyDiscovery {
    if (!SmartMoneyDiscovery.instance) {
      SmartMoneyDiscovery.instance = new SmartMoneyDiscovery();
    }
    return SmartMoneyDiscovery.instance;
  }

  /**
   * Discover smart money wallets (MVP: uses mock data)
   */
  public async discoverWallets(options?: DiscoveryOptions): Promise<DiscoveredWallet[]> {
    const criteria = {
      ...this.defaultCriteria,
      ...options,
    };

    // Generate mock wallet data (MVP)
    const mockWallets = this.generateMockWallets(options?.limit || 100);

    // Filter by criteria
    const qualifiedWallets = mockWallets.filter(wallet =>
      this.meetsSmartMoneyCriteria(wallet, criteria)
    );

    // Calculate scores
    const discoveredWallets: DiscoveredWallet[] = qualifiedWallets.map(wallet => {
      const score = this.scorer.calculateScore(wallet);
      return {
        ...wallet,
        score,
        discoveryTimestamp: new Date(),
      };
    });

    // Sort by score (highest first)
    discoveredWallets.sort((a, b) => b.score.smartMoneyScore - a.score.smartMoneyScore);

    return discoveredWallets;
  }

  /**
   * Check if wallet meets smart money criteria
   */
  private meetsSmartMoneyCriteria(
    wallet: WalletData,
    criteria: Required<DiscoveryOptions>
  ): boolean {
    return (
      wallet.totalTrades >= criteria.minTrades &&
      wallet.roiAllTime >= criteria.minROI &&
      wallet.winRate >= criteria.minWinRate &&
      wallet.avgTradeSize >= criteria.minTradeSize
      // Note: minHistoryDays would require first_seen timestamp in production
    );
  }

  /**
   * Process wallet batch and store in database
   */
  public async processWalletBatch(wallets: DiscoveredWallet[]): Promise<number> {
    let insertedCount = 0;

    for (const wallet of wallets) {
      try {
        await query(
          `INSERT INTO smart_money_wallets (
            wallet_address, chain_id, wallet_name, wallet_type, discovery_method, verified,
            smart_money_score, confidence_level,
            total_pnl, roi_all_time, win_rate, sharpe_ratio, max_drawdown,
            total_trades, avg_trade_size, avg_holding_period_days, last_trade_timestamp,
            trading_style, risk_profile, preferred_tokens, preferred_protocols,
            first_seen
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
          )
          ON CONFLICT (wallet_address) DO UPDATE SET
            smart_money_score = EXCLUDED.smart_money_score,
            confidence_level = EXCLUDED.confidence_level,
            total_pnl = EXCLUDED.total_pnl,
            roi_all_time = EXCLUDED.roi_all_time,
            win_rate = EXCLUDED.win_rate,
            sharpe_ratio = EXCLUDED.sharpe_ratio,
            max_drawdown = EXCLUDED.max_drawdown,
            total_trades = EXCLUDED.total_trades,
            avg_trade_size = EXCLUDED.avg_trade_size,
            avg_holding_period_days = EXCLUDED.avg_holding_period_days,
            last_trade_timestamp = EXCLUDED.last_trade_timestamp,
            last_updated = NOW()`,
          [
            wallet.walletAddress,
            wallet.chainId,
            wallet.walletAddress.substring(0, 10) + '...',
            this.inferWalletType(wallet),
            'algorithm',
            false,
            wallet.score.smartMoneyScore,
            wallet.score.confidenceLevel,
            wallet.totalPnl,
            wallet.roiAllTime,
            wallet.winRate,
            wallet.sharpeRatio,
            wallet.maxDrawdown,
            wallet.totalTrades,
            wallet.avgTradeSize,
            wallet.avgHoldingPeriodDays,
            new Date(),
            wallet.tradingStyle || 'unknown',
            wallet.riskProfile || 'medium',
            [], // preferred_tokens
            [], // preferred_protocols
            new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // first_seen (1 year ago)
          ]
        );
        insertedCount++;
      } catch (error: any) {
        console.error(`Error inserting wallet ${wallet.walletAddress}:`, error.message);
      }
    }

    return insertedCount;
  }

  /**
   * Infer wallet type based on metrics
   */
  private inferWalletType(wallet: WalletData): string {
    if (wallet.avgTradeSize > 500000) return 'whale';
    if (wallet.totalTrades > 500) return 'trader';
    if (wallet.avgHoldingPeriodDays > 100) return 'fund';
    return 'trader';
  }

  /**
   * Generate mock wallet data (MVP only)
   * In production, this would query blockchain indexers
   */
  private generateMockWallets(count: number): WalletData[] {
    const wallets: WalletData[] = [];
    const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism'];
    const tradingStyles = ['swing_trading', 'momentum_trading', 'day_trading', 'position_trading', 'yield_farming'];
    const riskProfiles = ['low', 'medium', 'high'];

    for (let i = 0; i < count; i++) {
      const chainId = chains[Math.floor(Math.random() * chains.length)];
      const walletAddress = `0x${Math.random().toString(16).substring(2, 42)}`;

      // Generate random but realistic metrics
      const totalTrades = Math.floor(Math.random() * 1000) + 20;
      const winRate = Math.random() * 40 + 50; // 50-90%
      const roiAllTime = Math.random() * 2.5 + 0.3; // 30%-280%
      const sharpeRatio = Math.random() * 2.5 + 0.5; // 0.5-3.0
      const maxDrawdown = -(Math.random() * 0.4 + 0.05); // -5% to -45%
      const avgTradeSize = Math.random() * 900000 + 10000; // $10K-$910K
      const avgHoldingPeriodDays = Math.random() * 150 + 5; // 5-155 days
      const totalPnl = avgTradeSize * totalTrades * (roiAllTime - 1) * 0.1;

      wallets.push({
        walletAddress,
        chainId,
        totalPnl,
        roiAllTime,
        winRate,
        sharpeRatio,
        maxDrawdown,
        totalTrades,
        avgTradeSize,
        avgHoldingPeriodDays,
        tradingStyle: tradingStyles[Math.floor(Math.random() * tradingStyles.length)],
        riskProfile: riskProfiles[Math.floor(Math.random() * riskProfiles.length)],
        verified: false,
      });
    }

    return wallets;
  }

  /**
   * Get discovery statistics
   */
  public getDiscoveryStats(wallets: DiscoveredWallet[]): {
    total: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    avgScore: number;
  } {
    const highConfidence = wallets.filter(w => w.score.confidenceLevel === 'high').length;
    const mediumConfidence = wallets.filter(w => w.score.confidenceLevel === 'medium').length;
    const lowConfidence = wallets.filter(w => w.score.confidenceLevel === 'low').length;
    const avgScore = wallets.reduce((sum, w) => sum + w.score.smartMoneyScore, 0) / wallets.length;

    return {
      total: wallets.length,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      avgScore: Math.round(avgScore * 100) / 100,
    };
  }
}

