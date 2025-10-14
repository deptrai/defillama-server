# ADR-002: Real-time Data Pipeline Architecture

**Status**: Approved  
**Date**: October 14, 2025  
**Architect**: Luis  
**Epic**: On-Chain Services Platform (on-chain-services-v1)  

---

## 🎯 **Context**

DeFiLlama needs to process real-time blockchain data from 100+ chains, calculate metrics for 3000+ protocols, and deliver updates to users within 100ms. The system must handle high-frequency data changes while maintaining data consistency and reliability.

## 🤔 **Decision**

We will implement an **event-driven data pipeline** using PostgreSQL triggers, AWS SQS/SNS messaging, Lambda processors, and Redis caching to achieve real-time data processing and distribution.

## 📊 **Options Considered**

### Option 1: Event-Driven Pipeline with PostgreSQL Triggers (CHOSEN)
**Pros:**
- Leverages existing PostgreSQL infrastructure
- ACID compliance for data consistency
- Built-in change detection via triggers
- Reliable message delivery with SQS
- Cost-effective serverless processing

**Cons:**
- Database load from trigger execution
- Potential bottleneck at database level
- Complex trigger management

### Option 2: Change Data Capture (CDC) with Debezium
**Pros:**
- Minimal database performance impact
- Rich change event metadata
- Proven at enterprise scale
- Multiple output formats

**Cons:**
- Additional infrastructure complexity
- Kafka dependency for reliable streaming
- Higher operational overhead
- Learning curve for team

### Option 3: Application-Level Change Detection
**Pros:**
- Full control over change detection logic
- No database trigger overhead
- Flexible change event formats
- Easy to test and debug

**Cons:**
- Risk of missing changes during failures
- Requires application-level coordination
- Potential data consistency issues
- Higher development complexity

## 🏗️ **Architecture Design**

### High-Level Data Flow
```
Blockchain Data → PostgreSQL → Triggers → SQS → Lambda Processors → 
Redis Cache → WebSocket/API → Users
```

### Detailed Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Blockchain    │    │   PostgreSQL     │    │   SQS Queues    │
│   Data Sources  │───▶│   Database       │───▶│   (Events)      │
│                 │    │   + Triggers     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   Redis Cache    │    │   Lambda        │
│   Clients       │◀───│   (Pub/Sub)      │◀───│   Processors    │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔧 **Implementation Details**

### 1. PostgreSQL Trigger System

#### Protocol TVL Change Trigger
```sql
-- Trigger function for TVL changes
CREATE OR REPLACE FUNCTION notify_tvl_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for significant changes (>1% or >$10k)
  IF (ABS(NEW.tvl - OLD.tvl) / OLD.tvl > 0.01) 
     OR (ABS(NEW.tvl - OLD.tvl) > 10000) THEN
    
    PERFORM aws_lambda.invoke(
      'arn:aws:lambda:us-east-1:account:function:process-tvl-change',
      json_build_object(
        'event_type', 'tvl_change',
        'protocol_id', NEW.id,
        'old_tvl', OLD.tvl,
        'new_tvl', NEW.tvl,
        'change_percent', (NEW.tvl - OLD.tvl) / OLD.tvl,
        'timestamp', extract(epoch from NOW())
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to protocols table
CREATE TRIGGER tvl_change_trigger
  AFTER UPDATE OF tvl ON protocols
  FOR EACH ROW
  EXECUTE FUNCTION notify_tvl_change();
```

#### Price Change Trigger
```sql
-- Trigger function for price changes
CREATE OR REPLACE FUNCTION notify_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger for price changes >0.5%
  IF ABS(NEW.price - OLD.price) / OLD.price > 0.005 THEN
    
    PERFORM aws_lambda.invoke(
      'arn:aws:lambda:us-east-1:account:function:process-price-change',
      json_build_object(
        'event_type', 'price_change',
        'token_id', NEW.token_id,
        'old_price', OLD.price,
        'new_price', NEW.price,
        'change_percent', (NEW.price - OLD.price) / OLD.price,
        'timestamp', extract(epoch from NOW())
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Event Processing Lambda Functions

#### TVL Change Processor
```typescript
import { SQSHandler } from 'aws-lambda';
import { Redis } from 'ioredis';
import { SNS } from 'aws-sdk';

interface TVLChangeEvent {
  event_type: 'tvl_change';
  protocol_id: string;
  old_tvl: number;
  new_tvl: number;
  change_percent: number;
  timestamp: number;
}

