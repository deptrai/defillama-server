/**
 * Unit Tests for Collector Utilities
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 2 - Data Collection Pipeline
 */

import {
  getDaysAgo,
  getStartOfDay,
  getEndOfDay,
  getDateRange,
  calculatePercentageChange,
  calculateAPY,
  calculateAverage,
  calculateMedian,
  calculateSum,
  aggregateByKey,
  groupByKey,
  sanitizeNumeric,
  sanitizeNumericArray,
  formatDuration,
  formatNumber,
  formatPercentage,
} from '../utils';

describe('Date Utilities', () => {
  describe('getDaysAgo', () => {
    it('should return date N days ago', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const result = getDaysAgo(7, now);
      
      expect(result.getDate()).toBe(8);
      expect(result.getMonth()).toBe(0); // January
    });
    
    it('should handle month boundaries', () => {
      const now = new Date('2024-01-05T12:00:00Z');
      const result = getDaysAgo(10, now);
      
      expect(result.getDate()).toBe(26);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getFullYear()).toBe(2023);
    });
  });
  
  describe('getStartOfDay', () => {
    it('should return start of day (00:00:00)', () => {
      const date = new Date('2024-01-15T15:30:45.123Z');
      const result = getStartOfDay(date);
      
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });
  
  describe('getEndOfDay', () => {
    it('should return end of day (23:59:59)', () => {
      const date = new Date('2024-01-15T15:30:45.123Z');
      const result = getEndOfDay(date);
      
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });
  
  describe('getDateRange', () => {
    it('should return correct range for 7d', () => {
      const end = new Date('2024-01-15T12:00:00Z');
      const result = getDateRange('7d', end);
      
      expect(result.end).toEqual(end);
      expect(result.start.getDate()).toBe(8);
    });
    
    it('should return correct range for 30d', () => {
      const end = new Date('2024-01-31T12:00:00Z');
      const result = getDateRange('30d', end);
      
      expect(result.end).toEqual(end);
      expect(result.start.getDate()).toBe(1);
    });
  });
});

describe('Metric Calculation Utilities', () => {
  describe('calculatePercentageChange', () => {
    it('should calculate positive change', () => {
      const result = calculatePercentageChange(150, 100);
      expect(result).toBe(50);
    });
    
    it('should calculate negative change', () => {
      const result = calculatePercentageChange(75, 100);
      expect(result).toBe(-25);
    });
    
    it('should return null for zero previous value', () => {
      const result = calculatePercentageChange(100, 0);
      expect(result).toBeNull();
    });
    
    it('should return null for null previous value', () => {
      const result = calculatePercentageChange(100, null as any);
      expect(result).toBeNull();
    });
  });
  
  describe('calculateAPY', () => {
    it('should calculate APY correctly', () => {
      const result = calculateAPY(110, 100, 7);
      
      expect(result.value).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.data_points).toBe(2);
      expect(result.method).toBe('tvl_ratio');
    });
    
    it('should return null for zero previous TVL', () => {
      const result = calculateAPY(100, 0, 7);
      
      expect(result.value).toBeNull();
      expect(result.confidence).toBe(0);
    });
    
    it('should have lower confidence for short time periods', () => {
      const result = calculateAPY(110, 100, 3);
      
      expect(result.confidence).toBeLessThan(1.0);
    });
    
    it('should have lower confidence for very high APY', () => {
      const result = calculateAPY(2000, 100, 7);
      
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
  
  describe('calculateAverage', () => {
    it('should calculate average correctly', () => {
      const result = calculateAverage([10, 20, 30, 40, 50]);
      expect(result).toBe(30);
    });
    
    it('should return null for empty array', () => {
      const result = calculateAverage([]);
      expect(result).toBeNull();
    });
  });
  
  describe('calculateMedian', () => {
    it('should calculate median for odd length array', () => {
      const result = calculateMedian([10, 20, 30, 40, 50]);
      expect(result).toBe(30);
    });
    
    it('should calculate median for even length array', () => {
      const result = calculateMedian([10, 20, 30, 40]);
      expect(result).toBe(25);
    });
    
    it('should return null for empty array', () => {
      const result = calculateMedian([]);
      expect(result).toBeNull();
    });
  });
  
  describe('calculateSum', () => {
    it('should calculate sum correctly', () => {
      const result = calculateSum([10, 20, 30, 40, 50]);
      expect(result).toBe(150);
    });
    
    it('should return 0 for empty array', () => {
      const result = calculateSum([]);
      expect(result).toBe(0);
    });
  });
});

describe('Data Aggregation Utilities', () => {
  describe('aggregateByKey', () => {
    it('should aggregate values by key', () => {
      const data = [
        { chain: 'ethereum', value: 100 },
        { chain: 'polygon', value: 50 },
        { chain: 'ethereum', value: 150 },
      ];
      
      const result = aggregateByKey(
        data,
        (item) => item.chain,
        (item) => item.value
      );
      
      expect(result).toEqual({
        ethereum: 250,
        polygon: 50,
      });
    });
  });
  
  describe('groupByKey', () => {
    it('should group items by key', () => {
      const data = [
        { chain: 'ethereum', value: 100 },
        { chain: 'polygon', value: 50 },
        { chain: 'ethereum', value: 150 },
      ];
      
      const result = groupByKey(data, (item) => item.chain);
      
      expect(result.ethereum).toHaveLength(2);
      expect(result.polygon).toHaveLength(1);
    });
  });
});

describe('Data Validation Utilities', () => {
  describe('sanitizeNumeric', () => {
    it('should convert string to number', () => {
      expect(sanitizeNumeric('123.45')).toBe(123.45);
    });
    
    it('should return number as-is', () => {
      expect(sanitizeNumeric(123.45)).toBe(123.45);
    });
    
    it('should return null for null', () => {
      expect(sanitizeNumeric(null)).toBeNull();
    });
    
    it('should return null for undefined', () => {
      expect(sanitizeNumeric(undefined)).toBeNull();
    });
    
    it('should return null for invalid string', () => {
      expect(sanitizeNumeric('invalid')).toBeNull();
    });
  });
  
  describe('sanitizeNumericArray', () => {
    it('should sanitize array of values', () => {
      const result = sanitizeNumericArray(['123', 456, null, 'invalid', '789']);
      expect(result).toEqual([123, 456, 789]);
    });
  });
});

describe('Formatting Utilities', () => {
  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });
    
    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('5.00s');
    });
    
    it('should format minutes', () => {
      expect(formatDuration(120000)).toBe('2.00m');
    });
  });
  
  describe('formatNumber', () => {
    it('should format number with commas', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
    });
  });
  
  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(12.3456)).toBe('12.35%');
    });
    
    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(12.3456, 1)).toBe('12.3%');
    });
  });
});

