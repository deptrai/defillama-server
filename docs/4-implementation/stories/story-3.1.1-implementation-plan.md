# Story 3.1.1: Smart Money Identification - Implementation Plan

**Story ID**: STORY-3.1.1  
**Priority**: P0 (Critical)  
**Story Points**: 13  
**Estimated Effort**: ~14 hours  
**Implementation Date**: 2025-10-15

---

## 📋 Implementation Overview

### MVP Scope

✅ **Phase 1**: Database Setup (migration + seed data)  
✅ **Phase 2**: Scoring Algorithm (SmartMoneyScorer engine)  
✅ **Phase 3**: Automated Discovery (simplified với mock data)  
✅ **Phase 4**: API Development (GET endpoint với filtering/sorting/pagination)  
❌ **Phase 5**: Manual Curation (skip - admin UI out of scope for backend MVP)  
✅ **Phase 6**: Testing (comprehensive unit + integration tests)

### Rationale for Scope Decisions

**Why Skip Phase 5 (Manual Curation)?**
- Admin UI requires frontend development (out of scope)
- Core functionality (discovery + scoring + API) sufficient for MVP
- Can be added later via admin API or direct database access

**Why Simplify Phase 3 (Automated Discovery)?**
- No real blockchain indexer available for MVP
- Mock data sufficient to demonstrate functionality
- Production implementation would integrate with Alchemy/Infura

---

## 🗂️ Task Breakdown

### Task 1: Database Setup (2 hours)

**Files to Create:**
- `defi/src/analytics/migrations/020-create-smart-money-wallets.sql`
- `defi/src/analytics/db/seed-smart-money-wallets.sql`

**Migration Schema:**
```sql
CREATE TABLE smart_money_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Identification
  wallet_name VARCHAR(255),
  wallet_type VARCHAR(50), -- 'whale', 'fund', 'trader', 'protocol'
  discovery_method VARCHAR(50), -- 'algorithm', 'manual', 'community'
  verified BOOLEAN DEFAULT FALSE,
  
  -- Scoring
  smart_money_score DECIMAL(5, 2) NOT NULL, -- 0-100
  confidence_level VARCHAR(20), -- 'high', 'medium', 'low'
  
  -- Performance Metrics
  total_pnl DECIMAL(20, 2),
  roi_all_time DECIMAL(10, 4),
  win_rate DECIMAL(5, 2),
  sharpe_ratio DECIMAL(10, 4),
  max_drawdown DECIMAL(10, 4),
  
  -- Activity Metrics
  total_trades INTEGER DEFAULT 0,
  avg_trade_size DECIMAL(20, 2),
  avg_holding_period_days DECIMAL(10, 2),
  last_trade_timestamp TIMESTAMP,
  
  -- Behavioral
  trading_style VARCHAR(50),
  risk_profile VARCHAR(20),
  preferred_tokens VARCHAR(255)[],
  preferred_protocols VARCHAR(255)[],
  
  -- Timestamps
  first_seen TIMESTAMP NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smart_money_wallets_address ON smart_money_wallets(wallet_address);
CREATE INDEX idx_smart_money_wallets_score ON smart_money_wallets(smart_money_score DESC);
CREATE INDEX idx_smart_money_wallets_verified ON smart_money_wallets(verified);
CREATE INDEX idx_smart_money_wallets_composite ON smart_money_wallets(smart_money_score DESC, verified, chain_id);
```

**Seed Data:**
- 5 whales (score 85-95, large trades, high ROI)
- 5 funds (score 80-90, consistent wins, medium risk)
- 10 traders (score 60-80, varied strategies)
- 5 protocols (score 50-70, low-medium activity)
- Mix of chains: ethereum, polygon, arbitrum, optimism

**Verification:**
- Run migration successfully
- Seed 25 wallets
- Verify indexes created
- Check query performance

---

### Task 2: Scoring Algorithm (4 hours)

**Files to Create:**
- `defi/src/analytics/engines/smart-money-scorer.ts` (300-400 lines)
- `defi/src/analytics/engines/tests/smart-money-scorer.test.ts` (400-500 lines)

**Class Design:**
```typescript
export class SmartMoneyScorer {
  private static instance: SmartMoneyScorer;
  private weights = {
    performance: 0.40,
    activity: 0.30,
    behavioral: 0.20,
    verification: 0.10
  };

  public static getInstance(): SmartMoneyScorer;
  
  // Main scoring
  public calculateScore(wallet: WalletData): SmartMoneyScore;
  
  // Sub-scores (40% weight)
  private calculatePerformanceScore(wallet: WalletData): number;
  // - ROI: 40%, Win Rate: 30%, Sharpe: 20%, Drawdown: 10%
  
  // Sub-scores (30% weight)
  private calculateActivityScore(wallet: WalletData): number;
  // - Trade Count: 40%, Trade Size: 30%, Consistency: 30%
  
  // Sub-scores (20% weight)
  private calculateBehavioralScore(wallet: WalletData): number;
  // - Trading Style: 50%, Risk Profile: 50%
  
  // Sub-scores (10% weight)
  private calculateVerificationScore(wallet: WalletData): number;
  // - Verified: 100, Unverified: 50
  
  // Normalization helpers
  private normalizeROI(roi: number): number; // 0-200% → 0-100
  private normalizeSharpe(sharpe: number): number; // 0-3 → 0-100
  private normalizeTradeCount(count: number): number; // 50-1000 → 0-100
  private normalizeTradeSize(size: number): number; // $1K-$1M → 0-100
  
  // Batch processing
  public batchCalculateScores(wallets: WalletData[]): SmartMoneyScore[];
}
```

