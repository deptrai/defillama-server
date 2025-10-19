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
**Story Points**: 150 points
**Timeline**: Q4 2025 (Months 1-3, 22 weeks)
**Priority**: P0 (Critical)

### 1.2 Features (5 Features + Infrastructure)

| Feature ID | Feature Name | Story Points | Timeline |
|------------|--------------|--------------|----------|
| F-001 | Whale Movement Alerts | 34 | Week 1-4 |
| F-002 | Price Alerts Multi-Chain | 21 | Week 5-7 |
| F-003 | Gas Fee Alerts | 13 | Week 8-9 |
| F-004 | Protocol Risk Alerts | 21 | Week 10-12 |
| F-005 | Alert Automation | 21 | Week 13-14 |
| | **Infrastructure** | 20 | Week 15-16 |
| | **Testing** | 10 | Week 17-18 |
| | **UI/UX** | 10 | Week 19-20 |

**Total**: 150 story points, 20 weeks development + 2 weeks testing/deployment

### 1.3 Success Metrics

- **User Adoption**: 80% of premium users create at least 1 alert
- **Alert Accuracy**: >95% true positive rate
- **Latency**: <30 seconds from event to notification
- **Uptime**: 99.9% availability
- **Engagement**: 60% of alerts result in user action

---

## 2. FEATURES

### 2.1 F-001: Whale Movement Alerts

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

### 2.2 F-002: Price Alerts Multi-Chain

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

### 2.3 F-003: Gas Fee Alerts

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

### 2.4 F-004: Protocol Risk Alerts

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

### 2.5 F-005: Alert Automation

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

### 4.1 Database Schema (✅ ALIGNED WITH EXISTING PATTERN)

**Based on**: `defi/src/alerts/db.ts` (existing alerts module)

```sql
-- Alert Rules (✅ ALIGNED WITH ACTUAL IMPLEMENTATION)
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- String user ID (not UUID reference)
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Alert configuration
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'whale_movement',
    'price_change',
    'gas_spike',
    'protocol_risk',
    'tvl_change',
    'volume_spike'
  )),

  -- Optional filters
  protocol_id VARCHAR(255),
  token_id VARCHAR(255),
  chain_id VARCHAR(50),

  -- Condition (JSONB)
  condition JSONB NOT NULL,

  -- Notification channels (array)
  channels TEXT[] NOT NULL DEFAULT '{}',
  webhook_url VARCHAR(512),

  -- Throttling
  throttle_minutes INTEGER DEFAULT 5,

  -- Status
  enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alert_rules_user_id ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_alert_type ON alert_rules(alert_type);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX idx_alert_rules_protocol_id ON alert_rules(protocol_id) WHERE protocol_id IS NOT NULL;
CREATE INDEX idx_alert_rules_token_id ON alert_rules(token_id) WHERE token_id IS NOT NULL;
CREATE INDEX idx_alert_rules_chain_id ON alert_rules(chain_id) WHERE chain_id IS NOT NULL;

-- Alert History (✅ ALIGNED WITH ACTUAL IMPLEMENTATION)
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,

  -- Event data
  event_data JSONB NOT NULL,

  -- Notification status
  notification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  notification_error TEXT,

  -- Timestamps
  triggered_at TIMESTAMP DEFAULT NOW(),
  notified_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_alert_history_rule_id ON alert_history(rule_id);
CREATE INDEX idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX idx_alert_history_triggered_at ON alert_history(triggered_at);
CREATE INDEX idx_alert_history_notification_status ON alert_history(notification_status);

-- Notification Logs (Optional - for detailed tracking)
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_history_id UUID NOT NULL REFERENCES alert_history(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL, -- 'email', 'telegram', 'discord', 'webhook'
  status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'pending'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notification_logs_alert_history_id ON notification_logs(alert_history_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_channel ON notification_logs(channel);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alert_rules_updated_at
BEFORE UPDATE ON alert_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Key Differences from Original**:
1. ✅ `user_id` is `VARCHAR(255)` (not UUID reference) - follows existing pattern
2. ✅ `alert_type` instead of `type` - clearer naming
3. ✅ `condition` (singular) instead of `conditions` - matches implementation
4. ✅ `channels` is `TEXT[]` (array) instead of JSONB - simpler
5. ✅ Added `throttle_minutes` - prevent spam
6. ✅ Added `description` - user-friendly
7. ✅ Added partial indexes for optional fields - performance optimization

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

**Create Alert Rule** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
POST /v2/premium/alerts
Authorization: Bearer <JWT>

Request Body:
{
  "name": "ETH Whale Alert",
  "alert_type": "whale_movement",
  "protocol_id": null,
  "token_id": "ethereum:0x0000000000000000000000000000000000000000",
  "chain_id": "ethereum",
  "condition": {
    "threshold": 1000000,
    "operator": "gt"
  },
  "channels": ["email", "telegram"],
  "webhook_url": "https://example.com/webhook",
  "throttle_minutes": 5,
  "enabled": true
}

Response (201 Created):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-123",
    "name": "ETH Whale Alert",
    "alert_type": "whale_movement",
    "condition": {
      "threshold": 1000000,
      "operator": "gt"
    },
    "channels": ["email", "telegram"],
    "enabled": true,
    "created_at": "2025-10-17T10:00:00Z",
    "updated_at": "2025-10-17T10:00:00Z"
  }
}
```

