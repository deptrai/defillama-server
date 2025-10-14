# Story 3.1.2: Trade Pattern Analysis

**Epic:** On-Chain Services V1  
**Feature:** 3.1 - Smart Money Tracking  
**Story ID:** STORY-3.1.2  
**Story Points:** 13  
**Priority:** P0 (Critical)  
**Sprint:** Phase 3, Month 10-11  
**Created:** 2025-10-14  
**Product Manager:** Luis  

---

## 📖 User Story

**As a** DeFi trader  
**I want to** analyze trading patterns of smart money wallets  
**So that** I can identify accumulation, distribution, and rotation strategies to inform my own trading decisions  

---

## 🎯 Business Value

**Revenue Impact:** $500K ARR (25% of Phase 3 target)  
**User Impact:** 1,500 premium users (30% of Phase 3 target)  
**Strategic Value:** Advanced analytics differentiation, alpha discovery  

**Key Metrics:**
- Trade patterns detected: 10,000+ per day
- Pattern accuracy: 85%+ (validated against outcomes)
- User engagement: 60% of smart money feature users
- Alert conversion: 30% of pattern alerts lead to user actions

---

## ✅ Acceptance Criteria

### AC1: Real-time Trade Detection
**Given** a smart money wallet executes a trade  
**When** the transaction is confirmed on-chain  
**Then** the system should detect, classify, and store the trade within 5 seconds  

**Verification:**
- [ ] Trade detection latency <5 seconds
- [ ] Trade classification accuracy >90%
- [ ] All trade details captured (tokens, amounts, protocol, gas)
- [ ] WebSocket notification sent to subscribers

### AC2: Pattern Recognition
**Given** a smart money wallet has executed multiple related trades  
**When** the pattern recognition algorithm runs  
**Then** the system should identify patterns (accumulation, distribution, rotation, arbitrage)  

**Verification:**
- [ ] Accumulation pattern: Gradual buying over time (3+ trades, 7+ days)
- [ ] Distribution pattern: Gradual selling over time (3+ trades, 7+ days)
- [ ] Rotation pattern: Switching between tokens (2+ tokens, <24 hours)
- [ ] Arbitrage pattern: Cross-DEX/cross-chain trades (<5 minutes)
- [ ] Pattern confidence score calculated (0-100)
- [ ] Pattern updates in real-time

### AC3: Behavioral Analysis
**Given** a smart money wallet has sufficient trading history  
**When** behavioral analysis runs  
**Then** the system should classify trading style, risk profile, and preferences  

**Verification:**
- [ ] Trading style: swing, day, position, scalp
- [ ] Risk profile: conservative, moderate, aggressive
- [ ] Preferred tokens identified (top 10)
- [ ] Preferred protocols identified (top 5)
- [ ] Trade timing analysis (early, mid, late, exit)
- [ ] Trade sizing analysis (avg, min, max)

### AC4: Trade Pattern API
**Given** I am an authenticated user  
**When** I request trade patterns for a wallet  
**Then** I should receive detailed pattern information with historical data  

**Verification:**
- [ ] API endpoint: GET `/v1/smart-money/wallets/:address/patterns`
- [ ] Supports filtering by: pattern type, token, time range
- [ ] Includes pattern details, confidence, outcome
- [ ] Response time <500ms (p95)
- [ ] Rate limiting enforced

---

## 🔧 Technical Requirements

### Database Schema

