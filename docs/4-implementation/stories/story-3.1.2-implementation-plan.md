# Story 3.1.2: Trade Pattern Analysis - Implementation Plan

**Story:** 3.1.2 - Trade Pattern Analysis  
**Phase:** Phase 3 - Governance & DAO Tools  
**Feature:** 3.1 - Smart Money Tracking  
**Priority:** P0 (Critical)  
**Story Points:** 13  
**Estimated Time:** ~12 hours  
**Created:** 2025-10-15

---

## 📋 Implementation Strategy

### MVP Scope

**In Scope:**
- ✅ Database schema (wallet_trades, trade_patterns)
- ✅ Pattern recognition algorithms (4 patterns)
- ✅ Behavioral analysis (6 analysis types)
- ✅ API endpoints (2 endpoints)
- ✅ Comprehensive testing (30+ tests)

**Out of Scope (Future Enhancements):**
- ❌ Real-time blockchain event listener
- ❌ WebSocket notifications
- ❌ Live trade detection (<5s latency)
- ❌ Cross-chain trade aggregation

**Rationale:** Focus on pattern recognition and API layer first. Real-time infrastructure requires WebSocket setup and blockchain indexing, which are complex and can be added later.

---

## 🎯 Task Breakdown

### Task 1: Database Setup (2 hours)

**Deliverables:**
1. Migration `021-create-wallet-trades.sql`
   - 23 fields (id, wallet_id, tx_hash, block_number, timestamp, chain_id, trade_type, token_in/out details, protocol info, PnL metrics)
   - 5 indexes (wallet_id, timestamp, token_in, token_out, pattern)
   
2. Migration `022-create-trade-patterns.sql`
   - 14 fields (id, wallet_id, pattern_type, confidence_score, timestamps, token info, volume metrics, PnL)
   - 4 indexes (wallet_id, pattern_type, token, status)

3. Seed data `seed-wallet-trades.sql`
   - 100+ trades for 5 wallets from Story 3.1.1
   - Cover all 4 pattern types (accumulation, distribution, rotation, arbitrage)
   - Realistic data: WETH, USDC, DAI, Uniswap, Aave, $1K-$100K trade sizes
   - Time spans: 7-30 days for accumulation/distribution, <24h for rotation, <5min for arbitrage

**Acceptance Criteria:**
- [ ] Both migrations execute successfully
- [ ] All indexes created
- [ ] 100+ trades seeded
- [ ] Data covers all 4 pattern types
- [ ] Foreign key constraints working

---

### Task 2: Pattern Recognition Engine (4 hours)

**Deliverables:**
1. `defi/src/analytics/engines/trade-pattern-recognizer.ts` (~400 lines)
   - Singleton pattern (like SmartMoneyScorer)
   - 4 detection methods:
     * `detectAccumulation()` - 3+ buys, 7+ days, position growth >50%
     * `detectDistribution()` - 3+ sells, 7+ days, position decrease >50%
     * `detectRotation()` - 2+ tokens, <24h, value similarity >80%
     * `detectArbitrage()` - cross-DEX, <5min, profit >0
   - Confidence scoring algorithm (0-100)
   - Helper methods: calculateTimeSpan, calculatePositionGrowth, etc.

2. `defi/src/analytics/engines/tests/trade-pattern-recognizer.test.ts` (~500 lines)
   - 16+ unit tests
   - Test all 4 pattern types
   - Test edge cases (insufficient trades, wrong timespan, etc.)
   - Test confidence scoring
   - Mock trade data

**Acceptance Criteria:**
- [ ] All 4 pattern detectors implemented
- [ ] Confidence scoring working
- [ ] 16+ tests passing (100%)
- [ ] Edge cases handled
- [ ] TypeScript types defined

---

### Task 3: Behavioral Analysis Engine (3 hours)

**Deliverables:**
1. `defi/src/analytics/engines/behavioral-analyzer.ts` (~350 lines)
   - Singleton pattern
   - 6 analysis methods:
     * `analyzeTradingStyle()` - swing/day/position/scalp (based on holding period)
     * `analyzeRiskProfile()` - conservative/moderate/aggressive (based on trade size variance)
     * `analyzePreferredTokens()` - top 10 by trade count
     * `analyzePreferredProtocols()` - top 5 by volume
     * `analyzeTradeTiming()` - early/mid/late/exit (based on price movement)
     * `analyzeTradeSizing()` - avg/min/max analysis
   - Aggregate analysis method returning full profile

2. `defi/src/analytics/engines/tests/behavioral-analyzer.test.ts` (~400 lines)
   - 12+ unit tests
   - Test all 6 analysis types
   - Test edge cases (no trades, single trade, etc.)
   - Mock trade data

