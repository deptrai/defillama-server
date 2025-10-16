/**
 * Strategy Classifier Engine
 * Story: 3.1.3 - Performance Attribution
 * 
 * Classifies trading strategies for smart money wallets:
 * - Identifies primary and secondary strategies
 * - Calculates strategy effectiveness metrics
 * - Computes strategy consistency score
 */

import { query } from '../db/connection';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type StrategyType = 
  | 'accumulation'
  | 'distribution'
  | 'rotation'
  | 'arbitrage'
  | 'swing'
  | 'day'
  | 'position'
  | 'scalp';

export interface StrategyEffectiveness {
  strategy: StrategyType;
  pnl: number;
  winRate: number;
  tradeCount: number;
  sharpeRatio: number | null;
  avgHoldingPeriod: number;
}

export interface StrategyAttribution {
  walletId: string;
  primaryStrategy: StrategyType;
  secondaryStrategies: StrategyType[];
  consistencyScore: number;
  strategyBreakdown: Map<StrategyType, StrategyEffectiveness>;
}

interface StrategyStats {
  strategy: StrategyType;
  pnl: number;
  winRate: number;
  tradeCount: number;
  weight: number; // Weighted score for primary strategy selection
}

// ============================================================================
// Strategy Classifier Engine (Singleton)
// ============================================================================

export class StrategyClassifier {
  private static instance: StrategyClassifier;

  private constructor() {}

  public static getInstance(): StrategyClassifier {
    if (!StrategyClassifier.instance) {
      StrategyClassifier.instance = new StrategyClassifier();
    }
    return StrategyClassifier.instance;
  }

  /**
   * Classify trading strategy for a wallet
   */
  public async classifyStrategy(walletId: string): Promise<StrategyAttribution> {
    // Get pattern-based strategies (from trade_pattern column)
    const patternStrategies = await this.getPatternBasedStrategies(walletId);

    // Get time-based strategies (from holding_period_days)
    const timeStrategies = await this.getTimeBasedStrategies(walletId);

    // Combine all strategies
    const allStrategies = new Map<StrategyType, StrategyStats>();

    // Merge pattern strategies
    patternStrategies.forEach((stats, strategy) => {
      allStrategies.set(strategy, stats);
    });

    // Merge time strategies
    timeStrategies.forEach((stats, strategy) => {
      const existing = allStrategies.get(strategy);
      if (existing) {
        // Combine stats
        existing.pnl += stats.pnl;
        existing.tradeCount += stats.tradeCount;
        existing.winRate = (existing.winRate + stats.winRate) / 2;
        existing.weight = (existing.weight + stats.weight) / 2;
      } else {
        allStrategies.set(strategy, stats);
      }
    });

    // Identify primary strategy
    const primaryStrategy = this.identifyPrimaryStrategy(allStrategies);

    // Identify secondary strategies (top 2 after primary)
    const secondaryStrategies = this.identifySecondaryStrategies(
      allStrategies,
      primaryStrategy
    );

    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(allStrategies);

    // Get detailed effectiveness for each strategy
    const strategyBreakdown = new Map<StrategyType, StrategyEffectiveness>();
    for (const [strategy, stats] of allStrategies) {
      const effectiveness = await this.calculateStrategyEffectiveness(
        walletId,
        strategy
      );
      strategyBreakdown.set(strategy, effectiveness);
    }

    return {
      walletId,
      primaryStrategy,
      secondaryStrategies,
      consistencyScore,
      strategyBreakdown,
    };
  }

  /**
   * Get pattern-based strategies (accumulation, distribution, rotation, arbitrage)
   */
  private async getPatternBasedStrategies(
    walletId: string
  ): Promise<Map<StrategyType, StrategyStats>> {
    const patternQuery = `
      SELECT 
        trade_pattern as strategy,
        COALESCE(SUM(realized_pnl), 0) as pnl,
        COUNT(*) FILTER (WHERE realized_pnl > 0)::FLOAT / NULLIF(COUNT(*), 0) * 100 as win_rate,
        COUNT(*) as trade_count
      FROM wallet_trades
      WHERE wallet_id = $1 
        AND trade_pattern IS NOT NULL
        AND realized_pnl IS NOT NULL
      GROUP BY trade_pattern
    `;

    const result = await query<{
      strategy: string;
      pnl: string;
      win_rate: string;
      trade_count: string;
    }>(patternQuery, [walletId]);

    const strategies = new Map<StrategyType, StrategyStats>();

    result.rows.forEach(row => {
      const strategy = row.strategy as StrategyType;
      const pnl = parseFloat(row.pnl);
      const winRate = parseFloat(row.win_rate || '0');
      const tradeCount = parseInt(row.trade_count);

      // Calculate weighted score: P&L (50%), Win Rate (30%), Trade Count (20%)
      const normalizedPnl = pnl / 1000000; // Normalize to millions
      const normalizedTradeCount = tradeCount / 100; // Normalize to hundreds
      const weight = 
        normalizedPnl * 0.5 + 
        winRate * 0.3 + 
        normalizedTradeCount * 0.2;

      strategies.set(strategy, {
        strategy,
        pnl,
        winRate,
        tradeCount,
        weight,
      });
    });

    return strategies;
  }

