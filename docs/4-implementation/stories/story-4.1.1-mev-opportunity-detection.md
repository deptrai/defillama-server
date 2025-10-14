# Story 4.1.1: MEV Opportunity Detection

**Epic:** On-Chain Services V1  
**Feature:** 4.1 - MEV Detection Engine  
**Story ID:** STORY-4.1.1  
**Story Points:** 21  
**Priority:** P0 (Critical)  
**Sprint:** Phase 4, Month 15-16  
**Created:** 2025-10-14  
**Product Manager:** Luis  

---

## 📖 User Story

**As a** MEV searcher or DeFi trader  
**I want to** detect MEV opportunities in real-time (sandwich, frontrun, backrun, arbitrage, liquidation)  
**So that** I can capitalize on profitable opportunities or protect myself from MEV attacks  

---

## 🎯 Business Value

**Revenue Impact:** $1.5M ARR (30% of Phase 4 target)  
**User Impact:** 3,000 premium users (30% of Phase 4 target)  
**Strategic Value:** First-mover advantage in MEV detection, competitive moat  

**Key Metrics:**
- MEV opportunities detected: 10,000+ per day
- Detection latency: <1 second
- Detection accuracy: 90%+
- User engagement: 50% of premium users
- Revenue per user: $500/year

---

## ✅ Acceptance Criteria

### AC1: Real-time Mempool Monitoring
**Given** the system is connected to blockchain mempool nodes  
**When** a new transaction enters the mempool  
**Then** the system should ingest and parse the transaction within 1 second  

**Verification:**
- [ ] Direct connection to Ethereum mainnet mempool
- [ ] Direct connection to L2 mempools (Arbitrum, Optimism, Base)
- [ ] Transaction ingestion latency <1 second
- [ ] Transaction parsing accuracy >99%
- [ ] Support 1000+ transactions/second

### AC2: Sandwich Attack Detection
**Given** transactions in the mempool  
**When** a sandwich pattern is detected (Buy → Victim → Sell)  
**Then** the system should identify the opportunity with profit calculation and confidence score  

**Verification:**
- [ ] Pattern detection: Buy before victim (higher gas), Sell after victim (lower gas)
- [ ] Same token pair validation
- [ ] Profit simulation (including gas costs)
- [ ] Confidence score calculation (0-100)
- [ ] Detection latency <5 seconds
- [ ] Detection accuracy >85%

### AC3: Frontrunning Detection
**Given** a high-value transaction in the mempool  
**When** the transaction has significant price impact (>1%)  
**Then** the system should identify frontrunning opportunities  

**Verification:**
- [ ] Price impact estimation
- [ ] Profit simulation
- [ ] Confidence score calculation
- [ ] Detection latency <5 seconds
- [ ] Detection accuracy >80%

### AC4: Arbitrage Detection
**Given** price data from multiple DEXes  
**When** a price difference >0.5% exists  
**Then** the system should identify arbitrage opportunities  

**Verification:**
- [ ] Multi-DEX price monitoring (Uniswap, Sushiswap, Curve, Balancer)
- [ ] Price difference calculation
- [ ] Profit simulation (including gas and slippage)
- [ ] Cross-chain arbitrage support
- [ ] Detection latency <5 seconds
- [ ] Detection accuracy >90%

### AC5: Liquidation Detection
**Given** lending protocol positions  
**When** a position becomes liquidatable  
**Then** the system should identify liquidation opportunities  

**Verification:**
- [ ] Position monitoring (Aave, Compound, MakerDAO)
- [ ] Health factor calculation
- [ ] Liquidation profit estimation
- [ ] Detection latency <10 seconds
- [ ] Detection accuracy >95%

### AC6: MEV Opportunity API
**Given** I am an authenticated user  
**When** I request MEV opportunities via API  
**Then** I should receive a list with filtering, sorting, and pagination  

**Verification:**
- [ ] API endpoint: GET `/v1/mev/opportunities`
- [ ] Filtering: chains, types, minProfit, botAddress, time range
- [ ] Sorting: profit, timestamp, confidence
- [ ] Pagination: page, limit
- [ ] Response time <500ms (p95)
- [ ] Rate limiting enforced

---

## 🔧 Technical Requirements

### Database Schema

