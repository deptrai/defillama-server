# Story 3.2.2: Suspicious Activity Detection - Enhancements Plan

## Overview

**Story**: 3.2.2 - Suspicious Activity Detection - Enhancements  
**Status**: 🚧 IN PROGRESS  
**Estimated Duration**: 15 days  

## Enhancement Requirements

1. ✅ Integrate with real blockchain data sources (Etherscan, etc.)
2. ⏳ Implement email/webhook/push notification services
3. ⏳ Add dashboard for monitoring suspicious activities
4. ⏳ Add integration tests and E2E tests

## Implementation Plan

### Phase 1: Blockchain Data Integration (5 days) - IN PROGRESS

#### Completed ✅
1. ✅ Created `etherscan-service.ts` (300 lines)
   - Etherscan API integration
   - Rate limiting (5 requests/second)
   - Redis caching (5-minute TTL)
   - Support for transactions, token transfers, events, balances

2. ✅ Created `blockchain-data-service.ts` (300 lines)
   - Unified interface for blockchain data
   - Converts Etherscan data to standard format
   - Support for wallet info, transactions, token transfers, events
   - Placeholder for liquidity pool data and price history

3. ✅ Updated `rug-pull-detector.ts`
   - Added BlockchainDataService dependency
   - Ready to integrate with real data

#### Remaining Tasks
1. ⏳ Update `getProtocolData` method in rug-pull-detector.ts
   - Fetch liquidity pool data from blockchain
   - Analyze token transfers for dumps
   - Monitor contract events for manipulation

2. ⏳ Update `checkLiquidityRemoval` method
   - Use real liquidity pool data
   - Calculate actual liquidity changes
   - Track historical liquidity

3. ⏳ Update `checkTokenDump` method
   - Analyze real token transfers
   - Calculate actual sell pressure
   - Track price impact

4. ⏳ Update `checkContractManipulation` method
   - Monitor real contract events
   - Detect ownership transfers
   - Detect pause/upgrade events

5. ⏳ Update wash-trading-detector.ts
   - Integrate with blockchain data service
   - Analyze real transaction patterns
   - Detect circular trading

6. ⏳ Update pump-dump-detector.ts
   - Integrate with blockchain data service
   - Analyze real price movements
   - Detect coordinated trading

7. ⏳ Update sybil-attack-detector.ts
   - Integrate with blockchain data service
   - Analyze real wallet relationships
   - Detect behavior patterns

8. ⏳ Create integration tests
   - Test with real Etherscan API
   - Test caching behavior
   - Test rate limiting

### Phase 2: Notification Services (3 days)

#### Tasks
1. ⏳ Create `notification-service.ts` (400 lines)
   - Email service integration (SendGrid)
   - Webhook delivery with retry logic
   - Push notification integration (Firebase)
   - Template management

2. ⏳ Update `suspicious-activity-alert-manager.ts`
   - Replace mock implementations
   - Use real notification service
   - Add error handling and retry logic

3. ⏳ Create notification templates
   - Email templates (HTML + text)
   - Push notification templates
   - Webhook payload templates

4. ⏳ Create integration tests
   - Test email delivery
   - Test webhook delivery
   - Test push notifications
   - Test retry logic

### Phase 3: Monitoring Dashboard (4 days)

#### Tasks
1. ⏳ Create `dashboard-handlers.ts` (500 lines)
   - Statistics aggregation
   - Trend analysis
   - Recent activities feed
   - Protocol breakdown
   - Severity distribution

2. ⏳ Create dashboard API endpoints
   - GET /analytics/suspicious-activities/dashboard/stats
   - GET /analytics/suspicious-activities/dashboard/trends
   - GET /analytics/suspicious-activities/dashboard/recent
   - GET /analytics/suspicious-activities/dashboard/protocols
   - GET /analytics/suspicious-activities/dashboard/severity

3. ⏳ Add real-time monitoring
   - WebSocket support for live updates
   - Activity feed
   - Alert notifications

4. ⏳ Create dashboard tests
   - Test statistics calculation
   - Test trend analysis
   - Test real-time updates

### Phase 4: Testing & Documentation (3 days)

#### Tasks
1. ⏳ Create integration tests
   - Test detection engines with real data
   - Test alert system with notifications
   - Test API endpoints with database

2. ⏳ Create E2E tests
   - Test complete detection workflow
   - Test API endpoints with real requests
   - Test alert delivery
   - Test dashboard endpoints

