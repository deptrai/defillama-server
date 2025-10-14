# Story 3.2.1: Protocol Risk Assessment

**Epic:** On-Chain Services V1  
**Feature:** 3.2 - Risk Monitoring System  
**Story ID:** STORY-3.2.1  
**Story Points:** 13  
**Priority:** P0 (Critical)  
**Sprint:** Phase 3, Month 12-13  
**Created:** 2025-10-14  
**Product Manager:** Luis  

---

## 📖 User Story

**As a** DeFi trader or protocol developer  
**I want to** assess the risk level of DeFi protocols across multiple factors  
**So that** I can make informed decisions about protocol safety and identify potential vulnerabilities before they become critical  

---

## 🎯 Business Value

**Revenue Impact:** $600K ARR (30% of Phase 3 target)  
**User Impact:** 1,500 premium users (30% of Phase 3 target)  
**Strategic Value**: Risk management, user protection, institutional trust  

**Key Metrics:**
- Protocols assessed: 1,000+ protocols
- Risk factors analyzed: 5 factors (contract, liquidity, governance, operational, market)
- Assessment accuracy: 90%+
- User engagement: 50% of premium users
- Revenue per user: $400/year

---

## ✅ Acceptance Criteria

### AC1: Multi-Factor Risk Scoring
**Given** a DeFi protocol  
**When** assessing risk  
**Then** the system should calculate an overall risk score (0-100) based on 5 risk factors with weighted contributions  

**Verification:**
- [ ] Overall risk score = Σ(factor_score × weight)
- [ ] Contract risk (30%): Audit status, vulnerabilities, code quality
- [ ] Liquidity risk (25%): TVL, depth, concentration
- [ ] Governance risk (20%): Type, distribution, admin keys
- [ ] Operational risk (15%): Age, team, incidents
- [ ] Market risk (10%): Volume, users, volatility
- [ ] Risk categorization: Low (0-30), Medium (31-60), High (61-80), Critical (81-100)
- [ ] Calculation accuracy >90%

### AC2: Smart Contract Risk Analysis
**Given** a protocol's smart contracts  
**When** analyzing contract risk  
**Then** the system should evaluate audit status, known vulnerabilities, and code quality  

**Verification:**
- [ ] Audit status tracking (audited, unaudited, audit in progress)
- [ ] Auditor reputation scoring
- [ ] Known vulnerability detection (CWE IDs)
- [ ] Severity classification (critical, high, medium, low)
- [ ] Code complexity analysis
- [ ] Contract risk score calculation

### AC3: Liquidity Risk Analysis
**Given** a protocol's liquidity data  
**When** analyzing liquidity risk  
**Then** the system should evaluate TVL, liquidity depth, and concentration  

**Verification:**
- [ ] TVL tracking and trend analysis
- [ ] TVL change detection (24h, 7d, 30d)
- [ ] Liquidity depth calculation
- [ ] Concentration ratio (top 10 holders)
- [ ] Liquidity risk score calculation

### AC4: Governance Risk Analysis
**Given** a protocol's governance structure  
**When** analyzing governance risk  
**Then** the system should evaluate governance type, token distribution, and admin key management  

**Verification:**
- [ ] Governance type identification (DAO, multisig, centralized, none)
- [ ] Multisig threshold analysis
- [ ] Token distribution Gini coefficient
- [ ] Admin key holder tracking
- [ ] Governance risk score calculation

### AC5: Operational & Market Risk Analysis
**Given** a protocol's operational and market data  
**When** analyzing operational and market risk  
**Then** the system should evaluate protocol age, team reputation, incident history, volume, and user metrics  

**Verification:**
- [ ] Protocol age calculation
- [ ] Team doxxed status
- [ ] Team reputation scoring
- [ ] Incident count and severity
- [ ] Volume and user metrics
- [ ] Operational and market risk scores

### AC6: Protocol Risk Assessment API
**Given** I am an authenticated user  
**When** I request protocol risk assessment  
**Then** I should receive comprehensive risk analysis  

**Verification:**
- [ ] API endpoint: GET `/v1/risk/protocols/:protocolId/assessment`
- [ ] Includes overall risk, factor breakdown, vulnerabilities
- [ ] Historical risk data support
- [ ] Response time <500ms (p95)
- [ ] Rate limiting enforced

---

## 🔧 Technical Requirements

### Database Schema

