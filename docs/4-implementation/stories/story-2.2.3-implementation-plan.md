# Story 2.2.3: Cross-chain Portfolio Aggregation - Implementation Plan

**Story ID:** STORY-2.2.3  
**Story Points:** 13  
**Priority:** P1 (High)  
**Estimated Time:** 10-13 hours  
**Created:** 2025-01-15

---

## 📋 Executive Summary

Implement cross-chain portfolio aggregation system that combines wallet data across multiple blockchains into a unified view. This builds on Story 2.2.1 (Wallet Portfolio Tracking) by adding aggregation logic on top of existing chain-specific data.

**MVP Scope:**
- Support 4 major chains (Ethereum, Polygon, Arbitrum, BSC)
- Aggregate existing wallet_portfolios data
- Provide unified API endpoints
- Use mock/seed data (no real blockchain RPC integration)

---

## 🎯 Acceptance Criteria Coverage

### AC1: Multi-Chain Wallet Aggregation ✅
- Support 4 chains initially (extensible to 100+)
- Multiple wallet addresses per chain
- Automatic balance aggregation via CrossChainAggregationEngine
- Mock data for MVP (real RPC integration deferred)

### AC2: Unified Portfolio View ✅
- Total net worth calculation (sum across chains)
- Net worth changes (24h, 7d, 30d from portfolio_history)
- Asset breakdown (top 10 tokens across all chains)
- Chain breakdown (value distribution by chain)
- Category breakdown (DeFi, stablecoins, native, other)

### AC3: Cross-Chain Asset Normalization ✅
- USD values in seed data
- Handle wrapped tokens (WETH, WBTC)
- Handle bridged tokens (USDC on multiple chains)
- Handle stablecoins (USDC, BUSD, DAI)

### AC4: Cross-Chain Transaction History ✅
- Unified transaction list across all chains
- Transaction type identification
- USD values, timestamps, chain identification
- Filtering by chain, type, date range
- Sorting and pagination

### AC5: Cross-Chain Performance Analytics ✅
- Total P&L (realized + unrealized)
- P&L by chain and by token
- ROI calculation (weighted average)
- Performance charts (from portfolio_history)
- Best/worst performing assets

### AC6: Cross-Chain Portfolio API ✅
- 3 REST endpoints
- Response time <1 second (p95)
- Filtering support
- Proper error handling and caching

---

## 🏗️ Architecture Design

### Database Schema

**New Tables:**

1. **cross_chain_portfolios** - Aggregated portfolio data per user
   - Stores total net worth, breakdowns, metadata
   - One row per user (not per wallet per chain)
   - Acts as materialized view of aggregated data

2. **cross_chain_assets** - Detailed asset list across all chains
   - Links to cross_chain_portfolios
   - Includes chain_id, wallet_address, token info, USD values
   - Enables detailed asset-level queries

**Existing Tables (Reused):**
- wallet_portfolios (chain-specific data)
- wallet_holdings (chain-specific holdings)
- portfolio_history (historical snapshots)

### Engine Architecture

**CrossChainAggregationEngine:**
- Singleton pattern (consistent with other engines)
- Aggregates data from wallet_portfolios and wallet_holdings
- Calculates breakdowns and performance metrics
- Caches results in cross_chain_portfolios table

**Key Methods:**
- `aggregatePortfolio(userId)` - Main aggregation logic
- `getAssetBreakdown(userId)` - Top 10 assets across chains
- `getChainBreakdown(userId)` - Value distribution by chain
- `getCategoryBreakdown(userId)` - Category distribution
- `getCrossChainTransactions(userId)` - Unified transaction history
- `getPerformanceMetrics(userId)` - Cross-chain P&L and ROI

### API Design

**Endpoints:**
1. `GET /v1/analytics/portfolio/cross-chain/:userId` - Aggregated portfolio
2. `GET /v1/analytics/portfolio/cross-chain/:userId/transactions` - Cross-chain transactions
3. `GET /v1/analytics/portfolio/cross-chain/:userId/performance` - Performance metrics

**Features:**
- Query parameters for filtering (chain, asset type, date range)
- HTTP caching (5-min TTL)
- Validation layer
- Error handling (400, 404, 500)

---

## 📊 Seed Data Strategy

### Test User Profile

**User ID:** user-cross-chain-001

**Wallets:**
- Ethereum: 0xCrossChain001
- Polygon: 0xCrossChain002
- Arbitrum: 0xCrossChain003
- BSC: 0xCrossChain004

### Portfolio Composition

**Total Value:** $100,000 USD

