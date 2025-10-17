# Technical Specification: EPIC-2 Tax & Compliance

**Document Version**: 1.0  
**Date**: 2025-10-17  
**Status**: Draft for Review  
**EPIC ID**: EPIC-2  
**EPIC Name**: Tax & Compliance System

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-17 | Winston (Architect) | Initial draft |

**Approvers**:
- [ ] Product Manager
- [ ] Tax Compliance Officer
- [ ] Tech Lead

---

## 1. OVERVIEW

### 1.1 EPIC Summary

**EPIC-2: Tax & Compliance** provides comprehensive tax reporting and compliance tools for crypto transactions across 100+ blockchains.

**Business Value**: $10M ARR (40% of total) - HIGHEST REVENUE  
**Story Points**: 80 points  
**Timeline**: Q4 2025 (Months 1-3, parallel with EPIC-1)  
**Priority**: P0 (Critical)

### 1.2 Features (1 Feature, 6 Sub-features)

| Feature ID | Feature Name | Story Points | Timeline |
|------------|--------------|--------------|----------|
| F2.1 | Tax Reporting Suite | 80 | Week 1-8 |
| F2.1.1 | Transaction Import | 15 | Week 1-2 |
| F2.1.2 | Cost Basis Calculation | 20 | Week 3-4 |
| F2.1.3 | Gain/Loss Calculation | 15 | Week 5-6 |
| F2.1.4 | Report Generation | 15 | Week 7 |
| F2.1.5 | Multi-Jurisdiction Support | 10 | Week 8 |
| F2.1.6 | Tax Optimization | 5 | Week 8 |

### 1.3 Success Metrics

- **User Adoption**: 60% of premium users generate tax reports
- **Report Accuracy**: >99% accuracy (verified by CPAs)
- **Processing Speed**: <5 minutes for 10K transactions
- **Jurisdiction Coverage**: 10+ countries (US, UK, EU, etc.)
- **Revenue**: $10M ARR (highest revenue EPIC)

---

## 2. FEATURES

### 2.1 F2.1: Tax Reporting Suite

**Description**: Comprehensive tax reporting for crypto transactions

**User Stories**:
- As an investor, I want to generate IRS Form 8949 for my crypto trades
- As a trader, I want to calculate capital gains/losses
- As a DeFi user, I want to track cost basis across chains
- As a tax professional, I want to export reports in CSV/PDF

**Acceptance Criteria**:
- ✅ Support 100+ chains
- ✅ Import transactions from wallets, exchanges, DeFi protocols
- ✅ Calculate cost basis (FIFO, LIFO, HIFO, Specific ID)
- ✅ Generate tax reports (IRS 8949, Schedule D, etc.)
- ✅ Support 10+ jurisdictions (US, UK, EU, Canada, Australia, etc.)
- ✅ Export reports (PDF, CSV, TurboTax, TaxAct)

**Technical Requirements**:
- Process 125M transactions (125K users × 1K transactions/user)
- Store transaction history (unlimited)
- Calculate cost basis in real-time
- Generate reports in <5 minutes
- Support multiple tax methods (FIFO, LIFO, HIFO)

---

## 3. ARCHITECTURE

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TAX SERVICE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Transaction  │  │ Cost Basis   │  │ Report       │     │
│  │ Importer     │  │ Calculator   │  │ Generator    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Transaction  │  │ Gain/Loss    │  │ PDF/CSV      │     │
│  │ Aggregator   │  │ Calculator   │  │ Exporter     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Premium DB   │  │ Redis Cache  │  │ S3 Storage   │     │
│  │ (PostgreSQL) │  │              │  │ (Reports)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Components

**Transaction Importer**:
- Import transactions from wallets (via RPC)
- Import from exchanges (via API)
- Import from CSV files
- Deduplicate transactions

**Cost Basis Calculator**:
- Calculate cost basis using FIFO, LIFO, HIFO, Specific ID
- Handle complex scenarios (staking, airdrops, forks)
- Support multiple currencies (USD, EUR, GBP, etc.)

**Report Generator**:
- Generate IRS Form 8949, Schedule D
- Generate UK HMRC reports
- Generate EU tax reports
- Export to PDF, CSV, TurboTax, TaxAct

---

## 4. DATA MODEL

### 4.1 Database Schema

```sql
-- Tax Transactions
CREATE TABLE tax_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  chain VARCHAR(50) NOT NULL,
  tx_hash VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'buy', 'sell', 'swap', 'transfer', 'stake', 'airdrop'
  asset VARCHAR(100) NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  cost_basis NUMERIC,
  gain_loss NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tax_transactions_user_id ON tax_transactions(user_id);
CREATE INDEX idx_tax_transactions_timestamp ON tax_transactions(timestamp);
CREATE INDEX idx_tax_transactions_type ON tax_transactions(type);

-- Tax Reports
CREATE TABLE tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  year INTEGER NOT NULL,
  method VARCHAR(20) NOT NULL, -- 'FIFO', 'LIFO', 'HIFO', 'SpecificID'
  jurisdiction VARCHAR(10) NOT NULL, -- 'US', 'UK', 'EU', etc.
  total_gain_loss NUMERIC NOT NULL,
  short_term_gain_loss NUMERIC,
  long_term_gain_loss NUMERIC,
  report_url TEXT,
  generated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tax_reports_user_id ON tax_reports(user_id);
CREATE INDEX idx_tax_reports_year ON tax_reports(year);

-- Cost Basis Lots
CREATE TABLE cost_basis_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  asset VARCHAR(100) NOT NULL,
  amount NUMERIC NOT NULL,
  cost_basis NUMERIC NOT NULL,
  acquired_at TIMESTAMP NOT NULL,
  disposed_at TIMESTAMP,
  disposed_amount NUMERIC
);

CREATE INDEX idx_cost_basis_lots_user_id ON cost_basis_lots(user_id);
CREATE INDEX idx_cost_basis_lots_asset ON cost_basis_lots(asset);
```

