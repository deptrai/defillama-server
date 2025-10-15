/**
 * Tests for HolderBehaviorEngine
 * Story: 2.2.2 - Holder Distribution Analysis
 */

import { HolderBehaviorEngine } from '../holder-behavior-engine';
import { query } from '../../db/connection';

jest.mock('../../db/connection');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('HolderBehaviorEngine', () => {
  let engine: HolderBehaviorEngine;

  beforeEach(() => {
    engine = HolderBehaviorEngine.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = HolderBehaviorEngine.getInstance();
      const instance2 = HolderBehaviorEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getBehavior', () => {
    it('should return complete behavior analysis', async () => {
      // Mock avg holding period
      mockQuery.mockResolvedValueOnce({ rows: [{ avg_holding_period: '149.5' }] } as any);
      
      // Mock churn rate
      mockQuery.mockResolvedValueOnce({ rows: [{ holder_churn_rate: '3.75' }] } as any);
      
      // Mock new holders
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '8' }] } as any);

      // Mock age distribution (6 ranges)
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '53' }] } as any);
      for (let i = 0; i < 6; i++) {
        mockQuery.mockResolvedValueOnce({
          rows: [{ count: String(5 + i) }],
        } as any);
      }

      // Mock holder growth
      mockQuery.mockResolvedValueOnce({
        rows: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
          total_holders: 45 + i,
        })),
      } as any);

      // Mock whale activity
      mockQuery.mockResolvedValueOnce({
        rows: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
          whale_count: 3,
          whale_percentage: String(9.5 + i * 0.01),
        })),
      } as any);

      const result = await engine.getBehavior('0xToken');

      expect(result.tokenAddress).toBe('0xToken');
      expect(result.chainId).toBe('ethereum');
      expect(result.timeRange).toBe('30d');
      expect(result.behavior.avgHoldingPeriod).toBe(149.5);
      expect(result.behavior.holderChurnRate).toBe(3.75);
      expect(result.behavior.newHolders).toBe(8);
      expect(result.behavior.loyaltyScore).toBeGreaterThanOrEqual(0);
      expect(result.behavior.loyaltyScore).toBeLessThanOrEqual(100);
      expect(result.ageDistribution).toHaveLength(6);
      expect(result.trends.holderGrowth).toHaveLength(30);
      expect(result.trends.whaleActivity).toHaveLength(30);
    });

    it('should handle different time ranges', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ avg_holding_period: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ holder_churn_rate: '5' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any);
      for (let i = 0; i < 6; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] } as any);
      }
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.getBehavior('0xToken', 'ethereum', '7d');
      expect(result.timeRange).toBe('7d');
    });

    it('should handle custom chain ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ avg_holding_period: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ holder_churn_rate: '5' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '20' }] } as any);
      for (let i = 0; i < 6; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] } as any);
      }
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.getBehavior('0xToken', 'polygon');
      expect(result.chainId).toBe('polygon');
    });
  });

  describe('loyalty score calculation', () => {
    it('should calculate high loyalty score for long holding period and low churn', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ avg_holding_period: '365' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ holder_churn_rate: '1' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '50' }] } as any);
      for (let i = 0; i < 6; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '8' }] } as any);
      }
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.getBehavior('0xToken');
      
      // 365 days = 50 points, 1% churn = 45 points, total = 95
      expect(result.behavior.loyaltyScore).toBeGreaterThan(90);
    });

    it('should calculate low loyalty score for short holding period and high churn', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ avg_holding_period: '7' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ holder_churn_rate: '15' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '20' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '50' }] } as any);
      for (let i = 0; i < 6; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '8' }] } as any);
      }
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.getBehavior('0xToken');
      
      // 7 days = ~1 point, 15% churn = 0 points, total = ~1
      expect(result.behavior.loyaltyScore).toBeLessThan(10);
    });

    it('should cap loyalty score at 100', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ avg_holding_period: '1000' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ holder_churn_rate: '0' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '50' }] } as any);
      for (let i = 0; i < 6; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '8' }] } as any);
      }
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.getBehavior('0xToken');
      
      expect(result.behavior.loyaltyScore).toBeLessThanOrEqual(100);
    });
  });

  describe('age distribution', () => {
    it('should categorize holders into 6 age ranges', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ avg_holding_period: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ holder_churn_rate: '5' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '100' }] } as any);
      
      // 6 age ranges
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any); // 0-7d
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '15' }] } as any); // 7-30d
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '20' }] } as any); // 30-90d
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '25' }] } as any); // 90-180d
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '15' }] } as any); // 180-365d
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '15' }] } as any); // >365d

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.getBehavior('0xToken');

      expect(result.ageDistribution).toHaveLength(6);
      expect(result.ageDistribution[0].ageRange).toBe('0-7d');
      expect(result.ageDistribution[0].holderCount).toBe(10);
      expect(result.ageDistribution[0].percentage).toBe(10);
      expect(result.ageDistribution[5].ageRange).toBe('>365d');
    });

    it('should calculate percentages correctly', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ avg_holding_period: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ holder_churn_rate: '5' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '50' }] } as any);
      
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '15' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] } as any);

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.getBehavior('0xToken');

      const totalPercentage = result.ageDistribution.reduce((sum, d) => sum + d.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });
  });

  describe('getHistory', () => {
    it('should return distribution history with trends', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
          total_holders: 45 + i,
          gini_coefficient: String(0.72 - i * 0.003),
          concentration_score: String(72 - i * 0.3),
          top10_percentage: String(45 - i * 0.1),
          whale_count: 3,
          whale_percentage: String(9.5 - i * 0.02), // Changed from 0.01 to 0.02 to make total change > 0.5
        })),
      } as any);

      const result = await engine.getHistory('0xToken');

      expect(result.tokenAddress).toBe('0xToken');
      expect(result.history).toHaveLength(30);
      expect(result.trends.holderGrowthRate).toBeGreaterThan(0);
      expect(result.trends.concentrationTrend).toBe('decreasing');
      expect(result.trends.whaleActivityTrend).toBe('distributing');
    });

    it('should detect increasing concentration trend', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            timestamp: new Date('2024-01-01'),
            total_holders: 50,
            gini_coefficient: '0.65',
            concentration_score: '65',
            top10_percentage: '40',
            whale_count: 3,
            whale_percentage: '8',
          },
          {
            timestamp: new Date('2024-01-30'),
            total_holders: 55,
            gini_coefficient: '0.72',
            concentration_score: '72',
            top10_percentage: '45',
            whale_count: 3,
            whale_percentage: '9',
          },
        ],
      } as any);

      const result = await engine.getHistory('0xToken');

      expect(result.trends.concentrationTrend).toBe('increasing');
    });

    it('should detect whale accumulation trend', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            timestamp: new Date('2024-01-01'),
            total_holders: 50,
            gini_coefficient: '0.70',
            concentration_score: '70',
            top10_percentage: '40',
            whale_count: 3,
            whale_percentage: '8',
          },
          {
            timestamp: new Date('2024-01-30'),
            total_holders: 55,
            gini_coefficient: '0.72',
            concentration_score: '72',
            top10_percentage: '45',
            whale_count: 3,
            whale_percentage: '9.5',
          },
        ],
      } as any);

      const result = await engine.getHistory('0xToken');

      expect(result.trends.whaleActivityTrend).toBe('accumulating');
    });

    it('should detect stable concentration', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            timestamp: new Date('2024-01-01'),
            total_holders: 50,
            gini_coefficient: '0.70',
            concentration_score: '70',
            top10_percentage: '40',
            whale_count: 3,
            whale_percentage: '9',
          },
          {
            timestamp: new Date('2024-01-30'),
            total_holders: 55,
            gini_coefficient: '0.71',
            concentration_score: '71',
            top10_percentage: '40.5',
            whale_count: 3,
            whale_percentage: '9.2',
          },
        ],
      } as any);

      const result = await engine.getHistory('0xToken');

      expect(result.trends.concentrationTrend).toBe('stable');
      expect(result.trends.whaleActivityTrend).toBe('neutral');
    });

    it('should handle insufficient data', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            timestamp: new Date('2024-01-01'),
            total_holders: 50,
            gini_coefficient: '0.70',
            concentration_score: '70',
            top10_percentage: '40',
            whale_count: 3,
            whale_percentage: '9',
          },
        ],
      } as any);

      const result = await engine.getHistory('0xToken');

      expect(result.trends.holderGrowthRate).toBe(0);
      expect(result.trends.concentrationTrend).toBe('stable');
      expect(result.trends.whaleActivityTrend).toBe('neutral');
    });

    it('should handle different time ranges', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await engine.getHistory('0xToken', 'ethereum', '7d');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '7 days'"),
        expect.any(Array)
      );
    });
  });

  describe('trends calculation', () => {
    it('should calculate holder growth trends', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ avg_holding_period: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ holder_churn_rate: '5' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '50' }] } as any);
      for (let i = 0; i < 6; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '8' }] } as any);
      }

      mockQuery.mockResolvedValueOnce({
        rows: [
          { timestamp: new Date('2024-01-01'), total_holders: 45 },
          { timestamp: new Date('2024-01-15'), total_holders: 50 },
          { timestamp: new Date('2024-01-30'), total_holders: 53 },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await engine.getBehavior('0xToken');

      expect(result.trends.holderGrowth).toHaveLength(3);
      expect(result.trends.holderGrowth[0].count).toBe(45);
      expect(result.trends.holderGrowth[2].count).toBe(53);
    });

    it('should calculate whale activity trends', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ avg_holding_period: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ holder_churn_rate: '5' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '50' }] } as any);
      for (let i = 0; i < 6; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '8' }] } as any);
      }

      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          { timestamp: new Date('2024-01-01'), whale_count: 3, whale_percentage: '9.0' },
          { timestamp: new Date('2024-01-15'), whale_count: 3, whale_percentage: '9.5' },
          { timestamp: new Date('2024-01-30'), whale_count: 3, whale_percentage: '9.2' },
        ],
      } as any);

      const result = await engine.getBehavior('0xToken');

      expect(result.trends.whaleActivity).toHaveLength(3);
      expect(result.trends.whaleActivity[1].accumulation).toBeGreaterThan(0);
      expect(result.trends.whaleActivity[2].distribution).toBeGreaterThan(0);
    });
  });
});

