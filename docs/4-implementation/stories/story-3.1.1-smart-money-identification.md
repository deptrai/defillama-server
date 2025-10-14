# Story 3.1.1: Smart Money Identification

**Epic:** On-Chain Services V1  
**Feature:** 3.1 - Smart Money Tracking  
**Story ID:** STORY-3.1.1  
**Story Points:** 13  
**Priority:** P0 (Critical)  
**Sprint:** Phase 3, Month 9-10  
**Created:** 2025-10-14  
**Product Manager:** Luis  

---

## 📖 User Story

**As a** DeFi trader or researcher  
**I want to** identify and track successful DeFi traders ("smart money")  
**So that** I can learn from their strategies and potentially replicate their success  

---

## 🎯 Business Value

**Revenue Impact:** $500K ARR (25% of Phase 3 target)  
**User Impact:** 1,500 premium users (30% of Phase 3 target)  
**Strategic Value:** Differentiation from competitors, alpha discovery platform  

**Key Metrics:**
- Smart money wallets identified: 10,000+
- User engagement: 70% of premium users use this feature
- Retention: 85% monthly retention for users of this feature
- Conversion: 25% free → premium conversion driven by this feature

---

## ✅ Acceptance Criteria

### AC1: Automated Wallet Discovery
**Given** the system is monitoring blockchain transactions  
**When** a wallet meets smart money criteria (high ROI, consistent wins, significant volume)  
**Then** the wallet should be automatically added to the smart money database with a calculated score  

**Verification:**
- [ ] System identifies 100+ new smart money wallets per day
- [ ] Smart money score is calculated accurately (0-100 scale)
- [ ] Confidence level is assigned (high/medium/low)
- [ ] False positive rate <5%

### AC2: Manual Wallet Curation
**Given** I am an admin or verified curator  
**When** I submit a wallet address for smart money verification  
**Then** the system should validate the wallet, calculate metrics, and add it to the database  

**Verification:**
- [ ] Admin can submit wallet addresses via UI
- [ ] System validates wallet exists and has sufficient history
- [ ] Metrics are calculated within 30 seconds
- [ ] Curator can add notes and tags

### AC3: Wallet Scoring Algorithm
**Given** a wallet has sufficient trading history (>50 trades, >90 days)  
**When** the scoring algorithm runs  
**Then** the wallet should receive a smart money score based on performance, activity, and behavioral factors  

**Verification:**
- [ ] Score is calculated using multi-factor algorithm
- [ ] Performance metrics: P&L, ROI, win rate, Sharpe ratio (40% weight)
- [ ] Activity metrics: Trade count, avg size, holding period (30% weight)
- [ ] Behavioral metrics: Trading style consistency, risk profile (20% weight)
- [ ] Verification bonus: Manual verification, community reputation (10% weight)
- [ ] Score updates daily

### AC4: Smart Money Wallet List API
**Given** I am an authenticated user  
**When** I request the smart money wallet list via API  
**Then** I should receive a paginated list with filtering and sorting options  

**Verification:**
- [ ] API endpoint: GET `/v1/smart-money/wallets`
- [ ] Supports filtering by: chain, score, verification, wallet type
- [ ] Supports sorting by: score, ROI, P&L, trades
- [ ] Pagination: page, limit parameters
- [ ] Response time <500ms (p95)
- [ ] Rate limiting enforced per tier

---

## 🔧 Technical Requirements

### Database Schema

**Table: `smart_money_wallets`**
```sql
CREATE TABLE smart_money_wallets (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  wallet_name VARCHAR(255),
  wallet_type VARCHAR(50),
  discovery_method VARCHAR(50),
  verified BOOLEAN DEFAULT FALSE,
  smart_money_score DECIMAL(5, 2) NOT NULL,
  confidence_level VARCHAR(20),
  total_pnl DECIMAL(20, 2),
  roi_all_time DECIMAL(10, 4),
  win_rate DECIMAL(5, 2),
  sharpe_ratio DECIMAL(10, 4),
  max_drawdown DECIMAL(10, 4),
  total_trades INTEGER DEFAULT 0,
  avg_trade_size DECIMAL(20, 2),
  avg_holding_period_days DECIMAL(10, 2),
  last_trade_timestamp TIMESTAMP,
  trading_style VARCHAR(50),
  risk_profile VARCHAR(20),
  preferred_tokens VARCHAR(255)[],
  preferred_protocols VARCHAR(255)[],
  first_seen TIMESTAMP NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smart_money_wallets_address ON smart_money_wallets(wallet_address);
CREATE INDEX idx_smart_money_wallets_score ON smart_money_wallets(smart_money_score DESC);
CREATE INDEX idx_smart_money_wallets_verified ON smart_money_wallets(verified);
CREATE INDEX idx_smart_money_wallets_composite ON smart_money_wallets(smart_money_score DESC, verified, chain_id);
```

### API Specification

**Endpoint:** GET `/v1/smart-money/wallets`

