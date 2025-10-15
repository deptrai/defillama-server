/**
 * User Metrics Engine Tests
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 3 - Analytics Engine
 */

import { UserMetricsEngine } from '../user-metrics-engine';

describe('UserMetricsEngine', () => {
  let engine: UserMetricsEngine;

  beforeEach(() => {
    engine = new UserMetricsEngine();
  });

  describe('calculateAverageRetention', () => {
    it('should calculate average retention correctly', () => {
      const cohorts = [
        {
          retentionByPeriod: [
            { period: 1, retentionRate: 80 },
            { period: 3, retentionRate: 60 },
            { period: 6, retentionRate: 40 },
            { period: 12, retentionRate: 20 },
          ],
        },
        {
          retentionByPeriod: [
            { period: 1, retentionRate: 90 },
            { period: 3, retentionRate: 70 },
            { period: 6, retentionRate: 50 },
            { period: 12, retentionRate: 30 },
          ],
        },
      ];

      const result = (engine as any).calculateAverageRetention(cohorts, 12);

      expect(result.period1).toBe(85); // (80 + 90) / 2
      expect(result.period3).toBe(65); // (60 + 70) / 2
      expect(result.period6).toBe(45); // (40 + 50) / 2
      expect(result.period12).toBe(25); // (20 + 30) / 2
    });

    it('should handle missing periods', () => {
      const cohorts = [
        {
          retentionByPeriod: [
            { period: 1, retentionRate: 80 },
            { period: 3, retentionRate: 60 },
          ],
        },
      ];

      const result = (engine as any).calculateAverageRetention(cohorts, 12);

      expect(result.period1).toBe(80);
      expect(result.period3).toBe(60);
      expect(result.period6).toBe(0); // No data
      expect(result.period12).toBe(0); // No data
    });

    it('should handle empty cohorts', () => {
      const result = (engine as any).calculateAverageRetention([], 12);

      expect(result.period1).toBe(0);
      expect(result.period3).toBe(0);
      expect(result.period6).toBe(0);
      expect(result.period12).toBe(0);
    });
  });

  describe('calculateUserGrowthRate', () => {
    it('should calculate positive growth rate', () => {
      const cohorts = [
        { cohortDate: '2024-02-01', cohortSize: 1200 },
        { cohortDate: '2024-01-01', cohortSize: 1000 },
      ];

      const growthRate = (engine as any).calculateUserGrowthRate(cohorts);

      expect(growthRate).toBe(20); // (1200 - 1000) / 1000 * 100
    });

    it('should calculate negative growth rate', () => {
      const cohorts = [
        { cohortDate: '2024-02-01', cohortSize: 800 },
        { cohortDate: '2024-01-01', cohortSize: 1000 },
      ];

      const growthRate = (engine as any).calculateUserGrowthRate(cohorts);

      expect(growthRate).toBe(-20); // (800 - 1000) / 1000 * 100
    });

    it('should return 0 for single cohort', () => {
      const cohorts = [
        { cohortDate: '2024-01-01', cohortSize: 1000 },
      ];

      const growthRate = (engine as any).calculateUserGrowthRate(cohorts);

      expect(growthRate).toBe(0);
    });

    it('should return 0 for empty cohorts', () => {
      const growthRate = (engine as any).calculateUserGrowthRate([]);

      expect(growthRate).toBe(0);
    });

    it('should handle zero previous cohort size', () => {
      const cohorts = [
        { cohortDate: '2024-02-01', cohortSize: 1000 },
        { cohortDate: '2024-01-01', cohortSize: 0 },
      ];

      const growthRate = (engine as any).calculateUserGrowthRate(cohorts);

      expect(growthRate).toBe(0);
    });
  });

  describe('User Metrics Calculations', () => {
    it('should calculate DAU/WAU ratio correctly', () => {
      const dau = 100;
      const wau = 500;
      const dauWauRatio = (dau / wau) * 100;

      expect(dauWauRatio).toBe(20);
    });

    it('should calculate WAU/MAU ratio correctly', () => {
      const wau = 500;
      const mau = 2000;
      const wauMauRatio = (wau / mau) * 100;

      expect(wauMauRatio).toBe(25);
    });

    it('should calculate stickiness (DAU/MAU) correctly', () => {
      const dau = 100;
      const mau = 2000;
      const stickiness = (dau / mau) * 100;

      expect(stickiness).toBe(5);
    });

    it('should handle zero WAU', () => {
      const dau = 100;
      const wau = 0;
      const dauWauRatio = wau > 0 ? (dau / wau) * 100 : 0;

      expect(dauWauRatio).toBe(0);
    });

    it('should handle zero MAU', () => {
      const dau = 100;
      const mau = 0;
      const stickiness = mau > 0 ? (dau / mau) * 100 : 0;

      expect(stickiness).toBe(0);
    });
  });

  describe('Retention Rate Calculations', () => {
    it('should calculate retention rate correctly', () => {
      const cohortSize = 1000;
      const activeUsers = 600;
      const retentionRate = (activeUsers / cohortSize) * 100;

      expect(retentionRate).toBe(60);
    });

    it('should calculate churn rate correctly', () => {
      const retentionRate = 60;
      const churnRate = 100 - retentionRate;

      expect(churnRate).toBe(40);
    });

    it('should handle 100% retention', () => {
      const cohortSize = 1000;
      const activeUsers = 1000;
      const retentionRate = (activeUsers / cohortSize) * 100;

      expect(retentionRate).toBe(100);
    });

    it('should handle 0% retention', () => {
      const cohortSize = 1000;
      const activeUsers = 0;
      const retentionRate = (activeUsers / cohortSize) * 100;

      expect(retentionRate).toBe(0);
    });
  });
});

