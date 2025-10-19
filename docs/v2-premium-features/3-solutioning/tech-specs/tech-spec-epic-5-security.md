# Technical Specification: EPIC-5 Security & Risk Management

**Document Version**: 1.0  
**Date**: 2025-10-17  
**Status**: Draft for Review  
**EPIC ID**: EPIC-5  
**EPIC Name**: Security & Risk Management System

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-17 | Winston (Architect) | Initial draft |

---

## 1. OVERVIEW

### 1.1 EPIC Summary

**EPIC-5: Security & Risk Management** provides comprehensive security scanning and risk assessment for DeFi transactions.

**Business Value**: $2.5M ARR (10% of total)  
**Story Points**: 80 points  
**Timeline**: Q3 2026 (Months 10-12)  
**Priority**: P1 (High)

### 1.2 Features (4 Features)

| Feature ID | Feature Name | Story Points | Timeline |
|------------|--------------|--------------|----------|
| F-019 | Transaction Security Scanner | 34 | Week 1-5 |
| F-020 | Smart Contract Risk Scoring | 21 | Week 6-9 |
| F-021 | Wallet Security Checker | 13 | Week 10-12 |
| F-022 | Protocol Health Monitor | 12 | Week 13-16 |

### 1.3 Success Metrics

**F-019: Transaction Security Scanner**:
- 40K+ users
- 100K+ transactions scanned daily
- 99%+ scam detection rate
- <5 seconds scan time

**F-020: Smart Contract Risk Scoring**:
- 10,000+ contracts scored
- 30K+ users
- 95%+ risk prediction accuracy

**F-021: Wallet Security Checker**:
- 35K+ users
- 500K+ approvals revoked
- 90%+ user satisfaction

**F-022: Protocol Health Monitor**:
- 500+ protocols monitored
- 25K+ users
- 95%+ early warning accuracy

---

## 2. ARCHITECTURE

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 SECURITY SERVICE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Transaction  │  │ Contract     │  │ Risk         │     │
│  │ Scanner      │  │ Analyzer     │  │ Scorer       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Security     │  │ Vulnerability│  │ Threat       │     │
│  │ Rules Engine │  │ Database     │  │ Intelligence │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Premium DB   │  │ Redis Cache  │  │ Security APIs│     │
│  │ (PostgreSQL) │  │              │  │ (CertiK, etc)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. DATA MODEL

### 3.1 Database Schema (✅ ALIGNED WITH EXISTING PATTERN - PostgreSQL)

**Based on**: `defi/src/alerts/db.ts` (existing database pattern)

