# 📋 Story 1.2: Real-time Event Processor - IMPLEMENTATION PLAN

**Date**: October 14, 2025  
**Status**: 🔵 **PLANNING PHASE**  
**Dependencies**: ✅ Story 1.1 Complete

---

## 🎯 **STORY OVERVIEW**

**Goal**: Automatically detect and process data changes in real-time, broadcasting TVL changes, price movements, and protocol updates to WebSocket clients without delays.

**Key Requirements**:
- Database change detection (<10ms latency)
- Event generation and processing (<50ms)
- Redis cache updates (atomic)
- Event distribution (Redis pub/sub + SQS)
- Performance: 1,000+ events/sec, <100ms end-to-end

---

## 📊 **CURRENT STATE ANALYSIS**

### ✅ **Existing Infrastructure (Can Reuse)**

#### **1. Price Data System**
**Location**: `coins/src/updateCoin.ts`, `defi/src/storeTvlInterval/computeTVL.ts`

**Current Flow**:
```
CoinGecko API → updateCoin.ts → DynamoDB (coins table)
                                ↓
                         coins.llama.fi API
                                ↓
                    defi adapters fetch prices
```

**Key Functions**:
- `updateCoin()` - Fetches and stores price data
- `computeTVL()` - Calculates TVL using price data
- `getPrices()` - Fetches prices from coins.llama.fi

**Reusable Components**:
- ✅ Price fetching logic
- ✅ CoinGecko integration
- ✅ DynamoDB storage structure
- ✅ Price confidence scoring

#### **2. TVL Storage System**
**Location**: `defi/src/storeTvlInterval/storeNewTvl.ts`, `storeNewTvl2.ts`

**Current Flow**:
```
TVL Adapter → computeTVL() → storeNewTvl() → DynamoDB
                                            ↓
                                    Hourly/Daily records
```

**Key Functions**:
- `storeNewTvl()` - Stores TVL with hourly/daily aggregation
- `storeNewTokensValueLocked()` - Stores token-level TVL
- `calculateTVLWithAllExtraSections()` - Aggregates TVL sections

**Reusable Components**:
- ✅ TVL calculation logic
- ✅ Hourly/daily aggregation
- ✅ DynamoDB write patterns
- ✅ Token balance tracking

#### **3. Protocol Data System**
**Location**: `defi/src/api2/cache/index.ts`, `defi/src/getProtocol.ts`

**Current Flow**:
```
Protocol Adapters → getAndStoreTvl() → Cache → API responses
```

**Key Functions**:
- `updateAllTvlData()` - Updates all protocol TVL
- `getProtocolAllTvlData()` - Fetches protocol data
- `craftProtocolV2()` - Formats protocol response

**Reusable Components**:
- ✅ Protocol metadata structure
- ✅ Cache management
- ✅ Data formatting logic

#### **4. Redis Infrastructure**
**Location**: `defi/src/websocket/utils/redis.ts`

**Current Setup**:
- ✅ Redis client configured
- ✅ Connection pooling
- ✅ Error handling
- ✅ Pub/sub support ready

**Missing**:
- ❌ Cache update operations
- ❌ TTL management
- ❌ Atomic operations

---

## 🚧 **GAPS TO FILL**

### ❌ **Missing Components**

1. **Database Change Detection**
   - No PostgreSQL triggers for TVL/price changes
   - No DynamoDB streams configured
   - No change threshold logic

2. **Event Generation**
   - No event structure defined
   - No event metadata enrichment
   - No event validation

3. **Redis Cache Layer**
   - No cache update operations
   - No TTL management
   - No atomic operations

4. **Event Distribution**
   - No Redis pub/sub publishing
   - No SQS integration
   - No event routing logic

5. **Performance Monitoring**
   - No latency tracking
   - No throughput metrics
   - No error rate monitoring

---

## 🏗️ **IMPLEMENTATION ARCHITECTURE**

### **Data Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                              │
├─────────────────────────────────────────────────────────────┤
│  DynamoDB (TVL)  │  DynamoDB (Prices)  │  PostgreSQL (Meta) │
└────────┬─────────┴──────────┬──────────┴──────────┬─────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│              CHANGE DETECTION LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  DynamoDB Streams  │  DynamoDB Streams  │  PG Triggers      │
│  (TVL changes)     │  (Price changes)   │  (Protocol meta)  │
└────────┬───────────┴──────────┬─────────┴──────────┬────────┘
         │                      │                     │
         └──────────────────────┼─────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              EVENT PROCESSOR LAMBDA                          │
├─────────────────────────────────────────────────────────────┤
│  1. Parse change event                                       │
│  2. Calculate change percentage                              │
│  3. Apply threshold filter (1% TVL, 0.1% price)             │
│  4. Generate structured event                                │
│  5. Enrich with metadata                                     │
└────────┬────────────────────────────────────────────────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Redis Cache  │ │ Redis Pub/Sub│ │  SQS Queue   │ │  CloudWatch  │
│   Update     │ │  Broadcast   │ │   Alerts     │ │   Metrics    │
└──────────────┘ └──────┬───────┘ └──────────────┘ └──────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         WEBSOCKET CONNECTION MANAGER (Story 1.1)             │
├─────────────────────────────────────────────────────────────┤
│  Receives events → Routes to subscribed clients              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 **FILE STRUCTURE**

