/**
 * Query Parser and Validator
 * Parses and validates query requests
 */

import {
  QueryRequest,
  FilterExpression,
  FilterCondition,
  FilterOperator,
  Aggregation,
  AggregationType,
  OrderBy,
  Pagination,
  ValidationError,
  ValidationResult,
  TableName,
  TABLE_SCHEMAS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_QUERY_COMPLEXITY,
} from './types';

// ============================================================================
// Query Parser Class
// ============================================================================

export class QueryParser {
  private errors: ValidationError[] = [];

  /**
   * Parse and validate query request
   */
  parse(query: any): QueryRequest {
    this.errors = [];

    // Validate required fields
    if (!query.table) {
      this.addError('table', 'Table name is required');
    }

    // Validate table name
    if (query.table && !this.isValidTable(query.table)) {
      this.addError('table', `Invalid table name: ${query.table}`);
    }

    // Validate filters
    if (query.filters) {
      this.validateFilters(query.filters, query.table);
    }

    // Validate aggregations
    if (query.aggregations) {
      this.validateAggregations(query.aggregations, query.table);
    }

    // Validate groupBy
    if (query.groupBy) {
      this.validateGroupBy(query.groupBy, query.table);
    }

    // Validate orderBy
    if (query.orderBy) {
      this.validateOrderBy(query.orderBy, query.table);
    }

    // Validate pagination
    if (query.pagination) {
      this.validatePagination(query.pagination);
    }

    // Throw error if validation failed
    if (this.errors.length > 0) {
      throw new QueryValidationError(this.errors);
    }

    return query as QueryRequest;
  }

