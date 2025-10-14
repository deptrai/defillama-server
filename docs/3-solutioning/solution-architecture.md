# DeFiLlama Real-time Analytics Package - Solution Architecture

**Project:** DeFiLlama Server - Real-time Analytics Package  
**Date:** 2025-10-13  
**Author:** BMAD Method v6.0.0-alpha.0  
**Version:** 1.0  

## Executive Summary

This document defines the solution architecture for the DeFiLlama Real-time Analytics Package, a comprehensive enhancement to the existing DeFiLlama Server that introduces real-time data streaming, intelligent alerting, and advanced querying capabilities. The solution leverages the existing serverless microservices architecture while adding new real-time components to support WebSocket connections, event streaming, and proactive notifications.

**Key Architectural Goals:**
- Extend existing architecture with minimal disruption
- Support 10,000+ concurrent real-time connections
- Maintain <100ms latency for real-time updates
- Ensure 99.9% availability for real-time services
- Enable horizontal scaling for future growth

## 1. Technology Stack and Decisions

### 1.1 Technology and Library Decision Table

| Component | Technology | Version | Rationale | Alternatives Considered |
|-----------|------------|---------|-----------|------------------------|
| **WebSocket Server** | Socket.IO | 4.7+ | Production-ready, auto-fallback, room management | Native WebSocket, ws library |
| **Message Queue** | Amazon SQS + SNS | Latest | Serverless, integrates with Lambda, cost-effective | Apache Kafka, Redis Pub/Sub |
| **Real-time Cache** | Redis ElastiCache | 7.0+ | Sub-millisecond latency, pub/sub support | DynamoDB Streams, MemoryDB |
| **Event Processing** | AWS Lambda | Node.js 20.x | Serverless, auto-scaling, existing expertise | ECS Fargate, EC2 instances |
| **API Gateway** | AWS API Gateway v2 | Latest | WebSocket support, existing integration | ALB + NLB, Kong Gateway |
| **Monitoring** | CloudWatch + X-Ray | Latest | Native AWS integration, existing setup | DataDog, New Relic |
| **Alert Delivery** | Amazon SES + SNS | Latest | Multi-channel delivery, cost-effective | SendGrid, Twilio |

### 1.2 Architecture Decision Records (ADRs)

**ADR-001: WebSocket vs Server-Sent Events**
- **Decision**: WebSocket with Socket.IO
- **Rationale**: Bidirectional communication needed for user interactions, Socket.IO provides fallback mechanisms
- **Trade-offs**: More complex than SSE but enables richer real-time features

**ADR-002: Message Queue Strategy**
- **Decision**: SQS + SNS over Kafka
- **Rationale**: Serverless approach aligns with existing architecture, lower operational overhead
- **Trade-offs**: Higher latency than Kafka but better cost/complexity ratio

**ADR-003: Real-time Data Storage**
- **Decision**: Redis for hot data, existing PostgreSQL for historical
- **Rationale**: Redis provides sub-millisecond access for real-time queries
- **Trade-offs**: Additional infrastructure but necessary for performance requirements

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Mobile Apps    │    │  Trading Bots   │
│  (Web/Desktop)  │    │   (iOS/Android)  │    │   (API Only)    │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          └──────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     API Gateway v2      │
                    │  (WebSocket + REST)     │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼─────────┐ ┌─────▼─────┐ ┌─────────▼─────────┐
    │  WebSocket        │ │   REST    │ │   Alert Engine    │
    │  Connection       │ │   API     │ │   (Lambda)        │
    │  Manager          │ │ (Lambda)  │ │                   │
    │  (Lambda)         │ │           │ │                   │
    └─────────┬─────────┘ └─────┬─────┘ └─────────┬─────────┘
              │                 │                 │
              └─────────────────┼─────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Redis Cluster      │
                    │  (Real-time Cache)    │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Event Processor     │
                    │     (Lambda)          │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────▼─────────┐ ┌─────▼─────┐ ┌─────────▼─────────┐
    │   PostgreSQL      │ │ DynamoDB  │ │      SQS/SNS      │
    │  (Historical)     │ │ (Events)  │ │  (Message Queue)  │
    └───────────────────┘ └───────────┘ └───────────────────┘
