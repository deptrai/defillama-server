# Story 2.1: Tax Reporting Suite

**Feature ID**: F-009  
**EPIC**: EPIC-2 (Tax & Compliance)  
**Story Points**: 80 points  
**Priority**: P0 (Critical)  
**Timeline**: Q4 2025, Months 2-3

---

## Overview

Comprehensive tax reporting suite for crypto transactions including transaction import, cost basis calculation, capital gains/losses calculation, and IRS form generation.

**Business Value**: Critical feature for US users, compliance requirement, competitive advantage

**User Personas**: 
- Active Crypto Traders (primary)
- Long-term Investors (secondary)
- Tax Professionals/CPAs (tertiary)

---

## User Stories (9 stories, 80 points)

### Story 2.1.1: Import Transactions (13 points)

**As a** premium user  
**I want** to import my crypto transactions  
**So that** I can generate tax reports

**Acceptance Criteria**:
- ✅ User can import from wallet addresses (auto-fetch)
- ✅ User can import from CSV files (manual upload)
- ✅ User can import from exchanges (API integration)
- ✅ System supports 100+ chains
- ✅ System processes 10K+ transactions
- ✅ Import completes within 5 minutes

**Technical Implementation**:
- API: `POST /v1/tax/import`
- Service: TaxImportService (background job)
- Data Sources: Blockchain RPCs, Exchange APIs, CSV upload
- Database: `tax_transactions` table
- Performance: 10K+ transactions, <5 minutes

**Dependencies**: None

**Priority**: P0

**Effort**: 1.5 weeks

---

### Story 2.1.2: Calculate Cost Basis (13 points)

**As a** premium user  
**I want** to calculate cost basis using different methods  
**So that** I can optimize my tax liability

**Acceptance Criteria**:
- ✅ User can select cost basis method (FIFO, LIFO, HIFO, Specific ID)
- ✅ System calculates cost basis for all transactions
- ✅ System handles multiple tokens and chains
- ✅ System applies wash sale rules (30-day rule, IRS Publication 550)
- ✅ System generates cost basis report
- ✅ Calculation completes within 2 minutes for 10K transactions

**Technical Implementation**:
- API: `POST /v1/tax/calculate`
- Service: TaxCalculatorService
- Methods: FIFO, LIFO, HIFO, Specific ID
- Wash Sale: 30-day rule (IRS Publication 550)
- Performance: <2 minutes for 10K transactions

**Dependencies**: Story 2.1.1

**Priority**: P0

**Effort**: 1.5 weeks

---

### Story 2.1.3: Calculate Capital Gains/Losses (13 points)

**As a** premium user  
**I want** to calculate capital gains and losses  
**So that** I can report to IRS

**Acceptance Criteria**:
- ✅ System calculates short-term gains/losses (<1 year holding)
- ✅ System calculates long-term gains/losses (>=1 year holding)
- ✅ System calculates total gains/losses
- ✅ System handles staking rewards (ordinary income tax)
- ✅ System handles NFT transactions (28% collectibles rate)
- ✅ System generates gains/losses report with all details

**Technical Implementation**:
- API: `POST /v1/tax/calculate`
- Service: TaxCalculatorService
- Tax Rates: Short-term (ordinary income), Long-term (capital gains), NFT (28%)
- Database: `tax_reports` table
- Compliance: IRS Publication 550

**Dependencies**: Story 2.1.2

**Priority**: P0

**Effort**: 1.5 weeks

---

### Story 2.1.4: Generate IRS Forms (13 points)

**As a** premium user  
**I want** to generate IRS forms  
**So that** I can file my taxes

**Acceptance Criteria**:
- ✅ System generates IRS Form 8949 (Sales and Other Dispositions of Capital Assets)
- ✅ System generates Schedule D (Capital Gains and Losses)
- ✅ System includes all required fields (description, date acquired, date sold, proceeds, cost basis, gain/loss)
- ✅ System supports PDF export (IRS-compliant format)
- ✅ System supports CSV export (for tax software import)
- ✅ Forms are IRS-compliant and CPA-validated

**Technical Implementation**:
- API: `POST /v1/tax/generate-forms`
- Service: TaxReportService
- Forms: IRS Form 8949, Schedule D
- Export: PDF (PDFKit), CSV
- Compliance: IRS Publication 550, CPA-validated

**Dependencies**: Story 2.1.3

**Priority**: P0

**Effort**: 1.5 weeks

---

### Story 2.1.5: Multi-Chain Transaction Aggregation (8 points)

**As a** premium user  
**I want** to aggregate transactions across 100+ chains  
**So that** I can generate comprehensive tax reports

**Acceptance Criteria**:
- ✅ System aggregates transactions from 100+ chains
- ✅ System handles cross-chain transactions (bridges)
- ✅ System normalizes transaction data (different formats per chain)
- ✅ System deduplicates transactions (same tx on multiple chains)
- ✅ System processes 100K+ transactions
- ✅ Aggregation completes within 10 minutes

**Technical Implementation**:
- API: `POST /v1/tax/aggregate`
- Service: TaxAggregatorService (background job)
- Chains: 100+ chains (Ethereum, Polygon, Arbitrum, etc.)
- Performance: 100K+ transactions, <10 minutes
- Deduplication: Transaction hash matching

