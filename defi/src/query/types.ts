/**
 * Query Types and Interfaces
 * Type definitions for Advanced Query Processor
 */

// ============================================================================
// Query Request Types
// ============================================================================

export type TableName = 'protocols' | 'protocol_tvl' | 'token_prices' | 'protocol_stats';

export interface QueryRequest {
  table: TableName;
  filters?: FilterExpression;
  aggregations?: Aggregation[];
  groupBy?: string[];
  orderBy?: OrderBy[];
  pagination?: Pagination;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface FilterExpression {
  and?: FilterCondition[];
  or?: FilterCondition[];
  not?: FilterExpression;
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

export type FilterOperator = 
  | 'eq'      // Equal
  | 'ne'      // Not equal
  | 'gt'      // Greater than
  | 'gte'     // Greater than or equal
  | 'lt'      // Less than
  | 'lte'     // Less than or equal
  | 'in'      // In array
  | 'nin'     // Not in array
  | 'like';   // SQL LIKE pattern

// ============================================================================
// Aggregation Types
// ============================================================================

export interface Aggregation {
  type: AggregationType;
  field: string;
  alias?: string;
  percentile?: number; // For percentile aggregation (0-100)
}

export type AggregationType = 
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'count'
  | 'percentile';

// ============================================================================
// Order By Types
// ============================================================================

export interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface Pagination {
  page: number;      // 1-based page number
  limit: number;     // Records per page (max 1000)
}

// ============================================================================
// Query Response Types
// ============================================================================

export interface QueryResponse<T = any> {
  data: T[];
  count: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  executionTime: number;
  cacheHit: boolean;
}

// ============================================================================
// Query Execution Types
// ============================================================================

export interface QueryExecution {
  sql: string;
  params: any[];
  executionTime: number;
  resultCount: number;
  cacheHit: boolean;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CachedResult {
  data: any[];
  count: number;
  executionTime: number;
  cachedAt: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttl: number;        // Time to live in seconds (default: 300)
  prefix?: string;    // Cache key prefix
}

// ============================================================================
// Query Log Types
// ============================================================================

export interface QueryLog {
  id: string;
  userId?: string;
  queryHash: string;
  queryParams: QueryRequest;
  executionTimeMs: number;
  resultCount?: number;
  cacheHit: boolean;
  errorMessage?: string;
  createdAt: Date;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// Query Builder Types
// ============================================================================

export interface QueryBuilderOptions {
  table: TableName;
  filters?: FilterExpression;
  aggregations?: Aggregation[];
  groupBy?: string[];
  orderBy?: OrderBy[];
  pagination?: Pagination;
}

export interface BuiltQuery {
  sql: string;
  params: any[];
}

// ============================================================================
// Table Schema Types
// ============================================================================

export interface TableSchema {
  name: TableName;
  fields: FieldSchema[];
  indexes: string[];
}

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array';
  nullable: boolean;
  filterable: boolean;
  aggregatable: boolean;
}

// ============================================================================
// Operator Mapping
// ============================================================================

export const OPERATOR_SQL_MAP: Record<FilterOperator, string> = {
  eq: '=',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  in: 'IN',
  nin: 'NOT IN',
  like: 'LIKE',
};

// ============================================================================
// Aggregation Mapping
// ============================================================================

export const AGGREGATION_SQL_MAP: Record<AggregationType, (field: string, percentile?: number) => string> = {
  sum: (field) => `SUM(${field})`,
  avg: (field) => `AVG(${field})`,
  min: (field) => `MIN(${field})`,
  max: (field) => `MAX(${field})`,
  count: (field) => `COUNT(${field})`,
  percentile: (field, percentile = 50) => `PERCENTILE_CONT(${percentile / 100}) WITHIN GROUP (ORDER BY ${field})`,
};

// ============================================================================
// Table Schemas
// ============================================================================

export const TABLE_SCHEMAS: Record<TableName, TableSchema> = {
  protocols: {
    name: 'protocols',
    fields: [
      { name: 'id', type: 'string', nullable: false, filterable: true, aggregatable: false },
      { name: 'name', type: 'string', nullable: false, filterable: true, aggregatable: false },
      { name: 'category', type: 'string', nullable: true, filterable: true, aggregatable: false },
      { name: 'chains', type: 'array', nullable: true, filterable: true, aggregatable: false },
      { name: 'description', type: 'string', nullable: true, filterable: false, aggregatable: false },
      { name: 'website', type: 'string', nullable: true, filterable: false, aggregatable: false },
      { name: 'created_at', type: 'date', nullable: false, filterable: true, aggregatable: false },
    ],
    indexes: ['id', 'name', 'category'],
  },
  protocol_tvl: {
    name: 'protocol_tvl',
    fields: [
      { name: 'id', type: 'string', nullable: false, filterable: true, aggregatable: false },
      { name: 'protocol_id', type: 'string', nullable: false, filterable: true, aggregatable: false },
      { name: 'chain', type: 'string', nullable: false, filterable: true, aggregatable: false },
      { name: 'tvl', type: 'number', nullable: false, filterable: true, aggregatable: true },
      { name: 'tvl_prev_day', type: 'number', nullable: true, filterable: true, aggregatable: true },
      { name: 'change_1d', type: 'number', nullable: true, filterable: true, aggregatable: true },
      { name: 'timestamp', type: 'date', nullable: false, filterable: true, aggregatable: false },
    ],
    indexes: ['protocol_id', 'chain', 'timestamp', 'tvl'],
  },
  token_prices: {
    name: 'token_prices',
    fields: [
      { name: 'id', type: 'string', nullable: false, filterable: true, aggregatable: false },
      { name: 'token_id', type: 'string', nullable: false, filterable: true, aggregatable: false },
      { name: 'token_symbol', type: 'string', nullable: false, filterable: true, aggregatable: false },
      { name: 'price', type: 'number', nullable: false, filterable: true, aggregatable: true },
      { name: 'volume_24h', type: 'number', nullable: true, filterable: true, aggregatable: true },
      { name: 'market_cap', type: 'number', nullable: true, filterable: true, aggregatable: true },
      { name: 'timestamp', type: 'date', nullable: false, filterable: true, aggregatable: false },
    ],
    indexes: ['token_id', 'token_symbol', 'timestamp', 'price'],
  },
  protocol_stats: {
    name: 'protocol_stats',
    fields: [
      { name: 'id', type: 'string', nullable: false, filterable: true, aggregatable: false },
      { name: 'protocol_id', type: 'string', nullable: false, filterable: true, aggregatable: false },
      { name: 'total_tvl', type: 'number', nullable: false, filterable: true, aggregatable: true },
      { name: 'total_chains', type: 'number', nullable: false, filterable: true, aggregatable: true },
      { name: 'avg_tvl_per_chain', type: 'number', nullable: true, filterable: true, aggregatable: true },
      { name: 'max_tvl', type: 'number', nullable: true, filterable: true, aggregatable: true },
      { name: 'min_tvl', type: 'number', nullable: true, filterable: true, aggregatable: true },
    ],
    indexes: ['protocol_id', 'total_tvl'],
  },
};

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 1000;
export const DEFAULT_CACHE_TTL = 300; // 5 minutes
export const MAX_QUERY_COMPLEXITY = 10; // Max nested conditions
export const QUERY_TIMEOUT_MS = 30000; // 30 seconds

