# Story 1.1.5: Alert Execution E2E Tests

**Epic:** EPIC-1: Smart Alerts & Notifications  
**Story ID:** 1.1.5  
**Story Points:** 8  
**Priority:** P2 (Medium)  
**Status:** Not Started  
**Type:** Testing Enhancement

---

## 📋 Story Description

As a **QA Engineer**,  
I want to **implement E2E tests for alert execution and triggering logic**,  
So that **I can verify that alerts are correctly triggered based on blockchain events and price changes**.

---

## 🎯 Acceptance Criteria

### AC1: Whale Alert Triggering
- [ ] Test whale alert triggers when threshold exceeded
- [ ] Test whale alert does NOT trigger when threshold not met
- [ ] Verify correct whale transaction data captured
- [ ] Test multiple whale alerts triggered simultaneously
- [ ] Verify alert history recorded correctly

### AC2: Price Alert Triggering
- [ ] Test price alert triggers when price crosses threshold
- [ ] Test "above" threshold alerts
- [ ] Test "below" threshold alerts
- [ ] Test "percentage_change" alerts
- [ ] Verify price data accuracy

### AC3: Alert Execution Flow
- [ ] Test complete flow: Event → Detection → Trigger → Notification
- [ ] Verify alert status updates (idle → triggered → notified)
- [ ] Test alert cooldown/throttle enforcement
- [ ] Verify last_triggered_at timestamp updated
- [ ] Test alert re-triggering after cooldown

### AC4: Alert History Tracking
- [ ] Test alert history created for each trigger
- [ ] Verify history contains correct event data
- [ ] Test history pagination
- [ ] Verify history retention policy
- [ ] Test history cleanup for old records

### AC5: Multi-User Scenarios
- [ ] Test alerts for different users triggered independently
- [ ] Verify user isolation (no cross-user triggers)
- [ ] Test concurrent alert execution
- [ ] Verify tier-based limits enforced

### AC6: Error Handling
- [ ] Test alert execution with invalid data
- [ ] Test alert execution with missing data
- [ ] Verify error logging and tracking
- [ ] Test alert retry logic (if implemented)
- [ ] Verify alert status on failure

---

## 🔧 Technical Implementation

### Test Infrastructure

**Mock Blockchain Event Stream**
```typescript
// tests/mocks/blockchain-event-stream.ts
import { EventEmitter } from 'events';

export class MockBlockchainEventStream extends EventEmitter {
  private transactions: any[] = [];
  
  emitWhaleTransaction(data: {
    chain: string;
    token: string;
    amount_usd: number;
    from: string;
    to: string;
    tx_hash: string;
  }) {
    this.transactions.push(data);
    this.emit('whale_transaction', data);
  }
  
  emitPriceUpdate(data: {
    token: string;
    price: number;
    change_24h: number;
    timestamp: Date;
  }) {
    this.emit('price_update', data);
  }
  
  getTransactions() {
    return this.transactions;
  }
  
  clear() {
    this.transactions = [];
  }
}
```

**Alert Execution Service Mock**
```typescript
// tests/mocks/alert-execution-service.ts
export class MockAlertExecutionService {
  private executedAlerts: any[] = [];
  
  async executeWhaleAlert(alert: any, transaction: any) {
    // Check if alert should trigger
    if (transaction.amount_usd >= alert.conditions.threshold_usd) {
      this.executedAlerts.push({
        alert_id: alert.id,
        transaction,
        triggered_at: new Date(),
      });
      
      // Update alert status
      await updateAlertStatus(alert.id, 'triggered');
      
      // Create alert history
      await createAlertHistory({
        alert_id: alert.id,
        event_type: 'whale_transaction',
        event_data: transaction,
      });
      
      // Send notifications
      await sendNotifications(alert, transaction);
      
      return true;
    }
    
    return false;
  }
  
  async executePriceAlert(alert: any, priceData: any) {
    const shouldTrigger = this.checkPriceCondition(alert, priceData);
    
    if (shouldTrigger) {
      this.executedAlerts.push({
        alert_id: alert.id,
        price_data: priceData,
        triggered_at: new Date(),
      });
      
      await updateAlertStatus(alert.id, 'triggered');
      await createAlertHistory({
        alert_id: alert.id,
        event_type: 'price_change',
        event_data: priceData,
      });
      await sendNotifications(alert, priceData);
      
      return true;
    }
    
    return false;
  }
  
  private checkPriceCondition(alert: any, priceData: any): boolean {
    const { alert_type, threshold, percentage } = alert.conditions;
    
    if (alert_type === 'above') {
      return priceData.price > threshold;
    } else if (alert_type === 'below') {
      return priceData.price < threshold;
    } else if (alert_type === 'percentage_change') {
      return Math.abs(priceData.change_24h) >= percentage;
    }
    
    return false;
  }
  
  getExecutedAlerts() {
    return this.executedAlerts;
  }
  
  clear() {
    this.executedAlerts = [];
  }
}
```

