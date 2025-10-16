# Story 3.2.2: Suspicious Activity Detection - Implementation Plan

**Date:** 2025-10-15  
**Story Points:** 13 (Large Story)  
**Estimated Time:** 24 days (4.5 weeks)  
**Priority:** P0 (Critical)

---

## 📋 Executive Summary

This plan outlines the implementation of a comprehensive suspicious activity detection system for DeFi protocols, including rug pull detection, wash trading detection, pump & dump detection, and sybil attack detection.

**Key Deliverables:**
- 1 database table (suspicious_activities)
- 4 detection engines (rug pull, wash trading, pump & dump, sybil attack)
- 1 alert integration system
- 1 API endpoint with filtering/sorting
- 250+ unit tests
- Comprehensive documentation

---

## 🎯 Implementation Phases

### Phase 1: Database Setup (2 days)

**Objective:** Create database schema for suspicious activities

**Tasks:**
1. ✅ Create migration: `033-create-suspicious-activities.sql`
   - Table: suspicious_activities (23 fields)
   - Indexes: 5 indexes for performance
   - Constraints: NOT NULL, DEFAULT values

2. ✅ Create seed data: `seed-suspicious-activities.sql`
   - 20 sample suspicious activities
   - Varying types: rug_pull, wash_trading, pump_dump, sybil_attack
   - Varying severity: low, medium, high, critical
   - Varying status: investigating, confirmed, false_positive, resolved

**Deliverables:**
- 1 migration file (~60 lines)
- 1 seed data file (~200 lines)

---

### Phase 2: Rug Pull Detector (4 days)

**Objective:** Implement rug pull detection engine

**Tasks:**
1. ✅ Create `rug-pull-detector.ts` (400 lines)
   - Method: `detectRugPull(protocolId: string)`
   - Method: `checkLiquidityRemoval(protocol)` - Detect >50% liquidity removal in <1 hour
   - Method: `checkTokenDump(protocol)` - Detect >30% supply sold in <1 hour
   - Method: `checkContractManipulation(protocol)` - Detect ownership transfer, pause, upgrade
   - Method: `calculateConfidenceScore()` - Calculate 0-100 confidence score
   - Method: `storeActivity()` - Store suspicious activity in database

2. ✅ Create unit tests: `rug-pull-detector.test.ts` (300 lines)
   - Test liquidity removal detection (10 tests)
   - Test token dump detection (10 tests)
   - Test contract manipulation detection (10 tests)
   - Test confidence score calculation (10 tests)
   - Test edge cases (10 tests)

**Deliverables:**
- 1 engine file (~400 lines)
- 1 test file (~300 lines)

---

### Phase 3: Wash Trading Detector (4 days)

**Objective:** Implement wash trading detection engine

**Tasks:**
1. ✅ Create `wash-trading-detector.ts` (400 lines)
   - Method: `detectWashTrading(protocolId: string)`
   - Method: `findSelfTrades(trades)` - Detect same wallet buy/sell
   - Method: `findCircularTrades(trades)` - Detect A→B→C→A pattern
   - Method: `checkVolumeInflation(protocol)` - Detect abnormal volume spikes
   - Method: `detectPriceManipulation(trades)` - Detect coordinated trades
   - Method: `calculateConfidenceScore()` - Calculate 0-100 confidence score
   - Method: `storeActivities()` - Store multiple suspicious activities

2. ✅ Create unit tests: `wash-trading-detector.test.ts` (300 lines)
   - Test self-trading detection (10 tests)
   - Test circular trading detection (10 tests)
   - Test volume inflation detection (10 tests)
   - Test price manipulation detection (10 tests)
   - Test edge cases (10 tests)

**Deliverables:**
- 1 engine file (~400 lines)
- 1 test file (~300 lines)

---

### Phase 4: Pump & Dump Detector (3 days)

**Objective:** Implement pump & dump detection engine

