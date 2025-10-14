# Technical Specification - Phase 3: Risk Monitoring System

**Project:** DeFiLlama On-Chain Services Platform  
**Epic ID:** on-chain-services-v1  
**Phase:** Phase 3 - Intelligence  
**Feature:** 3.2 - Risk Monitoring System  
**Date:** 2025-10-14  
**Architect:** Luis  
**Version:** 1.0  

---

## 1. Overview and Scope

### 1.1 Executive Summary

This technical specification defines the implementation details for **Feature 3.2: Risk Monitoring System**, a critical component of Phase 3 Intelligence features. This system provides real-time risk assessment, suspicious activity detection, and compliance monitoring for DeFi protocols and users.

**Business Objectives:**
- Protect users from high-risk protocols and scams
- Enable regulatory compliance for institutional users
- Provide early warning system for protocol failures
- Support risk-adjusted investment decisions

**Technical Objectives:**
- Real-time risk scoring for 1000+ protocols
- Suspicious activity detection with <1 minute latency
- Compliance monitoring across 100+ chains
- 99.99% uptime for critical risk alerts
- Historical risk analysis (2+ years)

### 1.2 Scope

**In Scope:**
- **Story 3.2.1: Protocol Risk Assessment**
  - Multi-factor risk scoring
  - Smart contract vulnerability analysis
  - Liquidity risk assessment
  - Governance risk evaluation

- **Story 3.2.2: Suspicious Activity Detection**
  - Rug pull detection
  - Wash trading identification
  - Pump and dump detection
  - Sybil attack detection

- **Story 3.2.3: Compliance Monitoring**
  - Sanctions screening (OFAC)
  - AML transaction monitoring
  - KYC verification support
  - Regulatory reporting

**Out of Scope:**
- Legal compliance advisory (consult legal team)
- Automated fund freezing (manual review required)
- Cross-border regulatory compliance (Phase 4)
- Insurance underwriting (Phase 4)

### 1.3 Architecture Alignment

Phase 3 Risk Monitoring extends existing architecture with:
- **Real-time Monitoring**: Kinesis Data Streams for event processing
- **Machine Learning**: SageMaker for anomaly detection
- **Graph Analysis**: Neptune for transaction network analysis
- **Compliance Data**: Integration with Chainalysis, Elliptic APIs

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Risk Dashboard  │  Compliance Portal  │  Alert System          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  REST API  │  WebSocket API  │  Compliance API                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER (Phase 3)                   │
├─────────────────────────────────────────────────────────────────┤
│  Protocol Risk Assessor  │  Suspicious Activity Detector        │
│  Compliance Monitor      │  Risk Scoring Engine                 │
│  Alert Engine (Phase 1)  │  Reporting Service                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PROCESSING LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Smart Contract Analyzer  │  Anomaly Detector (ML)              │
│  Transaction Network Analyzer │  Sanctions Screener             │
│  Liquidity Risk Calculator │  Pattern Matcher                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Risk Data)    │  Redis (Real-time Cache)           │
│  Neptune (Transaction Graph) │  S3 (Audit Logs)                 │
│  Kinesis (Event Streams)   │  SageMaker (ML Models)             │
│  External APIs (Chainalysis, Elliptic)                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Architecture

**Protocol Risk Assessment Flow:**
```
Protocol Data → Smart Contract Analysis →
Liquidity Analysis → Governance Analysis →
Risk Score Calculation → PostgreSQL Storage →
Redis Cache → API Response
```

**Suspicious Activity Detection Flow:**
```
Transaction Stream (Kinesis) → Anomaly Detection (SageMaker) →
Pattern Matching → Risk Classification →
Alert Generation → Notification Dispatch →
Audit Log (S3)
```

**Compliance Monitoring Flow:**
```
Transaction Data → Sanctions Screening (Chainalysis API) →
AML Analysis → Risk Classification →
Compliance Report Generation → PostgreSQL Storage →
Regulatory Reporting
```

---

## 3. Database Schema Design

### 3.1 Protocol Risk Assessment

