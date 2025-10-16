/**
 * Performance Calculator Engine
 * Story: 3.1.3 - Performance Attribution
 * 
 * Calculates comprehensive performance metrics for smart money wallets:
 * - P&L tracking (realized, unrealized, total)
 * - Win rate calculation
 * - Risk metrics (Sharpe ratio, Sortino ratio, max drawdown)
 * - Daily performance snapshots
 */

import { query } from '../db/connection';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PnLMetrics {
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  tokenBreakdown: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    pnl: number;
    roi: number;
    tradeCount: number;
  }>;
}

export interface WinRateMetrics {
  overallWinRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  byToken: Record<string, number>;
  byStrategy: Record<string, number>;
  byTimePeriod: Record<string, number>;
}

export interface RiskMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownUsd: number;
  volatility: number;
  downsideVolatility: number;
}

export interface PerformanceMetrics {
  walletId: string;
  calculationDate: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  totalVolumeUsd: number;
  averageTradeSize: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownUsd: number;
  volatility: number;
  downsideVolatility: number;
  bestTradePnl: number;
  worstTradePnl: number;
  averageTradePnl: number;
  medianTradePnl: number;
  averageHoldingPeriodDays: number;
  medianHoldingPeriodDays: number;
}

export interface TimeRange {
  startDate?: Date;
  endDate?: Date;
  days?: number; // Alternative: last N days
}

// ============================================================================
// Performance Calculator Engine (Singleton)
// ============================================================================

export class PerformanceCalculator {
  private static instance: PerformanceCalculator;

  private constructor() {}

  public static getInstance(): PerformanceCalculator {
    if (!PerformanceCalculator.instance) {
      PerformanceCalculator.instance = new PerformanceCalculator();
    }
    return PerformanceCalculator.instance;
  }

  /**
   * Calculate P&L metrics for a wallet
   */
  public async calculatePnL(
    walletId: string,
    timeRange?: TimeRange
  ): Promise<PnLMetrics> {
    const whereClause = this.buildTimeRangeClause(timeRange);

    // Get aggregated P&L
    const pnlQuery = `
      SELECT 
        COALESCE(SUM(realized_pnl), 0) as realized_pnl,
        COALESCE(SUM(unrealized_pnl), 0) as unrealized_pnl,
        COALESCE(SUM(realized_pnl) + SUM(unrealized_pnl), 0) as total_pnl
      FROM wallet_trades
      WHERE wallet_id = $1 ${whereClause}
    `;

    const pnlResult = await query<{
      realized_pnl: string;
      unrealized_pnl: string;
      total_pnl: string;
    }>(pnlQuery, [walletId]);

    // Get token-level breakdown
    const tokenQuery = `
      SELECT 
        token_out_address as token_address,
        token_out_symbol as token_symbol,
        COALESCE(SUM(realized_pnl), 0) as pnl,
        COALESCE(AVG(roi), 0) as roi,
        COUNT(*) as trade_count
      FROM wallet_trades
      WHERE wallet_id = $1 
        AND token_out_address IS NOT NULL
        ${whereClause}
      GROUP BY token_out_address, token_out_symbol
      ORDER BY pnl DESC
    `;

    const tokenResult = await query<{
      token_address: string;
      token_symbol: string;
      pnl: string;
      roi: string;
      trade_count: string;
    }>(tokenQuery, [walletId]);

    return {
      realizedPnl: parseFloat(pnlResult.rows[0]?.realized_pnl || '0'),
      unrealizedPnl: parseFloat(pnlResult.rows[0]?.unrealized_pnl || '0'),
      totalPnl: parseFloat(pnlResult.rows[0]?.total_pnl || '0'),
      tokenBreakdown: tokenResult.rows.map(row => ({
        tokenAddress: row.token_address,
        tokenSymbol: row.token_symbol,
        pnl: parseFloat(row.pnl),
        roi: parseFloat(row.roi),
        tradeCount: parseInt(row.trade_count),
      })),
    };
  }