  /**
   * Get time-based strategies (swing, day, position, scalp)
   */
  private async getTimeBasedStrategies(
    walletId: string
  ): Promise<Map<StrategyType, StrategyStats>> {
    const timeQuery = `
      SELECT 
        CASE 
          WHEN holding_period_days < 1 THEN 'scalp'
          WHEN holding_period_days >= 1 AND holding_period_days < 7 THEN 'day'
          WHEN holding_period_days >= 7 AND holding_period_days < 30 THEN 'swing'
          WHEN holding_period_days >= 30 THEN 'position'
        END as strategy,
        COALESCE(SUM(realized_pnl), 0) as pnl,
        COUNT(*) FILTER (WHERE realized_pnl > 0)::FLOAT / NULLIF(COUNT(*), 0) * 100 as win_rate,
        COUNT(*) as trade_count
      FROM wallet_trades
      WHERE wallet_id = $1 
        AND holding_period_days IS NOT NULL
        AND realized_pnl IS NOT NULL
      GROUP BY strategy
    `;

    const result = await query<{
      strategy: string;
      pnl: string;
      win_rate: string;
      trade_count: string;
    }>(timeQuery, [walletId]);

    const strategies = new Map<StrategyType, StrategyStats>();

    result.rows.forEach(row => {
      const strategy = row.strategy as StrategyType;
      const pnl = parseFloat(row.pnl);
      const winRate = parseFloat(row.win_rate || '0');
      const tradeCount = parseInt(row.trade_count);

      const normalizedPnl = pnl / 1000000;
      const normalizedTradeCount = tradeCount / 100;
      const weight = 
        normalizedPnl * 0.5 + 
        winRate * 0.3 + 
        normalizedTradeCount * 0.2;

      strategies.set(strategy, {
        strategy,
        pnl,
        winRate,
        tradeCount,
        weight,
      });
    });

    return strategies;
  }

  /**
   * Identify primary strategy (highest weighted score)
   */
  private identifyPrimaryStrategy(
    strategies: Map<StrategyType, StrategyStats>
  ): StrategyType {
    if (strategies.size === 0) {
      return 'swing'; // Default
    }

    let maxWeight = -Infinity;
    let primaryStrategy: StrategyType = 'swing';

    strategies.forEach((stats, strategy) => {
      if (stats.weight > maxWeight) {
        maxWeight = stats.weight;
        primaryStrategy = strategy;
      }
    });

    return primaryStrategy;
  }

  /**
   * Identify secondary strategies (top 2 after primary)
   */
  private identifySecondaryStrategies(
    strategies: Map<StrategyType, StrategyStats>,
    primaryStrategy: StrategyType
  ): StrategyType[] {
    const sorted = Array.from(strategies.entries())
      .filter(([strategy]) => strategy !== primaryStrategy)
      .sort((a, b) => b[1].weight - a[1].weight)
      .slice(0, 2)
      .map(([strategy]) => strategy);

    return sorted;
  }

  /**
   * Calculate strategy consistency score (0-100)
   * Higher score = more focused on primary strategy
   */
  private calculateConsistencyScore(
    strategies: Map<StrategyType, StrategyStats>
  ): number {
    if (strategies.size === 0) return 0;
    if (strategies.size === 1) return 100;

    const weights = Array.from(strategies.values()).map(s => s.weight);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight === 0) return 0;

    // Calculate Herfindahl-Hirschman Index (HHI) for concentration
    const hhi = weights.reduce((sum, w) => {
      const share = w / totalWeight;
      return sum + share * share;
    }, 0);

    // Normalize HHI to 0-100 scale
    // HHI ranges from 1/n (perfectly distributed) to 1 (single strategy)
    const minHHI = 1 / strategies.size;
    const maxHHI = 1;
    const normalizedHHI = (hhi - minHHI) / (maxHHI - minHHI);

    return Math.round(normalizedHHI * 100);
  }

  /**
   * Calculate effectiveness metrics for a specific strategy
   */
  public async calculateStrategyEffectiveness(
    walletId: string,
    strategy: StrategyType
  ): Promise<StrategyEffectiveness> {
    // Determine WHERE clause based on strategy type
    let whereClause = '';
    if (['accumulation', 'distribution', 'rotation', 'arbitrage'].includes(strategy)) {
      whereClause = `AND trade_pattern = '${strategy}'`;
    } else if (strategy === 'scalp') {
      whereClause = `AND holding_period_days < 1`;
    } else if (strategy === 'day') {
      whereClause = `AND holding_period_days >= 1 AND holding_period_days < 7`;
    } else if (strategy === 'swing') {
      whereClause = `AND holding_period_days >= 7 AND holding_period_days < 30`;
    } else if (strategy === 'position') {
      whereClause = `AND holding_period_days >= 30`;
    }

    const effectivenessQuery = `
      SELECT 
        COALESCE(SUM(realized_pnl), 0) as pnl,
        COUNT(*) FILTER (WHERE realized_pnl > 0)::FLOAT / NULLIF(COUNT(*), 0) * 100 as win_rate,
        COUNT(*) as trade_count,
        COALESCE(AVG(holding_period_days), 0) as avg_holding_period
      FROM wallet_trades
      WHERE wallet_id = $1 
        AND realized_pnl IS NOT NULL
        ${whereClause}
    `;

    const result = await query<{
      pnl: string;
      win_rate: string;
      trade_count: string;
      avg_holding_period: string;
    }>(effectivenessQuery, [walletId]);

    const row = result.rows[0];

    return {
      strategy,
      pnl: parseFloat(row?.pnl || '0'),
      winRate: parseFloat(row?.win_rate || '0'),
      tradeCount: parseInt(row?.trade_count || '0'),
      sharpeRatio: null, // TODO: Calculate per-strategy Sharpe ratio
      avgHoldingPeriod: parseFloat(row?.avg_holding_period || '0'),
    };
  }
}