```sql
-- Security Scans
CREATE TABLE security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- String user ID (not UUID reference)

  -- Scan details
  scan_type VARCHAR(50) NOT NULL CHECK (scan_type IN (
    'transaction',
    'contract',
    'wallet',
    'protocol'
  )),
  target_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,

  -- Risk assessment
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  -- Findings (JSONB)
  findings JSONB NOT NULL,
  vulnerabilities TEXT[],

  -- Timestamps
  scanned_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_security_scans_user_id ON security_scans(user_id);
CREATE INDEX idx_security_scans_risk_score ON security_scans(risk_score);
CREATE INDEX idx_security_scans_scan_type ON security_scans(scan_type);
CREATE INDEX idx_security_scans_target_address ON security_scans(target_address);
CREATE INDEX idx_security_scans_scanned_at ON security_scans(scanned_at DESC);

-- Risk Scores (Cached)
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,

  -- Risk assessment
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  -- Risk factors (JSONB)
  risk_factors JSONB NOT NULL,

  -- Timestamps
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_risk_scores_target_address ON risk_scores(target_address);
CREATE INDEX idx_risk_scores_chain_id ON risk_scores(chain_id);
CREATE INDEX idx_risk_scores_risk_score ON risk_scores(risk_score);
CREATE INDEX idx_risk_scores_updated_at ON risk_scores(updated_at DESC);

-- Unique constraint (one risk score per address per chain)
CREATE UNIQUE INDEX idx_risk_scores_unique ON risk_scores(target_address, chain_id);

-- Contract Audits
CREATE TABLE contract_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,

  -- Audit details
  audit_provider VARCHAR(100), -- 'CertiK', 'Immunefi', etc.
  audit_date TIMESTAMP,
  audit_url TEXT,

  -- Audit results
  audit_score INTEGER CHECK (audit_score >= 0 AND audit_score <= 100),
  vulnerabilities_found INTEGER,
  vulnerabilities_fixed INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contract_audits_contract_address ON contract_audits(contract_address);
CREATE INDEX idx_contract_audits_chain_id ON contract_audits(chain_id);

-- Wallet Approvals (for revoke feature)
CREATE TABLE wallet_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,

  -- Approval details
  spender_address VARCHAR(255) NOT NULL,
  token_address VARCHAR(255) NOT NULL,
  token_symbol VARCHAR(100),

  -- Approval amount
  approved_amount NUMERIC(36, 18),
  is_unlimited BOOLEAN DEFAULT false,

  -- Risk assessment
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  is_revoked BOOLEAN DEFAULT false,

  -- Timestamps
  approved_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_wallet_approvals_user_id ON wallet_approvals(user_id);
CREATE INDEX idx_wallet_approvals_wallet_address ON wallet_approvals(wallet_address);
CREATE INDEX idx_wallet_approvals_is_revoked ON wallet_approvals(is_revoked);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_risk_scores_updated_at
BEFORE UPDATE ON risk_scores
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_audits_updated_at
BEFORE UPDATE ON contract_audits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Key Differences from Original**:
1. ✅ **user_id**: `VARCHAR(255)` (not UUID reference) - follows existing pattern
2. ✅ **Specific naming**: `chain_id`, `target_address`, `scan_type`
3. ✅ **Added risk_level**: 'low', 'medium', 'high', 'critical'
4. ✅ **Added contract_audits**: NEW table for audit tracking
5. ✅ **Added wallet_approvals**: NEW table for approval revoke feature
6. ✅ **High precision**: `NUMERIC(36, 18)` for approved amounts
7. ✅ **Unique constraint**: One risk score per address per chain
8. ✅ **Triggers**: Auto-update updated_at timestamps

---

## 4. API SPECIFICATION

### 4.1 REST API Endpoints

**Scan Transaction** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
POST /v2/premium/security/scan/transaction
Authorization: Bearer <JWT>

Request Body:
{
  "chain_id": "ethereum",
  "tx_hash": "0x123..."
}

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-123",
    "scan_type": "transaction",
    "target_address": "0x123...",
    "chain_id": "ethereum",
    "risk_score": 75,
    "risk_level": "high",
    "findings": [
      {
        "type": "suspicious_contract",
        "severity": "high",
        "description": "Contract has no verified source code"
      },
      {
        "type": "large_transfer",
        "severity": "medium",
        "description": "Transfer amount exceeds $1M"
      }
    ]
  }
}
```

**Scan Contract**:
```
POST /v2/premium/security/scan/contract
Authorization: Bearer <JWT>

Request Body:
{
  "chain": "ethereum",
  "address": "0x123..."
}

Response (200 OK):
{
  "success": true,
  "data": {
    "riskScore": 30,
    "riskLevel": "low",
    "findings": [
      {
        "type": "verified_source",
        "severity": "info",
        "description": "Contract source code is verified"
      },
      {
        "type": "audit_passed",
        "severity": "info",
        "description": "Contract passed CertiK audit"
      }
    ]
  }
}
```

**Get Risk Score**:
```
GET /v2/premium/security/risk-score/0x123...?chain=ethereum
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "address": "0x123...",
    "chain": "ethereum",
    "riskScore": 50,
    "riskLevel": "medium",
    "riskFactors": [
      { "factor": "transaction_volume", "score": 20 },
      { "factor": "contract_age", "score": 30 }
    ]
  }
}
```

---

## 5. IMPLEMENTATION DETAILS

### 5.1 Technology Stack