  /**
   * Calculate win rate metrics for a wallet
   */
  public async calculateWinRate(
    walletId: string,
    timeRange?: TimeRange
  ): Promise<WinRateMetrics> {
    const whereClause = this.buildTimeRangeClause(timeRange);

    // Overall win rate
    const overallQuery = `
      SELECT 
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE realized_pnl > 0) as winning_trades,
        COUNT(*) FILTER (WHERE realized_pnl < 0) as losing_trades
      FROM wallet_trades
      WHERE wallet_id = $1 
        AND realized_pnl IS NOT NULL
        ${whereClause}
    `;

    const overallResult = await query<{
      total_trades: string;
      winning_trades: string;
      losing_trades: string;
    }>(overallQuery, [walletId]);

    const totalTrades = parseInt(overallResult.rows[0]?.total_trades || '0');
    const winningTrades = parseInt(overallResult.rows[0]?.winning_trades || '0');
    const losingTrades = parseInt(overallResult.rows[0]?.losing_trades || '0');
    const overallWinRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Win rate by token
    const tokenQuery = `
      SELECT 
        token_out_symbol as token,
        COUNT(*) FILTER (WHERE realized_pnl > 0)::FLOAT / NULLIF(COUNT(*), 0) * 100 as win_rate
      FROM wallet_trades
      WHERE wallet_id = $1 
        AND token_out_symbol IS NOT NULL
        AND realized_pnl IS NOT NULL
        ${whereClause}
      GROUP BY token_out_symbol
    `;

    const tokenResult = await query<{
      token: string;
      win_rate: string;
    }>(tokenQuery, [walletId]);

    const byToken: Record<string, number> = {};
    tokenResult.rows.forEach(row => {
      byToken[row.token] = parseFloat(row.win_rate || '0');
    });

    // Win rate by strategy
    const strategyQuery = `
      SELECT 
        trade_pattern as strategy,
        COUNT(*) FILTER (WHERE realized_pnl > 0)::FLOAT / NULLIF(COUNT(*), 0) * 100 as win_rate
      FROM wallet_trades
      WHERE wallet_id = $1 
        AND trade_pattern IS NOT NULL
        AND realized_pnl IS NOT NULL
        ${whereClause}
      GROUP BY trade_pattern
    `;

    const strategyResult = await query<{
      strategy: string;
      win_rate: string;
    }>(strategyQuery, [walletId]);

    const byStrategy: Record<string, number> = {};
    strategyResult.rows.forEach(row => {
      byStrategy[row.strategy] = parseFloat(row.win_rate || '0');
    });

    return {
      overallWinRate,
      totalTrades,
      winningTrades,
      losingTrades,
      byToken,
      byStrategy,
      byTimePeriod: {}, // TODO: Implement time period breakdown
    };
  }

  /**
   * Calculate risk metrics (Sharpe ratio, Sortino ratio, max drawdown)
   */
  public async calculateRiskMetrics(
    walletId: string,
    timeRange?: TimeRange
  ): Promise<RiskMetrics> {
    // Get daily returns from snapshots
    const snapshotsQuery = `
      SELECT 
        daily_return_pct,
        daily_pnl,
        portfolio_value_usd
      FROM wallet_performance_snapshots
      WHERE wallet_id = $1
      ORDER BY snapshot_date ASC
    `;

    const snapshotsResult = await query<{
      daily_return_pct: string;
      daily_pnl: string;
      portfolio_value_usd: string;
    }>(snapshotsQuery, [walletId]);

    const returns = snapshotsResult.rows.map(row => parseFloat(row.daily_return_pct));
    const pnls = snapshotsResult.rows.map(row => parseFloat(row.daily_pnl));
    const portfolioValues = snapshotsResult.rows.map(row => parseFloat(row.portfolio_value_usd));

    if (returns.length === 0) {
      return {
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        maxDrawdownUsd: 0,
        volatility: 0,
        downsideVolatility: 0,
      };
    }

    // Calculate metrics
    const avgReturn = this.mean(returns);
    const volatility = this.standardDeviation(returns);
    const downsideReturns = returns.filter(r => r < 0);
    const downsideVolatility = downsideReturns.length > 0 
      ? this.standardDeviation(downsideReturns) 
      : 0;

    const riskFreeRate = 0.02 / 365; // 2% annual risk-free rate, daily
    const sharpeRatio = volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;
    const sortinoRatio = downsideVolatility > 0 
      ? (avgReturn - riskFreeRate) / downsideVolatility 
      : 0;

    // Calculate max drawdown
    const { maxDrawdown, maxDrawdownUsd } = this.calculateMaxDrawdown(portfolioValues);

    return {
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownUsd,
      volatility,
      downsideVolatility,
    };
  }

