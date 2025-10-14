/**
 * Query Parser Tests
 */

import { QueryParser, QueryValidationError } from '../query-parser';
import { QueryRequest } from '../types';

describe('QueryParser', () => {
  let parser: QueryParser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  describe('parse', () => {
    it('should parse valid query with filters', () => {
      const query = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'category', operator: 'eq', value: 'DEX' },
          ],
        },
      };

      const result = parser.parse(query);
      expect(result).toEqual(query);
    });

    it('should parse valid query with aggregations', () => {
      const query = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'sum', field: 'tvl', alias: 'total_tvl' },
        ],
        groupBy: ['chain'],
      };

      const result = parser.parse(query);
      expect(result).toEqual(query);
    });

    it('should parse valid query with pagination', () => {
      const query = {
        table: 'protocols',
        pagination: {
          page: 1,
          limit: 100,
        },
      };

      const result = parser.parse(query);
      expect(result).toEqual(query);
    });

    it('should throw error for missing table', () => {
      const query = {
        filters: {
          and: [{ field: 'category', operator: 'eq', value: 'DEX' }],
        },
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });

    it('should throw error for invalid table', () => {
      const query = {
        table: 'invalid_table',
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });
  });

  describe('validateFilters', () => {
    it('should validate AND conditions', () => {
      const query = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'category', operator: 'eq', value: 'DEX' },
            { field: 'name', operator: 'like', value: 'Uni' },
          ],
        },
      };

      const result = parser.parse(query);
      expect(result).toEqual(query);
    });

    it('should validate OR conditions', () => {
      const query = {
        table: 'protocols',
        filters: {
          or: [
            { field: 'category', operator: 'eq', value: 'DEX' },
            { field: 'category', operator: 'eq', value: 'Lending' },
          ],
        },
      };

      const result = parser.parse(query);
      expect(result).toEqual(query);
    });

    it('should validate NOT conditions', () => {
      const query = {
        table: 'protocols',
        filters: {
          not: {
            and: [{ field: 'category', operator: 'eq', value: 'DEX' }],
          },
        },
      };

      const result = parser.parse(query);
      expect(result).toEqual(query);
    });

    it('should throw error for invalid field', () => {
      const query = {
        table: 'protocols',
        filters: {
          and: [{ field: 'invalid_field', operator: 'eq', value: 'test' }],
        },
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });

    it('should throw error for invalid operator', () => {
      const query = {
        table: 'protocols',
        filters: {
          and: [{ field: 'category', operator: 'invalid', value: 'DEX' }],
        },
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });

    it('should throw error for missing value', () => {
      const query = {
        table: 'protocols',
        filters: {
          and: [{ field: 'category', operator: 'eq', value: null }],
        },
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });
  });

  describe('validateAggregations', () => {
    it('should validate sum aggregation', () => {
      const query = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'sum', field: 'tvl', alias: 'total_tvl' },
        ],
      };

      const result = parser.parse(query);
      expect(result).toEqual(query);
    });

    it('should validate percentile aggregation', () => {
      const query = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'percentile', field: 'tvl', percentile: 95, alias: 'p95_tvl' },
        ],
      };

      const result = parser.parse(query);
      expect(result).toEqual(query);
    });

    it('should throw error for invalid aggregation type', () => {
      const query = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'invalid', field: 'tvl' },
        ],
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });

    it('should throw error for non-aggregatable field', () => {
      const query = {
        table: 'protocols',
        aggregations: [
          { type: 'sum', field: 'name' },
        ],
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });

    it('should throw error for missing percentile value', () => {
      const query = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'percentile', field: 'tvl' },
        ],
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });

    it('should throw error for invalid percentile value', () => {
      const query = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'percentile', field: 'tvl', percentile: 150 },
        ],
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });
  });

  describe('validatePagination', () => {
    it('should validate valid pagination', () => {
      const query = {
        table: 'protocols',
        pagination: {
          page: 1,
          limit: 100,
        },
      };

      const result = parser.parse(query);
      expect(result).toEqual(query);
    });

    it('should throw error for invalid page', () => {
      const query = {
        table: 'protocols',
        pagination: {
          page: 0,
          limit: 100,
        },
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });

    it('should throw error for invalid limit', () => {
      const query = {
        table: 'protocols',
        pagination: {
          page: 1,
          limit: 0,
        },
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });

    it('should throw error for limit exceeding max', () => {
      const query = {
        table: 'protocols',
        pagination: {
          page: 1,
          limit: 2000,
        },
      };

      expect(() => parser.parse(query)).toThrow(QueryValidationError);
    });
  });

  describe('validate', () => {
    it('should return valid result for valid query', () => {
      const query = {
        table: 'protocols',
        filters: {
          and: [{ field: 'category', operator: 'eq', value: 'DEX' }],
        },
      };

      const result = parser.validate(query);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid result for invalid query', () => {
      const query = {
        table: 'invalid_table',
      };

      const result = parser.validate(query);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

