# Technical Specification: EPIC-7 Cross-EPIC Integration

**Document Version**: 1.0  
**Date**: 2025-10-19  
**Author**: Technical Team  
**Status**: Draft for Development  
**EPIC ID**: EPIC-7

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Integration Patterns](#3-integration-patterns)
4. [API Specifications](#4-api-specifications)
5. [Data Models](#5-data-models)
6. [Implementation Details](#6-implementation-details)
7. [Testing Strategy](#7-testing-strategy)
8. [Deployment](#8-deployment)

---

## 1. Overview

### 1.1 Purpose

EPIC-7 provides seamless integration between all feature EPICs (EPIC-1 through EPIC-6) to create a unified user experience. This EPIC ensures that data flows smoothly between features and users can leverage multiple features together.

### 1.2 Scope

**Features**:
- F-026: Alerts + Portfolio Integration (8 points)
- F-027: Tax + Portfolio Integration (8 points)
- F-028: Trading + Portfolio Integration (5 points)
- F-029: Security + Portfolio Integration (2 points)
- F-030: Analytics + All EPICs Integration (2 points)

**Total**: 5 features, 25 story points

### 1.3 Business Value

- **Unified Experience**: Users can leverage multiple features together without switching contexts
- **Data Consistency**: Ensure data consistency across all features
- **Reduced Friction**: Eliminate manual data entry and synchronization
- **Increased Engagement**: Users who use integrated features have 2-3x higher retention

### 1.4 Success Metrics

- 80%+ of users use 2+ integrated features
- 50%+ of users use 3+ integrated features
- 95%+ data sync accuracy across features
- <1s integration latency

---

## 2. Architecture

### 2.1 Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (v2)                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
│  Alerts API    │   │ Portfolio API  │   │   Tax API      │
│  (EPIC-1)      │   │  (EPIC-3)      │   │  (EPIC-2)      │
└───────┬────────┘   └───────┬────────┘   └───────┬────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Integration Bus  │
                    │  (EventBridge)    │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
│ Trading API    │   │ Security API   │   │ Analytics API  │
│  (EPIC-4)      │   │  (EPIC-5)      │   │  (EPIC-6)      │
└────────────────┘   └────────────────┘   └────────────────┘
```

### 2.2 Integration Patterns

**1. Event-Driven Integration** (Primary)
- Use AWS EventBridge for async communication
- Publish events when data changes (e.g., portfolio updated, alert triggered)
- Subscribe to events from other features

**2. API-Based Integration** (Secondary)
- Direct API calls for synchronous operations
- Use internal service-to-service authentication
- Implement circuit breakers for fault tolerance

**3. Shared Data Store** (Tertiary)
- PostgreSQL for shared data (user profiles, wallets)
- Redis for shared cache (token prices, metadata)
- DynamoDB for shared events (audit logs)

---

## 3. Integration Patterns

### 3.1 Alerts + Portfolio Integration (F-026)

**Use Cases**:
1. Portfolio-based alert triggers (e.g., alert when portfolio value drops >10%)
2. Alert actions update portfolio (e.g., add to watchlist)
3. Unified alert + portfolio dashboard

**Integration Flow**:
```
Portfolio Service → EventBridge → Alert Service
  (portfolio.updated)              (evaluate rules)
                                   (trigger alerts)

Alert Service → EventBridge → Portfolio Service
  (alert.triggered)            (update watchlist)
```

**API Endpoints**:
- `POST /v2/alerts/portfolio-based` - Create portfolio-based alert
- `GET /v2/alerts/portfolio/{portfolioId}` - Get alerts for portfolio
- `POST /v2/portfolio/watchlist/from-alert` - Add to watchlist from alert

**Data Sync**:
- Portfolio value changes → Evaluate alert rules (real-time)
- Alert triggered → Update portfolio watchlist (async, <1s)

---

### 3.2 Tax + Portfolio Integration (F-027)

**Use Cases**:
1. Auto-sync portfolio transactions to tax reporting
2. Tax cost basis integration with P&L calculations
3. Tax-optimized portfolio rebalancing suggestions

**Integration Flow**:
```
Portfolio Service → EventBridge → Tax Service
  (transaction.created)          (import transaction)
                                 (calculate cost basis)

Tax Service → API Call → Portfolio Service
  (get cost basis)      (calculate P&L)
```

**API Endpoints**:
- `POST /v2/tax/import/from-portfolio` - Import transactions from portfolio
- `GET /v2/tax/cost-basis/{walletId}` - Get tax cost basis for wallet
- `GET /v2/portfolio/pnl/tax-adjusted` - Get tax-adjusted P&L

**Data Sync**:
- Portfolio transactions → Tax transactions (real-time)
- Tax cost basis → Portfolio P&L (on-demand)

---

### 3.3 Trading + Portfolio Integration (F-028)

**Use Cases**:
1. Trading strategies access portfolio data
2. Executed trades auto-update portfolio
3. Portfolio-based trading limits

**Integration Flow**:
```
Trading Service → API Call → Portfolio Service
  (get positions)      (return positions)

Trading Service → EventBridge → Portfolio Service
  (trade.executed)               (update positions)
```

**API Endpoints**:
- `GET /v2/trading/portfolio/{portfolioId}` - Get portfolio for trading
- `POST /v2/trading/execute` - Execute trade (auto-updates portfolio)
- `GET /v2/portfolio/trading-limits` - Get trading limits

**Data Sync**:
- Trading strategies → Portfolio positions (on-demand)
- Executed trades → Portfolio positions (real-time)

---

### 3.4 Security + Portfolio Integration (F-029)

**Use Cases**:
1. Portfolio displays security scores for all positions
2. Security alerts trigger portfolio actions
3. Portfolio risk analysis

**Integration Flow**:
```
Security Service → EventBridge → Portfolio Service
  (security.alert)               (flag risky position)

Portfolio Service → API Call → Security Service
  (get security score)         (return score)
```

**API Endpoints**:
- `GET /v2/security/portfolio/{portfolioId}` - Get security scores for portfolio
- `POST /v2/portfolio/flag-risky` - Flag risky position from security alert
- `GET /v2/portfolio/risk-analysis` - Get portfolio risk analysis

**Data Sync**:
- Security scores → Portfolio positions (on-demand, cached 5 min)
- Security alerts → Portfolio flags (real-time)

---

### 3.5 Analytics + All EPICs Integration (F-030)

**Use Cases**:
1. Analytics access data from all features
2. Cross-feature analytics (e.g., alert effectiveness vs portfolio performance)
3. Custom analytics queries across all features

**Integration Flow**:
```
Analytics Service → API Calls → All Services
  (query data)                  (return data)

All Services → EventBridge → Analytics Service
  (*.created/updated)          (update analytics)
```

**API Endpoints**:
- `GET /v2/analytics/cross-feature` - Query data across all features
- `POST /v2/analytics/custom-query` - Custom analytics query
- `GET /v2/analytics/dashboard/{dashboardId}` - Get custom dashboard

**Data Sync**:
- All feature events → Analytics data warehouse (real-time)
- Analytics queries → All features (on-demand)

---

## 4. API Specifications

### 4.1 Integration Bus Events

**Event Schema**:
```typescript
interface IntegrationEvent {
  eventId: string;           // UUID
  eventType: string;         // e.g., "portfolio.updated"
  source: string;            // e.g., "portfolio-service"
  timestamp: string;         // ISO 8601
  userId: string;            // User ID
  data: Record<string, any>; // Event-specific data
  metadata: {
    correlationId: string;   // For tracing
    version: string;         // Event schema version
  };
}
```

**Event Types**:
- `portfolio.updated` - Portfolio value/positions changed
- `portfolio.transaction.created` - New transaction added
- `alert.triggered` - Alert triggered
- `tax.transaction.imported` - Transaction imported to tax
- `trading.trade.executed` - Trade executed
- `security.alert.created` - Security alert created
- `analytics.query.completed` - Analytics query completed

---

## 5. Data Models

### 5.1 Shared Data Models

**User Profile** (Shared across all features):
```typescript
interface UserProfile {
  userId: string;
  email: string;
  tier: 'standard' | 'pro' | 'premium' | 'enterprise';
  wallets: Wallet[];
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}
```

**Wallet** (Shared across all features):
```typescript
interface Wallet {
  walletId: string;
  address: string;
  chain: string;
  label: string;
  isWatchOnly: boolean;
  addedAt: string;
}
```

---

## 6. Implementation Details

### 6.1 Technology Stack

- **Integration Bus**: AWS EventBridge
- **API Gateway**: AWS API Gateway (v2)
- **Service Mesh**: AWS App Mesh (optional)
- **Circuit Breaker**: opossum (Node.js library)
- **Caching**: Redis (shared cache)
- **Database**: PostgreSQL (shared data)

### 6.2 Error Handling

- **Retry Logic**: Exponential backoff (3 retries, max 30s)
- **Circuit Breaker**: Open after 10% error rate, half-open after 1 min
- **Dead Letter Queue**: Failed events → SQS DLQ for manual review
- **Monitoring**: CloudWatch alarms for integration failures

---

## 7. Testing Strategy

### 7.1 Integration Tests

- Test all integration flows (alerts + portfolio, tax + portfolio, etc.)
- Test event publishing and subscription
- Test API calls between services
- Test error handling and retry logic

### 7.2 End-to-End Tests

- Test complete user journeys (e.g., create alert → portfolio updated → alert triggered)
- Test data consistency across features
- Test performance (latency, throughput)

---

## 8. Deployment

### 8.1 Deployment Strategy

- **Phase 1**: Deploy integration bus (EventBridge)
- **Phase 2**: Deploy integration APIs (one feature at a time)
- **Phase 3**: Enable event subscriptions (gradual rollout)
- **Phase 4**: Monitor and optimize

### 8.2 Rollback Plan

- Disable event subscriptions (stop integration)
- Rollback API changes (revert to previous version)
- Monitor for data inconsistencies

---

**END OF DOCUMENT**