  /**
   * Build time range WHERE clause
   */
  private buildTimeRangeClause(timeRange?: TimeRange): string {
    if (!timeRange) return '';

    if (timeRange.days) {
      return `AND timestamp >= NOW() - INTERVAL '${timeRange.days} days'`;
    }

    const clauses: string[] = [];
    if (timeRange.startDate) {
      clauses.push(`AND timestamp >= '${timeRange.startDate.toISOString()}'`);
    }
    if (timeRange.endDate) {
      clauses.push(`AND timestamp <= '${timeRange.endDate.toISOString()}'`);
    }

    return clauses.join(' ');
  }

  /**
   * Calculate mean of array
   */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.mean(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const variance = this.mean(squaredDiffs);
    return Math.sqrt(variance);
  }

  /**
   * Calculate max drawdown
   */
  private calculateMaxDrawdown(portfolioValues: number[]): {
    maxDrawdown: number;
    maxDrawdownUsd: number;
  } {
    if (portfolioValues.length === 0) {
      return { maxDrawdown: 0, maxDrawdownUsd: 0 };
    }

    let maxValue = portfolioValues[0];
    let maxDrawdown = 0;
    let maxDrawdownUsd = 0;

    for (const value of portfolioValues) {
      if (value > maxValue) {
        maxValue = value;
      }

      const drawdown = ((maxValue - value) / maxValue) * 100;
      const drawdownUsd = maxValue - value;

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownUsd = drawdownUsd;
      }
    }

