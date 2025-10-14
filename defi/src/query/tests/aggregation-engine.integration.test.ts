/**
 * Integration Tests for Aggregation Engine
 * Tests query execution with real PostgreSQL database
 */

import { AggregationEngine } from '../aggregation-engine';
import { QueryRequest, QueryResponse } from '../types';

describe('Aggregation Engine Integration Tests', () => {
  let aggregationEngine: AggregationEngine;

  beforeAll(async () => {
    aggregationEngine = new AggregationEngine();
  });

  describe('Simple Queries', () => {
    it('should execute simple query without filters', async () => {
      const query: QueryRequest = {
        table: 'protocols',
        pagination: { page: 1, limit: 10 },
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data.length).toBeLessThanOrEqual(10);
      expect(response.count).toBeGreaterThan(0);
      expect(response.executionTime).toBeGreaterThan(0);
      expect(response.cacheHit).toBe(false);
    });

    it('should execute query with single filter', async () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'category', operator: 'eq', value: 'DEX' },
          ],
        },
        pagination: { page: 1, limit: 10 },
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data.every((row: any) => row.category === 'DEX')).toBe(true);
    });

    it('should execute query with multiple AND filters', async () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        filters: {
          and: [
            { field: 'chain', operator: 'eq', value: 'ethereum' },
            { field: 'tvl', operator: 'gt', value: 1000000 },
          ],
        },
        pagination: { page: 1, limit: 10 },
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.every((row: any) => 
        row.chain === 'ethereum' && Number(row.tvl) > 1000000
      )).toBe(true);
    });

    it('should execute query with OR filters', async () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          or: [
            { field: 'category', operator: 'eq', value: 'DEX' },
            { field: 'category', operator: 'eq', value: 'Lending' },
          ],
        },
        pagination: { page: 1, limit: 10 },
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.every((row: any) => 
        row.category === 'DEX' || row.category === 'Lending'
      )).toBe(true);
    });

    it('should execute query with IN operator', async () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        filters: {
          and: [
            { field: 'chain', operator: 'in', value: ['ethereum', 'bsc', 'polygon'] },
          ],
        },
        pagination: { page: 1, limit: 10 },
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.every((row: any) => 
        ['ethereum', 'bsc', 'polygon'].includes(row.chain)
      )).toBe(true);
    });
  });

  describe('Aggregations', () => {
    it('should execute SUM aggregation', async () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'sum', field: 'tvl', alias: 'total_tvl' },
        ],
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBe(1);
      expect(response.data[0].total_tvl).toBeDefined();
      expect(Number(response.data[0].total_tvl)).toBeGreaterThan(0);
    });

    it('should execute AVG aggregation', async () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'avg', field: 'tvl', alias: 'avg_tvl' },
        ],
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBe(1);
      expect(response.data[0].avg_tvl).toBeDefined();
      expect(Number(response.data[0].avg_tvl)).toBeGreaterThan(0);
    });

    it('should execute MIN and MAX aggregations', async () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'min', field: 'tvl', alias: 'min_tvl' },
          { type: 'max', field: 'tvl', alias: 'max_tvl' },
        ],
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBe(1);
      expect(response.data[0].min_tvl).toBeDefined();
      expect(response.data[0].max_tvl).toBeDefined();
      expect(Number(response.data[0].min_tvl)).toBeLessThanOrEqual(Number(response.data[0].max_tvl));
    });

    it('should execute COUNT aggregation', async () => {
      const query: QueryRequest = {
        table: 'protocols',
        aggregations: [
          { type: 'count', field: '*', alias: 'total_count' },
        ],
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBe(1);
      expect(response.data[0].total_count).toBeDefined();
      expect(Number(response.data[0].total_count)).toBeGreaterThan(0);
    });

    it('should execute multiple aggregations', async () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'sum', field: 'tvl', alias: 'total_tvl' },
          { type: 'avg', field: 'tvl', alias: 'avg_tvl' },
          { type: 'count', field: '*', alias: 'count' },
        ],
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBe(1);
      expect(response.data[0].total_tvl).toBeDefined();
      expect(response.data[0].avg_tvl).toBeDefined();
      expect(response.data[0].count).toBeDefined();
    });
  });

  describe('Group By', () => {
    it('should execute GROUP BY with single field', async () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'sum', field: 'tvl', alias: 'total_tvl' },
          { type: 'count', field: '*', alias: 'count' },
        ],
        groupBy: ['chain'],
        orderBy: [{ field: 'total_tvl', direction: 'desc' }],
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0].chain).toBeDefined();
      expect(response.data[0].total_tvl).toBeDefined();
      expect(response.data[0].count).toBeDefined();

      // Verify ordering
      for (let i = 1; i < response.data.length; i++) {
        expect(Number(response.data[i - 1].total_tvl)).toBeGreaterThanOrEqual(
          Number(response.data[i].total_tvl)
        );
      }
    });

    it('should execute GROUP BY with multiple fields', async () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'avg', field: 'tvl', alias: 'avg_tvl' },
        ],
        groupBy: ['protocol_id', 'chain'],
        pagination: { page: 1, limit: 10 },
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0].protocol_id).toBeDefined();
      expect(response.data[0].chain).toBeDefined();
      expect(response.data[0].avg_tvl).toBeDefined();
    });

    it('should execute GROUP BY with filters', async () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        filters: {
          and: [
            { field: 'chain', operator: 'in', value: ['ethereum', 'bsc'] },
          ],
        },
        aggregations: [
          { type: 'sum', field: 'tvl', alias: 'total_tvl' },
        ],
        groupBy: ['chain'],
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBeLessThanOrEqual(2);
      expect(response.data.every((row: any) => 
        ['ethereum', 'bsc'].includes(row.chain)
      )).toBe(true);
    });
  });

  describe('Pagination', () => {
    it('should paginate results correctly', async () => {
      const query: QueryRequest = {
        table: 'protocols',
        pagination: { page: 1, limit: 5 },
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBeLessThanOrEqual(5);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(5);
      expect(response.totalPages).toBeGreaterThan(0);
    });

    it('should return correct page 2 results', async () => {
      const query1: QueryRequest = {
        table: 'protocols',
        pagination: { page: 1, limit: 5 },
        orderBy: [{ field: 'id', direction: 'asc' }],
      };

      const query2: QueryRequest = {
        table: 'protocols',
        pagination: { page: 2, limit: 5 },
        orderBy: [{ field: 'id', direction: 'asc' }],
      };

      const response1 = await aggregationEngine.execute(query1);
      const response2 = await aggregationEngine.execute(query2);

      expect(response1.data).toBeDefined();
      expect(response2.data).toBeDefined();

      // Verify no overlap
      const ids1 = response1.data.map((row: any) => row.id);
      const ids2 = response2.data.map((row: any) => row.id);
      const overlap = ids1.filter((id: string) => ids2.includes(id));
      expect(overlap.length).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should execute query within timeout', async () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        aggregations: [
          { type: 'sum', field: 'tvl', alias: 'total_tvl' },
        ],
        groupBy: ['chain'],
      };

      const startTime = Date.now();
      const response = await aggregationEngine.execute(query);
      const endTime = Date.now();

      expect(response.executionTime).toBeLessThan(30000); // 30 seconds timeout
      expect(endTime - startTime).toBeLessThan(30000);
    });

    it('should handle large result sets', async () => {
      const query: QueryRequest = {
        table: 'protocol_tvl',
        pagination: { page: 1, limit: 1000 },
      };

      const response = await aggregationEngine.execute(query);

      expect(response.data).toBeDefined();
      expect(response.data.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid table name', async () => {
      const query: QueryRequest = {
        table: 'invalid_table' as any,
      };

      await expect(aggregationEngine.execute(query)).rejects.toThrow();
    });

    it('should handle invalid field name', async () => {
      const query: QueryRequest = {
        table: 'protocols',
        filters: {
          and: [
            { field: 'invalid_field', operator: 'eq', value: 'test' },
          ],
        },
      };

      await expect(aggregationEngine.execute(query)).rejects.toThrow();
    });
  });
});