```

### 2.2 Component Interaction Flow

**Real-time Data Flow:**
1. **Data Ingestion**: Existing adapters write to PostgreSQL + trigger events
2. **Event Processing**: Lambda processes changes, updates Redis cache
3. **Real-time Distribution**: WebSocket manager broadcasts to connected clients
4. **Alert Processing**: Alert engine evaluates rules, sends notifications

**Query Processing Flow:**
1. **Client Request**: Advanced filtering API request via REST/WebSocket
2. **Cache Check**: Redis cache lookup for hot data
3. **Database Query**: PostgreSQL query for complex aggregations
4. **Response Caching**: Cache results in Redis for future requests

## 3. Data Architecture

### 3.1 Data Flow and Storage Strategy

**Hot Data (Redis):**
- Current TVL values for all protocols
- Recent price changes (last 24 hours)
- Active user sessions and subscriptions
- Real-time aggregation results
- Alert rule configurations

**Warm Data (PostgreSQL):**
- Historical TVL and price data
- User profiles and preferences
- Alert history and delivery logs
- API usage analytics

**Cold Data (DynamoDB):**
- Raw event logs
- Audit trails
- Long-term analytics data

### 3.2 Real-time Data Synchronization

**Event-Driven Updates:**
```
Protocol Data Change → PostgreSQL → Lambda Trigger → Redis Update → WebSocket Broadcast
```

**Data Consistency Strategy:**
- **Eventually Consistent**: Real-time data may lag by 1-5 seconds
- **Conflict Resolution**: Last-write-wins for real-time updates
- **Reconciliation**: Hourly batch jobs ensure data consistency

## 4. Component and Integration Overview

### 4.1 Core Components

#### 4.1.1 WebSocket Connection Manager
**Purpose**: Manage real-time client connections and message routing
**Technology**: AWS Lambda + API Gateway WebSocket
**Responsibilities**:
- Client connection lifecycle management
- Room-based subscription management
- Message broadcasting and filtering
- Connection state persistence in Redis

#### 4.1.2 Real-time Event Processor
**Purpose**: Process data changes and generate real-time events
**Technology**: AWS Lambda (event-driven)
**Responsibilities**:
- Monitor PostgreSQL changes via triggers
- Update Redis cache with latest data
- Generate events for WebSocket distribution
- Trigger alert evaluations

#### 4.1.3 Alert Engine
**Purpose**: Evaluate alert rules and deliver notifications
**Technology**: AWS Lambda + SQS
**Responsibilities**:
- Rule evaluation against real-time data
- Multi-channel notification delivery
- Alert throttling and deduplication
- User preference management

#### 4.1.4 Advanced Query Processor
**Purpose**: Handle complex real-time queries
**Technology**: AWS Lambda + Redis + PostgreSQL
**Responsibilities**:
- Parse and optimize complex queries
- Coordinate between cache and database
- Real-time aggregation processing
- Result caching and invalidation

### 4.2 Integration Points

#### 4.2.1 Existing DeFi Service Integration
- **Data Source**: Existing protocol adapters continue writing to PostgreSQL
- **API Extension**: New WebSocket endpoints alongside existing REST APIs
- **Shared Authentication**: Leverage existing API key system
- **Monitoring**: Extend existing CloudWatch dashboards

#### 4.2.2 Coins Service Integration
- **Price Feeds**: Real-time price updates from existing Coins API
- **Cross-Service Events**: Price change events trigger TVL recalculations
- **Shared Cache**: Redis cluster shared between services

#### 4.2.3 External Service Integration
- **Webhook Delivery**: Alert notifications to external systems
- **API Consumers**: WebSocket feeds for trading bots and applications
- **Mobile Push**: Integration with mobile app notification systems

## 5. Implementation Guidance

### 5.1 Development Phases

**Phase 1: Foundation (Weeks 1-4)**
- Set up Redis cluster and WebSocket infrastructure
- Implement basic connection management
- Create event processing pipeline
- Basic protocol event streaming

**Phase 2: Intelligence (Weeks 5-8)**
- Implement alert engine with rule evaluation
- Add email and webhook notification delivery
- Create user preference management
- Basic threshold-based alerts

**Phase 3: Advanced Features (Weeks 9-12)**
- Implement advanced filtering API
- Add complex query processing
- Real-time aggregation capabilities
- Performance optimization

**Phase 4: Production Ready (Weeks 13-16)**
- Production hardening and monitoring
- Advanced alert features (ML-based)
- Mobile app integration
- Enterprise features and SLA

### 5.2 Migration Strategy

**Brownfield Integration Approach:**
1. **Parallel Deployment**: Deploy real-time components alongside existing services
2. **Gradual Rollout**: Enable real-time features for beta users first
3. **Feature Flags**: Use feature toggles for controlled rollout
4. **Fallback Mechanisms**: Maintain existing REST APIs as fallback
5. **Data Validation**: Compare real-time vs batch data for accuracy

## 6. Proposed Source Tree

```
defillama-server/
├── realtime/                          # New real-time package
│   ├── websocket/                      # WebSocket connection management
│   │   ├── connection-manager.ts       # Connection lifecycle
│   │   ├── room-manager.ts            # Subscription management
│   │   └── message-router.ts          # Message broadcasting
│   ├── events/                        # Event processing
│   │   ├── event-processor.ts         # Main event handler
│   │   ├── data-sync.ts              # Redis synchronization
│   │   └── event-types.ts            # Event definitions
│   ├── alerts/                        # Alert engine
│   │   ├── rule-engine.ts            # Alert rule evaluation
│   │   ├── notification-service.ts   # Multi-channel delivery
│   │   └── alert-types.ts            # Alert definitions
│   ├── query/                         # Advanced querying
│   │   ├── query-processor.ts        # Complex query handling
│   │   ├── cache-manager.ts          # Redis cache operations
│   │   └── aggregation-engine.ts     # Real-time aggregations
│   └── shared/                        # Shared utilities
│       ├── redis-client.ts           # Redis connection
│       ├── auth-middleware.ts        # Authentication
│       └── rate-limiter.ts           # Rate limiting
├── defi/                              # Existing DeFi service
│   └── src/
│       ├── adapters/                  # Enhanced with event triggers
│       └── api/                       # Extended with WebSocket endpoints
└── coins/                             # Existing Coins service
    └── src/
        └── api/                       # Enhanced with real-time price feeds