export const processTVLChange: SQSHandler = async (event) => {
  const redis = new Redis(process.env.REDIS_ENDPOINT);
  const sns = new SNS();
  
  for (const record of event.Records) {
    const changeEvent: TVLChangeEvent = JSON.parse(record.body);
    
    // Update Redis cache
    await redis.hset(
      `protocol:${changeEvent.protocol_id}`,
      'tvl', changeEvent.new_tvl,
      'last_updated', changeEvent.timestamp
    );
    
    // Calculate additional metrics
    const metrics = await calculateProtocolMetrics(changeEvent.protocol_id);
    
    // Publish to WebSocket subscribers
    await redis.publish('channel:tvl:updates', JSON.stringify({
      protocolId: changeEvent.protocol_id,
      tvl: changeEvent.new_tvl,
      change24h: changeEvent.change_percent,
      metrics,
      timestamp: changeEvent.timestamp
    }));
    
    // Check alert conditions
    await checkAlertConditions(changeEvent);
  }
};
```

#### Price Change Processor
```typescript
export const processPriceChange: SQSHandler = async (event) => {
  const redis = new Redis(process.env.REDIS_ENDPOINT);
  
  for (const record of event.Records) {
    const changeEvent: PriceChangeEvent = JSON.parse(record.body);
    
    // Update price cache
    await redis.hset(
      `token:${changeEvent.token_id}`,
      'price', changeEvent.new_price,
      'change_24h', changeEvent.change_percent,
      'last_updated', changeEvent.timestamp
    );
    
    // Update price history for charts
    await redis.zadd(
      `price_history:${changeEvent.token_id}`,
      changeEvent.timestamp,
      changeEvent.new_price
    );
    
    // Publish to subscribers
    await redis.publish('channel:price:updates', JSON.stringify({
      tokenId: changeEvent.token_id,
      price: changeEvent.new_price,
      change24h: changeEvent.change_percent,
      timestamp: changeEvent.timestamp
    }));
  }
};
```

### 3. Redis Caching Strategy

#### Cache Structure
```typescript
// Protocol data cache
interface ProtocolCache {
  [`protocol:${protocolId}`]: {
    tvl: number;
    volume_24h: number;
    fees_24h: number;
    users_24h: number;
    last_updated: number;
  };
}

// Token price cache
interface TokenCache {
  [`token:${tokenId}`]: {
    price: number;
    change_1h: number;
    change_24h: number;
    change_7d: number;
    volume_24h: number;
    market_cap: number;
    last_updated: number;
  };
}

// Time series data
interface TimeSeriesCache {
  [`price_history:${tokenId}`]: SortedSet<timestamp, price>;
  [`tvl_history:${protocolId}`]: SortedSet<timestamp, tvl>;
  [`volume_history:${protocolId}`]: SortedSet<timestamp, volume>;
}
```

#### Cache Management
```typescript
class CacheManager {
  private redis: Redis;
  
  async updateProtocolMetrics(protocolId: string, metrics: ProtocolMetrics) {
    const pipeline = this.redis.pipeline();
    
    // Update current metrics
    pipeline.hset(`protocol:${protocolId}`, metrics);
    
    // Update time series (keep last 30 days)
    const now = Date.now();
    pipeline.zadd(`tvl_history:${protocolId}`, now, metrics.tvl);
    pipeline.zremrangebyscore(`tvl_history:${protocolId}`, 0, now - (30 * 24 * 60 * 60 * 1000));
    
    // Set expiration (24 hours)
    pipeline.expire(`protocol:${protocolId}`, 86400);
    
    await pipeline.exec();
  }
  
  async getProtocolMetrics(protocolId: string): Promise<ProtocolMetrics | null> {
    const data = await this.redis.hgetall(`protocol:${protocolId}`);
    return data ? this.parseProtocolMetrics(data) : null;
  }
}
```

### 4. Message Queue Configuration

#### SQS Queue Setup
```typescript
// High-priority queue for critical updates
const criticalUpdatesQueue = {
  QueueName: 'defillama-critical-updates',
  Attributes: {
    VisibilityTimeoutSeconds: '30',
    MessageRetentionPeriod: '1209600', // 14 days
    ReceiveMessageWaitTimeSeconds: '20', // Long polling
    RedrivePolicy: JSON.stringify({
      deadLetterTargetArn: 'arn:aws:sqs:region:account:dlq',
      maxReceiveCount: 3
    })
  }
};