### 4.2 Transaction Types

**Buy**: Purchase of crypto with fiat
**Sell**: Sale of crypto for fiat
**Swap**: Exchange of one crypto for another
**Transfer**: Transfer between wallets (no tax event)
**Stake**: Staking rewards (income)
**Airdrop**: Airdrop tokens (income)
**Fork**: Hard fork tokens (income)

---

## 5. API SPECIFICATION

### 5.1 REST API Endpoints

**Import Transactions**:
```
POST /v1/tax/transactions/import
Authorization: Bearer <JWT>

Request Body:
{
  "source": "wallet", // 'wallet', 'exchange', 'csv'
  "chain": "ethereum",
  "address": "0x123...",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}

Response (202 Accepted):
{
  "success": true,
  "data": {
    "jobId": "job_123",
    "status": "processing",
    "estimatedTime": 120
  }
}
```

**Generate Tax Report**:
```
POST /v1/tax/reports
Authorization: Bearer <JWT>

Request Body:
{
  "year": 2024,
  "method": "FIFO",
  "jurisdiction": "US",
  "format": "pdf"
}

Response (202 Accepted):
{
  "success": true,
  "data": {
    "reportId": "report_123",
    "status": "generating",
    "estimatedTime": 300
  }
}
```

**Get Tax Report**:
```
GET /v1/tax/reports/:id
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "report_123",
    "year": 2024,
    "method": "FIFO",
    "totalGainLoss": 50000,
    "shortTermGainLoss": 30000,
    "longTermGainLoss": 20000,
    "reportUrl": "https://s3.../report.pdf",
    "generatedAt": "2025-10-17T10:00:00Z"
  }
}
```

**Get Tax Summary**:
```
GET /v1/tax/summary/2024
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "year": 2024,
    "totalTransactions": 1000,
    "totalGainLoss": 50000,
    "shortTermGainLoss": 30000,
    "longTermGainLoss": 20000,
    "taxableIncome": 10000
  }
}
```

---

## 6. IMPLEMENTATION DETAILS

### 6.1 Technology Stack

- **Framework**: NestJS 10.3+
- **Language**: TypeScript 5.3+
- **Database**: PostgreSQL 16+
- **Cache**: Redis 7+
- **Storage**: AWS S3 (reports)
- **PDF Generation**: Puppeteer
- **CSV Export**: csv-writer

### 6.2 Key Classes

**TaxCalculatorService**:
```typescript
@Injectable()
export class TaxCalculatorService {
  async calculateCostBasis(
    transactions: Transaction[],
    method: 'FIFO' | 'LIFO' | 'HIFO' | 'SpecificID'
  ): Promise<CostBasisResult> {
    // Calculate cost basis using specified method
  }

  async calculateGainLoss(
    transactions: Transaction[],
    costBasis: CostBasisResult
  ): Promise<GainLossResult> {
    // Calculate capital gains/losses
  }

  async applyWashSaleRules(
    transactions: Transaction[],
    gainLoss: GainLossResult
  ): Promise<GainLossResult> {
    // Apply US wash sale rules (IRS Publication 550)
    // Wash sale occurs when:
    // 1. Sell asset at a loss
    // 2. Buy "substantially identical" asset within 30 days before or after
    // 3. Loss is disallowed and added to cost basis of new position

    // Example:
    // Day 1: Buy 1 ETH at $2000
    // Day 10: Sell 1 ETH at $1500 (loss: $500)
    // Day 15: Buy 1 ETH at $1600
    // Result: $500 loss disallowed, new cost basis = $1600 + $500 = $2100
  }

  async calculateStakingRewardsTax(
    stakingRewards: StakingReward[]
  ): Promise<TaxableIncome> {
    // Calculate taxable income from staking rewards
    // Staking rewards are taxed as ordinary income at fair market value
    // when received (IRS Notice 2014-21)
  }

  async calculateNFTTax(
    nftTransactions: NFTTransaction[]
  ): Promise<GainLossResult> {
    // Calculate capital gains/losses for NFT transactions
    // NFTs are treated as collectibles (28% max tax rate in US)
  }
}
```

**ReportGeneratorService**:
```typescript
@Injectable()
export class ReportGeneratorService {
  async generateReport(
    userId: string,
    year: number,
    jurisdiction: string
  ): Promise<string> {
    // Generate tax report (PDF/CSV)
  }
}
```

---

## 7. TESTING STRATEGY

### 7.1 Unit Tests

- Test cost basis calculation (FIFO, LIFO, HIFO)
- Test gain/loss calculation
- Test report generation
- Target: 90% code coverage (critical for tax accuracy)

### 7.2 Integration Tests

- Test transaction import from wallets
- Test transaction import from exchanges
- Test end-to-end report generation
- Test multi-jurisdiction support

### 7.3 Accuracy Tests

- Verify against CPA-prepared reports
- Test edge cases (staking, airdrops, forks)
- Test complex scenarios (wash sales, etc.)

---

## 8. DEPLOYMENT

### 8.1 Infrastructure

- **Lambda**: Tax API (auto-scaling)
- **ECS Fargate**: Report Generator (long-running)
- **RDS**: PostgreSQL (db.r6g.xlarge)
- **S3**: Report storage (encrypted)

### 8.2 Compliance

- **Data Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Data Retention**: 7 years (IRS requirement)
- **Audit Logging**: All tax calculations logged
- **SOC 2 Type II**: Compliance required

---

**END OF DOCUMENT**

