/**
 * Unit Tests: MonitoringService
 * Story: 3.1.1 - Smart Money Identification (Enhancement 4)
 */

import { MonitoringService } from '../monitoring-service';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('MonitoringService', () => {
  let monitoring: MonitoringService;
  let mockRedis: jest.Mocked<Redis>;

  beforeAll(() => {
    // Create mock Redis instance
    mockRedis = {
      hincrby: jest.fn(),
      hset: jest.fn(),
      hget: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Get monitoring instance
    monitoring = MonitoringService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MonitoringService.getInstance();
      const instance2 = MonitoringService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Cache Metrics', () => {
    it('should record cache hit', async () => {
      mockRedis.hincrby.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await monitoring.recordCacheHit();

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'smart_money:monitoring:cache',
        'hits',
        1
      );
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'smart_money:monitoring:cache',
        'totalRequests',
        1
      );
    });

    it('should record cache miss', async () => {
      mockRedis.hincrby.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await monitoring.recordCacheMiss();

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'smart_money:monitoring:cache',
        'misses',
        1
      );
    });

    it('should get cache metrics', async () => {
      mockRedis.hgetall.mockResolvedValue({
        hits: '85',
        misses: '15',
        lastUpdated: new Date().toISOString(),
      });

      const metrics = await monitoring.getCacheMetrics();

      expect(metrics.hits).toBe(85);
      expect(metrics.misses).toBe(15);
      expect(metrics.totalRequests).toBe(100);
      expect(metrics.hitRate).toBe(85);
    });

    it('should handle empty cache metrics', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const metrics = await monitoring.getCacheMetrics();

      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.hitRate).toBe(0);
    });
  });

  describe('Job Metrics', () => {
    it('should record successful job execution', async () => {
      mockRedis.hincrby.mockResolvedValue(1);
      mockRedis.hget.mockResolvedValue('1');
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await monitoring.recordJobExecution({
        success: true,
        duration: 5000,
        walletsProcessed: 50,
        walletsUpdated: 48,
        walletsFailed: 2,
      });

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'smart_money:monitoring:job',
        'totalRuns',
        1
      );
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'smart_money:monitoring:job',
        'successfulRuns',
        1
      );
    });

    it('should record failed job execution', async () => {
      mockRedis.hincrby.mockResolvedValue(1);
      mockRedis.hget.mockResolvedValue('1');
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await monitoring.recordJobExecution({
        success: false,
        duration: 3000,
        walletsProcessed: 0,
        walletsUpdated: 0,
        walletsFailed: 0,
      });

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'smart_money:monitoring:job',
        'failedRuns',
        1
      );
    });

    it('should get job metrics', async () => {
      mockRedis.hgetall.mockResolvedValue({
        totalRuns: '10',
        successfulRuns: '9',
        failedRuns: '1',
        avgDuration: '5000',
        lastRunTimestamp: new Date().toISOString(),
        lastRunStats: JSON.stringify({
          walletsProcessed: 50,
          walletsUpdated: 48,
          walletsFailed: 2,
          duration: 5000,
        }),
      });

      const metrics = await monitoring.getJobMetrics();

      expect(metrics.totalRuns).toBe(10);
      expect(metrics.successfulRuns).toBe(9);
      expect(metrics.failedRuns).toBe(1);
      expect(metrics.avgDuration).toBe(5000);
      expect(metrics.lastRunStats).toBeDefined();
    });
  });

  describe('API Metrics', () => {
    it('should record API request', async () => {
      mockRedis.hincrby.mockResolvedValue(1);
      mockRedis.hget.mockResolvedValue('1');
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await monitoring.recordAPIRequest(50, false);

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'smart_money:monitoring:api',
        'totalRequests',
        1
      );
    });

    it('should record API error', async () => {
      mockRedis.hincrby.mockResolvedValue(1);
      mockRedis.hget.mockResolvedValue('1');
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await monitoring.recordAPIRequest(100, true);

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'smart_money:monitoring:api',
        'errors',
        1
      );
    });

    it('should get API metrics', async () => {
      mockRedis.hgetall.mockResolvedValue({
        totalRequests: '1000',
        errors: '10',
        avgResponseTime: '45',
        lastUpdated: new Date().toISOString(),
      });

      const metrics = await monitoring.getAPIMetrics();

      expect(metrics.totalRequests).toBe(1000);
      expect(metrics.errorRate).toBe(1);
      expect(metrics.avgResponseTime).toBe(45);
    });
  });

  describe('Data Volatility', () => {
    it('should record data change', async () => {
      mockRedis.hincrby.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await monitoring.recordDataChange('0x1234');

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'smart_money:monitoring:volatility:0x1234',
        'changes',
        1
      );
    });
  });

  describe('Dashboard', () => {
    it('should get monitoring dashboard', async () => {
      mockRedis.hgetall
        .mockResolvedValueOnce({ // cache metrics
          hits: '85',
          misses: '15',
        })
        .mockResolvedValueOnce({ // job metrics
          totalRuns: '10',
          successfulRuns: '9',
          failedRuns: '1',
        })
        .mockResolvedValueOnce({ // api metrics
          totalRequests: '1000',
          errors: '10',
        });

      const dashboard = await monitoring.getDashboard();

      expect(dashboard.cache).toBeDefined();
      expect(dashboard.job).toBeDefined();
      expect(dashboard.api).toBeDefined();
      expect(dashboard.volatility).toBeDefined();
      expect(dashboard.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Reset Metrics', () => {
    it('should reset all metrics', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRedis.keys.mockResolvedValue([]);

      await monitoring.resetMetrics();

      expect(mockRedis.del).toHaveBeenCalledWith('smart_money:monitoring:cache');
      expect(mockRedis.del).toHaveBeenCalledWith('smart_money:monitoring:job');
      expect(mockRedis.del).toHaveBeenCalledWith('smart_money:monitoring:api');
    });
  });
});

