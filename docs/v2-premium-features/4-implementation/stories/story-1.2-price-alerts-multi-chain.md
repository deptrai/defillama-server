# Story 1.2: Price Alerts Multi-Chain

**Feature ID**: F-002  
**EPIC**: EPIC-1 (Alerts & Notifications)  
**Story Points**: 21 points  
**Priority**: P0 (Critical)  
**Timeline**: Q4 2025, Month 1 (Weeks 2-3)

---

## Overview

Implement multi-chain price alert system that monitors token prices across 100+ blockchains and notifies users when price reaches target conditions.

**Business Value**: Essential feature for traders, high user engagement

---

## User Stories (4 stories, 21 points)

### Story 1.2.1: Configure Price Alert Conditions (5 points)

**As a** premium user  
**I want** to configure price alert conditions  
**So that** I can receive alerts when price reaches target

**Acceptance Criteria**:
- ✅ User can set price condition (above, below, change %)
- ✅ User can set target price (USD)
- ✅ User can select token and chain
- ✅ User can set alert frequency (once, recurring)
- ✅ System validates price values (min: $0.01, max: $1M)

**Technical**: API `POST /v1/alerts/rules`, Database `alert_rules`

---

### Story 1.2.2: Monitor Price Changes (8 points)

**As a** system  
**I want** to monitor price changes in real-time  
**So that** I can trigger price alerts

**Acceptance Criteria**:
- ✅ System monitors price feeds from multiple sources
- ✅ System evaluates price alert rules
- ✅ System detects price threshold crossings
- ✅ System detects price change % conditions
- ✅ System processes 10K+ price updates/minute

**Technical**: Service `PriceMonitor`, Queue `AWS SQS`, Database `price_history`

---

### Story 1.2.3: Send Price Alert Notifications (5 points)

**As a** premium user  
**I want** to receive price alert notifications  
**So that** I can act on price movements

**Acceptance Criteria**:
- ✅ User receives multi-channel notifications
- ✅ Notification includes: token, price, change %, chain
- ✅ Notification sent within 30 seconds
- ✅ Support recurring alerts

**Technical**: Service `NotificationDispatcher`, Channels `Email/Push/Webhook`

---

### Story 1.2.4: View Price Alert History (3 points)

**As a** premium user  
**I want** to view my price alert history  
**So that** I can review past price movements

**Acceptance Criteria**:
- ✅ User can view triggered price alerts
- ✅ User can filter by token, chain, date
- ✅ User can export history

**Technical**: API `GET /v1/alerts/history`, Pagination 50/page

---

## Technical Architecture

**Components**:
- PriceMonitor Service (ECS Fargate)
- Price Feed Aggregator (CoinGecko, DeFiLlama API)
- Alert Rule Evaluator
- Notification Dispatcher

**Database Schema**:
```sql
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  token VARCHAR(50) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  condition VARCHAR(20) NOT NULL, -- 'above', 'below', 'change_pct'
  target_price DECIMAL(20,8),
  change_pct DECIMAL(5,2),
  frequency VARCHAR(20) DEFAULT 'once', -- 'once', 'recurring'
  is_active BOOLEAN DEFAULT true
);
```

**API Endpoints**:
- `POST /v1/alerts/rules` - Create price alert
- `GET /v1/alerts/history` - Get alert history
- `PUT /v1/alerts/rules/:id` - Update alert
- `DELETE /v1/alerts/rules/:id` - Delete alert

---

## Success Metrics

- 10K+ users configure price alerts
- 500K+ alerts triggered/month
- <30s notification latency
- 95%+ delivery rate

---

**Status**: 📝 Ready for Implementation  
**Effort**: 2 weeks  
**Dependencies**: Story 1.1 (Whale Alerts infrastructure)