- **Framework**: NestJS 10.3+
- **Security APIs**: CertiK, Immunefi, Forta
- **Database**: PostgreSQL 16+
- **Cache**: Redis 7+

### 5.2 Key Classes

**TransactionScannerService**:
```typescript
@Injectable()
export class TransactionScannerService {
  async scanTransaction(
    chain: string,
    txHash: string
  ): Promise<SecurityScanResult> {
    // Scan transaction for security risks
  }
}
```

**RiskScorerService**:
```typescript
@Injectable()
export class RiskScorerService {
  async calculateRiskScore(
    address: string,
    chain: string
  ): Promise<RiskScore> {
    // Calculate risk score (0-100)
  }
}
```

---

## 6. TESTING STRATEGY

### 6.1 Unit Tests

- Test transaction scanning
- Test contract analysis
- Test risk scoring
- Target: 85% code coverage

### 6.2 Integration Tests

- Test security API integrations
- Test end-to-end scanning
- Test alert triggering

### 6.3 Accuracy Tests

- Verify against known exploits
- Test false positive rate (<5%)
- Test detection rate (>90%)

---

## 7. DEPLOYMENT

### 7.1 Infrastructure

- **Lambda**: Security API
- **RDS**: PostgreSQL (db.r6g.large)
- **Redis**: ElastiCache (cache.r6g.large)

---

## 8. FEATURE SPECIFICATIONS

### 8.1 Feature F-019: Transaction Security Scanner (34 points, 5 weeks)

**Purpose**: Real-time transaction security scanner that detects malicious transactions, phishing attempts, and suspicious contract interactions before execution.

**Components**:
- **Transaction Scanner**: Scan transactions for security risks
- **Malicious Contract Detector**: Detect known malicious contracts
- **Phishing Detector**: Detect phishing attempts
- **Honeypot Detector**: Detect honeypot tokens
- **Token Approval Analyzer**: Analyze token approval risks

**API Endpoints**:
```
POST /v2/premium/security/scan/transaction
POST /v2/premium/security/scan/approval
GET  /v2/premium/security/scans
```

**Database Schema**:
```sql
CREATE TABLE security_scans (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  scan_type VARCHAR(50) NOT NULL, -- 'transaction', 'approval'
  target VARCHAR(255) NOT NULL,
  risk_score INTEGER NOT NULL, -- 0-100
  findings JSONB NOT NULL,
  scanned_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE malicious_contracts (
  id UUID PRIMARY KEY,
  address VARCHAR(100) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  risk_level VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium'
  reason TEXT NOT NULL,
  detected_at TIMESTAMP DEFAULT NOW()
);
```

**Integration**:
- **GoPlus Security API**: Malicious contract detection, honeypot detection
- **Forta Network API**: Real-time security alerts
- **CertiK Skynet API**: Contract security analysis

**Performance**:
- **Scan Time**: <5 seconds per transaction
- **Detection Rate**: 99%+ scam detection
- **False Positives**: <5%
- **Throughput**: 100K+ transactions scanned daily

---

### 8.2 Feature F-020: Smart Contract Risk Scoring (21 points, 4 weeks)

**Purpose**: Comprehensive smart contract risk scoring system that analyzes contract code, audit status, team transparency, and historical behavior.

**Components**:
- **Contract Risk Scorer**: Calculate contract risk scores
- **Audit Status Tracker**: Track contract audit status
- **Code Analyzer**: Analyze contract code for vulnerabilities
- **Team Transparency Analyzer**: Analyze team transparency
- **Historical Behavior Analyzer**: Analyze past exploits, rug pulls

**API Endpoints**:
```
GET /v2/premium/security/contracts/:address/risk-score
GET /v2/premium/security/contracts/:address/audits
GET /v2/premium/security/contracts/search
```