**Tasks:**
1. ✅ Create `pump-dump-detector.ts` (350 lines)
   - Method: `detectPumpAndDump(tokenAddress: string)`
   - Method: `checkCoordinatedBuying(token)` - Detect multiple wallets buying in short timeframe
   - Method: `detectPriceSpike(token)` - Detect >50% price increase in <1 hour
   - Method: `checkCoordinatedSelling(token)` - Detect coordinated dump phase
   - Method: `calculateConfidenceScore()` - Calculate 0-100 confidence score
   - Method: `estimateLoss()` - Estimate loss in USD
   - Method: `storeActivity()` - Store suspicious activity

2. ✅ Create unit tests: `pump-dump-detector.test.ts` (250 lines)
   - Test coordinated buying detection (10 tests)
   - Test price spike detection (10 tests)
   - Test coordinated selling detection (10 tests)
   - Test confidence score calculation (10 tests)
   - Test edge cases (10 tests)

**Deliverables:**
- 1 engine file (~350 lines)
- 1 test file (~250 lines)

---

### Phase 5: Sybil Attack Detector (3 days)

**Objective:** Implement sybil attack detection engine

**Tasks:**
1. ✅ Create `sybil-attack-detector.ts` (400 lines)
   - Method: `detectSybilAttack(protocolId: string)`
   - Method: `clusterWalletsByBehavior(users)` - Cluster wallets by behavior similarity
   - Method: `calculateSimilarityScore(wallet1, wallet2)` - Calculate 0-1 similarity score
   - Method: `detectAirdropFarming(clusters)` - Detect airdrop farming patterns
   - Method: `identifyCoordinatedBehavior(cluster)` - Detect coordinated actions
   - Method: `calculateConfidenceScore()` - Calculate 0-100 confidence score
   - Method: `storeActivity()` - Store suspicious activity

2. ✅ Create unit tests: `sybil-attack-detector.test.ts` (250 lines)
   - Test wallet clustering (10 tests)
   - Test similarity calculation (10 tests)
   - Test airdrop farming detection (10 tests)
   - Test coordinated behavior detection (10 tests)
   - Test edge cases (10 tests)

**Deliverables:**
- 1 engine file (~400 lines)
- 1 test file (~250 lines)

---

### Phase 6: Alert System Integration (2 days)

**Objective:** Integrate with existing alert system

**Tasks:**
1. ✅ Create `suspicious-activity-alert-manager.ts` (300 lines)
   - Method: `generateAlert(activity)` - Generate alert from suspicious activity
   - Method: `sendNotifications(alert)` - Send multi-channel notifications
   - Method: `deduplicateAlerts(alerts)` - Deduplicate similar alerts
   - Method: `trackAcknowledgment(alertId)` - Track alert acknowledgment
   - Integration with existing alert system (email, webhook, push)

2. ✅ Create integration tests: `suspicious-activity-alert-manager.test.ts` (200 lines)
   - Test alert generation (10 tests)
   - Test notification sending (10 tests)
   - Test deduplication (10 tests)
   - Test acknowledgment tracking (10 tests)

**Deliverables:**
- 1 alert manager file (~300 lines)
- 1 test file (~200 lines)

---

### Phase 7: API Development (3 days)

**Objective:** Create API endpoints for suspicious activities

**Tasks:**
1. ✅ Create `suspicious-activities/handlers.ts` (400 lines)
   - Handler: `getSuspiciousActivities` - GET /v1/risk/suspicious-activities
   - Handler: `getSuspiciousActivityById` - GET /v1/risk/suspicious-activities/:id
   - Handler: `updateActivityStatus` - PATCH /v1/risk/suspicious-activities/:id/status
   - Handler: `acknowledgeActivity` - POST /v1/risk/suspicious-activities/:id/acknowledge
   - Filtering: activity_type, severity, protocol, time range, status
   - Sorting: timestamp, confidence, severity
   - Pagination: limit, offset

2. ✅ Create `suspicious-activities/index.ts` (30 lines)
   - Router configuration
   - Mount 4 endpoints

3. ✅ Update `analytics/index.ts`
   - Import suspicious activities router
   - Mount at `/analytics/suspicious-activities`