  /**
   * Validate query request
   */
  validate(query: any): ValidationResult {
    try {
      this.parse(query);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof QueryValidationError) {
        return { valid: false, errors: error.errors };
      }
      return { valid: false, errors: [{ field: 'unknown', message: error.message }] };
    }
  }

  // ============================================================================
  // Validation Methods
  // ============================================================================

  private isValidTable(table: string): boolean {
    return ['protocols', 'protocol_tvl', 'token_prices', 'protocol_stats'].includes(table);
  }

  private validateFilters(filters: FilterExpression, table: TableName, depth: number = 0): void {
    // Check max complexity
    if (depth > MAX_QUERY_COMPLEXITY) {
      this.addError('filters', `Filter complexity exceeds maximum depth of ${MAX_QUERY_COMPLEXITY}`);
      return;
    }

    // Validate AND conditions
    if (filters.and) {
      if (!Array.isArray(filters.and)) {
        this.addError('filters.and', 'AND conditions must be an array');
      } else {
        filters.and.forEach((condition, index) => {
          this.validateFilterCondition(condition, table, `filters.and[${index}]`);
        });
      }
    }

    // Validate OR conditions
    if (filters.or) {
      if (!Array.isArray(filters.or)) {
        this.addError('filters.or', 'OR conditions must be an array');
      } else {
        filters.or.forEach((condition, index) => {
          this.validateFilterCondition(condition, table, `filters.or[${index}]`);
        });
      }
    }

    // Validate NOT condition
    if (filters.not) {
      this.validateFilters(filters.not, table, depth + 1);
    }

    // Check that at least one condition is provided
    if (!filters.and && !filters.or && !filters.not) {
      this.addError('filters', 'Filter expression must have at least one condition (and, or, not)');
    }
  }

  private validateFilterCondition(condition: FilterCondition, table: TableName, path: string): void {
    // Validate field
    if (!condition.field) {
      this.addError(`${path}.field`, 'Field name is required');
      return;
    }

    const schema = TABLE_SCHEMAS[table];
    if (!schema) {
      this.addError(`${path}.field`, `Invalid table: ${table}`);
      return;
    }

    const fieldSchema = schema.fields.find(f => f.name === condition.field);

    if (!fieldSchema) {
      this.addError(`${path}.field`, `Field '${condition.field}' does not exist in table '${table}'`);
      return;
    }

    if (!fieldSchema.filterable) {
      this.addError(`${path}.field`, `Field '${condition.field}' is not filterable`);
      return;
    }

    // Validate operator
    if (!condition.operator) {
      this.addError(`${path}.operator`, 'Operator is required');
      return;
    }

    if (!this.isValidOperator(condition.operator)) {
      this.addError(`${path}.operator`, `Invalid operator: ${condition.operator}`);
      return;
    }

    // Validate value
    if (condition.value === undefined || condition.value === null) {
      this.addError(`${path}.value`, 'Value is required');
      return;
    }

    // Validate value type
    this.validateValueType(condition.value, fieldSchema.type, condition.operator, `${path}.value`);
  }

  private validateValueType(value: any, fieldType: string, operator: FilterOperator, path: string): void {
    // For IN and NIN operators, value must be an array
    if (operator === 'in' || operator === 'nin') {
      if (!Array.isArray(value)) {
        this.addError(path, `Value must be an array for ${operator} operator`);
      }
      return;
    }

    // For other operators, validate type
    switch (fieldType) {
      case 'number':
        if (typeof value !== 'number') {
          this.addError(path, `Value must be a number for field type ${fieldType}`);
        }
        break;
      case 'string':
        if (typeof value !== 'string') {
          this.addError(path, `Value must be a string for field type ${fieldType}`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          this.addError(path, `Value must be a boolean for field type ${fieldType}`);
        }
        break;
      case 'date':
        if (!(value instanceof Date) && typeof value !== 'string') {
          this.addError(path, `Value must be a date or date string for field type ${fieldType}`);
        }
        break;
    }
  }

  private validateAggregations(aggregations: Aggregation[], table: TableName): void {
    if (!Array.isArray(aggregations)) {
      this.addError('aggregations', 'Aggregations must be an array');
      return;
    }

    const schema = TABLE_SCHEMAS[table];
    if (!schema) {
      this.addError('aggregations', `Invalid table: ${table}`);
      return;
    }

    aggregations.forEach((agg, index) => {
      const path = `aggregations[${index}]`;

      // Validate type
      if (!agg.type) {
        this.addError(`${path}.type`, 'Aggregation type is required');
        return;
      }

      if (!this.isValidAggregationType(agg.type)) {
        this.addError(`${path}.type`, `Invalid aggregation type: ${agg.type}`);
        return;
      }

      // Validate field
      if (!agg.field) {
        this.addError(`${path}.field`, 'Field name is required');
        return;
      }

      const fieldSchema = schema.fields.find(f => f.name === agg.field);

      if (!fieldSchema) {
        this.addError(`${path}.field`, `Field '${agg.field}' does not exist in table '${table}'`);
        return;
      }

      if (!fieldSchema.aggregatable) {
        this.addError(`${path}.field`, `Field '${agg.field}' is not aggregatable`);
        return;
      }

      // Validate percentile
      if (agg.type === 'percentile') {
        if (agg.percentile === undefined || agg.percentile === null) {
          this.addError(`${path}.percentile`, 'Percentile value is required for percentile aggregation');
        } else if (agg.percentile < 0 || agg.percentile > 100) {
          this.addError(`${path}.percentile`, 'Percentile value must be between 0 and 100');
        }
      }
    });
  }

  private validateGroupBy(groupBy: string[], table: TableName): void {
    if (!Array.isArray(groupBy)) {
      this.addError('groupBy', 'GroupBy must be an array');
      return;
    }

    const schema = TABLE_SCHEMAS[table];
    if (!schema) {
      this.addError('groupBy', `Invalid table: ${table}`);
      return;
    }

    groupBy.forEach((field, index) => {
      const fieldSchema = schema.fields.find(f => f.name === field);

      if (!fieldSchema) {
        this.addError(`groupBy[${index}]`, `Field '${field}' does not exist in table '${table}'`);
      }
    });
  }

  private validateOrderBy(orderBy: OrderBy[], table: TableName): void {
    if (!Array.isArray(orderBy)) {
      this.addError('orderBy', 'OrderBy must be an array');
      return;
    }

    const schema = TABLE_SCHEMAS[table];
    if (!schema) {
      this.addError('orderBy', `Invalid table: ${table}`);
      return;
    }

    orderBy.forEach((order, index) => {
      const path = `orderBy[${index}]`;

      if (!order.field) {
        this.addError(`${path}.field`, 'Field name is required');
        return;
      }

      const fieldSchema = schema.fields.find(f => f.name === order.field);

      if (!fieldSchema) {
        this.addError(`${path}.field`, `Field '${order.field}' does not exist in table '${table}'`);
      }

      if (!order.direction) {
        this.addError(`${path}.direction`, 'Direction is required');
      } else if (order.direction !== 'asc' && order.direction !== 'desc') {
        this.addError(`${path}.direction`, `Invalid direction: ${order.direction}`);
      }
    });
  }

  private validatePagination(pagination: Pagination): void {
    if (typeof pagination.page !== 'number' || pagination.page < 1) {
      this.addError('pagination.page', 'Page must be a positive integer');
    }

    if (typeof pagination.limit !== 'number' || pagination.limit < 1) {
      this.addError('pagination.limit', 'Limit must be a positive integer');
    }

    if (pagination.limit > MAX_PAGE_SIZE) {
      this.addError('pagination.limit', `Limit cannot exceed ${MAX_PAGE_SIZE}`);
    }
  }

  private isValidOperator(operator: string): boolean {
    return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'like'].includes(operator);
  }

  private isValidAggregationType(type: string): boolean {
    return ['sum', 'avg', 'min', 'max', 'count', 'percentile'].includes(type);
  }

  private addError(field: string, message: string, value?: any): void {
    this.errors.push({ field, message, value });
  }
}

// ============================================================================
// Query Validation Error
// ============================================================================

export class QueryValidationError extends Error {
  constructor(public errors: ValidationError[]) {
    super(`Query validation failed: ${errors.map(e => e.message).join(', ')}`);
    this.name = 'QueryValidationError';
  }
}

// ============================================================================
// Exports
// ============================================================================

export const queryParser = new QueryParser();

