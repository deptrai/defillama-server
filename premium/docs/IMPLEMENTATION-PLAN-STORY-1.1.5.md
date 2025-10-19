# Implementation Plan: Story 1.1.5 - View Whale Alert History

**Story ID**: 1.1.5  
**Story Points**: 3  
**Priority**: P1  
**Status**: Ready for Implementation  
**Estimated Time**: 4-5 hours (1 day)

---

## 📋 Story Description

**As a** premium user  
**I want** to view my whale alert history  
**So that** I can review past whale movements

---

## 🎯 Acceptance Criteria

- [x] User can view list of triggered whale alerts
- [x] User can filter by date range, token, chain
- [x] User can sort by date, amount
- [x] User can export alert history (CSV, JSON)
- [x] System displays last 1000 alerts
- [x] Pagination: 50 alerts per page

---

## 🔧 Technical Implementation

### Phase 1: Database Migration (30 minutes)

**File**: `premium/migrations/003-create-alert-history-table.sql`

```sql
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  
  -- Event data (whale transaction details)
  event_data JSONB NOT NULL,
  
  -- Notification status
  notification_status VARCHAR(20) DEFAULT 'pending',
  notification_channels TEXT[],
  delivery_status JSONB DEFAULT '{}',
  
  -- Timestamps
  triggered_at TIMESTAMP DEFAULT NOW(),
  notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alert_history_user_id ON alert_history(user_id, triggered_at DESC);
CREATE INDEX idx_alert_history_rule_id ON alert_history(rule_id, triggered_at DESC);
CREATE INDEX idx_alert_history_triggered_at ON alert_history(triggered_at DESC);
```

**event_data structure** (for whale alerts):
```json
{
  "chain": "ethereum",
  "token": "ETH",
  "amount_usd": 1500000,
  "from": "0x123...",
  "to": "0x456...",
  "tx_hash": "0xabc..."
}
```

---

### Phase 2: Service Layer (1 hour)

**File**: `premium/src/alerts/services/alert-history.service.ts`

**Methods**:

1. **getAlertHistory(userId, options)**
   - Get paginated alert history for user
   - Support filtering by alert_type, chain, token, date range
   - Support sorting by date, amount
   - Return data + pagination

2. **getAlertHistoryById(userId, historyId)**
   - Get single alert history entry
   - Verify user ownership

3. **createAlertHistory(ruleId, userId, eventData, notificationChannels)**
   - Create new alert history entry
   - Called by notification service after alert triggered
   - Store event data, notification status

4. **exportAlertHistory(userId, format, options)**
   - Export alert history as CSV or JSON
   - Support same filtering as getAlertHistory
   - Return formatted data

---

### Phase 3: Controller Layer (45 minutes)

**File**: `premium/src/alerts/controllers/alert-history.controller.ts`

**Functions**:

1. **getAlertHistory(event: APIGatewayProxyEvent)**
   - Extract user ID from JWT
   - Parse query parameters
   - Validate parameters
   - Call alertHistoryService.getAlertHistory()
   - Return JSON or CSV based on format parameter

2. **getAlertHistoryById(event: APIGatewayProxyEvent)**
   - Extract user ID from JWT
   - Extract history ID from path parameters
   - Call alertHistoryService.getAlertHistoryById()
   - Return single history entry

---

### Phase 4: Serverless Configuration (15 minutes)

**File**: `premium/serverless.yml`

```yaml
getAlertHistory:
  handler: src/alerts/controllers/alert-history.controller.getAlertHistory
  timeout: 30
  memorySize: 512
  events:
    - http:
        path: /v2/premium/alerts/history
        method: get
        cors: true
        authorizer:
          name: jwtAuthorizer
          type: request
          identitySource: method.request.header.Authorization

getAlertHistoryById:
  handler: src/alerts/controllers/alert-history.controller.getAlertHistoryById
  timeout: 30
  memorySize: 512
  events:
    - http:
        path: /v2/premium/alerts/history/{id}
        method: get
        cors: true
        authorizer:
          name: jwtAuthorizer
          type: request
          identitySource: method.request.header.Authorization
```

