# Technical Specification: EPIC-1 Alerts & Notifications

**Document Version**: 1.0  
**Date**: 2025-10-17  
**Status**: Draft for Review  
**EPIC ID**: EPIC-1  
**EPIC Name**: Alerts & Notifications System

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-17 | Winston (Architect) | Initial draft |

**Approvers**:
- [ ] Product Manager
- [ ] Tech Lead
- [ ] Engineering Manager

**Distribution**: Engineering Team, Product Team, QA Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Features](#2-features)
3. [Architecture](#3-architecture)
4. [Data Model](#4-data-model)
5. [API Specification](#5-api-specification)
6. [Implementation Details](#6-implementation-details)
7. [Testing Strategy](#7-testing-strategy)
8. [Deployment](#8-deployment)

---

## 1. OVERVIEW

### 1.1 EPIC Summary

**EPIC-1: Alerts & Notifications** provides real-time monitoring and alerting capabilities for DeFi activities across 100+ blockchains.

**Business Value**: $7.5M ARR (30% of total)  
**Story Points**: 130 points  
**Timeline**: Q4 2025 (Months 1-3)  
**Priority**: P0 (Critical)

### 1.2 Features (5 Features)

| Feature ID | Feature Name | Story Points | Timeline |
|------------|--------------|--------------|----------|
| F1.1 | Whale Movement Alerts | 34 | Week 1-4 |
| F1.2 | Price Alerts Multi-Chain | 21 | Week 5-7 |
| F1.3 | Gas Fee Alerts | 13 | Week 8-9 |
| F1.4 | Protocol Risk Alerts | 21 | Week 10-12 |
| F1.5 | Alert Automation | 21 | Week 13-14 |

### 1.3 Success Metrics

- **User Adoption**: 80% of premium users create at least 1 alert
- **Alert Accuracy**: >95% true positive rate
- **Latency**: <30 seconds from event to notification
- **Uptime**: 99.9% availability
- **Engagement**: 60% of alerts result in user action

---

## 2. FEATURES

### 2.1 F1.1: Whale Movement Alerts

**Description**: Real-time alerts for large token transfers (whales)

**User Stories**:
- As a trader, I want to be notified when whales move >$1M in tokens
- As an investor, I want to track whale wallets I'm interested in
- As an analyst, I want to see whale movement patterns

**Acceptance Criteria**:
- ✅ Support 100+ chains
- ✅ Configurable threshold ($100K - $100M)
- ✅ Real-time notifications (<30s latency)
- ✅ Whale wallet tracking (up to 50 wallets)
- ✅ Historical whale movements (30 days)

**Technical Requirements**:
- Monitor blockchain events via RPC nodes
- Process 1M+ transactions/day
- Store whale movement history (30 days)
- Support multiple notification channels (email, webhook, push)

### 2.2 F1.2: Price Alerts Multi-Chain

**Description**: Price alerts for tokens across multiple chains

**User Stories**:
- As a trader, I want to be notified when ETH price crosses $2,000
- As an investor, I want price alerts for my portfolio tokens
- As a DeFi user, I want to track token prices across chains

**Acceptance Criteria**:
- ✅ Support 100+ chains
- ✅ Support 10,000+ tokens
- ✅ Multiple alert types (above, below, percentage change)
- ✅ Real-time price updates (<1 minute)
- ✅ Up to 100 price alerts per user

**Technical Requirements**:
- Integrate with price APIs (CoinGecko, DeFiLlama)
- Process 10K+ price updates/minute
- Support complex conditions (AND, OR, NOT)
- Cache hot prices in Redis

### 2.3 F1.3: Gas Fee Alerts

**Description**: Alerts for optimal gas fees

**User Stories**:
- As a trader, I want to be notified when gas fees drop below 20 gwei
- As a DeFi user, I want to optimize transaction costs
- As a developer, I want to schedule transactions during low gas

**Acceptance Criteria**:
- ✅ Support 10+ EVM chains
- ✅ Real-time gas price monitoring
- ✅ Predictive gas alerts (next 1-6 hours)
- ✅ Historical gas trends (7 days)

**Technical Requirements**:
- Monitor gas prices every 30 seconds
- ML model for gas prediction
- Store gas history (7 days)

### 2.4 F1.4: Protocol Risk Alerts

**Description**: Alerts for protocol security risks

**User Stories**:
- As an investor, I want to be notified of protocol exploits
- As a DeFi user, I want to know about TVL drops
- As a risk manager, I want to monitor protocol health

**Acceptance Criteria**:
- ✅ Monitor 3,000+ protocols
- ✅ Detect exploits, rug pulls, TVL drops
- ✅ Risk scoring (0-100)
- ✅ Real-time notifications (<5 minutes)

**Technical Requirements**:
- Integrate with security APIs (CertiK, Immunefi)
- Monitor TVL changes (>20% drop)
- Detect unusual contract activity

### 2.5 F1.5: Alert Automation

**Description**: Automated alert actions

**User Stories**:
- As a trader, I want to auto-execute trades on price alerts
- As a DeFi user, I want to auto-withdraw on risk alerts
- As a developer, I want to trigger webhooks on alerts

**Acceptance Criteria**:
- ✅ Support webhook actions
- ✅ Support email/push notifications
- ✅ Support conditional actions (if-then-else)
- ✅ Action history and logs

**Technical Requirements**:
- Action execution engine
- Retry logic (3 retries)
- Action logs (30 days)

---

## 3. ARCHITECTURE

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ALERTS SERVICE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Alert Rules  │  │ Event        │  │ Notification │     │
│  │ Controller   │  │ Processor    │  │ Dispatcher   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Rule Engine  │  │ Event Queue  │  │ Notification │     │
│  │ Service      │  │ (SQS)        │  │ Service      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Premium DB   │  │ Redis Cache  │  │ Email/Push   │     │
│  │ (PostgreSQL) │  │              │  │ Webhook      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Components

**Alert Rules Controller**:
- REST API for CRUD operations on alert rules
- Input validation and sanitization
- Authentication and authorization

**Event Processor**:
- Consumes blockchain events from SQS
- Evaluates alert rules against events
- Triggers notifications for matched rules

**Notification Dispatcher**:
- Sends notifications via multiple channels
- Retry logic for failed notifications
- Rate limiting per user

**Rule Engine Service**:
- Evaluates complex alert conditions
- Supports AND, OR, NOT operators
- Caches hot rules in Redis

---

## 4. DATA MODEL

### 4.1 Database Schema

```sql
-- Alert Rules
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'whale', 'price', 'gas', 'protocol_risk'
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_user_id ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_type ON alert_rules(type);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);

-- Alert History
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  event_data JSONB NOT NULL,
  triggered_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX idx_alert_history_triggered_at ON alert_history(triggered_at);

-- Notification Logs
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_history_id UUID NOT NULL REFERENCES alert_history(id),
  channel VARCHAR(50) NOT NULL, -- 'email', 'webhook', 'push'
  status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'pending'
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_status ON notification_logs(status);
```

### 4.2 Alert Rule Conditions (JSONB)

**Whale Movement Alert**:
```json
{
  "type": "whale_movement",
  "chain": "ethereum",
  "token": "ETH",
  "threshold": 1000000,
  "wallets": ["0x123...", "0x456..."]
}
```

**Price Alert**:
```json
{
  "type": "price",
  "chain": "ethereum",
  "token": "ETH",
  "condition": "above",
  "price": 2000
}
```

**Gas Alert**:
```json
{
  "type": "gas",
  "chain": "ethereum",
  "condition": "below",
  "gas_price": 20
}
```

---

## 5. API SPECIFICATION

### 5.1 REST API Endpoints

**Create Alert Rule**:
```
POST /v1/alerts/rules
Authorization: Bearer <JWT>

Request Body:
{
  "name": "ETH Whale Alert",
  "type": "whale_movement",
  "conditions": { ... },
  "actions": { ... }
}

Response (201 Created):
{
  "success": true,
  "data": {
    "id": "rule_123",
    "name": "ETH Whale Alert",
    "type": "whale_movement",
    "enabled": true,
    "created_at": "2025-10-17T10:00:00Z"
  }
}
```

**List Alert Rules**:
```
GET /v1/alerts/rules?type=whale_movement&enabled=true
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "rule_123",
      "name": "ETH Whale Alert",
      "type": "whale_movement",
      "enabled": true
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "pageSize": 20
  }
}
```

**Get Alert History**:
```
GET /v1/alerts/history?limit=50
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "alert_123",
      "ruleId": "rule_123",
      "eventData": { ... },
      "triggeredAt": "2025-10-17T10:00:00Z"
    }
  ]
}
```

### 5.2 WebSocket API

**Connect**:
```
ws://api.defillama.com/v1/alerts/stream?token=<JWT>
```

**Subscribe to Alerts**:
```json
{
  "type": "subscribe",
  "channel": "alerts",
  "userId": "user_123"
}
```

**Receive Alert**:
```json
{
  "type": "alert",
  "data": {
    "alertId": "alert_123",
    "ruleId": "rule_456",
    "message": "Whale alert: 1000 ETH transferred",
    "timestamp": "2025-10-17T10:00:00Z"
  }
}
```

---

## 6. IMPLEMENTATION DETAILS

### 6.1 Technology Stack

- **Framework**: NestJS 10.3+
- **Language**: TypeScript 5.3+
- **Database**: PostgreSQL 16+
- **Cache**: Redis 7+
- **Queue**: AWS SQS
- **Notifications**: SendGrid (email), Firebase (push), Webhooks

### 6.2 Key Classes

**AlertRulesController**:
```typescript
@Controller('v1/alerts/rules')
export class AlertRulesController {
  @Post()
  async createRule(@Body() dto: CreateAlertRuleDto) { ... }
  
  @Get()
  async listRules(@Query() query: ListRulesQuery) { ... }
  
  @Put(':id')
  async updateRule(@Param('id') id: string, @Body() dto: UpdateAlertRuleDto) { ... }
  
  @Delete(':id')
  async deleteRule(@Param('id') id: string) { ... }
}
```

**EventProcessor**:
```typescript
@Injectable()
export class EventProcessor {
  async processEvent(event: BlockchainEvent): Promise<void> {
    const rules = await this.getRulesForEvent(event);
    for (const rule of rules) {
      if (this.evaluateRule(rule, event)) {
        await this.triggerAlert(rule, event);
      }
    }
  }
}
```

### 6.3 Rate Limiting Details

**Per-User Rate Limits**:

| Tier | Alert Rules | Alerts/Day | Alerts/Hour | Webhooks/Hour |
|------|-------------|------------|-------------|---------------|
| **Starter** | 10 rules | 100 alerts | 10 alerts | 50 webhooks |
| **Pro** | 50 rules | 1,000 alerts | 100 alerts | 500 webhooks |
| **Enterprise** | Unlimited | Unlimited | 1,000 alerts | 5,000 webhooks |

**Implementation**:
```typescript
@Injectable()
export class RateLimiterService {
  async checkRateLimit(
    userId: string,
    tier: string,
    action: 'alert' | 'webhook'
  ): Promise<boolean> {
    const key = `rate_limit:${userId}:${action}:${Date.now()}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 3600); // 1 hour TTL

    const limits = {
      starter: { alert: 10, webhook: 50 },
      pro: { alert: 100, webhook: 500 },
      enterprise: { alert: 1000, webhook: 5000 }
    };

    return count <= limits[tier][action];
  }
}
```

**Rate Limit Response**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Upgrade to Pro for higher limits.",
    "retryAfter": 3600
  }
}
```

### 6.4 Webhook Retry Logic

**Retry Strategy**:
- **Retry Attempts**: 5 attempts (exponential backoff)
- **Retry Delays**: 1s, 5s, 25s, 125s, 625s (~10 minutes total)
- **Timeout**: 30s per attempt
- **Success Criteria**: HTTP 2xx response
- **Failure Criteria**: HTTP 4xx/5xx or timeout

**Implementation**:
```typescript
@Injectable()
export class WebhookService {
  async sendWebhook(
    url: string,
    payload: any,
    attempt: number = 1
  ): Promise<void> {
    try {
      const response = await axios.post(url, payload, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status >= 200 && response.status < 300) {
        await this.logSuccess(url, payload);
        return;
      }
    } catch (error) {
      if (attempt < 5) {
        const delay = Math.pow(5, attempt) * 1000; // Exponential backoff
        await this.scheduleRetry(url, payload, attempt + 1, delay);
      } else {
        await this.logFailure(url, payload, error);
      }
    }
  }
}
```

**Webhook Delivery Guarantees**:
- **At-Least-Once Delivery**: Webhooks may be delivered multiple times
- **Idempotency**: Webhooks include `X-Webhook-ID` header for deduplication
- **Signature**: Webhooks include `X-Webhook-Signature` header (HMAC-SHA256)

**Webhook Payload**:
```json
{
  "id": "webhook_123",
  "timestamp": "2025-10-17T10:00:00Z",
  "type": "alert.triggered",
  "data": {
    "alertId": "alert_456",
    "ruleId": "rule_789",
    "message": "Whale alert: 1000 ETH transferred",
    "chain": "ethereum",
    "txHash": "0x123..."
  }
}
```

---

## 7. TESTING STRATEGY

### 7.1 Unit Tests

- Test alert rule CRUD operations
- Test rule evaluation logic
- Test notification dispatching
- Target: 80% code coverage

### 7.2 Integration Tests

- Test end-to-end alert flow
- Test WebSocket connections
- Test notification delivery
- Test database operations

### 7.3 Load Tests

- Test 1M+ events/day processing
- Test 10K concurrent WebSocket connections
- Test notification rate limits

---

## 8. DEPLOYMENT

### 8.1 Infrastructure

- **Lambda**: Alert Rules API (auto-scaling)
- **ECS Fargate**: Event Processor (long-running)
- **SQS**: Event queue (standard queue)
- **RDS**: PostgreSQL (db.r6g.xlarge)
- **ElastiCache**: Redis (cache.r6g.large)

### 8.2 Deployment Strategy

- Blue-green deployment
- Canary deployment for high-risk changes
- Rollback plan: Switch traffic back to blue

---

**END OF DOCUMENT**

