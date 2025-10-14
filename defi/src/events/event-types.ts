/**
 * Event Type Definitions for Real-time Event Processor
 * Story 1.2: Real-time Event Processor
 */

// ============================================================================
// Base Event Structures
// ============================================================================

export interface BaseEvent {
  eventId: string;              // UUID v4
  eventType: EventType;         // Enum: price_update, tvl_change, etc.
  timestamp: number;            // Unix timestamp (ms)
  source: EventSource;          // Enum: dynamodb, postgres, manual
  version: string;              // Event schema version (e.g., "1.0")
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlationId: string;        // For tracing related events
  confidence: number;           // 0.0 - 1.0
  processingTime: number;       // Processing latency (ms)
  retryCount: number;           // Number of retries
  tags: string[];               // For filtering/routing
}

// ============================================================================
// Enums
// ============================================================================

export enum EventType {
  PRICE_UPDATE = 'price_update',
  TVL_CHANGE = 'tvl_change',
  PROTOCOL_UPDATE = 'protocol_update',
  LIQUIDATION = 'liquidation',
  GOVERNANCE = 'governance',
  EMISSION = 'emission',
  ALERT = 'alert'
}

export enum EventSource {
  DYNAMODB_STREAM = 'dynamodb',
  POSTGRES_TRIGGER = 'postgres',
  MANUAL = 'manual',
  SCHEDULED = 'scheduled'
}

// ============================================================================
// Specific Event Types
// ============================================================================

export interface PriceUpdateEvent extends BaseEvent {
  eventType: EventType.PRICE_UPDATE;
  data: {
    tokenId: string;            // e.g., "ethereum:0x..."
    symbol: string;             // e.g., "ETH"
    chain: string;              // e.g., "ethereum"
    previousPrice: number;      // USD price before change
    currentPrice: number;       // USD price after change
    changePercent: number;      // Percentage change
    changeAbsolute: number;     // Absolute change in USD
    volume24h?: number;         // 24h trading volume
    marketCap?: number;         // Market capitalization
    decimals: number;           // Token decimals
  };
}

export interface TvlChangeEvent extends BaseEvent {
  eventType: EventType.TVL_CHANGE;
  data: {
    protocolId: string;         // e.g., "uniswap-v3"
    protocolName: string;       // e.g., "Uniswap V3"
    chain?: string;             // Optional: specific chain
    previousTvl: number;        // TVL before change (USD)
    currentTvl: number;         // TVL after change (USD)
    changePercent: number;      // Percentage change
    changeAbsolute: number;     // Absolute change in USD
    breakdown?: {               // Optional: TVL breakdown
      [chain: string]: number;
    };
    tokens?: {                  // Optional: Top tokens
      [tokenId: string]: number;
    };
  };
}

export interface ProtocolUpdateEvent extends BaseEvent {
  eventType: EventType.PROTOCOL_UPDATE;
  data: {
    protocolId: string;
    protocolName: string;
    updateType: ProtocolUpdateType;
    changes: {
      field: string;
      previousValue: any;
      currentValue: any;
    }[];
  };
}

export enum ProtocolUpdateType {
  METADATA = 'metadata',        // Name, description, etc.
  CATEGORY = 'category',        // Category change
  CHAIN_ADDED = 'chain_added',  // New chain support
  CHAIN_REMOVED = 'chain_removed',
  STATUS = 'status'             // Active/inactive status
}

// ============================================================================
// DynamoDB Event Record (from prod-event-table)
// ============================================================================

export interface DynamoDBEventRecord {
  PK: string;                   // e.g., "hourlyTvl#uniswap-v3"
  SK: number;                   // Unix timestamp
  SK_ORIGNAL?: number;          // Original SK before modification
  source: string;               // e.g., "tvl-adapter", "dimension-adapter"
  [key: string]: any;           // Additional data fields
}

// ============================================================================
// Change Detection
// ============================================================================

export interface DetectedChange {
  type: 'tvl' | 'price' | 'protocol';
  pk: string;
  protocolId?: string;
  protocolName?: string;
  tokenId?: string;
  symbol?: string;
  chain?: string;
  oldValue: number;
  newValue: number;
  changePercent: number;
  changeAbsolute: number;
  timestamp: number;
  decimals?: number;
  rawData: any;
}

