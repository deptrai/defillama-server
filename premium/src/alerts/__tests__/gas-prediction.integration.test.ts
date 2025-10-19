/**
 * Gas Prediction Integration Tests
 * Story 1.3: Gas Fee Alerts (Phase 7)
 * EPIC-1: Smart Alerts & Notifications
 *
 * Integration tests for gas prediction flow (Service + Redis + Data Flow)
 */

// Set env variable BEFORE importing service
process.env.PREMIUM_DB = 'postgresql://test:test@localhost:5432/test';

// Mock Redis
import Redis from 'ioredis-mock';
import type { Redis as RedisType } from 'ioredis';

// Mock postgres at module level
var mockSql: any = jest.fn().mockResolvedValue([]);
mockSql.unsafe = jest.fn().mockResolvedValue([]);

jest.mock('postgres', () => {
  return jest.fn(() => mockSql);
});

// Mock ioredis to use ioredis-mock
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => new Redis());
});

import { gasPredictionService } from '../services/gas-prediction.service';
import { GasPriceData } from '../services/gas-price-monitor.service';

describe('Gas Prediction Integration Tests', () => {
  let mockRedis: RedisType;

  beforeAll(() => {
    // Get the mocked Redis instance
    mockRedis = (gasPredictionService as any).redis;
  });

  beforeEach(async () => {
    // Clear all Redis keys before each test
    await mockRedis.flushall();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup
    await mockRedis.quit();
  });

  describe('Service Integration: GasPredictionService + Redis', () => {
    it('should read historical data stored by GasPriceMonitorService', async () => {
      // Simulate GasPriceMonitorService storing data in Redis
      const chain = 'ethereum';
      const historicalData: GasPriceData[] = [];
      const now = Date.now();

      // Generate 100 data points (simulating 1000 seconds of data at 10s intervals)
      for (let i = 0; i < 100; i++) {
        const dataPoint: GasPriceData = {
          chain,
          slow: 10 + i * 0.1,
          standard: 15 + i * 0.1,
          fast: 20 + i * 0.1,
          instant: 25 + i * 0.1,
          timestamp: new Date(now - (100 - i) * 10000).toISOString(),
        };
        historicalData.push(dataPoint);

        // Store in Redis sorted set (same as GasPriceMonitorService)
        const key = `gas:${chain}:history`;
        const score = now - (100 - i) * 10000;
        await mockRedis.zadd(key, score, JSON.stringify(dataPoint));
      }

      // Verify data was stored
      const storedData = await mockRedis.zrangebyscore(
        `gas:${chain}:history`,
        now - 1000000,
        now
      );
      expect(storedData.length).toBe(100);

      // GasPredictionService should be able to read this data
      const predictions = await gasPredictionService.predictGasPrices(chain);

      // Verify predictions were generated
      expect(predictions).toHaveLength(4); // 4 gas types
      expect(predictions[0].chain).toBe(chain);
      expect(predictions[0].currentPrice).toBeGreaterThan(0);
      expect(predictions[0].predictions.oneHour).toBeGreaterThan(0);
      expect(predictions[0].trend).toMatch(/increasing|decreasing|stable/);
      expect(predictions[0].confidence).toBeGreaterThanOrEqual(0);
      expect(predictions[0].confidence).toBeLessThanOrEqual(100);
    });

    it('should cache predictions and return cached data on subsequent calls', async () => {
      // Setup historical data
      const chain = 'ethereum';
      const now = Date.now();

      for (let i = 0; i < 100; i++) {
        const dataPoint: GasPriceData = {
          chain,
          slow: 10 + i * 0.1,
          standard: 15 + i * 0.1,
          fast: 20 + i * 0.1,
          instant: 25 + i * 0.1,
          timestamp: new Date(now - (100 - i) * 10000).toISOString(),
        };

        const key = `gas:${chain}:history`;
        const score = now - (100 - i) * 10000;
        await mockRedis.zadd(key, score, JSON.stringify(dataPoint));
      }

      // First call - should generate predictions and cache them
      const predictions1 = await gasPredictionService.predictGasPrices(chain);

      // Verify cache was set
      const cacheKey = `gas:${chain}:predictions`;
      const cachedData = await mockRedis.get(cacheKey);
      expect(cachedData).toBeTruthy();

      // Second call - should return cached data
      const predictions2 = await gasPredictionService.predictGasPrices(chain);

      // Verify both calls return same data (cached)
      expect(predictions2).toEqual(predictions1);

      // Verify cache TTL is set (should be 300 seconds = 5 minutes)
      const ttl = await mockRedis.ttl(cacheKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(300);
    });

    it('should handle insufficient historical data gracefully', async () => {
      // Setup only 5 data points (less than minimum required 10)
      const chain = 'ethereum';
      const now = Date.now();

      for (let i = 0; i < 5; i++) {
        const dataPoint: GasPriceData = {
          chain,
          slow: 15,
          standard: 20,
          fast: 25,
          instant: 30,
          timestamp: new Date(now - (5 - i) * 10000).toISOString(),
        };

        const key = `gas:${chain}:history`;
        const score = now - (5 - i) * 10000;
        await mockRedis.zadd(key, score, JSON.stringify(dataPoint));
      }

      // Should throw error due to insufficient data
      await expect(gasPredictionService.predictGasPrices(chain)).rejects.toThrow(
        'Insufficient data for prediction'
      );
    });

    it('should handle empty historical data', async () => {
      const chain = 'ethereum';

      // No data in Redis
      await expect(gasPredictionService.predictGasPrices(chain)).rejects.toThrow(
        'Insufficient data for prediction'
      );
    });

    it('should generate different predictions for different gas types', async () => {
      // Setup historical data with different prices for each gas type
      const chain = 'ethereum';
      const now = Date.now();

      for (let i = 0; i < 100; i++) {
        const dataPoint: GasPriceData = {
          chain,
          slow: 10 + i * 0.05, // Slower growth
          standard: 15 + i * 0.1, // Medium growth
          fast: 20 + i * 0.15, // Faster growth
          instant: 25 + i * 0.2, // Fastest growth
          timestamp: new Date(now - (100 - i) * 10000).toISOString(),
        };

        const key = `gas:${chain}:history`;
        const score = now - (100 - i) * 10000;
        await mockRedis.zadd(key, score, JSON.stringify(dataPoint));
      }

      const predictions = await gasPredictionService.predictGasPrices(chain);

      // Verify each gas type has different predictions
      const slowPrediction = predictions.find((p) => p.gasType === 'slow');
      const standardPrediction = predictions.find((p) => p.gasType === 'standard');
      const fastPrediction = predictions.find((p) => p.gasType === 'fast');
      const instantPrediction = predictions.find((p) => p.gasType === 'instant');

      expect(slowPrediction).toBeDefined();
      expect(standardPrediction).toBeDefined();
      expect(fastPrediction).toBeDefined();
      expect(instantPrediction).toBeDefined();

      // Verify predictions are in ascending order (slow < standard < fast < instant)
      expect(slowPrediction!.currentPrice).toBeLessThan(standardPrediction!.currentPrice);
      expect(standardPrediction!.currentPrice).toBeLessThan(fastPrediction!.currentPrice);
      expect(fastPrediction!.currentPrice).toBeLessThan(instantPrediction!.currentPrice);

      // Verify all have increasing trend (due to upward data)
      expect(slowPrediction!.trend).toBe('increasing');
      expect(standardPrediction!.trend).toBe('increasing');
      expect(fastPrediction!.trend).toBe('increasing');
      expect(instantPrediction!.trend).toBe('increasing');
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain data consistency across multiple prediction calls', async () => {
      const chain = 'ethereum';
      const now = Date.now();

      // Setup initial data
      for (let i = 0; i < 100; i++) {
        const dataPoint: GasPriceData = {
          chain,
          slow: 10 + i * 0.1,
          standard: 15 + i * 0.1,
          fast: 20 + i * 0.1,
          instant: 25 + i * 0.1,
          timestamp: new Date(now - (100 - i) * 10000).toISOString(),
        };

        const key = `gas:${chain}:history`;
        const score = now - (100 - i) * 10000;
        await mockRedis.zadd(key, score, JSON.stringify(dataPoint));
      }

      // Make multiple prediction calls
      const predictions1 = await gasPredictionService.predictGasPrices(chain);
      const predictions2 = await gasPredictionService.predictGasPrices(chain);
      const predictions3 = await gasPredictionService.predictGasPrices(chain);

      // All calls should return consistent data (cached)
      expect(predictions2).toEqual(predictions1);
      expect(predictions3).toEqual(predictions1);
    });

    it('should update predictions when cache expires', async () => {
      const chain = 'ethereum';
      const now = Date.now();

      // Setup initial data
      for (let i = 0; i < 100; i++) {
        const dataPoint: GasPriceData = {
          chain,
          slow: 10 + i * 0.1,
          standard: 15 + i * 0.1,
          fast: 20 + i * 0.1,
          instant: 25 + i * 0.1,
          timestamp: new Date(now - (100 - i) * 10000).toISOString(),
        };

        const key = `gas:${chain}:history`;
        const score = now - (100 - i) * 10000;
        await mockRedis.zadd(key, score, JSON.stringify(dataPoint));
      }

      // First call - generate and cache predictions
      const predictions1 = await gasPredictionService.predictGasPrices(chain);

      // Manually expire cache
      const cacheKey = `gas:${chain}:predictions`;
      await mockRedis.del(cacheKey);

      // Add new data point (simulating new gas price)
      const newDataPoint: GasPriceData = {
        chain,
        slow: 20,
        standard: 25,
        fast: 30,
        instant: 35,
        timestamp: new Date(now + 10000).toISOString(),
      };
      await mockRedis.zadd(`gas:${chain}:history`, now + 10000, JSON.stringify(newDataPoint));

      // Second call - should generate new predictions
      const predictions2 = await gasPredictionService.predictGasPrices(chain);

      // Predictions should be different (new data added)
      expect(predictions2).not.toEqual(predictions1);
    });
  });
});