    return { maxDrawdown, maxDrawdownUsd };
  }

  /**
   * Calculate comprehensive performance metrics
   */
  public async calculatePerformanceMetrics(
    walletId: string,
    timeRange?: TimeRange
  ): Promise<PerformanceMetrics> {
    const whereClause = this.buildTimeRangeClause(timeRange);

    // Get trade statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE realized_pnl > 0) as winning_trades,
        COUNT(*) FILTER (WHERE realized_pnl < 0) as losing_trades,
        COALESCE(SUM(realized_pnl), 0) as realized_pnl,
        COALESCE(SUM(unrealized_pnl), 0) as unrealized_pnl,
        COALESCE(SUM(trade_size_usd), 0) as total_volume,
        COALESCE(AVG(trade_size_usd), 0) as avg_trade_size,
        COALESCE(MAX(realized_pnl), 0) as best_trade,
        COALESCE(MIN(realized_pnl), 0) as worst_trade,
        COALESCE(AVG(realized_pnl), 0) as avg_trade_pnl,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY realized_pnl), 0) as median_trade_pnl,
        COALESCE(AVG(holding_period_days), 0) as avg_holding_period,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY holding_period_days), 0) as median_holding_period
      FROM wallet_trades
      WHERE wallet_id = $1
        AND realized_pnl IS NOT NULL
        ${whereClause}
    `;

    const statsResult = await query<{
      total_trades: string;
      winning_trades: string;
      losing_trades: string;
      realized_pnl: string;
      unrealized_pnl: string;
      total_volume: string;
      avg_trade_size: string;
      best_trade: string;
      worst_trade: string;
      avg_trade_pnl: string;
      median_trade_pnl: string;
      avg_holding_period: string;
      median_holding_period: string;
    }>(statsQuery, [walletId]);

    const stats = statsResult.rows[0];
    const totalTrades = parseInt(stats?.total_trades || '0');
    const winningTrades = parseInt(stats?.winning_trades || '0');
    const losingTrades = parseInt(stats?.losing_trades || '0');
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Get risk metrics
    const riskMetrics = await this.calculateRiskMetrics(walletId, timeRange);

    return {
      walletId,
      calculationDate: new Date(),
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      realizedPnl: parseFloat(stats?.realized_pnl || '0'),
      unrealizedPnl: parseFloat(stats?.unrealized_pnl || '0'),
      totalPnl: parseFloat(stats?.realized_pnl || '0') + parseFloat(stats?.unrealized_pnl || '0'),
      totalVolumeUsd: parseFloat(stats?.total_volume || '0'),
      averageTradeSize: parseFloat(stats?.avg_trade_size || '0'),
      sharpeRatio: riskMetrics.sharpeRatio,
      sortinoRatio: riskMetrics.sortinoRatio,
      maxDrawdown: riskMetrics.maxDrawdown,
      maxDrawdownUsd: riskMetrics.maxDrawdownUsd,
      volatility: riskMetrics.volatility,
      downsideVolatility: riskMetrics.downsideVolatility,
      bestTradePnl: parseFloat(stats?.best_trade || '0'),
      worstTradePnl: parseFloat(stats?.worst_trade || '0'),
      averageTradePnl: parseFloat(stats?.avg_trade_pnl || '0'),
      medianTradePnl: parseFloat(stats?.median_trade_pnl || '0'),
      averageHoldingPeriodDays: parseFloat(stats?.avg_holding_period || '0'),
      medianHoldingPeriodDays: parseFloat(stats?.median_holding_period || '0'),
    };
  }

  /**
   * Store performance metrics in database
   */
  public async storePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    const insertQuery = `
      INSERT INTO wallet_performance_metrics (
        wallet_id, calculation_date,
        total_trades, winning_trades, losing_trades, win_rate,
        realized_pnl, unrealized_pnl, total_pnl, total_volume_usd, average_trade_size,
        sharpe_ratio, sortino_ratio, max_drawdown, max_drawdown_usd, volatility, downside_volatility,
        best_trade_pnl, worst_trade_pnl, average_trade_pnl, median_trade_pnl,
        average_holding_period_days, median_holding_period_days
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      )
      ON CONFLICT (wallet_id, calculation_date)
      DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        winning_trades = EXCLUDED.winning_trades,
        losing_trades = EXCLUDED.losing_trades,
        win_rate = EXCLUDED.win_rate,
        realized_pnl = EXCLUDED.realized_pnl,
        unrealized_pnl = EXCLUDED.unrealized_pnl,
        total_pnl = EXCLUDED.total_pnl,
        updated_at = NOW()
    `;

    await query(insertQuery, [
      metrics.walletId,
      metrics.calculationDate,
      metrics.totalTrades,
      metrics.winningTrades,
      metrics.losingTrades,
      metrics.winRate,
      metrics.realizedPnl,
      metrics.unrealizedPnl,
      metrics.totalPnl,
      metrics.totalVolumeUsd,
      metrics.averageTradeSize,
      metrics.sharpeRatio,
      metrics.sortinoRatio,
      metrics.maxDrawdown,
      metrics.maxDrawdownUsd,
      metrics.volatility,
      metrics.downsideVolatility,
      metrics.bestTradePnl,
      metrics.worstTradePnl,
      metrics.averageTradePnl,
      metrics.medianTradePnl,
      metrics.averageHoldingPeriodDays,
      metrics.medianHoldingPeriodDays,
    ]);
  }
}