4. ✅ Create API test script: `test-story-3.2.2-api.sh` (200 lines)
   - 15 test cases covering all endpoints
   - Error handling tests
   - Query parameter tests

**Deliverables:**
- 2 API files (~430 lines)
- 1 updated file (analytics/index.ts)
- 1 API test script (~200 lines)

---

### Phase 8: Testing & Documentation (3 days)

**Objective:** Comprehensive testing and documentation

**Tasks:**
1. ✅ Create E2E test: `test-story-3.2.2-e2e.ts` (300 lines)
   - Test complete detection flow: Monitoring → Detection → Alert → API
   - Test all 4 detection engines
   - Test alert generation and notification
   - Test API endpoints

2. ✅ Create performance test: `test-story-3.2.2-performance.ts` (200 lines)
   - Test detection latency <1 minute (rug pull)
   - Test detection latency <5 minutes (wash trading, pump & dump)
   - Test detection latency <10 minutes (sybil attack)
   - Test API response time <1 second (p95)

3. ✅ Create documentation:
   - `story-3.2.2-implementation-summary.md` (300 lines)
   - `story-3.2.2-final-report.md` (300 lines)
   - `story-3.2.2-verification-report.md` (300 lines)

4. ✅ Create setup script: `setup-story-3.2.2.sh` (100 lines)
   - Apply migration
   - Seed data
   - Verify tables

**Deliverables:**
- 2 test files (~500 lines)
- 3 documentation files (~900 lines)
- 1 setup script (~100 lines)

---

## 📊 Technical Architecture

### Detection Engines

```typescript
// Rug Pull Detector
class RugPullDetector {
  async detectRugPull(protocolId: string): Promise<SuspiciousActivity | null>
  async checkLiquidityRemoval(protocol): Promise<{ percentage: number; timeframe: number }>
  async checkTokenDump(protocol): Promise<{ percentage: number; timeframe: number }>
  async checkContractManipulation(protocol): Promise<{ detected: boolean; action: string }>
  calculateConfidenceScore(evidence): number
  async storeActivity(activity): Promise<void>
}

// Wash Trading Detector
class WashTradingDetector {
  async detectWashTrading(protocolId: string): Promise<SuspiciousActivity[]>
  findSelfTrades(trades): Trade[]
  findCircularTrades(trades): CircularPattern[]
  async checkVolumeInflation(protocol): Promise<{ detected: boolean; ratio: number }>
  detectPriceManipulation(trades): boolean
  calculateConfidenceScore(evidence): number
  async storeActivities(activities): Promise<void>
}

// Pump & Dump Detector
class PumpDumpDetector {
  async detectPumpAndDump(tokenAddress: string): Promise<SuspiciousActivity | null>
  async checkCoordinatedBuying(token): Promise<{ detected: boolean; walletCount: number }>
  detectPriceSpike(token): Promise<number>
  async checkCoordinatedSelling(token): Promise<{ detected: boolean; estimatedLoss: number }>
  calculateConfidenceScore(evidence): number
  estimateLoss(token, priceChange): number
  async storeActivity(activity): Promise<void>
}

// Sybil Attack Detector
class SybilAttackDetector {
  async detectSybilAttack(protocolId: string): Promise<SuspiciousActivity | null>
  async clusterWalletsByBehavior(users): Promise<WalletCluster[]>
  calculateSimilarityScore(wallet1, wallet2): number
  detectAirdropFarming(clusters): boolean
  identifyCoordinatedBehavior(cluster): boolean
  calculateConfidenceScore(evidence): number
  async storeActivity(activity): Promise<void>
}
```

### Alert Integration

```typescript
class SuspiciousActivityAlertManager {
  async generateAlert(activity: SuspiciousActivity): Promise<Alert>
  async sendNotifications(alert: Alert): Promise<void>
  deduplicateAlerts(alerts: Alert[]): Alert[]
  async trackAcknowledgment(alertId: string): Promise<void>
}
```

---

## 📁 File Structure

