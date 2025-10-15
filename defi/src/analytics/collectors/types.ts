/**
 * TypeScript Interfaces for Protocol Performance Collectors
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 2 - Data Collection Pipeline
 */

// ============================================================================
// Protocol Performance Metrics
// ============================================================================

export interface ProtocolPerformanceMetrics {
  protocol_id: string;
  timestamp: Date;
  
  // APY/APR Metrics
  apy_7d?: number;
  apy_30d?: number;
  apy_90d?: number;
  apy_1y?: number;
  apr_7d?: number;
  apr_30d?: number;
  
  // User Metrics
  dau?: number;
  wau?: number;
  mau?: number;
  new_users?: number;
  returning_users?: number;
  churned_users?: number;
  
  // Revenue Metrics
  daily_revenue?: number;
  weekly_revenue?: number;
  monthly_revenue?: number;
  trading_fees?: number;
  withdrawal_fees?: number;
  performance_fees?: number;
  
  // Engagement Metrics
  avg_transaction_size?: number;
  transaction_count?: number;
  unique_traders?: number;
}

// ============================================================================
// TVL Data (from protocol_tvl table)
// ============================================================================

export interface TVLData {
  protocol_id: string;
  chain: string;
  tvl: number;
  tvl_prev_day?: number;
  tvl_prev_week?: number;
  tvl_prev_month?: number;
  change_1d?: number;
  change_7d?: number;
  change_30d?: number;
  timestamp: Date;
}

// ============================================================================
// User Data (from dailyUsers table)
// ============================================================================

export interface UserData {
  protocol_id: string;
  chain: string;
  users: number;
  start: number; // Unix timestamp
  end_time: number; // Unix timestamp
}

// ============================================================================
// Aggregated Protocol Data
// ============================================================================

export interface AggregatedProtocolData {
  protocol_id: string;
  timestamp: Date;
  
  // TVL Aggregation
  total_tvl: number;
  tvl_by_chain: Record<string, number>;
  tvl_change_1d?: number;
  tvl_change_7d?: number;
  tvl_change_30d?: number;
  
  // User Aggregation
  total_users: number;
  users_by_chain: Record<string, number>;
  dau?: number;
  wau?: number;
  mau?: number;
}

// ============================================================================
// Collector Result
// ============================================================================

export interface CollectorResult {
  success: boolean;
  protocol_id: string;
  timestamp: Date;
  metrics_collected: string[]; // List of metric types collected
  errors?: string[];
  duration_ms: number;
}

// ============================================================================
// Collector Options
// ============================================================================

export interface CollectorOptions {
  protocol_ids?: string[]; // Specific protocols to collect (if not provided, collect all)
  start_date?: Date; // Start date for historical collection
  end_date?: Date; // End date for historical collection
  skip_existing?: boolean; // Skip if data already exists for timestamp
  batch_size?: number; // Number of protocols to process in parallel
}

// ============================================================================
// Date Range
// ============================================================================

export interface DateRange {
  start: Date;
  end: Date;
}

// ============================================================================
// Metric Calculation Result
// ============================================================================

export interface MetricCalculationResult {
  value: number | null;
  confidence: number; // 0-1, how confident we are in this metric
  data_points: number; // Number of data points used in calculation
  method: string; // Calculation method used
}

// ============================================================================
// Collection Statistics
// ============================================================================

export interface CollectionStatistics {
  total_protocols: number;
  successful_collections: number;
  failed_collections: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  errors: Array<{
    protocol_id: string;
    error: string;
    timestamp: Date;
  }>;
}

// ============================================================================
// Database Query Result Types
// ============================================================================

export interface TVLQueryResult {
  protocol_id: string;
  chain: string;
  tvl: string; // NUMERIC from PostgreSQL comes as string
  tvl_prev_day?: string;
  tvl_prev_week?: string;
  tvl_prev_month?: string;
  change_1d?: string;
  change_7d?: string;
  change_30d?: string;
  timestamp: Date;
}

export interface UserQueryResult {
  protocolid: string; // Note: lowercase from PostgreSQL
  chain: string;
  users: number;
  start: number;
  endtime: number; // Note: lowercase from PostgreSQL
}

// ============================================================================
// Helper Types
// ============================================================================

export type MetricType = 
  | 'tvl'
  | 'apy'
  | 'users'
  | 'revenue'
  | 'engagement';

export type TimeRange = 
  | '1d'
  | '7d'
  | '30d'
  | '90d'
  | '1y';

export type AggregationMethod = 
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'median';

// ============================================================================
// Error Types
// ============================================================================

export class CollectorError extends Error {
  constructor(
    message: string,
    public protocol_id: string,
    public metric_type: MetricType,
    public original_error?: Error
  ) {
    super(message);
    this.name = 'CollectorError';
  }
}

export class DataValidationError extends Error {
  constructor(
    message: string,
    public protocol_id: string,
    public invalid_data: any
  ) {
    super(message);
    this.name = 'DataValidationError';
  }
}

