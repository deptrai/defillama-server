/**
 * E2E Tests: Complete Query Workflow
 * Tests the full end-to-end flow of query processing
 */

import {
  setupTestEnvironment,
  teardownTestEnvironment,
  executeQuery,
  generateSimpleQuery,
  generateFilterQuery,
  generateComplexFilterQuery,
  generateAggregationQuery,
  generatePaginationQuery,
  validateResponseStructure,
  validatePaginationResponse,
  validateAggregationResponse,
  clearCache,
  getCacheKeys,
  getProtocolCount,
  getProtocolsByCategory,
  wait,
} from './test-helpers';

describe('E2E: Complete Query Workflow', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await clearCache();
  });

  // ==========================================================================
  // Test Suite 1: Simple Query Workflow
  // ==========================================================================

  describe('Simple Query Workflow', () => {
    it('should execute simple query and return valid response', async () => {
      const query = generateSimpleQuery();
      const response = await executeQuery(query);

      validateResponseStructure(response);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data.length).toBeLessThanOrEqual(10);
      expect(response.cacheHit).toBe(false); // First request should be cache miss
    });

    it('should return cached result on second request', async () => {
      const query = generateSimpleQuery();

      // First request (cache miss)
      const response1 = await executeQuery(query);
      expect(response1.cacheHit).toBe(false);

      // Wait a bit for cache to be set
      await wait(100);

      // Second request (cache hit)
      const response2 = await executeQuery(query);
      expect(response2.cacheHit).toBe(true);
      expect(response2.data).toEqual(response1.data);
    });

    it('should create cache key after query execution', async () => {
      const query = generateSimpleQuery();

      // Execute query
      await executeQuery(query);

      // Check cache keys
      const cacheKeys = await getCacheKeys();
      expect(cacheKeys.length).toBeGreaterThan(0);
      expect(cacheKeys[0]).toMatch(/^query:protocols:/);
    });
  });

  // ==========================================================================
  // Test Suite 2: Filter Query Workflow
  // ==========================================================================

  describe('Filter Query Workflow', () => {
    it('should filter protocols by category', async () => {
      const query = generateFilterQuery('Dexes');
      const response = await executeQuery(query);

      validateResponseStructure(response);
      expect(response.data.length).toBeGreaterThan(0);

      // Verify all results match the filter
      response.data.forEach((protocol: any) => {
        expect(protocol.category).toBe('Dexes');
      });
    });

    it('should return empty array for non-existent category', async () => {
      const query = generateFilterQuery('NonExistentCategory');
      const response = await executeQuery(query);

      validateResponseStructure(response);
      expect(response.data.length).toBe(0);
      expect(response.count).toBe(0);
    });

    it('should handle complex filters with AND/OR', async () => {
      const query = generateComplexFilterQuery();
      const response = await executeQuery(query);

      validateResponseStructure(response);
      expect(response.data.length).toBeGreaterThan(0);

      // Verify results match complex filter
      response.data.forEach((protocol: any) => {
        const categoryMatch = protocol.category === 'Dexes' || protocol.category === 'Lending';
        const chainMatch = protocol.chains.includes('Ethereum');
        expect(categoryMatch).toBe(true);
        expect(chainMatch).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Test Suite 3: Aggregation Query Workflow
  // ==========================================================================

  describe('Aggregation Query Workflow', () => {
    it('should execute aggregation query with GROUP BY', async () => {
      const query = generateAggregationQuery();
      const response = await executeQuery(query);

      validateAggregationResponse(response);
      expect(response.data.length).toBeGreaterThan(0);

      // Verify aggregation results
      const firstRow = response.data[0];
      expect(typeof firstRow.total_tvl).toBe('number');
      expect(typeof firstRow.avg_tvl).toBe('number');
      expect(typeof firstRow.count).toBe('number');
      expect(firstRow.count).toBeGreaterThan(0);
    });

    it('should group results by chain', async () => {
      const query = generateAggregationQuery();
      const response = await executeQuery(query);

      validateAggregationResponse(response);

      // Verify each row has a unique chain
      const chains = response.data.map((row: any) => row.chain);
      const uniqueChains = new Set(chains);
      expect(uniqueChains.size).toBe(chains.length);
    });
  });

  // ==========================================================================
  // Test Suite 4: Pagination Workflow
  // ==========================================================================

  describe('Pagination Workflow', () => {
    it('should paginate results correctly', async () => {
      const query1 = generatePaginationQuery(1, 5);
      const response1 = await executeQuery(query1);

      validatePaginationResponse(response1);
      expect(response1.data.length).toBeLessThanOrEqual(5);
      expect(response1.page).toBe(1);
      expect(response1.limit).toBe(5);
    });

    it('should return different results for different pages', async () => {
      const query1 = generatePaginationQuery(1, 5);
      const query2 = generatePaginationQuery(2, 5);

      const response1 = await executeQuery(query1);
      const response2 = await executeQuery(query2);

      validatePaginationResponse(response1);
      validatePaginationResponse(response2);

      // Verify no overlap between pages
      const ids1 = response1.data.map((p: any) => p.id);
      const ids2 = response2.data.map((p: any) => p.id);
      const overlap = ids1.filter((id: any) => ids2.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should handle deep pagination', async () => {
      const query = generatePaginationQuery(10, 5);
      const response = await executeQuery(query);

      validatePaginationResponse(response);
      expect(response.page).toBe(10);
    });
  });

  // ==========================================================================
  // Test Suite 5: Error Handling Workflow
  // ==========================================================================

  describe('Error Handling Workflow', () => {
    it('should reject invalid table name', async () => {
      const query = {
        table: 'invalid_table' as any,
        fields: ['id', 'name'],
        pagination: { page: 1, limit: 10 },
      };

      await expect(executeQuery(query)).rejects.toThrow();
    });

    it('should reject invalid field name', async () => {
      const query = {
        table: 'protocols',
        fields: ['id', 'invalid_field'],
        pagination: { page: 1, limit: 10 },
      };

      await expect(executeQuery(query)).rejects.toThrow();
    });

    it('should reject missing required fields', async () => {
      const query = {
        table: 'protocols',
        // Missing fields
        pagination: { page: 1, limit: 10 },
      } as any;

      await expect(executeQuery(query)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Test Suite 6: Data Consistency Workflow
  // ==========================================================================

  describe('Data Consistency Workflow', () => {
    it('should return consistent results across multiple queries', async () => {
      const query = generateSimpleQuery();

      const response1 = await executeQuery(query);
      const response2 = await executeQuery(query);
      const response3 = await executeQuery(query);

      expect(response1.data).toEqual(response2.data);
      expect(response2.data).toEqual(response3.data);
    });

    it('should match database count', async () => {
      const query = {
        table: 'protocols',
        fields: ['id'],
        pagination: { page: 1, limit: 1000 },
      };

      const response = await executeQuery(query);
      const dbCount = await getProtocolCount();

      expect(response.data.length).toBeLessThanOrEqual(dbCount);
    });

    it('should match database filter results', async () => {
      const category = 'Dexes';
      const query = generateFilterQuery(category);

      const response = await executeQuery(query);
      const dbResults = await getProtocolsByCategory(category);

      expect(response.data.length).toBeLessThanOrEqual(dbResults.length);
    });
  });

  // ==========================================================================
  // Test Suite 7: Performance Workflow
  // ==========================================================================

  describe('Performance Workflow', () => {
    it('should complete query within acceptable time', async () => {
      const query = generateSimpleQuery();
      const startTime = Date.now();

      const response = await executeQuery(query);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(response.executionTime).toBeLessThan(500); // Query execution should be < 500ms
    });

    it('should be faster with cache', async () => {
      const query = generateSimpleQuery();

      // First request (cache miss)
      const response1 = await executeQuery(query);
      const time1 = response1.executionTime;

      await wait(100);

      // Second request (cache hit)
      const response2 = await executeQuery(query);
      const time2 = response2.executionTime;

      // Cache hit should be significantly faster
      expect(time2).toBeLessThan(time1);
    });
  });
});

