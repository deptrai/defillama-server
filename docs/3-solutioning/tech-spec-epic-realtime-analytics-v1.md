# Technical Specification - Real-time Analytics Package (Epic: realtime-analytics-v1)

**Project:** DeFiLlama Server - Real-time Analytics Package  
**Epic ID:** realtime-analytics-v1  
**Date:** 2025-10-13  
**Author:** BMAD Method v6.0.0-alpha.0  
**Version:** 1.0  

## 1. Overview and Scope

### 1.1 Overview
This technical specification defines the implementation details for the Real-time Analytics Package, a comprehensive enhancement to the DeFiLlama Server that introduces real-time data streaming, intelligent alerting, and advanced querying capabilities. The solution extends the existing serverless microservices architecture with new real-time components while maintaining backward compatibility and operational excellence.

The package addresses critical user pain points identified through comprehensive user research: manual data refresh cycles, missing real-time notifications, and limited advanced querying capabilities. The solution enables DeFi researchers, traders, and protocol teams to make instant decisions based on live data streams.

### 1.2 Objectives and Scope

**In Scope:**
- Real-time event streaming via WebSocket connections
- Intelligent alert and notification system with rule-based engine
- Advanced filtering API with complex query processing
- Real-time data synchronization between PostgreSQL and Redis
- Multi-channel notification delivery (email, webhook, mobile push)
- WebSocket connection management and room-based subscriptions
- Performance monitoring and operational dashboards
- Security enhancements for real-time connections

**Out of Scope:**
- Mobile application development (API integration only)
- Machine learning-based predictive analytics (future phase)
- Historical data migration or restructuring
- Third-party data source integrations beyond existing adapters
- User interface changes to existing web dashboard
- Blockchain node infrastructure modifications

### 1.3 System Architecture Alignment
This implementation aligns with the solution architecture by leveraging AWS serverless components (Lambda, API Gateway v2, SQS/SNS) and integrating with existing DeFi and Coins services. The design maintains the event-driven architecture pattern while adding real-time capabilities through Redis caching and WebSocket connections. All components follow the established security, monitoring, and deployment patterns.

## 2. Detailed Design

### 2.1 Services and Modules

| Service/Module | Responsibilities | Inputs | Outputs | Owner |
|----------------|------------------|--------|---------|-------|
| **WebSocket Connection Manager** | Client lifecycle, room management, message routing | WebSocket connections, subscription requests | Real-time messages, connection events | Backend Team |
| **Real-time Event Processor** | Data change detection, cache updates, event generation | PostgreSQL triggers, protocol data | Redis updates, WebSocket events | Backend Team |
| **Alert Engine** | Rule evaluation, notification delivery, user preferences | Alert rules, real-time data, user configs | Email, webhook, push notifications | Backend Team |
| **Advanced Query Processor** | Complex query parsing, cache coordination, aggregations | API requests, filter parameters | Query results, cached responses | Backend Team |
| **Redis Cache Manager** | Hot data storage, pub/sub messaging, session management | Data updates, subscription events | Cached data, real-time lookups | DevOps Team |
| **Notification Service** | Multi-channel delivery, retry logic, delivery tracking | Alert payloads, user preferences | Delivery confirmations, failure logs | Backend Team |

### 2.2 Data Models

#### 2.2.1 WebSocket Connection Model
```typescript
interface WebSocketConnection {
  connectionId: string;           // Unique connection identifier
  userId?: string;               // Authenticated user ID (optional)
  apiKey?: string;              // API key for authentication
  connectedAt: Date;            // Connection timestamp
  lastActivity: Date;           // Last message timestamp
  subscriptions: string[];      // Array of room/topic subscriptions
  metadata: {                   // Connection metadata
    userAgent: string;
    ipAddress: string;
    region: string;
  };
}
```

#### 2.2.2 Alert Rule Model
```typescript
interface AlertRule {
  ruleId: string;               // Unique rule identifier
  userId: string;               // Rule owner
  name: string;                 // Human-readable rule name
  description?: string;         // Optional description
  conditions: {                 // Alert conditions
    protocol?: string;          // Target protocol
    chain?: string;             // Target blockchain
    metric: string;             // Metric to monitor (tvl, price, etc.)
    operator: 'gt' | 'lt' | 'eq' | 'change_pct';
    threshold: number;          // Threshold value
    timeWindow?: number;        // Time window in seconds
  }[];
  actions: {                    // Alert actions
    type: 'email' | 'webhook' | 'push';
    target: string;             // Email, URL, or device token
    template?: string;          // Message template
  }[];
  isActive: boolean;            // Rule status
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
}
```

