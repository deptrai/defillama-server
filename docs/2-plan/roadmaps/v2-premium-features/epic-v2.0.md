# EPIC Breakdown: DeFiLlama Premium Features v2.0

**Phiên bản**: 2.1
**Ngày**: 2025-10-17
**Tác giả**: Luis (với Scrum Master - Bob)
**Trạng thái**: Final - Ready for Implementation
**Dựa trên**: PRD v2.0, Product Brief v2.0, Roadmap v2.0, User Stories v2.0

---

## Kiểm soát Tài liệu

**Lịch sử Sửa đổi**:
| Phiên bản | Ngày | Tác giả | Thay đổi |
|-----------|------|---------|----------|
| 2.0 | 2025-10-17 | Luis + Bob | EPIC breakdown ban đầu dựa trên PRD v2.0 |
| 2.1 | 2025-10-17 | Luis + Bob | Updated với actual story points từ User Stories v2.0 (760 points) |

**Người phê duyệt**:
| Vai trò | Tên | Ngày phê duyệt | Chữ ký |
|---------|-----|----------------|--------|
| Product Owner | Luis | Pending | |
| Tech Lead | TBD | Pending | |
| Scrum Master | Bob | 2025-10-17 | ✓ |

---

## Mục lục

1. [Tổng quan EPIC](#1-tổng-quan-epic)
2. [Cấu trúc EPIC](#2-cấu-trúc-epic)
3. [EPIC 1: Alerts & Notifications](#3-epic-1-alerts--notifications)
4. [EPIC 2: Tax & Compliance](#4-epic-2-tax--compliance)
5. [EPIC 3: Portfolio Management](#5-epic-3-portfolio-management)
6. [EPIC 4: Gas & Trading Optimization](#6-epic-4-gas--trading-optimization)
7. [EPIC 5: Security & Risk Management](#7-epic-5-security--risk-management)
8. [EPIC 6: Advanced Analytics & AI](#8-epic-6-advanced-analytics--ai)
9. [Phụ thuộc giữa các EPIC](#9-phụ-thuộc-giữa-các-epic)
10. [Phân bổ Tài nguyên](#10-phân-bổ-tài-nguyên)
11. [Rủi ro & Giảm thiểu](#11-rủi-ro--giảm-thiểu)
12. [Phụ lục](#12-phụ-lục)
13. [EPIC 7: Cross-EPIC Integration](#13-epic-7-cross-epic-integration-new) ⭐ NEW
14. [EPIC 8: DevOps & Infrastructure](#14-epic-8-devops--infrastructure-new) ⭐ NEW
15. [EPIC 9: Documentation](#15-epic-9-documentation-new) ⭐ NEW

---

## 1. Tổng quan EPIC

### 1.1 Mục tiêu Tổng thể

Xây dựng nền tảng DeFi analytics và management toàn diện với **25 tính năng premium** trong **12 tháng** (Q4 2025 - Q3 2026), nhắm đến **$25M ARR** và **125K premium users**.

### 1.2 Chiến lược Phát triển

**Phương pháp**: Agile Scrum với 2-week sprints  
**Team size**: 5 engineers (2 backend, 2 frontend, 1 full-stack)  
**Release strategy**: Quarterly releases với continuous deployment cho bug fixes

**Phases**:
- **Q4 2025** (Tháng 1-3): MVP Launch - Alerts & Tax
- **Q1 2026** (Tháng 4-6): Portfolio & Analytics
- **Q2 2026** (Tháng 7-9): Gas & Trading
- **Q3 2026** (Tháng 10-12): Security & Advanced

### 1.3 Thành công Metrics

**Revenue Targets**:
- Q4 2025: $5M ARR (20K users)
- Q1 2026: $10M ARR (40K users)
- Q2 2026: $15M ARR (60K users)
- Q3 2026: $25M ARR (125K users)

**Technical Metrics**:
- Uptime: 99.9%+
- API response time: <200ms (p95)
- Alert latency: <5 seconds (p95)
- Test coverage: >80% (unit), >60% (integration)

---

## 2. Cấu trúc EPIC

### 2.1 Tổng quan 9 EPICs

| EPIC ID | Tên EPIC | Features | Story Points | Timeline | Priority |
|---------|----------|----------|--------------|----------|----------|
| EPIC-1 | Alerts & Notifications | 8 | 150 | Q4 2025 | ⭐⭐⭐⭐⭐ P0 |
| EPIC-2 | Tax & Compliance | 1 | 80 | Q4 2025 | ⭐⭐⭐⭐⭐ P0 |
| EPIC-3 | Portfolio Management | 6 | 110 | Q1 2026 | ⭐⭐⭐⭐ P1 |
| EPIC-4 | Gas & Trading Optimization | 9 | 191 | Q2 2026 | ⭐⭐⭐ P1 |
| EPIC-5 | Security & Risk Management | 4 | 80 | Q3 2026 | ⭐⭐⭐⭐ P1 |
| EPIC-6 | Advanced Analytics & AI | 3 | 100 | Q3 2026 | ⭐⭐ P2 |
| EPIC-7 | Cross-EPIC Integration | 1 | 25 | All Phases | ⭐⭐⭐⭐⭐ P0 |
| EPIC-8 | DevOps & Infrastructure | 4 | 50 | All Phases | ⭐⭐⭐⭐⭐ P0 |
| EPIC-9 | Documentation | 3 | 25 | All Phases | ⭐⭐⭐⭐ P1 |

**Tổng**: 39 features, 811 story points, 15 tháng

**Note**: EPIC-1 increased from 130 to 150 points (added infrastructure, integration, testing stories). EPIC-4 increased from 140 to 191 points (added F-016 Yield Farming Calculator, F-017 Cross-Chain Bridge Aggregator, F-018 Copy Trading Beta). Added 3 new EPICs for cross-cutting concerns (integration, DevOps, documentation).

### 2.2 Story Points Scale (Fibonacci)

- **1 point**: 1-2 giờ (trivial task)
- **2 points**: 2-4 giờ (simple task)
- **3 points**: 4-8 giờ (1 ngày)
- **5 points**: 1-2 ngày (small feature)
- **8 points**: 2-3 ngày (medium feature)
- **13 points**: 3-5 ngày (large feature)
- **21 points**: 1-2 tuần (very large feature)
- **34 points**: 2-3 tuần (epic-level feature)

### 2.3 Velocity Estimation

**Team velocity**: 40-50 story points/sprint (2 weeks)  
**Sprints per quarter**: 6 sprints  
**Quarterly capacity**: 240-300 story points

---

## 3. EPIC 1: Alerts & Notifications

### 3.1 Thông tin EPIC

**EPIC ID**: EPIC-1  
**Tên**: Alerts & Notifications System  
**Mô tả**: Hệ thống cảnh báo real-time cho whale movements, price changes, gas fees, protocol risks, và alert automation.

**Business Value**: 
- Core feature cho MVP launch
- Competitive advantage vs DeBank/Zerion (không có real-time alerts)
- High user engagement (daily active users)
- Foundation cho các features khác

**Timeline**: Q4 2025 (Tháng 1-3, 22 tuần)
**Story Points**: 150 points
**Priority**: ⭐⭐⭐⭐⭐ P0 (Critical)

### 3.2 Features trong EPIC

| Feature ID | Tên Feature | Story Points | Effort | Priority |
|------------|-------------|--------------|--------|----------|
| F-001 | Whale Movement Alerts | 34 | 4 tuần | P0 |
| F-002 | Price Alerts Multi-Chain | 21 | 3 tuần | P0 |
| F-003 | Gas Fee Alerts | 13 | 2 tuần | P0 |
| F-005 | Protocol Risk Alerts | 21 | 3 tuần | P0 |
| F-006 | Alert Automation | 21 | 2 tuần | P1 |
| | **Infrastructure** | 20 | 2 tuần | P0 |
| | **Testing** | 10 | 1 tuần | P0 |
| | **UI/UX** | 10 | 1 tuần | P0 |

**Tổng**: 150 story points, 18 tuần development + 2 tuần testing/deployment

### 3.3 Technical Components

**Backend Services**:
- Alert Service (core alert processing)
- Notification Service (multi-channel delivery)
- WebSocket Service (real-time data streaming)
- Rule Engine (alert condition evaluation)

**Infrastructure**:
- Redis Pub/Sub (alert distribution)
- PostgreSQL (alert storage)
- AWS SQS (alert queue)
- AWS SNS (notification delivery)

**Integrations**:
- Blockchain RPC providers (Alchemy, Infura, QuickNode)
- Notification channels (Telegram, Discord, Email, Push)
- Security partners (Forta, GoPlus, CertiK)

### 3.4 Acceptance Criteria (EPIC-level)

**Functional**:
- ✅ Users có thể tạo unlimited alerts (Pro/Premium tier)
- ✅ Alert delivery latency <5 seconds (p95)
- ✅ Alert delivery success rate >95%
- ✅ Support 100+ chains
- ✅ Multi-channel notifications (Telegram, Discord, Email, Push)

**Non-Functional**:
- ✅ System xử lý 100,000+ alerts/minute
- ✅ Uptime 99.9%+
- ✅ API response time <200ms (p95)
- ✅ Database query time <100ms (p95)

### 3.5 Dependencies

**External Dependencies**:
- RPC providers (Alchemy, Infura) - CRITICAL
- Notification APIs (Telegram, Discord, SendGrid) - CRITICAL
- Security APIs (Forta, GoPlus, CertiK) - MEDIUM

**Internal Dependencies**:
- User authentication system - CRITICAL
- Subscription management system - CRITICAL
- Multi-chain data infrastructure (existing DeFiLlama) - CRITICAL

### 3.6 Risks & Mitigation

**Risk 1**: RPC provider rate limiting → Missed alerts
- **Impact**: HIGH
- **Mitigation**: Use multiple RPC providers, implement fallback, caching

**Risk 2**: Alert spam → User fatigue
- **Impact**: MEDIUM
- **Mitigation**: Alert throttling (max 100/day), smart grouping

**Risk 3**: Notification delivery failures
- **Impact**: HIGH
- **Mitigation**: Retry logic, multiple channels, delivery confirmation

### 3.7 Success Metrics

**User Metrics**:
- 50K+ alerts created by users
- 80%+ weekly active users (WAU)
- 90%+ user satisfaction (NPS >50)

**Technical Metrics**:
- 95%+ alert delivery success rate
- <5 second alert latency (p95)
- 99.9%+ uptime

**Business Metrics**:
- 20K premium users by end of Q4 2025
- $5M ARR
- 5-10% free-to-premium conversion

---

## 4. EPIC 2: Tax & Compliance

### 4.1 Thông tin EPIC

**EPIC ID**: EPIC-2  
**Tên**: Tax Reporting & Compliance Suite  
**Mô tả**: Comprehensive tax reporting cho DeFi transactions với multi-jurisdiction support, IRS form generation, và CPA-validated calculations.

**Business Value**: 
- ⭐ CRITICAL for tax season (April 2026)
- Unique differentiator (competitors lack DeFi tax support)
- High willingness to pay ($75-150/month)
- Sticky feature (annual retention)

**Timeline**: Q4 2025 (Tháng 1-3, 8 tuần)  
**Story Points**: 80 points  
**Priority**: ⭐⭐⭐⭐⭐ P0 (Critical)

### 4.2 Features trong EPIC

| Feature ID | Tên Feature | Story Points | Effort | Priority |
|------------|-------------|--------------|--------|----------|
| F-004 | Tax Reporting Suite | 80 | 8 tuần | P0 |

**Breakdown**:
- Transaction import engine: 21 points (2 tuần)
- Tax calculation engine: 34 points (3 tuần)
- IRS form generation: 13 points (1 tuần)
- Multi-jurisdiction support: 8 points (1 tuần)
- Export integrations: 4 points (0.5 tuần)

### 4.3 Technical Components

**Backend Services**:
- Transaction Import Service (100+ chains)
- Tax Calculation Engine (FIFO, LIFO, HIFO algorithms)
- Form Generation Service (PDF templates)
- Multi-Jurisdiction Rules Engine

**Infrastructure**:
- PostgreSQL (transaction storage, audit trail)
- S3 (PDF storage)
- Lambda (batch processing)

**Integrations**:
- Blockchain indexers (The Graph, custom)
- Tax software (TurboTax, H&R Block export formats)
- CPA validation partners

### 4.4 Acceptance Criteria (EPIC-level)

**Functional**:
- ✅ Import transactions from 100+ chains automatically
- ✅ Support multiple cost basis methods (FIFO, LIFO, HIFO, Specific ID)
- ✅ Generate IRS forms (8949, Schedule D) in PDF
- ✅ Support multiple jurisdictions (US, UK, EU, AU)
- ✅ Handle complex DeFi transactions (swaps, LP, staking, airdrops, NFTs)
- ✅ 99%+ calculation accuracy (CPA-validated)

**Non-Functional**:
- ✅ Import 1,000 transactions/minute
- ✅ Calculate tax for 10,000 transactions in <30 seconds
- ✅ Generate PDF in <10 seconds
- ✅ Audit trail for all calculations

### 4.5 Dependencies

**External Dependencies**:
- Blockchain indexers - CRITICAL
- Tax rules databases (US IRS, UK HMRC, etc.) - CRITICAL
- CPA validation partners - HIGH

**Internal Dependencies**:
- Multi-Wallet Portfolio Tracker (F-007) - MEDIUM (can work standalone)
- Transaction history infrastructure - CRITICAL

### 4.6 Risks & Mitigation

**Risk 1**: Tax calculation errors → IRS penalties for users
- **Impact**: CRITICAL
- **Mitigation**: CPA validation, extensive testing, disclaimer, insurance

**Risk 2**: Complex DeFi transactions not handled correctly
- **Impact**: HIGH
- **Mitigation**: Hire tax experts, partner with CoinTracker/Koinly

**Risk 3**: Multi-jurisdiction tax rules are complex
- **Impact**: MEDIUM
- **Mitigation**: Start with US only, expand to UK/EU/AU in Q1 2026

### 4.7 Success Metrics

**User Metrics**:
- 10K+ tax reports generated by April 2026
- 90%+ user satisfaction
- $500+ average value per user (time saved)

**Technical Metrics**:
- 99%+ calculation accuracy
- <30 second calculation time for 10K transactions
- Zero critical bugs in production

**Business Metrics**:
- 15K premium users by tax season
- $2M ARR from tax feature alone
- 80%+ annual retention

---

## 5. EPIC 3: Portfolio Management

### 5.1 Thông tin EPIC

**EPIC ID**: EPIC-3
**Tên**: Portfolio Management & Analytics
**Mô tả**: Unified portfolio tracking, P&L calculation, impermanent loss tracking, và portfolio analytics cho multi-wallet DeFi users.

**Business Value**:
- Core feature cho active traders
- Competitive parity với DeBank/Zerion
- High engagement (daily usage)
- Foundation cho advanced features

**Timeline**: Q1 2026 (Tháng 4-6, 22 tuần)
**Story Points**: 110 points
**Priority**: ⭐⭐⭐⭐ P1 (High)

### 5.2 Features trong EPIC

| Feature ID | Tên Feature | Story Points | Effort | Priority |
|------------|-------------|--------------|--------|----------|
| F-007 | Multi-Wallet Portfolio Tracker | 34 | 6 tuần | P0 |
| F-008 | P&L Calculator | 21 | 4 tuần | P0 |
| F-009 | Impermanent Loss Tracker | 13 | 3 tuần | P1 |
| F-010 | Liquidity Pool Alerts | 21 | 4 tuần | P1 |
| F-011 | Portfolio Analytics | 13 | 3 tuần | P1 |
| F-012 | Portfolio Alerts | 8 | 2 tuần | P2 |

**Tổng**: 110 story points, 22 tuần

### 5.3 Technical Components

**Backend Services**:
- Portfolio Service (aggregation, valuation)
- P&L Calculation Engine
- IL Tracking Service
- Analytics Engine

**Infrastructure**:
- PostgreSQL (portfolio snapshots)
- TimescaleDB (historical data)
- Redis (real-time valuation cache)

**Integrations**:
- DeFiLlama price feeds
- DEX APIs (Uniswap, Curve, etc.)
- LP position tracking

### 5.4 Acceptance Criteria (EPIC-level)

**Functional**:
- ✅ Track unlimited wallets (Pro/Premium tier)
- ✅ Real-time portfolio valuation (1-minute updates)
- ✅ Accurate P&L calculation (realized + unrealized)
- ✅ IL tracking for all LP positions
- ✅ Portfolio analytics (risk metrics, diversification)

**Non-Functional**:
- ✅ Portfolio sync time <30 seconds for 10 wallets
- ✅ 98%+ data accuracy
- ✅ Support 100+ chains

### 5.5 Dependencies

**External Dependencies**:
- DeFiLlama price feeds - CRITICAL
- DEX APIs - HIGH
- LP position data - HIGH

**Internal Dependencies**:
- Alert system (EPIC-1) - MEDIUM
- Multi-chain infrastructure - CRITICAL

### 5.6 Success Metrics

**User Metrics**:
- 30K+ users
- 150K+ wallets tracked
- 85%+ user satisfaction

**Technical Metrics**:
- 98%+ data accuracy
- <30 second sync time
- 99.9%+ uptime

**Business Metrics**:
- $10M ARR by end of Q1 2026
- 40K premium users

---

## 6. EPIC 4: Gas & Trading Optimization

### 6.1 Thông tin EPIC

**EPIC ID**: EPIC-4
**Tên**: Gas & Trading Optimization Tools
**Mô tả**: Advanced tools cho gas optimization, transaction simulation, smart order routing, yield farming, cross-chain bridging, và copy trading.

**Business Value**:
- Differentiation vs competitors
- High value for power users
- Revenue from trading volume
- Sticky features (daily usage)

**Timeline**: Q2 2026 (Tháng 7-9, 28 tuần)
**Story Points**: 191 points
**Priority**: ⭐⭐⭐ P1 (Medium-High)

### 6.2 Features trong EPIC

| Feature ID | Tên Feature | Story Points | Effort | Priority |
|------------|-------------|--------------|--------|----------|
| F-013 | Gas Fee Optimizer (Gas Prediction) | 21 | 4 tuần | P0 |
| F-013b | Gas Optimization (Batching & Timing) | 21 | 4 tuần | P1 |
| F-014 | Transaction Simulator | 22 | 5 tuần | P0 |
| F-015 | Smart Order Routing | 34 | 6 tuần | P1 |
| F-015b | MEV Protection | 21 | 4 tuần | P1 |
| F-015c | Limit Orders | 21 | 4 tuần | P1 |
| F-016 | Yield Farming Calculator | 13 | 3 tuần | P1 |
| F-017 | Cross-Chain Bridge Aggregator | 21 | 4 tuần | P1 |
| F-018 | Copy Trading Beta | 17 | 6 tuần | P2 |

**Tổng**: 191 story points, 40 tuần (parallel development, 28 tuần actual)

### 6.3 Technical Components

**Backend Services**:
- Gas Optimization Service
- Transaction Simulation Engine
- Order Routing Service
- Yield Aggregator
- Bridge Aggregator
- Copy Trading Engine

**Infrastructure**:
- Redis (gas price cache, order book cache)
- PostgreSQL (trading history)
- WebSocket (real-time price feeds)

**Integrations**:
- 100+ DEXs (1inch, Paraswap, etc.)
- 20+ bridges (Stargate, Across, etc.)
- Gas price oracles (Blocknative, EthGasStation)

### 6.4 Acceptance Criteria (EPIC-level)

**Functional**:
- ✅ Gas optimization saves $100+ per user per month
- ✅ Transaction simulation 95%+ accuracy
- ✅ Smart routing finds 0.5%+ better prices
- ✅ Yield calculator covers 1,000+ pools
- ✅ Bridge aggregator compares 20+ bridges
- ✅ Copy trading supports 500+ traders

**Non-Functional**:
- ✅ Gas prediction accuracy 90%+
- ✅ Simulation time <2 seconds
- ✅ Order routing time <5 seconds

### 6.5 Dependencies

**External Dependencies**:
- DEX APIs - CRITICAL
- Bridge APIs - HIGH
- Gas price oracles - CRITICAL

**Internal Dependencies**:
- Portfolio system (EPIC-3) - MEDIUM
- Alert system (EPIC-1) - LOW

### 6.6 Success Metrics

**User Metrics**:
- 40K+ users
- $100M+ trading volume
- 85%+ user satisfaction

**Technical Metrics**:
- 0.5%+ average price improvement
- $500K+ total gas savings
- 98%+ successful bridges

**Business Metrics**:
- $15M ARR by end of Q2 2026
- 60K premium users

---

## 7. EPIC 5: Security & Risk Management

### 7.1 Thông tin EPIC

**EPIC ID**: EPIC-5
**Tên**: Security & Risk Management Tools
**Mô tả**: Comprehensive security tools bao gồm transaction scanning, smart contract risk scoring, wallet security checker, và protocol health monitoring.

**Business Value**:
- Critical for user trust
- Prevents losses (high value)
- Competitive advantage
- Regulatory compliance

**Timeline**: Q3 2026 (Tháng 10-12, 16 tuần)
**Story Points**: 80 points
**Priority**: ⭐⭐⭐⭐ P1 (High)

### 7.2 Features trong EPIC

| Feature ID | Tên Feature | Story Points | Effort | Priority |
|------------|-------------|--------------|--------|----------|
| F-019 | Transaction Security Scanner | 34 | 5 tuần | P0 |
| F-020 | Smart Contract Risk Scoring | 21 | 4 tuần | P0 |
| F-021 | Wallet Security Checker | 13 | 3 tuần | P1 |
| F-022 | Protocol Health Monitor | 12 | 4 tuần | P1 |

**Tổng**: 80 story points, 16 tuần

### 7.3 Technical Components

**Backend Services**:
- Security Scanning Service
- Risk Scoring Engine
- Wallet Analysis Service
- Protocol Monitoring Service

**Infrastructure**:
- PostgreSQL (risk scores, audit logs)
- Redis (security cache)

**Integrations**:
- Security partners (Forta, GoPlus, CertiK) - CRITICAL
- Audit databases (CertiK, Trail of Bits)
- Blockchain explorers

### 7.4 Acceptance Criteria (EPIC-level)

**Functional**:
- ✅ 99%+ scam detection rate
- ✅ 10,000+ contracts scored
- ✅ 500K+ approvals revoked
- ✅ 500+ protocols monitored
- ✅ 95%+ early warning accuracy

**Non-Functional**:
- ✅ Scan time <2 seconds
- ✅ Risk score update daily
- ✅ 99.9%+ uptime

### 7.5 Dependencies

**External Dependencies**:
- Security APIs (Forta, GoPlus, CertiK) - CRITICAL
- Audit databases - HIGH

**Internal Dependencies**:
- Alert system (EPIC-1) - MEDIUM
- Protocol data infrastructure - HIGH

### 7.6 Success Metrics

**User Metrics**:
- 50K+ users
- $1M+ funds protected
- 90%+ user satisfaction

**Technical Metrics**:
- 99%+ scam detection
- 95%+ early warning accuracy
- <2 second scan time

**Business Metrics**:
- $20M ARR by mid Q3 2026
- 100K premium users

---

## 8. EPIC 6: Advanced Analytics & AI

### 8.1 Thông tin EPIC

**EPIC ID**: EPIC-6
**Tên**: Advanced Analytics & AI Features
**Mô tả**: Advanced features bao gồm backtesting engine, AI market insights, và custom dashboard builder cho power users.

**Business Value**:
- Premium features cho power users
- Differentiation vs competitors
- High willingness to pay
- Future-proof platform

**Timeline**: Q3 2026 (Tháng 10-12, 20 tuần)
**Story Points**: 100 points
**Priority**: ⭐⭐ P2 (Medium)

### 8.2 Features trong EPIC

| Feature ID | Tên Feature | Story Points | Effort | Priority |
|------------|-------------|--------------|--------|----------|
| F-023 | Backtesting Engine | 34 | 6 tuần | P1 |
| F-024 | AI Market Insights Beta | 34 | 8 tuần | P2 |
| F-025 | Custom Dashboard Builder | 32 | 6 tuần | P2 |

**Tổng**: 100 story points, 20 tuần

### 8.3 Technical Components

**Backend Services**:
- Backtesting Engine
- AI/ML Service (market insights)
- Dashboard Service

**Infrastructure**:
- PostgreSQL (historical data, strategies)
- TimescaleDB (time-series data)
- Redis (dashboard cache)
- ML infrastructure (TensorFlow/PyTorch)

**Integrations**:
- Historical data providers
- Social sentiment APIs (Twitter, Reddit)
- ML model APIs

### 8.4 Acceptance Criteria (EPIC-level)

**Functional**:
- ✅ Backtest 3+ years historical data
- ✅ 70%+ AI prediction accuracy
- ✅ 50+ dashboard widget types
- ✅ Custom strategy builder
- ✅ Dashboard sharing

**Non-Functional**:
- ✅ Backtest execution <5 minutes
- ✅ AI inference <2 seconds
- ✅ Dashboard load time <2 seconds

### 8.5 Dependencies

**External Dependencies**:
- Historical data providers - CRITICAL
- ML model APIs - HIGH
- Social sentiment APIs - MEDIUM

**Internal Dependencies**:
- Portfolio system (EPIC-3) - HIGH
- Alert system (EPIC-1) - MEDIUM

### 8.6 Success Metrics

**User Metrics**:
- 25K+ users
- 50K+ strategies backtested
- 30K+ custom dashboards
- 85%+ user satisfaction

**Technical Metrics**:
- 70%+ prediction accuracy
- <5 minute backtest time
- <2 second dashboard load

**Business Metrics**:
- $25M ARR by end of Q3 2026
- 125K premium users

---

## 9. Phụ thuộc giữa các EPIC

### 9.1 Dependency Graph

```
EPIC-1 (Alerts) ──┐
                  ├──> EPIC-3 (Portfolio) ──┐
EPIC-2 (Tax) ─────┘                         ├──> EPIC-4 (Gas & Trading)
                                            │
                                            ├──> EPIC-5 (Security)
                                            │
                                            └──> EPIC-6 (Advanced Analytics)
```

### 9.2 Critical Path

**Phase 1** (Q4 2025): EPIC-1 + EPIC-2 (parallel)
- EPIC-1 và EPIC-2 có thể develop parallel
- Cả hai đều CRITICAL cho MVP launch
- No dependencies giữa 2 EPICs

**Phase 2** (Q1 2026): EPIC-3
- Depends on: EPIC-1 (alerts cho portfolio alerts)
- Depends on: EPIC-2 (tax data cho P&L calculation)
- Can start after EPIC-1 và EPIC-2 complete

**Phase 3** (Q2 2026): EPIC-4
- Depends on: EPIC-3 (portfolio data cho trading)
- Depends on: EPIC-1 (alerts cho gas/trading alerts)
- Can start after EPIC-3 complete

**Phase 4** (Q3 2026): EPIC-5 + EPIC-6 (parallel)
- EPIC-5 depends on: EPIC-1 (alerts cho security alerts)
- EPIC-6 depends on: EPIC-3 (portfolio data cho analytics)
- Có thể develop parallel

### 9.3 Dependency Matrix

| EPIC | Depends On | Blocks |
|------|------------|--------|
| EPIC-1 | None | EPIC-3, EPIC-4, EPIC-5, EPIC-6 |
| EPIC-2 | None | EPIC-3 |
| EPIC-3 | EPIC-1, EPIC-2 | EPIC-4, EPIC-6 |
| EPIC-4 | EPIC-1, EPIC-3 | None |
| EPIC-5 | EPIC-1 | None |
| EPIC-6 | EPIC-1, EPIC-3 | None |

### 9.4 Risk Mitigation

**Risk**: EPIC-1 delay blocks nhiều EPICs khác
- **Mitigation**: Prioritize EPIC-1, allocate best engineers, daily standups

**Risk**: EPIC-2 delay blocks tax season (April 2026)
- **Mitigation**: Start EPIC-2 early, parallel với EPIC-1, buffer time

**Risk**: Dependencies cause cascading delays
- **Mitigation**: Build interfaces early, mock data, parallel development

---

## 10. Phân bổ Tài nguyên

### 10.1 Team Structure

**Team Size**: 5 engineers
- 2 Backend Engineers (BE1, BE2)
- 2 Frontend Engineers (FE1, FE2)
- 1 Full-Stack Engineer (FS1)

**Supporting Roles**:
- 1 Product Owner (Luis)
- 1 Scrum Master (Bob)
- 1 Business Analyst (Mary)
- 1 QA Engineer (shared)
- 1 DevOps Engineer (shared)

### 10.2 Resource Allocation by EPIC (Updated)

**Q4 2025** (EPIC-1 + EPIC-2 + EPIC-8):
- **EPIC-1 (Alerts)**: BE1, BE2, FE1, FE2 (4 engineers)
- **EPIC-2 (Tax)**: FS1 + external tax expert (1.5 engineers)
- **EPIC-8 (DevOps)**: DevOps engineer (1 engineer, parallel)
- **Total**: 6 engineers (5 feature + 1 DevOps)

**Q1 2026** (EPIC-3 + EPIC-7 + EPIC-9):
- **EPIC-3 (Portfolio)**: BE1, BE2, FE1, FE2 (4 engineers)
- **EPIC-7 (Integration)**: FS1 (1 engineer, parallel)
- **EPIC-9 (Documentation)**: Technical writer (0.5 engineer, parallel)
- **Total**: 5.5 engineers

**Q2 2026** (EPIC-4):
- **EPIC-4 (Gas & Trading)**: All 5 engineers
- **Total**: 5 engineers

**Q3 2026** (EPIC-5 + EPIC-6):
- **EPIC-5 (Security)**: BE1, BE2, FS1 (3 engineers)
- **EPIC-6 (Advanced Analytics)**: FE1, FE2 (2 engineers)
- **Total**: 5 engineers

### 10.3 Sprint Planning (Updated)

**Sprint Duration**: 2 weeks
**Sprints per Quarter**: 6 sprints
**Team Velocity**: 45-55 story points/sprint (increased with 6 engineers)

**Q4 2025** (6 sprints):
- Sprint 1-5: EPIC-1 (150 points) → 30 points/sprint
- Sprint 5-6: EPIC-2 (80 points) → 40 points/sprint (parallel)
- Sprint 1-6: EPIC-8 (50 points) → 8.3 points/sprint (parallel, DevOps)
- **Total**: 280 points (46.7 points/sprint average)

**Q1 2026** (6 sprints):
- Sprint 7-12: EPIC-3 (110 points) → 18.3 points/sprint
- Sprint 7-12: EPIC-7 (25 points) → 4.2 points/sprint (parallel)
- Sprint 7-12: EPIC-9 (25 points) → 4.2 points/sprint (parallel)
- **Total**: 160 points (26.7 points/sprint average)
- **Buffer**: 40-50 points for bug fixes, tech debt

**Q2 2026** (8 sprints):
- Sprint 13-20: EPIC-4 (191 points) → 23.9 points/sprint
- **Buffer**: 40-50 points

**Q3 2026** (6 sprints):
- Sprint 21-26: EPIC-5 + EPIC-6 (180 points) → 30 points/sprint
- **Buffer**: 20-30 points

**Total**: 30 sprints (15 months), 811 points

### 10.4 Capacity Planning (Updated)

**Total Capacity**: 28 sprints × 45 points/sprint = 1,260 points
**Planned Work**: 760 points (9 EPICs)
**Buffer**: 500 points (40% buffer)

**Buffer Allocation**:
- Bug fixes: 180 points (14%)
- Tech debt: 120 points (10%)
- Refactoring: 100 points (8%)
- Unplanned work: 100 points (8%)

---

## 11. Rủi ro & Giảm thiểu

### 11.1 Technical Risks

**Risk 1**: Scalability issues với 125K users
- **Probability**: MEDIUM
- **Impact**: HIGH
- **Mitigation**:
  - Load testing từ Q4 2025
  - Auto-scaling infrastructure
  - Database optimization
  - Caching strategy

**Risk 2**: RPC provider rate limiting
- **Probability**: HIGH
- **Impact**: HIGH
- **Mitigation**:
  - Multiple RPC providers (Alchemy, Infura, QuickNode)
  - Fallback logic
  - Caching
  - Rate limit monitoring

**Risk 3**: Tax calculation errors
- **Probability**: MEDIUM
- **Impact**: CRITICAL
- **Mitigation**:
  - CPA validation
  - Extensive testing (10,000+ test cases)
  - Disclaimer
  - Insurance
  - Gradual rollout

**Risk 4**: Security vulnerabilities
- **Probability**: MEDIUM
- **Impact**: CRITICAL
- **Mitigation**:
  - Security audits (quarterly)
  - Penetration testing
  - Bug bounty program
  - SOC 2 compliance

### 11.2 Business Risks

**Risk 1**: Competitive response (Nansen/DeBank lower prices)
- **Probability**: HIGH
- **Impact**: HIGH
- **Mitigation**:
  - Move fast (12-month roadmap)
  - Build moat (unique features)
  - Focus on quality
  - Community building

**Risk 2**: Low conversion rate (free to premium)
- **Probability**: MEDIUM
- **Impact**: HIGH
- **Mitigation**:
  - A/B testing pricing
  - Free trial (14 days)
  - Freemium features
  - User education

**Risk 3**: Tax season miss (April 2026)
- **Probability**: LOW
- **Impact**: CRITICAL
- **Mitigation**:
  - Start EPIC-2 early (Q4 2025)
  - Buffer time (2 weeks)
  - Parallel development
  - Daily standups

### 11.3 Resource Risks

**Risk 1**: Key engineer leaves
- **Probability**: MEDIUM
- **Impact**: HIGH
- **Mitigation**:
  - Knowledge sharing (pair programming)
  - Documentation
  - Cross-training
  - Retention bonuses

**Risk 2**: Team over-allocated in Q4 2025
- **Probability**: HIGH
- **Impact**: MEDIUM
- **Mitigation**:
  - Prioritize EPIC-1 over EPIC-2
  - Hire external tax expert for EPIC-2
  - Reduce scope if needed
  - Extend timeline by 2 weeks

**Risk 3**: Burnout (12-month aggressive roadmap)
- **Probability**: MEDIUM
- **Impact**: HIGH
- **Mitigation**:
  - Sustainable pace (40-hour weeks)
  - Buffer time (40% capacity)
  - Quarterly breaks
  - Team morale activities

---

## 12. Phụ lục

### 12.1 Glossary

- **Story Point**: Unit of effort estimation (Fibonacci scale)
- **Sprint**: 2-week development cycle
- **Velocity**: Story points completed per sprint
- **Epic**: Large feature set (multiple stories)
- **MVP**: Minimum Viable Product (Q4 2025)
- **P0/P1/P2**: Priority levels (P0 = Critical, P1 = High, P2 = Medium)

### 12.2 References

**Input Documents**:
- PRD v2.0 (`prd-v2.0.md`)
- Product Brief v2.0 (`product-brief-v2.0.md`)
- Roadmap v2.0 (`roadmap-v2.0.md`)

**Agile Resources**:
- Scrum Guide: https://scrumguides.org/
- Story Point Estimation: Fibonacci scale
- Sprint Planning: 2-week sprints

### 12.3 Change Log

| Ngày | Phiên bản | Tác giả | Thay đổi |
|------|-----------|---------|----------|
| 2025-10-17 | 2.0 | Luis + Bob | EPIC breakdown ban đầu |
| 2025-10-17 | 2.1 | Luis + Bob | Updated với actual story points từ User Stories v2.0 |

---

## 13. EPIC-7: Cross-EPIC Integration (NEW)

### 13.1 Thông tin EPIC

**EPIC ID**: EPIC-7
**Tên**: Cross-EPIC Integration
**Mô tả**: Tích hợp liền mạch giữa các EPICs để tạo trải nghiệm người dùng thống nhất

**Business Value**: Enables seamless user experience across all features
**Story Points**: 25 points
**Timeline**: Throughout all phases (Q4 2025 - Q3 2026)
**Priority**: ⭐⭐⭐⭐⭐ P0 (Critical)

### 13.2 Features

| Feature ID | Tên Feature | Story Points | Priority |
|------------|-------------|--------------|----------|
| F-026 | Alerts + Portfolio Integration | 8 | P0 |
| F-027 | Tax + Portfolio Integration | 8 | P0 |
| F-028 | Trading + Portfolio Integration | 5 | P0 |
| F-029 | Security + Portfolio Integration | 2 | P1 |
| F-030 | Analytics + All EPICs Integration | 2 | P1 |

**Tổng**: 5 features, 25 story points

### 13.3 Dependencies

**Depends on**:
- EPIC-1 (Alerts)
- EPIC-2 (Tax)
- EPIC-3 (Portfolio)
- EPIC-4 (Trading)
- EPIC-5 (Security)
- EPIC-6 (Analytics)

**Blocks**: None (enables better UX but not blocking)

---

## 14. EPIC-8: DevOps & Infrastructure (NEW)

### 14.1 Thông tin EPIC

**EPIC ID**: EPIC-8
**Tên**: DevOps & Infrastructure
**Mô tả**: CI/CD, infrastructure as code, monitoring, và operational excellence

**Business Value**: Enables reliable, scalable, and automated operations
**Story Points**: 50 points
**Timeline**: Throughout all phases (Q4 2025 - Q3 2026)
**Priority**: ⭐⭐⭐⭐⭐ P0 (Critical)

### 14.2 Features

| Feature ID | Tên Feature | Story Points | Priority |
|------------|-------------|--------------|----------|
| F-031 | CI/CD Pipeline | 15 | P0 |
| F-032 | Database Management | 15 | P0 |
| F-033 | Infrastructure as Code | 10 | P0 |
| F-034 | Monitoring & Alerting | 10 | P0 |

**Tổng**: 4 features, 50 story points

### 14.3 Dependencies

**Depends on**: None (foundational)
**Blocks**: All EPICs (required for deployment)

---

## 15. EPIC-9: Documentation (NEW)

### 15.1 Thông tin EPIC

**EPIC ID**: EPIC-9
**Tên**: Documentation
**Mô tả**: API documentation, user guides, developer documentation, runbooks

**Business Value**: Enables developers and users to understand and use the platform
**Story Points**: 25 points
**Timeline**: Throughout all phases (Q4 2025 - Q3 2026)
**Priority**: ⭐⭐⭐⭐ P1 (High)

### 15.2 Features

| Feature ID | Tên Feature | Story Points | Priority |
|------------|-------------|--------------|----------|
| F-035 | API Documentation | 10 | P1 |
| F-036 | User Documentation | 10 | P1 |
| F-037 | Developer Documentation | 5 | P1 |

**Tổng**: 3 features, 25 story points

### 15.3 Dependencies

**Depends on**: All EPICs (documents all features)
**Blocks**: None (enables better adoption but not blocking)

---

**KẾT THÚC TÀI LIỆU**

**Tổng số Trang**: ~40 trang (1,100 dòng)
**Trạng thái**: ✅ Final - Ready for Implementation
**Bước tiếp theo**: Sprint Planning & Implementation

**Thống kê EPIC** (Updated):
- **Tổng EPICs**: 9 EPICs (6 feature + 3 enabler)
- **Tổng Features**: 36 features
- **Tổng Story Points**: 760 points (was 640, +120 points)
- **Timeline**: 14 tháng (Q4 2025 - Q1 2027)
- **Team Size**: 5-6 engineers
- **Capacity**: 1,200 points (37% buffer)

**Critical Path** (Updated):
1. Q4 2025: EPIC-1 + EPIC-2 + EPIC-8 (MVP launch + DevOps)
2. Q1 2026: EPIC-3 + EPIC-7 + EPIC-9 (Portfolio + Integration + Docs)
3. Q2 2026: EPIC-4 (Gas & Trading)
4. Q3 2026: EPIC-5 + EPIC-6 (Security & Advanced)

**Success Criteria**:
- ✅ $25M ARR by Q3 2026
- ✅ 125K premium users
- ✅ 99.9%+ uptime
- ✅ 90%+ user satisfaction

