# Story 4.1.1: MEV Opportunity Detection - Implementation Plan

**Story ID**: STORY-4.1.1  
**Epic**: On-Chain Services V1  
**Feature**: 4.1 - MEV Detection Engine  
**Story Points**: 21  
**Priority**: P0 (Critical)  
**Created**: 2025-10-16  
**Status**: Ready for Implementation  

---

## 📋 IMPLEMENTATION OVERVIEW

### Objectives
Implement real-time MEV opportunity detection system with 5 detection engines:
1. Sandwich Attack Detector
2. Frontrunning Detector
3. Backrunning Detector
4. Arbitrage Detector
5. Liquidation Detector

### Success Criteria
- ✅ Detection latency <5 seconds
- ✅ Detection accuracy >85% (sandwich), >80% (frontrun), >90% (arbitrage), >95% (liquidation)
- ✅ API response time <500ms (p95)
- ✅ 90%+ test coverage
- ✅ Support 1000+ transactions/second

---

## 🏗️ ARCHITECTURE ALIGNMENT

### Existing Infrastructure (Reuse)
- ✅ **Database**: PostgreSQL (32 existing migrations)
- ✅ **API Layer**: `/defi/src/api2/routes/analytics/`
- ✅ **Engines**: `/defi/src/analytics/engines/` (47 existing engines)
- ✅ **Testing**: Jest framework with comprehensive test patterns
- ✅ **Caching**: Redis integration (from Phase 3 enhancements)

### New Components (Build)
- 🆕 **MEV Engines**: 5 detection engines
- 🆕 **Database Schema**: `mev_opportunities` table + indexes
- 🆕 **API Routes**: `/v1/mev/opportunities`
- 🆕 **Mempool Monitor**: Real-time transaction monitoring (future)

---

## 📊 IMPLEMENTATION PHASES

### Phase 1: Database Setup (Day 1-2)

**Task 1.1: Create Migration File**
- File: `defi/src/analytics/migrations/037-create-mev-opportunities.sql`
- Table: `mev_opportunities` (20 columns)
- Indexes: 6 performance indexes

**Task 1.2: Create Seed Data**
- File: `defi/src/analytics/db/seed-mev-opportunities.sql`
- 20+ test records covering all MEV types
- Realistic profit/loss scenarios

**Task 1.3: Run Migration**
- Execute migration on local database
- Verify table structure
- Load seed data

**Deliverables**:
- ✅ Migration file
- ✅ Seed data file
- ✅ Database verification script

---

### Phase 2: Detection Engines (Day 3-12)

**Task 2.1: Sandwich Attack Detector** (Day 3-4)
- File: `defi/src/analytics/engines/sandwich-detector.ts`
- Algorithm: Pattern matching (Buy → Victim → Sell)
- Features:
  * Token pair grouping
  * Gas price sorting
  * Profit simulation
  * Confidence scoring
- Test: `defi/src/analytics/engines/tests/sandwich-detector.test.ts`
- Coverage: 90%+

**Task 2.2: Frontrunning Detector** (Day 5-6)
- File: `defi/src/analytics/engines/frontrun-detector.ts`
- Algorithm: Price impact estimation
- Features:
  * High-value transaction detection
  * Price impact calculation (>1% threshold)
  * Profit simulation
  * Confidence scoring
- Test: `defi/src/analytics/engines/tests/frontrun-detector.test.ts`
- Coverage: 90%+

**Task 2.3: Backrunning Detector** (Day 7-8)
- File: `defi/src/analytics/engines/backrun-detector.ts`
- Algorithm: Post-transaction opportunity detection
- Features:
  * Price movement detection
  * Arbitrage opportunity identification
  * Profit simulation
  * Confidence scoring
- Test: `defi/src/analytics/engines/tests/backrun-detector.test.ts`
- Coverage: 90%+

**Task 2.4: Arbitrage Detector** (Day 9-10)
- File: `defi/src/analytics/engines/arbitrage-detector.ts`
- Algorithm: Multi-DEX price comparison
- Features:
  * Price fetching from multiple DEXes (Uniswap, Sushiswap, Curve, Balancer)
  * Price difference calculation (>0.5% threshold)
  * Profit simulation (including gas + slippage)
  * Cross-chain arbitrage support
- Test: `defi/src/analytics/engines/tests/arbitrage-detector.test.ts`
- Coverage: 90%+

**Task 2.5: Liquidation Detector** (Day 11-12)
- File: `defi/src/analytics/engines/liquidation-detector.ts`
- Algorithm: Position health monitoring
- Features:
  * Position monitoring (Aave, Compound, MakerDAO)
  * Health factor calculation
  * Liquidation profit estimation
  * Confidence scoring
