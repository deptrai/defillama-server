/**
 * Smart Money Scorer Engine
 * Story: 3.1.1 - Smart Money Identification
 * 
 * Multi-factor scoring algorithm for identifying smart money wallets:
 * - Performance: 40% (ROI, Win Rate, Sharpe Ratio, Max Drawdown)
 * - Activity: 30% (Trade Count, Trade Size, Consistency)
 * - Behavioral: 20% (Trading Style, Risk Profile)
 * - Verification: 10% (Manual verification bonus)
 */

export interface WalletData {
  walletAddress: string;
  chainId: string;
  
  // Performance metrics
  totalPnl: number;
  roiAllTime: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  
  // Activity metrics
  totalTrades: number;
  avgTradeSize: number;
  avgHoldingPeriodDays: number;
  
  // Behavioral
  tradingStyle?: string;
  riskProfile?: string;
  
  // Verification
  verified: boolean;
}

export interface SmartMoneyScore {
  walletAddress: string;
  smartMoneyScore: number; // 0-100
  confidenceLevel: 'high' | 'medium' | 'low';
  breakdown: {
    performanceScore: number;
    activityScore: number;
    behavioralScore: number;
    verificationScore: number;
  };
}

/**
 * SmartMoneyScorer - Singleton engine for calculating smart money scores
 */
export class SmartMoneyScorer {
  private static instance: SmartMoneyScorer;

