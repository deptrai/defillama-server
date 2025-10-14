# Story 4.1.3: Advanced MEV Analytics

**Epic:** On-Chain Services V1  
**Feature:** 4.1 - MEV Detection Engine  
**Story ID:** STORY-4.1.3  
**Story Points:** 13  
**Priority:** P1 (High)  
**Sprint:** Phase 4, Month 17-18  
**Created:** 2025-10-14  
**Product Manager:** Luis  

---

## 📖 User Story

**As a** protocol developer, researcher, or institutional trader  
**I want to** analyze MEV trends, bot performance, and protocol leakage  
**So that** I can understand MEV dynamics, optimize protocol design, or benchmark searcher strategies  

---

## 🎯 Business Value

**Revenue Impact:** $2M ARR (40% of Phase 4 target)  
**User Impact:** 4,000 premium users (40% of Phase 4 target)  
**Strategic Value:** Data insights, research platform, institutional appeal  

**Key Metrics:**
- MEV bots tracked: 1,000+
- Protocols analyzed: 500+
- Historical data: 2+ years
- User engagement: 40% of premium users
- Revenue per user: $500/year

---

## ✅ Acceptance Criteria

### AC1: MEV Bot Identification and Tracking
**Given** MEV opportunities are detected  
**When** a bot executes MEV transactions  
**Then** the system should identify, track, and profile the bot  

**Verification:**
- [ ] Bot identification (address, name, type)
- [ ] Performance tracking (total extracted, success rate, avg profit)
- [ ] Activity tracking (first seen, last active, active days)
- [ ] Strategy analysis (preferred opportunities, protocols, tokens)
- [ ] Sophistication scoring (0-100)
- [ ] 1,000+ bots tracked

### AC2: MEV Profit Attribution
**Given** historical MEV data  
**When** analyzing MEV extraction  
**Then** the system should attribute profit to specific bots, strategies, and opportunities  

**Verification:**
- [ ] Profit attribution by bot
- [ ] Profit attribution by strategy (sandwich, frontrun, arbitrage, liquidation)
- [ ] Profit attribution by protocol
- [ ] Profit attribution by token
- [ ] Time-series profit analysis
- [ ] Accuracy >95%

### AC3: Protocol MEV Leakage Analysis
**Given** a protocol with MEV activity  
**When** analyzing protocol MEV leakage  
**Then** the system should show total MEV extracted, breakdown by type, and user impact  

**Verification:**
- [ ] Total MEV extracted per protocol
- [ ] MEV breakdown by type (sandwich, frontrun, backrun, arbitrage, liquidation)
- [ ] Transaction metrics (total, affected, percentage)
- [ ] User impact (total loss, avg loss per tx)
- [ ] Bot activity (unique bots, top bots)
- [ ] 500+ protocols analyzed

### AC4: MEV Market Trends
**Given** historical MEV data  
**When** analyzing market trends  
**Then** the system should show MEV volume trends, opportunity distribution, and bot competition  

**Verification:**
- [ ] MEV volume trends (daily, weekly, monthly)
- [ ] Opportunity distribution by type
- [ ] Bot competition metrics (unique bots, concentration)
- [ ] Protocol rankings by MEV leakage
- [ ] Token rankings by MEV activity

### AC5: Searcher Performance Benchmarking
**Given** MEV bot data  
**When** benchmarking searcher performance  
**Then** the system should show bot rankings, performance metrics, and strategy effectiveness  

**Verification:**
- [ ] Bot rankings by total extracted
- [ ] Bot rankings by success rate
- [ ] Bot rankings by avg profit per tx
- [ ] Strategy effectiveness comparison
- [ ] Sophistication distribution

### AC6: MEV Analytics API
**Given** I am an authenticated user  
**When** I request MEV analytics via API  
**Then** I should receive comprehensive analytics data  

**Verification:**
- [ ] API endpoint: GET `/v1/mev/analytics/bots`
- [ ] API endpoint: GET `/v1/mev/analytics/protocols/:protocolId/leakage`
- [ ] API endpoint: GET `/v1/mev/analytics/trends`
- [ ] Filtering, sorting, pagination support
- [ ] Response time <2 seconds (p95)
- [ ] Rate limiting enforced

---

## 🔧 Technical Requirements

### Database Schema