**By Chain:**
- Ethereum: $50,000 (50%) - ETH, USDC, WBTC, UNI
- Polygon: $20,000 (20%) - MATIC, USDC, AAVE
- Arbitrum: $20,000 (20%) - ETH, ARB, GMX
- BSC: $10,000 (10%) - BNB, BUSD, CAKE

**By Category:**
- DeFi tokens: $40,000 (40%) - UNI, AAVE, GMX, CAKE
- Stablecoins: $30,000 (30%) - USDC, BUSD
- Native tokens: $20,000 (20%) - ETH, MATIC, BNB, ARB
- Other: $10,000 (10%) - WBTC

**Transactions:** ~50 cross-chain transactions
- Swaps, transfers, stakes across all chains
- Mix of DeFi interactions
- Realistic timestamps and values

---

## 📋 Implementation Tasks

### Task 1: Database Setup (2-3 hours)

**Deliverables:**
- [ ] Migration 018-create-cross-chain-portfolios.sql
- [ ] Migration 019-create-cross-chain-assets.sql
- [ ] Seed script: seed-cross-chain-portfolios.sql
- [ ] Seed script: seed-cross-chain-assets.sql
- [ ] Seed script: seed-cross-chain-transactions.sql
- [ ] Run migrations and verify data

**Acceptance:**
- All migrations execute successfully
- Seed data creates realistic multi-chain portfolio
- Indexes created for performance

### Task 2: CrossChainAggregationEngine (4-5 hours)

**Deliverables:**
- [ ] Create cross-chain-aggregation-engine.ts
- [ ] Implement aggregatePortfolio() method
- [ ] Implement breakdown calculation methods
- [ ] Implement transaction aggregation
- [ ] Implement performance metrics calculation
- [ ] Unit tests (~30 tests)
- [ ] Update engines/index.ts to export new engine

**Acceptance:**
- All methods implemented with proper error handling
- Singleton pattern followed
- 30+ unit tests passing (100%)
- Proper TypeScript types

### Task 3: API Implementation (2-3 hours)

**Deliverables:**
- [ ] Create cross-chain/ directory under portfolio routes
- [ ] Implement validation.ts (input validation)
- [ ] Implement handlers.ts (3 handlers)
- [ ] Implement index.ts (router with 3 endpoints)
- [ ] Update portfolio/index.ts to register cross-chain router
- [ ] Manual test script

**Acceptance:**
- 3 endpoints implemented
- Validation layer complete
- HTTP caching (5-min TTL)
- Error handling (400, 404, 500)
- No TypeScript errors

### Task 4: Integration Testing & Documentation (1-2 hours)

**Deliverables:**
- [ ] Manual API test script
- [ ] Performance verification (<1s p95)
- [ ] Implementation summary document
- [ ] Update response.md with completion status

**Acceptance:**
- All endpoints tested manually
- Performance targets met
- Documentation complete
- All acceptance criteria verified

---

## 🧪 Testing Strategy

### Unit Tests (~30 tests)
- CrossChainAggregationEngine methods
- Breakdown calculations
- Transaction aggregation
- Performance metrics
- Edge cases (empty portfolios, single chain, etc.)

### Integration Tests
- Manual test script for all API endpoints
- End-to-end flow: Seed data → Engine → API → Response

### Performance Tests
- Aggregation query time <500ms
- API response time <1s (p95)
- Database query optimization

---

## 📈 Success Metrics

### Technical Metrics
- Chains supported: 4 (Ethereum, Polygon, Arbitrum, BSC)
- Test coverage: 30+ unit tests (100% passing)
- API response time: <1 second (p95)
- Code quality: No TypeScript errors

### Acceptance Criteria
- All 6 ACs met ✅
- All verification points addressed
- MVP scope delivered

---

## 🔄 Future Enhancements (Out of MVP Scope)

1. **Real Blockchain Integration**
   - Integrate with RPC providers (Infura, Alchemy)
   - Real-time balance fetching
   - Support 100+ chains

2. **Advanced Features**
   - NFT support
   - Real-time price fetching
   - Cross-chain bridge detection
   - Gas cost tracking

3. **Performance Optimization**
   - Redis caching layer
   - Background job for data refresh
   - Incremental updates

---

## 🎯 Implementation Order

1. **Task 1: Database Setup** (Foundation)
2. **Task 2: CrossChainAggregationEngine** (Core Logic)
3. **Task 3: API Implementation** (User Interface)
4. **Task 4: Integration Testing & Documentation** (Validation)

**Total Estimated Time:** 10-13 hours  
**Commits:** 4 (one per task)

---

**Status:** Ready for Implementation  
**Next Step:** Begin Task 1 - Database Setup

