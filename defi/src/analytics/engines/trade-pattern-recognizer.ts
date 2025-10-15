/**
 * Trade Pattern Recognizer Engine
 * Story: 3.1.2 - Trade Pattern Analysis
 * 
 * Detects trading patterns from smart money wallets:
 * - Accumulation: 3+ buys, 7+ days, position growth >50%
 * - Distribution: 3+ sells, 7+ days, position decrease >50%
 * - Rotation: 2+ tokens, <24h, value similarity >80%
 * - Arbitrage: Cross-DEX, <5min, profit >0
 */

export interface Trade {
  id: string;
  walletId: string;
  txHash: string;
  timestamp: Date;
  tradeType: 'buy' | 'sell' | 'swap';
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
  realizedPnl?: number;
  unrealizedPnl?: number;
  roi?: number;
}

export interface Pattern {
  type: 'accumulation' | 'distribution' | 'rotation' | 'arbitrage';
  confidence: number; // 0-100
  trades: Trade[];
  startTimestamp: Date;
  endTimestamp: Date;
  durationHours: number;
  tokenAddress?: string;
  tokenSymbol?: string;
  totalVolume: number;
  avgTradeSize: number;
  realizedPnl?: number;
  roi?: number;
}

/**
 * TradePatternRecognizer - Singleton engine for detecting trading patterns
 */
export class TradePatternRecognizer {
  private static instance: TradePatternRecognizer;

  private constructor() {}

  public static getInstance(): TradePatternRecognizer {
    if (!TradePatternRecognizer.instance) {
      TradePatternRecognizer.instance = new TradePatternRecognizer();
    }
    return TradePatternRecognizer.instance;
  }

  /**
   * Detect accumulation pattern
   * Criteria: 3+ buy trades, 7+ days, position growth >50%
   */
  public detectAccumulation(trades: Trade[]): Pattern | null {
    const buyTrades = trades.filter(t => t.tradeType === 'buy');
    
    if (buyTrades.length < 3) {
      return null;
    }

    const timeSpan = this.calculateTimeSpan(buyTrades);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    
    if (timeSpan < sevenDaysMs) {
      return null;
    }

    const positionGrowth = this.calculatePositionGrowth(buyTrades);
    
    if (positionGrowth < 0.5) { // 50% growth
      return null;
    }

    const confidence = this.calculateAccumulationConfidence(buyTrades, timeSpan, positionGrowth);
    const totalVolume = buyTrades.reduce((sum, t) => sum + t.tradeSizeUsd, 0);
    const avgTradeSize = totalVolume / buyTrades.length;

    return {
      type: 'accumulation',
      confidence,
      trades: buyTrades,
      startTimestamp: buyTrades[0].timestamp,
      endTimestamp: buyTrades[buyTrades.length - 1].timestamp,
      durationHours: timeSpan / (60 * 60 * 1000),
      tokenAddress: buyTrades[0].tokenOutAddress,
      tokenSymbol: buyTrades[0].tokenOutSymbol,
      totalVolume,
      avgTradeSize,
      unrealizedPnl: buyTrades.reduce((sum, t) => sum + (t.unrealizedPnl || 0), 0),
      roi: buyTrades.reduce((sum, t) => sum + (t.roi || 0), 0) / buyTrades.length,
    };
  }

