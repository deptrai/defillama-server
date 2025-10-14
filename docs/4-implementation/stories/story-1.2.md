# Story 1.2: Real-time Event Processor

Status: Draft

## Story

As a **DeFi researcher, trader, or protocol team member**,
I want **the system to automatically detect and process data changes in real-time**,
so that **I receive immediate notifications of TVL changes, price movements, and protocol updates without delays**.

## Acceptance Criteria

1. **Database Change Detection**
   - PostgreSQL triggers detect TVL, price, and protocol data changes
   - Change detection threshold configurable (default: 1% for TVL, 0.1% for prices)
   - Only significant changes trigger event processing
   - Change detection latency <10ms from database update

2. **Event Generation and Processing**
   - Generate structured events for TVL changes, price changes, protocol updates
   - Event payload includes previous/current values and change percentages
   - Event metadata includes source, confidence score, and timestamps
   - Event processing completes within 50ms of detection

3. **Redis Cache Updates**
   - Real-time data synchronized to Redis for fast lookups
   - Cache updates atomic with event generation
   - Cache TTL management for hot data (1 hour default)
   - Cache hit ratio >90% for frequently accessed data

4. **Event Distribution**
   - Events published to Redis pub/sub for WebSocket distribution
   - Events queued in SQS for alert processing
   - Failed event delivery handled with retry logic
   - Event ordering preserved for same protocol/chain

5. **Performance and Reliability**
   - Process 1,000+ events per second during peak traffic
   - Event processing latency <100ms end-to-end
   - Graceful degradation when downstream services fail
   - Dead letter queue for failed event processing

## Tasks / Subtasks

- [ ] **Task 1: Database Trigger Setup** (AC: 1)
  - [ ] Create PostgreSQL triggers for TVL table changes
  - [ ] Create triggers for price data changes
  - [ ] Create triggers for protocol metadata updates
  - [ ] Implement change threshold logic in triggers
  - [ ] Add trigger performance monitoring

- [ ] **Task 2: Event Processing Lambda** (AC: 2)
  - [ ] Create Lambda function for DynamoDB stream processing
  - [ ] Implement event generation logic for different change types
  - [ ] Add event payload validation and formatting
  - [ ] Create event metadata enrichment
  - [ ] Add error handling and logging

- [ ] **Task 3: Redis Cache Management** (AC: 3)
  - [ ] Implement Redis cache update operations
  - [ ] Create cache key management strategy
  - [ ] Add cache TTL and eviction policies
  - [ ] Implement atomic cache operations
  - [ ] Add cache performance monitoring

- [ ] **Task 4: Event Distribution System** (AC: 4)
  - [ ] Implement Redis pub/sub publishing
  - [ ] Create SQS message queuing for alerts
  - [ ] Add event routing logic by type/protocol
  - [ ] Implement retry mechanism for failed deliveries
  - [ ] Add event ordering guarantees

- [ ] **Task 5: Performance Optimization** (AC: 5)
  - [ ] Implement batch processing for high-volume events
  - [ ] Add circuit breaker pattern for downstream failures
  - [ ] Create dead letter queue handling
  - [ ] Add performance metrics and monitoring
  - [ ] Implement graceful degradation strategies

- [ ] **Task 6: Testing and Validation** (AC: 1-5)
  - [ ] Unit tests for event processing logic
  - [ ] Integration tests for database triggers
  - [ ] Load testing with 1,000+ events per second
  - [ ] End-to-end testing of event flow
  - [ ] Performance testing for latency requirements

## Dev Notes

### Architecture Patterns and Constraints

- **Event-driven Architecture**: Use DynamoDB streams for change detection
- **Lambda Processing**: Serverless event processing for auto-scaling
- **Redis Pub/Sub**: Real-time message distribution to WebSocket clients
- **SQS Integration**: Reliable message queuing for alert processing

### Source Tree Components to Touch

- `src/events/` - New directory for event processing components
- `src/events/event-processor.ts` - Main event processing Lambda
- `src/events/change-detector.ts` - Database change detection logic
- `src/events/event-generator.ts` - Event payload generation
- `src/redis/cache-manager.ts` - Redis cache operations
- `database/triggers/` - PostgreSQL trigger definitions
- `infrastructure/` - CDK updates for Lambda and SQS

### Testing Standards Summary

- **Unit Testing**: Jest with 90% coverage for event processing logic
- **Integration Testing**: Database triggers, Redis operations, SQS messaging
- **Load Testing**: Artillery.io for high-volume event processing
- **Performance Testing**: Latency measurement for end-to-end event flow

### Project Structure Notes

- Event processing follows existing Lambda function patterns
- Redis integration extends existing caching infrastructure
- Database triggers follow existing schema management practices
- SQS integration aligns with existing message queue patterns

### References

- [Source: docs/tech-spec-epic-realtime-analytics-v1.md#2.1] - Real-time Event Processor responsibilities
- [Source: docs/tech-spec-epic-realtime-analytics-v1.md#2.4.1] - Real-time Data Flow Sequence
- [Source: docs/tech-spec-epic-realtime-analytics-v1.md#4.1.2] - Event Processing Implementation
- [Source: docs/tech-spec-epic-realtime-analytics-v1.md#7.1.1] - Performance acceptance criteria
- [Source: docs/solution-architecture.md#2.2] - Component Interaction Flow
- [Source: docs/product-brief-defillama-realtime-2025-10-13.md#1] - Real-time streaming requirements

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Sonnet 4 (Augment Agent)

### Debug Log References

### Completion Notes List

### File List
