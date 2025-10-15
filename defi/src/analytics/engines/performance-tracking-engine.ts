/**
 * Performance Tracking Engine
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * Provides performance tracking, ROI calculations, and benchmark comparisons.
 */

import { query } from '../db/connection';

export interface PerformanceHistory {
  timestamp: string;
  totalValueUsd: number;
  pnl: number;
  roi: number;
}

export interface PerformanceStatistics {
  maxValue: number;
  minValue: number;
  avgValue: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface PerformerAsset {
  tokenSymbol: string;
  roi: number;
  pnl: number;
  valueUsd: number;
}

export interface PerformanceData {
  walletAddress: string;
  timeRange: string;
  history: PerformanceHistory[];
  benchmark?: PerformanceHistory[];
  statistics: PerformanceStatistics;
  bestPerformers: PerformerAsset[];
  worstPerformers: PerformerAsset[];
}

export interface WalletComparison {
  walletAddress: string;
  totalValueUsd: number;
  performance: {
    roi: number;
    pnl: number;
    sharpeRatio: number;
  };
  allocation: {
    topHolding: string;
    topHoldingPct: number;
    diversificationScore: number;
  };
}

export interface ComparisonResult {
  wallets: WalletComparison[];
  comparison: {
    bestPerformer: string;
    avgRoi: number;
    correlationMatrix: number[][];
  };
}

/**
 * Performance Tracking Engine
 * Singleton pattern for efficient resource management
 */
export class PerformanceTrackingEngine {
  private static instance: PerformanceTrackingEngine;

  private constructor() {}

  public static getInstance(): PerformanceTrackingEngine {
    if (!PerformanceTrackingEngine.instance) {
      PerformanceTrackingEngine.instance = new PerformanceTrackingEngine();
    }
    return PerformanceTrackingEngine.instance;
  }

  /**
   * Get performance history for a wallet
   */
  async getPerformance(
    walletAddress: string,
    timeRange: '7d' | '30d' | '90d' | '1y' | 'all',
    granularity: 'hourly' | 'daily' | 'weekly' = 'daily',
    benchmark?: 'eth' | 'btc' | 'none'
  ): Promise<PerformanceData> {
    const history = await this.getPerformanceHistory(walletAddress, timeRange, granularity);
    const statistics = this.calculateStatistics(history);
    const performers = await this.getTopPerformers(walletAddress, 5);

    const result: PerformanceData = {
      walletAddress,
      timeRange,
      history,
      statistics,
      bestPerformers: performers.best,
      worstPerformers: performers.worst,
    };

    if (benchmark && benchmark !== 'none') {
      result.benchmark = await this.getBenchmarkHistory(benchmark, timeRange, granularity);
    }

    return result;
  }

  /**
   * Get performance history from database
   */
  async getPerformanceHistory(
    walletAddress: string,
    timeRange: '7d' | '30d' | '90d' | '1y' | 'all',
    granularity: 'hourly' | 'daily' | 'weekly'
  ): Promise<PerformanceHistory[]> {
    const days = this.getTimeRangeDays(timeRange);

    let sql = `
      SELECT 
        timestamp,
        total_value_usd,
        0 AS pnl,
        0 AS roi
      FROM portfolio_history
      WHERE wallet_address = $1
    `;

    const params: any[] = [walletAddress];

    if (days > 0) {
      sql += ` AND timestamp >= NOW() - INTERVAL '${days} days'`;
    }

    sql += ` ORDER BY timestamp ASC`;

    const result = await query<{
      timestamp: string;
      total_value_usd: string;
      pnl: string;
      roi: string;
    }>(sql, params);

    if (result.rows.length === 0) {
      return [];
    }

    // Calculate PnL and ROI relative to first snapshot
    const firstValue = parseFloat(result.rows[0].total_value_usd);

    return result.rows.map(row => {
      const currentValue = parseFloat(row.total_value_usd);
      const pnl = currentValue - firstValue;
      const roi = firstValue > 0 ? (pnl / firstValue) * 100 : 0;

      return {
        timestamp: row.timestamp,
        totalValueUsd: currentValue,
        pnl,
        roi,
      };
    });
  }

  /**
   * Calculate performance statistics
   */
  calculateStatistics(history: PerformanceHistory[]): PerformanceStatistics {
    if (history.length === 0) {
      return {
        maxValue: 0,
        minValue: 0,
        avgValue: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      };
    }

    const values = history.map(h => h.totalValueUsd);
    const returns = history.map(h => h.roi);

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;

    // Calculate volatility (standard deviation of returns)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Calculate Sharpe Ratio (assuming 0% risk-free rate)
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = values[0];

    for (const value of values) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = peak > 0 ? ((peak - value) / peak) * 100 : 0;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      maxValue,
      minValue,
      avgValue,
      volatility,
      sharpeRatio,
      maxDrawdown,
    };
  }

  /**
   * Get top and worst performing assets
   */
  async getTopPerformers(
    walletAddress: string,
    limit: number = 5
  ): Promise<{ best: PerformerAsset[]; worst: PerformerAsset[] }> {
    const sql = `
      SELECT 
        wh.token_symbol,
        wh.roi,
        wh.unrealized_pnl AS pnl,
        wh.value_usd
      FROM wallet_holdings wh
      JOIN wallet_portfolios wp ON wh.portfolio_id = wp.id
      WHERE wp.wallet_address = $1
      ORDER BY wh.roi DESC
    `;

    const result = await query<{
      token_symbol: string;
      roi: string;
      pnl: string;
      value_usd: string;
    }>(sql, [walletAddress]);

    const all = result.rows.map(row => ({
      tokenSymbol: row.token_symbol,
      roi: parseFloat(row.roi) * 100, // Convert to percentage
      pnl: parseFloat(row.pnl),
      valueUsd: parseFloat(row.value_usd),
    }));

    return {
      best: all.slice(0, limit),
      worst: all.slice(-limit).reverse(),
    };
  }