**Table: `wallet_trades`**
```sql
CREATE TABLE wallet_trades (
  id UUID PRIMARY KEY,
  wallet_id UUID REFERENCES smart_money_wallets(id),
  tx_hash VARCHAR(255) NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  trade_type VARCHAR(20) NOT NULL,
  token_in_address VARCHAR(255),
  token_in_symbol VARCHAR(50),
  token_in_amount DECIMAL(30, 10),
  token_in_value_usd DECIMAL(20, 2),
  token_out_address VARCHAR(255),
  token_out_symbol VARCHAR(50),
  token_out_amount DECIMAL(30, 10),
  token_out_value_usd DECIMAL(20, 2),
  protocol_id VARCHAR(255),
  protocol_name VARCHAR(255),
  dex_name VARCHAR(255),
  trade_size_usd DECIMAL(20, 2),
  gas_fee_usd DECIMAL(10, 2),
  slippage_pct DECIMAL(5, 2),
  realized_pnl DECIMAL(20, 2),
  unrealized_pnl DECIMAL(20, 2),
  roi DECIMAL(10, 4),
  holding_period_days INTEGER,
  trade_pattern VARCHAR(50),
  trade_timing VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_trades_wallet_id ON wallet_trades(wallet_id);
CREATE INDEX idx_wallet_trades_timestamp ON wallet_trades(timestamp DESC);
CREATE INDEX idx_wallet_trades_token_in ON wallet_trades(token_in_address);
CREATE INDEX idx_wallet_trades_token_out ON wallet_trades(token_out_address);
CREATE INDEX idx_wallet_trades_pattern ON wallet_trades(trade_pattern);
```

**Table: `trade_patterns`**
```sql
CREATE TABLE trade_patterns (
  id UUID PRIMARY KEY,
  wallet_id UUID REFERENCES smart_money_wallets(id),
  pattern_type VARCHAR(50) NOT NULL,
  pattern_name VARCHAR(255),
  confidence_score DECIMAL(5, 2),
  start_timestamp TIMESTAMP NOT NULL,
  end_timestamp TIMESTAMP,
  duration_hours INTEGER,
  token_address VARCHAR(255),
  token_symbol VARCHAR(50),
  total_trades INTEGER,
  total_volume_usd DECIMAL(20, 2),
  avg_trade_size DECIMAL(20, 2),
  pattern_status VARCHAR(20),
  realized_pnl DECIMAL(20, 2),
  roi DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trade_patterns_wallet_id ON trade_patterns(wallet_id);
CREATE INDEX idx_trade_patterns_type ON trade_patterns(pattern_type);
CREATE INDEX idx_trade_patterns_token ON trade_patterns(token_address);
CREATE INDEX idx_trade_patterns_status ON trade_patterns(pattern_status);
```

### Pattern Recognition Algorithm

```typescript
class PatternRecognizer {
  /**
   * Detect accumulation pattern
   * Criteria: 3+ buy trades, 7+ days, increasing position
   */
  detectAccumulation(trades: Trade[]): Pattern | null {
    const buyTrades = trades.filter(t => t.tradeType === 'buy');
    if (buyTrades.length < 3) return null;
    
    const timeSpan = this.calculateTimeSpan(buyTrades);
    if (timeSpan < 7 * 24 * 60 * 60 * 1000) return null; // 7 days
    
    const positionGrowth = this.calculatePositionGrowth(buyTrades);
    if (positionGrowth < 0.5) return null; // 50% growth
    
    return {
      type: 'accumulation',
      confidence: this.calculateConfidence(buyTrades, timeSpan, positionGrowth),
      trades: buyTrades,
      startTimestamp: buyTrades[0].timestamp,
      endTimestamp: buyTrades[buyTrades.length - 1].timestamp,
    };
  }
  
  /**
   * Detect distribution pattern
   * Criteria: 3+ sell trades, 7+ days, decreasing position
   */
  detectDistribution(trades: Trade[]): Pattern | null {
    const sellTrades = trades.filter(t => t.tradeType === 'sell');
    if (sellTrades.length < 3) return null;
    
    const timeSpan = this.calculateTimeSpan(sellTrades);
    if (timeSpan < 7 * 24 * 60 * 60 * 1000) return null;
    
    const positionDecrease = this.calculatePositionDecrease(sellTrades);
    if (positionDecrease < 0.5) return null;
    
    return {
      type: 'distribution',
      confidence: this.calculateConfidence(sellTrades, timeSpan, positionDecrease),
      trades: sellTrades,
      startTimestamp: sellTrades[0].timestamp,
      endTimestamp: sellTrades[sellTrades.length - 1].timestamp,
    };
  }
  
  /**
   * Detect rotation pattern
   * Criteria: 2+ tokens, <24 hours, similar values
   */
  detectRotation(trades: Trade[]): Pattern | null {
    const uniqueTokens = new Set(trades.map(t => t.tokenOutAddress));
    if (uniqueTokens.size < 2) return null;
    
    const timeSpan = this.calculateTimeSpan(trades);
    if (timeSpan > 24 * 60 * 60 * 1000) return null; // 24 hours
    
    const valueSimilarity = this.calculateValueSimilarity(trades);
    if (valueSimilarity < 0.8) return null; // 80% similarity
    
    return {
      type: 'rotation',
      confidence: this.calculateConfidence(trades, timeSpan, valueSimilarity),
      trades,
      startTimestamp: trades[0].timestamp,
      endTimestamp: trades[trades.length - 1].timestamp,
    };
  }
  
  /**
   * Detect arbitrage pattern
   * Criteria: Cross-DEX/cross-chain, <5 minutes, profit
   */
  detectArbitrage(trades: Trade[]): Pattern | null {
    if (trades.length < 2) return null;
    
    const timeSpan = this.calculateTimeSpan(trades);
    if (timeSpan > 5 * 60 * 1000) return null; // 5 minutes
    
    const crossDex = this.isCrossDex(trades);
    const profit = this.calculateProfit(trades);
    
    if (!crossDex || profit <= 0) return null;
    
    return {
      type: 'arbitrage',
      confidence: this.calculateConfidence(trades, timeSpan, profit),
      trades,
      startTimestamp: trades[0].timestamp,
      endTimestamp: trades[trades.length - 1].timestamp,
    };
  }
}
```

