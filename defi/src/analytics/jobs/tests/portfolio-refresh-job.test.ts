/**
 * Unit Tests: PortfolioRefreshJob
 * Enhancement 3: Background Refresh Job
 */

import { PortfolioRefreshJob } from '../portfolio-refresh-job';
import * as dbConnection from '../../db/connection';
import { PriceFetcher } from '../../services/price-fetcher';
import { PortfolioCache } from '../../services/portfolio-cache';

// Mock dependencies
jest.mock('../../db/connection');
jest.mock('../../services/price-fetcher');
jest.mock('../../services/portfolio-cache');
jest.mock('ioredis', () => {
  const RedisMock = require('ioredis-mock');
  return RedisMock;
});

const mockQuery = dbConnection.query as jest.MockedFunction<typeof dbConnection.query>;

describe('PortfolioRefreshJob', () => {
  let job: PortfolioRefreshJob;
  let mockPriceFetcher: jest.Mocked<PriceFetcher>;
  let mockPortfolioCache: jest.Mocked<PortfolioCache>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    job = PortfolioRefreshJob.getInstance();

    // Mock PriceFetcher
    mockPriceFetcher = {
      getPrices: jest.fn(),
    } as any;
    (PriceFetcher.getInstance as jest.Mock).mockReturnValue(mockPriceFetcher);

    // Mock PortfolioCache
    mockPortfolioCache = {
      invalidateUser: jest.fn(),
    } as any;
    (PortfolioCache.getInstance as jest.Mock).mockReturnValue(mockPortfolioCache);
  });

  afterEach(() => {
    job.stop();
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PortfolioRefreshJob.getInstance();
      const instance2 = PortfolioRefreshJob.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Job Lifecycle', () => {
    it('should start the job', () => {
      // Mock empty portfolios to prevent actual refresh
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      job.start();

      const status = job.getStatus();
      expect(status.intervalId).not.toBeNull();
    });

    it('should stop the job', () => {
      // Mock empty portfolios
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      job.start();
      job.stop();

      const status = job.getStatus();
      expect(status.intervalId).toBeNull();
    });

    it('should not start if already running', () => {
      // Mock empty portfolios
      mockQuery.mockResolvedValue({ rows: [] } as any);

      job.start();
      const consoleSpy = jest.spyOn(console, 'log');

      job.start(); // Try to start again

      expect(consoleSpy).toHaveBeenCalledWith('Portfolio refresh job already running');
      consoleSpy.mockRestore();
    });
  });

  describe('Portfolio Refresh', () => {
    it('should start job and schedule refresh', () => {
      // Mock empty portfolios to prevent actual refresh
      mockQuery.mockResolvedValue({ rows: [] } as any);

      job.start();

      const status = job.getStatus();
      expect(status.intervalId).not.toBeNull();

      job.stop();
    });

    it('should verify job calls database on start', () => {
      // Mock empty portfolios
      mockQuery.mockResolvedValue({ rows: [] } as any);

      job.start();

      // Verify database was queried
      expect(mockQuery).toHaveBeenCalled();

      job.stop();
    });
  });

  describe('Job Status', () => {
    it('should return correct status', () => {
      // Mock empty portfolios
      mockQuery.mockResolvedValue({ rows: [] } as any);

      let status = job.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.intervalId).toBeNull();

      job.start();

      status = job.getStatus();
      expect(status.intervalId).not.toBeNull();

      job.stop();

      status = job.getStatus();
      expect(status.intervalId).toBeNull();
    });
  });
});

