/**
 * E2E Tests: Real-World Use Case Scenarios
 * Tests complex multi-step workflows that simulate actual user behavior
 */

import {
  setupTestEnvironment,
  teardownTestEnvironment,
  executeQuery,
  validateResponseStructure,
  validateAggregationResponse,
  clearCache,
  wait,
} from './test-helpers';
import { QueryRequest } from '../../types';

describe('E2E: Real-World Use Case Scenarios', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearCache();
  });

  // ==========================================================================
  // Scenario 1: DeFi Dashboard - Protocol Discovery
  // ==========================================================================

  describe('Scenario 1: DeFi Dashboard - Protocol Discovery', () => {
    it('should discover protocols by category and analyze TVL', async () => {
      // Step 1: Get all Dexes protocols
      const step1Query: QueryRequest = {
        table: 'protocols',
        fields: ['id', 'name', 'category', 'chains', 'website'],
        filters: {
          operator: 'AND',
          conditions: [
            {
              field: 'category',
              operator: 'eq',
              value: 'Dexes',
            },
          ],
        },
        pagination: { page: 1, limit: 10 },
      };

      const step1Response = await executeQuery(step1Query);
      validateResponseStructure(step1Response);
      expect(step1Response.data.length).toBeGreaterThan(0);

      const protocolIds = step1Response.data.map((p: any) => p.id);

      // Step 2: Get TVL data for discovered protocols
      const step2Query: QueryRequest = {
        table: 'protocol_tvl',
        fields: ['protocol_id', 'chain', 'tvl', 'timestamp'],
        filters: {
          operator: 'AND',
          conditions: [
            {
              field: 'protocol_id',
              operator: 'in',
              value: protocolIds.slice(0, 5), // Limit to first 5 protocols
            },
          ],
        },
        pagination: { page: 1, limit: 50 },
      };

      const step2Response = await executeQuery(step2Query);
      validateResponseStructure(step2Response);
      expect(step2Response.data.length).toBeGreaterThan(0);

      // Step 3: Calculate aggregated TVL by chain
      const step3Query: QueryRequest = {
        table: 'protocol_tvl',
        fields: ['chain'],
        filters: {
          operator: 'AND',
          conditions: [
            {
              field: 'protocol_id',
              operator: 'in',
              value: protocolIds.slice(0, 5),
            },
          ],
        },
        aggregations: [
          {
            type: 'sum',
            field: 'tvl',
            alias: 'total_tvl',
          },
          {
            type: 'avg',
            field: 'tvl',
            alias: 'avg_tvl',
          },
          {
            type: 'count',
            field: '*',
            alias: 'count',
          },
        ],
        groupBy: ['chain'],
        pagination: { page: 1, limit: 10 },
      };

      const step3Response = await executeQuery(step3Query);
      validateAggregationResponse(step3Response);
      expect(step3Response.data.length).toBeGreaterThan(0);

      // Verify data consistency
      const totalRecords = step3Response.data.reduce((sum: number, row: any) => sum + row.count, 0);
      expect(totalRecords).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Scenario 2: Portfolio Tracker - Multi-Chain Analysis
  // ==========================================================================

  describe('Scenario 2: Portfolio Tracker - Multi-Chain Analysis', () => {
    it('should track protocols across multiple chains', async () => {
      // Step 1: Get protocols on Ethereum
      const ethereumQuery: QueryRequest = {
        table: 'protocols',
        fields: ['id', 'name', 'chains'],
        filters: {
          operator: 'AND',
          conditions: [
            {
              field: 'chains',
              operator: 'contains',
              value: 'Ethereum',
            },
          ],
        },
        pagination: { page: 1, limit: 10 },
      };

      const ethereumResponse = await executeQuery(ethereumQuery);
      validateResponseStructure(ethereumResponse);
      const ethereumProtocols = ethereumResponse.data;

      // Step 2: Get protocols on BSC
      const bscQuery: QueryRequest = {
        table: 'protocols',
        fields: ['id', 'name', 'chains'],
        filters: {
          operator: 'AND',
          conditions: [
            {
              field: 'chains',
              operator: 'contains',
              value: 'BSC',
            },
          ],
        },
        pagination: { page: 1, limit: 10 },
      };

      const bscResponse = await executeQuery(bscQuery);
      validateResponseStructure(bscResponse);
      const bscProtocols = bscResponse.data;

      // Step 3: Find protocols on both chains
      const ethereumIds = new Set(ethereumProtocols.map((p: any) => p.id));
      const bscIds = new Set(bscProtocols.map((p: any) => p.id));
      const commonProtocols = [...ethereumIds].filter(id => bscIds.has(id));

      expect(commonProtocols.length).toBeGreaterThan(0);

      // Step 4: Get TVL comparison for common protocols
      const tvlQuery: QueryRequest = {
        table: 'protocol_tvl',
        fields: ['chain'],
        filters: {
          operator: 'AND',
          conditions: [
            {
              field: 'protocol_id',
              operator: 'in',
              value: commonProtocols.slice(0, 3),
            },
            {
              operator: 'OR',
              conditions: [
                {
                  field: 'chain',
                  operator: 'eq',
                  value: 'Ethereum',
                },
                {
                  field: 'chain',
                  operator: 'eq',
                  value: 'BSC',
                },
              ],
            },
          ],
        },
        aggregations: [
          {
            type: 'sum',
            field: 'tvl',
            alias: 'total_tvl',
          },
        ],
        groupBy: ['chain'],
        pagination: { page: 1, limit: 10 },
      };

      const tvlResponse = await executeQuery(tvlQuery);
      validateAggregationResponse(tvlResponse);
      expect(tvlResponse.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Scenario 3: Market Research - Category Comparison
  // ==========================================================================

  describe('Scenario 3: Market Research - Category Comparison', () => {
    it('should compare different DeFi categories', async () => {
      const categories = ['Dexes', 'Lending', 'Yield'];
      const categoryStats: any[] = [];

      // Step 1: Get protocol count for each category
      for (const category of categories) {
        const query: QueryRequest = {
          table: 'protocols',
          fields: ['category'],
          filters: {
            operator: 'AND',
            conditions: [
              {
                field: 'category',
                operator: 'eq',
                value: category,
              },
            ],
          },
          aggregations: [
            {
              type: 'count',
              field: '*',
              alias: 'count',
            },
          ],
          groupBy: ['category'],
          pagination: { page: 1, limit: 1 },
        };

        const response = await executeQuery(query);
        validateAggregationResponse(response);

        if (response.data.length > 0) {
          categoryStats.push({
            category,
            count: response.data[0].count,
          });
        }
      }

      expect(categoryStats.length).toBeGreaterThan(0);

      // Step 2: Get TVL distribution for top category
      const topCategory = categoryStats.sort((a, b) => b.count - a.count)[0];

      const tvlQuery: QueryRequest = {
        table: 'protocol_tvl',
        fields: ['chain'],
        filters: {
          operator: 'AND',
          conditions: [
            {
              field: 'protocol_id',
              operator: 'in',
              value: ['protocol-1', 'protocol-2', 'protocol-3'], // Sample IDs
            },
          ],
        },
        aggregations: [
          {
            type: 'sum',
            field: 'tvl',
            alias: 'total_tvl',
          },
          {
            type: 'avg',
            field: 'tvl',
            alias: 'avg_tvl',
          },
        ],
        groupBy: ['chain'],
        pagination: { page: 1, limit: 10 },
      };

      const tvlResponse = await executeQuery(tvlQuery);
      validateAggregationResponse(tvlResponse);
    });
  });

  // ==========================================================================
  // Scenario 4: Time-Series Analysis - Historical TVL
  // ==========================================================================

  describe('Scenario 4: Time-Series Analysis - Historical TVL', () => {
    it('should analyze TVL trends over time', async () => {
      // Step 1: Get protocols
      const protocolQuery: QueryRequest = {
        table: 'protocols',
        fields: ['id', 'name'],
        pagination: { page: 1, limit: 5 },
      };

      const protocolResponse = await executeQuery(protocolQuery);
      validateResponseStructure(protocolResponse);
      const protocolIds = protocolResponse.data.map((p: any) => p.id);

      // Step 2: Get TVL data ordered by timestamp
      const tvlQuery: QueryRequest = {
        table: 'protocol_tvl',
        fields: ['protocol_id', 'chain', 'tvl', 'timestamp'],
        filters: {
          operator: 'AND',
          conditions: [
            {
              field: 'protocol_id',
              operator: 'in',
              value: protocolIds,
            },
          ],
        },
        orderBy: [
          {
            field: 'timestamp',
            direction: 'desc',
          },
        ],
        pagination: { page: 1, limit: 50 },
      };

      const tvlResponse = await executeQuery(tvlQuery);
      validateResponseStructure(tvlResponse);
      expect(tvlResponse.data.length).toBeGreaterThan(0);

      // Verify timestamps are in descending order
      for (let i = 1; i < tvlResponse.data.length; i++) {
        const prev = new Date(tvlResponse.data[i - 1].timestamp);
        const curr = new Date(tvlResponse.data[i].timestamp);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });
  });

  // ==========================================================================
  // Scenario 5: Cache Optimization - Repeated Queries
  // ==========================================================================

  describe('Scenario 5: Cache Optimization - Repeated Queries', () => {
    it('should optimize performance with cache for repeated queries', async () => {
      const query: QueryRequest = {
        table: 'protocols',
        fields: ['id', 'name', 'category'],
        filters: {
          operator: 'AND',
          conditions: [
            {
              field: 'category',
              operator: 'eq',
              value: 'Dexes',
            },
          ],
        },
        pagination: { page: 1, limit: 10 },
      };

      // First request (cache miss)
      const response1 = await executeQuery(query);
      expect(response1.cacheHit).toBe(false);
      const time1 = response1.executionTime;

      await wait(100);

      // Subsequent requests (cache hit)
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const response = await executeQuery(query);
        expect(response.cacheHit).toBe(true);
        times.push(response.executionTime);
        await wait(50);
      }

      // Cache hits should be consistently faster
      const avgCacheTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      expect(avgCacheTime).toBeLessThan(time1);
    });
  });
});

