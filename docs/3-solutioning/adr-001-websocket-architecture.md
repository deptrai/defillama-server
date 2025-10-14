# ADR-001: WebSocket Architecture for Real-time Data Streaming

**Status**: Approved  
**Date**: October 14, 2025  
**Architect**: Luis  
**Epic**: On-Chain Services Platform (on-chain-services-v1)  

---

## 🎯 **Context**

DeFiLlama needs to implement real-time data streaming capabilities to support 10,000+ concurrent users receiving live updates on protocol TVL, token prices, and blockchain events. The system must provide sub-100ms latency while maintaining 99.9% uptime and cost efficiency.

## 🤔 **Decision**

We will implement a **serverless WebSocket architecture** using AWS API Gateway v2 WebSocket APIs with Lambda functions, Redis pub/sub messaging, and DynamoDB for connection state management.

## 📊 **Options Considered**

### Option 1: AWS API Gateway v2 + Lambda (CHOSEN)
**Pros:**
- Serverless auto-scaling (0 to 10,000+ connections)
- No infrastructure management overhead
- Built-in authentication and rate limiting
- Cost-effective (pay per connection/message)
- Integrates with existing AWS infrastructure

**Cons:**
- 10-minute Lambda timeout limit
- Cold start latency for new connections
- Limited control over connection lifecycle

### Option 2: ECS Fargate + ALB WebSocket
**Pros:**
- Full control over WebSocket implementation
- No timeout limitations
- Better performance for persistent connections
- Custom load balancing strategies

**Cons:**
- Infrastructure management overhead
- Fixed costs regardless of usage
- Manual scaling configuration required
- Higher operational complexity

### Option 3: Socket.IO on EC2 instances
**Pros:**
- Maximum flexibility and control
- Rich feature set (rooms, namespaces, fallbacks)
- Battle-tested in production environments
- Custom clustering capabilities

**Cons:**
- Highest operational overhead
- Manual scaling and load balancing
- Infrastructure provisioning and management
- Higher fixed costs

## 🏗️ **Architecture Design**

### High-Level Architecture
```
Client WebSocket Connection
         ↓
AWS API Gateway v2 (WebSocket)
         ↓
Lambda Connection Handler
         ↓
DynamoDB (Connection State) + Redis (Pub/Sub)
         ↓
Lambda Message Processors
         ↓
PostgreSQL (Data Source)
```

### Component Details

#### 1. API Gateway v2 WebSocket
```typescript
// WebSocket routes configuration
const routes = {
  '$connect': 'connection-handler',
  '$disconnect': 'disconnection-handler', 
  '$default': 'message-handler',
  'subscribe': 'subscription-handler',
  'unsubscribe': 'unsubscription-handler'
};
```

#### 2. Lambda Connection Handler
```typescript
export const connectionHandler: APIGatewayProxyHandler = async (event) => {
  const { connectionId, eventType, routeKey } = event.requestContext;
  
  switch (eventType) {
    case 'CONNECT':
      return await handleConnect(connectionId, event);
    case 'DISCONNECT':
      return await handleDisconnect(connectionId);
    case 'MESSAGE':
      return await handleMessage(connectionId, routeKey, event.body);
  }
};
```

#### 3. Connection State Management (DynamoDB)
```typescript
interface ConnectionRecord {
  connectionId: string;        // Partition key
  userId?: string;            // User identifier
  subscriptions: string[];    // Subscribed channels
  connectedAt: number;        // Connection timestamp
  lastActivity: number;       // Last activity timestamp
  metadata: {
    userAgent: string;
    ipAddress: string;
    apiKey?: string;
  };
}
```

#### 4. Redis Pub/Sub Messaging
```typescript
// Publisher (Data processors)
await redis.publish('channel:tvl:updates', JSON.stringify({
  protocolId: 'uniswap-v3',
  tvl: 1234567890,
  change24h: 0.05,
  timestamp: Date.now()
}));

// Subscriber (WebSocket handler)
redis.subscribe('channel:tvl:updates', (message) => {
  const data = JSON.parse(message);
  broadcastToSubscribers('tvl', data);
});
```

## 🔧 **Implementation Details**

### Authentication Strategy
```typescript
// API Key authentication
const authenticateConnection = async (event: APIGatewayProxyEvent) => {
  const apiKey = event.headers['x-api-key'];
  const authToken = event.headers['authorization'];
  
  if (apiKey) {
    return await validateApiKey(apiKey);
  } else if (authToken) {
    return await validateJwtToken(authToken);
  }
  
  // Allow anonymous connections with rate limiting
  return { userId: null, tier: 'free' };
};
```

### Subscription Management
```typescript
interface SubscriptionMessage {
  action: 'subscribe' | 'unsubscribe';
  channels: string[];
  filters?: {
    protocolIds?: string[];
    chainIds?: number[];
    thresholds?: {
      tvlChange?: number;
      priceChange?: number;
    };
  };
}
```

### Message Broadcasting
```typescript
const broadcastToSubscribers = async (channel: string, data: any) => {
  // Get all connections subscribed to this channel
  const connections = await getSubscribedConnections(channel);
  
  // Batch send messages
  const promises = connections.map(connectionId => 
    sendMessageToConnection(connectionId, {
      type: 'update',
      channel,
      data,
      timestamp: Date.now()
    })
  );
  
  await Promise.allSettled(promises);
};
```

## 📈 **Scalability Considerations**

### Connection Scaling
- **Target**: 10,000+ concurrent connections
- **Auto-scaling**: API Gateway handles connection scaling automatically
- **Connection limits**: 10,000 connections per API Gateway (can request increase)
- **Regional distribution**: Deploy in multiple regions for global users