---

### Phase 5: Integration with Notification Service (30 minutes)

**File**: `premium/src/alerts/services/notification.service.ts`

- Call alertHistoryService.createAlertHistory() after sending notifications
- Store notification status (sent/failed)

---

### Phase 6: Testing (1.5 hours)

**Unit Tests**: `premium/src/alerts/__tests__/alert-history.service.test.ts`
- Test getAlertHistory with various filters
- Test pagination
- Test sorting
- Test date range filtering
- Test exportAlertHistory (CSV/JSON)

**Integration Tests**: `premium/src/alerts/__tests__/alert-history.integration.test.ts`
- Test database queries
- Test JOIN with alert_rules table
- Test filtering by event_data JSONB fields

**E2E Tests**: `premium/src/alerts/__tests__/e2e/alert-history.e2e.test.ts`
- Test GET /v2/premium/alerts/history
- Test authentication
- Test pagination
- Test filtering (alert_type, chain, token, date range)
- Test sorting
- Test CSV export
- Test JSON export

---

## 📊 API Specification

### GET /v2/premium/alerts/history

**Query Parameters**:
- `page`: number (default: 1)
- `per_page`: number (default: 50, max: 100)
- `alert_type`: 'whale' | 'price' (optional)
- `chain`: string (optional)
- `token`: string (optional)
- `start_date`: ISO 8601 date (optional)
- `end_date`: ISO 8601 date (optional)
- `sort_by`: 'date' | 'amount' (default: 'date')
- `sort_order`: 'asc' | 'desc' (default: 'desc')
- `format`: 'json' | 'csv' (default: 'json')

**Response** (JSON):
```json
{
  "data": [
    {
      "id": "uuid",
      "rule_id": "uuid",
      "rule_name": "Large ETH Transfers",
      "alert_type": "whale",
      "event_data": {
        "chain": "ethereum",
        "token": "ETH",
        "amount_usd": 1500000,
        "from": "0x123...",
        "to": "0x456...",
        "tx_hash": "0xabc..."
      },
      "notification_status": "sent",
      "notification_channels": ["email", "telegram"],
      "triggered_at": "2025-10-17T10:00:00Z",
      "notified_at": "2025-10-17T10:00:05Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "per_page": 50,
    "total_pages": 3
  }
}
```

**Response** (CSV):
```csv
id,rule_name,alert_type,chain,token,amount_usd,from,to,tx_hash,triggered_at
uuid,Large ETH Transfers,whale,ethereum,ETH,1500000,0x123...,0x456...,0xabc...,2025-10-17T10:00:00Z
```

---

## 📁 Files to Create

1. `premium/migrations/003-create-alert-history-table.sql`
2. `premium/src/alerts/services/alert-history.service.ts`
3. `premium/src/alerts/controllers/alert-history.controller.ts`
4. `premium/src/alerts/__tests__/alert-history.service.test.ts`
5. `premium/src/alerts/__tests__/alert-history.integration.test.ts`
6. `premium/src/alerts/__tests__/e2e/alert-history.e2e.test.ts`

## 📝 Files to Modify

1. `premium/serverless.yml`
2. `premium/src/alerts/services/notification.service.ts`

---

## ✅ Definition of Done

- [x] Database migration created and run successfully
- [x] Service layer implemented with all methods
- [x] Controller layer implemented with validation
- [x] Serverless configuration updated
- [x] Integration with notification service complete
- [x] Unit tests written and passing
- [x] Integration tests written and passing
- [x] E2E tests written and passing
- [x] All tests passing (100%)
- [x] Code reviewed and approved
- [x] Documentation updated

---

## 🎯 Success Metrics

- API response time < 200ms (p95)
- Database query time < 100ms (p95)
- CSV export time < 500ms for 1000 records
- Test coverage > 80%
- All acceptance criteria met

