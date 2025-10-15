/**
 * Trade Pattern API Handlers
 * Story: 3.1.2 - Trade Pattern Analysis
 */

import { Request, Response } from 'hyper-express';
import { query } from '../../../analytics/db/connection';

interface WalletTrade {
  id: string;
  walletId: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  chainId: string;
  tradeType: string;
  tokenInAddress: string;
  tokenInSymbol: string;
  tokenInAmount: number;
  tokenInValueUsd: number;
  tokenOutAddress: string;
  tokenOutSymbol: string;
  tokenOutAmount: number;
  tokenOutValueUsd: number;
  protocolId: string;
  protocolName: string;
  dexName: string;
  tradeSizeUsd: number;
  gasFeeUsd: number;
  slippagePct: number;
  realizedPnl: number;
  unrealizedPnl: number;
  roi: number;
  holdingPeriodDays: number;
  tradePattern: string;
  tradeTiming: string;
  createdAt: Date;
}

interface TradePattern {
  id: string;
  walletId: string;
  patternType: string;
  patternName: string;
  confidenceScore: number;
  startTimestamp: Date;
  endTimestamp: Date;
  durationHours: number;
  tokenAddress: string;
  tokenSymbol: string;
  totalTrades: number;
  totalVolumeUsd: number;
  avgTradeSize: number;
  patternStatus: string;
  realizedPnl: number;
  roi: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /v1/analytics/smart-money/wallets/:address/patterns
 * 
 * Get trade patterns for a specific wallet
 */
export async function getWalletPatterns(req: Request, res: Response) {
  try {
    const { address } = req.path_parameters;
    const { 
      patternType, 
      token, 
      timeRange = '30d',
      sortBy = 'confidence',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Get wallet ID
    const walletResult = await query<{ id: string }>(
      'SELECT id FROM smart_money_wallets WHERE wallet_address = $1',
      [address]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
    }

    const walletId = walletResult.rows[0].id;

    // Build query
    let sql = 'SELECT * FROM trade_patterns WHERE wallet_id = $1';
    const params: any[] = [walletId];
    let paramIndex = 2;

    if (patternType) {
      sql += ` AND pattern_type = $${paramIndex}`;
      params.push(patternType);
      paramIndex++;
    }

    if (token) {
      sql += ` AND token_address = $${paramIndex}`;
      params.push(token);
      paramIndex++;
    }

    // Time range filter
    const timeRangeMap: Record<string, string> = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '1y': '1 year',
    };
    const interval = timeRangeMap[timeRange as string] || '30 days';
    sql += ` AND start_timestamp >= NOW() - INTERVAL '${interval}'`;

    // Sorting
    const validSortFields = ['confidence_score', 'start_timestamp', 'total_volume_usd', 'roi'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'confidence_score';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortField} ${order}`;

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), offset);

    const result = await query<TradePattern>(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM trade_patterns WHERE wallet_id = $1';
    const countParams: any[] = [walletId];
    let countParamIndex = 2;

    if (patternType) {
      countSql += ` AND pattern_type = $${countParamIndex}`;
      countParams.push(patternType);
      countParamIndex++;
    }

    if (token) {
      countSql += ` AND token_address = $${countParamIndex}`;
      countParams.push(token);
      countParamIndex++;
    }

    countSql += ` AND start_timestamp >= NOW() - INTERVAL '${interval}'`;

    const countResult = await query<{ total: string }>(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Set cache headers (5 minutes)
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    res.header('Expires', expires.toUTCString());
    res.header('Cache-Control', 'public, max-age=300');

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching wallet patterns:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /v1/analytics/smart-money/wallets/:address/trades
 * 
 * Get trades for a specific wallet
 */
export async function getWalletTrades(req: Request, res: Response) {
  try {
    const { address } = req.path_parameters;
    const { 
      tradeType, 
      token, 
      protocol,
      timeRange = '30d',
      sortBy = 'timestamp',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Get wallet ID
    const walletResult = await query<{ id: string }>(
      'SELECT id FROM smart_money_wallets WHERE wallet_address = $1',
      [address]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
    }

    const walletId = walletResult.rows[0].id;

    // Build query
    let sql = 'SELECT * FROM wallet_trades WHERE wallet_id = $1';
    const params: any[] = [walletId];
    let paramIndex = 2;

    if (tradeType) {
      sql += ` AND trade_type = $${paramIndex}`;
      params.push(tradeType);
      paramIndex++;
    }

    if (token) {
      sql += ` AND (token_in_address = $${paramIndex} OR token_out_address = $${paramIndex})`;
      params.push(token);
      paramIndex++;
    }

    if (protocol) {
      sql += ` AND protocol_id = $${paramIndex}`;
      params.push(protocol);
      paramIndex++;
    }

    // Time range filter
    const timeRangeMap: Record<string, string> = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '1y': '1 year',
    };
    const interval = timeRangeMap[timeRange as string] || '30 days';
    sql += ` AND timestamp >= NOW() - INTERVAL '${interval}'`;

    // Sorting
    const validSortFields = ['timestamp', 'trade_size_usd', 'realized_pnl', 'roi'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'timestamp';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortField} ${order}`;

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), offset);

    const result = await query<WalletTrade>(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM wallet_trades WHERE wallet_id = $1';
    const countParams: any[] = [walletId];
    let countParamIndex = 2;

    if (tradeType) {
      countSql += ` AND trade_type = $${countParamIndex}`;
      countParams.push(tradeType);
      countParamIndex++;
    }

    if (token) {
      countSql += ` AND (token_in_address = $${countParamIndex} OR token_out_address = $${countParamIndex})`;
      countParams.push(token);
      countParamIndex++;
    }

    if (protocol) {
      countSql += ` AND protocol_id = $${countParamIndex}`;
      countParams.push(protocol);
      countParamIndex++;
    }

    countSql += ` AND timestamp >= NOW() - INTERVAL '${interval}'`;

    const countResult = await query<{ total: string }>(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Set cache headers (5 minutes)
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    res.header('Expires', expires.toUTCString());
    res.header('Cache-Control', 'public, max-age=300');

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching wallet trades:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

