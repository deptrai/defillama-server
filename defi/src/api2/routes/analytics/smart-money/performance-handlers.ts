/**
 * Performance Attribution API Handlers
 * Story: 3.1.3 - Performance Attribution
 * 
 * Endpoints:
 * - GET /v1/smart-money/wallets/:address/performance
 * - GET /v1/smart-money/wallets/:address/performance/snapshots
 * - GET /v1/smart-money/wallets/:address/performance/strategy
 */

import { Request, Response } from 'hyper-express';
import { query } from '../../../../analytics/db/connection';
import { PerformanceCalculator } from '../../../../analytics/engines/performance-calculator';
import { StrategyClassifier } from '../../../../analytics/engines/strategy-classifier';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get wallet ID from address
 */
async function getWalletId(address: string): Promise<string | null> {
  const result = await query<{ id: string }>(
    'SELECT id FROM smart_money_wallets WHERE wallet_address = $1',
    [address]
  );

  return result.rows[0]?.id || null;
}

/**
 * Parse time range from query parameter
 */
function parseTimeRange(timeRange?: string): { days?: number } | undefined {
  if (!timeRange || timeRange === 'all') return undefined;

  const mapping: Record<string, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };

  const days = mapping[timeRange];
  return days ? { days } : undefined;
}

// ============================================================================
// API Handlers
// ============================================================================

/**
 * GET /v1/smart-money/wallets/:address/performance
 * Get comprehensive performance attribution for a wallet
 */