```
defi/
├── src/analytics/
│   ├── migrations/
│   │   └── 033-create-suspicious-activities.sql
│   ├── db/
│   │   └── seed-suspicious-activities.sql
│   ├── engines/
│   │   ├── rug-pull-detector.ts
│   │   ├── wash-trading-detector.ts
│   │   ├── pump-dump-detector.ts
│   │   ├── sybil-attack-detector.ts
│   │   ├── suspicious-activity-alert-manager.ts
│   │   ├── index.ts (updated)
│   │   └── tests/
│   │       ├── rug-pull-detector.test.ts
│   │       ├── wash-trading-detector.test.ts
│   │       ├── pump-dump-detector.test.ts
│   │       ├── sybil-attack-detector.test.ts
│   │       └── suspicious-activity-alert-manager.test.ts
│   └── ...
├── src/api2/routes/analytics/
│   ├── suspicious-activities/
│   │   ├── handlers.ts
│   │   └── index.ts
│   └── index.ts (updated)
├── setup-story-3.2.2.sh
├── test-story-3.2.2-api.sh
├── test-story-3.2.2-e2e.ts
└── test-story-3.2.2-performance.ts

docs/4-implementation/stories/
├── story-3.2.2-implementation-plan.md (this file)
├── story-3.2.2-implementation-summary.md
├── story-3.2.2-final-report.md
└── story-3.2.2-verification-report.md
```

---

## ✅ Acceptance Criteria Mapping

| AC | Description | Implementation |
|----|-------------|----------------|
| AC1 | Rug Pull Detection | RugPullDetector engine |
| AC2 | Wash Trading Detection | WashTradingDetector engine |
| AC3 | Pump & Dump Detection | PumpDumpDetector engine |
| AC4 | Sybil Attack Detection | SybilAttackDetector engine |
| AC5 | Alert Generation | SuspiciousActivityAlertManager |
| AC6 | Suspicious Activity API | 4 API endpoints |

---

## 📈 Success Metrics

| Metric | Target | Verification Method |
|--------|--------|---------------------|
| Suspicious activities detected | 1,000+ per day | Database query |
| Detection latency (rug pull) | <1 minute | Performance test |
| Detection latency (wash trading) | <5 minutes | Performance test |
| Detection latency (pump & dump) | <5 minutes | Performance test |
| Detection latency (sybil attack) | <10 minutes | Performance test |
| Detection accuracy | 85%+ | Manual validation |
| False positive rate | <10% | Manual validation |
| API response time | <1 second (p95) | Performance test |
| Unit test coverage | 90%+ | Jest coverage report |

---

## 🚀 Deployment Plan

1. **Database Setup**
   ```bash
   cd defi
   chmod +x setup-story-3.2.2.sh
   ./setup-story-3.2.2.sh
   ```

2. **Run Unit Tests**
   ```bash
   npm test -- --testPathPattern='suspicious'
   ```

3. **Start API Server**
   ```bash
   npm run api2-dev
   ```

4. **Run API Tests**
   ```bash
   chmod +x test-story-3.2.2-api.sh
   ./test-story-3.2.2-api.sh
   ```

5. **Run E2E Tests**
   ```bash
   npx tsx test-story-3.2.2-e2e.ts
   ```

6. **Run Performance Tests**
   ```bash
   npx tsx test-story-3.2.2-performance.ts
   ```

---

## 🔗 Dependencies

**Upstream:**
- Story 3.2.1: Protocol Risk Assessment (protocol data, risk alerts)
- Story 3.1.2: Trade Pattern Analysis (trade data)
- Story 1.3: Alert Engine and Notification System (alert infrastructure)

**External:**
- Blockchain data providers (for transaction data)
- Social media APIs (optional, for pump & dump detection)

---

## 📝 Notes

- Reuse existing alert infrastructure from Story 1.3
- Integrate with protocol risk assessment from Story 3.2.1
- Use trade pattern data from Story 3.1.2
- Focus on detection accuracy over speed
- Implement comprehensive logging for debugging
- Add monitoring for detection performance

---

**Version:** 1.0  
**Last Updated:** 2025-10-15  
**Status:** Ready for Implementation

