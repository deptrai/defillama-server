# Story 1.3: Gas Fee Alerts

**Feature ID**: F-003
**EPIC**: EPIC-1 (Alerts & Notifications)
**Story Points**: 13 points
**Priority**: P0 (Critical)
**Timeline**: Q4 2025, Month 1 (Week 8-9)
**Dependencies**: None

---

## 📋 Overview

Real-time gas fee alerts for optimal transaction timing. Users receive notifications when gas prices drop below their target threshold, helping them save money on transaction fees.

**User Story**: As a DeFi trader, I want to receive alerts when gas fees are low, so I can execute transactions at optimal times and save money.

---

## 🎯 Acceptance Criteria

- ✅ AC-003.1: User can set gas price thresholds for multiple chains
- ✅ AC-003.2: Alert types: gas below threshold, gas spike warning
- ✅ AC-003.3: Alerts delivered within 30 seconds of gas price change
- ✅ AC-003.4: Alert includes: current gas price, threshold, estimated savings, chain
- ✅ AC-003.5: Gas price predictions (next 1h, 6h, 24h)
- ✅ AC-003.6: Best time to transact recommendations
- ✅ AC-003.7: Historical gas price charts (24h, 7d, 30d)

---

## 📊 Sub-Stories (3 stories, 13 points)

### Story 1.3.1: Configure Gas Alert Thresholds (5 points)

**Description**: Implement gas alert creation and management

**Tasks**:
1. Create `GasAlertService` (gas-alert.service.ts)
2. Create `GasAlertController` (gas-alert.controller.ts)
3. Create DTOs (CreateGasAlertDto, UpdateGasAlertDto)
4. Add database migrations (alert_rules table - gas type)
5. Implement CRUD operations
6. Add input validation
7. Add unit tests

**Acceptance Criteria**:
- User can create gas alerts with threshold (Gwei)
- Support 10+ EVM chains (Ethereum, BSC, Polygon, Arbitrum, Optimism, etc.)
- Alert types: below threshold, spike warning
- Multi-channel notifications (email, Telegram, Discord, webhook)
- Throttling support (prevent spam)

---

### Story 1.3.2: Monitor Gas Prices (5 points)

**Description**: Implement real-time gas price monitoring and prediction

**Tasks**:
1. Create `GasPriceMonitorService` (gas-price-monitor.service.ts)
2. Integrate with gas price APIs (Etherscan, Blocknative, custom RPC)
3. Implement gas price caching (Redis)
4. Implement gas price prediction model (ML-based or heuristic)
5. Create gas price history storage (7 days)
6. Add monitoring endpoints (GET /v2/gas-fees/current, /v2/gas-fees/predictions)
7. Add unit tests

**Acceptance Criteria**:
- Gas price update frequency: 10 seconds
- Support 10+ EVM chains
- Gas price predictions (1h, 6h, 24h)
- Historical gas trends (24h, 7d, 30d)
- Cache hot gas prices in Redis

---

### Story 1.3.3: Send Gas Alert Notifications (3 points)

**Description**: Implement gas alert triggering and notification delivery

**Tasks**:
1. Create `GasAlertTriggerService` (gas-alert-trigger.service.ts)
2. Implement alert evaluation logic
3. Integrate with NotificationService
4. Add alert history tracking
5. Add integration tests
6. Add E2E tests

**Acceptance Criteria**:
- Alert latency: <30 seconds from gas price change
- Alert includes: current gas price, threshold, estimated savings, chain
- Best time to transact recommendations
- Multi-channel delivery (email, Telegram, Discord, webhook)
- Alert deduplication (throttling)

---

## 🏗️ Technical Requirements

### Backend

**Services**:
- `GasAlertService` - CRUD operations for gas alerts
- `GasPriceMonitorService` - Real-time gas price monitoring
- `GasAlertTriggerService` - Alert evaluation and triggering
- `GasPredictionService` - Gas price prediction (ML-based or heuristic)

**Data Sources**:
- Etherscan Gas Tracker API
- Blocknative Gas Platform
- Custom RPC nodes (eth_gasPrice, eth_feeHistory)
- DeFiLlama gas price feeds

