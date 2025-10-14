# 🏗️ Technical Architecture - DeFiLlama On-Chain Services

**Epic**: On-Chain Services Platform (on-chain-services-v1)  
**Date**: October 14, 2025  
**Architect**: Luis  
**Version**: 1.0  

---

## 🎯 **ARCHITECTURE OVERVIEW**

### System Vision
Transform DeFiLlama's existing serverless architecture into a **real-time, event-driven platform** capable of processing and streaming on-chain data from 100+ blockchains to 10,000+ concurrent users with sub-100ms latency.

### Architecture Principles
- **Serverless-First**: Leverage AWS Lambda for auto-scaling and cost efficiency
- **Event-Driven**: Real-time data processing using event streams and pub/sub
- **Multi-Chain Native**: Support 100+ blockchains with unified data models
- **API-First**: RESTful and WebSocket APIs for all functionality
- **Microservices**: Loosely coupled services with clear boundaries

---

## 🏛️ **HIGH-LEVEL ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Dashboard  │  Mobile App  │  API Clients  │  Webhooks      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                             │
├─────────────────────────────────────────────────────────────────┤
│  CloudFront CDN  │  API Gateway v2  │  WebSocket Gateway        │
│  Rate Limiting   │  Authentication  │  Load Balancing           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  Real-time API   │  Analytics API   │  Alert Engine            │
│  WebSocket Mgr   │  Query Processor │  Notification Service    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PROCESSING LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  Event Processor │  Data Aggregator │  ML Analytics Engine     │
│  Risk Monitor    │  MEV Detector    │  Smart Money Tracker     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL      │  Redis Cache     │  S3 Data Lake            │
│  DynamoDB        │  ElastiSearch    │  Time Series DB          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BLOCKCHAIN LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  Ethereum RPC    │  Polygon RPC     │  BSC RPC                 │
│  Solana RPC      │  Arbitrum RPC    │  100+ Chain RPCs         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 **CORE COMPONENTS**

### 1. Real-time Data Streaming Engine

**Purpose**: Stream live blockchain data to connected clients via WebSocket

**Components**:
- **WebSocket Connection Manager** (AWS Lambda + API Gateway v2)
- **Event Stream Processor** (AWS Lambda + SQS)
- **Redis Pub/Sub** (ElastiCache)
- **Connection State Manager** (DynamoDB)

**Technology Stack**:
```typescript
// WebSocket Connection Handler
import { APIGatewayProxyHandler } from 'aws-lambda';
import { Redis } from 'ioredis';
import { DynamoDB } from 'aws-sdk';

export const connectionHandler: APIGatewayProxyHandler = async (event) => {
  const { connectionId, eventType } = event.requestContext;
  
  switch (eventType) {
    case 'CONNECT':
      return await handleConnect(connectionId, event);
    case 'DISCONNECT':
      return await handleDisconnect(connectionId);
    case 'MESSAGE':
      return await handleMessage(connectionId, event.body);
  }
};
```

**Scalability Requirements**:
- Support 10,000+ concurrent WebSocket connections
- Handle 1M+ messages per minute
- Sub-100ms message delivery latency
- Auto-scaling based on connection count

### 2. Multi-Chain Data Aggregation Service

**Purpose**: Collect, normalize, and aggregate data from 100+ blockchains

**Components**:
- **Chain Data Collectors** (AWS Lambda scheduled functions)
- **Data Normalizer** (AWS Lambda + SQS)
- **Cross-Chain Aggregator** (AWS Lambda)
- **Data Validator** (AWS Lambda)

**Data Flow**:
```
Blockchain RPCs → Data Collectors → SQS Queue → Normalizer → 
PostgreSQL → Aggregator → Redis Cache → API/WebSocket
```

**Technology Stack**:
```typescript
// Multi-Chain Data Collector
interface ChainDataCollector {
  chainId: string;
  rpcEndpoints: string[];
  collectTVL(): Promise<TVLData>;
  collectPrices(): Promise<PriceData>;
  collectVolumes(): Promise<VolumeData>;
}

class EthereumCollector implements ChainDataCollector {
  async collectTVL(): Promise<TVLData> {
    // Collect TVL data from Ethereum protocols
  }
}
```

### 3. Advanced Analytics Engine

**Purpose**: Process raw blockchain data into actionable insights

**Components**:
- **Metrics Calculator** (AWS Lambda)
- **Pattern Recognition** (AWS Lambda + ML models)
- **Smart Money Analyzer** (AWS Lambda + ML)
- **Risk Assessment Engine** (AWS Lambda)

**ML Pipeline**:
```
Raw Data → Feature Engineering → ML Models → Insights → 
Cache → API Endpoints
```

**Technology Stack**:
```python
# Smart Money Detection Model
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

class SmartMoneyDetector:
    def __init__(self):
        self.model = RandomForestClassifier()
    
    def analyze_wallet(self, wallet_address: str) -> SmartMoneyScore:
        features = self.extract_features(wallet_address)
        score = self.model.predict_proba(features)[0][1]
        return SmartMoneyScore(address=wallet_address, score=score)
```