**Table: `mev_bots`**
```sql
CREATE TABLE mev_bots (
  id UUID PRIMARY KEY,
  bot_address VARCHAR(255) NOT NULL UNIQUE,
  chain_id VARCHAR(50) NOT NULL,
  bot_name VARCHAR(255),
  bot_type VARCHAR(50),
  verified BOOLEAN DEFAULT FALSE,
  total_mev_extracted DECIMAL(20, 2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2),
  avg_profit_per_tx DECIMAL(20, 2),
  first_seen TIMESTAMP NOT NULL,
  last_active TIMESTAMP,
  active_days INTEGER DEFAULT 0,
  preferred_opportunity_types VARCHAR(50)[],
  preferred_protocols VARCHAR(255)[],
  preferred_tokens VARCHAR(255)[],
  sophistication_score DECIMAL(5, 2),
  uses_flashbots BOOLEAN DEFAULT FALSE,
  uses_private_mempool BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mev_bots_address ON mev_bots(bot_address);
CREATE INDEX idx_mev_bots_chain ON mev_bots(chain_id);
CREATE INDEX idx_mev_bots_extracted ON mev_bots(total_mev_extracted DESC);
CREATE INDEX idx_mev_bots_type ON mev_bots(bot_type);
```

**Table: `protocol_mev_leakage`**
```sql
CREATE TABLE protocol_mev_leakage (
  id UUID PRIMARY KEY,
  protocol_id VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  total_mev_extracted DECIMAL(20, 2) NOT NULL,
  sandwich_mev DECIMAL(20, 2),
  frontrun_mev DECIMAL(20, 2),
  backrun_mev DECIMAL(20, 2),
  arbitrage_mev DECIMAL(20, 2),
  liquidation_mev DECIMAL(20, 2),
  total_transactions INTEGER,
  mev_affected_transactions INTEGER,
  mev_affected_pct DECIMAL(5, 2),
  total_user_loss DECIMAL(20, 2),
  avg_loss_per_affected_tx DECIMAL(20, 2),
  unique_bots INTEGER,
  top_bot_addresses VARCHAR(255)[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_protocol_mev_leakage_protocol ON protocol_mev_leakage(protocol_id);
CREATE INDEX idx_protocol_mev_leakage_date ON protocol_mev_leakage(date DESC);
CREATE INDEX idx_protocol_mev_leakage_extracted ON protocol_mev_leakage(total_mev_extracted DESC);
CREATE INDEX idx_protocol_mev_leakage_composite ON protocol_mev_leakage(protocol_id, date DESC);
```

### Analytics Engine

```typescript
class MEVAnalyticsEngine {
  async analyzeBotPerformance(botAddress: string): Promise<BotAnalytics> {
    // Get bot data
    const bot = await this.getBotData(botAddress);
    
    // Calculate performance metrics
    const performance = {
      totalExtracted: bot.total_mev_extracted,
      totalTransactions: bot.total_transactions,
      successRate: bot.success_rate,
      avgProfitPerTx: bot.avg_profit_per_tx,
      activeDays: bot.active_days,
      profitPerDay: bot.total_mev_extracted / bot.active_days,
    };
    
    // Analyze strategy
    const strategy = {
      preferredOpportunities: bot.preferred_opportunity_types,
      preferredProtocols: bot.preferred_protocols,
      preferredTokens: bot.preferred_tokens,
      sophisticationScore: bot.sophistication_score,
    };
    
    // Get historical performance
    const history = await this.getBotHistory(botAddress);
    
    return {
      bot,
      performance,
      strategy,
      history,
    };
  }
  
  async analyzeProtocolLeakage(protocolId: string): Promise<ProtocolLeakageAnalytics> {
    // Get protocol leakage data
    const leakage = await this.getProtocolLeakage(protocolId);
    
    // Calculate totals
    const totals = {
      totalMevExtracted: leakage.reduce((sum, l) => sum + l.total_mev_extracted, 0),
      totalUserLoss: leakage.reduce((sum, l) => sum + l.total_user_loss, 0),
      totalTransactions: leakage.reduce((sum, l) => sum + l.total_transactions, 0),
      mevAffectedTransactions: leakage.reduce((sum, l) => sum + l.mev_affected_transactions, 0),
    };
    
    // Calculate breakdown
    const breakdown = {
      sandwich: leakage.reduce((sum, l) => sum + l.sandwich_mev, 0),
      frontrun: leakage.reduce((sum, l) => sum + l.frontrun_mev, 0),
      backrun: leakage.reduce((sum, l) => sum + l.backrun_mev, 0),
      arbitrage: leakage.reduce((sum, l) => sum + l.arbitrage_mev, 0),
      liquidation: leakage.reduce((sum, l) => sum + l.liquidation_mev, 0),
    };
    
    // Get top bots
    const topBots = await this.getTopBotsByProtocol(protocolId);
    
    return {
      protocolId,
      totals,
      breakdown,
      topBots,
      history: leakage,
    };
  }
  
  async analyzeMEVTrends(): Promise<MEVTrendsAnalytics> {
    // Get historical MEV data
    const opportunities = await this.getHistoricalOpportunities();
    
    // Calculate volume trends
    const volumeTrends = this.calculateVolumeTrends(opportunities);
    
    // Calculate opportunity distribution
    const opportunityDistribution = this.calculateOpportunityDistribution(opportunities);
    
    // Calculate bot competition
    const botCompetition = await this.calculateBotCompetition();
    
    // Get protocol rankings
    const protocolRankings = await this.getProtocolRankings();
    
    return {
      volumeTrends,
      opportunityDistribution,
      botCompetition,
      protocolRankings,
    };
  }
}
```

