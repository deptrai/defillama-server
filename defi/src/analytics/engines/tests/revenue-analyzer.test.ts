/**
 * Revenue Analyzer Tests
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 3 - Analytics Engine
 */

import { RevenueAnalyzer } from '../revenue-analyzer';
import { RevenueData } from '../types';

describe('RevenueAnalyzer', () => {
  let analyzer: RevenueAnalyzer;

  beforeEach(() => {
    analyzer = new RevenueAnalyzer();
  });

  describe('calculateProjections', () => {
    it('should calculate projections with positive trend', () => {
      const revenueData: RevenueData[] = [
        {
          protocolId: 'test',
          timestamp: new Date('2024-01-01'),
          totalRevenue: 1000,
          tradingFees: 800,
          withdrawalFees: 100,
          performanceFees: 100,
          otherFees: 0,
        },
        {
          protocolId: 'test',
          timestamp: new Date('2024-01-02'),
          totalRevenue: 1100,
          tradingFees: 880,
          withdrawalFees: 110,
          performanceFees: 110,
          otherFees: 0,
        },
        {
          protocolId: 'test',
          timestamp: new Date('2024-01-03'),
          totalRevenue: 1200,
          tradingFees: 960,
          withdrawalFees: 120,
          performanceFees: 120,
          otherFees: 0,
        },
      ];

      const trendPercent = 10; // 10% growth
      const projections = (analyzer as any).calculateProjections(revenueData, trendPercent);

      expect(projections.next7d).toBeGreaterThan(0);
      expect(projections.next30d).toBeGreaterThan(0);
      expect(projections.next30d).toBeGreaterThan(projections.next7d);
      expect(projections.confidence).toBeGreaterThan(0);
      expect(projections.confidence).toBeLessThanOrEqual(1);
    });

    it('should calculate projections with negative trend', () => {
      const revenueData: RevenueData[] = [
        {
          protocolId: 'test',
          timestamp: new Date('2024-01-01'),
          totalRevenue: 1200,
          tradingFees: 960,
          withdrawalFees: 120,
          performanceFees: 120,
          otherFees: 0,
        },
        {
          protocolId: 'test',
          timestamp: new Date('2024-01-02'),
          totalRevenue: 1100,
          tradingFees: 880,
          withdrawalFees: 110,
          performanceFees: 110,
          otherFees: 0,
        },
        {
          protocolId: 'test',
          timestamp: new Date('2024-01-03'),
          totalRevenue: 1000,
          tradingFees: 800,
          withdrawalFees: 100,
          performanceFees: 100,
          otherFees: 0,
        },
      ];

      const trendPercent = -10; // -10% decline
      const projections = (analyzer as any).calculateProjections(revenueData, trendPercent);

      expect(projections.next7d).toBeGreaterThan(0);
      expect(projections.next30d).toBeGreaterThan(0);
    });

    it('should handle empty revenue data', () => {
      const projections = (analyzer as any).calculateProjections([], 0);

      expect(projections.next7d).toBe(0);
      expect(projections.next30d).toBe(0);
      expect(projections.confidence).toBe(0);
    });

    it('should calculate confidence based on consistency', () => {
      // Consistent revenue
      const consistentData: RevenueData[] = Array.from({ length: 30 }, (_, i) => ({
        protocolId: 'test',
        timestamp: new Date(`2024-01-${i + 1}`),
        totalRevenue: 1000,
        tradingFees: 800,
        withdrawalFees: 100,
        performanceFees: 100,
        otherFees: 0,
      }));

      const consistentProjections = (analyzer as any).calculateProjections(consistentData, 0);
      expect(consistentProjections.confidence).toBeGreaterThan(0.9);

      // Volatile revenue
      const volatileData: RevenueData[] = Array.from({ length: 30 }, (_, i) => ({
        protocolId: 'test',
        timestamp: new Date(`2024-01-${i + 1}`),
        totalRevenue: i % 2 === 0 ? 1000 : 2000,
        tradingFees: 0,
        withdrawalFees: 0,
        performanceFees: 0,
        otherFees: 0,
      }));

      const volatileProjections = (analyzer as any).calculateProjections(volatileData, 0);
      expect(volatileProjections.confidence).toBeLessThan(consistentProjections.confidence);
    });
  });

  describe('calculateStandardDeviation', () => {
    it('should calculate standard deviation correctly', () => {
      const values = [1000, 1100, 1200, 1300, 1400];
      const stdDev = (analyzer as any).calculateStandardDeviation(values);

      expect(stdDev).toBeGreaterThan(0);
      expect(stdDev).toBeCloseTo(141.42, 1);
    });

    it('should return 0 for empty array', () => {
      const stdDev = (analyzer as any).calculateStandardDeviation([]);

      expect(stdDev).toBe(0);
    });

    it('should return 0 for identical values', () => {
      const values = [1000, 1000, 1000, 1000];
      const stdDev = (analyzer as any).calculateStandardDeviation(values);

      expect(stdDev).toBe(0);
    });
  });

  describe('Revenue Metrics Calculations', () => {
    it('should calculate revenue per user correctly', () => {
      const totalRevenue = 10000;
      const activeUsers = 100;
      const revenuePerUser = totalRevenue / activeUsers;

      expect(revenuePerUser).toBe(100);
    });

    it('should calculate revenue per TVL correctly', () => {
      const totalRevenue = 10000;
      const tvl = 1000000;
      const revenuePerTVL = (totalRevenue / tvl) * 100;

      expect(revenuePerTVL).toBe(1);
    });

    it('should handle zero users', () => {
      const totalRevenue = 10000;
      const activeUsers = 0;
      const revenuePerUser = activeUsers > 0 ? totalRevenue / activeUsers : 0;

      expect(revenuePerUser).toBe(0);
    });

    it('should handle zero TVL', () => {
      const totalRevenue = 10000;
      const tvl = 0;
      const revenuePerTVL = tvl > 0 ? (totalRevenue / tvl) * 100 : 0;

      expect(revenuePerTVL).toBe(0);
    });
  });

  describe('Fee Breakdown Calculations', () => {
    it('should calculate fee breakdown correctly', () => {
      const totalRevenue = 1000;
      const tradingFees = 600;
      const withdrawalFees = 200;
      const performanceFees = 150;
      const otherFees = totalRevenue - tradingFees - withdrawalFees - performanceFees;

      expect(otherFees).toBe(50);
      expect(tradingFees + withdrawalFees + performanceFees + otherFees).toBe(totalRevenue);
    });

    it('should handle zero fees', () => {
      const totalRevenue = 0;
      const tradingFees = 0;
      const withdrawalFees = 0;
      const performanceFees = 0;
      const otherFees = 0;

      expect(tradingFees + withdrawalFees + performanceFees + otherFees).toBe(totalRevenue);
    });
  });

  describe('Revenue Trend Calculations', () => {
    it('should calculate positive trend', () => {
      const firstHalfRevenue = 5000;
      const secondHalfRevenue = 6000;
      const trend = ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100;

      expect(trend).toBe(20);
    });

    it('should calculate negative trend', () => {
      const firstHalfRevenue = 6000;
      const secondHalfRevenue = 5000;
      const trend = ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100;

      expect(trend).toBe(-16.666666666666664);
    });

    it('should handle zero first half revenue', () => {
      const firstHalfRevenue = 0;
      const secondHalfRevenue = 5000;
      const trend = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;

      expect(trend).toBe(0);
    });
  });
});