**Database Schema**:
```sql
CREATE TABLE contract_risk_scores (
  id UUID PRIMARY KEY,
  address VARCHAR(100) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  risk_score INTEGER NOT NULL, -- 0-100
  audit_score INTEGER NOT NULL,
  code_score INTEGER NOT NULL,
  team_score INTEGER NOT NULL,
  history_score INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contract_audits (
  id UUID PRIMARY KEY,
  contract_address VARCHAR(100) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  audit_firm VARCHAR(100) NOT NULL, -- 'CertiK', 'Trail of Bits', etc.
  audit_date DATE NOT NULL,
  findings JSONB NOT NULL,
  audit_url TEXT
);
```

**Integration**:
- **CertiK API**: Audit reports
- **Trail of Bits API**: Audit reports
- **OpenZeppelin API**: Audit reports
- **Quantstamp API**: Audit reports

**Performance**:
- **Contracts Scored**: 10,000+ contracts
- **Risk Prediction Accuracy**: 95%+
- **Update Frequency**: Daily

---

### 8.3 Feature F-021: Wallet Security Checker (13 points, 3 weeks)

**Purpose**: Wallet security health checker that scans for risky token approvals, suspicious transactions, and wallet vulnerabilities.

**Components**:
- **Approval Scanner**: Scan wallet for risky approvals
- **Approval Revoker**: Revoke risky approvals
- **Wallet Security Scorer**: Calculate wallet security score

**API Endpoints**:
```
POST /v2/premium/security/wallet/scan
POST /v2/premium/security/wallet/revoke
GET  /v2/premium/security/wallet/:address/score
```

**Database Schema**:
```sql
CREATE TABLE wallet_approvals (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(100) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  token_address VARCHAR(100) NOT NULL,
  spender_address VARCHAR(100) NOT NULL,
  amount VARCHAR(100) NOT NULL, -- 'unlimited' or amount
  risk_level VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  detected_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wallet_security_scores (
  id UUID PRIMARY KEY,
  wallet_address VARCHAR(100) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  security_score INTEGER NOT NULL, -- 0-100
  risky_approvals_count INTEGER NOT NULL,
  suspicious_transactions_count INTEGER NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Integration**:
- **Blockchain RPCs**: Fetch wallet approvals
- **Revoke.cash API**: Approval revocation

**Performance**:
- **Users**: 35K+ users
- **Approvals Revoked**: 500K+ approvals
- **User Satisfaction**: 90%+

---

### 8.4 Feature F-022: Protocol Health Monitor (12 points, 4 weeks)

**Purpose**: Real-time protocol health monitoring system that tracks TVL, user activity, governance health, and protocol risks.

**Components**:
- **Protocol Health Monitor**: Monitor protocol health metrics
- **TVL Monitor**: Monitor TVL changes
- **User Activity Monitor**: Monitor user activity
- **Governance Monitor**: Monitor governance health
- **Early Warning System**: Detect protocol issues early

**API Endpoints**:
```
GET /v2/premium/security/protocols/:id/health
GET /v2/premium/security/protocols/:id/health/history
GET /v2/premium/security/protocols/search
```

**Database Schema**:
```sql
CREATE TABLE protocol_health (
  id UUID PRIMARY KEY,
  protocol_id VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  health_score INTEGER NOT NULL, -- 0-100
  tvl NUMERIC NOT NULL,
  tvl_change_24h NUMERIC NOT NULL,
  active_users INTEGER NOT NULL,
  transactions_24h INTEGER NOT NULL,
  governance_proposals INTEGER NOT NULL,
  voter_participation NUMERIC NOT NULL
);

CREATE TABLE protocol_risk_indicators (
  id UUID PRIMARY KEY,
  protocol_id VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  indicator_type VARCHAR(50) NOT NULL, -- 'tvl_drain', 'user_exodus', 'governance_attack'
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium'
  description TEXT NOT NULL
);
```

**Integration**:
- **DeFiLlama API**: TVL data
- **Blockchain RPCs**: User activity, governance data

**Performance**:
- **Protocols Monitored**: 500+ protocols
- **Users**: 25K+ users
- **Early Warning Accuracy**: 95%+
- **Update Frequency**: Real-time

---

**END OF DOCUMENT**

