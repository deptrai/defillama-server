# 🔧 Story 1.2: Real-time Event Processor - TECHNICAL SPECIFICATION

**Date**: October 14, 2025  
**Version**: 1.0  
**Status**: 🔵 **DRAFT**

---

## 📋 **TABLE OF CONTENTS**

1. [Event Type Definitions](#event-type-definitions)
2. [Change Detection Logic](#change-detection-logic)
3. [Event Processing Flow](#event-processing-flow)
4. [Redis Cache Strategy](#redis-cache-strategy)
5. [Event Distribution](#event-distribution)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling](#error-handling)
8. [Monitoring & Metrics](#monitoring--metrics)

---

## 1. EVENT TYPE DEFINITIONS

### **1.1 Base Event Structure**

```typescript
interface BaseEvent {
  eventId: string;              // UUID v4
  eventType: EventType;         // Enum: price_update, tvl_change, etc.
  timestamp: number;            // Unix timestamp (ms)
  source: EventSource;          // Enum: dynamodb, postgres, manual
  version: string;              // Event schema version (e.g., "1.0")
  metadata: EventMetadata;
}

interface EventMetadata {
  correlationId: string;        // For tracing related events
  confidence: number;           // 0.0 - 1.0
  processingTime: number;       // Processing latency (ms)
  retryCount: number;           // Number of retries
  tags: string[];               // For filtering/routing
}

enum EventType {
  PRICE_UPDATE = 'price_update',
  TVL_CHANGE = 'tvl_change',
  PROTOCOL_UPDATE = 'protocol_update',
  LIQUIDATION = 'liquidation',
  GOVERNANCE = 'governance',
  EMISSION = 'emission',
  ALERT = 'alert'
}

enum EventSource {
  DYNAMODB_STREAM = 'dynamodb',
  POSTGRES_TRIGGER = 'postgres',
  MANUAL = 'manual',
  SCHEDULED = 'scheduled'
}
```

### **1.2 Price Update Event**

```typescript
interface PriceUpdateEvent extends BaseEvent {
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
```

### **1.3 TVL Change Event**

```typescript
interface TvlChangeEvent extends BaseEvent {
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
```

### **1.4 Protocol Update Event**

```typescript
interface ProtocolUpdateEvent extends BaseEvent {
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

enum ProtocolUpdateType {
  METADATA = 'metadata',        // Name, description, etc.
  CATEGORY = 'category',        // Category change
  CHAIN_ADDED = 'chain_added',  // New chain support
  CHAIN_REMOVED = 'chain_removed',
  STATUS = 'status'             // Active/inactive status
}
```

---

## 2. CHANGE DETECTION LOGIC

### **2.1 DynamoDB Stream Processing**

**Trigger**: DynamoDB Streams on TVL and Price tables

**Stream Configuration**:
```yaml
StreamSpecification:
  StreamEnabled: true
  StreamViewType: NEW_AND_OLD_IMAGES
BatchSize: 100
MaximumBatchingWindowInSeconds: 1
ParallelizationFactor: 10
MaximumRecordAgeInSeconds: 60
MaximumRetryAttempts: 3
BisectBatchOnFunctionError: true
```

**Processing Logic**:
```typescript
async function processDynamoDBStream(event: DynamoDBStreamEvent) {
  const records = event.Records;
  const events: BaseEvent[] = [];

  for (const record of records) {
    // Skip if not MODIFY event
    if (record.eventName !== 'MODIFY') continue;

    const oldImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);
    const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

    // Detect change type
    const changeType = detectChangeType(record.dynamodb.Keys);
    
    // Calculate change percentage
    const changePercent = calculateChangePercent(oldImage, newImage, changeType);

    // Apply threshold filter
    if (!meetsThreshold(changePercent, changeType)) continue;

    // Generate event
    const event = generateEvent(oldImage, newImage, changeType, changePercent);
    events.push(event);
  }

  // Batch process events
  await processEvents(events);
}
```

### **2.2 Threshold Calculation**

```typescript
interface ThresholdConfig {
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

function meetsThreshold(
  changePercent: number,
  changeAbsolute: number,
  changeType: 'tvl' | 'price' | 'protocol',
  config: ThresholdConfig
): boolean {
  const threshold = config[changeType];
  
  if (changeType === 'protocol') {
    return threshold.alwaysTrigger;
  }

  return (
    Math.abs(changePercent) >= threshold.minChangePercent ||
    Math.abs(changeAbsolute) >= threshold.minChangeAbsolute
  );
}
```

### **2.3 Change Type Detection**

```typescript
function detectChangeType(keys: any): 'tvl' | 'price' | 'protocol' {
  const pk = keys.PK.S;
  
  if (pk.startsWith('hourlyTvl#') || pk.startsWith('dailyTvl#')) {
    return 'tvl';
  }
  
  if (pk.startsWith('coingecko#') || pk.includes(':0x')) {
    return 'price';
  }
  
  return 'protocol';
}
```

---

## 3. EVENT PROCESSING FLOW

### **3.1 Event Processor Lambda**

**Handler**: `defi/src/events/event-processor.ts`

```typescript
export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  const startTime = Date.now();
  const processedEvents: BaseEvent[] = [];
  const errors: Error[] = [];

  try {
    // 1. Parse and validate stream records
    const records = parseStreamRecords(event.Records);
    
    // 2. Detect significant changes
    const changes = await detectChanges(records);
    
    // 3. Generate structured events
    for (const change of changes) {
      try {
        const event = await generateEvent(change);
        processedEvents.push(event);
      } catch (error) {
        errors.push(error);
        await logError(error, change);
      }
    }
    
    // 4. Enrich with metadata
    const enrichedEvents = await enrichEvents(processedEvents);
    
    // 5. Update Redis cache (atomic)
    await updateCache(enrichedEvents);
    
    // 6. Distribute events
    await distributeEvents(enrichedEvents);
    
    // 7. Log metrics
    await logMetrics({
      processedCount: processedEvents.length,
      errorCount: errors.length,
      processingTime: Date.now() - startTime
    });
    
  } catch (error) {
    await handleFatalError(error);
    throw error;
  }
}
```

### **3.2 Event Generation**

```typescript
async function generateEvent(
  change: DetectedChange
): Promise<BaseEvent> {
  const eventId = uuidv4();
  const timestamp = Date.now();
  
  let event: BaseEvent;
  
  switch (change.type) {
    case 'price':
      event = {
        eventId,
        eventType: EventType.PRICE_UPDATE,
        timestamp,
        source: EventSource.DYNAMODB_STREAM,
        version: '1.0',
        metadata: {
          correlationId: generateCorrelationId(change),
          confidence: calculateConfidence(change),
          processingTime: 0,
          retryCount: 0,
          tags: ['price', change.chain, change.tokenId]
        },
        data: {
          tokenId: change.tokenId,
          symbol: change.symbol,
          chain: change.chain,
          previousPrice: change.oldValue,
          currentPrice: change.newValue,
          changePercent: change.changePercent,
          changeAbsolute: change.changeAbsolute,
          decimals: change.decimals
        }
      } as PriceUpdateEvent;
      break;
      
    case 'tvl':
      event = {
        eventId,
        eventType: EventType.TVL_CHANGE,
        timestamp,
        source: EventSource.DYNAMODB_STREAM,
        version: '1.0',
        metadata: {
          correlationId: generateCorrelationId(change),
          confidence: calculateConfidence(change),
          processingTime: 0,
          retryCount: 0,
          tags: ['tvl', change.protocolId, change.chain]
        },
        data: {
          protocolId: change.protocolId,
          protocolName: change.protocolName,
          chain: change.chain,
          previousTvl: change.oldValue,
          currentTvl: change.newValue,
          changePercent: change.changePercent,
          changeAbsolute: change.changeAbsolute
        }
      } as TvlChangeEvent;
      break;
      
    default:
      throw new Error(`Unknown change type: ${change.type}`);
  }
  
  return event;
}
```

### **3.3 Metadata Enrichment**

```typescript
async function enrichEvents(events: BaseEvent[]): Promise<BaseEvent[]> {
  return Promise.all(events.map(async (event) => {
    // Add protocol metadata for TVL events
    if (event.eventType === EventType.TVL_CHANGE) {
      const protocol = await getProtocolMetadata(event.data.protocolId);
      event.data.protocolName = protocol.name;
      event.metadata.tags.push(...protocol.categories);
    }
    
    // Add token metadata for price events
    if (event.eventType === EventType.PRICE_UPDATE) {
      const token = await getTokenMetadata(event.data.tokenId);
      event.data.symbol = token.symbol;
      event.data.decimals = token.decimals;
    }
    
    // Calculate confidence score
    event.metadata.confidence = calculateConfidence(event);
    
    // Add correlation ID for related events
    event.metadata.correlationId = generateCorrelationId(event);
    
    return event;
  }));
}
```

---

## 4. REDIS CACHE STRATEGY

### **4.1 Cache Key Structure**

```typescript
// Price cache keys
const PRICE_KEY = (tokenId: string) => `price:${tokenId}`;
const PRICE_HISTORY_KEY = (tokenId: string) => `price:${tokenId}:history`;

// TVL cache keys
const TVL_KEY = (protocolId: string) => `tvl:${protocolId}`;
const TVL_CHAIN_KEY = (protocolId: string, chain: string) => 
  `tvl:${protocolId}:${chain}`;
const TVL_HISTORY_KEY = (protocolId: string) => `tvl:${protocolId}:history`;

// Protocol metadata cache keys
const PROTOCOL_META_KEY = (protocolId: string) => `protocol:${protocolId}:meta`;

// Event cache keys (for deduplication)
const EVENT_KEY = (eventId: string) => `event:${eventId}`;
```

### **4.2 Cache Update Operations**

```typescript
async function updateCache(events: BaseEvent[]): Promise<void> {
  const redis = getRedisClient();
  const pipeline = redis.pipeline();
  
  for (const event of events) {
    switch (event.eventType) {
      case EventType.PRICE_UPDATE:
        const priceKey = PRICE_KEY(event.data.tokenId);
        const priceData = {
          price: event.data.currentPrice,
          symbol: event.data.symbol,
          timestamp: event.timestamp,
          change24h: event.data.changePercent
        };
        
        // Update current price (1 hour TTL)
        pipeline.setex(priceKey, 3600, JSON.stringify(priceData));
        
        // Add to history (24 hour TTL)
        pipeline.zadd(
          PRICE_HISTORY_KEY(event.data.tokenId),
          event.timestamp,
          JSON.stringify(priceData)
        );
        pipeline.expire(PRICE_HISTORY_KEY(event.data.tokenId), 86400);
        break;
        
      case EventType.TVL_CHANGE:
        const tvlKey = TVL_KEY(event.data.protocolId);
        const tvlData = {
          tvl: event.data.currentTvl,
          timestamp: event.timestamp,
          change24h: event.data.changePercent
        };
        
        // Update current TVL (1 hour TTL)
        pipeline.setex(tvlKey, 3600, JSON.stringify(tvlData));
        
        // Update chain-specific TVL if available
        if (event.data.chain) {
          const chainKey = TVL_CHAIN_KEY(event.data.protocolId, event.data.chain);
          pipeline.setex(chainKey, 3600, JSON.stringify(tvlData));
        }
        
        // Add to history (24 hour TTL)
        pipeline.zadd(
          TVL_HISTORY_KEY(event.data.protocolId),
          event.timestamp,
          JSON.stringify(tvlData)
        );
        pipeline.expire(TVL_HISTORY_KEY(event.data.protocolId), 86400);
        break;
    }
    
    // Store event for deduplication (5 min TTL)
    pipeline.setex(EVENT_KEY(event.eventId), 300, '1');
  }
  
  // Execute all operations atomically
  await pipeline.exec();
}
```

### **4.3 TTL Management**

```typescript
interface TTLConfig {
  currentData: number;      // 1 hour (3600s)
  historyData: number;      // 24 hours (86400s)
  eventDedup: number;       // 5 minutes (300s)
  protocolMeta: number;     // 1 week (604800s)
}

const DEFAULT_TTL: TTLConfig = {
  currentData: 3600,
  historyData: 86400,
  eventDedup: 300,
  protocolMeta: 604800
};
```

---

## 5. EVENT DISTRIBUTION

### **5.1 Redis Pub/Sub Publishing**

```typescript
async function publishToRedis(events: BaseEvent[]): Promise<void> {
  const redis = getRedisClient();
  
  for (const event of events) {
    // Publish to general channel
    const generalChannel = `events:${event.eventType}`;
    await redis.publish(generalChannel, JSON.stringify(event));
    
    // Publish to specific channels based on event type
    if (event.eventType === EventType.PRICE_UPDATE) {
      // Token-specific channel
      await redis.publish(
        `events:token:${event.data.tokenId}`,
        JSON.stringify(event)
      );
      
      // Chain-specific channel
      await redis.publish(
        `events:chain:${event.data.chain}:prices`,
        JSON.stringify(event)
      );
    }
    
    if (event.eventType === EventType.TVL_CHANGE) {
      // Protocol-specific channel
      await redis.publish(
        `events:protocol:${event.data.protocolId}`,
        JSON.stringify(event)
      );
      
      // Chain-specific channel (if available)
      if (event.data.chain) {
        await redis.publish(
          `events:chain:${event.data.chain}:tvl`,
          JSON.stringify(event)
        );
      }
    }
  }
}
```

### **5.2 SQS Publishing**

```typescript
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

async function publishToSQS(events: BaseEvent[]): Promise<void> {
  const sqs = new SQSClient({ region: process.env.AWS_REGION });
  const queueUrl = process.env.EVENTS_QUEUE_URL;
  
  // Batch events (max 10 per batch)
  const batches = chunkArray(events, 10);
  
  for (const batch of batches) {
    const entries = batch.map((event, index) => ({
      Id: `${event.eventId}-${index}`,
      MessageBody: JSON.stringify(event),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: event.eventType
        },
        timestamp: {
          DataType: 'Number',
          StringValue: event.timestamp.toString()
        }
      }
    }));
    
    await sqs.send(new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: entries
    }));
  }
}
```

---

## 6. PERFORMANCE OPTIMIZATION

### **6.1 Batch Processing**

```typescript
const BATCH_CONFIG = {
  maxBatchSize: 100,
  maxBatchWaitTime: 1000,  // 1 second
  concurrency: 10
};

async function processBatch(events: BaseEvent[]): Promise<void> {
  // Process in parallel with concurrency limit
  await PromisePool
    .withConcurrency(BATCH_CONFIG.concurrency)
    .for(events)
    .process(async (event) => {
      await processEvent(event);
    });
}
```

### **6.2 Connection Pooling**

```typescript
// Redis connection pool
const redisPool = new Redis.Cluster([
  { host: process.env.REDIS_HOST, port: 6379 }
], {
  redisOptions: {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true
  },
  clusterRetryStrategy: (times) => Math.min(times * 100, 2000)
});
```

---

## 7. ERROR HANDLING

### **7.1 Retry Strategy**

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelay: 100
};

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    const delay = RETRY_CONFIG.initialDelay * 
      Math.pow(RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxRetries - retries);
    
    await sleep(delay);
    return retryWithBackoff(fn, retries - 1);
  }
}
```

### **7.2 Dead Letter Queue**

```typescript
async function handleFailedEvent(event: BaseEvent, error: Error): Promise<void> {
  const dlqUrl = process.env.EVENTS_DLQ_URL;
  const sqs = new SQSClient({ region: process.env.AWS_REGION });
  
  await sqs.send(new SendMessageCommand({
    QueueUrl: dlqUrl,
    MessageBody: JSON.stringify({
      event,
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: Date.now()
    })
  }));
}
```

---

## 8. MONITORING & METRICS

### **8.1 CloudWatch Metrics**

```typescript
async function logMetrics(metrics: ProcessingMetrics): Promise<void> {
  const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION });
  
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'DeFiLlama/Events',
    MetricData: [
      {
        MetricName: 'EventsProcessed',
        Value: metrics.processedCount,
        Unit: 'Count',
        Timestamp: new Date()
      },
      {
        MetricName: 'ProcessingLatency',
        Value: metrics.processingTime,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      },
      {
        MetricName: 'ErrorRate',
        Value: metrics.errorCount / metrics.processedCount,
        Unit: 'Percent',
        Timestamp: new Date()
      }
    ]
  }));
}
```

---

**End of Technical Specification**
