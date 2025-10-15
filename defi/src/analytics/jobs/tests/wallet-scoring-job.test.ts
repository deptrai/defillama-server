/**
 * Unit Tests: WalletScoringJob
 * Story: 3.1.1 - Smart Money Identification (Enhancement 2)
 */

import { WalletScoringJob } from '../wallet-scoring-job';
import * as dbConnection from '../../db/connection';
import { SmartMoneyScorer } from '../../engines/smart-money-scorer';
import { SmartMoneyCache } from '../../services/smart-money-cache';

// Mock dependencies
jest.mock('../../db/connection');
jest.mock('../../engines/smart-money-scorer');
jest.mock('../../services/smart-money-cache');

const mockQuery = dbConnection.query as jest.MockedFunction<typeof dbConnection.query>;

describe('WalletScoringJob', () => {
  let job: WalletScoringJob;
  let mockScorer: jest.Mocked<SmartMoneyScorer>;
  let mockCache: jest.Mocked<SmartMoneyCache>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock SmartMoneyScorer
    mockScorer = {
      calculateScore: jest.fn(),
    } as any;
    (SmartMoneyScorer.getInstance as jest.Mock).mockReturnValue(mockScorer);

    // Mock SmartMoneyCache
    mockCache = {
      invalidateAll: jest.fn(),
    } as any;
    (SmartMoneyCache.getInstance as jest.Mock).mockReturnValue(mockCache);

    job = WalletScoringJob.getInstance();

    // Reset isRunning flag
    (job as any).isRunning = false;
  });

  afterEach(() => {
    job.stop();
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WalletScoringJob.getInstance();
      const instance2 = WalletScoringJob.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('start', () => {
    it('should start the job and schedule periodic runs', () => {
      // Mock runJob to prevent it from actually running
      jest.spyOn(job, 'runJob').mockResolvedValue({
        totalWallets: 0,
        walletsProcessed: 0,
        walletsUpdated: 0,
        walletsFailed: 0,
        duration: 0,
        timestamp: new Date(),
      });

      job.start({ batchSize: 50, intervalMinutes: 15 });

      expect(job.getStatus().isScheduled).toBe(true);
    });

    it('should not start if already running', () => {
      job.start();
      const consoleSpy = jest.spyOn(console, 'log');
      
      job.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('Wallet scoring job is already running');
    });
  });

  describe('stop', () => {
    it('should stop the job', () => {
      job.start();
      expect(job.getStatus().isScheduled).toBe(true);

      job.stop();
      expect(job.getStatus().isScheduled).toBe(false);
    });
  });

  describe('runJob', () => {
    it('should complete successfully with no wallets', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }] } as any);
      mockCache.invalidateAll.mockResolvedValue();

      const stats = await job.runJob({ batchSize: 50 });

      expect(stats.totalWallets).toBe(0);
      expect(stats.walletsProcessed).toBe(0);
      expect(stats.duration).toBeGreaterThanOrEqual(0);
    });

    it('should skip if already running', async () => {
      // Manually set isRunning flag
      (job as any).isRunning = true;

      const stats = await job.runJob();

      expect(stats.walletsProcessed).toBe(0); // Skipped
      expect(stats.totalWallets).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return correct status', () => {
      expect(job.getStatus()).toEqual({
        isRunning: false,
        isScheduled: false,
      });

      job.start();

      expect(job.getStatus().isScheduled).toBe(true);
    });
  });
});