3. ⏳ Create performance tests
   - Test detection engine performance
   - Test API endpoint response times
   - Test database query performance
   - Test concurrent request handling

4. ⏳ Create load tests
   - Test system under high load
   - Test rate limiting
   - Test caching effectiveness

5. ⏳ Update documentation
   - Enhancement summary
   - API documentation
   - Configuration guide
   - Deployment guide

## Technical Decisions

### Blockchain Data Integration

**Decision 1: Use Etherscan API**
- **Rationale**: Most reliable and comprehensive API for Ethereum data
- **Alternatives**: Alchemy, Infura, The Graph
- **Trade-offs**: Rate limits (5 req/sec), requires API key

**Decision 2: Redis Caching**
- **Rationale**: Reduce API calls, improve performance
- **TTL**: 5 minutes for most data, 1 minute for balances
- **Trade-offs**: Slightly stale data, requires Redis instance

**Decision 3: Unified Interface**
- **Rationale**: Abstract away blockchain-specific details
- **Benefits**: Easy to add support for other chains
- **Trade-offs**: Additional abstraction layer

### Notification Services

**Decision 1: SendGrid for Email**
- **Rationale**: Reliable, good deliverability, easy integration
- **Alternatives**: AWS SES, Mailgun
- **Trade-offs**: Cost, requires API key

**Decision 2: Firebase for Push Notifications**
- **Rationale**: Cross-platform support, reliable
- **Alternatives**: OneSignal, Pusher
- **Trade-offs**: Requires Firebase project setup

**Decision 3: Retry Logic**
- **Rationale**: Handle transient failures
- **Strategy**: Exponential backoff, max 3 retries
- **Trade-offs**: Delayed delivery on failures

### Dashboard

**Decision 1: Server-Side Aggregation**
- **Rationale**: Better performance, less client-side processing
- **Benefits**: Faster response times, reduced data transfer
- **Trade-offs**: More server load

**Decision 2: WebSocket for Real-Time**
- **Rationale**: Efficient for live updates
- **Alternatives**: Polling, Server-Sent Events
- **Trade-offs**: More complex implementation

## Environment Variables Required

```bash
# Etherscan API
ETHERSCAN_API_KEY=your_api_key_here
ETHERSCAN_BASE_URL=https://api.etherscan.io/api

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# SendGrid
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=alerts@example.com
SENDGRID_FROM_NAME=DeFiLlama Alerts

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Webhook
WEBHOOK_RETRY_MAX_ATTEMPTS=3
WEBHOOK_RETRY_DELAY_MS=1000
```

## Dependencies to Add

```json
{
  "dependencies": {
    "@sendgrid/mail": "^7.7.0",
    "firebase-admin": "^11.11.0",
    "axios": "^1.6.0",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@types/ioredis": "^5.0.0"
  }
}
```

## Metrics

### Code Metrics (Estimated)
- **Total Lines of Code**: ~2,500 lines
- **Blockchain Integration**: ~800 lines
- **Notification Services**: ~600 lines
- **Dashboard**: ~700 lines
- **Tests**: ~400 lines

### Test Metrics (Target)
- **Integration Tests**: 50+ tests
- **E2E Tests**: 20+ tests
- **Performance Tests**: 10+ tests
- **Load Tests**: 5+ tests

## Risks & Mitigation

### Risk 1: API Rate Limits
- **Impact**: High
- **Probability**: Medium
- **Mitigation**: Redis caching, rate limiting, fallback to mock data

### Risk 2: API Costs
- **Impact**: Medium
- **Probability**: High
- **Mitigation**: Caching, batch requests, usage monitoring

### Risk 3: Data Accuracy
- **Impact**: High
- **Probability**: Low
- **Mitigation**: Data validation, error handling, logging

### Risk 4: Notification Delivery Failures
- **Impact**: Medium
- **Probability**: Medium
- **Mitigation**: Retry logic, error logging, fallback channels

## Next Steps

1. ✅ Complete blockchain data service implementation
2. ⏳ Update detection engines to use real data
3. ⏳ Implement notification services
4. ⏳ Create dashboard endpoints
5. ⏳ Add comprehensive tests
6. ⏳ Update documentation

## Status

**Current Phase**: Phase 1 - Blockchain Data Integration (Day 1/5)  
**Overall Progress**: 20% (3/15 days)  
**Blockers**: None  
**Next Milestone**: Complete detection engine integration (Day 5)