#### protocol_risk_assessments
```sql
CREATE TABLE protocol_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  assessment_timestamp TIMESTAMP NOT NULL,
  
  -- Overall Risk
  overall_risk_score DECIMAL(5, 2) NOT NULL, -- 0-100
  risk_category VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  
  -- Smart Contract Risk
  contract_risk_score DECIMAL(5, 2),
  audit_status VARCHAR(50),
  auditor_names VARCHAR(255)[],
  audit_dates DATE[],
  known_vulnerabilities INTEGER DEFAULT 0,
  vulnerability_severity VARCHAR(20),
  
  -- Liquidity Risk
  liquidity_risk_score DECIMAL(5, 2),
  total_tvl DECIMAL(20, 2),
  tvl_change_24h DECIMAL(10, 4),
  liquidity_depth DECIMAL(20, 2),
  concentration_ratio DECIMAL(5, 2),
  
  -- Governance Risk
  governance_risk_score DECIMAL(5, 2),
  governance_type VARCHAR(50), -- 'multisig', 'dao', 'centralized', 'none'
  multisig_threshold VARCHAR(20),
  token_distribution_gini DECIMAL(5, 4),
  admin_key_holders INTEGER,
  
  -- Operational Risk
  operational_risk_score DECIMAL(5, 2),
  protocol_age_days INTEGER,
  team_doxxed BOOLEAN DEFAULT FALSE,
  team_reputation_score DECIMAL(5, 2),
  incident_count INTEGER DEFAULT 0,
  last_incident_date DATE,
  
  -- Market Risk
  market_risk_score DECIMAL(5, 2),
  volume_24h DECIMAL(20, 2),
  volume_change_24h DECIMAL(10, 4),
  user_count INTEGER,
  user_change_24h DECIMAL(10, 4),
  
  -- Metadata
  assessment_version VARCHAR(20),
  assessor VARCHAR(50), -- 'automated', 'manual', 'hybrid'
  confidence_level DECIMAL(5, 2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_protocol_risk_protocol_id ON protocol_risk_assessments(protocol_id);
CREATE INDEX idx_protocol_risk_timestamp ON protocol_risk_assessments(assessment_timestamp DESC);
CREATE INDEX idx_protocol_risk_category ON protocol_risk_assessments(risk_category);
CREATE INDEX idx_protocol_risk_score ON protocol_risk_assessments(overall_risk_score DESC);
CREATE INDEX idx_protocol_risk_composite ON protocol_risk_assessments(protocol_id, assessment_timestamp DESC);
```

#### smart_contract_vulnerabilities
```sql
CREATE TABLE smart_contract_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id VARCHAR(255) NOT NULL,
  contract_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Vulnerability Info
  vulnerability_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low', 'info'
  cwe_id VARCHAR(20), -- Common Weakness Enumeration ID
  
  -- Description
  title VARCHAR(255) NOT NULL,
  description TEXT,
  impact TEXT,
  recommendation TEXT,
  
  -- Detection
  detection_method VARCHAR(50), -- 'static_analysis', 'manual_review', 'bug_bounty'
  detector_name VARCHAR(100),
  detection_timestamp TIMESTAMP NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'acknowledged', 'fixed', 'false_positive'
  fix_timestamp TIMESTAMP,
  fix_tx_hash VARCHAR(255),
  
  -- References
  reference_urls TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vulnerabilities_protocol_id ON smart_contract_vulnerabilities(protocol_id);
CREATE INDEX idx_vulnerabilities_contract ON smart_contract_vulnerabilities(contract_address);
CREATE INDEX idx_vulnerabilities_severity ON smart_contract_vulnerabilities(severity);
CREATE INDEX idx_vulnerabilities_status ON smart_contract_vulnerabilities(status);
```

### 3.2 Suspicious Activity Detection

#### suspicious_activities
```sql
CREATE TABLE suspicious_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Activity Info
  activity_type VARCHAR(50) NOT NULL, -- 'rug_pull', 'wash_trading', 'pump_dump', 'sybil_attack'
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  confidence_score DECIMAL(5, 2) NOT NULL, -- 0-100
  
  -- Entity Info
  protocol_id VARCHAR(255),
  wallet_addresses VARCHAR(255)[],
  token_addresses VARCHAR(255)[],
  chain_id VARCHAR(50) NOT NULL,
  
  -- Detection
  detection_timestamp TIMESTAMP NOT NULL,
  detection_method VARCHAR(50), -- 'ml_model', 'rule_based', 'manual_report'
  detector_version VARCHAR(20),
  
  -- Evidence
  evidence_tx_hashes VARCHAR(255)[],
  evidence_description TEXT,
  evidence_metrics JSONB,
  
  -- Impact
  estimated_loss_usd DECIMAL(20, 2),
  affected_users INTEGER,
  affected_protocols VARCHAR(255)[],
  
  -- Status
  status VARCHAR(20) DEFAULT 'investigating', -- 'investigating', 'confirmed', 'false_positive', 'resolved'
  investigation_notes TEXT,
  resolution_timestamp TIMESTAMP,
  
  -- Actions Taken
  alert_sent BOOLEAN DEFAULT FALSE,
  alert_timestamp TIMESTAMP,
  reported_to_authorities BOOLEAN DEFAULT FALSE,
  report_timestamp TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suspicious_activities_type ON suspicious_activities(activity_type);
CREATE INDEX idx_suspicious_activities_severity ON suspicious_activities(severity);
CREATE INDEX idx_suspicious_activities_timestamp ON suspicious_activities(detection_timestamp DESC);
CREATE INDEX idx_suspicious_activities_status ON suspicious_activities(status);
CREATE INDEX idx_suspicious_activities_protocol ON suspicious_activities(protocol_id);
```