---

## 📋 Implementation Tasks

### Phase 1: Database Setup (2 days)
- [ ] Create `wallet_trades` table
- [ ] Create `trade_patterns` table
- [ ] Create indexes
- [ ] Set up migrations

### Phase 2: Trade Detection (5 days)
- [ ] Implement blockchain event listener
- [ ] Implement trade parser
- [ ] Implement trade classifier
- [ ] Implement real-time storage
- [ ] Unit tests for trade detection

### Phase 3: Pattern Recognition (7 days)
- [ ] Implement accumulation detector
- [ ] Implement distribution detector
- [ ] Implement rotation detector
- [ ] Implement arbitrage detector
- [ ] Implement confidence scoring
- [ ] Unit tests for pattern recognition

### Phase 4: Behavioral Analysis (3 days)
- [ ] Implement trading style classifier
- [ ] Implement risk profile analyzer
- [ ] Implement preference analyzer
- [ ] Implement timing analyzer
- [ ] Unit tests for behavioral analysis

### Phase 5: API Development (3 days)
- [ ] Implement GET `/v1/smart-money/wallets/:address/patterns`
- [ ] Implement GET `/v1/smart-money/wallets/:address/trades`
- [ ] Implement filtering and pagination
- [ ] Add caching layer
- [ ] API integration tests

### Phase 6: Testing & Documentation (3 days)
- [ ] E2E testing
- [ ] Performance testing
- [ ] API documentation
- [ ] User documentation

**Total Estimated Time:** 23 days (4.5 weeks)

---

## 🧪 Testing Strategy

### Unit Tests
- Trade detection and classification
- Pattern recognition algorithms
- Behavioral analysis
- Coverage target: 90%+

### Integration Tests
- Blockchain event processing
- Database operations
- API endpoints
- Real-time notifications

### Performance Tests
- Trade detection latency <5 seconds
- Pattern recognition <30 seconds
- API response time <500ms (p95)
- Load testing: 1000 trades/second

---

## 📊 Success Metrics

### Technical Metrics
- Trade detection latency: <5 seconds
- Pattern accuracy: 85%+
- API response time: <500ms (p95)
- System uptime: 99.9%

### Business Metrics
- Patterns detected: 10,000+ per day
- User engagement: 60% of smart money users
- Alert conversion: 30%
- User satisfaction: 4.5+ rating

---

## 🔗 Dependencies

**Upstream:**
- Story 3.1.1: Smart Money Identification (wallet data)
- Phase 1: WebSocket Connection Manager (real-time updates)

**Downstream:**
- Story 3.1.3: Performance Attribution (pattern outcomes)

---

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Status:** Ready for Sprint Planning

