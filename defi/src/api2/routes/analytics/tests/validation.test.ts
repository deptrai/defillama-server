/**
 * Analytics API Validation Tests
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Phase: 2 - API Implementation
 */

import {
  validateProtocolId,
  validateTimeRange,
  validateDate,
  validatePeriods,
  validateProtocolIds,
  validateCategory,
  validateMetric,
  validateBoolean,
} from '../validation';
import { ErrorCode } from '../types';

describe('Analytics API Validation', () => {
  describe('validateProtocolId', () => {
    it('should accept valid protocol IDs', () => {
      expect(validateProtocolId('uniswap').valid).toBe(true);
      expect(validateProtocolId('aave-v2').valid).toBe(true);
      expect(validateProtocolId('compound_v3').valid).toBe(true);
    });

    it('should reject empty protocol IDs', () => {
      const result = validateProtocolId('');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });

    it('should reject protocol IDs with invalid characters', () => {
      const result = validateProtocolId('uniswap@v2');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });
  });

  describe('validateTimeRange', () => {
    it('should accept valid time ranges', () => {
      expect(validateTimeRange('7d').valid).toBe(true);
      expect(validateTimeRange('30d').valid).toBe(true);
      expect(validateTimeRange('90d').valid).toBe(true);
      expect(validateTimeRange('1y').valid).toBe(true);
    });

    it('should accept undefined (optional)', () => {
      expect(validateTimeRange(undefined).valid).toBe(true);
    });

    it('should reject invalid time ranges', () => {
      const result = validateTimeRange('1d');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });
  });

  describe('validateDate', () => {
    it('should accept valid ISO dates', () => {
      expect(validateDate('2024-01-15').valid).toBe(true);
      expect(validateDate('2024-01-15T10:30:00Z').valid).toBe(true);
    });

    it('should accept valid Unix timestamps', () => {
      expect(validateDate('1705315200').valid).toBe(true); // 2024-01-15
    });

    it('should accept undefined (optional)', () => {
      expect(validateDate(undefined).valid).toBe(true);
    });

    it('should reject future dates', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const result = validateDate(futureDate);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });

    it('should reject invalid date formats', () => {
      const result = validateDate('invalid-date');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });
  });

  describe('validatePeriods', () => {
    it('should accept valid periods', () => {
      expect(validatePeriods('1').valid).toBe(true);
      expect(validatePeriods('12').valid).toBe(true);
      expect(validatePeriods('24').valid).toBe(true);
    });

    it('should accept undefined (optional)', () => {
      expect(validatePeriods(undefined).valid).toBe(true);
    });

    it('should reject non-integer values', () => {
      const result = validatePeriods('abc');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });

    it('should reject out of range values', () => {
      expect(validatePeriods('0').valid).toBe(false);
      expect(validatePeriods('25').valid).toBe(false);
    });
  });

  describe('validateProtocolIds', () => {
    it('should accept valid comma-separated IDs', () => {
      expect(validateProtocolIds('uniswap,aave,compound').valid).toBe(true);
      expect(validateProtocolIds('uniswap').valid).toBe(true);
    });

    it('should reject empty strings', () => {
      const result = validateProtocolIds('');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });

    it('should reject more than 20 IDs', () => {
      const ids = Array(21).fill('protocol').join(',');
      const result = validateProtocolIds(ids);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });

    it('should reject IDs with invalid characters', () => {
      const result = validateProtocolIds('uniswap,aave@v2');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });
  });

  describe('validateCategory', () => {
    it('should accept valid categories', () => {
      expect(validateCategory('dex').valid).toBe(true);
      expect(validateCategory('lending').valid).toBe(true);
      expect(validateCategory('yield').valid).toBe(true);
    });

    it('should accept undefined (optional)', () => {
      expect(validateCategory(undefined).valid).toBe(true);
    });

    it('should reject invalid categories', () => {
      const result = validateCategory('invalid');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });
  });

  describe('validateMetric', () => {
    it('should accept valid metrics', () => {
      expect(validateMetric('tvl').valid).toBe(true);
      expect(validateMetric('volume24h').valid).toBe(true);
      expect(validateMetric('users').valid).toBe(true);
    });

    it('should accept undefined (optional)', () => {
      expect(validateMetric(undefined).valid).toBe(true);
    });

    it('should reject invalid metrics', () => {
      const result = validateMetric('invalid');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });
  });

  describe('validateBoolean', () => {
    it('should accept valid boolean strings', () => {
      expect(validateBoolean('true').valid).toBe(true);
      expect(validateBoolean('false').valid).toBe(true);
    });

    it('should accept undefined (optional)', () => {
      expect(validateBoolean(undefined).valid).toBe(true);
    });

    it('should reject invalid boolean strings', () => {
      const result = validateBoolean('yes');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_PARAMETER);
    });
  });
});