#### 2.2.3 Real-time Event Model
```typescript
interface RealtimeEvent {
  eventId: string;              // Unique event identifier
  eventType: 'tvl_change' | 'price_change' | 'protocol_update';
  protocol: string;             // Protocol identifier
  chain: string;                // Blockchain identifier
  data: {                       // Event-specific data
    previousValue?: number;
    currentValue: number;
    changePercent?: number;
    timestamp: Date;
  };
  metadata: {                   // Event metadata
    source: string;             // Data source
    confidence: number;         // Data confidence score
    tags: string[];             // Event tags
  };
  createdAt: Date;
}
```

### 2.3 APIs and Interfaces

#### 2.3.1 WebSocket API Endpoints

**Connection Endpoint:**
```
wss://api.llama.fi/v1/realtime
```

**Authentication:**
```typescript
// Connection with API key
const socket = io('wss://api.llama.fi/v1/realtime', {
  auth: {
    apiKey: 'your-api-key'
  }
});
```

**Subscription Management:**
```typescript
// Subscribe to protocol updates
socket.emit('subscribe', {
  type: 'protocol',
  protocol: 'uniswap-v3',
  chain: 'ethereum'
});

// Subscribe to TVL changes
socket.emit('subscribe', {
  type: 'tvl_changes',
  threshold: 0.05  // 5% change threshold
});

// Unsubscribe
socket.emit('unsubscribe', {
  type: 'protocol',
  protocol: 'uniswap-v3'
});
```

**Real-time Events:**
```typescript
// TVL change event
socket.on('tvl_change', (event: {
  protocol: string;
  chain: string;
  previousTvl: number;
  currentTvl: number;
  changePercent: number;
  timestamp: string;
}) => {
  // Handle TVL change
});

// Price change event
socket.on('price_change', (event: {
  token: string;
  previousPrice: number;
  currentPrice: number;
  changePercent: number;
  timestamp: string;
}) => {
  // Handle price change
});
```

#### 2.3.2 REST API Extensions

**Advanced Filtering API:**
```
POST /v1/query/advanced
Content-Type: application/json
Authorization: Bearer {api-key}

{
  "filters": {
    "protocols": ["uniswap-v3", "aave-v3"],
    "chains": ["ethereum", "polygon"],
    "tvl_range": {
      "min": 1000000,
      "max": 10000000000
    },
    "change_24h": {
      "min": -0.1,
      "max": 0.1
    }
  },
  "aggregations": [
    {
      "field": "tvl",
      "operation": "sum",
      "group_by": "chain"
    }
  ],
  "sort": {
    "field": "tvl",
    "order": "desc"
  },
  "limit": 100
}
```

**Alert Management API:**
```
POST /v1/alerts/rules
Content-Type: application/json
Authorization: Bearer {api-key}

{
  "name": "Uniswap TVL Alert",
  "conditions": [
    {
      "protocol": "uniswap-v3",
      "metric": "tvl",
      "operator": "change_pct",
      "threshold": 0.1,
      "timeWindow": 3600
    }
  ],
  "actions": [
    {
      "type": "email",
      "target": "user@example.com",
      "template": "tvl_change"
    }
  ]
}
```

### 2.4 Workflows and Sequencing

#### 2.4.1 Real-time Data Flow Sequence
```
1. Protocol Adapter → PostgreSQL (TVL update)
2. PostgreSQL Trigger → Lambda Event Processor
3. Event Processor → Redis Cache Update
4. Event Processor → SQS Event Queue
5. WebSocket Manager → Redis Pub/Sub Subscribe
6. WebSocket Manager → Broadcast to Subscribed Clients
7. Alert Engine → Rule Evaluation (parallel)
8. Alert Engine → Notification Delivery (if triggered)
```

#### 2.4.2 WebSocket Connection Lifecycle
```
1. Client → API Gateway WebSocket Connect
2. API Gateway → Lambda Connection Handler
3. Connection Handler → Authentication Validation
4. Connection Handler → Redis Connection Storage
5. Client → Subscription Requests
6. Connection Handler → Room Management
7. Real-time Events → Message Broadcasting
8. Client Disconnect → Cleanup Resources
```