export async function getWalletPerformance(req: Request, res: Response) {
  try {
    const { address } = req.path_parameters;
    const { 
      timeRange = 'all',
      includeSnapshots = 'false',
      includeTokenBreakdown = 'true',
    } = req.query;

    // Validate wallet address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
      });
    }

    // Get wallet ID
    const walletId = await getWalletId(address);
    if (!walletId) {
      return res.status(404).json({
        error: 'Wallet not found',
      });
    }

    // Parse time range
    const range = parseTimeRange(timeRange);

    // Get performance calculator
    const calculator = PerformanceCalculator.getInstance();

    // Calculate P&L
    const pnl = await calculator.calculatePnL(walletId, range);

    // Calculate win rate
    const winRate = await calculator.calculateWinRate(walletId, range);

    // Calculate risk metrics
    const riskMetrics = await calculator.calculateRiskMetrics(walletId, range);

    // Get strategy attribution
    const classifier = StrategyClassifier.getInstance();
    const strategyAttribution = await classifier.classifyStrategy(walletId);

    // Build response
    const response: any = {
      walletAddress: address,
      timeRange,
      pnl: {
        realized: pnl.realizedPnl,
        unrealized: pnl.unrealizedPnl,
        total: pnl.totalPnl,
      },
      winRate: {
        overall: winRate.overallWinRate,
        totalTrades: winRate.totalTrades,
        winningTrades: winRate.winningTrades,
        losingTrades: winRate.losingTrades,
        byToken: winRate.byToken,
        byStrategy: winRate.byStrategy,
      },
      riskMetrics: {
        sharpeRatio: riskMetrics.sharpeRatio,
        sortinoRatio: riskMetrics.sortinoRatio,
        maxDrawdown: riskMetrics.maxDrawdown,
        maxDrawdownUsd: riskMetrics.maxDrawdownUsd,
        volatility: riskMetrics.volatility,
      },
      strategyAttribution: {
        primaryStrategy: strategyAttribution.primaryStrategy,
        secondaryStrategies: strategyAttribution.secondaryStrategies,
        consistencyScore: strategyAttribution.consistencyScore,
        breakdown: Object.fromEntries(
          Array.from(strategyAttribution.strategyBreakdown.entries()).map(
            ([strategy, effectiveness]) => [
              strategy,
              {
                pnl: effectiveness.pnl,
                winRate: effectiveness.winRate,
                tradeCount: effectiveness.tradeCount,
              },
            ]
          )
        ),
      },
    };

    // Add token breakdown if requested
    if (includeTokenBreakdown === 'true') {
      response.pnl.tokenBreakdown = pnl.tokenBreakdown;
    }

    // Add snapshots if requested
    if (includeSnapshots === 'true') {
      const snapshotsQuery = `
        SELECT 
          snapshot_date as date,
          portfolio_value_usd as "portfolioValue",
          daily_pnl as "dailyPnl",
          daily_return_pct as "dailyReturn",
          cumulative_pnl as "cumulativePnl",
          cumulative_return_pct as "cumulativeReturn"
        FROM wallet_performance_snapshots
        WHERE wallet_id = $1
        ORDER BY snapshot_date DESC
        LIMIT 90
      `;

      const snapshotsResult = await query(snapshotsQuery, [walletId]);
      response.snapshots = snapshotsResult.rows;
    }

    return res.json(response);
  } catch (error) {
    console.error('Error in getWalletPerformance:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /v1/smart-money/wallets/:address/performance/snapshots
 * Get time-series performance snapshots
 */
export async function getWalletPerformanceSnapshots(req: Request, res: Response) {
  try {
    const { address } = req.path_parameters;
    const { 
      startDate,
      endDate,
      interval = 'daily',
      limit = '90',
    } = req.query;

    // Validate wallet address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
      });
    }

    // Get wallet ID
    const walletId = await getWalletId(address);
    if (!walletId) {
      return res.status(404).json({
        error: 'Wallet not found',
      });
    }

    // Build WHERE clause for date filtering
    const whereClauses: string[] = ['wallet_id = $1'];
    const params: any[] = [walletId];

    if (startDate) {
      params.push(startDate);
      whereClauses.push(`snapshot_date >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      whereClauses.push(`snapshot_date <= $${params.length}`);
    }

    const whereClause = whereClauses.join(' AND ');

    // Query snapshots
    const snapshotsQuery = `
      SELECT 
        snapshot_date as date,
        portfolio_value_usd as "portfolioValue",
        daily_pnl as "dailyPnl",
        daily_return_pct as "dailyReturn",
        cumulative_pnl as "cumulativePnl",
        cumulative_return_pct as "cumulativeReturn",
        rolling_sharpe_ratio as "rollingSharpeRatio",
        rolling_volatility as "rollingVolatility",
        rolling_max_drawdown as "rollingMaxDrawdown"
      FROM wallet_performance_snapshots
      WHERE ${whereClause}
      ORDER BY snapshot_date DESC
      LIMIT $${params.length + 1}
    `;

    params.push(parseInt(limit));

    const result = await query(snapshotsQuery, params);

    return res.json({
      walletAddress: address,
      interval,
      count: result.rows.length,
      snapshots: result.rows,
    });
  } catch (error) {
    console.error('Error in getWalletPerformanceSnapshots:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /v1/smart-money/wallets/:address/performance/strategy
 * Get detailed strategy attribution
 */
export async function getWalletStrategyAttribution(req: Request, res: Response) {
  try {
    const { address } = req.path_parameters;

    // Validate wallet address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
      });
    }

    // Get wallet ID
    const walletId = await getWalletId(address);
    if (!walletId) {
      return res.status(404).json({
        error: 'Wallet not found',
      });
    }

    // Get strategy attribution
    const classifier = StrategyClassifier.getInstance();
    const attribution = await classifier.classifyStrategy(walletId);

    // Format response
    const strategies = Array.from(attribution.strategyBreakdown.entries()).map(
      ([strategy, effectiveness]) => ({
        strategy,
        pnl: effectiveness.pnl,
        winRate: effectiveness.winRate,
        tradeCount: effectiveness.tradeCount,
        sharpeRatio: effectiveness.sharpeRatio,
        avgHoldingPeriod: effectiveness.avgHoldingPeriod,
      })
    );

    return res.json({
      walletAddress: address,
      primaryStrategy: attribution.primaryStrategy,
      secondaryStrategies: attribution.secondaryStrategies,
      consistencyScore: attribution.consistencyScore,
      strategies: strategies.sort((a, b) => b.pnl - a.pnl),
    });
  } catch (error) {
    console.error('Error in getWalletStrategyAttribution:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