**Acceptance Criteria:**
- [ ] All 6 analysis methods implemented
- [ ] 12+ tests passing (100%)
- [ ] Edge cases handled
- [ ] TypeScript types defined

---

### Task 4: API Endpoints (2 hours)

**Deliverables:**
1. `defi/src/api2/routes/analytics/smart-money/patterns-handlers.ts` (~300 lines)
   - Handler for GET `/v1/analytics/smart-money/wallets/:address/patterns`
   - Handler for GET `/v1/analytics/smart-money/wallets/:address/trades`
   - Filtering support (pattern type, token, time range, protocol)
   - Sorting support (timestamp, confidence, volume, PnL)
   - Pagination support (page, limit)
   - 5-minute cache TTL
   - Error handling (400, 404, 500)

2. `defi/src/api2/routes/analytics/smart-money/patterns-validation.ts` (~150 lines)
   - Validate wallet address (Ethereum address format)
   - Validate pattern type (accumulation, distribution, rotation, arbitrage)
   - Validate time range (7d, 30d, 90d, 1y)
   - Validate pagination (page >= 1, limit 1-100)
   - Validate sorting (valid fields, asc/desc)

3. Update `defi/src/api2/routes/analytics/smart-money/index.ts`
   - Register 2 new routes
   - Apply validation middleware
   - Apply caching middleware

**Acceptance Criteria:**
- [ ] Both endpoints working
- [ ] Filtering working
- [ ] Sorting working
- [ ] Pagination working
- [ ] Caching working (5-min TTL)
- [ ] Validation working
- [ ] Error handling working

---

### Task 5: Integration Testing (1 hour)

**Deliverables:**
1. `defi/src/analytics/collectors/test-trade-patterns-api.ts` (~250 lines)
   - 10+ manual test cases
   - Test both endpoints
   - Test filtering, sorting, pagination
   - Test error cases (invalid address, invalid pattern type, etc.)
   - Test cache headers

2. Verify all tests passing
   - Unit tests: 28+ tests (16 + 12)
   - Manual tests: 10+ tests
   - Total: 38+ tests

**Acceptance Criteria:**
- [ ] All unit tests passing (100%)
- [ ] All manual tests passing
- [ ] API response time <500ms
- [ ] Cache working correctly
- [ ] Error handling working

---

## 📊 Success Metrics

**Code Quality:**
- Total files created: ~10 files
- Total lines of code: ~2,500 lines
- Test coverage: 100% (38+ tests)
- TypeScript strict mode: Enabled

**Performance:**
- Pattern recognition: <30 seconds per wallet
- API response time: <500ms (p95)
- Database query time: <100ms

**Functionality:**
- 4 pattern types detected
- 6 behavioral analysis types
- 2 API endpoints
- Filtering, sorting, pagination working

---

## 🔗 Dependencies

**Upstream:**
- ✅ Story 3.1.1: Smart Money Identification (smart_money_wallets table)
- ✅ Database connection module (defi/src/analytics/db/connection.ts)
- ✅ API routing structure (defi/src/api2/routes/analytics/smart-money/)

**Downstream:**
- Story 3.1.3: Performance Attribution (will use trade patterns)

---

## 📝 Implementation Order

1. **Task 1: Database Setup** (2 hours)
   - Create migrations
   - Create seed data
   - Execute migrations
   - Verify data

2. **Task 2: Pattern Recognition Engine** (4 hours)
   - Implement TradePatternRecognizer
   - Implement 4 pattern detectors
   - Write unit tests
   - Verify tests passing

3. **Task 3: Behavioral Analysis Engine** (3 hours)
   - Implement BehavioralAnalyzer
   - Implement 6 analysis methods
   - Write unit tests
   - Verify tests passing

4. **Task 4: API Endpoints** (2 hours)
   - Implement handlers
   - Implement validation
   - Register routes
   - Test endpoints

5. **Task 5: Integration Testing** (1 hour)
   - Create manual test script
   - Run all tests
   - Verify all passing
   - Document results

**Total Estimated Time:** 12 hours

---

## ✅ Definition of Done

- [ ] All 5 tasks completed
- [ ] All migrations executed successfully
- [ ] 100+ trades seeded
- [ ] 4 pattern detectors working
- [ ] 6 behavioral analyzers working
- [ ] 2 API endpoints working
- [ ] 38+ tests passing (100%)
- [ ] API response time <500ms
- [ ] Documentation complete
- [ ] Code committed with detailed messages

---

**Version:** 1.0  
**Last Updated:** 2025-10-15  
**Status:** Ready for Implementation