**Table: `mev_opportunities`**
```sql
CREATE TABLE mev_opportunities (
  id UUID PRIMARY KEY,
  opportunity_type VARCHAR(50) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  target_tx_hash VARCHAR(255),
  mev_tx_hashes VARCHAR(255)[],
  token_addresses VARCHAR(255)[],
  token_symbols VARCHAR(50)[],
  protocol_id VARCHAR(255),
  protocol_name VARCHAR(255),
  dex_name VARCHAR(255),
  mev_profit_usd DECIMAL(20, 2) NOT NULL,
  victim_loss_usd DECIMAL(20, 2),
  gas_cost_usd DECIMAL(10, 2),
  net_profit_usd DECIMAL(20, 2),
  bot_address VARCHAR(255),
  bot_name VARCHAR(255),
  bot_type VARCHAR(50),
  detection_method VARCHAR(50),
  confidence_score DECIMAL(5, 2),
  status VARCHAR(20) DEFAULT 'detected',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mev_opportunities_type ON mev_opportunities(opportunity_type);
CREATE INDEX idx_mev_opportunities_chain ON mev_opportunities(chain_id);
CREATE INDEX idx_mev_opportunities_timestamp ON mev_opportunities(timestamp DESC);
CREATE INDEX idx_mev_opportunities_bot ON mev_opportunities(bot_address);
CREATE INDEX idx_mev_opportunities_profit ON mev_opportunities(mev_profit_usd DESC);
CREATE INDEX idx_mev_opportunities_composite ON mev_opportunities(opportunity_type, chain_id, timestamp DESC);
```

### Detection Algorithms

**Sandwich Detection:**
```typescript
class SandwichDetector {
  async detect(mempoolTxs: Transaction[]): Promise<MEVOpportunity[]> {
    // Group by token pair and DEX
    const grouped = this.groupByTokenPairAndDex(mempoolTxs);
    
    for (const [key, txs] of grouped) {
      // Sort by gas price (descending)
      const sorted = txs.sort((a, b) => b.gasPrice - a.gasPrice);
      
      // Look for pattern: Buy → Victim → Sell
      for (let i = 0; i < sorted.length - 2; i++) {
        const frontrun = sorted[i];
        const victim = sorted[i + 1];
        const backrun = sorted[i + 2];
        
        if (this.isSandwichPattern(frontrun, victim, backrun)) {
          const profit = await this.simulateSandwich(frontrun, victim, backrun);
          if (profit > 0) {
            opportunities.push({
              type: 'sandwich',
              frontrunTx: frontrun,
              victimTx: victim,
              backrunTx: backrun,
              estimatedProfit: profit,
              confidence: this.calculateConfidence(frontrun, victim, backrun),
            });
          }
        }
      }
    }
    
    return opportunities;
  }
}
```

**Frontrun Detection:**
```typescript
class FrontrunDetector {
  async detect(mempoolTxs: Transaction[]): Promise<MEVOpportunity[]> {
    for (const tx of mempoolTxs) {
      // Estimate price impact
      const priceImpact = await this.estimatePriceImpact(tx);
      
      if (priceImpact > 0.01) { // 1% threshold
        const profit = await this.simulateFrontrun(tx);
        if (profit > 0) {
          opportunities.push({
            type: 'frontrun',
            targetTx: tx,
            estimatedProfit: profit,
            priceImpact,
            confidence: this.calculateConfidence(tx, priceImpact),
          });
        }
      }
    }
    
    return opportunities;
  }
}
```

**Arbitrage Detection:**
```typescript
class ArbitrageDetector {
  async detect(token: string): Promise<MEVOpportunity[]> {
    // Get prices from all DEXes
    const prices = await this.getPricesFromAllDexes(token);
    
    // Find price differences
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const priceDiff = Math.abs(prices[i].price - prices[j].price);
        const priceDiffPct = priceDiff / Math.min(prices[i].price, prices[j].price);
        
        if (priceDiffPct > 0.005) { // 0.5% threshold
          const profit = await this.simulateArbitrage(prices[i], prices[j]);
          if (profit > 0) {
            opportunities.push({
              type: 'arbitrage',
              buyDex: prices[i].dex,
              sellDex: prices[j].dex,
              token,
              priceDiff: priceDiffPct,
              estimatedProfit: profit,
              confidence: this.calculateConfidence(prices[i], prices[j]),
            });
          }
        }
      }
    }
    
    return opportunities;
  }
}
```

