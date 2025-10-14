# Story 3.2.2: Suspicious Activity Detection

**Epic:** On-Chain Services V1  
**Feature:** 3.2 - Risk Monitoring System  
**Story ID:** STORY-3.2.2  
**Story Points:** 13  
**Priority:** P0 (Critical)  
**Sprint:** Phase 3, Month 13-14  
**Created:** 2025-10-14  
**Product Manager:** Luis  

---

## 📖 User Story

**As a** DeFi protocol developer or security researcher  
**I want to** detect suspicious activities like rug pulls, wash trading, pump & dump schemes, and sybil attacks  
**So that** I can protect users, investigate incidents, and maintain protocol integrity  

---

## 🎯 Business Value

**Revenue Impact:** $700K ARR (35% of Phase 3 target)  
**User Impact:** 1,750 premium users (35% of Phase 3 target)  
**Strategic Value**: Security leadership, user protection, regulatory compliance  

**Key Metrics:**
- Suspicious activities detected: 1,000+ per day
- Detection latency: <1 minute
- Detection accuracy: 85%+ (validated against confirmed incidents)
- False positive rate: <10%
- User engagement: 45% of premium users
- Revenue per user: $400/year

---

## ✅ Acceptance Criteria

### AC1: Rug Pull Detection
**Given** a protocol with liquidity pools  
**When** monitoring for rug pull indicators  
**Then** the system should detect sudden liquidity removal, token dumps, and contract manipulation  

**Verification:**
- [ ] Liquidity removal detection (>50% in <1 hour)
- [ ] Token dump detection (>30% supply sold in <1 hour)
- [ ] Contract ownership transfer detection
- [ ] Emergency pause/upgrade detection
- [ ] Confidence score calculation (0-100)
- [ ] Detection latency <1 minute
- [ ] Detection accuracy >80%

### AC2: Wash Trading Detection
**Given** trading activity on a protocol  
**When** analyzing for wash trading patterns  
**Then** the system should identify self-trading, circular trading, and artificial volume inflation  

**Verification:**
- [ ] Self-trading detection (same wallet buy/sell)
- [ ] Circular trading detection (A→B→C→A pattern)
- [ ] Volume inflation detection (abnormal volume spikes)
- [ ] Price manipulation detection (coordinated trades)
- [ ] Confidence score calculation
- [ ] Detection latency <5 minutes
- [ ] Detection accuracy >75%

### AC3: Pump & Dump Detection
**Given** token price and volume data  
**When** monitoring for pump & dump schemes  
**Then** the system should detect coordinated buying, price manipulation, and coordinated selling  

**Verification:**
- [ ] Coordinated buying detection (multiple wallets, short timeframe)
- [ ] Price spike detection (>50% in <1 hour)
- [ ] Social media coordination detection (optional)
- [ ] Coordinated selling detection (dump phase)
- [ ] Confidence score calculation
- [ ] Detection latency <5 minutes
- [ ] Detection accuracy >70%

### AC4: Sybil Attack Detection
**Given** user activity on a protocol  
**When** analyzing for sybil attacks  
**Then** the system should identify multiple fake accounts, coordinated behavior, and identity clustering  

**Verification:**
- [ ] Multiple account detection (same entity)
- [ ] Coordinated behavior detection (similar patterns)
- [ ] Identity clustering (wallet relationships)
- [ ] Airdrop farming detection
- [ ] Confidence score calculation
- [ ] Detection latency <10 minutes
- [ ] Detection accuracy >80%

### AC5: Alert Generation and Notification
**Given** a suspicious activity is detected  
**When** the confidence score exceeds threshold  
**Then** the system should generate alerts and notify relevant parties  

**Verification:**
- [ ] Alert generation for high-confidence detections (>70%)
- [ ] Multi-channel notifications (email, webhook, SMS)
- [ ] Alert severity classification (low, medium, high, critical)
- [ ] Alert deduplication
- [ ] Alert acknowledgment tracking

### AC6: Suspicious Activity API
**Given** I am an authenticated user  
**When** I request suspicious activity data  
**Then** I should receive comprehensive detection results  

**Verification:**
- [ ] API endpoint: GET `/v1/risk/suspicious-activities`
- [ ] Filtering: activity type, severity, protocol, time range
- [ ] Sorting: timestamp, confidence, severity
- [ ] Pagination support
- [ ] Response time <1 second (p95)
- [ ] Rate limiting enforced

---

## 🔧 Technical Requirements

### Database Schema