```

## 7. Testing Strategy

### 7.1 Testing Approach

**Unit Testing:**
- Individual Lambda functions with mocked dependencies
- Redis cache operations with test containers
- Alert rule evaluation logic
- Query processing algorithms

**Integration Testing:**
- WebSocket connection lifecycle
- End-to-end event processing pipeline
- Alert delivery mechanisms
- Cross-service data synchronization

**Performance Testing:**
- Load testing with 10,000+ concurrent WebSocket connections
- Latency testing for <100ms real-time updates
- Throughput testing for high-volume event processing
- Stress testing for traffic spikes

**Real-time Testing:**
- WebSocket connection stability over extended periods
- Message delivery reliability under network issues
- Alert delivery timing and accuracy
- Data consistency between cache and database

### 7.2 Testing Tools and Framework

- **Unit Tests**: Jest with TypeScript
- **Integration Tests**: Supertest for API testing
- **Load Testing**: Artillery.io for WebSocket load testing
- **Monitoring**: CloudWatch synthetic canaries
- **E2E Testing**: Playwright for client-side testing

## 8. Deployment and Operations

### 8.1 Infrastructure as Code

**AWS CDK Stack:**
```typescript
// Real-time Analytics Stack
- API Gateway v2 (WebSocket + HTTP)
- Lambda functions (Node.js 20.x)
- Redis ElastiCache cluster
- SQS queues and SNS topics
- CloudWatch dashboards and alarms
- IAM roles and policies
```

**Environment Strategy:**
- **Development**: Single-node Redis, reduced Lambda concurrency
- **Staging**: Production-like setup with synthetic load testing
- **Production**: Multi-AZ Redis cluster, auto-scaling Lambda

### 8.2 Deployment Pipeline

**CI/CD Workflow:**
1. **Code Commit**: GitHub Actions trigger on main branch
2. **Build & Test**: TypeScript compilation, unit tests, linting
3. **Integration Tests**: Deploy to staging, run integration tests
4. **Performance Tests**: Load testing with synthetic data
5. **Production Deploy**: Blue-green deployment with health checks
6. **Monitoring**: Automated rollback on error rate thresholds

### 8.3 Operational Monitoring

**Key Metrics:**
- WebSocket connection count and duration
- Message delivery latency (p95, p99)
- Alert delivery success rate
- Redis cache hit ratio
- Lambda error rates and duration

**Alerting Thresholds:**
- WebSocket connection failures >1%
- Message latency >200ms (p95)
- Alert delivery failures >0.1%
- Redis memory usage >80%
- Lambda error rate >0.5%

## 9. Security

### 9.1 Authentication and Authorization

**API Key Authentication:**
- Extend existing API key system for WebSocket connections
- JWT tokens for session management
- Rate limiting per API key tier
- IP whitelisting for enterprise customers

**WebSocket Security:**
- Origin validation for browser connections
- Connection authentication on handshake
- Message-level authorization for subscriptions
- Automatic disconnection on authentication failure

### 9.2 Data Security

**Data in Transit:**
- TLS 1.3 for all WebSocket connections
- Message encryption for sensitive data
- Certificate pinning for mobile apps
- VPC endpoints for internal communication

**Data at Rest:**
- Redis encryption at rest and in transit
- PostgreSQL encryption with AWS KMS
- Alert configuration encryption
- Audit log encryption

### 9.3 Security Monitoring

**Security Events:**
- Failed authentication attempts
- Unusual connection patterns
- Suspicious query patterns
- Alert rule manipulation attempts

**Compliance:**
- GDPR compliance for EU users
- SOC 2 Type II controls
- Regular security audits
- Penetration testing quarterly

## 10. Performance and Scalability

### 10.1 Performance Requirements

**Latency Targets:**
- WebSocket message delivery: <100ms (p95)
- Alert evaluation: <500ms
- Complex query processing: <2s
- Cache lookup: <5ms

**Throughput Targets:**
- 10,000+ concurrent WebSocket connections
- 1,000+ messages per second broadcast
- 100+ alerts per minute processing
- 10,000+ API requests per minute

### 10.2 Scaling Strategy

**Horizontal Scaling:**
- Lambda auto-scaling based on queue depth
- Redis cluster scaling with read replicas
- API Gateway automatic scaling
- Multi-region deployment for global users

**Vertical Scaling:**
- Redis memory scaling based on data growth
- Lambda memory optimization for performance
- Database connection pooling optimization
- CDN caching for static content

### 10.3 Cost Optimization

**Cost Management:**
- Reserved capacity for predictable workloads
- Spot instances for batch processing
- Data lifecycle policies for old events
- Monitoring and alerting on cost thresholds

---

## Architecture Decision Records (ADRs)

### ADR-004: Real-time Data Consistency Model
**Status**: Accepted
**Context**: Need to balance consistency with performance for real-time updates
**Decision**: Eventually consistent model with 1-5 second lag acceptable
**Consequences**: Improved performance, occasional data lag, need reconciliation processes

### ADR-005: WebSocket Room Management Strategy
**Status**: Accepted
**Context**: Need efficient message broadcasting to relevant subscribers
**Decision**: Redis-based room management with protocol/chain-based subscriptions
**Consequences**: Efficient broadcasting, Redis dependency, complex room logic

### ADR-006: Alert Delivery Reliability
**Status**: Accepted
**Context**: Critical alerts must be delivered reliably
**Decision**: SQS dead letter queues with exponential backoff retry
**Consequences**: High reliability, increased complexity, potential delayed delivery

---

*Generated using BMAD Method v6.0.0-alpha.0 Solution Architecture workflow*