### 4. Alert and Notification System

**Purpose**: Monitor conditions and deliver real-time notifications

**Components**:
- **Rule Engine** (AWS Lambda)
- **Condition Evaluator** (AWS Lambda + SQS)
- **Notification Dispatcher** (AWS Lambda + SNS)
- **Delivery Tracker** (DynamoDB)

**Alert Flow**:
```
Data Change → Rule Evaluation → Condition Match → 
Notification Queue → Delivery → Tracking
```

---

## 💾 **DATA ARCHITECTURE**

### Database Design

**PostgreSQL (Primary Database)**
```sql
-- Protocols table
CREATE TABLE protocols (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    chain_id INTEGER NOT NULL,
    category VARCHAR(100),
    tvl DECIMAL(20,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Real-time metrics table
CREATE TABLE protocol_metrics (
    id UUID PRIMARY KEY,
    protocol_id UUID REFERENCES protocols(id),
    metric_type VARCHAR(50) NOT NULL,
    value DECIMAL(20,8) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    chain_id INTEGER NOT NULL
);

-- User alerts table
CREATE TABLE user_alerts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    protocol_id UUID REFERENCES protocols(id),
    condition_type VARCHAR(50) NOT NULL,
    threshold_value DECIMAL(20,8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Redis Cache Structure**
```typescript
// Cache keys structure
interface CacheKeys {
  // Real-time data
  'realtime:tvl:{protocolId}': number;
  'realtime:price:{tokenId}': number;
  'realtime:volume:{protocolId}': number;
  
  // User subscriptions
  'subscriptions:{userId}': string[];
  'connections:{connectionId}': UserSession;
  
  // Analytics cache
  'analytics:smart_money:{walletAddress}': SmartMoneyScore;
  'analytics:risk:{protocolId}': RiskScore;
}
```

**DynamoDB Tables**
```typescript
// WebSocket connections table
interface ConnectionTable {
  connectionId: string; // Partition key
  userId: string;
  subscriptions: string[];
  connectedAt: number;
  lastActivity: number;
}

// User preferences table
interface UserPreferencesTable {
  userId: string; // Partition key
  alertPreferences: AlertPreferences;
  subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise';
  apiKeyHash: string;
}
```

### Data Flow Architecture

**Real-time Data Pipeline**:
```
Blockchain Events → Lambda Triggers → PostgreSQL → 
Redis Pub/Sub → WebSocket Clients
```

**Analytics Data Pipeline**:
```
Historical Data → ML Processing → Feature Store → 
Model Training → Inference → Cache → API
```

**Alert Processing Pipeline**:
```
Data Changes → Rule Engine → Condition Evaluation → 
Notification Queue → Multi-channel Delivery
```

---

## 🔌 **API ARCHITECTURE**

### REST API Design

**Base URL**: `https://api.llama.fi/v2/`

**Authentication**:
```typescript
// API Key authentication
interface AuthHeader {
  'X-API-Key': string;
  'Authorization': 'Bearer {jwt_token}';
}
```

**Core Endpoints**:
```typescript
// Protocol endpoints
GET /protocols                    // List all protocols
GET /protocols/{id}              // Get protocol details
GET /protocols/{id}/metrics      // Get protocol metrics
GET /protocols/{id}/analytics    // Get protocol analytics

// Real-time endpoints
GET /realtime/tvl               // Current TVL data
GET /realtime/prices            // Current price data
GET /realtime/volumes           // Current volume data

// Analytics endpoints
GET /analytics/smart-money      // Smart money insights
GET /analytics/risk/{protocol}  // Risk assessment
GET /analytics/mev              // MEV opportunities

// User endpoints
POST /alerts                    // Create alert
GET /alerts                     // List user alerts
PUT /alerts/{id}               // Update alert
DELETE /alerts/{id}            // Delete alert
```

### WebSocket API Design

**Connection URL**: `wss://api.llama.fi/v2/realtime`

**Message Protocol**:
```typescript
// Subscription message
interface SubscribeMessage {
  type: 'subscribe';
  channel: 'protocols' | 'prices' | 'volumes' | 'alerts';
  params: {
    protocolIds?: string[];
    tokenIds?: string[];
    userId?: string;
  };
}

// Data update message
interface DataUpdateMessage {
  type: 'update';
  channel: string;
  data: {
    id: string;
    value: number;
    timestamp: number;
    change24h?: number;
  };
}

// Alert message
interface AlertMessage {
  type: 'alert';
  alertId: string;
  condition: string;
  data: any;
  timestamp: number;
}
```

---

## 🚀 **DEPLOYMENT ARCHITECTURE**

### AWS Infrastructure

**Compute Services**:
- **AWS Lambda**: Serverless functions for all business logic
- **API Gateway v2**: WebSocket and REST API management
- **ECS Fargate**: Long-running ML model inference services