**Request Parameters:**
```typescript
interface SmartMoneyWalletsRequest {
  chains?: string[];
  minScore?: number;
  verified?: boolean;
  walletType?: 'whale' | 'fund' | 'trader' | 'protocol';
  sortBy?: 'score' | 'roi' | 'pnl' | 'trades';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
interface SmartMoneyWalletsResponse {
  wallets: Array<{
    walletAddress: string;
    chainId: string;
    walletName: string;
    walletType: string;
    verified: boolean;
    scoring: {
      smartMoneyScore: number;
      confidenceLevel: string;
    };
    performance: {
      totalPnl: number;
      roiAllTime: number;
      winRate: number;
      sharpeRatio: number;
      maxDrawdown: number;
    };
    activity: {
      totalTrades: number;
      avgTradeSize: number;
      avgHoldingPeriodDays: number;
      lastTradeTimestamp: string;
    };
    behavioral: {
      tradingStyle: string;
      riskProfile: string;
      preferredTokens: string[];
      preferredProtocols: string[];
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

### Scoring Algorithm

```typescript
class SmartMoneyScorer {
  calculateScore(wallet: WalletData): number {
    const weights = {
      performance: 0.40,
      activity: 0.30,
      behavioral: 0.20,
      verification: 0.10
    };
    
    const performanceScore = this.calculatePerformanceScore(wallet);
    const activityScore = this.calculateActivityScore(wallet);
    const behavioralScore = this.calculateBehavioralScore(wallet);
    const verificationScore = this.calculateVerificationScore(wallet);
    
    return (
      performanceScore * weights.performance +
      activityScore * weights.activity +
      behavioralScore * weights.behavioral +
      verificationScore * weights.verification
    );
  }
  
  private calculatePerformanceScore(wallet: WalletData): number {
    // ROI: 40%, Win Rate: 30%, Sharpe Ratio: 20%, Max Drawdown: 10%
    const roiScore = this.normalizeROI(wallet.roiAllTime);
    const winRateScore = wallet.winRate;
    const sharpeScore = this.normalizeSharpe(wallet.sharpeRatio);
    const drawdownScore = 100 - Math.abs(wallet.maxDrawdown * 100);
    
    return (
      roiScore * 0.40 +
      winRateScore * 0.30 +
      sharpeScore * 0.20 +
      drawdownScore * 0.10
    );
  }
  
  private calculateActivityScore(wallet: WalletData): number {
    // Trade count: 40%, Avg trade size: 30%, Consistency: 30%
    const tradeCountScore = this.normalizeTradeCount(wallet.totalTrades);
    const tradeSizeScore = this.normalizeTrade Size(wallet.avgTradeSize);
    const consistencyScore = this.calculateConsistency(wallet);
    
    return (
      tradeCountScore * 0.40 +
      tradeSizeScore * 0.30 +
      consistencyScore * 0.30
    );
  }
}
```

---

## 📋 Implementation Tasks

### Phase 1: Database Setup (2 days)
- [ ] Create `smart_money_wallets` table
- [ ] Create indexes for query optimization
- [ ] Set up database migrations
- [ ] Create seed data for testing

### Phase 2: Scoring Algorithm (5 days)
- [ ] Implement performance score calculation
- [ ] Implement activity score calculation
- [ ] Implement behavioral score calculation
- [ ] Implement verification score calculation
- [ ] Unit tests for scoring algorithm (90%+ coverage)

### Phase 3: Automated Discovery (5 days)
- [ ] Implement wallet discovery service
- [ ] Set up blockchain data ingestion
- [ ] Implement filtering criteria
- [ ] Implement batch processing
- [ ] Integration tests for discovery

### Phase 4: API Development (3 days)
- [ ] Implement GET `/v1/smart-money/wallets` endpoint
- [ ] Implement filtering and sorting
- [ ] Implement pagination
- [ ] Add caching layer (Redis)
- [ ] API integration tests

### Phase 5: Manual Curation (2 days)
- [ ] Implement admin UI for wallet submission
- [ ] Implement validation logic
- [ ] Implement curator notes and tags
- [ ] Admin integration tests

### Phase 6: Testing & Documentation (3 days)
- [ ] E2E testing
- [ ] Performance testing (load testing)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User documentation

**Total Estimated Time:** 20 days (4 weeks)

---

## 🧪 Testing Strategy

### Unit Tests
- Scoring algorithm tests (all calculation methods)
- Validation logic tests
- Data transformation tests
- Coverage target: 90%+

### Integration Tests
- Database operations
- API endpoints
- Caching layer
- External data sources

### Performance Tests
- API response time <500ms (p95)
- Scoring calculation <5 seconds
- Discovery processing 100+ wallets/minute
- Load testing: 1000 concurrent requests

### E2E Tests
- Complete wallet discovery flow
- Manual curation flow
- API query flow with filters and sorting

---

## 📊 Success Metrics

### Technical Metrics
- Smart money wallets identified: 10,000+ within 3 months
- Scoring accuracy: 95%+ (validated against manual review)
- API response time: <500ms (p95)
- System uptime: 99.9%
- False positive rate: <5%

### Business Metrics
- User engagement: 70% of premium users
- Feature usage: 50,000+ API calls/day
- User satisfaction: 4.5+ rating
- Conversion rate: 25% free → premium

---

## 🔗 Dependencies

**Upstream:**
- Phase 1: WebSocket Connection Manager (for real-time updates)
- Phase 1: Alert Engine (for smart money alerts)
- Phase 2: Query Processor (for historical data)

**Downstream:**
- Story 3.1.2: Trade Pattern Analysis (uses smart money wallet data)
- Story 3.1.3: Performance Attribution (uses smart money wallet data)

**External:**
- Blockchain data providers (Alchemy, Infura)
- Price data APIs (CoinGecko, CoinMarketCap)

---

## 🚀 Deployment Plan

### Staging Deployment (Week 3)
- Deploy to staging environment
- Run integration tests
- Performance testing
- Security testing

### Production Deployment (Week 4)
- Blue-green deployment
- Gradual rollout (10% → 50% → 100%)
- Monitor metrics
- Rollback plan ready

---

## 📝 Notes

**Risk Mitigation:**
- False positives: Implement confidence scoring and manual review
- Data quality: Validate data sources and implement data quality checks
- Performance: Implement caching and batch processing
- Scalability: Use horizontal scaling for discovery service

**Future Enhancements:**
- Machine learning for improved scoring
- Social features (following, notifications)
- Copy-trading integration
- Cross-chain wallet clustering

---

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Status:** Ready for Sprint Planning

