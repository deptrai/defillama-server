/**
 * Bot Performance Calculator Engine
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Calculates comprehensive performance metrics for MEV bots:
 * - Financial metrics: Total extracted, net profit, ROI, profit per day
 * - Success metrics: Success rate, win rate, consistency
 * - Efficiency metrics: Gas efficiency, profit per gas, execution speed
 * - Activity metrics: Active days, transactions per day, uptime
 * 
 * Algorithm:
 * 1. Query bot data and historical opportunities
 * 2. Calculate financial performance
 * 3. Calculate success metrics
 * 4. Calculate efficiency metrics
 * 5. Calculate activity metrics
 * 6. Return comprehensive performance report
 */

import { query } from '../db/connection';

// ============================================================================
// Types
// ============================================================================

export interface BotPerformanceMetrics {
  // Financial Metrics
  financial: {
    total_mev_extracted_usd: number;
    total_gas_spent_usd: number;
    net_profit_usd: number;
    roi_pct: number;
    profit_per_day_usd: number;
    avg_profit_per_tx_usd: number;
    max_profit_tx_usd: number;
    min_profit_tx_usd: number;
  };

  // Success Metrics
  success: {
    total_transactions: number;
    successful_transactions: number;
    failed_transactions: number;
    success_rate_pct: number;
    win_rate_pct: number; // Profitable txs / total txs
    consistency_score: number; // 0-100, based on profit variance
  };

  // Efficiency Metrics
  efficiency: {
    gas_efficiency_score: number; // 0-100
    profit_per_gas_usd: number;
    avg_gas_price_gwei: number;
    avg_execution_time_ms?: number;
  };

  // Activity Metrics
  activity: {
    first_seen: Date;
    last_active: Date;
    active_days: number;
    total_days: number;
    uptime_pct: number; // active_days / total_days * 100
    transactions_per_day: number;
    avg_daily_profit_usd: number;
  };

  // Time-based Performance
  performance_by_period?: {
    daily?: PerformancePeriod[];
    weekly?: PerformancePeriod[];
    monthly?: PerformancePeriod[];
  };
}

export interface PerformancePeriod {
  period: string; // Date or week/month identifier
  transactions: number;
  total_profit_usd: number;
  success_rate_pct: number;
  avg_profit_per_tx_usd: number;
}

export interface TimeRange {
  start_date?: Date;
  end_date?: Date;
}

// ============================================================================
// BotPerformanceCalculator Class
// ============================================================================

/**
 * BotPerformanceCalculator - Singleton engine for calculating bot performance
 */