**Dependencies**: Story 2.1.1

**Priority**: P0

**Effort**: 1 week

---

### Story 2.1.6: Tax Settings Management (5 points)

**As a** premium user  
**I want** to manage my tax settings  
**So that** I can customize tax calculations

**Acceptance Criteria**:
- ✅ User can set default cost basis method
- ✅ User can set tax year (2024, 2025, etc.)
- ✅ User can set country (US, UK, Canada, Australia, Germany)
- ✅ User can exclude specific wallets from tax reports
- ✅ System saves tax settings per user

**Technical Implementation**:
- API: `POST /v1/tax/settings`, `GET /v1/tax/settings`
- Database: `tax_settings` table
- Countries: US (default), UK, Canada, Australia, Germany
- Validation: Valid tax year, valid country

**Dependencies**: None

**Priority**: P1

**Effort**: 0.5 week

---

### Story 2.1.7: Tax Report History (5 points)

**As a** premium user  
**I want** to view my tax report history  
**So that** I can access previous tax reports

**Acceptance Criteria**:
- ✅ User can view list of generated tax reports
- ✅ User can filter by tax year
- ✅ User can download previous reports (PDF, CSV)
- ✅ User can regenerate reports with updated data
- ✅ System stores reports for 7 years (IRS requirement)

**Technical Implementation**:
- API: `GET /v1/tax/reports`
- Database: `tax_reports` table
- Storage: S3 (7-year retention policy)
- Pagination: 20 reports per page

**Dependencies**: Story 2.1.4

**Priority**: P1

**Effort**: 0.5 week

---

### Story 2.1.8: Tax Audit Trail (5 points)

**As a** premium user  
**I want** to view tax audit trail  
**So that** I can verify tax calculations

**Acceptance Criteria**:
- ✅ User can view detailed transaction breakdown
- ✅ User can view cost basis calculations (step-by-step)
- ✅ User can view gains/losses calculations (step-by-step)
- ✅ User can export audit trail (CSV, JSON)
- ✅ Audit trail includes all calculation steps and formulas

**Technical Implementation**:
- API: `GET /v1/tax/audit-trail`
- Database: `tax_transactions` table
- Export: CSV, JSON
- Details: Transaction-level breakdown with formulas

**Dependencies**: Story 2.1.3

**Priority**: P2

**Effort**: 0.5 week

---

### Story 2.1.9: Tax Optimization Suggestions (5 points)

**As a** premium user  
**I want** to receive tax optimization suggestions  
**So that** I can minimize my tax liability

**Acceptance Criteria**:
- ✅ System analyzes user's transactions
- ✅ System suggests optimal cost basis method
- ✅ System suggests tax-loss harvesting opportunities
- ✅ System suggests holding period optimization (short-term vs long-term)
- ✅ System generates optimization report with estimated savings

**Technical Implementation**:
- API: `GET /v1/tax/optimization`
- Service: TaxOptimizerService
- Strategies: Cost basis optimization, tax-loss harvesting, holding period
- Savings Calculation: Compare different scenarios

**Dependencies**: Story 2.1.3

**Priority**: P2

**Effort**: 0.5 week

---

## Technical Architecture

### Components

**Backend Services**:
- `TaxImportService`: Import transactions from multiple sources
- `TaxCalculatorService`: Calculate cost basis and gains/losses
- `TaxReportService`: Generate IRS forms (8949, Schedule D)
- `TaxAggregatorService`: Aggregate multi-chain transactions
- `TaxOptimizerService`: Suggest tax optimization strategies

**Infrastructure**:
- PostgreSQL: Tax transactions, reports, settings
- S3: Report storage (7-year retention)
- Background Jobs: Transaction import, aggregation
- External APIs: Exchange APIs, Blockchain RPCs

### Database Schema

**tax_transactions** table:
```sql
CREATE TABLE tax_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'buy', 'sell', 'swap', 'stake', 'nft'
  token VARCHAR(50) NOT NULL,
  amount DECIMAL(30,18) NOT NULL,
  price_usd DECIMAL(20,8),
  cost_basis_usd DECIMAL(20,8),
  proceeds_usd DECIMAL(20,8),
  gain_loss_usd DECIMAL(20,8),
  holding_period_days INTEGER,
  tax_year INTEGER NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**tax_reports** table:
```sql
CREATE TABLE tax_reports (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tax_year INTEGER NOT NULL,
  cost_basis_method VARCHAR(20) NOT NULL,
  total_short_term_gain DECIMAL(20,8),
  total_long_term_gain DECIMAL(20,8),
  total_gain_loss DECIMAL(20,8),
  report_url VARCHAR(255), -- S3 URL
  status VARCHAR(20) DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Success Metrics

**Technical Metrics**:
- Import speed: <5 minutes for 10K transactions
- Calculation speed: <2 minutes for 10K transactions
- Report generation: <1 minute
- Accuracy: 99.9%+ (CPA-validated)

**Business Metrics**:
- 10K+ users generate tax reports (Q4 2025)
- $2M+ ARR from tax feature
- 95%+ user satisfaction
- 80%+ users return for next tax year

---

**Status**: 📝 Ready for Implementation  
**Assigned To**: Backend Team (3 engineers)  
**Start Date**: Q4 2025, Month 2  
**Target Completion**: Q4 2025, Month 3

