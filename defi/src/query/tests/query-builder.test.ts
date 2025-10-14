/**
 * Query Builder Tests
 */

import { QueryBuilder, buildQuery, buildCountQuery } from '../query-builder';
import { QueryRequest } from '../types';

describe('QueryBuilder', () => {
  describe('buildQuery', () => {
    it('should build simple SELECT query', () => {
      const query: QueryRequest = {
        table: 'protocols',
      };

      const result = buildQuery(query);
      expect(result.sql).toBe('SELECT * FROM protocols');
      expect(result.params).toEqual([]);
    });

    it('should build query with WHERE clause', () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'category', operator: 'eq', value: 'DEX' },
          ],
        },
      };

      const result = buildQuery(query);
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('category = $1');
      expect(result.params).toEqual(['DEX']);
    });

    it('should build query with multiple AND conditions', () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'category', operator: 'eq', value: 'DEX' },
            { field: 'name', operator: 'like', value: 'Uni' },
          ],
        },
      };

      const result = buildQuery(query);
      expect(result.sql).toContain('category = $1');
      expect(result.sql).toContain('name LIKE $2');
      expect(result.params).toEqual(['DEX', '%Uni%']);
    });

    it('should build query with OR conditions', () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          or: [
            { field: 'category', operator: 'eq', value: 'DEX' },
            { field: 'category', operator: 'eq', value: 'Lending' },
          ],
        },
      };

      const result = buildQuery(query);
      expect(result.sql).toContain('OR');
      expect(result.params).toEqual(['DEX', 'Lending']);
    });

    it('should build query with IN operator', () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        filters: {
          and: [
            { field: 'chain', operator: 'in', value: ['ethereum', 'polygon'] },
          ],
        },
      };

      const result = buildQuery(query);
      expect(result.sql).toContain('IN');
      expect(result.params).toContain('ethereum');
      expect(result.params).toContain('polygon');
    });

    it('should build query with aggregations', () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'sum', field: 'tvl', alias: 'total_tvl' },
        ],
      };

      const result = buildQuery(query);
      expect(result.sql).toContain('SUM(tvl) AS total_tvl');
    });

    it('should build query with GROUP BY', () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'sum', field: 'tvl', alias: 'total_tvl' },
        ],
        groupBy: ['chain'],
      };

      const result = buildQuery(query);
      expect(result.sql).toContain('GROUP BY chain');
    });

    it('should build query with ORDER BY', () => {
      const query: QueryRequest = {
        table: 'protocols',
        orderBy: [
          { field: 'name', direction: 'asc' },
        ],
      };

      const result = buildQuery(query);
      expect(result.sql).toContain('ORDER BY name ASC');
    });

    it('should build query with pagination', () => {
      const query: QueryRequest = {
        table: 'protocols',
        pagination: {
          page: 2,
          limit: 50,
        },
      };

      const result = buildQuery(query);
      expect(result.sql).toContain('LIMIT 50');
      expect(result.sql).toContain('OFFSET 50');
    });

    it('should build complex query with all features', () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        filters: {
          and: [
            { field: 'chain', operator: 'in', value: ['ethereum', 'polygon'] },
            { field: 'tvl', operator: 'gte', value: 1000000000 },
          ],
        },
        aggregations: [
          { type: 'sum', field: 'tvl', alias: 'total_tvl' },
          { type: 'avg', field: 'tvl', alias: 'avg_tvl' },
        ],
        groupBy: ['chain'],
        orderBy: [
          { field: 'total_tvl', direction: 'desc' },
        ],
        pagination: {
          page: 1,
          limit: 10,
        },
      };

      const result = buildQuery(query);
      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('GROUP BY');
      expect(result.sql).toContain('ORDER BY');
      expect(result.sql).toContain('LIMIT');
    });
  });

  describe('buildCountQuery', () => {
    it('should build count query', () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'category', operator: 'eq', value: 'DEX' },
          ],
        },
      };

      const result = buildCountQuery(query);
      expect(result.sql).toContain('SELECT COUNT(*)');
      expect(result.sql).toContain('FROM protocols');
      expect(result.sql).toContain('WHERE');
      expect(result.params).toEqual(['DEX']);
    });

    it('should build count query without filters', () => {
      const query: QueryRequest = {
        table: 'protocols',
      };

      const result = buildCountQuery(query);
      expect(result.sql).toBe('SELECT COUNT(*) FROM protocols');
      expect(result.params).toEqual([]);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should use parameterized queries for values', () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'name', operator: 'eq', value: "'; DROP TABLE protocols; --" },
          ],
        },
      };

      const result = buildQuery(query);
      expect(result.sql).not.toContain('DROP TABLE');
      expect(result.params).toContain("'; DROP TABLE protocols; --");
    });

    it('should handle special characters in LIKE operator', () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'name', operator: 'like', value: "test'; DROP TABLE" },
          ],
        },
      };

      const result = buildQuery(query);
      expect(result.sql).toContain('LIKE $1');
      expect(result.params[0]).toContain("test'; DROP TABLE");
    });
  });
});