#### 2.4.3 Alert Processing Workflow
```
1. Real-time Event → Alert Engine Trigger
2. Alert Engine → Load User Rules from PostgreSQL
3. Alert Engine → Rule Evaluation Against Event Data
4. Alert Engine → Throttling and Deduplication Check
5. Alert Engine → Notification Payload Generation
6. Alert Engine → SQS Notification Queue
7. Notification Service → Multi-channel Delivery
8. Notification Service → Delivery Status Tracking
```

## 3. Non-Functional Requirements

### 3.1 Performance Requirements
- **WebSocket Message Latency**: <100ms (p95) from event generation to client delivery
- **API Response Time**: <500ms (p95) for advanced filtering queries
- **Concurrent Connections**: Support 10,000+ simultaneous WebSocket connections
- **Throughput**: Process 1,000+ events per second during peak traffic
- **Cache Performance**: <5ms (p95) for Redis cache lookups
- **Alert Processing**: <2 seconds from trigger to notification delivery

### 3.2 Security Requirements
- **Authentication**: API key-based authentication for all WebSocket connections
- **Authorization**: Role-based access control for subscription types
- **Data Encryption**: TLS 1.3 for all WebSocket communications
- **Rate Limiting**: Configurable rate limits per API key tier (100-10,000 requests/minute)
- **Input Validation**: Comprehensive validation for all API inputs and WebSocket messages
- **Audit Logging**: Complete audit trail for all user actions and system events

### 3.3 Reliability Requirements
- **Availability**: 99.9% uptime for real-time services (8.76 hours downtime/year)
- **Fault Tolerance**: Graceful degradation when Redis or other components fail
- **Data Consistency**: Eventually consistent model with <5 second reconciliation
- **Error Recovery**: Automatic retry with exponential backoff for failed operations
- **Circuit Breaker**: Prevent cascade failures with circuit breaker pattern
- **Backup Strategy**: Real-time data backup to S3 for disaster recovery

### 3.4 Observability Requirements
- **Metrics**: Comprehensive metrics for all components (latency, throughput, errors)
- **Logging**: Structured logging with correlation IDs for request tracing
- **Tracing**: Distributed tracing for complex workflows using AWS X-Ray
- **Alerting**: Operational alerts for system health and performance degradation
- **Dashboards**: Real-time operational dashboards for monitoring and troubleshooting
- **SLA Monitoring**: Automated SLA compliance monitoring and reporting

## 4. Implementation Details

### 4.1 Technology Stack Implementation

#### 4.1.1 WebSocket Infrastructure
```typescript
// WebSocket Connection Manager (Lambda)
import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { Redis } from 'ioredis';

export const connectionHandler: APIGatewayProxyHandler = async (event) => {
  const { connectionId, eventType } = event.requestContext;

  switch (eventType) {
    case 'CONNECT':
      return handleConnect(connectionId, event);
    case 'DISCONNECT':
      return handleDisconnect(connectionId);
    case 'MESSAGE':
      return handleMessage(connectionId, event.body);
  }
};

const handleConnect = async (connectionId: string, event: any) => {
  // Authenticate connection
  const apiKey = event.queryStringParameters?.apiKey;
  const user = await authenticateApiKey(apiKey);

  // Store connection in Redis
  await redis.hset(`connection:${connectionId}`, {
    userId: user?.id,
    apiKey,
    connectedAt: Date.now(),
    subscriptions: JSON.stringify([])
  });

  return { statusCode: 200 };
};
```

#### 4.1.2 Real-time Event Processing
```typescript
// Event Processor (Lambda)
import { DynamoDBStreamHandler } from 'aws-lambda';
import { SQS } from 'aws-sdk';

export const eventProcessor: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === 'MODIFY' || record.eventName === 'INSERT') {
      const newData = record.dynamodb?.NewImage;
      const oldData = record.dynamodb?.OldImage;

      // Process TVL changes
      if (newData?.tvl && oldData?.tvl) {
        const changePercent = calculateChangePercent(
          parseFloat(oldData.tvl.N!),
          parseFloat(newData.tvl.N!)
        );

        if (Math.abs(changePercent) > 0.01) { // 1% threshold
          await publishEvent({
            type: 'tvl_change',
            protocol: newData.protocol.S!,
            chain: newData.chain.S!,
            previousValue: parseFloat(oldData.tvl.N!),
            currentValue: parseFloat(newData.tvl.N!),
            changePercent
          });
        }
      }
    }
  }
};
```

