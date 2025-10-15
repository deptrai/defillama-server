/**
 * Unit Tests: SmartMoneyDiscovery
 * Story: 3.1.1 - Smart Money Identification
 */

import { SmartMoneyDiscovery, DiscoveredWallet } from '../smart-money-discovery';
import * as dbConnection from '../../db/connection';

// Mock database connection
jest.mock('../../db/connection');
const mockQuery = dbConnection.query as jest.MockedFunction<typeof dbConnection.query>;

describe('SmartMoneyDiscovery', () => {
  let discovery: SmartMoneyDiscovery;

  beforeEach(() => {
    jest.clearAllMocks();
    discovery = SmartMoneyDiscovery.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SmartMoneyDiscovery.getInstance();
      const instance2 = SmartMoneyDiscovery.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('discoverWallets', () => {
    it('should discover wallets meeting default criteria', async () => {
      const wallets = await discovery.discoverWallets({ limit: 50 });

      expect(wallets.length).toBeGreaterThan(0);
      expect(wallets.length).toBeLessThanOrEqual(50);

      // Verify all wallets meet criteria
      wallets.forEach(wallet => {
        expect(wallet.totalTrades).toBeGreaterThanOrEqual(50);
        expect(wallet.roiAllTime).toBeGreaterThanOrEqual(0.20);
        expect(wallet.winRate).toBeGreaterThanOrEqual(55.0);
        expect(wallet.avgTradeSize).toBeGreaterThanOrEqual(1000);
        expect(wallet.score).toBeDefined();
        expect(wallet.score.smartMoneyScore).toBeGreaterThanOrEqual(0);
        expect(wallet.score.smartMoneyScore).toBeLessThanOrEqual(100);
        expect(wallet.discoveryTimestamp).toBeInstanceOf(Date);
      });
    });

    it('should discover wallets with custom criteria', async () => {
      const wallets = await discovery.discoverWallets({
        minTrades: 100,
        minROI: 0.50,
        minWinRate: 65.0,
        minTradeSize: 50000,
        limit: 30,
      });

      expect(wallets.length).toBeLessThanOrEqual(30);

      // Verify all wallets meet custom criteria
      wallets.forEach(wallet => {
        expect(wallet.totalTrades).toBeGreaterThanOrEqual(100);
        expect(wallet.roiAllTime).toBeGreaterThanOrEqual(0.50);
        expect(wallet.winRate).toBeGreaterThanOrEqual(65.0);
        expect(wallet.avgTradeSize).toBeGreaterThanOrEqual(50000);
      });
    });

    it('should return wallets sorted by score (highest first)', async () => {
      const wallets = await discovery.discoverWallets({ limit: 20 });

      for (let i = 0; i < wallets.length - 1; i++) {
        expect(wallets[i].score.smartMoneyScore).toBeGreaterThanOrEqual(
          wallets[i + 1].score.smartMoneyScore
        );
      }
    });

    it('should return empty array if no wallets meet criteria', async () => {
      const wallets = await discovery.discoverWallets({
        minTrades: 10000, // Impossible criteria
        minROI: 10.0,
        minWinRate: 99.0,
        limit: 100,
      });

      expect(wallets).toEqual([]);
    });
  });

  describe('processWalletBatch', () => {
    it('should insert wallets into database', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      const mockWallets: DiscoveredWallet[] = [
        {
          walletAddress: '0x1111111111111111111111111111111111111111',
          chainId: 'ethereum',
          totalPnl: 1000000,
          roiAllTime: 1.5,
          winRate: 70.0,
          sharpeRatio: 2.0,
          maxDrawdown: -0.20,
          totalTrades: 500,
          avgTradeSize: 100000,
          avgHoldingPeriodDays: 30,
          tradingStyle: 'swing_trading',
          riskProfile: 'medium',
          verified: false,
          score: {
            walletAddress: '0x1111111111111111111111111111111111111111',
            smartMoneyScore: 75,
            confidenceLevel: 'medium',
            breakdown: {
              performanceScore: 70,
              activityScore: 75,
              behavioralScore: 75,
              verificationScore: 50,
            },
          },
          discoveryTimestamp: new Date(),
        },
        {
          walletAddress: '0x2222222222222222222222222222222222222222',
          chainId: 'polygon',
          totalPnl: 500000,
          roiAllTime: 1.3,
          winRate: 65.0,
          sharpeRatio: 1.8,
          maxDrawdown: -0.25,
          totalTrades: 300,
          avgTradeSize: 80000,
          avgHoldingPeriodDays: 25,
          tradingStyle: 'momentum_trading',
          riskProfile: 'high',
          verified: false,
          score: {
            walletAddress: '0x2222222222222222222222222222222222222222',
            smartMoneyScore: 68,
            confidenceLevel: 'low',
            breakdown: {
              performanceScore: 65,
              activityScore: 70,
              behavioralScore: 70,
              verificationScore: 50,
            },
          },
          discoveryTimestamp: new Date(),
        },
      ];

      const insertedCount = await discovery.processWalletBatch(mockWallets);

      expect(insertedCount).toBe(2);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const mockWallets: DiscoveredWallet[] = [
        {
          walletAddress: '0x1111111111111111111111111111111111111111',
          chainId: 'ethereum',
          totalPnl: 1000000,
          roiAllTime: 1.5,
          winRate: 70.0,
          sharpeRatio: 2.0,
          maxDrawdown: -0.20,
          totalTrades: 500,
          avgTradeSize: 100000,
          avgHoldingPeriodDays: 30,
          verified: false,
          score: {
            walletAddress: '0x1111111111111111111111111111111111111111',
            smartMoneyScore: 75,
            confidenceLevel: 'medium',
            breakdown: {
              performanceScore: 70,
              activityScore: 75,
              behavioralScore: 75,
              verificationScore: 50,
            },
          },
          discoveryTimestamp: new Date(),
        },
      ];

      const insertedCount = await discovery.processWalletBatch(mockWallets);

      expect(insertedCount).toBe(0);
    });
  });

  describe('getDiscoveryStats', () => {
    it('should calculate correct statistics', async () => {
      const wallets = await discovery.discoverWallets({ limit: 50 });
      const stats = discovery.getDiscoveryStats(wallets);

      expect(stats.total).toBe(wallets.length);
      expect(stats.highConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.mediumConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.lowConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.highConfidence + stats.mediumConfidence + stats.lowConfidence).toBe(stats.total);
      expect(stats.avgScore).toBeGreaterThan(0);
      expect(stats.avgScore).toBeLessThanOrEqual(100);
    });

    it('should handle empty wallet list', () => {
      const stats = discovery.getDiscoveryStats([]);

      expect(stats.total).toBe(0);
      expect(stats.highConfidence).toBe(0);
      expect(stats.mediumConfidence).toBe(0);
      expect(stats.lowConfidence).toBe(0);
      expect(stats.avgScore).toBeNaN();
    });
  });

  describe('Mock Data Generation', () => {
    it('should generate diverse wallet data', async () => {
      const wallets = await discovery.discoverWallets({ limit: 100 });

      // Check for diversity in chains
      const chains = new Set(wallets.map(w => w.chainId));
      expect(chains.size).toBeGreaterThan(1);

      // Check for diversity in trading styles
      const styles = new Set(wallets.map(w => w.tradingStyle));
      expect(styles.size).toBeGreaterThan(1);

      // Check for diversity in risk profiles
      const profiles = new Set(wallets.map(w => w.riskProfile));
      expect(profiles.size).toBeGreaterThan(1);
    });

    it('should generate realistic metric ranges', async () => {
      const wallets = await discovery.discoverWallets({ limit: 100 });

      wallets.forEach(wallet => {
        // ROI should be positive and reasonable
        expect(wallet.roiAllTime).toBeGreaterThan(0);
        expect(wallet.roiAllTime).toBeLessThan(5.0);

        // Win rate should be between 0-100
        expect(wallet.winRate).toBeGreaterThanOrEqual(0);
        expect(wallet.winRate).toBeLessThanOrEqual(100);

        // Sharpe ratio should be reasonable
        expect(wallet.sharpeRatio).toBeGreaterThan(0);
        expect(wallet.sharpeRatio).toBeLessThan(5.0);

        // Max drawdown should be negative
        expect(wallet.maxDrawdown).toBeLessThan(0);
        expect(wallet.maxDrawdown).toBeGreaterThan(-1.0);

        // Trade size should be positive
        expect(wallet.avgTradeSize).toBeGreaterThan(0);

        // Holding period should be positive
        expect(wallet.avgHoldingPeriodDays).toBeGreaterThan(0);
      });
    });
  });
});

