/**
 * Smart Money API Handlers
 * Story: 3.1.1 - Smart Money Identification
 * Enhancement 1: Redis Caching Layer
 * Enhancement 4: Monitoring Integration
 */

import { Request, Response } from 'hyper-express';
import { query } from '../../../analytics/db/connection';
import { validateGetSmartMoneyWalletsQuery } from './validation';
import { SmartMoneyCache } from '../../../analytics/services/smart-money-cache';
import { MonitoringService } from '../../../analytics/services/monitoring-service';

interface SmartMoneyWallet {
  walletAddress: string;
  chainId: string;
  walletName: string;
  walletType: string;
  discoveryMethod: string;
  verified: boolean;
  smartMoneyScore: number;
  confidenceLevel: string;
  totalPnl: number;
  roiAllTime: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  avgTradeSize: number;
  avgHoldingPeriodDays: number;
  lastTradeTimestamp: Date;
  tradingStyle: string;
  riskProfile: string;
  preferredTokens: string[];
  preferredProtocols: string[];
  firstSeen: Date;
  lastUpdated: Date;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * GET /v1/analytics/smart-money/wallets
 *
 * List smart money wallets with filtering, sorting, and pagination
 * Enhancement 1: Redis caching layer
 */
export async function getSmartMoneyWallets(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    // Validate and parse query parameters
    const params = validateGetSmartMoneyWalletsQuery(req);

    // Try to get from cache first
    const cache = SmartMoneyCache.getInstance();
    const cachedData = await cache.getWalletList(params);

    if (cachedData) {
      // Set cache headers (5 minutes)
      const cacheMaxAge = 5 * 60;
      const expiresDate = new Date(Date.now() + cacheMaxAge * 1000);
      res.setHeader('Expires', expiresDate.toUTCString());
      res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}`);
      res.setHeader('X-Cache', 'HIT');

      // Record API metrics
      const responseTime = Date.now() - startTime;
      const monitoring = MonitoringService.getInstance();
      await monitoring.recordAPIRequest(responseTime, false);

      res.status(200).json(cachedData);
      return;
    }

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
    const sortFieldMap: Record<string, string> = {
      score: 'smart_money_score',
      roi: 'roi_all_time',
      pnl: 'total_pnl',
      trades: 'total_trades',
    };
    const sortField = sortFieldMap[params.sortBy!];
    const sortOrder = params.sortOrder!.toUpperCase();
    const orderByClause = `ORDER BY ${sortField} ${sortOrder}`;

    // Calculate pagination
    const limit = params.limit!;
    const offset = (params.page! - 1) * limit;

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM smart_money_wallets ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    // Get paginated results
    const walletsResult = await query<SmartMoneyWallet>(
      `SELECT 
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
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const wallets = walletsResult.rows;

    // Build response
    const response = {
      data: wallets,
      pagination: {
        page: params.page!,
        limit: params.limit!,
        total,
        totalPages,
      },
    };

    // Cache the response
    await cache.setWalletList(params, response);

    // Set cache headers (5 minutes)
    const cacheMaxAge = 5 * 60; // 5 minutes in seconds
    const expiresDate = new Date(Date.now() + cacheMaxAge * 1000);
    res.setHeader('Expires', expiresDate.toUTCString());
    res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}`);
    res.setHeader('X-Cache', 'MISS');

    // Record API metrics
    const responseTime = Date.now() - startTime;
    const monitoring = MonitoringService.getInstance();
    await monitoring.recordAPIRequest(responseTime, false);

    // Send response
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error in getSmartMoneyWallets:', error);

    // Record API error
    const responseTime = Date.now() - startTime;
    const monitoring = MonitoringService.getInstance();
    await monitoring.recordAPIRequest(responseTime, true);

    // Handle validation errors
    if (error.message.includes('must be')) {
      res.status(400).json({
        error: 'Validation Error',
        message: error.message,
      });
      return;
    }

    // Handle other errors
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch smart money wallets',
    });
  }
}