**Infrastructure**:
- Redis for gas price caching
- PostgreSQL for alert rules and history
- AWS Lambda for alert processing
- AWS EventBridge for scheduled monitoring

**Performance**:
- Gas price update frequency: 10 seconds
- Alert latency: <30 seconds
- Support 10+ EVM chains
- Handle 100K+ alerts/month

---

### Frontend

**Components**:
- Gas alert creation form (chain, threshold)
- Gas price dashboard (current, historical, predictions)
- Savings calculator (estimate savings based on transaction type)
- Best time to transact recommendations
- Historical gas price charts (24h, 7d, 30d)

---

## 📡 API Specifications

### POST /v2/alerts/gas-fees

Create a new gas alert

**Request**:
```typescript
interface CreateGasAlertRequest {
  chain: string;                     // ethereum, bsc, polygon, etc.
  thresholdGwei: number;             // Gas price threshold in Gwei
  alertType: 'below' | 'spike';      // Alert type
  notificationChannels: string[];    // email, telegram, discord, webhook
  enabled?: boolean;                 // Default: true
  throttleMinutes?: number;          // Default: 60
}
```

**Response**:
```typescript
interface GasAlert {
  id: string;
  userId: string;
  chain: string;
  thresholdGwei: number;
  alertType: 'below' | 'spike';
  notificationChannels: string[];
  status: "active" | "paused";
  createdAt: Date;
  updatedAt: Date;
}
```

---

### GET /v2/gas-fees/current

Get current gas prices for a chain

**Request**:
```typescript
interface GetCurrentGasFeesRequest {
  chain: string;  // ethereum, bsc, polygon, etc.
}
```

**Response**:
```typescript
interface GetCurrentGasFeesResponse {
  chain: string;
  slow: number;                  // Gwei
  standard: number;              // Gwei
  fast: number;                  // Gwei
  instant: number;               // Gwei
  timestamp: string;
}
```

---

### GET /v2/gas-fees/predictions

Get gas price predictions for a chain

**Request**:
```typescript
interface GetGasPredictionsRequest {
  chain: string;  // ethereum, bsc, polygon, etc.
}
```

**Response**:
```typescript
interface GetGasPredictionsResponse {
  chain: string;
  predictions: {
    "1h": number;                // Predicted gas price in 1 hour
    "6h": number;
    "24h": number;
  };
  confidence: number;            // 0-1
  bestTimeToTransact: string;    // "now" | "1h" | "6h" | "24h"
}
```

---

## 🗄️ Data Models

### GasAlert (Database)

```typescript
interface GasAlert {
  id: string;
  user_id: string;
  chain: string;
  threshold_gwei: number;
  alert_type: 'below' | 'spike';
  notification_channels: string[];
  status: "active" | "paused";
  throttle_minutes: number;
  last_triggered_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
```

### GasAlertEvent (Alert History)

```typescript
interface GasAlertEvent {
  id: string;
  alert_id: string;
  chain: string;
  gas_price: number;              // Gwei
  threshold: number;              // Gwei
  savings: number;                // Estimated USD savings
  timestamp: Date;
  notified: boolean;
}
```

### GasPriceHistory (Cache)

```typescript
interface GasPriceHistory {
  chain: string;
  timestamp: Date;
  slow: number;
  standard: number;
  fast: number;
  instant: number;
}
```

---

## 🧪 Test Cases

### TC-008: Gas below threshold

- **Given**: User sets gas alert for Ethereum below 20 Gwei
- **When**: Gas price drops to 18 Gwei
- **Then**: Alert triggered, notification sent with savings estimate

### TC-009: Gas spike warning

- **Given**: User has gas spike alert enabled
- **When**: Gas price increases 100% in 10 minutes
- **Then**: Warning alert sent

### TC-010: Multi-chain gas alerts

- **Given**: User sets gas alerts for Ethereum, BSC, Polygon
- **When**: Gas price drops below threshold on any chain
- **Then**: Alert triggered for that specific chain

### TC-011: Gas price predictions

- **Given**: User requests gas price predictions for Ethereum
- **When**: API call to /v2/gas-fees/predictions
- **Then**: Returns predictions for 1h, 6h, 24h with confidence score