**Storage Services**:
- **RDS PostgreSQL**: Primary database with read replicas
- **ElastiCache Redis**: Caching and pub/sub messaging
- **DynamoDB**: WebSocket connections and user sessions
- **S3**: Data lake for historical data and ML training

**Networking**:
- **CloudFront**: Global CDN for API and static assets
- **VPC**: Isolated network environment
- **NAT Gateway**: Outbound internet access for Lambda functions

**Monitoring & Security**:
- **CloudWatch**: Logging, metrics, and alerting
- **X-Ray**: Distributed tracing
- **WAF**: Web application firewall
- **Secrets Manager**: API keys and database credentials

### Infrastructure as Code

**AWS CDK Stack**:
```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';

export class OnChainServicesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // WebSocket API
    const webSocketApi = new apigateway.WebSocketApi(this, 'WebSocketApi', {
      apiName: 'DeFiLlama-OnChain-WebSocket',
      description: 'Real-time data streaming API',
    });

    // Lambda functions (implemented in defi/src/websocket/)
    const connectionHandler = new lambda.Function(this, 'ConnectionHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'src/websocket/handlers/connection.connectHandler',
      code: lambda.Code.fromAsset('defi/'),
      environment: {
        REDIS_ENDPOINT: redis.attrRedisEndpointAddress,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    // API Gateway routes
    webSocketApi.addRoute('$connect', {
      integration: new WebSocketLambdaIntegration('ConnectIntegration', connectionHandler),
    });
  }
}
```

### Deployment Pipeline

**CI/CD Pipeline**:
```yaml
# GitHub Actions workflow
name: Deploy On-Chain Services
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to AWS
        run: |
          npm run cdk:deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## 📊 **PERFORMANCE & SCALABILITY**

### Performance Requirements

**Latency Targets**:
- WebSocket message delivery: <100ms
- REST API response time: <500ms
- Database query time: <200ms
- Cache hit ratio: >95%

**Throughput Targets**:
- 10,000+ concurrent WebSocket connections
- 1M+ API requests per day
- 100K+ messages per minute
- 1TB+ data processed daily

### Scalability Strategy

**Horizontal Scaling**:
- Lambda functions auto-scale based on demand
- RDS read replicas for read-heavy workloads
- Redis cluster mode for cache scaling
- API Gateway handles connection scaling

**Vertical Scaling**:
- RDS instance scaling for write-heavy workloads
- ElastiCache node scaling for memory requirements
- Lambda memory allocation optimization

**Cost Optimization**:
- Reserved instances for predictable workloads
- Spot instances for batch processing
- S3 lifecycle policies for data archival
- CloudWatch cost monitoring and alerts

---

## 🔒 **SECURITY ARCHITECTURE**

### Authentication & Authorization

**API Authentication**:
- JWT tokens for user authentication
- API keys for programmatic access
- Rate limiting per user/API key
- IP whitelisting for enterprise clients

**Authorization Model**:
```typescript
interface UserPermissions {
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  features: string[];
  rateLimits: {
    apiCalls: number;
    webSocketConnections: number;
    alerts: number;
  };
}
```

### Data Security

**Encryption**:
- TLS 1.3 for all API communications
- AES-256 encryption for data at rest
- Field-level encryption for sensitive data
- Key rotation policies

**Network Security**:
- VPC with private subnets
- Security groups with least privilege
- WAF rules for common attacks
- DDoS protection via CloudFront

### Compliance

**Data Privacy**:
- GDPR compliance for EU users
- Data retention policies
- User data deletion capabilities
- Privacy policy and terms of service

**Security Monitoring**:
- CloudTrail for API audit logs
- GuardDuty for threat detection
- Security Hub for compliance monitoring
- Incident response procedures

---

## 🔄 **DISASTER RECOVERY & MONITORING**

### Backup Strategy

**Database Backups**:
- RDS automated backups (7-day retention)
- Cross-region backup replication
- Point-in-time recovery capability
- Regular backup testing procedures

**Application Backups**:
- Lambda function versioning
- Infrastructure as Code in version control
- Configuration backup in S3
- Deployment rollback procedures

### Monitoring & Alerting

**Application Monitoring**:
```typescript
// CloudWatch custom metrics
const metrics = {
  'WebSocket/ActiveConnections': connectionCount,
  'API/ResponseTime': responseTime,
  'Database/QueryTime': queryTime,
  'Cache/HitRatio': cacheHitRatio,
};
```

**Alert Configuration**:
- High error rates (>1%)
- High latency (>500ms)
- Low cache hit ratio (<90%)
- Database connection issues
- Lambda function failures

### Health Checks

**Service Health Endpoints**:
```typescript
// Health check endpoint
GET /health
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "cache": "healthy",
    "websocket": "healthy",
    "external_apis": "healthy"
  },
  "timestamp": "2025-10-14T10:00:00Z"
}
```

---

**This technical architecture provides a robust, scalable foundation for DeFiLlama's transformation into a comprehensive on-chain services platform, capable of handling enterprise-scale workloads while maintaining the flexibility to evolve with changing requirements.**
