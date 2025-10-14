# 🚀 Story 1.1 Implementation Plan - WebSocket Connection Manager Foundation

**Story**: WebSocket Connection Manager Foundation  
**Epic**: On-Chain Services Platform (on-chain-services-v1)  
**Date**: October 14, 2025  
**Implementation Location**: `defi/` service  

---

## 📍 **IMPLEMENTATION LOCATION ANALYSIS**

### **Primary Implementation: `defi/` Service**

**Rationale:**
- DeFi service is the **main API service** với existing domain `api.llama.fi`
- Already has comprehensive serverless infrastructure với AWS Lambda
- Contains existing protocol và TVL data that WebSocket will stream
- Has established deployment patterns và CI/CD pipeline
- Existing `defi/serverless.yml` can be extended for WebSocket functions

### **Alternative Considered: New Service**
- ❌ **Rejected**: Would require new domain, infrastructure setup, và separate deployment
- ❌ **Complexity**: Additional operational overhead
- ❌ **Data Access**: Would need cross-service communication for protocol data

---

## 🏗️ **PROJECT STRUCTURE IMPLEMENTATION**

### **New Directories to Create in `defi/`:**

```
defi/
├── src/
│   ├── websocket/                    # 🆕 NEW - WebSocket components
│   │   ├── handlers/                 # Lambda function handlers
│   │   │   ├── connection.ts         # Connection lifecycle handler
│   │   │   ├── message.ts            # Message routing handler
│   │   │   └── index.ts              # Handler exports
│   │   ├── services/                 # Business logic services
│   │   │   ├── ConnectionManager.ts  # Connection state management
│   │   │   ├── RoomManager.ts        # Room subscription management
│   │   │   ├── MessageRouter.ts      # Message routing logic
│   │   │   └── AuthService.ts        # API key authentication
│   │   ├── utils/                    # WebSocket utilities
│   │   │   ├── redis.ts              # Redis client configuration
│   │   │   ├── dynamodb.ts           # DynamoDB operations
│   │   │   ├── apiGateway.ts         # API Gateway management client
│   │   │   └── types.ts              # TypeScript type definitions
│   │   └── __tests__/                # Unit tests
│   │       ├── ConnectionManager.test.ts
│   │       ├── RoomManager.test.ts
│   │       └── MessageRouter.test.ts
│   └── (existing directories...)
├── resources/                        # 🆕 NEW - Infrastructure resources
│   ├── websocket-api.yml            # API Gateway v2 WebSocket configuration
│   ├── redis-cluster.yml            # Redis ElastiCache configuration
│   └── (existing resource files...)
└── (existing files...)
```

---

## 📝 **SERVERLESS.YML MODIFICATIONS**

### **New Functions to Add:**

```yaml
# Add to defi/serverless.yml functions section:

functions:
  # ... existing functions ...
  
  # WebSocket Connection Handler
  websocketConnect:
    handler: src/websocket/handlers/connection.connectHandler
    timeout: 30
    memorySize: 512
    events:
      - websocket:
          route: $connect
    environment:
      REDIS_ENDPOINT: ${self:custom.redisEndpoint}
      CONNECTIONS_TABLE: ${self:custom.connectionsTable}
      
  websocketDisconnect:
    handler: src/websocket/handlers/connection.disconnectHandler
    timeout: 30
    memorySize: 512
    events:
      - websocket:
          route: $disconnect
    environment:
      REDIS_ENDPOINT: ${self:custom.redisEndpoint}
      CONNECTIONS_TABLE: ${self:custom.connectionsTable}
      
  websocketMessage:
    handler: src/websocket/handlers/message.messageHandler
    timeout: 30
    memorySize: 512
    events:
      - websocket:
          route: $default
    environment:
      REDIS_ENDPOINT: ${self:custom.redisEndpoint}
      CONNECTIONS_TABLE: ${self:custom.connectionsTable}
      
  websocketAuthorizer:
    handler: src/websocket/handlers/connection.authorizerHandler
    timeout: 10
    memorySize: 256

# Add to custom section:
custom:
  # ... existing custom config ...
  connectionsTable: ${self:custom.stage}-websocket-connections
  redisEndpoint: 
    Fn::GetAtt: [RedisCluster, RedisEndpoint.Address]

# Add to resources section:
resources:
  # ... existing resources ...
  - ${file(resources/websocket-api.yml)}
  - ${file(resources/redis-cluster.yml)}
```

---

## 🔧 **KEY IMPLEMENTATION FILES**

### **1. Connection Handler (`src/websocket/handlers/connection.ts`)**

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';
import { ConnectionManager } from '../services/ConnectionManager';
import { AuthService } from '../services/AuthService';