- Test: `defi/src/analytics/engines/tests/liquidation-detector.test.ts`
- Coverage: 90%+

**Deliverables**:
- ✅ 5 detection engines
- ✅ 5 test files (90%+ coverage each)
- ✅ Engine index export

---

### Phase 3: Profit Calculation & Utilities (Day 13-15)

**Task 3.1: Transaction Simulator**
- File: `defi/src/analytics/engines/transaction-simulator.ts`
- Features:
  * Simulate transaction execution
  * Calculate price impact
  * Estimate gas costs
  * Handle slippage

**Task 3.2: Profit Calculator**
- File: `defi/src/analytics/engines/profit-calculator.ts`
- Features:
  * Calculate gross profit
  * Subtract gas costs
  * Account for slippage
  * Calculate net profit

**Task 3.3: Confidence Scorer**
- File: `defi/src/analytics/engines/confidence-scorer.ts`
- Features:
  * Pattern strength scoring
  * Historical accuracy weighting
  * Risk factor adjustment
  * Final confidence score (0-100)

**Task 3.4: MEV Types & Interfaces**
- File: `defi/src/analytics/engines/mev-types.ts`
- Interfaces:
  * `MEVOpportunity`
  * `SandwichOpportunity`
  * `FrontrunOpportunity`
  * `ArbitrageOpportunity`
  * `LiquidationOpportunity`

**Deliverables**:
- ✅ 3 utility engines
- ✅ Type definitions
- ✅ Unit tests

---

### Phase 4: API Development (Day 16-18)

**Task 4.1: API Routes**
- File: `defi/src/api2/routes/analytics/mev/index.ts`
- Endpoints:
  1. `GET /v1/mev/opportunities` - List opportunities
  2. `GET /v1/mev/opportunities/:id` - Get by ID
  3. `GET /v1/mev/opportunities/stats` - Statistics

**Task 4.2: Request Validation**
- File: `defi/src/api2/routes/analytics/mev/validation.ts`
- Validate:
  * Query parameters (chains, types, minProfit, time range)
  * Pagination (page, limit)
  * Sorting (profit, timestamp, confidence)

**Task 4.3: Response Formatting**
- File: `defi/src/api2/routes/analytics/mev/handlers.ts`
- Features:
  * Format MEV opportunities
  * Add metadata
  * Pagination info
  * Cache headers

**Task 4.4: Caching Layer**
- File: `defi/src/api2/routes/analytics/mev/cache.ts`
- Features:
  * Redis caching
  * TTL configuration
  * Cache invalidation
  * Cache warming

**Deliverables**:
- ✅ 3 API endpoints
- ✅ Request validation
- ✅ Response formatting
- ✅ Caching layer
- ✅ API tests

---

### Phase 5: Integration & Testing (Day 19-23)

**Task 5.1: Integration Tests**
- File: `defi/src/analytics/engines/tests/mev-integration.test.ts`
- Test scenarios:
  * End-to-end detection flow
  * Database operations
  * API endpoints
  * Caching layer

**Task 5.2: Performance Tests**
- File: `defi/src/analytics/engines/tests/mev-performance.test.ts`
- Metrics:
  * Detection latency <5 seconds
  * Profit calculation <2 seconds
  * API response time <500ms (p95)
  * Load testing: 1000 tx/second

**Task 5.3: E2E Tests**
- File: `defi/src/analytics/engines/tests/mev-e2e.test.ts`
- Complete flow:
  * Mock mempool data → Detection → Storage → API retrieval

**Task 5.4: Manual Testing**
- Test UI: `defi/mev-test-ui.html`
- Test all 5 detection types
- Verify API responses
- Check database records

**Deliverables**:
- ✅ Integration tests
- ✅ Performance tests
- ✅ E2E tests
- ✅ Manual test UI
- ✅ Test results report

---

### Phase 6: Documentation (Day 24-26)

**Task 6.1: Implementation Summary**
- File: `docs/4-implementation/stories/story-4.1.1-implementation-summary.md`
- Content:
  * Implementation overview
  * Architecture decisions
  * Code metrics
  * Test results

**Task 6.2: API Documentation**
- File: `docs/api/mev-opportunities.md`
- Content:
  * Endpoint specifications
  * Request/response examples
  * Error codes
  * Rate limiting

**Task 6.3: Verification Report**
- File: `docs/4-implementation/stories/story-4.1.1-verification-report.md`
- Content:
  * Acceptance criteria verification
  * Performance metrics
  * Test coverage
  * Known issues

**Deliverables**:
- ✅ Implementation summary
- ✅ API documentation
- ✅ Verification report

---

## 📁 FILE STRUCTURE