**List Alert Rules** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
GET /v2/premium/alerts?alert_type=whale_movement&enabled=true&limit=20&offset=0
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "rules": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "ETH Whale Alert",
        "alert_type": "whale_movement",
        "enabled": true,
        "created_at": "2025-10-17T10:00:00Z"
      }
    ],
    "total": 10
  }
}
```

**Get Alert History** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
GET /v2/premium/alerts/history?limit=50&offset=0
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": "alert-history-123",
      "rule_id": "550e8400-e29b-41d4-a716-446655440000",
      "event_data": {
        "chain": "ethereum",
        "token": "ETH",
        "amount": 1500000,
        "from": "0x123...",
        "to": "0x456..."
      },
      "triggered_at": "2025-10-17T10:00:00Z"
    }
  ]
}
```

**Update Alert Rule** (✅ NEW - ALIGNED WITH ACTUAL IMPLEMENTATION):
```
PUT /v2/premium/alerts/{id}
Authorization: Bearer <JWT>

Request Body:
{
  "name": "Updated Whale Alert",
  "enabled": false
}

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Whale Alert",
    "enabled": false,
    "updated_at": "2025-10-17T11:00:00Z"
  }
}
```

**Delete Alert Rule** (✅ NEW - ALIGNED WITH ACTUAL IMPLEMENTATION):
```
DELETE /v2/premium/alerts/{id}
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "message": "Alert rule deleted successfully"
}
```

### 5.2 WebSocket API

**Connect**:
```
ws://api.defillama.com/v2/premium/alerts/stream?token=<JWT>
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

## 9. POST-REVIEW IMPROVEMENTS (2025-10-19)

**Source**: Engineering Lead, DevOps Lead, Security Lead Reviews

### 9.1 Critical Security Requirements

#### 9.1.1 Rate Limiting (🔴 CRITICAL)

**Requirement**: Implement rate limiting for alert processing to prevent alert storms

**Implementation**:

```typescript
// src/alerts/middleware/rate-limit.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '@/common/services/redis.service';