---

## 📈 Success Metrics

- **User Adoption**: 20K+ gas alerts created
- **Cost Savings**: $100+ average savings per user per month
- **Alert Delivery**: 95%+ alert delivery success rate
- **User Satisfaction**: 80%+ user satisfaction with gas optimization
- **Alert Latency**: <30 seconds from gas price change to notification
- **Prediction Accuracy**: 70%+ accuracy for 1h predictions

---

## 🚀 Implementation Plan

### Phase 1: Backend Foundation (3 days)

1. Create `GasAlertService` with CRUD operations
2. Create `GasAlertController` with REST API endpoints
3. Create DTOs (CreateGasAlertDto, UpdateGasAlertDto)
4. Add database migrations
5. Add unit tests

### Phase 2: Gas Price Monitoring (3 days)

1. Create `GasPriceMonitorService`
2. Integrate with gas price APIs (Etherscan, Blocknative)
3. Implement Redis caching
4. Create gas price history storage
5. Add monitoring endpoints
6. Add unit tests

### Phase 3: Alert Triggering (2 days)

1. Create `GasAlertTriggerService`
2. Implement alert evaluation logic
3. Integrate with NotificationService
4. Add alert history tracking
5. Add integration tests

### Phase 4: Gas Price Prediction (2 days)

1. Create `GasPredictionService`
2. Implement prediction model (heuristic-based)
3. Add prediction endpoints
4. Add unit tests

### Phase 5: Testing & Documentation (2 days)

1. Add E2E tests
2. Add load tests
3. Update API documentation
4. Update user documentation

**Total Effort**: 12 days (1.5 weeks)

---

## 📁 Files to Create

### Services (4 files)

1. `src/alerts/services/gas-alert.service.ts` (~300 lines)
2. `src/alerts/services/gas-price-monitor.service.ts` (~400 lines)
3. `src/alerts/services/gas-alert-trigger.service.ts` (~200 lines)
4. `src/alerts/services/gas-prediction.service.ts` (~300 lines)

### Controllers (1 file)

5. `src/alerts/controllers/gas-alert.controller.ts` (~400 lines)

### DTOs (2 files)

6. `src/alerts/dto/create-gas-alert.dto.ts` (~100 lines)
7. `src/alerts/dto/update-gas-alert.dto.ts` (~50 lines)

### Tests (6 files)

8. `src/alerts/services/__tests__/gas-alert.service.test.ts` (~300 lines)
9. `src/alerts/services/__tests__/gas-price-monitor.service.test.ts` (~300 lines)
10. `src/alerts/services/__tests__/gas-alert-trigger.service.test.ts` (~200 lines)
11. `src/alerts/services/__tests__/gas-prediction.service.test.ts` (~200 lines)
12. `src/alerts/controllers/__tests__/gas-alert.controller.test.ts` (~300 lines)
13. `src/alerts/__tests__/e2e/gas-alerts.e2e.test.ts` (~400 lines)

**Total**: 13 files, ~3,450 lines of code

---

## 🔗 Dependencies

**External APIs**:
- Etherscan Gas Tracker API
- Blocknative Gas Platform
- Custom RPC nodes

**Internal Services**:
- NotificationService (existing)
- AlertHistoryService (existing)
- Redis (existing)
- PostgreSQL (existing)

**Libraries**:
- `ethers` - Ethereum RPC interaction
- `axios` - HTTP requests
- `ioredis` - Redis client
- `postgres` - PostgreSQL client

---

## ⚠️ Risks & Mitigation

### Risk 1: Gas price API rate limits

**Mitigation**:
- Use multiple gas price sources
- Implement aggressive caching (Redis)
- Fallback to RPC nodes

### Risk 2: Prediction accuracy

**Mitigation**:
- Start with simple heuristic model
- Collect historical data for ML model
- Show confidence scores to users

### Risk 3: Alert spam

**Mitigation**:
- Implement throttling (default: 60 minutes)
- Alert deduplication
- User-configurable throttle settings

---

**Status**: 📝 Ready for Implementation
**Effort**: 1.5 weeks (12 days)
**Assigned To**: TBD