**Table: `protocol_risk_assessments`**
```sql
CREATE TABLE protocol_risk_assessments (
  id UUID PRIMARY KEY,
  protocol_id VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  overall_risk_score DECIMAL(5, 2) NOT NULL,
  risk_category VARCHAR(20) NOT NULL,
  contract_risk_score DECIMAL(5, 2),
  audit_status VARCHAR(50),
  auditor_names VARCHAR(255)[],
  known_vulnerabilities INTEGER,
  vulnerability_severity VARCHAR(20),
  liquidity_risk_score DECIMAL(5, 2),
  total_tvl DECIMAL(20, 2),
  tvl_change_24h DECIMAL(10, 4),
  liquidity_depth DECIMAL(20, 2),
  concentration_ratio DECIMAL(5, 2),
  governance_risk_score DECIMAL(5, 2),
  governance_type VARCHAR(50),
  multisig_threshold VARCHAR(20),
  token_distribution_gini DECIMAL(5, 2),
  admin_key_holders INTEGER,
  operational_risk_score DECIMAL(5, 2),
  protocol_age_days INTEGER,
  team_doxxed BOOLEAN,
  team_reputation_score DECIMAL(5, 2),
  incident_count INTEGER,
  market_risk_score DECIMAL(5, 2),
  volume_24h DECIMAL(20, 2),
  volume_change_24h DECIMAL(10, 4),
  user_count INTEGER,
  user_change_24h DECIMAL(10, 4),
  assessment_version VARCHAR(20),
  assessor VARCHAR(100),
  confidence_level VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_protocol_risk_assessments_protocol ON protocol_risk_assessments(protocol_id);
CREATE INDEX idx_protocol_risk_assessments_timestamp ON protocol_risk_assessments(timestamp DESC);
CREATE INDEX idx_protocol_risk_assessments_risk_score ON protocol_risk_assessments(overall_risk_score DESC);
CREATE INDEX idx_protocol_risk_assessments_category ON protocol_risk_assessments(risk_category);
CREATE INDEX idx_protocol_risk_assessments_composite ON protocol_risk_assessments(protocol_id, timestamp DESC);
```

**Table: `smart_contract_vulnerabilities`**
```sql
CREATE TABLE smart_contract_vulnerabilities (
  id UUID PRIMARY KEY,
  protocol_id VARCHAR(255) NOT NULL,
  contract_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  vulnerability_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  cwe_id VARCHAR(20),
  title VARCHAR(255),
  description TEXT,
  impact TEXT,
  recommendation TEXT,
  detection_method VARCHAR(50),
  detector_name VARCHAR(100),
  detection_timestamp TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  fix_timestamp TIMESTAMP,
  fix_tx_hash VARCHAR(255),
  reference_urls TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smart_contract_vulnerabilities_protocol ON smart_contract_vulnerabilities(protocol_id);
CREATE INDEX idx_smart_contract_vulnerabilities_contract ON smart_contract_vulnerabilities(contract_address);
CREATE INDEX idx_smart_contract_vulnerabilities_severity ON smart_contract_vulnerabilities(severity);
CREATE INDEX idx_smart_contract_vulnerabilities_status ON smart_contract_vulnerabilities(status);
```

### Risk Assessment Engine

```typescript
class ProtocolRiskAssessmentEngine {
  async assessProtocol(protocolId: string): Promise<RiskAssessment> {
    // Calculate risk factors
    const contractRisk = await this.calculateContractRisk(protocolId);
    const liquidityRisk = await this.calculateLiquidityRisk(protocolId);
    const governanceRisk = await this.calculateGovernanceRisk(protocolId);
    const operationalRisk = await this.calculateOperationalRisk(protocolId);
    const marketRisk = await this.calculateMarketRisk(protocolId);
    
    // Calculate overall risk score (weighted)
    const overallRiskScore = (
      contractRisk.score * 0.30 +
      liquidityRisk.score * 0.25 +
      governanceRisk.score * 0.20 +
      operationalRisk.score * 0.15 +
      marketRisk.score * 0.10
    );
    
    // Categorize risk
    const riskCategory = this.categorizeRisk(overallRiskScore);
    
    return {
      protocolId,
      overallRiskScore,
      riskCategory,
      contractRisk,
      liquidityRisk,
      governanceRisk,
      operationalRisk,
      marketRisk,
      timestamp: new Date(),
    };
  }
  
  private async calculateContractRisk(protocolId: string): Promise<ContractRisk> {
    const protocol = await this.getProtocolData(protocolId);
    
    // Audit status (40%)
    const auditScore = this.calculateAuditScore(protocol.auditStatus, protocol.auditors);
    
    // Vulnerabilities (40%)
    const vulnerabilities = await this.getVulnerabilities(protocolId);
    const vulnScore = this.calculateVulnerabilityScore(vulnerabilities);
    
    // Code quality (20%)
    const codeQualityScore = await this.analyzeCodeQuality(protocol.contracts);
    
    const score = (
      auditScore * 0.40 +
      vulnScore * 0.40 +
      codeQualityScore * 0.20
    );
    
    return {
      score,
      auditStatus: protocol.auditStatus,
      auditors: protocol.auditors,
      vulnerabilities: vulnerabilities.length,
      criticalVulnerabilities: vulnerabilities.filter(v => v.severity === 'critical').length,
    };
  }
  
  private async calculateLiquidityRisk(protocolId: string): Promise<LiquidityRisk> {
    const liquidity = await this.getLiquidityData(protocolId);
    
    // TVL stability (40%)
    const tvlScore = this.calculateTVLScore(liquidity.tvl, liquidity.tvlChange24h);
    
    // Liquidity depth (30%)
    const depthScore = this.calculateDepthScore(liquidity.depth);
    
    // Concentration (30%)
    const concentrationScore = this.calculateConcentrationScore(liquidity.concentrationRatio);
    
    const score = (
      tvlScore * 0.40 +
      depthScore * 0.30 +
      concentrationScore * 0.30
    );
    
    return {
      score,
      tvl: liquidity.tvl,
      tvlChange24h: liquidity.tvlChange24h,
      depth: liquidity.depth,
      concentrationRatio: liquidity.concentrationRatio,
    };
  }
}
```