export interface ThresholdConfig {
  tvl: {
    minChangePercent: number;   // Default: 1.0 (1%)
    minChangeAbsolute: number;  // Default: 10000 (USD)
  };
  price: {
    minChangePercent: number;   // Default: 0.1 (0.1%)
    minChangeAbsolute: number;  // Default: 0.01 (USD)
  };
  protocol: {
    alwaysTrigger: boolean;     // Default: true
  };
}

// ============================================================================
// Redis Cache Structures
// ============================================================================

export interface CachedPriceData {
  price: number;
  symbol: string;
  timestamp: number;
  change24h?: number;
  volume24h?: number;
  marketCap?: number;
}

export interface CachedTvlData {
  tvl: number;
  timestamp: number;
  change24h?: number;
  breakdown?: {
    [chain: string]: number;
  };
}

// ============================================================================
// Event Processing
// ============================================================================

export interface ProcessingMetrics {
  processedCount: number;
  errorCount: number;
  processingTime: number;
  eventsGenerated: number;
  cacheUpdates: number;
  pubsubPublished: number;
  sqsPublished: number;
}

export interface EventProcessorConfig {
  thresholds: ThresholdConfig;
  batchSize: number;
  maxRetries: number;
  redisUrl: string;
  sqsQueueUrl: string;
  enableCaching: boolean;
  enablePubSub: boolean;
  enableSQS: boolean;
}

// ============================================================================
// SQS Message
// ============================================================================

export interface SQSEventMessage {
  event: BaseEvent;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  timestamp: number;
}

// ============================================================================
// Redis Pub/Sub Channels
// ============================================================================

export const REDIS_CHANNELS = {
  // General channels
  PRICES: 'events:prices',
  TVL: 'events:tvl',
  PROTOCOLS: 'events:protocols',
  ALERTS: 'events:alerts',
  
  // Specific channels (functions)
  TOKEN: (tokenId: string) => `events:token:${tokenId}`,
  PROTOCOL: (protocolId: string) => `events:protocol:${protocolId}`,
  CHAIN_PRICES: (chain: string) => `events:chain:${chain}:prices`,
  CHAIN_TVL: (chain: string) => `events:chain:${chain}:tvl`,
} as const;

// ============================================================================
// Redis Cache Keys
// ============================================================================

export const CACHE_KEYS = {
  PRICE: (tokenId: string) => `price:${tokenId}`,
  PRICE_HISTORY: (tokenId: string) => `price:${tokenId}:history`,
  TVL: (protocolId: string) => `tvl:${protocolId}`,
  TVL_CHAIN: (protocolId: string, chain: string) => `tvl:${protocolId}:${chain}`,
  TVL_HISTORY: (protocolId: string) => `tvl:${protocolId}:history`,
  PROTOCOL_META: (protocolId: string) => `protocol:${protocolId}:meta`,
  EVENT_DEDUP: (eventId: string) => `event:${eventId}`,
  LAST_PROCESSED: 'events:last_processed_timestamp',
} as const;

// ============================================================================
// TTL Configuration
// ============================================================================

export const TTL_CONFIG = {
  CURRENT_DATA: 3600,           // 1 hour
  HISTORY_DATA: 86400,          // 24 hours
  EVENT_DEDUP: 300,             // 5 minutes
  PROTOCOL_META: 604800,        // 1 week
} as const;

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  tvl: {
    minChangePercent: 1.0,      // 1%
    minChangeAbsolute: 10000,   // $10,000
  },
  price: {
    minChangePercent: 0.1,      // 0.1%
    minChangeAbsolute: 0.01,    // $0.01
  },
  protocol: {
    alwaysTrigger: true,
  },
};

export const DEFAULT_EVENT_PROCESSOR_CONFIG: Partial<EventProcessorConfig> = {
  thresholds: DEFAULT_THRESHOLD_CONFIG,
  batchSize: 100,
  maxRetries: 3,
  enableCaching: true,
  enablePubSub: true,
  enableSQS: true,
};

