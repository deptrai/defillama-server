# Story 4.1.2: MEV Protection Insights

**Epic:** On-Chain Services V1  
**Feature:** 4.1 - MEV Detection Engine  
**Story ID:** STORY-4.1.2  
**Story Points:** 13  
**Priority:** P0 (Critical)  
**Sprint:** Phase 4, Month 16-17  
**Created:** 2025-10-14  
**Product Manager:** Luis  

---

## 📖 User Story

**As a** DeFi trader  
**I want to** analyze my transaction's vulnerability to MEV attacks before submitting  
**So that** I can protect myself from sandwich attacks and frontrunning by adjusting slippage, gas, or using private mempools  

---

## 🎯 Business Value

**Revenue Impact:** $1.5M ARR (30% of Phase 4 target)  
**User Impact:** 3,000 premium users (30% of Phase 4 target)  
**Strategic Value:** User protection, trust building, competitive differentiation  

**Key Metrics:**
- Transactions analyzed: 50,000+ per day
- User protection rate: 80% (users who follow recommendations avoid MEV)
- Average MEV loss prevented: $50 per transaction
- User engagement: 60% of premium users
- Revenue per user: $500/year

---

## ✅ Acceptance Criteria

### AC1: Transaction Vulnerability Analysis
**Given** I submit a transaction for analysis  
**When** the system analyzes the transaction  
**Then** I should receive a vulnerability score (0-100) and risk category (low/medium/high/critical)  

**Verification:**
- [ ] Vulnerability score calculation (multi-factor)
- [ ] Risk categorization (low: 0-30, medium: 31-60, high: 61-80, critical: 81-100)
- [ ] Analysis latency <1 second
- [ ] Analysis accuracy >90%

### AC2: MEV Risk Breakdown
**Given** a transaction vulnerability analysis  
**When** the analysis is complete  
**Then** I should see breakdown of sandwich risk, frontrun risk, and backrun risk  

**Verification:**
- [ ] Sandwich risk calculation (0-100)
- [ ] Frontrun risk calculation (0-100)
- [ ] Backrun risk calculation (0-100)
- [ ] Risk factor explanations

### AC3: Estimated Impact
**Given** a transaction vulnerability analysis  
**When** the analysis is complete  
**Then** I should see estimated MEV loss in USD and estimated slippage percentage  

**Verification:**
- [ ] MEV loss estimation (simulation-based)
- [ ] Slippage estimation
- [ ] Accuracy >85% (validated against actual outcomes)

### AC4: Protection Recommendations
**Given** a high-risk transaction (score >60)  
**When** the analysis is complete  
**Then** I should receive actionable recommendations (slippage, gas, private mempool, alternative routes)  

**Verification:**
- [ ] Recommended slippage calculation
- [ ] Recommended gas price calculation
- [ ] Private mempool recommendation (if score >70)
- [ ] Alternative route suggestions (3+ routes)
- [ ] Recommendation effectiveness >80%

### AC5: Transaction Simulation
**Given** a transaction for analysis  
**When** the system simulates the transaction  
**Then** I should see worst case, best case, and expected outcomes  

**Verification:**
- [ ] Worst case simulation (maximum MEV attack)
- [ ] Best case simulation (no MEV attack)
- [ ] Expected case simulation (average scenario)
- [ ] Output amounts, slippage, MEV loss for each case
- [ ] Simulation accuracy >85%

### AC6: MEV Protection API
**Given** I am an authenticated user  
**When** I request transaction analysis via API  
**Then** I should receive comprehensive protection insights  

**Verification:**
- [ ] API endpoint: POST `/v1/mev/protection/analyze`
- [ ] Request validation
- [ ] Response time <1 second (p95)
- [ ] Rate limiting enforced

---

## 🔧 Technical Requirements

### Database Schema

**Table: `transaction_vulnerability_assessments`**
```sql
CREATE TABLE transaction_vulnerability_assessments (
  id UUID PRIMARY KEY,
  tx_hash VARCHAR(255),
  user_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  token_in_address VARCHAR(255),
  token_out_address VARCHAR(255),
  amount_in DECIMAL(30, 10),
  amount_out DECIMAL(30, 10),
  slippage_tolerance DECIMAL(5, 2),
  vulnerability_score DECIMAL(5, 2) NOT NULL,
  risk_category VARCHAR(20) NOT NULL,
  sandwich_risk DECIMAL(5, 2),
  frontrun_risk DECIMAL(5, 2),
  backrun_risk DECIMAL(5, 2),
  estimated_mev_loss_usd DECIMAL(20, 2),
  estimated_slippage_pct DECIMAL(5, 2),
  recommended_slippage DECIMAL(5, 2),
  recommended_gas_price DECIMAL(10, 2),
  use_private_mempool BOOLEAN DEFAULT FALSE,
  use_mev_protection_rpc BOOLEAN DEFAULT FALSE,
  alternative_routes JSONB,
  simulation_results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vulnerability_assessments_user ON transaction_vulnerability_assessments(user_address);
CREATE INDEX idx_vulnerability_assessments_timestamp ON transaction_vulnerability_assessments(timestamp DESC);
CREATE INDEX idx_vulnerability_assessments_risk ON transaction_vulnerability_assessments(risk_category);
CREATE INDEX idx_vulnerability_assessments_score ON transaction_vulnerability_assessments(vulnerability_score DESC);
```

### Protection Analyzer