#### 4.1.3 Alert Engine Implementation
```typescript
// Alert Rule Evaluation
interface AlertEvaluationContext {
  event: RealtimeEvent;
  rules: AlertRule[];
  userPreferences: UserPreferences[];
}

export const evaluateAlerts = async (context: AlertEvaluationContext) => {
  const triggeredAlerts: TriggeredAlert[] = [];

  for (const rule of context.rules) {
    if (!rule.isActive) continue;

    const isTriggered = evaluateConditions(rule.conditions, context.event);

    if (isTriggered) {
      // Check throttling
      const lastTriggered = await getLastTriggeredTime(rule.ruleId);
      const throttleWindow = rule.throttleMinutes || 5;

      if (!lastTriggered ||
          Date.now() - lastTriggered > throttleWindow * 60 * 1000) {

        triggeredAlerts.push({
          ruleId: rule.ruleId,
          userId: rule.userId,
          event: context.event,
          actions: rule.actions,
          triggeredAt: new Date()
        });

        await updateLastTriggeredTime(rule.ruleId, Date.now());
      }
    }
  }

  // Send notifications
  for (const alert of triggeredAlerts) {
    await sendNotifications(alert);
  }
};
```

### 4.2 Database Schema Extensions

#### 4.2.1 Alert Rules Table (PostgreSQL)
```sql
CREATE TABLE alert_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  throttle_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_triggered_at TIMESTAMP,

  INDEX idx_alert_rules_user_id (user_id),
  INDEX idx_alert_rules_active (is_active),
  INDEX idx_alert_rules_conditions USING GIN (conditions)
);
```

#### 4.2.2 WebSocket Connections Table (Redis)
```typescript
// Redis Schema for WebSocket connections
interface RedisConnectionSchema {
  [`connection:${connectionId}`]: {
    userId?: string;
    apiKey?: string;
    connectedAt: number;
    lastActivity: number;
    subscriptions: string; // JSON array
    metadata: string;      // JSON object
  };

  [`user_connections:${userId}`]: Set<string>; // Set of connection IDs
  [`room:${roomName}`]: Set<string>;           // Set of connection IDs
}
```

#### 4.2.3 Real-time Cache Schema (Redis)
```typescript
// Hot data cache structure
interface RedisCacheSchema {
  [`protocol:${protocol}:${chain}:tvl`]: string;     // Current TVL
  [`protocol:${protocol}:${chain}:price`]: string;   // Current price
  [`protocol:${protocol}:${chain}:change_24h`]: string; // 24h change
  [`aggregation:${key}`]: string;                     // Cached aggregations
  [`query_result:${hash}`]: string;                   // Cached query results
}
```

### 4.3 API Rate Limiting and Quotas

#### 4.3.1 Rate Limiting Configuration
```typescript
interface RateLimitConfig {
  free: {
    websocket_connections: 5;
    messages_per_minute: 100;
    api_requests_per_minute: 60;
    alert_rules: 5;
  };
  pro: {
    websocket_connections: 50;
    messages_per_minute: 1000;
    api_requests_per_minute: 600;
    alert_rules: 100;
  };
  enterprise: {
    websocket_connections: 1000;
    messages_per_minute: 10000;
    api_requests_per_minute: 6000;
    alert_rules: 1000;
  };
}
```

### 4.4 Error Handling and Resilience

#### 4.4.1 Circuit Breaker Implementation
```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

## 5. Testing Strategy

### 5.1 Unit Testing
- **Coverage Target**: 90% code coverage for all new components
- **Framework**: Jest with TypeScript support
- **Mocking**: AWS SDK mocks, Redis mocks, WebSocket mocks
- **Test Categories**: Business logic, data transformations, error handling

### 5.2 Integration Testing
- **WebSocket Integration**: Connection lifecycle, message routing, room management
- **Database Integration**: PostgreSQL triggers, Redis operations, data consistency
- **External Service Integration**: SQS/SNS messaging, email delivery, webhook calls
- **API Integration**: REST endpoint testing, authentication, rate limiting

### 5.3 Performance Testing
- **Load Testing**: 10,000+ concurrent WebSocket connections using Artillery.io
- **Stress Testing**: Peak traffic simulation with synthetic data
- **Latency Testing**: End-to-end message delivery timing
- **Throughput Testing**: Maximum events per second processing

### 5.4 Security Testing
- **Authentication Testing**: API key validation, JWT token verification
- **Authorization Testing**: Role-based access control, subscription permissions
- **Input Validation**: SQL injection, XSS, malformed data handling
- **Rate Limiting Testing**: Quota enforcement, abuse prevention

## 6. Deployment and Operations

### 6.1 Infrastructure as Code (AWS CDK)
```typescript
// CDK Stack for Real-time Analytics
export class RealtimeAnalyticsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Redis Cluster
    const redisCluster = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
      replicationGroupDescription: 'Real-time cache cluster',
      numCacheClusters: 3,
      cacheNodeType: 'cache.r6g.large',
      engine: 'redis',
      engineVersion: '7.0',
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true
    });

    // WebSocket API Gateway
    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'WebSocketApi', {
      apiName: 'defillama-realtime-api',
      description: 'Real-time analytics WebSocket API'
    });

    // Lambda Functions
    const connectionHandler = new lambda.Function(this, 'ConnectionHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'connection.handler',
      code: lambda.Code.fromAsset('dist/websocket'),
      environment: {
        REDIS_ENDPOINT: redisCluster.attrRedisEndpointAddress
      }
    });
  }
}
```

### 6.2 Monitoring and Alerting
```typescript
// CloudWatch Dashboards and Alarms
const dashboard = new cloudwatch.Dashboard(this, 'RealtimeDashboard', {
  dashboardName: 'DeFiLlama-Realtime-Analytics'
});