### 3.3 Compliance Monitoring

#### compliance_screenings
```sql
CREATE TABLE compliance_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Screening Info
  screening_type VARCHAR(50) NOT NULL, -- 'sanctions', 'aml', 'kyc', 'pep'
  wallet_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Results
  screening_result VARCHAR(20) NOT NULL, -- 'clear', 'flagged', 'blocked'
  risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  risk_score DECIMAL(5, 2),
  
  -- Flags
  sanctions_match BOOLEAN DEFAULT FALSE,
  sanctions_list VARCHAR(100), -- 'OFAC', 'UN', 'EU', etc.
  pep_match BOOLEAN DEFAULT FALSE,
  adverse_media BOOLEAN DEFAULT FALSE,
  
  -- Details
  match_details JSONB,
  screening_provider VARCHAR(50), -- 'chainalysis', 'elliptic', 'internal'
  
  -- Metadata
  screening_timestamp TIMESTAMP NOT NULL,
  screening_version VARCHAR(20),
  
  -- Actions
  alert_generated BOOLEAN DEFAULT FALSE,
  manual_review_required BOOLEAN DEFAULT FALSE,
  review_status VARCHAR(20), -- 'pending', 'approved', 'rejected'
  reviewer_id UUID,
  review_timestamp TIMESTAMP,
  review_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_compliance_screenings_wallet ON compliance_screenings(wallet_address);
CREATE INDEX idx_compliance_screenings_result ON compliance_screenings(screening_result);
CREATE INDEX idx_compliance_screenings_timestamp ON compliance_screenings(screening_timestamp DESC);
CREATE INDEX idx_compliance_screenings_sanctions ON compliance_screenings(sanctions_match);
CREATE INDEX idx_compliance_screenings_review ON compliance_screenings(review_status);
```

---

## 4. API Specifications

### 4.1 Protocol Risk Assessment API

#### GET /v1/risk/protocols/:protocolId/assessment

**Request:**
```typescript
interface ProtocolRiskRequest {
  protocolId: string;
  includeHistory?: boolean;
  includeVulnerabilities?: boolean;
}
```

**Response:**
```typescript
interface ProtocolRiskResponse {
  protocolId: string;
  chainId: string;
  assessmentTimestamp: string;
  
  overallRisk: {
    score: number;
    category: 'low' | 'medium' | 'high' | 'critical';
    confidenceLevel: number;
  };
  
  riskFactors: {
    smartContract: {
      score: number;
      auditStatus: string;
      auditors: string[];
      vulnerabilities: number;
      severity: string;
    };
    
    liquidity: {
      score: number;
      tvl: number;
      tvlChange24h: number;
      liquidityDepth: number;
      concentrationRatio: number;
    };
    
    governance: {
      score: number;
      type: string;
      multisigThreshold: string;
      tokenDistributionGini: number;
      adminKeyHolders: number;
    };
    
    operational: {
      score: number;
      protocolAgeDays: number;
      teamDoxxed: boolean;
      teamReputationScore: number;
      incidentCount: number;
    };
    
    market: {
      score: number;
      volume24h: number;
      volumeChange24h: number;
      userCount: number;
      userChange24h: number;
    };
  };
  
  vulnerabilities?: Array<{
    type: string;
    severity: string;
    title: string;
    status: string;
  }>;
  
  history?: Array<{
    timestamp: string;
    score: number;
    category: string;
  }>;
}
```

---

**Version**: 1.0  
**Last Updated**: 2025-10-14  
**Status**: Ready for Implementation