@Injectable()
export class AlertRateLimitMiddleware implements NestMiddleware {
  constructor(private readonly redis: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const userId = req.user.id;
    const key = `alert:rate_limit:${userId}`;

    // Get current count
    const count = await this.redis.incr(key);

    // Set expiry on first request
    if (count === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }

    // Check limits
    const limit = 100; // 100 alerts/minute
    const burst = 200; // 200 alerts/minute burst

    if (count > burst) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Alert rate limit exceeded. Maximum 100 alerts/minute, 200 burst.',
        retryAfter: await this.redis.ttl(key)
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count).toString());
    res.setHeader('X-RateLimit-Reset', (Date.now() + await this.redis.ttl(key) * 1000).toString());

    next();
  }
}
```

**AWS WAF Configuration**:

```yaml
# infrastructure/waf-rules.yml
AlertRateLimitRule:
  Name: AlertRateLimitRule
  Priority: 1
  Statement:
    RateBasedStatement:
      Limit: 100
      AggregateKeyType: IP
      ScopeDownStatement:
        ByteMatchStatement:
          SearchString: /api/v2/alerts
          FieldToMatch:
            UriPath: {}
          TextTransformations:
            - Priority: 0
              Type: LOWERCASE
  Action:
    Block:
      CustomResponse:
        ResponseCode: 429
        CustomResponseBodyKey: RateLimitExceeded
  VisibilityConfig:
    SampledRequestsEnabled: true
    CloudWatchMetricsEnabled: true
    MetricName: AlertRateLimitRule
```

**Timeline**: Phase 1 (Q4 2025, Month 2)
**Owner**: Backend Engineer

---

#### 9.1.2 Audit Logging (🔴 CRITICAL)

**Requirement**: Log all alert creation, modification, deletion events

**Implementation**:

```typescript
// src/alerts/services/alert-audit.service.ts
import { Injectable } from '@nestjs/common';
import { CloudWatchLogsService } from '@/common/services/cloudwatch-logs.service';

@Injectable()
export class AlertAuditService {
  constructor(private readonly cloudwatch: CloudWatchLogsService) {}

  async logAlertCreated(userId: string, alertId: string, alertData: any) {
    await this.cloudwatch.putLogEvents({
      logGroupName: '/aws/lambda/alerts-api',
      logStreamName: 'alert-audit',
      logEvents: [{
        timestamp: Date.now(),
        message: JSON.stringify({
          event: 'ALERT_CREATED',
          userId,
          alertId,
          alertData,
          timestamp: new Date().toISOString(),
          correlationId: this.getCorrelationId()
        })
      }]
    });
  }

  async logAlertModified(userId: string, alertId: string, changes: any) {
    await this.cloudwatch.putLogEvents({
      logGroupName: '/aws/lambda/alerts-api',
      logStreamName: 'alert-audit',
      logEvents: [{
        timestamp: Date.now(),
        message: JSON.stringify({
          event: 'ALERT_MODIFIED',
          userId,
          alertId,
          changes,
          timestamp: new Date().toISOString(),
          correlationId: this.getCorrelationId()
        })
      }]
    });
  }

  async logAlertDeleted(userId: string, alertId: string) {
    await this.cloudwatch.putLogEvents({
      logGroupName: '/aws/lambda/alerts-api',
      logStreamName: 'alert-audit',
      logEvents: [{
        timestamp: Date.now(),
        message: JSON.stringify({
          event: 'ALERT_DELETED',
          userId,
          alertId,
          timestamp: new Date().toISOString(),
          correlationId: this.getCorrelationId()
        })
      }]
    });
  }

  private getCorrelationId(): string {
    // Get correlation ID from request context
    return 'correlation-id-from-context';
  }
}
```

**Retention Policy**:
- CloudWatch Logs: 1 year
- S3 Archival: After 1 year (for compliance)

**Timeline**: Phase 1 (Q4 2025, Month 2)
**Owner**: DevOps Engineer

---

### 9.2 High Priority Improvements

#### 9.2.1 Circuit Breaker Pattern (🟡 HIGH)

**Rationale**: Prevent alert storms, improve reliability

**Implementation**:

```typescript
// src/alerts/services/alert-circuit-breaker.service.ts
import { Injectable } from '@nestjs/common';
import { CircuitBreaker } from 'opossum';

@Injectable()
export class AlertCircuitBreakerService {
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker(this.processAlert.bind(this), {
      timeout: 5000, // 5 seconds
      errorThresholdPercentage: 10, // Open circuit if error rate >10%
      resetTimeout: 60000, // Try to close circuit after 1 minute
      rollingCountTimeout: 60000, // 1 minute rolling window
      rollingCountBuckets: 10,
      name: 'alert-processing'
    });