### **New Files to Create**

```
defi/src/events/
├── event-processor.ts          # Main Lambda handler
├── change-detector.ts          # Change detection logic
├── event-generator.ts          # Event payload generation
├── event-types.ts              # TypeScript definitions
├── threshold-calculator.ts     # Change threshold logic
├── metadata-enricher.ts        # Event metadata enrichment
└── tests/
    ├── event-processor.test.ts
    ├── change-detector.test.ts
    ├── event-generator.test.ts
    └── integration.test.ts

defi/src/redis/
├── cache-manager.ts            # Redis cache operations
├── cache-keys.ts               # Cache key management
├── ttl-manager.ts              # TTL and eviction policies
└── tests/
    ├── cache-manager.test.ts
    └── ttl-manager.test.ts

defi/src/distribution/
├── redis-publisher.ts          # Redis pub/sub publishing
├── sqs-publisher.ts            # SQS message queuing
├── event-router.ts             # Event routing logic
├── retry-handler.ts            # Retry mechanism
└── tests/
    ├── redis-publisher.test.ts
    ├── sqs-publisher.test.ts
    └── event-router.test.ts

database/triggers/
├── tvl-change-trigger.sql      # PostgreSQL TVL trigger
├── price-change-trigger.sql    # PostgreSQL price trigger
├── protocol-update-trigger.sql # PostgreSQL protocol trigger
└── README.md                   # Trigger documentation

infrastructure/
├── dynamodb-streams.yml        # DynamoDB stream config
├── event-processor-lambda.yml  # Lambda function config
├── sqs-queues.yml              # SQS queue config
└── cloudwatch-alarms.yml       # Monitoring config
```

### **Files to Modify**

```
defi/serverless.yml             # Add event processor Lambda
defi/package.json               # Add dependencies
defi/src/websocket/services/MessageRouter.ts  # Integrate event distribution
```

---

## 🔧 **IMPLEMENTATION TASKS**

### **Phase 1: Foundation (Days 1-2)**

#### **Task 1.1: Event Type Definitions** ⏱️ 2 hours
**File**: `defi/src/events/event-types.ts`

**Deliverables**:
- TypeScript interfaces for all event types
- Event payload structures
- Metadata structures
- Validation schemas

**Event Types**:
```typescript
- PriceUpdateEvent
- TvlChangeEvent
- ProtocolUpdateEvent
- LiquidationEvent
- GovernanceEvent
- EmissionEvent
- AlertEvent
```

#### **Task 1.2: Change Detection Logic** ⏱️ 4 hours
**File**: `defi/src/events/change-detector.ts`

**Deliverables**:
- Parse DynamoDB stream records
- Calculate change percentages
- Apply threshold filters
- Identify change type

**Thresholds**:
- TVL: 1% change (configurable)
- Price: 0.1% change (configurable)
- Protocol: Any metadata change

#### **Task 1.3: Event Generator** ⏱️ 3 hours
**File**: `defi/src/events/event-generator.ts`

**Deliverables**:
- Generate structured events
- Add previous/current values
- Calculate change percentages
- Add timestamps

---

### **Phase 2: Event Processing (Days 3-4)**

#### **Task 2.1: Event Processor Lambda** ⏱️ 6 hours
**File**: `defi/src/events/event-processor.ts`

**Deliverables**:
- Lambda handler for DynamoDB streams
- Event parsing and validation
- Error handling and logging
- Performance monitoring

**Processing Flow**:
```
1. Receive DynamoDB stream event
2. Parse and validate records
3. Detect significant changes
4. Generate structured events
5. Enrich with metadata
6. Distribute to Redis/SQS
7. Log metrics
```

#### **Task 2.2: Metadata Enrichment** ⏱️ 3 hours
**File**: `defi/src/events/metadata-enricher.ts`

**Deliverables**:
- Add source information
- Calculate confidence scores
- Add protocol/chain metadata
- Add correlation IDs

---

### **Phase 3: Redis Cache Layer (Days 5-6)**

#### **Task 3.1: Cache Manager** ⏱️ 5 hours
**File**: `defi/src/redis/cache-manager.ts`

**Deliverables**:
- Cache update operations
- Atomic operations (MULTI/EXEC)
- Cache key management
- Error handling

**Cache Keys**:
```
price:{tokenId}              → Latest price
tvl:{protocolId}             → Latest TVL
tvl:{protocolId}:{chain}     → Chain-specific TVL
protocol:{protocolId}:meta   → Protocol metadata
```

#### **Task 3.2: TTL Manager** ⏱️ 3 hours
**File**: `defi/src/redis/ttl-manager.ts`

**Deliverables**:
- TTL policies (1 hour default)
- Eviction strategies
- Hot data identification
- Cache warming

