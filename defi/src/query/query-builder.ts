/**
 * Query Builder
 * Builds SQL queries from parsed query requests
 */

import {
  QueryRequest,
  FilterExpression,
  FilterCondition,
  Aggregation,
  OrderBy,
  Pagination,
  BuiltQuery,
  OPERATOR_SQL_MAP,
  AGGREGATION_SQL_MAP,
  DEFAULT_PAGE_SIZE,
} from './types';

// ============================================================================
// Query Builder Class
// ============================================================================

export class QueryBuilder {
  private table: string;
  private selectFields: string[] = [];
  private whereClauses: string[] = [];
  private params: any[] = [];
  private groupByFields: string[] = [];
  private orderByFields: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(query: QueryRequest) {
    this.table = query.table;

    // Build SELECT clause
    if (query.aggregations && query.aggregations.length > 0) {
      this.buildAggregations(query.aggregations);
      
      // Add GROUP BY fields to SELECT
      if (query.groupBy && query.groupBy.length > 0) {
        this.groupByFields = query.groupBy;
        this.selectFields.unshift(...query.groupBy);
      }
    } else {
      this.selectFields = ['*'];
    }

    // Build WHERE clause
    if (query.filters) {
      const whereClause = this.buildFilterExpression(query.filters);
      if (whereClause) {
        this.whereClauses.push(whereClause);
      }
    }

    // Build ORDER BY clause
    if (query.orderBy && query.orderBy.length > 0) {
      this.buildOrderBy(query.orderBy);
    }

    // Build LIMIT and OFFSET
    if (query.pagination) {
      this.buildPagination(query.pagination);
    }
  }

  /**
   * Build SQL query
   */
  build(): BuiltQuery {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.table}`;

    if (this.whereClauses.length > 0) {
      sql += ` WHERE ${this.whereClauses.join(' AND ')}`;
    }

    if (this.groupByFields.length > 0) {
      sql += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }

    if (this.orderByFields.length > 0) {
      sql += ` ORDER BY ${this.orderByFields.join(', ')}`;
    }

    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return { sql, params: this.params };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildAggregations(aggregations: Aggregation[]): void {
    aggregations.forEach(agg => {
      const aggField = this.buildAggregationField(agg);
      this.selectFields.push(aggField);
    });
  }

  private buildAggregationField(agg: Aggregation): string {
    const sqlFunc = AGGREGATION_SQL_MAP[agg.type];
    const field = sqlFunc(agg.field, agg.percentile);
    const alias = agg.alias || `${agg.type}_${agg.field}`;
    return `${field} AS ${alias}`;
  }

  private buildFilterExpression(expression: FilterExpression): string {
    const clauses: string[] = [];

    // Build AND conditions
    if (expression.and && expression.and.length > 0) {
      const andClauses = expression.and.map(condition => this.buildFilterCondition(condition));
      clauses.push(`(${andClauses.join(' AND ')})`);
    }

    // Build OR conditions
    if (expression.or && expression.or.length > 0) {
      const orClauses = expression.or.map(condition => this.buildFilterCondition(condition));
      clauses.push(`(${orClauses.join(' OR ')})`);
    }

    // Build NOT condition
    if (expression.not) {
      const notClause = this.buildFilterExpression(expression.not);
      if (notClause) {
        clauses.push(`NOT (${notClause})`);
      }
    }

    return clauses.join(' AND ');
  }

  private buildFilterCondition(condition: FilterCondition): string {
    const { field, operator, value } = condition;
    const sqlOperator = OPERATOR_SQL_MAP[operator];

    // Handle IN and NOT IN operators
    if (operator === 'in' || operator === 'nin') {
      const placeholders = value.map(() => {
        const paramIndex = this.params.length + 1;
        this.params.push(value[this.params.length - (this.params.length)]);
        return `$${paramIndex}`;
      });
      
      // Add all values to params
      value.forEach((v: any) => {
        if (!this.params.includes(v)) {
          this.params.push(v);
        }
      });
      
      const paramIndices = value.map((_: any, i: number) => `$${this.params.length - value.length + i + 1}`);
      return `${field} ${sqlOperator} (${paramIndices.join(', ')})`;
    }

    // Handle LIKE operator
    if (operator === 'like') {
      this.params.push(`%${value}%`);
      return `${field} ${sqlOperator} $${this.params.length}`;
    }

    // Handle other operators
    this.params.push(value);
    return `${field} ${sqlOperator} $${this.params.length}`;
  }

  private buildOrderBy(orderBy: OrderBy[]): void {
    this.orderByFields = orderBy.map(order => {
      return `${order.field} ${order.direction.toUpperCase()}`;
    });
  }

  private buildPagination(pagination: Pagination): void {
    const limit = pagination.limit || DEFAULT_PAGE_SIZE;
    const page = pagination.page || 1;
    
    this.limitValue = limit;
    this.offsetValue = (page - 1) * limit;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build SQL query from query request
 */
export function buildQuery(query: QueryRequest): BuiltQuery {
  const builder = new QueryBuilder(query);
  return builder.build();
}

/**
 * Build count query for pagination
 */
export function buildCountQuery(query: QueryRequest): BuiltQuery {
  const countQuery: QueryRequest = {
    table: query.table,
    filters: query.filters,
  };

  const builder = new QueryBuilder(countQuery);
  const builtQuery = builder.build();

  // Replace SELECT clause with COUNT(*)
  const sql = builtQuery.sql.replace(/^SELECT .+ FROM/, 'SELECT COUNT(*) FROM');

  return { sql, params: builtQuery.params };
}

/**
 * Sanitize field name to prevent SQL injection
 */
export function sanitizeFieldName(field: string): string {
  // Only allow alphanumeric characters and underscores
  return field.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Sanitize table name to prevent SQL injection
 */
export function sanitizeTableName(table: string): string {
  // Only allow alphanumeric characters and underscores
  return table.replace(/[^a-zA-Z0-9_]/g, '');
}