### E2E Test Structure

```
premium/src/alerts/__tests__/e2e/execution/
├── setup.ts                          # Mock setup
├── whale-alert-execution.e2e.test.ts # Whale alert execution
├── price-alert-execution.e2e.test.ts # Price alert execution
├── alert-history.e2e.test.ts         # Alert history tracking
├── multi-user.e2e.test.ts            # Multi-user scenarios
└── error-handling.e2e.test.ts        # Error handling
```

---

## 🧪 Test Cases

### TC1: Whale Alert Triggers on Threshold Exceeded
```typescript
it('should trigger whale alert when transaction exceeds threshold', async () => {
  // 1. Create whale alert with $1M threshold
  const alert = await createWhaleAlert({
    user_id: 'test-user-premium',
    conditions: {
      chain: 'ethereum',
      token: 'USDT',
      threshold_usd: 1000000,
    },
    actions: {
      channels: ['email'],
    },
  });
  
  // 2. Emit whale transaction event ($2M)
  blockchainStream.emitWhaleTransaction({
    chain: 'ethereum',
    token: 'USDT',
    amount_usd: 2000000,
    from: '0x123...',
    to: '0x456...',
    tx_hash: '0xabc...',
  });
  
  // 3. Wait for alert execution
  await sleep(2000);
  
  // 4. Verify alert triggered
  const updatedAlert = await getWhaleAlertById(alert.id);
  expect(updatedAlert.status).toBe('triggered');
  expect(updatedAlert.last_triggered_at).toBeDefined();
  
  // 5. Verify alert history created
  const history = await getAlertHistory(alert.id);
  expect(history.length).toBe(1);
  expect(history[0].event_data.amount_usd).toBe(2000000);
  
  // 6. Verify notification sent
  const emails = await mailhog.getMessages();
  expect(emails.length).toBe(1);
});
```

### TC2: Price Alert Triggers on "Above" Threshold
```typescript
it('should trigger price alert when price goes above threshold', async () => {
  // 1. Create price alert (ETH above $3000)
  const alert = await createPriceAlert({
    user_id: 'test-user-pro',
    conditions: {
      token: 'ETH',
      alert_type: 'above',
      threshold: 3000,
    },
    actions: {
      channels: ['telegram'],
      telegram_chat_id: '123456789',
    },
  });
  
  // 2. Emit price update event (ETH = $3500)
  blockchainStream.emitPriceUpdate({
    token: 'ETH',
    price: 3500,
    change_24h: 5.2,
    timestamp: new Date(),
  });
  
  // 3. Wait for alert execution
  await sleep(2000);
  
  // 4. Verify alert triggered
  const updatedAlert = await getPriceAlertById(alert.id);
  expect(updatedAlert.status).toBe('triggered');
  
  // 5. Verify alert history
  const history = await getAlertHistory(alert.id);
  expect(history[0].event_data.price).toBe(3500);
  
  // 6. Verify Telegram notification
  const messages = await telegramMock.getMessages();
  expect(messages.length).toBe(1);
  expect(messages[0].text).toContain('$3,500');
});
```

### TC3: Alert Cooldown Enforcement
```typescript
it('should enforce cooldown period between triggers', async () => {
  // 1. Create alert with 5-minute cooldown
  const alert = await createWhaleAlert({
    conditions: { threshold_usd: 1000000 },
    actions: { channels: ['email'] },
    throttle_minutes: 5,
  });
  
  // 2. Trigger alert first time
  blockchainStream.emitWhaleTransaction({
    amount_usd: 2000000,
    chain: 'ethereum',
    token: 'USDT',
  });
  await sleep(2000);
  
  // 3. Verify first trigger
  let history = await getAlertHistory(alert.id);
  expect(history.length).toBe(1);
  
  // 4. Trigger alert again within cooldown (should NOT trigger)
  blockchainStream.emitWhaleTransaction({
    amount_usd: 3000000,
    chain: 'ethereum',
    token: 'USDT',
  });
  await sleep(2000);
  
  // 5. Verify second trigger blocked
  history = await getAlertHistory(alert.id);
  expect(history.length).toBe(1); // Still only 1 history entry
  
  // 6. Wait for cooldown to expire
  await sleep(5 * 60 * 1000); // 5 minutes
  
  // 7. Trigger alert again after cooldown (should trigger)
  blockchainStream.emitWhaleTransaction({
    amount_usd: 4000000,
    chain: 'ethereum',
    token: 'USDT',
  });
  await sleep(2000);
  
  // 8. Verify third trigger successful
  history = await getAlertHistory(alert.id);
  expect(history.length).toBe(2); // Now 2 history entries
});
```