**Test Coverage (15-20 tests):**
- Singleton pattern
- calculateScore() - main scoring
- calculatePerformanceScore() - all sub-metrics
- calculateActivityScore() - all sub-metrics
- calculateBehavioralScore() - mock implementation
- calculateVerificationScore() - verified vs unverified
- Normalization helpers (ROI, Sharpe, TradeCount, TradeSize)
- Batch processing
- Edge cases (zero trades, negative ROI, etc.)

**Target:** 90%+ code coverage

---

### Task 3: Automated Discovery (3 hours)

**Files to Create:**
- `defi/src/analytics/services/smart-money-discovery.ts` (200-300 lines)
- `defi/src/analytics/services/tests/smart-money-discovery.test.ts` (250-350 lines)

**Service Design:**
```typescript
export class SmartMoneyDiscovery {
  private static instance: SmartMoneyDiscovery;
  private scorer: SmartMoneyScorer;
  
  public static getInstance(): SmartMoneyDiscovery;
  
  // Main discovery (mock for MVP)
  public async discoverWallets(options?: DiscoveryOptions): Promise<DiscoveredWallet[]>;
  
  // Filtering criteria
  private meetsSmartMoneyCriteria(wallet: WalletData): boolean;
  // - Min trades: 50
  // - Min history: 90 days
  // - Min ROI: 20%
  // - Min win rate: 55%
  // - Min trade size: $1,000
  
  // Batch processing
  public async processWalletBatch(wallets: WalletData[]): Promise<void>;
  
  // Mock data generation (MVP only)
  private generateMockWallets(count: number): WalletData[];
}
```

**Test Coverage (8-10 tests):**
- Singleton pattern
- discoverWallets() - main discovery flow
- meetsSmartMoneyCriteria() - filtering logic
- processWalletBatch() - batch processing
- Mock data generation
- Database integration

**MVP Note:**
- Uses mock data for demonstration
- Production would integrate with blockchain indexers

---

### Task 4: API Development (3 hours)

**Files to Create:**
- `defi/src/api2/routes/analytics/smart-money/index.ts` (50-80 lines)
- `defi/src/api2/routes/analytics/smart-money/handlers.ts` (200-300 lines)
- `defi/src/api2/routes/analytics/smart-money/validation.ts` (100-150 lines)
- `defi/src/analytics/collectors/test-smart-money-api.ts` (150-200 lines)

**API Endpoint:** GET `/v1/analytics/smart-money/wallets`

**Request Parameters:**
- chains?: string[] (filter by chains)
- minScore?: number (filter by min score, 0-100)
- verified?: boolean (filter by verification status)
- walletType?: 'whale' | 'fund' | 'trader' | 'protocol'
- sortBy?: 'score' | 'roi' | 'pnl' | 'trades'
- sortOrder?: 'asc' | 'desc' (default: 'desc')
- page?: number (default: 1)
- limit?: number (default: 20, max: 100)

**Response Structure:**
```typescript
{
  wallets: Array<SmartMoneyWallet>,
  pagination: { page, limit, total }
}
```

**Caching Strategy:**
- Redis cache với 5-min TTL
- Cache key: `smart-money:wallets:{filterKey}`
- Invalidate on wallet updates

**Performance Target:**
- API response time <500ms (p95)
- Database query optimization via indexes
- Pagination to limit result size

---

### Task 5: Integration Testing (2 hours)

**Activities:**
1. Run all unit tests (expect 35-40 tests total)
2. Run manual API test script
3. Verify database performance
4. Check API response times
5. Update documentation

**Success Criteria:**
- All tests passing (90%+ coverage)
- API response time <500ms
- 25 mock wallets in database
- Comprehensive documentation

---

## 📊 Expected Outcomes

### Code Statistics
- Migration files: 1
- Seed data files: 1
- Engine files: 1 (300-400 lines)
- Service files: 1 (200-300 lines)
- API files: 3 (350-530 lines)
- Test files: 3 (800-1000 lines)
- Manual test script: 1 (150-200 lines)
- **Total**: ~2,000-2,500 lines of code

### Test Coverage
- Unit tests: 35-40 tests
- Integration tests: Manual testing
- Coverage target: 90%+

### Performance
- API response time: <500ms (p95)
- Database query time: <100ms
- Scoring calculation: <5 seconds per wallet

---

## 🚀 Deployment Checklist

- [ ] Migration 020 created and tested
- [ ] Seed data created and loaded
- [ ] SmartMoneyScorer engine implemented and tested
- [ ] SmartMoneyDiscovery service implemented and tested
- [ ] API endpoints implemented and tested
- [ ] Manual test script created and run
- [ ] All unit tests passing (90%+ coverage)
- [ ] Performance verified (<500ms API response)
- [ ] Documentation updated

---

**Version**: 1.0  
**Last Updated**: 2025-10-15  
**Status**: Ready for Implementation