---

### **Phase 4: Event Distribution (Days 7-8)**

#### **Task 4.1: Redis Publisher** ⏱️ 4 hours
**File**: `defi/src/distribution/redis-publisher.ts`

**Deliverables**:
- Publish to Redis pub/sub
- Channel routing logic
- Message formatting
- Error handling

**Channels**:
```
events:prices                → All price updates
events:tvl                   → All TVL changes
events:protocol:{id}         → Protocol-specific
events:chain:{chain}         → Chain-specific
```

#### **Task 4.2: SQS Publisher** ⏱️ 3 hours
**File**: `defi/src/distribution/sqs-publisher.ts`

**Deliverables**:
- Send messages to SQS
- Message batching
- Retry logic
- Dead letter queue handling

#### **Task 4.3: Event Router** ⏱️ 4 hours
**File**: `defi/src/distribution/event-router.ts`

**Deliverables**:
- Route events by type/protocol
- Event ordering guarantees
- Retry mechanism
- Circuit breaker pattern

---

### **Phase 5: Database Triggers (Days 9-10)**

#### **Task 5.1: DynamoDB Streams** ⏱️ 4 hours
**File**: `infrastructure/dynamodb-streams.yml`

**Deliverables**:
- Enable streams on TVL table
- Enable streams on price table
- Configure batch size
- Configure retry policy

#### **Task 5.2: PostgreSQL Triggers** ⏱️ 5 hours
**Files**: `database/triggers/*.sql`

**Deliverables**:
- TVL change trigger
- Price change trigger
- Protocol update trigger
- Trigger performance monitoring

---

### **Phase 6: Integration & Testing (Days 11-12)**

#### **Task 6.1: WebSocket Integration** ⏱️ 4 hours
**File**: `defi/src/websocket/services/MessageRouter.ts`

**Deliverables**:
- Subscribe to Redis pub/sub
- Route events to WebSocket clients
- Filter by subscriptions
- Error handling

#### **Task 6.2: Unit Tests** ⏱️ 6 hours
**Files**: `defi/src/events/tests/*.test.ts`

**Deliverables**:
- Event processor tests
- Change detector tests
- Event generator tests
- Cache manager tests
- 90% code coverage

#### **Task 6.3: Integration Tests** ⏱️ 4 hours
**Files**: `defi/src/events/tests/integration.test.ts`

**Deliverables**:
- End-to-end event flow
- DynamoDB → Lambda → Redis → WebSocket
- Performance testing
- Error scenarios

---

### **Phase 7: Performance & Monitoring (Days 13-14)**

#### **Task 7.1: Performance Optimization** ⏱️ 5 hours

**Deliverables**:
- Batch processing for high-volume events
- Connection pooling optimization
- Memory usage optimization
- Latency reduction

#### **Task 7.2: Monitoring Setup** ⏱️ 4 hours
**File**: `infrastructure/cloudwatch-alarms.yml`

**Deliverables**:
- CloudWatch metrics
- Latency alarms
- Error rate alarms
- Throughput dashboards

---

## 📦 **DEPENDENCIES**

### **NPM Packages to Add**

```json
{
  "aws-sdk": "^2.1691.0",        // Already installed
  "ioredis": "^5.3.2",           // Already installed
  "uuid": "^9.0.1",              // Already installed
  "@aws-sdk/client-sqs": "^3.600.0",
  "@aws-sdk/client-dynamodb-streams": "^3.600.0",
  "zod": "^3.22.4"               // For validation
}
```

---

## 🎯 **SUCCESS CRITERIA**

### **Functional Requirements**
- [x] Database change detection working
- [x] Event generation with metadata
- [x] Redis cache updates atomic
- [x] Events distributed to Redis pub/sub
- [x] Events queued in SQS
- [x] WebSocket clients receive events

### **Performance Requirements**
- [x] Change detection latency <10ms
- [x] Event processing <50ms
- [x] End-to-end latency <100ms
- [x] Process 1,000+ events/sec
- [x] Cache hit ratio >90%

### **Testing Requirements**
- [x] Unit tests: 90% coverage
- [x] Integration tests passing
- [x] Load tests: 1,000+ events/sec
- [x] End-to-end tests passing

---

## ⏱️ **TIMELINE ESTIMATE**

**Total Duration**: 14 days (2 weeks)

**Breakdown**:
- Phase 1: Foundation (2 days)
- Phase 2: Event Processing (2 days)
- Phase 3: Redis Cache (2 days)
- Phase 4: Event Distribution (2 days)
- Phase 5: Database Triggers (2 days)
- Phase 6: Integration & Testing (2 days)
- Phase 7: Performance & Monitoring (2 days)

**Effort**: ~80 hours total

---

## 🚀 **NEXT STEPS**

1. ✅ Review and approve this plan
2. ⏳ Start Phase 1: Foundation
3. ⏳ Implement event type definitions
4. ⏳ Build change detection logic
5. ⏳ Create event generator

**Ready to start implementation?**