---

## 📋 Implementation Tasks

### Phase 1: Infrastructure Setup (5 days)
- [ ] Provision mempool nodes (Ethereum, L2s)
- [ ] Set up direct mempool connections
- [ ] Configure VPC peering for low latency
- [ ] Test connection latency and throughput
- [ ] Set up monitoring and alerting

### Phase 2: Mempool Monitoring (5 days)
- [ ] Implement mempool listener service (Fargate 24/7)
- [ ] Implement transaction parser
- [ ] Implement transaction classifier
- [ ] Set up Redis cache for hot data
- [ ] Integration tests

### Phase 3: Detection Algorithms (10 days)
- [ ] Implement sandwich detector
- [ ] Implement frontrun detector
- [ ] Implement backrun detector
- [ ] Implement arbitrage detector
- [ ] Implement liquidation detector
- [ ] Unit tests for each detector (90%+ coverage)

### Phase 4: Profit Calculation (3 days)
- [ ] Implement transaction simulator
- [ ] Implement profit calculator (including gas)
- [ ] Implement confidence scorer
- [ ] Unit tests

### Phase 5: Database & Storage (2 days)
- [ ] Create `mev_opportunities` table
- [ ] Create indexes
- [ ] Implement repository pattern
- [ ] Integration tests

### Phase 6: API Development (3 days)
- [ ] Implement GET `/v1/mev/opportunities` endpoint
- [ ] Implement filtering and sorting
- [ ] Implement pagination
- [ ] Add caching layer (Redis)
- [ ] API integration tests

### Phase 7: Testing & Documentation (5 days)
- [ ] E2E testing
- [ ] Performance testing (load testing)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User documentation

**Total Estimated Time:** 33 days (6.5 weeks)

---

## 🧪 Testing Strategy

### Unit Tests
- Detection algorithms (5 types)
- Profit calculation
- Confidence scoring
- Transaction parsing
- Coverage target: 90%+

### Integration Tests
- Mempool monitoring pipeline
- Database operations
- API endpoints
- Caching layer

### Performance Tests
- Mempool monitoring latency <1 second
- Detection latency <5 seconds
- Profit calculation <2 seconds
- API response time <500ms (p95)
- Load testing: 1000 tx/second, 10K concurrent requests

### E2E Tests
- Complete detection flow: Mempool → Detection → Storage → API

---

## 📊 Success Metrics

### Technical Metrics
- Opportunities detected: 10,000+ per day
- Detection latency: <5 seconds
- Detection accuracy: 90%+ (sandwich 85%, frontrun 80%, arbitrage 90%, liquidation 95%)
- API response time: <500ms (p95)
- System uptime: 99.9%

### Business Metrics
- User engagement: 50% of premium users
- Feature usage: 100,000+ API calls/day
- User satisfaction: 4.5+ rating
- Revenue per user: $500/year

---

## 🔗 Dependencies

**Upstream:**
- Phase 1: WebSocket Connection Manager (real-time updates)
- Phase 1: Alert Engine (MEV alerts)

**Downstream:**
- Story 4.1.2: MEV Protection Insights (uses opportunity data)
- Story 4.1.3: Advanced MEV Analytics (uses opportunity data)

**External:**
- Mempool nodes (Ethereum, L2s)
- DEX price feeds (Uniswap, Sushiswap, Curve, Balancer)
- Lending protocol data (Aave, Compound, MakerDAO)

---

## 🚀 Deployment Plan

### Staging Deployment (Week 6)
- Deploy to staging environment
- Run integration tests
- Performance testing
- Security testing

### Production Deployment (Week 7)
- Blue-green deployment
- Gradual rollout (10% → 50% → 100%)
- Monitor metrics
- Rollback plan ready

---

## 📝 Notes

**Risk Mitigation:**
- False positives: Implement confidence scoring and validation
- Latency: Direct mempool connections, VPC peering
- Scalability: Horizontal scaling for detection services
- Accuracy: Continuous model improvement based on feedback

**Future Enhancements:**
- Machine learning for improved detection
- Cross-chain MEV detection
- MEV bundle detection
- Flashbots integration

---

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Status:** Ready for Sprint Planning