### TC4: Multi-User Alert Isolation
```typescript
it('should trigger alerts independently for different users', async () => {
  // 1. Create alerts for two users with same conditions
  const alert1 = await createWhaleAlert({
    user_id: 'user-1',
    conditions: { threshold_usd: 1000000 },
    actions: { channels: ['email'] },
  });
  
  const alert2 = await createWhaleAlert({
    user_id: 'user-2',
    conditions: { threshold_usd: 1000000 },
    actions: { channels: ['email'] },
  });
  
  // 2. Emit whale transaction
  blockchainStream.emitWhaleTransaction({
    amount_usd: 2000000,
    chain: 'ethereum',
    token: 'USDT',
  });
  await sleep(2000);
  
  // 3. Verify both alerts triggered independently
  const history1 = await getAlertHistory(alert1.id);
  const history2 = await getAlertHistory(alert2.id);
  
  expect(history1.length).toBe(1);
  expect(history2.length).toBe(1);
  
  // 4. Verify both users received notifications
  const emails = await mailhog.getMessages();
  expect(emails.length).toBe(2);
  
  // 5. Verify user isolation (no cross-user data)
  expect(history1[0].user_id).toBe('user-1');
  expect(history2[0].user_id).toBe('user-2');
});
```

### TC5: Alert History Pagination
```typescript
it('should paginate alert history correctly', async () => {
  // 1. Create alert
  const alert = await createWhaleAlert({
    conditions: { threshold_usd: 1000000 },
    throttle_minutes: 0, // No throttle for testing
  });
  
  // 2. Trigger alert 25 times
  for (let i = 0; i < 25; i++) {
    blockchainStream.emitWhaleTransaction({
      amount_usd: 2000000 + i * 100000,
      chain: 'ethereum',
      token: 'USDT',
    });
    await sleep(100);
  }
  
  await sleep(3000);
  
  // 3. Get first page (limit 10)
  const page1 = await getAlertHistory(alert.id, { limit: 10, offset: 0 });
  expect(page1.length).toBe(10);
  
  // 4. Get second page
  const page2 = await getAlertHistory(alert.id, { limit: 10, offset: 10 });
  expect(page2.length).toBe(10);
  
  // 5. Get third page
  const page3 = await getAlertHistory(alert.id, { limit: 10, offset: 20 });
  expect(page3.length).toBe(5);
  
  // 6. Verify total count
  const total = await getAlertHistoryCount(alert.id);
  expect(total).toBe(25);
});
```

---

## 📁 Deliverables

### Test Files
1. `premium/src/alerts/__tests__/e2e/execution/setup.ts`
2. `premium/src/alerts/__tests__/e2e/execution/whale-alert-execution.e2e.test.ts`
3. `premium/src/alerts/__tests__/e2e/execution/price-alert-execution.e2e.test.ts`
4. `premium/src/alerts/__tests__/e2e/execution/alert-history.e2e.test.ts`
5. `premium/src/alerts/__tests__/e2e/execution/multi-user.e2e.test.ts`
6. `premium/src/alerts/__tests__/e2e/execution/error-handling.e2e.test.ts`

### Mock Services
1. `premium/tests/mocks/blockchain-event-stream.ts`
2. `premium/tests/mocks/alert-execution-service.ts`

### Documentation
1. `premium/docs/ALERT-EXECUTION-TESTING.md`
2. `premium/src/alerts/__tests__/e2e/execution/README.md`

---

## 🚀 Implementation Plan

### Phase 1: Mock Infrastructure (2 days)
- [ ] Create blockchain event stream mock
- [ ] Create alert execution service mock
- [ ] Setup test database with history table
- [ ] Configure test environment

### Phase 2: Whale Alert Execution Tests (2 days)
- [ ] Implement whale alert triggering tests
- [ ] Test threshold logic
- [ ] Test cooldown enforcement
- [ ] Test history tracking

### Phase 3: Price Alert Execution Tests (2 days)
- [ ] Implement price alert triggering tests
- [ ] Test "above" threshold
- [ ] Test "below" threshold
- [ ] Test "percentage_change"

### Phase 4: Multi-User & Error Handling (1 day)
- [ ] Implement multi-user tests
- [ ] Test user isolation
- [ ] Test error handling
- [ ] Test retry logic

### Phase 5: Documentation (1 day)
- [ ] Write alert execution testing guide
- [ ] Document mock setup
- [ ] Create troubleshooting guide

---

## 🔗 Dependencies

- Story 1.1.1: Configure Whale Alert Thresholds (COMPLETE)
- Story 1.1.2: Configure Price Alert Thresholds (COMPLETE)
- E2E Tests (COMPLETE)
- Alert execution service implementation (TBD)
- Alert history table schema (TBD)

---

## ✅ Definition of Done

- [ ] All alert execution E2E tests implemented
- [ ] All acceptance criteria met
- [ ] Mock services working correctly
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code reviewed and approved

