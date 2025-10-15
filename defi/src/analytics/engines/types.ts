/**
 * Analytics Engines Types
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 3 - Analytics Engine
 * 
 * Shared types and interfaces for analytics calculation engines
 */

// ============================================================================
// APY/APR Types
// ============================================================================

export interface APYCalculationInput {
  protocolId: string;
  startValue: number;
  endValue: number;
  startDate: Date;
  endDate: Date;
  compoundingPeriods?: number; // Default: 365 (daily compounding)
}

export interface APYResult {
  apy: number;
  apr: number;
  periodDays: number;
  annualizedReturn: number;
}

export interface APYTimeSeriesPoint {
  timestamp: Date;
  apy: number;
  apr: number;
  tvl: number;
}

export interface APYAnalysis {
  protocolId: string;
  current: APYResult;
  apy7d: number;
  apy30d: number;
  apy90d: number;
  apy1y: number;
  apr7d: number;
  apr30d: number;
  timeSeries: APYTimeSeriesPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  volatility: number; // Standard deviation of APY
}

// ============================================================================
// User Metrics Types
// ============================================================================

export interface UserActivityData {
  protocolId: string;
  date: Date;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
}

export interface UserMetrics {
  protocolId: string;
  timestamp: Date;
  dau: number;
  wau: number;
  mau: number;
  newUsers: number;
  returningUsers: number;
  churnedUsers: number;
  dauWauRatio: number; // Stickiness metric
  wauMauRatio: number;
  stickiness: number; // DAU/MAU ratio
}

export interface CohortData {
  cohortDate: Date;
  cohortSize: number;
  periodNumber: number; // 0 = signup period, 1 = period 1, etc.
  activeUsers: number;
  retentionRate: number;
  avgTransactionValue: number;
  totalVolume: number;
}

export interface RetentionAnalysis {
  protocolId: string;
  cohorts: Array<{
    cohortDate: string;
    cohortSize: number;
    retentionByPeriod: Array<{
      period: number;
      activeUsers: number;
      retentionRate: number;
    }>;
  }>;
  averageRetention: {
    period1: number;
    period3: number;
    period6: number;
    period12: number;
  };
  churnRate: number;
  userGrowthRate: number;
}

// ============================================================================
// Revenue Types
// ============================================================================

export interface RevenueData {
  protocolId: string;
  timestamp: Date;
  totalRevenue: number;
  tradingFees: number;
  withdrawalFees: number;
  performanceFees: number;
  otherFees: number;
}

export interface RevenueMetrics {
  protocolId: string;
  timeRange: string;
  revenue: {
    total: number;
    trend: number; // % change
    history: Array<{
      timestamp: string;
      total: number;
      tradingFees: number;
      withdrawalFees: number;
      performanceFees: number;
    }>;
  };
  revenuePerUser: number;
  revenuePerTVL: number; // Revenue efficiency
  feeBreakdown: {
    tradingFees: number;
    withdrawalFees: number;
    performanceFees: number;
    other: number;
  };
  projections: {
    next7d: number;
    next30d: number;
    confidence: number; // 0-1
  };
}

export interface RevenueAnalysis {
  protocolId: string;
  daily: RevenueMetrics;
  weekly: RevenueMetrics;
  monthly: RevenueMetrics;
  growthRate: number;
  seasonality: {
    dayOfWeek: number[]; // Average revenue by day of week
    monthOfYear: number[]; // Average revenue by month
  };
}

// ============================================================================
// Benchmark Types
// ============================================================================

export interface ProtocolMetrics {
  protocolId: string;
  protocolName: string;
  tvl: number;
  volume24h: number;
  users: number;
  revenue: number;
  apy: number;
  marketCap?: number;
}

export interface RankedMetric {
  value: number;
  rank: number;
  change: number; // % change from previous period
  percentile: number; // 0-100
}

export interface BenchmarkResult {
  protocolId: string;
  protocolName: string;
  metrics: {
    tvl: RankedMetric;
    volume: RankedMetric;
    users: RankedMetric;
    revenue: RankedMetric;
    apy: RankedMetric;
  };
  overallScore: number; // Composite score 0-100
  category: string; // e.g., 'DEX', 'Lending', 'Yield'
}

export interface MarketShareAnalysis {
  totalMarket: {
    tvl: number;
    volume: number;
    users: number;
    revenue: number;
  };
  protocols: Array<{
    protocolId: string;
    protocolName: string;
    marketShare: {
      tvl: number; // %
      volume: number; // %
      users: number; // %
      revenue: number; // %
    };
  }>;
  concentration: {
    herfindahlIndex: number; // Market concentration index
    top3Share: number; // % of market held by top 3
    top5Share: number; // % of market held by top 5
  };
}

export interface CompetitiveAnalysis {
  protocols: BenchmarkResult[];
  marketShare: MarketShareAnalysis;
  trends: {
    tvlLeaders: string[];
    volumeLeaders: string[];
    userLeaders: string[];
    revenueLeaders: string[];
    fastestGrowing: string[];
  };
}

// ============================================================================
// Common Types
// ============================================================================

export interface TimeRange {
  start: Date;
  end: Date;
  label: '7d' | '30d' | '90d' | '1y' | 'custom';
}

export interface CalculationOptions {
  timeRange?: TimeRange;
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  includeProjections?: boolean;
  includeTrends?: boolean;
}

export interface EngineError {
  code: string;
  message: string;
  protocolId?: string;
  timestamp: Date;
  details?: any;
}

export interface CalculationResult<T> {
  success: boolean;
  data?: T;
  error?: EngineError;
  calculatedAt: Date;
  executionTimeMs: number;
}

// ============================================================================
// Statistical Helper Types
// ============================================================================

export interface StatisticalMetrics {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentile25: number;
  percentile75: number;
  percentile95: number;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number; // Linear regression slope
  rSquared: number; // Goodness of fit
  confidence: number; // 0-1
}