### Message Throughput
- **Target**: 1M+ messages per minute
- **Redis scaling**: Use Redis cluster mode for high throughput
- **Lambda concurrency**: Configure reserved concurrency for critical functions
- **Batch processing**: Group messages to reduce Lambda invocations

### Cost Optimization
```typescript
// Connection-based pricing
const estimatedCosts = {
  apiGateway: '$1.00 per million messages',
  lambda: '$0.20 per million requests',
  dynamodb: '$0.25 per million read/write units',
  redis: '$0.50 per GB-hour',
  dataTransfer: '$0.09 per GB'
};
```

## 🔒 **Security Measures**

### Connection Security
- TLS 1.3 encryption for all WebSocket connections
- API key and JWT token authentication
- Rate limiting per connection (1000 messages/minute for free tier)
- IP-based rate limiting and DDoS protection

### Data Security
- Message payload validation and sanitization
- Subscription authorization (users can only subscribe to allowed channels)
- Audit logging for all connection events
- PII data filtering in messages

## 📊 **Monitoring & Observability**

### Key Metrics
```typescript
const metrics = {
  // Connection metrics
  'WebSocket/ActiveConnections': 'Current active connections',
  'WebSocket/ConnectionRate': 'New connections per minute',
  'WebSocket/DisconnectionRate': 'Disconnections per minute',
  
  // Message metrics
  'WebSocket/MessagesPerSecond': 'Messages sent per second',
  'WebSocket/MessageLatency': 'End-to-end message latency',
  'WebSocket/FailedMessages': 'Failed message deliveries',
  
  // Performance metrics
  'Lambda/Duration': 'Function execution time',
  'Lambda/Errors': 'Function error rate',
  'Redis/ResponseTime': 'Redis operation latency'
};
```

### Alerting Thresholds
- Connection failures > 1%
- Message latency > 100ms
- Lambda errors > 0.1%
- Redis response time > 10ms

## 🧪 **Testing Strategy**

### Load Testing
```typescript
// Artillery.io load test configuration
const loadTest = {
  target: 'wss://api.llama.fi/v2/realtime',
  phases: [
    { duration: '2m', arrivalRate: 10 },    // Ramp up
    { duration: '5m', arrivalRate: 100 },   // Sustained load
    { duration: '2m', arrivalRate: 500 },   // Peak load
    { duration: '1m', arrivalRate: 0 }      // Ramp down
  ],
  scenarios: [
    {
      name: 'WebSocket Connection Test',
      weight: 100,
      engine: 'ws'
    }
  ]
};
```

### Integration Testing
- Connection lifecycle testing (connect, subscribe, receive, disconnect)
- Authentication and authorization testing
- Message delivery and ordering verification
- Error handling and reconnection testing

## 🔄 **Implementation Strategy**

### Implementation Location: `defi/` Service
**Rationale**: Implement WebSocket functionality within the existing `defi/` service to:
- Leverage existing `api.llama.fi` domain for consistent API endpoints
- Access existing protocol and TVL data without cross-service communication
- Utilize established serverless infrastructure and deployment patterns
- Maintain consistency with existing authentication and monitoring systems

### Directory Structure
```
defi/
├── src/websocket/
│   ├── handlers/          # Lambda function handlers
│   ├── services/          # Business logic services
│   ├── utils/            # WebSocket utilities
│   └── __tests__/        # Unit tests
├── resources/
│   ├── websocket-api.yml  # API Gateway v2 configuration
│   └── redis-cluster.yml # Redis ElastiCache configuration
└── serverless.yml        # Extended with WebSocket functions
```

### Phase 1: Infrastructure Setup
1. Create WebSocket directory structure in `defi/src/websocket/`
2. Add WebSocket functions to `defi/serverless.yml`
3. Deploy API Gateway v2 WebSocket API via `resources/websocket-api.yml`
4. Set up Redis cluster via `resources/redis-cluster.yml`
5. Configure DynamoDB connection table

### Phase 2: Core Functionality
1. Implement connection handlers in `defi/src/websocket/handlers/`
2. Build connection and room management services
3. Add message broadcasting capabilities
4. Integrate with existing DeFi data sources
5. Implement API key authentication using existing `src/api-keys/` system

### Phase 3: Production Deployment
1. Load testing with Artillery.io targeting 10,000+ connections
2. Security audit and penetration testing
3. Gradual rollout to production users
4. Monitor and optimize based on real usage patterns

## 🎯 **Success Criteria**

### Performance Targets
- **Latency**: <100ms end-to-end message delivery
- **Throughput**: 1M+ messages per minute
- **Concurrency**: 10,000+ simultaneous connections
- **Availability**: 99.9% uptime SLA

### Business Targets
- **User Adoption**: 1,000+ active WebSocket connections within 30 days
- **Feature Usage**: 80% of premium users use real-time features
- **Performance**: <1% connection failure rate
- **Cost Efficiency**: <$0.01 per user per month for WebSocket infrastructure

## 📚 **References**

- [AWS API Gateway v2 WebSocket Documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api.html)
- [WebSocket RFC 6455](https://tools.ietf.org/html/rfc6455)
- [Redis Pub/Sub Documentation](https://redis.io/topics/pubsub)
- [DeFiLlama Real-time Analytics Technical Specification](./tech-spec-epic-realtime-analytics-v1.md)

---

**This ADR establishes the foundation for DeFiLlama's real-time data streaming capabilities, providing a scalable, cost-effective, and maintainable WebSocket architecture that can grow with the platform's needs.**