```typescript
class MEVProtectionAnalyzer {
  async analyzeVulnerability(tx: TransactionRequest): Promise<VulnerabilityAssessment> {
    // Simulate transaction
    const simulation = await this.simulateTransaction(tx);
    
    // Calculate risk scores
    const sandwichRisk = await this.calculateSandwichRisk(tx, simulation);
    const frontrunRisk = await this.calculateFrontrunRisk(tx, simulation);
    const backrunRisk = await this.calculateBackrunRisk(tx, simulation);
    
    // Overall vulnerability score (weighted average)
    const vulnerabilityScore = (
      sandwichRisk * 0.50 +
      frontrunRisk * 0.30 +
      backrunRisk * 0.20
    );
    
    // Risk category
    const riskCategory = this.categorizeRisk(vulnerabilityScore);
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      tx,
      vulnerabilityScore,
      { sandwichRisk, frontrunRisk, backrunRisk }
    );
    
    return {
      vulnerabilityScore,
      riskCategory,
      risks: { sandwichRisk, frontrunRisk, backrunRisk },
      estimatedImpact: simulation.estimatedImpact,
      recommendations,
      simulation: simulation.results,
    };
  }
  
  private async calculateSandwichRisk(
    tx: TransactionRequest,
    simulation: SimulationResult
  ): Promise<number> {
    let risk = 0;
    
    // Factor 1: Transaction size (40%)
    const sizeRisk = this.calculateSizeRisk(tx.amountIn);
    risk += sizeRisk * 0.40;
    
    // Factor 2: Slippage tolerance (30%)
    const slippageRisk = this.calculateSlippageRisk(tx.slippageTolerance);
    risk += slippageRisk * 0.30;
    
    // Factor 3: Liquidity depth (20%)
    const liquidityRisk = await this.calculateLiquidityRisk(tx.tokenPair);
    risk += liquidityRisk * 0.20;
    
    // Factor 4: Mempool congestion (10%)
    const congestionRisk = await this.calculateCongestionRisk();
    risk += congestionRisk * 0.10;
    
    return Math.min(risk, 100);
  }
  
  private async generateRecommendations(
    tx: TransactionRequest,
    vulnerabilityScore: number,
    risks: { sandwichRisk: number; frontrunRisk: number; backrunRisk: number }
  ): Promise<ProtectionRecommendations> {
    const recommendations: ProtectionRecommendations = {
      recommendedSlippage: tx.slippageTolerance,
      recommendedGasPrice: tx.gasPrice,
      usePrivateMempool: false,
      useMevProtectionRpc: false,
      alternativeRoutes: [],
    };
    
    // High risk: Recommend private mempool
    if (vulnerabilityScore > 70) {
      recommendations.usePrivateMempool = true;
      recommendations.useMevProtectionRpc = true;
    }
    
    // High sandwich risk: Reduce slippage
    if (risks.sandwichRisk > 60) {
      recommendations.recommendedSlippage = Math.max(
        tx.slippageTolerance * 0.5,
        0.1
      );
    }
    
    // Find alternative routes
    const alternatives = await this.findAlternativeRoutes(tx);
    recommendations.alternativeRoutes = alternatives;
    
    return recommendations;
  }
}
```

---

## 📋 Implementation Tasks

### Phase 1: Database Setup (2 days)
- [ ] Create `transaction_vulnerability_assessments` table
- [ ] Create indexes
- [ ] Set up migrations

### Phase 2: Transaction Simulator (5 days)
- [ ] Implement transaction simulator
- [ ] Implement worst/best/expected case simulations
- [ ] Implement price impact calculator
- [ ] Unit tests

### Phase 3: Risk Calculators (5 days)
- [ ] Implement sandwich risk calculator
- [ ] Implement frontrun risk calculator
- [ ] Implement backrun risk calculator
- [ ] Implement overall vulnerability scorer
- [ ] Unit tests

### Phase 4: Recommendation Engine (3 days)
- [ ] Implement slippage optimizer
- [ ] Implement gas price optimizer
- [ ] Implement alternative route finder
- [ ] Unit tests

### Phase 5: API Development (3 days)
- [ ] Implement POST `/v1/mev/protection/analyze` endpoint
- [ ] Implement request validation
- [ ] Add caching layer
- [ ] API integration tests

### Phase 6: Testing & Documentation (3 days)
- [ ] E2E testing
- [ ] Performance testing
- [ ] API documentation
- [ ] User documentation

**Total Estimated Time:** 21 days (4 weeks)

---

## 🧪 Testing Strategy

### Unit Tests
- Risk calculators (sandwich, frontrun, backrun)
- Vulnerability scoring
- Recommendation generation
- Transaction simulation
- Coverage target: 90%+

### Integration Tests
- API endpoints
- Database operations
- External data sources (DEX prices, liquidity)

### Performance Tests
- Analysis latency <1 second
- Simulation latency <500ms
- API response time <1 second (p95)
- Load testing: 10K concurrent requests

### E2E Tests
- Complete protection flow: Request → Analysis → Recommendations → Response

---

## 📊 Success Metrics

### Technical Metrics
- Transactions analyzed: 50,000+ per day
- Analysis latency: <1 second
- Analysis accuracy: 90%+
- Recommendation effectiveness: 80%+
- API response time: <1 second (p95)
- System uptime: 99.9%

### Business Metrics
- User engagement: 60% of premium users
- Protection rate: 80% (users avoid MEV)
- Average MEV loss prevented: $50 per transaction
- User satisfaction: 4.5+ rating
- Revenue per user: $500/year

---

## 🔗 Dependencies

**Upstream:**
- Story 4.1.1: MEV Opportunity Detection (detection data)

**Downstream:**
- Story 4.1.3: Advanced MEV Analytics (protection effectiveness data)

**External:**
- DEX liquidity data
- Mempool congestion data
- Gas price oracles

---

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Status:** Ready for Sprint Planning