---

## 📋 Implementation Tasks

### Phase 1: Database Setup (2 days)
- [ ] Create `mev_bots` table
- [ ] Create `protocol_mev_leakage` table
- [ ] Create indexes
- [ ] Set up migrations

### Phase 2: Bot Tracking (5 days)
- [ ] Implement bot identifier
- [ ] Implement bot tracker
- [ ] Implement performance calculator
- [ ] Implement strategy analyzer
- [ ] Implement sophistication scorer
- [ ] Unit tests

### Phase 3: Profit Attribution (3 days)
- [ ] Implement profit attribution by bot
- [ ] Implement profit attribution by strategy
- [ ] Implement profit attribution by protocol
- [ ] Unit tests

### Phase 4: Protocol Leakage Analysis (3 days)
- [ ] Implement leakage calculator
- [ ] Implement breakdown analyzer
- [ ] Implement user impact calculator
- [ ] Unit tests

### Phase 5: Trend Analysis (3 days)
- [ ] Implement volume trend calculator
- [ ] Implement opportunity distribution analyzer
- [ ] Implement bot competition analyzer
- [ ] Unit tests

### Phase 6: API Development (3 days)
- [ ] Implement GET `/v1/mev/analytics/bots` endpoint
- [ ] Implement GET `/v1/mev/analytics/protocols/:protocolId/leakage` endpoint
- [ ] Implement GET `/v1/mev/analytics/trends` endpoint
- [ ] Add caching layer
- [ ] API integration tests

### Phase 7: Testing & Documentation (3 days)
- [ ] E2E testing
- [ ] Performance testing
- [ ] API documentation
- [ ] User documentation

**Total Estimated Time:** 22 days (4.5 weeks)

---

## 🧪 Testing Strategy

### Unit Tests
- Bot tracking and profiling
- Profit attribution
- Protocol leakage analysis
- Trend analysis
- Coverage target: 90%+

### Integration Tests
- API endpoints
- Database operations
- Historical data processing

### Performance Tests
- Bot tracking updates <5 seconds
- Leakage analysis <2 seconds
- Trend analysis <5 seconds
- API response time <2 seconds (p95)
- Load testing: 10K concurrent requests

### E2E Tests
- Complete analytics flow: Data collection → Analysis → API response

---

## 📊 Success Metrics

### Technical Metrics
- Bots tracked: 1,000+
- Protocols analyzed: 500+
- Historical data: 2+ years
- Analysis accuracy: 95%+
- API response time: <2 seconds (p95)
- System uptime: 99.9%

### Business Metrics
- User engagement: 40% of premium users
- Feature usage: 50,000+ API calls/day
- User satisfaction: 4.5+ rating
- Revenue per user: $500/year

---

## 🔗 Dependencies

**Upstream:**
- Story 4.1.1: MEV Opportunity Detection (opportunity data)
- Story 4.1.2: MEV Protection Insights (protection data)

**External:**
- Historical blockchain data (S3)
- Protocol metadata

---

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Status:** Ready for Sprint Planning

