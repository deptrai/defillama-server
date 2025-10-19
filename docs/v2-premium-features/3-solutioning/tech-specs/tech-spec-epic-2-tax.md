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
| F-006 | Tax Reporting Suite | 80 | Week 1-8 |
| F-006.1 | Transaction Import | 15 | Week 1-2 |
| F-006.2 | Cost Basis Calculation | 20 | Week 3-4 |
| F-006.3 | Gain/Loss Calculation | 15 | Week 5-6 |
| F-006.4 | Report Generation | 15 | Week 7 |
| F-006.5 | Multi-Jurisdiction Support | 10 | Week 8 |
| F-006.6 | Tax Optimization | 5 | Week 8 |

### 1.3 Success Metrics

- **User Adoption**: 60% of premium users generate tax reports
- **Report Accuracy**: >99% accuracy (verified by CPAs)
- **Processing Speed**: <5 minutes for 10K transactions
- **Jurisdiction Coverage**: 10+ countries (US, UK, EU, etc.)
- **Revenue**: $10M ARR (highest revenue EPIC)

---

## 2. FEATURES

### 2.1 F-006: Tax Reporting Suite

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

### 4.1 Database Schema (✅ ALIGNED WITH EXISTING PATTERN)

**Based on**: `defi/src/alerts/db.ts` (existing database pattern)

```sql
-- Tax Transactions (✅ ALIGNED WITH ACTUAL IMPLEMENTATION)
CREATE TABLE tax_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- String user ID (not UUID reference)

  -- Transaction details
  chain_id VARCHAR(50) NOT NULL,
  tx_hash VARCHAR(255) NOT NULL,
  block_number BIGINT,
  timestamp TIMESTAMP NOT NULL,

  -- Transaction type
  tx_type VARCHAR(50) NOT NULL CHECK (tx_type IN (
    'buy',
    'sell',
    'swap',
    'transfer',
    'stake',
    'unstake',
    'airdrop',
    'fork',
    'mining',
    'interest'
  )),

  -- Asset details
  asset_symbol VARCHAR(100) NOT NULL,
  asset_address VARCHAR(255),
  amount NUMERIC(36, 18) NOT NULL,

  -- Pricing
  price_usd NUMERIC(20, 8),
  price_currency VARCHAR(10) DEFAULT 'USD',

  -- Cost basis & gain/loss
  cost_basis NUMERIC(20, 8),
  gain_loss NUMERIC(20, 8),
  holding_period_days INTEGER,

  -- Metadata
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  protocol_name VARCHAR(255),
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tax_transactions_user_id ON tax_transactions(user_id);
CREATE INDEX idx_tax_transactions_timestamp ON tax_transactions(timestamp);
CREATE INDEX idx_tax_transactions_tx_type ON tax_transactions(tx_type);
CREATE INDEX idx_tax_transactions_chain_id ON tax_transactions(chain_id);
CREATE INDEX idx_tax_transactions_asset_symbol ON tax_transactions(asset_symbol);
CREATE INDEX idx_tax_transactions_tx_hash ON tax_transactions(tx_hash);

-- Unique constraint (prevent duplicates)
CREATE UNIQUE INDEX idx_tax_transactions_unique ON tax_transactions(user_id, chain_id, tx_hash, asset_symbol);

-- Tax Reports (✅ ALIGNED WITH ACTUAL IMPLEMENTATION)
CREATE TABLE tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- String user ID (not UUID reference)

  -- Report configuration
  tax_year INTEGER NOT NULL,
  cost_basis_method VARCHAR(20) NOT NULL CHECK (cost_basis_method IN (
    'FIFO',
    'LIFO',
    'HIFO',
    'SpecificID'
  )),
  jurisdiction VARCHAR(10) NOT NULL, -- 'US', 'UK', 'EU', 'CA', 'AU', etc.

  -- Report results
  total_gain_loss NUMERIC(20, 8) NOT NULL,
  short_term_gain_loss NUMERIC(20, 8),
  long_term_gain_loss NUMERIC(20, 8),
  total_income NUMERIC(20, 8),

  -- Transaction counts
  total_transactions INTEGER,
  taxable_transactions INTEGER,

  -- Report files
  report_url TEXT, -- S3 URL for PDF
  csv_url TEXT,    -- S3 URL for CSV
  turbotax_url TEXT, -- S3 URL for TurboTax format

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  error_message TEXT,

  -- Timestamps
  generated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Report expiration (90 days)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tax_reports_user_id ON tax_reports(user_id);
CREATE INDEX idx_tax_reports_tax_year ON tax_reports(tax_year);
CREATE INDEX idx_tax_reports_status ON tax_reports(status);
CREATE INDEX idx_tax_reports_generated_at ON tax_reports(generated_at);

-- Cost Basis Lots (✅ ALIGNED WITH ACTUAL IMPLEMENTATION)
CREATE TABLE cost_basis_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- String user ID (not UUID reference)

  -- Asset details
  asset_symbol VARCHAR(100) NOT NULL,
  asset_address VARCHAR(255),
  chain_id VARCHAR(50) NOT NULL,

  -- Lot details
  amount NUMERIC(36, 18) NOT NULL,
  remaining_amount NUMERIC(36, 18) NOT NULL,
  cost_basis_per_unit NUMERIC(20, 8) NOT NULL,
  total_cost_basis NUMERIC(20, 8) NOT NULL,

  -- Acquisition
  acquired_at TIMESTAMP NOT NULL,
  acquired_tx_hash VARCHAR(255),
  acquisition_type VARCHAR(50), -- 'buy', 'airdrop', 'stake', etc.

  -- Disposal (if disposed)
  disposed_at TIMESTAMP,
  disposed_tx_hash VARCHAR(255),
  disposed_amount NUMERIC(36, 18),
  disposal_type VARCHAR(50), -- 'sell', 'swap', etc.

  -- Gain/Loss
  realized_gain_loss NUMERIC(20, 8),
  holding_period_days INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cost_basis_lots_user_id ON cost_basis_lots(user_id);
CREATE INDEX idx_cost_basis_lots_asset_symbol ON cost_basis_lots(asset_symbol);
CREATE INDEX idx_cost_basis_lots_acquired_at ON cost_basis_lots(acquired_at);
CREATE INDEX idx_cost_basis_lots_disposed_at ON cost_basis_lots(disposed_at) WHERE disposed_at IS NOT NULL;

-- Partial index for active lots (not fully disposed)
CREATE INDEX idx_cost_basis_lots_active ON cost_basis_lots(user_id, asset_symbol, acquired_at)
WHERE remaining_amount > 0;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tax_transactions_updated_at
BEFORE UPDATE ON tax_transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_basis_lots_updated_at
BEFORE UPDATE ON cost_basis_lots
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Key Differences from Original**:
1. ✅ `user_id` is `VARCHAR(255)` (not UUID reference) - follows existing pattern
2. ✅ Added `chain_id` instead of `chain` - consistent naming
3. ✅ Added `tx_type` instead of `type` - clearer naming
4. ✅ Added `NUMERIC(36, 18)` precision - handle large amounts
5. ✅ Added `status` field to tax_reports - track generation progress
6. ✅ Added `expires_at` - reports expire after 90 days
7. ✅ Added `remaining_amount` to cost_basis_lots - track partial disposals
8. ✅ Added unique constraint - prevent duplicate transactions
9. ✅ Added partial indexes - optimize active lots queries
10. ✅ Added triggers - auto-update updated_at timestamps

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
**Import Transactions** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
POST /v2/premium/tax/transactions/import
Authorization: Bearer <JWT>

Request Body:
{
  "source": "wallet", // 'wallet', 'exchange', 'csv'
  "chain_id": "ethereum",
  "wallet_address": "0x123...",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}

Response (202 Accepted):
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "estimated_time_seconds": 120,
    "message": "Transaction import started"
  }
}
```