  private weights = {
    performance: 0.40,
    activity: 0.30,
    behavioral: 0.20,
    verification: 0.10,
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SmartMoneyScorer {
    if (!SmartMoneyScorer.instance) {
      SmartMoneyScorer.instance = new SmartMoneyScorer();
    }
    return SmartMoneyScorer.instance;
  }

  /**
   * Calculate comprehensive smart money score
   */
  public calculateScore(wallet: WalletData): SmartMoneyScore {
    const performanceScore = this.calculatePerformanceScore(wallet);
    const activityScore = this.calculateActivityScore(wallet);
    const behavioralScore = this.calculateBehavioralScore(wallet);
    const verificationScore = this.calculateVerificationScore(wallet);

    const smartMoneyScore = Math.round(
      performanceScore * this.weights.performance +
      activityScore * this.weights.activity +
      behavioralScore * this.weights.behavioral +
      verificationScore * this.weights.verification
    );

    const confidenceLevel = this.getConfidenceLevel(smartMoneyScore);

    return {
      walletAddress: wallet.walletAddress,
      smartMoneyScore,
      confidenceLevel,
      breakdown: {
        performanceScore: Math.round(performanceScore),
        activityScore: Math.round(activityScore),
        behavioralScore: Math.round(behavioralScore),
        verificationScore: Math.round(verificationScore),
      },
    };
  }

  /**
   * Calculate performance score (40% weight)
   * Sub-weights: ROI 40%, Win Rate 30%, Sharpe 20%, Drawdown 10%
   */
  private calculatePerformanceScore(wallet: WalletData): number {
    const roiScore = this.normalizeROI(wallet.roiAllTime);
    const winRateScore = wallet.winRate; // Already 0-100
    const sharpeScore = this.normalizeSharpe(wallet.sharpeRatio);
    const drawdownScore = 100 - Math.abs(wallet.maxDrawdown * 100);

    return (
      roiScore * 0.40 +
      winRateScore * 0.30 +
      sharpeScore * 0.20 +
      drawdownScore * 0.10
    );
  }

  /**
   * Calculate activity score (30% weight)
   * Sub-weights: Trade Count 40%, Trade Size 30%, Consistency 30%
   */
  private calculateActivityScore(wallet: WalletData): number {
    const tradeCountScore = this.normalizeTradeCount(wallet.totalTrades);
    const tradeSizeScore = this.normalizeTradeSize(wallet.avgTradeSize);
    const consistencyScore = this.calculateConsistency(wallet);

    return (
      tradeCountScore * 0.40 +
      tradeSizeScore * 0.30 +
      consistencyScore * 0.30
    );
  }

  /**
   * Calculate behavioral score (20% weight)
   * Sub-weights: Trading Style 50%, Risk Profile 50%
   * Note: Simplified for MVP, would use ML in production
   */
  private calculateBehavioralScore(wallet: WalletData): number {
    // Trading style score (mock for MVP)
    const tradingStyleScore = this.getTradingStyleScore(wallet.tradingStyle);
    
    // Risk profile score (mock for MVP)
    const riskProfileScore = this.getRiskProfileScore(wallet.riskProfile);

    return tradingStyleScore * 0.50 + riskProfileScore * 0.50;
  }

  /**
   * Calculate verification score (10% weight)
   */
  private calculateVerificationScore(wallet: WalletData): number {
    return wallet.verified ? 100 : 50;
  }

  /**
   * Normalize ROI (0-200% → 0-100 score)
   * ROI > 200% gets 100 score
   */
  private normalizeROI(roi: number): number {
    if (roi <= 0) return 0;
    if (roi >= 2.0) return 100;
    return (roi / 2.0) * 100;
  }

  /**
   * Normalize Sharpe Ratio (0-3 → 0-100 score)
   * Sharpe > 3 gets 100 score
   */
  private normalizeSharpe(sharpe: number): number {
    if (sharpe <= 0) return 0;
    if (sharpe >= 3.0) return 100;
    return (sharpe / 3.0) * 100;
  }

  /**
   * Normalize Trade Count (50-1000 → 0-100 score)
   */
  private normalizeTradeCount(count: number): number {
    if (count < 50) return 0;
    if (count >= 1000) return 100;
    return ((count - 50) / (1000 - 50)) * 100;
  }

  /**
   * Normalize Trade Size ($1K-$1M → 0-100 score)
   */
  private normalizeTradeSize(size: number): number {
    const minSize = 1000; // $1K
    const maxSize = 1000000; // $1M
    
    if (size < minSize) return 0;
    if (size >= maxSize) return 100;
    return ((size - minSize) / (maxSize - minSize)) * 100;
  }

  /**
   * Calculate consistency score based on holding period
   * Longer holding period = more consistent
   */
  private calculateConsistency(wallet: WalletData): number {
    const holdingPeriod = wallet.avgHoldingPeriodDays;
    
    // 0-7 days: low consistency (0-40)
    // 7-30 days: medium consistency (40-70)
    // 30+ days: high consistency (70-100)
    
    if (holdingPeriod < 7) {
      return (holdingPeriod / 7) * 40;
    } else if (holdingPeriod < 30) {
      return 40 + ((holdingPeriod - 7) / (30 - 7)) * 30;
    } else {
      const score = 70 + Math.min((holdingPeriod - 30) / 90, 1) * 30;
      return Math.min(score, 100);
    }
  }

  /**
   * Get trading style score (mock for MVP)
   */
  private getTradingStyleScore(style?: string): number {
    const styleScores: Record<string, number> = {
      'position_trading': 85,
      'swing_trading': 80,
      'momentum_trading': 75,
      'day_trading': 70,
      'scalping': 65,
      'yield_farming': 75,
      'diversified': 80,
      'balanced': 75,
      'growth': 70,
      'derivatives': 65,
      'protocol_operations': 60,
    };
    
    return styleScores[style || ''] || 70; // Default 70
  }

  /**
   * Get risk profile score (mock for MVP)
   */
  private getRiskProfileScore(profile?: string): number {
    const profileScores: Record<string, number> = {
      'low': 85,
      'medium': 75,
      'high': 65,
    };
    
    return profileScores[profile || ''] || 75; // Default 75
  }

  /**
   * Get confidence level based on score
   */
  private getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 90) return 'high';
    if (score >= 70) return 'medium';
    return 'low';
  }

  /**
   * Batch calculate scores for multiple wallets
   */
  public batchCalculateScores(wallets: WalletData[]): SmartMoneyScore[] {
    return wallets.map(wallet => this.calculateScore(wallet));
  }
}