// Key metrics
const connectionCountMetric = new cloudwatch.Metric({
  namespace: 'DeFiLlama/Realtime',
  metricName: 'ActiveConnections',
  statistic: 'Average'
});

const messageLatencyMetric = new cloudwatch.Metric({
  namespace: 'DeFiLlama/Realtime',
  metricName: 'MessageLatency',
  statistic: 'Average'
});

// Alarms
new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
  metric: messageLatencyMetric,
  threshold: 200,
  evaluationPeriods: 2,
  treatMissingData: cloudwatch.TreatMissingData.BREACHING
});
```

## 7. Acceptance Criteria and Testing

### 7.1 Feature Acceptance Criteria

#### 7.1.1 Real-time Event Streaming
- [ ] WebSocket connections establish successfully with valid API keys
- [ ] Clients receive TVL change events within 100ms of database updates
- [ ] Price change events are delivered to subscribed clients
- [ ] Connection management handles 10,000+ concurrent connections
- [ ] Room-based subscriptions work correctly for protocol/chain filtering
- [ ] Graceful handling of connection failures and reconnections

#### 7.1.2 Alert and Notification System
- [ ] Alert rules can be created, updated, and deleted via API
- [ ] Rule evaluation triggers correctly based on real-time events
- [ ] Email notifications are delivered within 30 seconds
- [ ] Webhook notifications include correct payload format
- [ ] Alert throttling prevents spam notifications
- [ ] User preferences control notification channels

#### 7.1.3 Advanced Filtering API
- [ ] Complex queries with multiple filters execute within 500ms
- [ ] Real-time aggregations return accurate results
- [ ] Query results are cached for improved performance
- [ ] Rate limiting enforces API quotas correctly
- [ ] Error handling provides meaningful error messages
- [ ] API documentation is complete and accurate

### 7.2 Performance Acceptance Criteria
- [ ] WebSocket message latency <100ms (p95)
- [ ] API response time <500ms (p95) for complex queries
- [ ] System supports 10,000+ concurrent connections
- [ ] Redis cache hit ratio >90% for hot data
- [ ] Alert processing completes within 2 seconds
- [ ] System maintains 99.9% availability

### 7.3 Security Acceptance Criteria
- [ ] All WebSocket connections use TLS 1.3 encryption
- [ ] API key authentication works for all endpoints
- [ ] Rate limiting prevents abuse and DoS attacks
- [ ] Input validation prevents injection attacks
- [ ] Audit logging captures all user actions
- [ ] Data encryption at rest for sensitive information

---

## 8. Traceability Matrix

| Requirement ID | PRD Section | Architecture Component | Implementation Module | Test Case |
|----------------|-------------|------------------------|----------------------|-----------|
| REQ-001 | Real-time Streaming | WebSocket Manager | connection-manager.ts | TC-WS-001 |
| REQ-002 | Alert System | Alert Engine | rule-engine.ts | TC-ALERT-001 |
| REQ-003 | Advanced Queries | Query Processor | query-processor.ts | TC-QUERY-001 |
| REQ-004 | Performance | Redis Cache | cache-manager.ts | TC-PERF-001 |
| REQ-005 | Security | Auth Middleware | auth-middleware.ts | TC-SEC-001 |

---

*Generated using BMAD Method v6.0.0-alpha.0 Tech Spec workflow*
