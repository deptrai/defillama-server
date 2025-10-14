# Real-time Event Processor

**Story 1.2**: Real-time Event Processor for DeFiLlama

## Overview

The Real-time Event Processor is a scheduled Lambda function that detects significant changes in TVL and price data, generates structured events, updates Redis cache, and distributes events to WebSocket clients via Redis pub/sub and SQS queues.

## Architecture

```
prod-event-table (DynamoDB)
        ↓ (query every 1 minute)
Event Processor Lambda
        ↓
├─ Get previous values from Redis
├─ Calculate change percentages
├─ Apply threshold filters
├─ Generate structured events
├─ Update Redis cache
├─ Publish to Redis pub/sub → WebSocket clients
└─ Send to SQS → Alert processing
```

## Components

### 1. Event Types (`event-types.ts`)
- **BaseEvent**: Common event structure
- **PriceUpdateEvent**: Price change events
- **TvlChangeEvent**: TVL change events
- **ProtocolUpdateEvent**: Protocol metadata updates
- **DynamoDBEventRecord**: Raw DynamoDB event structure
- **DetectedChange**: Intermediate change detection structure

### 2. Change Detector (`change-detector.ts`)
- Detects change type (TVL, price, protocol)
- Extracts protocol/token IDs
- Calculates change percentages and absolute values
- Applies threshold filters
- Validates records
- Batch processing support

**Thresholds**:
- TVL: 1% change OR $10,000 absolute
- Price: 0.1% change OR $0.01 absolute
- Protocol: Always trigger

### 3. Event Generator (`event-generator.ts`)
- Generates structured events from detected changes
- Calculates confidence scores
- Generates correlation IDs
- Creates routing tags
- Validates generated events
- Batch generation support

### 4. Event Processor (`event-processor.ts`)
- Main Lambda handler
- Queries recent events from DynamoDB
- Orchestrates change detection and event generation
- Updates Redis cache
- Publishes to Redis pub/sub
- Sends to SQS queues
- Tracks processing metrics

### 5. Redis Cache Manager (`redis/cache-manager.ts`)
- Manages Redis connections
- Stores previous values for change detection
- Updates cache with new values
- Handles price and TVL cache structures
- Event deduplication
- Last processed timestamp tracking

**Cache Keys**:
```
price:{tokenId}              → Latest price (1h TTL)
tvl:{protocolId}             → Latest TVL (1h TTL)
tvl:{protocolId}:{chain}     → Chain-specific TVL (1h TTL)
protocol:{protocolId}:meta   → Protocol metadata (1 week TTL)
event:{eventId}              → Event deduplication (5 min TTL)
cache:{pk}                   → Change detection values (1h TTL)
```

### 6. Redis Publisher (`distribution/redis-publisher.ts`)
- Publishes events to Redis pub/sub channels
- General channels: `events:prices`, `events:tvl`, `events:protocols`
- Specific channels: `events:token:{tokenId}`, `events:protocol:{protocolId}`, `events:chain:{chain}:prices`
- Retry logic with exponential backoff
- Channel statistics

### 7. SQS Publisher (`distribution/sqs-publisher.ts`)
- Publishes high-priority events to SQS
- Priority levels: high, medium, low
- Batch publishing (up to 10 messages)
- Retry logic with exponential backoff
- Dead letter queue support

## Configuration

### Environment Variables

```bash
# Redis
REDIS_URL=redis://localhost:6379

# SQS
EVENTS_QUEUE_URL=https://sqs.eu-central-1.amazonaws.com/.../events-queue
EVENTS_DLQ_URL=https://sqs.eu-central-1.amazonaws.com/.../events-dlq

# Processing
BATCH_SIZE=100
MAX_RETRIES=3
ENABLE_CACHING=true
ENABLE_PUBSUB=true
ENABLE_SQS=true

# AWS
AWS_REGION=eu-central-1
```

### Threshold Configuration

```typescript
const config: ThresholdConfig = {
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
```

## Deployment

### Prerequisites
- Node.js 18+
- AWS CLI configured
- Serverless Framework
- Redis instance
- DynamoDB table: `prod-event-table`