// Standard queue for regular updates
const standardUpdatesQueue = {
  QueueName: 'defillama-standard-updates',
  Attributes: {
    VisibilityTimeoutSeconds: '60',
    MessageRetentionPeriod: '1209600',
    ReceiveMessageWaitTimeSeconds: '20'
  }
};
```

#### Message Routing Logic
```typescript
const routeMessage = (eventType: string, changePercent: number) => {
  // Critical updates (>10% change or major events)
  if (changePercent > 0.1 || ['security_incident', 'protocol_hack'].includes(eventType)) {
    return 'critical-updates';
  }
  
  // Standard updates
  return 'standard-updates';
};
```

## 📈 **Performance Optimizations**

### Database Optimizations
```sql
-- Indexes for trigger performance
CREATE INDEX CONCURRENTLY idx_protocols_tvl_updated 
ON protocols (updated_at, tvl) WHERE tvl > 0;

CREATE INDEX CONCURRENTLY idx_token_prices_updated 
ON token_prices (updated_at, price) WHERE price > 0;

-- Partitioning for large tables
CREATE TABLE protocol_metrics_2025_10 PARTITION OF protocol_metrics
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

### Lambda Optimizations
```typescript
// Connection pooling for database
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis connection reuse
let redisClient: Redis;
const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_ENDPOINT, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
  }
  return redisClient;
};
```

### Batch Processing
```typescript
// Batch similar events to reduce processing overhead
const batchProcessor = {
  batchSize: 100,
  batchTimeout: 5000, // 5 seconds
  
  async processBatch(events: ChangeEvent[]) {
    // Group events by type
    const eventGroups = groupBy(events, 'event_type');
    
    // Process each group
    await Promise.all(
      Object.entries(eventGroups).map(([type, events]) =>
        this.processEventGroup(type, events)
      )
    );
  }
};
```

## 🔒 **Data Consistency & Reliability**

### Transaction Management
```typescript
// Ensure data consistency across updates
const processChangeWithTransaction = async (changeEvent: ChangeEvent) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update primary data
    await client.query(
      'UPDATE protocols SET tvl = $1, updated_at = NOW() WHERE id = $2',
      [changeEvent.new_tvl, changeEvent.protocol_id]
    );
    
    // Update derived metrics
    await client.query(
      'INSERT INTO protocol_metrics (protocol_id, metric_type, value, timestamp) VALUES ($1, $2, $3, $4)',
      [changeEvent.protocol_id, 'tvl_change', changeEvent.change_percent, new Date()]
    );
    
    await client.query('COMMIT');
    
    // Only publish to cache/WebSocket after successful DB update
    await publishToCache(changeEvent);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

### Error Handling & Retry Logic
```typescript
const retryConfig = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelay: 1000
};

const processWithRetry = async (event: ChangeEvent, attempt = 1): Promise<void> => {
  try {
    await processChangeEvent(event);
  } catch (error) {
    if (attempt < retryConfig.maxRetries) {
      const delay = retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return processWithRetry(event, attempt + 1);
    }
    
    // Send to dead letter queue after max retries
    await sendToDeadLetterQueue(event, error);
    throw error;
  }
};
```

## 📊 **Monitoring & Alerting**

### Key Metrics
```typescript
const pipelineMetrics = {
  // Processing metrics
  'Pipeline/EventsPerSecond': 'Events processed per second',
  'Pipeline/ProcessingLatency': 'End-to-end processing time',
  'Pipeline/ErrorRate': 'Processing error percentage',
  
  // Queue metrics
  'SQS/QueueDepth': 'Messages waiting in queue',
  'SQS/ProcessingTime': 'Time to process message',
  'SQS/DeadLetterMessages': 'Messages in DLQ',
  
  // Cache metrics
  'Redis/HitRate': 'Cache hit percentage',
  'Redis/ResponseTime': 'Cache operation latency',
  'Redis/MemoryUsage': 'Redis memory utilization'
};
```

### Alert Conditions
- Processing latency > 5 seconds
- Error rate > 1%
- Queue depth > 1000 messages
- Cache hit rate < 95%
- Dead letter queue messages > 0

## 🎯 **Success Criteria**

### Performance Targets
- **End-to-end latency**: <100ms from database change to WebSocket delivery
- **Throughput**: 10,000+ events per minute
- **Reliability**: 99.9% successful event processing
- **Cache hit rate**: >95% for frequently accessed data

### Business Impact
- **Real-time accuracy**: Data freshness <30 seconds
- **User experience**: Immediate updates for significant changes
- **System efficiency**: <50% increase in infrastructure costs
- **Scalability**: Support 10x current data volume

---

**This ADR establishes a robust, scalable data pipeline that enables DeFiLlama to deliver real-time insights while maintaining data consistency and system reliability.**