  /**
   * Get benchmark history (mock data for ETH/BTC)
   */
  async getBenchmarkHistory(
    benchmark: 'eth' | 'btc',
    timeRange: '7d' | '30d' | '90d' | '1y' | 'all',
    granularity: 'hourly' | 'daily' | 'weekly'
  ): Promise<PerformanceHistory[]> {
    const days = this.getTimeRangeDays(timeRange);

    // Mock benchmark data (in production, this would fetch real price data)
    const baseValue = benchmark === 'eth' ? 2100 : 42000;
    const volatility = benchmark === 'eth' ? 0.03 : 0.025;

    const history: PerformanceHistory[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const value = baseValue * (1 + randomChange * i / days);
      const pnl = value - baseValue;
      const roi = (pnl / baseValue) * 100;

      history.push({
        timestamp: date.toISOString(),
        totalValueUsd: value,
        pnl,
        roi,
      });
    }

    return history;
  }

  /**
   * Compare multiple wallets
   */
  async compareWallets(
    walletAddresses: string[],
    timeRange: '7d' | '30d' | '90d' | '1y'
  ): Promise<ComparisonResult> {
    if (walletAddresses.length === 0 || walletAddresses.length > 5) {
      throw new Error('Must provide 1-5 wallet addresses');
    }

    const wallets: WalletComparison[] = [];

    for (const address of walletAddresses) {
      const portfolio = await this.getWalletSummary(address);
      const performance = await this.getPerformance(address, timeRange, 'daily');

      wallets.push({
        walletAddress: address,
        totalValueUsd: portfolio.totalValueUsd,
        performance: {
          roi: portfolio.roiAllTime,
          pnl: portfolio.pnlAllTime,
          sharpeRatio: performance.statistics.sharpeRatio,
        },
        allocation: {
          topHolding: portfolio.topHolding,
          topHoldingPct: portfolio.topHoldingPct,
          diversificationScore: portfolio.diversificationScore,
        },
      });
    }

    // Find best performer
    const bestPerformer = wallets.reduce((best, w) =>
      w.performance.roi > best.performance.roi ? w : best
    ).walletAddress;

    // Calculate average ROI
    const avgRoi = wallets.reduce((sum, w) => sum + w.performance.roi, 0) / wallets.length;

    // Calculate correlation matrix (simplified - in production would use actual correlation)
    const correlationMatrix = this.calculateCorrelationMatrix(wallets.length);

    return {
      wallets,
      comparison: {
        bestPerformer,
        avgRoi,
        correlationMatrix,
      },
    };
  }

  /**
   * Get wallet summary for comparison
   */
  private async getWalletSummary(walletAddress: string): Promise<any> {
    const sql = `
      SELECT 
        SUM(wp.total_value_usd) AS total_value_usd,
        SUM(wp.pnl_all_time) AS pnl_all_time,
        AVG(wp.roi_all_time) AS roi_all_time,
        AVG(wp.diversification_score) AS diversification_score
      FROM wallet_portfolios wp
      WHERE wp.wallet_address = $1
    `;

    const result = await query<any>(sql, [walletAddress]);

    if (result.rows.length === 0) {
      throw new Error(`No portfolio found for wallet ${walletAddress}`);
    }

    // Get top holding
    const holdingSql = `
      SELECT wh.token_symbol, wh.value_usd
      FROM wallet_holdings wh
      JOIN wallet_portfolios wp ON wh.portfolio_id = wp.id
      WHERE wp.wallet_address = $1
      ORDER BY wh.value_usd DESC
      LIMIT 1
    `;

    const holdingResult = await query<any>(holdingSql, [walletAddress]);

    const totalValue = parseFloat(result.rows[0].total_value_usd);
    const topHoldingValue = holdingResult.rows.length > 0 ? parseFloat(holdingResult.rows[0].value_usd) : 0;

    return {
      totalValueUsd: totalValue,
      pnlAllTime: parseFloat(result.rows[0].pnl_all_time),
      roiAllTime: parseFloat(result.rows[0].roi_all_time) * 100,
      diversificationScore: parseFloat(result.rows[0].diversification_score),
      topHolding: holdingResult.rows.length > 0 ? holdingResult.rows[0].token_symbol : 'N/A',
      topHoldingPct: totalValue > 0 ? (topHoldingValue / totalValue) * 100 : 0,
    };
  }

  /**
   * Calculate correlation matrix (simplified)
   */
  private calculateCorrelationMatrix(size: number): number[][] {
    const matrix: number[][] = [];

    for (let i = 0; i < size; i++) {
      matrix[i] = [];
      for (let j = 0; j < size; j++) {
        if (i === j) {
          matrix[i][j] = 1.0; // Perfect correlation with self
        } else {
          // Random correlation between 0.3 and 0.8
          matrix[i][j] = 0.3 + Math.random() * 0.5;
        }
      }
    }

    return matrix;
  }

  /**
   * Convert time range to days
   */
  private getTimeRangeDays(timeRange: '7d' | '30d' | '90d' | '1y' | 'all'): number {
    switch (timeRange) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      case '1y':
        return 365;
      case 'all':
        return 0; // No limit
      default:
        return 30;
    }
  }
}