export const connectHandler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId!;
  const apiKey = event.queryStringParameters?.apiKey;
  
  try {
    // Authenticate connection
    const isValid = await AuthService.validateApiKey(apiKey);
    if (!isValid) {
      return { statusCode: 401, body: 'Unauthorized' };
    }
    
    // Store connection
    await ConnectionManager.addConnection(connectionId, { apiKey });
    
    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    console.error('Connection error:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

export const disconnectHandler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId!;
  
  try {
    await ConnectionManager.removeConnection(connectionId);
    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    console.error('Disconnect error:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
```

### **2. Connection Manager Service (`src/websocket/services/ConnectionManager.ts`)**

```typescript
import { DynamoDB } from 'aws-sdk';
import { Redis } from 'ioredis';
import { redisClient } from '../utils/redis';

export class ConnectionManager {
  private static dynamodb = new DynamoDB.DocumentClient();
  private static tableName = process.env.CONNECTIONS_TABLE!;
  
  static async addConnection(connectionId: string, metadata: any) {
    // Store in DynamoDB for persistence
    await this.dynamodb.put({
      TableName: this.tableName,
      Item: {
        connectionId,
        ...metadata,
        connectedAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours TTL
      }
    }).promise();
    
    // Store in Redis for fast access
    await redisClient.hset(
      'connections',
      connectionId,
      JSON.stringify(metadata)
    );
  }
  
  static async removeConnection(connectionId: string) {
    // Remove from DynamoDB
    await this.dynamodb.delete({
      TableName: this.tableName,
      Key: { connectionId }
    }).promise();
    
    // Remove from Redis
    await redisClient.hdel('connections', connectionId);
    
    // Remove from all rooms
    const rooms = await redisClient.smembers(`connection:${connectionId}:rooms`);
    for (const room of rooms) {
      await redisClient.srem(`room:${room}:connections`, connectionId);
    }
    await redisClient.del(`connection:${connectionId}:rooms`);
  }
}
```

### **3. Infrastructure Resources (`resources/websocket-api.yml`)**

```yaml
Resources:
  WebSocketApi:
    Type: AWS::ApiGatewayV2::Api
    Properties:
      Name: ${self:service}-websocket-${self:custom.stage}
      ProtocolType: WEBSOCKET
      RouteSelectionExpression: "$request.body.action"
      
  WebSocketStage:
    Type: AWS::ApiGatewayV2::Stage
    Properties:
      ApiId: !Ref WebSocketApi
      StageName: ${self:custom.stage}
      AutoDeploy: true
      
  ConnectionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: ${self:custom.connectionsTable}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: connectionId
          AttributeType: S
      KeySchema:
        - AttributeName: connectionId
          KeyType: HASH
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true

Outputs:
  WebSocketApiId:
    Value: !Ref WebSocketApi
  WebSocketApiEndpoint:
    Value: !Sub "wss://${WebSocketApi}.execute-api.${AWS::Region}.amazonaws.com/${self:custom.stage}"
```

---

## 🧪 **TESTING STRATEGY**

### **Unit Tests Location: `src/websocket/__tests__/`**

**Test Files:**
- `ConnectionManager.test.ts` - Connection lifecycle testing
- `RoomManager.test.ts` - Room subscription testing  
- `MessageRouter.test.ts` - Message routing testing
- `AuthService.test.ts` - API key validation testing

### **Integration Tests:**
- WebSocket connection establishment
- Redis operations
- DynamoDB operations
- API Gateway message routing

### **Load Testing:**
- Artillery.io configuration for 10,000+ concurrent connections
- Connection establishment latency testing
- Message routing performance testing

---

## 📦 **DEPENDENCIES TO ADD**

### **New Dependencies in `defi/package.json`:**

```json
{
  "dependencies": {
    "ioredis": "^5.3.2",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "@types/ws": "^8.5.8",
    "artillery": "^2.0.0"
  }
}
```

---

## 🚀 **DEPLOYMENT SEQUENCE**

### **Phase 1: Infrastructure Setup**
1. Create new directories và files
2. Add dependencies to package.json
3. Create infrastructure resource files
4. Update serverless.yml với new functions

### **Phase 2: Core Implementation**
1. Implement ConnectionManager service
2. Implement connection handlers
3. Add Redis client configuration
4. Add DynamoDB operations

### **Phase 3: Testing & Validation**
1. Unit tests implementation
2. Integration tests setup
3. Load testing configuration
4. Performance validation

### **Phase 4: Deployment**
1. Deploy to staging environment
2. Run comprehensive testing
3. Performance benchmarking
4. Production deployment

---

## 🔗 **INTEGRATION POINTS**

### **Existing DeFi Service Integration:**
- **API Key Validation**: Extend existing `src/api-keys/checkApiKey.ts`
- **Error Handling**: Use existing `src/utils/shared/lambda-response.ts` patterns
- **Monitoring**: Integrate với existing CloudWatch setup
- **CORS**: Follow existing CORS patterns from `src/corsPreflight.ts`

### **Data Access:**
- Access existing protocol data from DynamoDB tables
- Leverage existing TVL calculation functions
- Use existing chain mapping utilities from `common/chainToCoingeckoId.ts`

---

## 📊 **SUCCESS METRICS**

### **Technical Metrics:**
- ✅ 10,000+ concurrent connections supported
- ✅ <100ms connection establishment latency
- ✅ <50ms message routing latency
- ✅ 99.9% uptime SLA

### **Implementation Metrics:**
- ✅ All unit tests passing (90%+ coverage)
- ✅ Integration tests passing
- ✅ Load tests meeting performance targets
- ✅ Security validation complete

---

**This implementation plan provides a clear roadmap for implementing Story 1.1 within the existing DeFiLlama infrastructure, leveraging established patterns while adding new real-time capabilities.**
