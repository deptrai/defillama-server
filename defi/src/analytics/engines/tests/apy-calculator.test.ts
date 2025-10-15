/**
 * APY Calculator Tests
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 3 - Analytics Engine
 */

import { APYCalculator } from '../apy-calculator';
import { APYCalculationInput } from '../types';

describe('APYCalculator', () => {
  let calculator: APYCalculator;

  beforeEach(() => {
    calculator = new APYCalculator();
  });

  describe('calculateAPY', () => {
    it('should calculate APY correctly for 7-day period', () => {
      const input: APYCalculationInput = {
        protocolId: 'test-protocol',
        startValue: 1000000,
        endValue: 1010000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-08'),
      };

      const result = calculator.calculateAPY(input);

      expect(result.periodDays).toBe(7);
      expect(result.apy).toBeGreaterThan(0);
      expect(result.apr).toBeGreaterThan(0);
      expect(result.apy).toBeGreaterThan(result.apr); // APY should be higher due to compounding
    });

    it('should calculate APY correctly for 30-day period', () => {
      const input: APYCalculationInput = {
        protocolId: 'test-protocol',
        startValue: 1000000,
        endValue: 1050000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const result = calculator.calculateAPY(input);

      expect(result.periodDays).toBe(30);
      expect(result.apy).toBeGreaterThan(0);
      expect(result.apr).toBeGreaterThan(0);
    });

    it('should calculate APY correctly for 1-year period', () => {
      const input: APYCalculationInput = {
        protocolId: 'test-protocol',
        startValue: 1000000,
        endValue: 1100000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-01-01'),
      };

      const result = calculator.calculateAPY(input);

      expect(result.periodDays).toBe(366); // 2024 is a leap year
      expect(result.apy).toBeCloseTo(10, 1); // 10% return over 1 year
      expect(result.apr).toBeCloseTo(10, 1);
    });

    it('should handle negative returns', () => {
      const input: APYCalculationInput = {
        protocolId: 'test-protocol',
        startValue: 1000000,
        endValue: 900000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-08'),
      };

      const result = calculator.calculateAPY(input);

      expect(result.apy).toBeLessThan(0);
      expect(result.apr).toBeLessThan(0);
    });

    it('should throw error for zero start value', () => {
      const input: APYCalculationInput = {
        protocolId: 'test-protocol',
        startValue: 0,
        endValue: 1000000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-08'),
      };

      expect(() => calculator.calculateAPY(input)).toThrow('Start and end values must be positive');
    });

    it('should throw error for negative values', () => {
      const input: APYCalculationInput = {
        protocolId: 'test-protocol',
        startValue: -1000000,
        endValue: 1000000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-08'),
      };

      expect(() => calculator.calculateAPY(input)).toThrow('Start and end values must be positive');
    });

    it('should throw error for invalid date range', () => {
      const input: APYCalculationInput = {
        protocolId: 'test-protocol',
        startValue: 1000000,
        endValue: 1010000,
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-01-01'),
      };

      expect(() => calculator.calculateAPY(input)).toThrow('End date must be after start date');
    });

    it('should handle very small returns', () => {
      const input: APYCalculationInput = {
        protocolId: 'test-protocol',
        startValue: 1000000,
        endValue: 1000001,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-08'),
      };

      const result = calculator.calculateAPY(input);

      expect(result.apy).toBeGreaterThan(0);
      expect(result.apy).toBeLessThan(1);
    });

    it('should handle very large returns', () => {
      const input: APYCalculationInput = {
        protocolId: 'test-protocol',
        startValue: 1000000,
        endValue: 2000000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-08'),
      };

      const result = calculator.calculateAPY(input);

      expect(result.apy).toBeGreaterThan(100);
    });

    it('should use custom compounding periods', () => {
      const input: APYCalculationInput = {
        protocolId: 'test-protocol',
        startValue: 1000000,
        endValue: 1010000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-08'),
        compoundingPeriods: 52, // Weekly compounding
      };

      const result = calculator.calculateAPY(input);

      expect(result.apy).toBeGreaterThan(0);
    });
  });

  describe('analyzeTrend', () => {
    it('should detect increasing trend', () => {
      const timeSeries = [
        { timestamp: new Date('2024-01-01'), apy: 10, apr: 9.5, tvl: 1000000 },
        { timestamp: new Date('2024-01-02'), apy: 11, apr: 10.5, tvl: 1100000 },
        { timestamp: new Date('2024-01-03'), apy: 12, apr: 11.5, tvl: 1200000 },
        { timestamp: new Date('2024-01-04'), apy: 13, apr: 12.5, tvl: 1300000 },
      ];

      const trend = (calculator as any).analyzeTrend(timeSeries);

      expect(trend.direction).toBe('increasing');
      expect(trend.slope).toBeGreaterThan(0);
    });

    it('should detect decreasing trend', () => {
      const timeSeries = [
        { timestamp: new Date('2024-01-01'), apy: 13, apr: 12.5, tvl: 1300000 },
        { timestamp: new Date('2024-01-02'), apy: 12, apr: 11.5, tvl: 1200000 },
        { timestamp: new Date('2024-01-03'), apy: 11, apr: 10.5, tvl: 1100000 },
        { timestamp: new Date('2024-01-04'), apy: 10, apr: 9.5, tvl: 1000000 },
      ];

      const trend = (calculator as any).analyzeTrend(timeSeries);

      expect(trend.direction).toBe('decreasing');
      expect(trend.slope).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const timeSeries = [
        { timestamp: new Date('2024-01-01'), apy: 10, apr: 9.5, tvl: 1000000 },
        { timestamp: new Date('2024-01-02'), apy: 10.05, apr: 9.55, tvl: 1005000 },
        { timestamp: new Date('2024-01-03'), apy: 9.95, apr: 9.45, tvl: 995000 },
        { timestamp: new Date('2024-01-04'), apy: 10, apr: 9.5, tvl: 1000000 },
      ];

      const trend = (calculator as any).analyzeTrend(timeSeries);

      expect(trend.direction).toBe('stable');
      expect(Math.abs(trend.slope)).toBeLessThan(0.1);
    });

    it('should handle empty time series', () => {
      const trend = (calculator as any).analyzeTrend([]);

      expect(trend.direction).toBe('stable');
      expect(trend.slope).toBe(0);
      expect(trend.rSquared).toBe(0);
    });
  });

  describe('calculateStandardDeviation', () => {
    it('should calculate standard deviation correctly', () => {
      const values = [10, 12, 14, 16, 18];
      const stdDev = (calculator as any).calculateStandardDeviation(values);

      expect(stdDev).toBeGreaterThan(0);
      expect(stdDev).toBeCloseTo(2.83, 1);
    });

    it('should return 0 for empty array', () => {
      const stdDev = (calculator as any).calculateStandardDeviation([]);

      expect(stdDev).toBe(0);
    });

    it('should return 0 for single value', () => {
      const stdDev = (calculator as any).calculateStandardDeviation([10]);

      expect(stdDev).toBe(0);
    });

    it('should handle identical values', () => {
      const values = [10, 10, 10, 10, 10];
      const stdDev = (calculator as any).calculateStandardDeviation(values);

      expect(stdDev).toBe(0);
    });
  });
});