**Table: `suspicious_activities`**
```sql
CREATE TABLE suspicious_activities (
  id UUID PRIMARY KEY,
  activity_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  confidence_score DECIMAL(5, 2) NOT NULL,
  protocol_id VARCHAR(255),
  wallet_addresses VARCHAR(255)[],
  token_addresses VARCHAR(255)[],
  chain_id VARCHAR(50) NOT NULL,
  detection_timestamp TIMESTAMP NOT NULL,
  detection_method VARCHAR(50),
  detector_version VARCHAR(20),
  evidence_tx_hashes VARCHAR(255)[],
  evidence_description TEXT,
  evidence_metrics JSONB,
  estimated_loss_usd DECIMAL(20, 2),
  affected_users INTEGER,
  affected_protocols VARCHAR(255)[],
  status VARCHAR(20) DEFAULT 'investigating',
  investigation_notes TEXT,
  resolution_timestamp TIMESTAMP,
  alert_sent BOOLEAN DEFAULT FALSE,
  reported_to_authorities BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suspicious_activities_type ON suspicious_activities(activity_type);
CREATE INDEX idx_suspicious_activities_severity ON suspicious_activities(severity);
CREATE INDEX idx_suspicious_activities_protocol ON suspicious_activities(protocol_id);
CREATE INDEX idx_suspicious_activities_timestamp ON suspicious_activities(detection_timestamp DESC);
CREATE INDEX idx_suspicious_activities_status ON suspicious_activities(status);
```

### Detection Algorithms

```typescript
class SuspiciousActivityDetector {
  async detectRugPull(protocolId: string): Promise<SuspiciousActivity | null> {
    const protocol = await this.getProtocolData(protocolId);
    
    // Check liquidity removal
    const liquidityRemoval = await this.checkLiquidityRemoval(protocol);
    if (liquidityRemoval.percentage > 0.5 && liquidityRemoval.timeframe < 3600) {
      return this.createActivity('rug_pull', 'critical', 90, {
        type: 'liquidity_removal',
        percentage: liquidityRemoval.percentage,
        timeframe: liquidityRemoval.timeframe,
      });
    }
    
    // Check token dump
    const tokenDump = await this.checkTokenDump(protocol);
    if (tokenDump.percentage > 0.3 && tokenDump.timeframe < 3600) {
      return this.createActivity('rug_pull', 'critical', 85, {
        type: 'token_dump',
        percentage: tokenDump.percentage,
        timeframe: tokenDump.timeframe,
      });
    }
    
    // Check contract manipulation
    const contractManipulation = await this.checkContractManipulation(protocol);
    if (contractManipulation.detected) {
      return this.createActivity('rug_pull', 'critical', 95, {
        type: 'contract_manipulation',
        action: contractManipulation.action,
      });
    }
    
    return null;
  }
  
  async detectWashTrading(protocolId: string): Promise<SuspiciousActivity[]> {
    const activities: SuspiciousActivity[] = [];
    const trades = await this.getRecentTrades(protocolId);
    
    // Self-trading detection
    const selfTrades = this.findSelfTrades(trades);
    if (selfTrades.length > 10) {
      activities.push(this.createActivity('wash_trading', 'high', 80, {
        type: 'self_trading',
        count: selfTrades.length,
        wallets: selfTrades.map(t => t.wallet),
      }));
    }
    
    // Circular trading detection
    const circularTrades = this.findCircularTrades(trades);
    if (circularTrades.length > 5) {
      activities.push(this.createActivity('wash_trading', 'high', 75, {
        type: 'circular_trading',
        count: circularTrades.length,
        patterns: circularTrades,
      }));
    }
    
    // Volume inflation detection
    const volumeInflation = await this.checkVolumeInflation(protocolId);
    if (volumeInflation.detected) {
      activities.push(this.createActivity('wash_trading', 'medium', 70, {
        type: 'volume_inflation',
        normalVolume: volumeInflation.normalVolume,
        currentVolume: volumeInflation.currentVolume,
        inflationRatio: volumeInflation.ratio,
      }));
    }
    
    return activities;
  }
  
  async detectPumpAndDump(tokenAddress: string): Promise<SuspiciousActivity | null> {
    const token = await this.getTokenData(tokenAddress);
    
    // Check coordinated buying (pump phase)
    const coordinatedBuying = await this.checkCoordinatedBuying(token);
    if (coordinatedBuying.detected) {
      const priceChange = await this.getPriceChange(tokenAddress, 3600);
      
      if (priceChange > 0.5) { // 50% price increase
        return this.createActivity('pump_dump', 'high', 75, {
          phase: 'pump',
          walletCount: coordinatedBuying.walletCount,
          priceChange,
          timeframe: 3600,
        });
      }
    }
    
    // Check coordinated selling (dump phase)
    const coordinatedSelling = await this.checkCoordinatedSelling(token);
    if (coordinatedSelling.detected) {
      return this.createActivity('pump_dump', 'critical', 80, {
        phase: 'dump',
        walletCount: coordinatedSelling.walletCount,
        priceChange: coordinatedSelling.priceChange,
        estimatedLoss: coordinatedSelling.estimatedLoss,
      });
    }
    
    return null;
  }
  
  async detectSybilAttack(protocolId: string): Promise<SuspiciousActivity | null> {
    const users = await this.getProtocolUsers(protocolId);
    
    // Cluster wallets by behavior
    const clusters = await this.clusterWalletsByBehavior(users);
    
    // Find suspicious clusters
    const suspiciousClusters = clusters.filter(c => 
      c.wallets.length > 10 && 
      c.similarityScore > 0.8
    );
    
    if (suspiciousClusters.length > 0) {
      return this.createActivity('sybil_attack', 'high', 85, {
        clusterCount: suspiciousClusters.length,
        totalWallets: suspiciousClusters.reduce((sum, c) => sum + c.wallets.length, 0),
        similarityScore: suspiciousClusters[0].similarityScore,
      });
    }
    
    return null;
  }
}
```