    // Circuit breaker events
    this.circuitBreaker.on('open', () => {
      console.error('Circuit breaker opened - alert processing paused');
      // Send alert to PagerDuty
    });

    this.circuitBreaker.on('halfOpen', () => {
      console.log('Circuit breaker half-open - testing alert processing');
    });

    this.circuitBreaker.on('close', () => {
      console.log('Circuit breaker closed - alert processing resumed');
    });
  }

  async processAlertWithCircuitBreaker(alert: any) {
    try {
      return await this.circuitBreaker.fire(alert);
    } catch (error) {
      if (this.circuitBreaker.opened) {
        // Queue alert for later processing
        await this.queueAlertForLater(alert);
        throw new Error('Alert processing circuit breaker is open. Alert queued for later.');
      }
      throw error;
    }
  }

  private async processAlert(alert: any) {
    // Actual alert processing logic
    // This will be called by circuit breaker
  }

  private async queueAlertForLater(alert: any) {
    // Queue alert in SQS for later processing
  }
}
```

**Benefit**: Better reliability, reduced costs, prevent alert storms

**Timeline**: Phase 1 (Q4 2025, Month 3)
**Owner**: Backend Engineer

---

#### 9.2.2 Alert Batching for High-Volume Users (🟡 HIGH)

**Rationale**: Improve performance, reduce notification fatigue

**Implementation**:

```typescript
// src/alerts/services/alert-batching.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '@/common/services/redis.service';

@Injectable()
export class AlertBatchingService {
  constructor(private readonly redis: RedisService) {}

  async batchAlert(userId: string, alert: any) {
    const key = `alert:batch:${userId}`;

    // Add alert to batch
    await this.redis.rpush(key, JSON.stringify(alert));

    // Set expiry if first alert in batch
    const count = await this.redis.llen(key);
    if (count === 1) {
      await this.redis.expire(key, 300); // 5 minutes
    }

    // Check if batch is full
    const batchSize = 10; // Batch 10 alerts together
    if (count >= batchSize) {
      await this.flushBatch(userId);
    }
  }

  private async flushBatch(userId: string) {
    const key = `alert:batch:${userId}`;

    // Get all alerts in batch
    const alerts = await this.redis.lrange(key, 0, -1);

    // Delete batch
    await this.redis.del(key);

    // Send batched notification
    await this.sendBatchedNotification(userId, alerts.map(a => JSON.parse(a)));
  }

  private async sendBatchedNotification(userId: string, alerts: any[]) {
    // Send single notification with all alerts
    // E.g., "You have 10 new alerts: Whale movement (5), Price alerts (3), Gas alerts (2)"
  }
}
```

**Benefit**: Better performance, reduced notification fatigue

**Timeline**: Phase 1 (Q4 2025, Month 3)
**Owner**: Backend Engineer

---

### 9.3 Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│                    (Rate Limiting via WAF)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Alert Rules API                             │
│              (Lambda with Circuit Breaker)                       │
│                    (Audit Logging)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Event Processor                             │
│                  (ECS Fargate with                               │
│                   Circuit Breaker)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Alert Batching Service                         │
│                    (Redis-based)                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Notification Service                            │
│              (Multi-channel delivery)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### 9.4 Updated Deployment Strategy

**Phase 1 (Q4 2025, Month 2)**:
1. Implement rate limiting (AWS WAF + Redis)
2. Implement audit logging (CloudWatch Logs)
3. Deploy with blue-green deployment

**Phase 1 (Q4 2025, Month 3)**:
1. Implement circuit breaker pattern
2. Implement alert batching
3. Early beta launch (whale traders)

**Monitoring**:
- Rate limit metrics (CloudWatch)
- Circuit breaker metrics (Datadog)
- Audit log metrics (CloudWatch Insights)

---

**END OF DOCUMENT**