  /**
   * Detect distribution pattern
   * Criteria: 3+ sell trades, 7+ days, position decrease >50%
   */
  public detectDistribution(trades: Trade[]): Pattern | null {
    const sellTrades = trades.filter(t => t.tradeType === 'sell');
    
    if (sellTrades.length < 3) {
      return null;
    }

    const timeSpan = this.calculateTimeSpan(sellTrades);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    
    if (timeSpan < sevenDaysMs) {
      return null;
    }

    const positionDecrease = this.calculatePositionDecrease(sellTrades);
    
    if (positionDecrease < 0.5) { // 50% decrease
      return null;
    }

    const confidence = this.calculateDistributionConfidence(sellTrades, timeSpan, positionDecrease);
    const totalVolume = sellTrades.reduce((sum, t) => sum + t.tradeSizeUsd, 0);
    const avgTradeSize = totalVolume / sellTrades.length;

    return {
      type: 'distribution',
      confidence,
      trades: sellTrades,
      startTimestamp: sellTrades[0].timestamp,
      endTimestamp: sellTrades[sellTrades.length - 1].timestamp,
      durationHours: timeSpan / (60 * 60 * 1000),
      tokenAddress: sellTrades[0].tokenInAddress,
      tokenSymbol: sellTrades[0].tokenInSymbol,
      totalVolume,
      avgTradeSize,
      realizedPnl: sellTrades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0),
      roi: sellTrades.reduce((sum, t) => sum + (t.roi || 0), 0) / sellTrades.length,
    };
  }

  /**
   * Detect rotation pattern
   * Criteria: 2+ tokens, <24h, value similarity >80%
   */
  public detectRotation(trades: Trade[]): Pattern | null {
    if (trades.length < 2) {
      return null;
    }

    const uniqueTokens = new Set(trades.map(t => t.tokenOutAddress));
    
    if (uniqueTokens.size < 2) {
      return null;
    }

    const timeSpan = this.calculateTimeSpan(trades);
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    
    if (timeSpan > twentyFourHoursMs) {
      return null;
    }

    const valueSimilarity = this.calculateValueSimilarity(trades);
    
    if (valueSimilarity < 0.8) { // 80% similarity
      return null;
    }

    const confidence = this.calculateRotationConfidence(trades, timeSpan, valueSimilarity);
    const totalVolume = trades.reduce((sum, t) => sum + t.tradeSizeUsd, 0);
    const avgTradeSize = totalVolume / trades.length;

    return {
      type: 'rotation',
      confidence,
      trades,
      startTimestamp: trades[0].timestamp,
      endTimestamp: trades[trades.length - 1].timestamp,
      durationHours: timeSpan / (60 * 60 * 1000),
      totalVolume,
      avgTradeSize,
      realizedPnl: trades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0),
      roi: trades.reduce((sum, t) => sum + (t.roi || 0), 0) / trades.length,
    };
  }

  /**
   * Detect arbitrage pattern
   * Criteria: Cross-DEX, <5min, profit >0
   */
  public detectArbitrage(trades: Trade[]): Pattern | null {
    if (trades.length < 2) {
      return null;
    }

    const timeSpan = this.calculateTimeSpan(trades);
    const fiveMinutesMs = 5 * 60 * 1000;
    
    if (timeSpan > fiveMinutesMs) {
      return null;
    }

    const crossDex = this.isCrossDex(trades);
    
    if (!crossDex) {
      return null;
    }

    const profit = this.calculateProfit(trades);
    
    if (profit <= 0) {
      return null;
    }

    const confidence = this.calculateArbitrageConfidence(trades, timeSpan, profit);
    const totalVolume = trades.reduce((sum, t) => sum + t.tradeSizeUsd, 0);
    const avgTradeSize = totalVolume / trades.length;

    return {
      type: 'arbitrage',
      confidence,
      trades,
      startTimestamp: trades[0].timestamp,
      endTimestamp: trades[trades.length - 1].timestamp,
      durationHours: timeSpan / (60 * 60 * 1000),
      totalVolume,
      avgTradeSize,
      realizedPnl: profit,
      roi: (profit / totalVolume) * 100,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateTimeSpan(trades: Trade[]): number {
    if (trades.length === 0) return 0;
    
    const timestamps = trades.map(t => new Date(t.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    
    return maxTime - minTime;
  }

  private calculatePositionGrowth(buyTrades: Trade[]): number {
    if (buyTrades.length === 0) return 0;
    
    const firstTradeSize = buyTrades[0].tokenOutAmount;
    const lastTradeSize = buyTrades[buyTrades.length - 1].tokenOutAmount;
    
    return (lastTradeSize - firstTradeSize) / firstTradeSize;
  }

  private calculatePositionDecrease(sellTrades: Trade[]): number {
    if (sellTrades.length === 0) return 0;
    
    const firstTradeSize = sellTrades[0].tokenInAmount;
    const lastTradeSize = sellTrades[sellTrades.length - 1].tokenInAmount;
    
    return (firstTradeSize - lastTradeSize) / firstTradeSize;
  }

  private calculateValueSimilarity(trades: Trade[]): number {
    if (trades.length === 0) return 0;
    
    const values = trades.map(t => t.tradeSizeUsd);
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
    const maxDeviation = Math.max(...values.map(v => Math.abs(v - avgValue)));
    
    return 1 - (maxDeviation / avgValue);
  }

  private isCrossDex(trades: Trade[]): boolean {
    const uniqueDexes = new Set(trades.map(t => t.dexName));
    return uniqueDexes.size > 1;
  }

  private calculateProfit(trades: Trade[]): number {
    return trades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
  }

  private calculateAccumulationConfidence(trades: Trade[], timeSpan: number, positionGrowth: number): number {
    let confidence = 50; // Base confidence
    
    // More trades = higher confidence
    confidence += Math.min(trades.length * 5, 20);
    
    // Longer timespan = higher confidence (up to 30 days)
    const days = timeSpan / (24 * 60 * 60 * 1000);
    confidence += Math.min(days * 1, 15);
    
    // Higher position growth = higher confidence
    confidence += Math.min(positionGrowth * 20, 15);
    
    return Math.min(confidence, 100);
  }

  private calculateDistributionConfidence(trades: Trade[], timeSpan: number, positionDecrease: number): number {
    let confidence = 50; // Base confidence
    
    // More trades = higher confidence
    confidence += Math.min(trades.length * 5, 20);
    
    // Longer timespan = higher confidence
    const days = timeSpan / (24 * 60 * 60 * 1000);
    confidence += Math.min(days * 1, 15);
    
    // Higher position decrease = higher confidence
    confidence += Math.min(positionDecrease * 20, 15);
    
    return Math.min(confidence, 100);
  }

  private calculateRotationConfidence(trades: Trade[], timeSpan: number, valueSimilarity: number): number {
    let confidence = 50; // Base confidence
    
    // More tokens = higher confidence
    const uniqueTokens = new Set(trades.map(t => t.tokenOutAddress));
    confidence += Math.min(uniqueTokens.size * 10, 20);
    
    // Shorter timespan = higher confidence
    const hours = timeSpan / (60 * 60 * 1000);
    confidence += Math.min((24 - hours) * 1, 15);
    
    // Higher value similarity = higher confidence
    confidence += Math.min(valueSimilarity * 15, 15);
    
    return Math.min(confidence, 100);
  }

  private calculateArbitrageConfidence(trades: Trade[], timeSpan: number, profit: number): number {
    let confidence = 50; // Base confidence
    
    // Cross-DEX = higher confidence
    const uniqueDexes = new Set(trades.map(t => t.dexName));
    confidence += Math.min(uniqueDexes.size * 10, 20);
    
    // Shorter timespan = higher confidence
    const minutes = timeSpan / (60 * 1000);
    confidence += Math.min((5 - minutes) * 3, 15);
    
    // Higher profit = higher confidence
    const totalVolume = trades.reduce((sum, t) => sum + t.tradeSizeUsd, 0);
    const profitPct = (profit / totalVolume) * 100;
    confidence += Math.min(profitPct * 3, 15);
    
    return Math.min(confidence, 100);
  }
}

