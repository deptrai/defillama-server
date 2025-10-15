/**
 * Unit Tests: SmartMoneyScorer
 * Story: 3.1.1 - Smart Money Identification
 */

import { SmartMoneyScorer, WalletData, SmartMoneyScore } from '../smart-money-scorer';

describe('SmartMoneyScorer', () => {
  let scorer: SmartMoneyScorer;

  beforeEach(() => {
    scorer = SmartMoneyScorer.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SmartMoneyScorer.getInstance();
      const instance2 = SmartMoneyScorer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('calculateScore', () => {
    it('should calculate score for high-performing whale', () => {
      const wallet: WalletData = {
        walletAddress: '0x1234',
        chainId: 'ethereum',
        totalPnl: 15000000,
        roiAllTime: 2.5, // 250% ROI
        winRate: 78.5,
        sharpeRatio: 2.85,
        maxDrawdown: -0.12,
        totalTrades: 450,
        avgTradeSize: 850000,
        avgHoldingPeriodDays: 45.5,
        tradingStyle: 'swing_trading',
        riskProfile: 'high',
        verified: true,
      };

      const result = scorer.calculateScore(wallet);

      expect(result.walletAddress).toBe('0x1234');
      expect(result.smartMoneyScore).toBeGreaterThanOrEqual(80);
      expect(result.smartMoneyScore).toBeLessThanOrEqual(95);
      expect(['high', 'medium']).toContain(result.confidenceLevel);
      expect(result.breakdown.performanceScore).toBeGreaterThan(75);
      expect(result.breakdown.activityScore).toBeGreaterThanOrEqual(65);
      expect(result.breakdown.behavioralScore).toBeGreaterThanOrEqual(65);
      expect(result.breakdown.verificationScore).toBe(100);
    });

    it('should calculate score for medium-performing trader', () => {
      const wallet: WalletData = {
        walletAddress: '0x5678',
        chainId: 'polygon',
        totalPnl: 1500000,
        roiAllTime: 1.2, // 120% ROI
        winRate: 64.0,
        sharpeRatio: 1.9,
        maxDrawdown: -0.30,
        totalTrades: 520,
        avgTradeSize: 180000,
        avgHoldingPeriodDays: 18.0,
        tradingStyle: 'momentum_trading',
        riskProfile: 'high',
        verified: false,
      };

      const result = scorer.calculateScore(wallet);

      expect(result.smartMoneyScore).toBeGreaterThanOrEqual(55);
      expect(result.smartMoneyScore).toBeLessThanOrEqual(70);
      expect(['medium', 'low']).toContain(result.confidenceLevel);
      expect(result.breakdown.verificationScore).toBe(50);
    });

    it('should calculate score for low-performing protocol', () => {
      const wallet: WalletData = {
        walletAddress: '0x9abc',
        chainId: 'optimism',
        totalPnl: 1800000,
        roiAllTime: 1.02, // 102% ROI
        winRate: 58.5,
        sharpeRatio: 1.65,
        maxDrawdown: -0.37,
        totalTrades: 110,
        avgTradeSize: 780000,
        avgHoldingPeriodDays: 200.0,
        tradingStyle: 'protocol_operations',
        riskProfile: 'low',
        verified: false,
      };

      const result = scorer.calculateScore(wallet);

      expect(result.smartMoneyScore).toBeGreaterThanOrEqual(50);
      expect(result.smartMoneyScore).toBeLessThanOrEqual(65);
      expect(result.confidenceLevel).toBe('low');
    });
  });

  describe('Performance Score Calculation', () => {
    it('should give high score for excellent performance', () => {
      const wallet: WalletData = {
        walletAddress: '0xtest',
        chainId: 'ethereum',
        totalPnl: 10000000,
        roiAllTime: 3.0, // 300% ROI (capped at 200%)
        winRate: 85.0,
        sharpeRatio: 3.5, // Capped at 3.0
        maxDrawdown: -0.05,
        totalTrades: 500,
        avgTradeSize: 500000,
        avgHoldingPeriodDays: 30,
        verified: true,
      };

      const result = scorer.calculateScore(wallet);
      expect(result.breakdown.performanceScore).toBeGreaterThan(90);
    });

    it('should give low score for poor performance', () => {
      const wallet: WalletData = {
        walletAddress: '0xtest',
        chainId: 'ethereum',
        totalPnl: -500000,
        roiAllTime: 0.5, // 50% ROI
        winRate: 45.0,
        sharpeRatio: 0.8,
        maxDrawdown: -0.50,
        totalTrades: 500,
        avgTradeSize: 500000,
        avgHoldingPeriodDays: 30,
        verified: true,
      };

      const result = scorer.calculateScore(wallet);
      expect(result.breakdown.performanceScore).toBeLessThan(50);
    });
  });

  describe('Activity Score Calculation', () => {
    it('should give high score for high activity', () => {
      const wallet: WalletData = {
        walletAddress: '0xtest',
        chainId: 'ethereum',
        totalPnl: 5000000,
        roiAllTime: 1.5,
        winRate: 70.0,
        sharpeRatio: 2.0,
        maxDrawdown: -0.20,
        totalTrades: 1200, // High trade count
        avgTradeSize: 1500000, // Large trades
        avgHoldingPeriodDays: 60, // Consistent
        verified: true,
      };

      const result = scorer.calculateScore(wallet);
      expect(result.breakdown.activityScore).toBeGreaterThan(85);
    });

    it('should give low score for low activity', () => {
      const wallet: WalletData = {
        walletAddress: '0xtest',
        chainId: 'ethereum',
        totalPnl: 5000000,
        roiAllTime: 1.5,
        winRate: 70.0,
        sharpeRatio: 2.0,
        maxDrawdown: -0.20,
        totalTrades: 30, // Low trade count
        avgTradeSize: 500, // Small trades
        avgHoldingPeriodDays: 2, // Inconsistent
        verified: true,
      };

      const result = scorer.calculateScore(wallet);
      expect(result.breakdown.activityScore).toBeLessThan(30);
    });
  });

  describe('Behavioral Score Calculation', () => {
    it('should give high score for position trading with low risk', () => {
      const wallet: WalletData = {
        walletAddress: '0xtest',
        chainId: 'ethereum',
        totalPnl: 5000000,
        roiAllTime: 1.5,
        winRate: 70.0,
        sharpeRatio: 2.0,
        maxDrawdown: -0.20,
        totalTrades: 500,
        avgTradeSize: 500000,
        avgHoldingPeriodDays: 30,
        tradingStyle: 'position_trading',
        riskProfile: 'low',
        verified: true,
      };

      const result = scorer.calculateScore(wallet);
      expect(result.breakdown.behavioralScore).toBeGreaterThan(80);
    });

    it('should give lower score for scalping with high risk', () => {
      const wallet: WalletData = {
        walletAddress: '0xtest',
        chainId: 'ethereum',
        totalPnl: 5000000,
        roiAllTime: 1.5,
        winRate: 70.0,
        sharpeRatio: 2.0,
        maxDrawdown: -0.20,
        totalTrades: 500,
        avgTradeSize: 500000,
        avgHoldingPeriodDays: 30,
        tradingStyle: 'scalping',
        riskProfile: 'high',
        verified: true,
      };

      const result = scorer.calculateScore(wallet);
      expect(result.breakdown.behavioralScore).toBeLessThan(70);
    });
  });

  describe('Verification Score Calculation', () => {
    it('should give 100 score for verified wallets', () => {
      const wallet: WalletData = {
        walletAddress: '0xtest',
        chainId: 'ethereum',
        totalPnl: 5000000,
        roiAllTime: 1.5,
        winRate: 70.0,
        sharpeRatio: 2.0,
        maxDrawdown: -0.20,
        totalTrades: 500,
        avgTradeSize: 500000,
        avgHoldingPeriodDays: 30,
        verified: true,
      };

      const result = scorer.calculateScore(wallet);
      expect(result.breakdown.verificationScore).toBe(100);
    });

    it('should give 50 score for unverified wallets', () => {
      const wallet: WalletData = {
        walletAddress: '0xtest',
        chainId: 'ethereum',
        totalPnl: 5000000,
        roiAllTime: 1.5,
        winRate: 70.0,
        sharpeRatio: 2.0,
        maxDrawdown: -0.20,
        totalTrades: 500,
        avgTradeSize: 500000,
        avgHoldingPeriodDays: 30,
        verified: false,
      };

      const result = scorer.calculateScore(wallet);
      expect(result.breakdown.verificationScore).toBe(50);
    });
  });

  describe('Confidence Level', () => {
    it('should return high confidence for score >= 90', () => {
      const wallet: WalletData = {
        walletAddress: '0xtest',
        chainId: 'ethereum',
        totalPnl: 15000000,
        roiAllTime: 2.5,
        winRate: 85.0,
        sharpeRatio: 2.9,
        maxDrawdown: -0.05,
        totalTrades: 1000,
        avgTradeSize: 1200000,
        avgHoldingPeriodDays: 60,
        tradingStyle: 'position_trading',
        riskProfile: 'low',
        verified: true,
      };

      const result = scorer.calculateScore(wallet);
      expect(result.smartMoneyScore).toBeGreaterThanOrEqual(90);
      expect(result.confidenceLevel).toBe('high');
    });

    it('should return medium confidence for score 70-89', () => {
      const wallet: WalletData = {
        walletAddress: '0xtest',
        chainId: 'ethereum',
        totalPnl: 3000000,
        roiAllTime: 1.6,
        winRate: 72.0,
        sharpeRatio: 2.3,
        maxDrawdown: -0.20,
        totalTrades: 700,
        avgTradeSize: 400000,
        avgHoldingPeriodDays: 35,
        tradingStyle: 'swing_trading',
        riskProfile: 'medium',
        verified: true,
      };

      const result = scorer.calculateScore(wallet);
      expect(result.smartMoneyScore).toBeGreaterThanOrEqual(70);
      expect(result.smartMoneyScore).toBeLessThan(90);
      expect(result.confidenceLevel).toBe('medium');
    });

    it('should return low confidence for score < 70', () => {
      const wallet: WalletData = {
        walletAddress: '0xtest',
        chainId: 'ethereum',
        totalPnl: 1000000,
        roiAllTime: 1.05,
        winRate: 58.0,
        sharpeRatio: 1.6,
        maxDrawdown: -0.35,
        totalTrades: 100,
        avgTradeSize: 800000,
        avgHoldingPeriodDays: 180,
        tradingStyle: 'protocol_operations',
        riskProfile: 'low',
        verified: false,
      };

      const result = scorer.calculateScore(wallet);
      expect(result.confidenceLevel).toBe('low');
    });
  });

  describe('Batch Processing', () => {
    it('should calculate scores for multiple wallets', () => {
      const wallets: WalletData[] = [
        {
          walletAddress: '0x1111',
          chainId: 'ethereum',
          totalPnl: 10000000,
          roiAllTime: 2.0,
          winRate: 75.0,
          sharpeRatio: 2.5,
          maxDrawdown: -0.15,
          totalTrades: 600,
          avgTradeSize: 700000,
          avgHoldingPeriodDays: 40,
          verified: true,
        },
        {
          walletAddress: '0x2222',
          chainId: 'polygon',
          totalPnl: 2000000,
          roiAllTime: 1.3,
          winRate: 65.0,
          sharpeRatio: 1.9,
          maxDrawdown: -0.28,
          totalTrades: 400,
          avgTradeSize: 200000,
          avgHoldingPeriodDays: 20,
          verified: false,
        },
        {
          walletAddress: '0x3333',
          chainId: 'arbitrum',
          totalPnl: 500000,
          roiAllTime: 1.1,
          winRate: 60.0,
          sharpeRatio: 1.7,
          maxDrawdown: -0.32,
          totalTrades: 150,
          avgTradeSize: 100000,
          avgHoldingPeriodDays: 15,
          verified: false,
        },
      ];

      const results = scorer.batchCalculateScores(wallets);

      expect(results).toHaveLength(3);
      expect(results[0].walletAddress).toBe('0x1111');
      expect(results[1].walletAddress).toBe('0x2222');
      expect(results[2].walletAddress).toBe('0x3333');
      expect(results[0].smartMoneyScore).toBeGreaterThan(results[1].smartMoneyScore);
      expect(results[1].smartMoneyScore).toBeGreaterThan(results[2].smartMoneyScore);
    });
  });
});

