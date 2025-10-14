/**
 * Aggregation Engine
 * Executes aggregations and processes query results
 */

import { QueryRequest, QueryResponse, Aggregation } from './types';
import { buildQuery, buildCountQuery } from './query-builder';
import getDBConnection from '../utils/shared/getDBConnection';

// ============================================================================
// Aggregation Engine Class
// ============================================================================

export class AggregationEngine {
  /**
   * Execute query with aggregations
   */
  async execute(query: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();
    const db = await getDBConnection();

    try {
      // Set query timeout (30 seconds)
      await db.query('SET statement_timeout = 30000');

      // Build SQL query
      const builtQuery = buildQuery(query);

      // Execute query
      const result = await db.query(builtQuery.sql, builtQuery.params);

      // Get total count for pagination
      let totalCount = result.rows.length;
      let totalPages: number | undefined;

      if (query.pagination) {
        const countQuery = buildCountQuery(query);
        const countResult = await db.query(countQuery.sql, countQuery.params);
        totalCount = parseInt(countResult.rows[0].count, 10);
        totalPages = Math.ceil(totalCount / query.pagination.limit);
      }

      const executionTime = Date.now() - startTime;

      return {
        data: result.rows,
        count: result.rows.length,
        page: query.pagination?.page,
        limit: query.pagination?.limit,
        totalPages,
        executionTime,
        cacheHit: false,
      };
    } catch (error) {
      throw new AggregationError(`Failed to execute query: ${error.message}`, error);
    } finally {
      // Reset query timeout
      try {
        await db.query('SET statement_timeout = 0');
      } catch (e) {
        // Ignore error if connection is already closed
      }
    }
  }

  /**
   * Execute aggregation with grouping
   */
  async executeGrouped(query: QueryRequest): Promise<QueryResponse> {
    if (!query.groupBy || query.groupBy.length === 0) {
      throw new AggregationError('GroupBy fields are required for grouped aggregation');
    }

    if (!query.aggregations || query.aggregations.length === 0) {
      throw new AggregationError('Aggregations are required for grouped aggregation');
    }

    return this.execute(query);
  }

  /**
   * Execute percentile aggregation
   */
  async executePercentile(
    table: string,
    field: string,
    percentile: number,
    filters?: any
  ): Promise<number> {
    const query: QueryRequest = {
      table: table as any,
      filters,
      aggregations: [
        {
          type: 'percentile',
          field,
          percentile,
          alias: 'percentile_value',
        },
      ],
    };

    const result = await this.execute(query);

    if (result.data.length === 0) {
      throw new AggregationError('No data found for percentile calculation');
    }

    return parseFloat(result.data[0].percentile_value);
  }

  /**
   * Execute multiple aggregations
   */
  async executeMultiple(queries: QueryRequest[]): Promise<QueryResponse[]> {
    const promises = queries.map(query => this.execute(query));
    return Promise.all(promises);
  }

  /**
   * Format aggregation results
   */
  formatResults(data: any[], aggregations: Aggregation[]): any[] {
    return data.map(row => {
      const formatted: any = {};

      // Copy non-aggregation fields
      Object.keys(row).forEach(key => {
        const isAggregation = aggregations.some(agg => {
          const alias = agg.alias || `${agg.type}_${agg.field}`;
          return alias === key;
        });

        if (!isAggregation) {
          formatted[key] = row[key];
        }
      });

      // Format aggregation fields
      aggregations.forEach(agg => {
        const alias = agg.alias || `${agg.type}_${agg.field}`;
        const value = row[alias];

        if (value !== undefined && value !== null) {
          // Format numbers
          if (typeof value === 'number') {
            formatted[alias] = this.formatNumber(value, agg.type);
          } else {
            formatted[alias] = value;
          }
        }
      });

      return formatted;
    });
  }

  /**
   * Format number based on aggregation type
   */
  private formatNumber(value: number, type: string): number {
    switch (type) {
      case 'count':
        return Math.floor(value);
      case 'percentile':
        return Math.round(value * 100) / 100; // 2 decimal places
      case 'avg':
        return Math.round(value * 100) / 100; // 2 decimal places
      default:
        return value;
    }
  }
}

// ============================================================================
// Aggregation Error
// ============================================================================

export class AggregationError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'AggregationError';
  }
}

// ============================================================================
// Exports
// ============================================================================

export const aggregationEngine = new AggregationEngine();