```
defi/
├── src/
│   ├── analytics/
│   │   ├── engines/
│   │   │   ├── sandwich-detector.ts          [NEW]
│   │   │   ├── frontrun-detector.ts          [NEW]
│   │   │   ├── backrun-detector.ts           [NEW]
│   │   │   ├── arbitrage-detector.ts         [NEW]
│   │   │   ├── liquidation-detector.ts       [NEW]
│   │   │   ├── transaction-simulator.ts      [NEW]
│   │   │   ├── profit-calculator.ts          [NEW]
│   │   │   ├── confidence-scorer.ts          [NEW]
│   │   │   ├── mev-types.ts                  [NEW]
│   │   │   ├── index.ts                      [MODIFY]
│   │   │   └── tests/
│   │   │       ├── sandwich-detector.test.ts [NEW]
│   │   │       ├── frontrun-detector.test.ts [NEW]
│   │   │       ├── backrun-detector.test.ts  [NEW]
│   │   │       ├── arbitrage-detector.test.ts[NEW]
│   │   │       ├── liquidation-detector.test.ts[NEW]
│   │   │       ├── mev-integration.test.ts   [NEW]
│   │   │       ├── mev-performance.test.ts   [NEW]
│   │   │       └── mev-e2e.test.ts           [NEW]
│   │   ├── migrations/
│   │   │   └── 037-create-mev-opportunities.sql [NEW]
│   │   └── db/
│   │       └── seed-mev-opportunities.sql    [NEW]
│   └── api2/
│       └── routes/
│           └── analytics/
│               ├── index.ts                  [MODIFY]
│               └── mev/
│                   ├── index.ts              [NEW]
│                   ├── handlers.ts           [NEW]
│                   ├── validation.ts         [NEW]
│                   └── cache.ts              [NEW]
├── mev-test-ui.html                          [NEW]
└── setup-story-4.1.1.sh                      [NEW]

docs/
├── 4-implementation/
│   └── stories/
│       ├── story-4.1.1-implementation-plan.md    [THIS FILE]
│       ├── story-4.1.1-implementation-summary.md [NEW]
│       └── story-4.1.1-verification-report.md    [NEW]
└── api/
    └── mev-opportunities.md                  [NEW]
```

**Total New Files**: 26  
**Modified Files**: 2  

---

## 🧪 TESTING STRATEGY

### Unit Tests (90%+ coverage)
- 5 detection engines
- 3 utility engines
- Profit calculation
- Confidence scoring

### Integration Tests
- Database operations
- API endpoints
- Caching layer
- Engine integration

### Performance Tests
- Detection latency <5 seconds
- API response time <500ms (p95)
- Load testing: 1000 tx/second

### E2E Tests
- Complete detection flow
- Mock mempool → Detection → Storage → API

---

## 📊 SUCCESS METRICS

### Technical Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Detection Latency | <5 seconds | Performance tests |
| API Response Time | <500ms (p95) | Load tests |
| Test Coverage | 90%+ | Jest coverage report |
| Detection Accuracy | 85-95% | Manual verification |

### Code Metrics
| Metric | Target |
|--------|--------|
| New Lines of Code | ~3,500 |
| Engine Code | ~2,000 |
| Test Code | ~1,200 |
| API Code | ~300 |

---

## ⚠️ RISKS & MITIGATION

### Risk 1: Mempool Access
**Risk**: No direct mempool connection yet  
**Mitigation**: Use mock data for Phase 1, plan mempool integration for Phase 2  
**Impact**: Medium  

### Risk 2: Profit Simulation Accuracy
**Risk**: Simulation may not match real execution  
**Mitigation**: Conservative estimates, confidence scoring  
**Impact**: Medium  

### Risk 3: Performance at Scale
**Risk**: Detection may be slow with high transaction volume  
**Mitigation**: Caching, parallel processing, optimization  
**Impact**: Low  

---

## 🚀 DEPLOYMENT PLAN

### Week 1-3: Development
- Implement all phases
- Unit testing
- Integration testing

### Week 4: Testing & QA
- Performance testing
- E2E testing
- Manual testing
- Bug fixes

### Week 5: Documentation
- Implementation summary
- API documentation
- Verification report

### Week 6: Deployment
- Deploy to staging
- Production deployment
- Monitoring setup

---

## 📝 NOTES

**Dependencies**:
- PostgreSQL database (existing)
- Redis cache (existing)
- API2 infrastructure (existing)

**Future Enhancements**:
- Real mempool monitoring
- Machine learning for improved detection
- Cross-chain MEV detection
- Flashbots integration

---

**Version**: 1.0  
**Last Updated**: 2025-10-16  
**Status**: Ready for Implementation  
**Estimated Duration**: 26 days (5.2 weeks)  