export class BotPerformanceCalculator {
  private static instance: BotPerformanceCalculator;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): BotPerformanceCalculator {
    if (!BotPerformanceCalculator.instance) {
      BotPerformanceCalculator.instance = new BotPerformanceCalculator();
    }
    return BotPerformanceCalculator.instance;
  }

  /**
   * Calculate comprehensive performance metrics for a bot
   */
  public async calculatePerformance(
    botAddress: string,
    chainId: string,
    timeRange?: TimeRange
  ): Promise<BotPerformanceMetrics> {
    // Get bot data
    const bot = await this.getBotData(botAddress, chainId);
    if (!bot) {
      throw new Error(`Bot not found: ${botAddress} on ${chainId}`);
    }

    // Calculate metrics
    const financial = await this.calculateFinancialMetrics(botAddress, chainId, timeRange);
    const success = await this.calculateSuccessMetrics(botAddress, chainId, timeRange);
    const efficiency = await this.calculateEfficiencyMetrics(botAddress, chainId, timeRange);
    const activity = await this.calculateActivityMetrics(botAddress, chainId, timeRange);

    return {
      financial,
      success,
      efficiency,
      activity,
    };
  }

  /**
   * Calculate financial metrics
   */
  private async calculateFinancialMetrics(
    botAddress: string,
    chainId: string,
    timeRange?: TimeRange
  ): Promise<BotPerformanceMetrics['financial']> {
    const whereClause = this.buildTimeRangeClause(timeRange);

    const result = await query<{
      total_mev_extracted: string;
      total_gas_spent: string;
      net_profit: string;
      avg_profit_per_tx: string;
      max_profit: string;
      min_profit: string;
      total_transactions: string;
      active_days: string;
    }>(
      `
      SELECT 
        COALESCE(SUM(mev_profit_usd), 0) as total_mev_extracted,
        COALESCE(SUM(gas_cost_usd), 0) as total_gas_spent,
        COALESCE(SUM(net_profit_usd), 0) as net_profit,
        COALESCE(AVG(mev_profit_usd), 0) as avg_profit_per_tx,
        COALESCE(MAX(mev_profit_usd), 0) as max_profit,
        COALESCE(MIN(mev_profit_usd), 0) as min_profit,
        COUNT(*) as total_transactions,
        COUNT(DISTINCT DATE(timestamp)) as active_days
      FROM mev_opportunities
      WHERE bot_address = $1 AND chain_id = $2 ${whereClause}
      `,
      [botAddress, chainId]
    );

    const row = result.rows[0];
    const totalMevExtracted = parseFloat(row.total_mev_extracted);
    const totalGasSpent = parseFloat(row.total_gas_spent);
    const netProfit = parseFloat(row.net_profit);
    const activeDays = parseInt(row.active_days, 10);

    const roi = totalGasSpent > 0 ? (netProfit / totalGasSpent) * 100 : 0;
    const profitPerDay = activeDays > 0 ? netProfit / activeDays : 0;

    return {
      total_mev_extracted_usd: totalMevExtracted,
      total_gas_spent_usd: totalGasSpent,
      net_profit_usd: netProfit,
      roi_pct: roi,
      profit_per_day_usd: profitPerDay,
      avg_profit_per_tx_usd: parseFloat(row.avg_profit_per_tx),
      max_profit_tx_usd: parseFloat(row.max_profit),
      min_profit_tx_usd: parseFloat(row.min_profit),
    };
  }

  /**
   * Calculate success metrics
   */
  private async calculateSuccessMetrics(
    botAddress: string,
    chainId: string,
    timeRange?: TimeRange
  ): Promise<BotPerformanceMetrics['success']> {
    const whereClause = this.buildTimeRangeClause(timeRange);

    const result = await query<{
      total_transactions: string;
      successful_transactions: string;
      failed_transactions: string;
      profitable_transactions: string;
    }>(
      `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status IN ('executed', 'confirmed')) as successful_transactions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
        COUNT(*) FILTER (WHERE net_profit_usd > 0) as profitable_transactions
      FROM mev_opportunities
      WHERE bot_address = $1 AND chain_id = $2 ${whereClause}
      `,
      [botAddress, chainId]
    );

    const row = result.rows[0];
    const totalTransactions = parseInt(row.total_transactions, 10);
    const successfulTransactions = parseInt(row.successful_transactions, 10);
    const failedTransactions = parseInt(row.failed_transactions, 10);
    const profitableTransactions = parseInt(row.profitable_transactions, 10);

    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
    const winRate = totalTransactions > 0 ? (profitableTransactions / totalTransactions) * 100 : 0;

    // Calculate consistency score (based on profit variance)
    const consistencyScore = await this.calculateConsistencyScore(botAddress, chainId, timeRange);

    return {
      total_transactions: totalTransactions,
      successful_transactions: successfulTransactions,
      failed_transactions: failedTransactions,
      success_rate_pct: successRate,
      win_rate_pct: winRate,
      consistency_score: consistencyScore,
    };
  }

  /**
   * Calculate efficiency metrics
   */
  private async calculateEfficiencyMetrics(
    botAddress: string,
    chainId: string,
    timeRange?: TimeRange
  ): Promise<BotPerformanceMetrics['efficiency']> {
    const whereClause = this.buildTimeRangeClause(timeRange);

    const result = await query<{
      total_profit: string;
      total_gas_spent: string;
      avg_gas_price: string;
    }>(
      `
      SELECT 
        COALESCE(SUM(mev_profit_usd), 0) as total_profit,
        COALESCE(SUM(gas_cost_usd), 0) as total_gas_spent,
        COALESCE(AVG(gas_cost_usd), 0) as avg_gas_price
      FROM mev_opportunities
      WHERE bot_address = $1 AND chain_id = $2 ${whereClause}
      `,
      [botAddress, chainId]
    );

    const row = result.rows[0];
    const totalProfit = parseFloat(row.total_profit);
    const totalGasSpent = parseFloat(row.total_gas_spent);

    const profitPerGas = totalGasSpent > 0 ? totalProfit / totalGasSpent : 0;
    const gasEfficiencyScore = this.calculateGasEfficiencyScore(profitPerGas);

    return {
      gas_efficiency_score: gasEfficiencyScore,
      profit_per_gas_usd: profitPerGas,
      avg_gas_price_gwei: parseFloat(row.avg_gas_price),
    };
  }

  /**
   * Calculate activity metrics
   */
  private async calculateActivityMetrics(
    botAddress: string,
    chainId: string,
    timeRange?: TimeRange
  ): Promise<BotPerformanceMetrics['activity']> {
    const whereClause = this.buildTimeRangeClause(timeRange);

    const result = await query<{
      first_seen: Date;
      last_active: Date;
      active_days: string;
      total_transactions: string;
      total_profit: string;
    }>(
      `
      SELECT 
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_active,
        COUNT(DISTINCT DATE(timestamp)) as active_days,
        COUNT(*) as total_transactions,
        COALESCE(SUM(net_profit_usd), 0) as total_profit
      FROM mev_opportunities
      WHERE bot_address = $1 AND chain_id = $2 ${whereClause}
      `,
      [botAddress, chainId]
    );

    const row = result.rows[0];
    const firstSeen = new Date(row.first_seen);
    const lastActive = new Date(row.last_active);
    const activeDays = parseInt(row.active_days, 10);
    const totalTransactions = parseInt(row.total_transactions, 10);
    const totalProfit = parseFloat(row.total_profit);

    const totalDays = Math.ceil((lastActive.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const uptimePct = totalDays > 0 ? (activeDays / totalDays) * 100 : 0;
    const transactionsPerDay = activeDays > 0 ? totalTransactions / activeDays : 0;
    const avgDailyProfit = activeDays > 0 ? totalProfit / activeDays : 0;

    return {
      first_seen: firstSeen,
      last_active: lastActive,
      active_days: activeDays,
      total_days: totalDays,
      uptime_pct: uptimePct,
      transactions_per_day: transactionsPerDay,
      avg_daily_profit_usd: avgDailyProfit,
    };
  }

  /**
   * Calculate consistency score based on profit variance
   */
  private async calculateConsistencyScore(
    botAddress: string,
    chainId: string,
    timeRange?: TimeRange
  ): Promise<number> {
    // Get profit variance
    const whereClause = this.buildTimeRangeClause(timeRange);

    const result = await query<{
      stddev: string;
      avg: string;
    }>(
      `
      SELECT 
        COALESCE(STDDEV(net_profit_usd), 0) as stddev,
        COALESCE(AVG(net_profit_usd), 0) as avg
      FROM mev_opportunities
      WHERE bot_address = $1 AND chain_id = $2 ${whereClause}
      `,
      [botAddress, chainId]
    );

    const stddev = parseFloat(result.rows[0]?.stddev || '0');
    const avg = parseFloat(result.rows[0]?.avg || '0');

    // Calculate coefficient of variation (CV)
    const cv = avg > 0 ? stddev / avg : 0;

    // Convert to consistency score (0-100)
    // Lower CV = higher consistency
    // CV > 2 = very inconsistent (score 0)
    // CV < 0.2 = very consistent (score 100)
    const consistencyScore = Math.max(0, Math.min(100, 100 - (cv * 50)));

    return consistencyScore;
  }

  /**
   * Calculate gas efficiency score (0-100)
   */
  private calculateGasEfficiencyScore(profitPerGas: number): number {
    // Profit per gas > 10 = excellent (score 100)
    // Profit per gas > 5 = good (score 80)
    // Profit per gas > 2 = average (score 60)
    // Profit per gas > 1 = poor (score 40)
    // Profit per gas < 1 = very poor (score 0-40)

    if (profitPerGas >= 10) return 100;
    if (profitPerGas >= 5) return 80 + ((profitPerGas - 5) / 5) * 20;
    if (profitPerGas >= 2) return 60 + ((profitPerGas - 2) / 3) * 20;
    if (profitPerGas >= 1) return 40 + ((profitPerGas - 1) / 1) * 20;
    return profitPerGas * 40;
  }

  /**
   * Build time range WHERE clause
   */
  private buildTimeRangeClause(timeRange?: TimeRange): string {
    if (!timeRange) return '';

    const clauses: string[] = [];

    if (timeRange.start_date) {
      clauses.push(`AND timestamp >= '${timeRange.start_date.toISOString()}'`);
    }

    if (timeRange.end_date) {
      clauses.push(`AND timestamp <= '${timeRange.end_date.toISOString()}'`);
    }

    return clauses.join(' ');
  }

  /**
   * Get bot data
   */
  private async getBotData(botAddress: string, chainId: string): Promise<any> {
    const result = await query(
      `SELECT * FROM mev_bots WHERE bot_address = $1 AND chain_id = $2`,
      [botAddress, chainId]
    );

    return result.rows[0] || null;
  }
}