---

## 📋 Implementation Tasks

### Phase 1: Database Setup (2 days)
- [ ] Create `suspicious_activities` table
- [ ] Create indexes
- [ ] Set up migrations

### Phase 2: Rug Pull Detector (4 days)
- [ ] Implement liquidity removal detector
- [ ] Implement token dump detector
- [ ] Implement contract manipulation detector
- [ ] Unit tests

### Phase 3: Wash Trading Detector (4 days)
- [ ] Implement self-trading detector
- [ ] Implement circular trading detector
- [ ] Implement volume inflation detector
- [ ] Unit tests

### Phase 4: Pump & Dump Detector (3 days)
- [ ] Implement coordinated buying detector
- [ ] Implement price spike detector
- [ ] Implement coordinated selling detector
- [ ] Unit tests

### Phase 5: Sybil Attack Detector (3 days)
- [ ] Implement wallet clustering algorithm
- [ ] Implement behavior similarity analyzer
- [ ] Implement airdrop farming detector
- [ ] Unit tests

### Phase 6: Alert System Integration (2 days)
- [ ] Implement alert generation
- [ ] Implement multi-channel notifications
- [ ] Implement alert deduplication
- [ ] Integration tests

### Phase 7: API Development (3 days)
- [ ] Implement GET `/v1/risk/suspicious-activities` endpoint
- [ ] Implement filtering and sorting
- [ ] Add caching layer
- [ ] API integration tests

### Phase 8: Testing & Documentation (3 days)
- [ ] E2E testing
- [ ] Performance testing
- [ ] API documentation
- [ ] User documentation

**Total Estimated Time:** 24 days (4.5 weeks)

---

## 🧪 Testing Strategy

### Unit Tests
- Rug pull detection algorithms
- Wash trading detection algorithms
- Pump & dump detection algorithms
- Sybil attack detection algorithms
- Coverage target: 90%+

### Integration Tests
- API endpoints
- Database operations
- Alert system integration

### Performance Tests
- Detection latency <1 minute (rug pull)
- Detection latency <5 minutes (wash trading, pump & dump)
- Detection latency <10 minutes (sybil attack)
- API response time <1 second (p95)

### E2E Tests
- Complete detection flow: Monitoring → Detection → Alert → API

---

## 📊 Success Metrics

### Technical Metrics
- Suspicious activities detected: 1,000+ per day
- Detection latency: <1 minute (rug pull), <5 minutes (wash trading, pump & dump), <10 minutes (sybil)
- Detection accuracy: 85%+
- False positive rate: <10%
- API response time: <1 second (p95)
- System uptime: 99.99%

### Business Metrics
- User engagement: 45% of premium users
- Feature usage: 30,000+ API calls/day
- User satisfaction: 4.5+ rating
- Revenue per user: $400/year

---

## 🔗 Dependencies

**Upstream:**
- Story 3.2.1: Protocol Risk Assessment (protocol data)

**External:**
- Blockchain data providers
- Social media APIs (optional, for pump & dump detection)

---

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Status:** Ready for Sprint Planning