**Generate Tax Report** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
POST /v2/premium/tax/reports
Authorization: Bearer <JWT>

Request Body:
{
  "tax_year": 2024,
  "cost_basis_method": "FIFO",
  "jurisdiction": "US",
  "format": "pdf" // 'pdf', 'csv', 'turbotax'
}

Response (202 Accepted):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-123",
    "tax_year": 2024,
    "cost_basis_method": "FIFO",
    "jurisdiction": "US",
    "status": "processing",
    "estimated_time_seconds": 300,
    "created_at": "2025-10-17T10:00:00Z"
  }
}
```

**Get Tax Report** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
GET /v2/premium/tax/reports/{id}
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-123",
    "tax_year": 2024,
    "cost_basis_method": "FIFO",
    "jurisdiction": "US",
    "total_gain_loss": 50000.00,
    "short_term_gain_loss": 30000.00,
    "long_term_gain_loss": 20000.00,
    "total_income": 5000.00,
    "total_transactions": 1500,
    "taxable_transactions": 1200,
    "report_url": "https://s3.amazonaws.com/defillama-premium-reports-prod/tax-report-2024.pdf",
    "csv_url": "https://s3.amazonaws.com/defillama-premium-reports-prod/tax-report-2024.csv",
    "turbotax_url": "https://s3.amazonaws.com/defillama-premium-reports-prod/tax-report-2024.txf",
    "status": "completed",
    "generated_at": "2025-10-17T10:05:00Z",
    "expires_at": "2026-01-15T10:05:00Z"
  }
}
```

**List Tax Reports** (✅ NEW - ALIGNED WITH ACTUAL IMPLEMENTATION):
```
GET /v2/premium/tax/reports?tax_year=2024&limit=20&offset=0
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "tax_year": 2024,
        "cost_basis_method": "FIFO",
        "jurisdiction": "US",
        "total_gain_loss": 50000.00,
        "status": "completed",
        "generated_at": "2025-10-17T10:00:00Z"
      }
    ],
    "total": 5
  }
}
```

**Get Tax Summary** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
GET /v2/premium/tax/summary/{year}
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