### Deploy

```bash
# Install dependencies
cd defi
pnpm install

# Deploy to AWS
pnpm run deploy

# Deploy to specific stage
pnpm run deploy -- --stage prod
```

### Local Testing

```bash
# Run event processor locally
cd defi
node -r esbuild-register src/events/event-processor.ts

# Or use ts-node
ts-node src/events/event-processor.ts
```

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/events/tests/change-detector.test.ts

# Run with coverage
pnpm test --coverage
```

### Integration Tests

```bash
# Run integration tests
pnpm test src/events/tests/integration.test.ts
```

## Monitoring

### CloudWatch Metrics
- **Invocations**: Lambda invocation count
- **Errors**: Error count
- **Duration**: Execution time
- **Throttles**: Throttle count

### CloudWatch Alarms
- **EventProcessorErrorAlarm**: Triggers when errors > 5 in 5 minutes
- **EventProcessorDurationAlarm**: Triggers when duration > 60 seconds
- **EventsQueueDepthAlarm**: Triggers when queue depth > 1000
- **EventsDLQDepthAlarm**: Triggers when DLQ has messages

### Custom Metrics
```typescript
{
  processedCount: number;      // Total records processed
  errorCount: number;          // Errors encountered
  processingTime: number;      // Total processing time (ms)
  eventsGenerated: number;     // Events generated
  cacheUpdates: number;        // Cache updates performed
  pubsubPublished: number;     // Events published to Redis
  sqsPublished: number;        // Events sent to SQS
}
```

## Performance

### Targets
- **Change detection latency**: <10ms per record
- **Event processing**: <50ms per event
- **End-to-end latency**: <100ms
- **Throughput**: 1,000+ events/second

### Optimization
- Batch processing (100 records per batch)
- Redis pipelining for cache operations
- SQS batch sending (10 messages per batch)
- Parallel processing where possible
- Connection pooling

## Error Handling

### Retry Strategy
- **Redis**: 3 retries with exponential backoff
- **SQS**: 3 retries with exponential backoff
- **DynamoDB**: AWS SDK default retry

### Dead Letter Queue
Failed events are sent to DLQ for manual inspection:
```typescript
{
  event: BaseEvent;
  error: {
    message: string;
    stack: string;
  };
  timestamp: number;
}
```

## Redis Pub/Sub Channels

### General Channels
- `events:prices` - All price updates
- `events:tvl` - All TVL changes
- `events:protocols` - All protocol updates
- `events:alerts` - All alerts

### Specific Channels
- `events:token:{tokenId}` - Token-specific events
- `events:protocol:{protocolId}` - Protocol-specific events
- `events:chain:{chain}:prices` - Chain-specific price events
- `events:chain:{chain}:tvl` - Chain-specific TVL events

## WebSocket Integration

The MessageRouter in Story 1.1 subscribes to Redis pub/sub channels and routes events to WebSocket clients based on their subscriptions.

```typescript
// Client subscribes to specific protocol
{
  action: 'subscribe',
  channel: 'events:protocol:uniswap-v3'
}

// Client receives events
{
  eventType: 'tvl_change',
  data: {
    protocolId: 'uniswap-v3',
    currentTvl: 1100000000,
    changePercent: 10
  }
}
```

## Troubleshooting

### No events generated
- Check DynamoDB table has recent data
- Verify threshold configuration
- Check Redis connection
- Review CloudWatch logs

### High latency
- Check Redis connection latency
- Review batch size configuration
- Check DynamoDB query performance
- Monitor Lambda cold starts

### Events not reaching WebSocket clients
- Verify Redis pub/sub is working
- Check MessageRouter is subscribed
- Review WebSocket connection status
- Check channel names match

## Future Enhancements

1. **DynamoDB Streams**: Enable streams on `prod-event-table` for real-time processing
2. **Inline Publishing**: Modify `putEventData()` to publish directly to Redis
3. **Advanced Filtering**: ML-based anomaly detection
4. **Event Replay**: Ability to replay events from DynamoDB
5. **Multi-region**: Support for multi-region deployments