---

## 📋 Implementation Tasks

### Phase 1: Database Setup (2 days)
- [ ] Create `protocol_risk_assessments` table
- [ ] Create `smart_contract_vulnerabilities` table
- [ ] Create indexes
- [ ] Set up migrations

### Phase 2: Contract Risk Analyzer (5 days)
- [ ] Implement audit status tracker
- [ ] Implement vulnerability detector
- [ ] Implement code quality analyzer
- [ ] Implement contract risk scorer
- [ ] Unit tests

### Phase 3: Liquidity Risk Analyzer (3 days)
- [ ] Implement TVL tracker
- [ ] Implement liquidity depth calculator
- [ ] Implement concentration analyzer
- [ ] Implement liquidity risk scorer
- [ ] Unit tests

### Phase 4: Governance Risk Analyzer (3 days)
- [ ] Implement governance type identifier
- [ ] Implement token distribution analyzer
- [ ] Implement admin key tracker
- [ ] Implement governance risk scorer
- [ ] Unit tests

### Phase 5: Operational & Market Risk Analyzer (3 days)
- [ ] Implement protocol age calculator
- [ ] Implement team reputation scorer
- [ ] Implement incident tracker
- [ ] Implement volume and user metrics analyzer
- [ ] Unit tests

### Phase 6: Risk Assessment Engine (3 days)
- [ ] Implement overall risk scorer
- [ ] Implement risk categorizer
- [ ] Implement confidence calculator
- [ ] Unit tests

### Phase 7: API Development (3 days)
- [ ] Implement GET `/v1/risk/protocols/:protocolId/assessment` endpoint
- [ ] Implement historical risk data support
- [ ] Add caching layer
- [ ] API integration tests

### Phase 8: Testing & Documentation (3 days)
- [ ] E2E testing
- [ ] Performance testing
- [ ] API documentation
- [ ] User documentation

**Total Estimated Time:** 25 days (5 weeks)

---

## 🧪 Testing Strategy

### Unit Tests
- Contract risk calculation
- Liquidity risk calculation
- Governance risk calculation
- Operational risk calculation
- Market risk calculation
- Overall risk scoring
- Coverage target: 90%+

### Integration Tests
- API endpoints
- Database operations
- External data sources

### Performance Tests
- Risk assessment <2 seconds
- API response time <500ms (p95)
- Load testing: 10K concurrent requests

### E2E Tests
- Complete risk assessment flow: Data collection → Analysis → Scoring → API response

---

## 📊 Success Metrics

### Technical Metrics
- Protocols assessed: 1,000+
- Assessment accuracy: 90%+
- API response time: <500ms (p95)
- System uptime: 99.9%

### Business Metrics
- User engagement: 50% of premium users
- Feature usage: 50,000+ API calls/day
- User satisfaction: 4.5+ rating
- Revenue per user: $400/year

---

## 🔗 Dependencies

**External:**
- Audit data providers (CertiK, Quantstamp, OpenZeppelin)
- Vulnerability databases (CWE, CVE)
- Protocol metadata APIs

---

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Status:** Ready for Sprint Planning

