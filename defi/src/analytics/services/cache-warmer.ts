/**
 * Cache Warmer Service
 * Story: 3.1.1 - Smart Money Identification (Enhancement 1)
 * 
 * Pre-populate cache on server startup to avoid cold start
 * - Warm popular queries (top wallets, high scores, verified wallets)
 * - Configurable warming strategies
 * - Run on server startup
 */

import { query } from '../db/connection';
import { SmartMoneyCache } from './smart-money-cache';

interface WarmingStrategy {
  name: string;
  params: {
    chains?: string[];
    minScore?: number;
    verified?: boolean;
    walletType?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  };
}

interface WarmingStats {
  totalStrategies: number;
  successfulWarmings: number;
  failedWarmings: number;
  duration: number;
  timestamp: Date;
}

/**
 * CacheWarmer - Pre-populate cache on startup
 */
export class CacheWarmer {
  private static instance: CacheWarmer;
  private cache: SmartMoneyCache;

  // Default warming strategies
  private readonly DEFAULT_STRATEGIES: WarmingStrategy[] = [
    // Top wallets (default view)
    {
      name: 'Top Wallets - Default',
      params: {
        sortBy: 'score',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      },
    },
    // High score wallets
    {
      name: 'High Score Wallets',
      params: {
        minScore: 90,
        sortBy: 'score',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      },
    },
    // Verified wallets
    {
      name: 'Verified Wallets',
      params: {
        verified: true,
        sortBy: 'score',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      },
    },
    // Whale wallets
    {
      name: 'Whale Wallets',
      params: {
        walletType: 'whale',
        sortBy: 'pnl',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      },
    },
    // Fund wallets
    {
      name: 'Fund Wallets',
      params: {
        walletType: 'fund',
        sortBy: 'score',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      },
    },
    // Top ROI wallets
    {
      name: 'Top ROI Wallets',
      params: {
        sortBy: 'roi',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      },
    },
    // Top PnL wallets
    {
      name: 'Top PnL Wallets',
      params: {
        sortBy: 'pnl',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      },
    },
    // Most active traders
    {
      name: 'Most Active Traders',
      params: {
        sortBy: 'trades',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      },
    },
  ];

  private constructor() {
    this.cache = SmartMoneyCache.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheWarmer {
    if (!CacheWarmer.instance) {
      CacheWarmer.instance = new CacheWarmer();
    }
    return CacheWarmer.instance;
  }

  /**
   * Warm cache with default strategies
   */
  public async warmCache(strategies?: WarmingStrategy[]): Promise<WarmingStats> {
    const startTime = Date.now();
    const warmingStrategies = strategies || this.DEFAULT_STRATEGIES;

    console.log(`🔥 Starting cache warming (${warmingStrategies.length} strategies)...`);

    let successfulWarmings = 0;
    let failedWarmings = 0;

    for (const strategy of warmingStrategies) {
      try {
        await this.warmStrategy(strategy);
        successfulWarmings++;
        console.log(`  ✅ ${strategy.name}`);
      } catch (error: any) {
        failedWarmings++;
        console.error(`  ❌ ${strategy.name}: ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;
    const stats: WarmingStats = {
      totalStrategies: warmingStrategies.length,
      successfulWarmings,
      failedWarmings,
      duration,
      timestamp: new Date(),
    };

    console.log(`🔥 Cache warming completed in ${duration}ms`);
    console.log(`   ✅ Successful: ${successfulWarmings}`);
    console.log(`   ❌ Failed: ${failedWarmings}`);

    return stats;
  }

  /**
   * Warm cache for a specific strategy
   */
  private async warmStrategy(strategy: WarmingStrategy): Promise<void> {
    const params = strategy.params;

    // Build WHERE clause
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filter by chains
    if (params.chains && params.chains.length > 0) {
      whereClauses.push(`chain_id = ANY($${paramIndex})`);
      queryParams.push(params.chains);
      paramIndex++;
    }

    // Filter by minScore
    if (params.minScore !== undefined) {
      whereClauses.push(`smart_money_score >= $${paramIndex}`);
      queryParams.push(params.minScore);
      paramIndex++;
    }

    // Filter by verified
    if (params.verified !== undefined) {
      whereClauses.push(`verified = $${paramIndex}`);
      queryParams.push(params.verified);
      paramIndex++;
    }

    // Filter by walletType
    if (params.walletType) {
      whereClauses.push(`wallet_type = $${paramIndex}`);
      queryParams.push(params.walletType);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Build ORDER BY clause
    const sortBy = params.sortBy || 'smart_money_score';
    const sortOrder = params.sortOrder || 'desc';
    const sortColumn = this.getSortColumn(sortBy);
    const orderByClause = `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

    // Pagination
    const limit = params.limit || 20;
    const page = params.page || 1;
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM smart_money_wallets ${whereClause}`;
    const countResult = await query<{ count: string }>(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get wallets
    const walletsQuery = `
      SELECT 
        wallet_address,
        chain_id,
        wallet_name,
        wallet_type,
        discovery_method,
        verified,
        smart_money_score,
        confidence_level,
        total_pnl,
        roi_all_time,
        win_rate,
        sharpe_ratio,
        max_drawdown,
        total_trades,
        avg_trade_size,
        avg_holding_period_days,
        last_trade_timestamp,
        trading_style,
        risk_profile,
        preferred_tokens,
        preferred_protocols,
        first_seen,
        last_updated
      FROM smart_money_wallets
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const walletsResult = await query<any>(walletsQuery, [...queryParams, limit, offset]);

    const wallets = walletsResult.rows.map((row: any) => ({
      walletAddress: row.wallet_address,
      chainId: row.chain_id,
      walletName: row.wallet_name,
      walletType: row.wallet_type,
      discoveryMethod: row.discovery_method,
      verified: row.verified,
      smartMoneyScore: parseFloat(row.smart_money_score),
      confidenceLevel: row.confidence_level,
      totalPnl: parseFloat(row.total_pnl),
      roiAllTime: parseFloat(row.roi_all_time),
      winRate: parseFloat(row.win_rate),
      sharpeRatio: parseFloat(row.sharpe_ratio),
      maxDrawdown: parseFloat(row.max_drawdown),
      totalTrades: parseInt(row.total_trades, 10),
      avgTradeSize: parseFloat(row.avg_trade_size),
      avgHoldingPeriodDays: parseFloat(row.avg_holding_period_days),
      lastTradeTimestamp: row.last_trade_timestamp,
      tradingStyle: row.trading_style,
      riskProfile: row.risk_profile,
      preferredTokens: row.preferred_tokens,
      preferredProtocols: row.preferred_protocols,
      firstSeen: row.first_seen,
      lastUpdated: row.last_updated,
    }));

    const totalPages = Math.ceil(total / limit);

    const response = {
      data: wallets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    // Cache the response
    await this.cache.setWalletList(params, response);
  }

  /**
   * Get database column name for sort field
   */
  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      score: 'smart_money_score',
      roi: 'roi_all_time',
      pnl: 'total_pnl',
      trades: 'total_trades',
    };

    return columnMap[sortBy] || 'smart_money_score';
  }
}

