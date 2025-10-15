/**
 * Behavioral Analyzer Engine
 * Story: 3.1.2 - Trade Pattern Analysis
 * 
 * Analyzes trading behavior from smart money wallets:
 * - Trading style: swing, day, position, scalp
 * - Risk profile: conservative, moderate, aggressive
 * - Preferred tokens: top 10 by trade count
 * - Preferred protocols: top 5 by volume
 * - Trade timing: early, mid, late, exit
 * - Trade sizing: avg, min, max analysis
 */

import { Trade } from './trade-pattern-recognizer';

export interface BehavioralProfile {
  tradingStyle: 'swing' | 'day' | 'position' | 'scalp';
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  preferredTokens: TokenPreference[];
  preferredProtocols: ProtocolPreference[];
  tradeTiming: TimingAnalysis;
  tradeSizing: SizingAnalysis;
}

export interface TokenPreference {
  tokenAddress: string;
  tokenSymbol: string;
  tradeCount: number;
  totalVolume: number;
}

export interface ProtocolPreference {
  protocolId: string;
  protocolName: string;
  tradeCount: number;
  totalVolume: number;
}

export interface TimingAnalysis {
  earlyTrades: number;
  midTrades: number;
  lateTrades: number;
  exitTrades: number;
  avgHoldingPeriodDays: number;
}

export interface SizingAnalysis {
  avgTradeSize: number;
  minTradeSize: number;
  maxTradeSize: number;
  tradeSizeVariance: number;
}

/**
 * BehavioralAnalyzer - Singleton engine for analyzing trading behavior
 */
export class BehavioralAnalyzer {
  private static instance: BehavioralAnalyzer;

  private constructor() {}

  public static getInstance(): BehavioralAnalyzer {
    if (!BehavioralAnalyzer.instance) {
      BehavioralAnalyzer.instance = new BehavioralAnalyzer();
    }
    return BehavioralAnalyzer.instance;
  }

  /**
   * Analyze complete behavioral profile
   */
  public analyzeBehavior(trades: Trade[]): BehavioralProfile {
    return {
      tradingStyle: this.analyzeTradingStyle(trades),
      riskProfile: this.analyzeRiskProfile(trades),
      preferredTokens: this.analyzePreferredTokens(trades),
      preferredProtocols: this.analyzePreferredProtocols(trades),
      tradeTiming: this.analyzeTradeTiming(trades),
      tradeSizing: this.analyzeTradeSizing(trades),
    };
  }

  /**
   * Analyze trading style based on holding period
   * - Scalp: <1 day
   * - Day: 1-7 days
   * - Swing: 7-30 days
   * - Position: >30 days
   */
  public analyzeTradingStyle(trades: Trade[]): 'swing' | 'day' | 'position' | 'scalp' {
    if (trades.length === 0) return 'day';

    const avgHoldingPeriod = this.calculateAvgHoldingPeriod(trades);

    if (avgHoldingPeriod < 1) return 'scalp';
    if (avgHoldingPeriod < 7) return 'day';
    if (avgHoldingPeriod < 30) return 'swing';
    return 'position';
  }

  /**
   * Analyze risk profile based on trade size variance
   * - Conservative: Low variance (<0.3)
   * - Moderate: Medium variance (0.3-0.7)
   * - Aggressive: High variance (>0.7)
   */
  public analyzeRiskProfile(trades: Trade[]): 'conservative' | 'moderate' | 'aggressive' {
    if (trades.length === 0) return 'moderate';

    const variance = this.calculateTradeSizeVariance(trades);

    if (variance < 0.3) return 'conservative';
    if (variance < 0.7) return 'moderate';
    return 'aggressive';
  }

  /**
   * Analyze preferred tokens (top 10 by trade count)
   */
  public analyzePreferredTokens(trades: Trade[]): TokenPreference[] {
    const tokenMap = new Map<string, { symbol: string; count: number; volume: number }>();

    for (const trade of trades) {
      const address = trade.tokenOutAddress;
      const symbol = trade.tokenOutSymbol;
      const existing = tokenMap.get(address) || { symbol, count: 0, volume: 0 };
      
      tokenMap.set(address, {
        symbol,
        count: existing.count + 1,
        volume: existing.volume + trade.tradeSizeUsd,
      });
    }

    return Array.from(tokenMap.entries())
      .map(([address, data]) => ({
        tokenAddress: address,
        tokenSymbol: data.symbol,
        tradeCount: data.count,
        totalVolume: data.volume,
      }))
      .sort((a, b) => b.tradeCount - a.tradeCount)
      .slice(0, 10);
  }

  /**
   * Analyze preferred protocols (top 5 by volume)
   */
  public analyzePreferredProtocols(trades: Trade[]): ProtocolPreference[] {
    const protocolMap = new Map<string, { name: string; count: number; volume: number }>();

    for (const trade of trades) {
      const id = trade.protocolId;
      const name = trade.protocolName;
      const existing = protocolMap.get(id) || { name, count: 0, volume: 0 };
      
      protocolMap.set(id, {
        name,
        count: existing.count + 1,
        volume: existing.volume + trade.tradeSizeUsd,
      });
    }

    return Array.from(protocolMap.entries())
      .map(([id, data]) => ({
        protocolId: id,
        protocolName: data.name,
        tradeCount: data.count,
        totalVolume: data.volume,
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 5);
  }

  /**
   * Analyze trade timing distribution
   */
  public analyzeTradeTiming(trades: Trade[]): TimingAnalysis {
    let earlyTrades = 0;
    let midTrades = 0;
    let lateTrades = 0;
    let exitTrades = 0;

    for (const trade of trades) {
      // Simple heuristic: classify based on ROI
      const roi = trade.roi || 0;
      
      if (roi > 10) {
        exitTrades++;
      } else if (roi > 5) {
        lateTrades++;
      } else if (roi > 0) {
        midTrades++;
      } else {
        earlyTrades++;
      }
    }

    return {
      earlyTrades,
      midTrades,
      lateTrades,
      exitTrades,
      avgHoldingPeriodDays: this.calculateAvgHoldingPeriod(trades),
    };
  }

  /**
   * Analyze trade sizing patterns
   */
  public analyzeTradeSizing(trades: Trade[]): SizingAnalysis {
    if (trades.length === 0) {
      return {
        avgTradeSize: 0,
        minTradeSize: 0,
        maxTradeSize: 0,
        tradeSizeVariance: 0,
      };
    }

    const sizes = trades.map(t => t.tradeSizeUsd);
    const avgTradeSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
    const minTradeSize = Math.min(...sizes);
    const maxTradeSize = Math.max(...sizes);
    const tradeSizeVariance = this.calculateTradeSizeVariance(trades);

    return {
      avgTradeSize,
      minTradeSize,
      maxTradeSize,
      tradeSizeVariance,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateAvgHoldingPeriod(trades: Trade[]): number {
    if (trades.length === 0) return 0;

    // Simple heuristic: use time between first and last trade divided by trade count
    const timestamps = trades.map(t => new Date(t.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeSpanDays = (maxTime - minTime) / (24 * 60 * 60 * 1000);

    return timeSpanDays / Math.max(trades.length - 1, 1);
  }

  private calculateTradeSizeVariance(trades: Trade[]): number {
    if (trades.length === 0) return 0;

    const sizes = trades.map(t => t.tradeSizeUsd);
    const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
    
    if (avgSize === 0) return 0;

    const variance = sizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0) / sizes.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation (normalized variance)
    return stdDev / avgSize;
  }
}

