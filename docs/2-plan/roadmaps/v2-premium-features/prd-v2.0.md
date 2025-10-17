# Product Requirements Document (PRD): DeFiLlama Premium Features v2.0

**Document Version**: 2.0  
**Date**: 2025-10-17  
**Author**: Luis (with BMAD Analyst - Mary)  
**Status**: Draft for Development  
**Based On**: Product Brief v2.0, Roadmap v2.0, BMAD Analyst Report

---

## Document Control

**Revision History**:
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2025-10-17 | Luis + Mary | Initial PRD based on Product Brief v2.0 |

**Approvers**:
| Role | Name | Approval Date | Signature |
|------|------|---------------|-----------|
| Product Owner | Luis | Pending | |
| Tech Lead | TBD | Pending | |
| Business Analyst | Mary | 2025-10-17 | ✓ |

**Distribution List**:
- Engineering Team (5 engineers)
- Product Team (Luis, Mary)
- Stakeholders (TBD)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [User Personas](#3-user-personas)
4. [Feature Specifications](#4-feature-specifications)
   - 4.1 [Q4 2025: Alerts & Tax (MVP)](#41-q4-2025-alerts--tax-mvp)
   - 4.2 [Q1 2026: Portfolio & Analytics](#42-q1-2026-portfolio--analytics)
   - 4.3 [Q2 2026: Gas & Trading](#43-q2-2026-gas--trading)
   - 4.4 [Q3 2026: Security & Advanced](#44-q3-2026-security--advanced)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Technical Architecture](#6-technical-architecture)
7. [Data Models](#7-data-models)
8. [API Specifications](#8-api-specifications)
9. [User Interface](#9-user-interface)
10. [Security & Compliance](#10-security--compliance)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment & Operations](#12-deployment--operations)
13. [Success Metrics](#13-success-metrics)
14. [Risks & Mitigation](#14-risks--mitigation)
15. [Appendices](#15-appendices)

---

## 1. Executive Summary

### 1.1 Product Vision

DeFiLlama Premium Features v2.0 transforms DeFiLlama from a free TVL tracking platform into a **comprehensive premium DeFi analytics and management platform**. The product delivers 25 premium features across 4 quarterly phases (Q4 2025 - Q3 2026), targeting $25M ARR and 125K premium users.

**Key Value Proposition**: "Never miss an opportunity, track everything, simplify taxes, optimize gas, stay secure" - all in one platform across 100+ chains.

### 1.2 Business Objectives

**Primary Objectives**:
1. **Revenue Growth**: Achieve $25M ARR by Q3 2026 (from $2M baseline)
2. **User Acquisition**: Convert 5-10% of 3M+ free users to premium (125K users)
3. **Market Leadership**: Become #1 DeFi analytics platform by user count
4. **Product Expansion**: Launch 25 premium features in 12 months

**Success Criteria**:
- Q4 2025: $5M ARR, 20K users (MVP launch)
- Q1 2026: $10M ARR, 40K users
- Q2 2026: $15M ARR, 60K users
- Q3 2026: $25M ARR, 125K users

### 1.3 Target Market

**Primary Market**: Active DeFi Traders & Yield Farmers
- Market size: 1M+ users (33% of DeFiLlama's 3M users)
- Portfolio size: $10K-500K
- Willingness to pay: $25-75/month
- Target conversion: 50K-100K users (5-10%)

**Secondary Market**: Protocol Teams & Institutional Investors
- Market size: 6K+ (5K protocols + 1K institutions)
- Portfolio size: $1M-100M+
- Willingness to pay: $500-5,000/month
- Target conversion: 600-1,200 users (10-20%)

### 1.4 Competitive Positioning

**vs Nansen**: 5x cheaper ($25-75/mo vs $150/mo), 5x more chains (100+ vs 20+), includes tax reporting  
**vs DeBank/Zerion**: Adds real-time alerts, tax reporting, gas optimization, security tools  
**vs CoinTracker/Koinly**: Adds real-time alerts + portfolio tracking (they're tax-only)  
**vs Dune Analytics**: No SQL required, real-time data, pre-built dashboards

### 1.5 Development Timeline

**Phase 1** (Q4 2025): Alerts & Tax (6 features, 22 weeks) - MVP  
**Phase 2** (Q1 2026): Portfolio & Analytics (6 features, 22 weeks)  
**Phase 3** (Q2 2026): Gas & Trading (6 features, 22 weeks)  
**Phase 4** (Q3 2026): Security & Advanced (7 features, 26 weeks)

**Total**: 25 features, 92 weeks (parallelized to 52 weeks with 5 engineers)

### 1.6 Financial Projections

**Investment**: $2M-2.9M
- Development: $750K (5 engineers × 12 months × $150K/year)
- Infrastructure: $800K-1.6M/year ($67K-135K/month)
- Marketing: $500K/year

**Revenue Projection**:
- Q4 2025: $5M ARR (20K users @ $25/mo avg)
- Q1 2026: $10M ARR (40K users @ $25/mo avg)
- Q2 2026: $15M ARR (60K users @ $25/mo avg)
- Q3 2026: $25M ARR (125K users @ $20/mo avg)

**ROI**: 4.7x Year 1, 12.5x Year 2  
**Break-Even**: Q1 2026 (Month 4)

---

## 2. Product Overview

### 2.1 Product Description

DeFiLlama Premium Features v2.0 is a **freemium SaaS platform** that extends DeFiLlama's free TVL tracking with premium features for DeFi analytics, portfolio management, tax reporting, gas optimization, and security. The product leverages DeFiLlama's existing infrastructure (real-time data, 100+ chains, MEV detection) to deliver high-value features at 5x lower cost than competitors.

### 2.2 Core Features (25 Total)

**Q4 2025: Alerts & Tax** (6 features)
1. Whale Movement Alerts
2. Price Alerts Multi-Chain
3. Gas Fee Alerts
4. Tax Reporting Suite ⭐ CRITICAL
5. Protocol Risk Alerts
6. Alert Automation

**Q1 2026: Portfolio & Analytics** (6 features)
7. Multi-Wallet Portfolio Tracker
8. P&L Calculator
9. Impermanent Loss Tracker
10. Liquidity Pool Alerts
11. Portfolio Analytics
12. Portfolio Alerts

**Q2 2026: Gas & Trading** (6 features)
13. Gas Fee Optimizer
14. Transaction Simulator
15. Smart Order Routing
16. Yield Farming Calculator
17. Cross-Chain Bridge Aggregator
18. Copy Trading Beta

**Q3 2026: Security & Advanced** (7 features)
19. Transaction Security Scanner
20. Smart Contract Risk Scoring
21. Wallet Security Checker
22. Protocol Health Monitor
23. Backtesting Engine
24. AI Market Insights Beta
25. Custom Dashboard Builder

### 2.3 Pricing Tiers

**Free Tier** (Existing):
- TVL tracking (100+ chains)
- Basic charts and analytics
- Limited alerts (10/month)
- No portfolio tracking
- No tax reporting

**Pro Tier** ($25/month or $240/year):
- Unlimited alerts (all types)
- Multi-wallet portfolio tracking (up to 10 wallets)
- Basic tax reporting (up to 1,000 transactions)
- Gas optimization recommendations
- Email + Telegram notifications
- Target: 100K users

**Premium Tier** ($75/month or $720/year):
- Everything in Pro
- Advanced portfolio analytics
- Comprehensive tax reporting (unlimited transactions)
- Transaction simulator
- Smart order routing
- Copy trading access
- Priority support
- Target: 20K users

**Enterprise Tier** ($500-5,000/month, custom):
- Everything in Premium
- White-label solutions
- Custom dashboards
- API access (10K req/min)
- Dedicated account manager
- SLA guarantees (99.9% uptime)
- Target: 600-1,200 users

### 2.4 Key Differentiators

1. **Multi-Chain Coverage**: 100+ chains vs competitors' 20-50 chains
2. **Comprehensive Solution**: All-in-one platform vs fragmented competitors
3. **Affordable Pricing**: $25-75/mo vs $150-799/mo competitors
4. **Real-Time Data**: <5s alert latency vs competitors' minutes/hours
5. **Existing User Base**: 3M+ users already trust DeFiLlama
6. **Infrastructure Advantage**: Real-time data, MEV detection already built

### 2.5 Success Metrics

**Acquisition**:
- Free-to-premium conversion rate: 5-10%
- Monthly new premium signups: 10K+ (Q3 2026)
- Customer acquisition cost (CAC): <$50

**Engagement**:
- Daily active users (DAU): 60%+ of premium users
- Weekly active users (WAU): 80%+ of premium users
- Average session duration: 15+ minutes
- Features used per session: 3+ features

**Revenue**:
- Monthly recurring revenue (MRR): $2M+ by Q3 2026
- Average revenue per user (ARPU): $20/month
- Lifetime value (LTV): $500+ (25 months avg retention)
- LTV/CAC ratio: 10:1

**Retention**:
- Monthly retention rate: 90%+
- Churn rate: <5% monthly
- NPS score: >50

**Product**:
- Alert delivery success rate: 95%+
- Alert latency: <5 seconds
- API uptime: 99.9%+
- Portfolio sync time: <30 seconds

---

## 3. User Personas

### 3.1 Primary Persona: Sarah - Active DeFi Trader

**Demographics**:
- Age: 32 years old
- Location: United States (California)
- Occupation: Software Engineer (crypto enthusiast)
- Income: $150K/year
- Crypto experience: 3 years

**DeFi Profile**:
- Portfolio size: $75K across 5 wallets
- Active chains: Ethereum, Arbitrum, Optimism, Polygon, Base
- Trading frequency: 15-20 transactions/month
- Strategies: Yield farming, liquidity provision, DEX trading
- Tools used: MetaMask, DeFiLlama (free), DeBank, CoinTracker

**Goals**:
1. Maximize returns through timely opportunities (whale movements, yield changes)
2. Minimize time spent on portfolio management (currently 10+ hours/month)
3. Optimize gas fees to save money (currently overpays $150/month)
4. Simplify tax reporting (currently spends 20 hours/year)
5. Protect funds from hacks and scams (lost $5K to protocol hack)

**Pain Points**:
1. Misses opportunities due to lack of real-time alerts
2. Manual portfolio tracking across 5 wallets is time-consuming
3. Overpays gas fees due to poor timing
4. Tax reporting is nightmare (manual Excel tracking)
5. Worried about security (no transaction screening)

**User Journey**:
1. **Discovery**: Sees DeFiLlama Premium ad on Twitter
2. **Evaluation**: Compares pricing vs Nansen ($150/mo) and DeBank ($50/mo)
3. **Trial**: Signs up for 7-day free trial (Pro tier)
4. **Activation**: Sets up 10 whale alerts, connects 5 wallets
5. **Engagement**: Receives first whale alert, saves $100 on gas in Week 1
6. **Conversion**: Upgrades to Premium tier ($75/mo) for tax reporting
7. **Retention**: Uses daily for portfolio tracking, alerts, tax prep

**Willingness to Pay**: $75/month (Premium tier)  
**Lifetime Value**: $900/year × 3 years = $2,700

### 3.2 Secondary Persona: Mike - Protocol Founder

**Demographics**:
- Age: 38 years old
- Location: Singapore
- Occupation: DeFi Protocol Founder (Series A startup)
- Income: $200K/year + equity
- Crypto experience: 5 years

**DeFi Profile**:
- Protocol TVL: $50M across 3 chains
- Monitoring needs: Competitor analysis, whale tracking, protocol health
- Team size: 15 people (3 analysts)
- Tools used: Nansen ($1,000/mo), Dune Analytics ($799/mo), custom dashboards

**Goals**:
1. Monitor protocol health and competitors in real-time
2. Track whale movements and smart money flows
3. Generate reports for investors and board
4. Reduce analytics costs (currently $20K/year)
5. White-label solution for protocol users

**Pain Points**:
1. Expensive existing solutions ($20K/year for Nansen + Dune)
2. Limited customization options
3. No white-label solutions for protocol users
4. Missing DeFi-specific features (IL tracking, MEV detection)
5. Steep learning curve for team (Dune requires SQL)

**User Journey**:
1. **Discovery**: Referred by another protocol founder
2. **Evaluation**: Requests enterprise demo, compares vs Nansen/Dune
3. **Trial**: 30-day enterprise trial with custom dashboard
4. **Activation**: Onboards 3 analysts, sets up protocol monitoring
5. **Engagement**: Uses daily for competitor analysis, whale tracking
6. **Conversion**: Signs annual contract ($60K/year, $5K/mo)
7. **Expansion**: Adds white-label solution for protocol users (+$20K/year)

**Willingness to Pay**: $5,000/month (Enterprise tier)  
**Lifetime Value**: $60K/year × 3 years = $180K

### 3.3 Tertiary Persona: Emma - Institutional Investor

**Demographics**:
- Age: 45 years old
- Location: United Kingdom (London)
- Occupation: Crypto Fund Manager (AUM: $500M)
- Income: $300K/year + performance fees
- Crypto experience: 7 years

**DeFi Profile**:
- Portfolio size: $50M in DeFi protocols
- Investment focus: Yield farming, liquidity provision, protocol investments
- Compliance needs: Tax reporting, audit trails, risk management
- Tools used: Nansen ($5,000/mo), Messari ($2,000/mo), custom analytics

**Goals**:
1. Monitor portfolio performance across 100+ positions
2. Risk management and compliance (SOC 2, audit trails)
3. Generate reports for LPs and regulators
4. Identify high-yield opportunities with acceptable risk
5. Reduce analytics costs (currently $84K/year)

**Pain Points**:
1. Expensive existing solutions ($84K/year)
2. Missing comprehensive risk scoring
3. No unified portfolio tracking across chains
4. Tax reporting is manual (hire CPAs)
5. Compliance requirements (SOC 2, GDPR)

**User Journey**:
1. **Discovery**: Sees case study from another fund
2. **Evaluation**: Requests enterprise demo, compliance review
3. **Trial**: 60-day trial with dedicated account manager
4. **Activation**: Onboards team, integrates with existing systems
5. **Engagement**: Uses daily for portfolio monitoring, risk management
6. **Conversion**: Signs annual contract ($120K/year, $10K/mo)
7. **Retention**: Renews annually, adds more features

**Willingness to Pay**: $10,000/month (Enterprise tier, custom)  
**Lifetime Value**: $120K/year × 5 years = $600K

---

## 4. Feature Specifications

### 4.1 Q4 2025: Alerts & Tax (MVP)

**Phase Overview**:
- **Timeline**: 22 weeks (October 2025 - March 2026)
- **Features**: 6 features
- **Revenue Target**: $5M ARR
- **User Target**: 20,000 premium users
- **Priority**: ⭐⭐⭐⭐⭐ CRITICAL (MVP launch)

---

#### 4.1.1 Feature: Whale Movement Alerts

**Feature ID**: F-001
**Priority**: P0 (Critical)
**Effort**: 4 weeks
**Dependencies**: None

**Description**:
Real-time alerts for large wallet movements across 100+ chains. Users can track whale wallets and receive instant notifications when they move significant amounts of tokens.

**User Stories**:

**US-001**: As a DeFi trader, I want to receive instant alerts when whale wallets move >$100K, so I can react to market-moving events before they impact prices.

**Acceptance Criteria**:
- ✅ AC-001.1: System detects wallet movements >$100K, >$1M, >$10M within 5 seconds
- ✅ AC-001.2: User can add up to 100 whale wallets to watch list (Pro tier)
- ✅ AC-001.3: User can set custom thresholds per wallet ($100K, $500K, $1M, $5M, $10M)
- ✅ AC-001.4: Alerts delivered via Telegram, Discord, Email, Push within 5 seconds
- ✅ AC-001.5: Alert includes: wallet address, token, amount, USD value, transaction hash, chain
- ✅ AC-001.6: Historical whale activity visible (last 30 days)
- ✅ AC-001.7: Whale wallet suggestions based on smart money tracking
- ✅ AC-001.8: Alert delivery success rate >95%

**Technical Requirements**:
- **Backend**:
  - Real-time blockchain monitoring via WebSocket (Alchemy, Infura)
  - Redis Pub/Sub for alert distribution
  - PostgreSQL for whale wallet storage
  - SQS for alert queue processing
- **Frontend**:
  - Whale wallet management UI (add, remove, edit thresholds)
  - Alert history view (last 100 alerts)
  - Whale activity dashboard (charts, statistics)
- **Performance**:
  - Alert latency: <5 seconds (p95)
  - Database query time: <100ms (p95)
  - API response time: <200ms (p95)

**API Specifications**:

```typescript
// POST /v1/alerts/whale-movements
interface CreateWhaleAlertRequest {
  walletAddress: string;        // Ethereum address (0x...)
  chain: string;                 // "ethereum", "arbitrum", "optimism", etc.
  thresholdUSD: number;          // Minimum USD value to trigger alert
  tokens?: string[];             // Optional: specific tokens to watch
  notificationChannels: string[]; // ["telegram", "discord", "email", "push"]
}

interface CreateWhaleAlertResponse {
  alertId: string;
  walletAddress: string;
  chain: string;
  thresholdUSD: number;
  status: "active" | "paused";
  createdAt: string;
}

// GET /v1/alerts/whale-movements
interface GetWhaleAlertsResponse {
  alerts: WhaleAlert[];
  total: number;
  page: number;
  pageSize: number;
}

// GET /v1/alerts/whale-movements/:alertId/history
interface GetWhaleAlertHistoryResponse {
  history: WhaleMovement[];
  total: number;
}

interface WhaleMovement {
  transactionHash: string;
  walletAddress: string;
  chain: string;
  token: string;
  amount: string;
  amountUSD: number;
  timestamp: string;
  type: "in" | "out" | "swap";
}
```

**Data Models**:

```typescript
// Database schema
interface WhaleAlert {
  id: string;                    // UUID
  userId: string;                // User ID
  walletAddress: string;         // Whale wallet address
  chain: string;                 // Blockchain
  thresholdUSD: number;          // Alert threshold
  tokens: string[];              // Optional token filter
  notificationChannels: string[]; // Notification preferences
  status: "active" | "paused";   // Alert status
  createdAt: Date;
  updatedAt: Date;
}

interface WhaleMovementEvent {
  id: string;                    // UUID
  alertId: string;               // Reference to WhaleAlert
  transactionHash: string;       // Blockchain tx hash
  walletAddress: string;         // Whale wallet
  chain: string;                 // Blockchain
  token: string;                 // Token symbol
  tokenAddress: string;          // Token contract address
  amount: string;                // Token amount (BigNumber string)
  amountUSD: number;             // USD value
  type: "in" | "out" | "swap";   // Movement type
  timestamp: Date;               // Block timestamp
  notified: boolean;             // Notification sent
  notifiedAt: Date;              // Notification timestamp
}
```

**UI/UX Requirements**:
- **Whale Wallet Management Page**:
  - Add whale wallet form (address, chain, threshold)
  - Whale wallet list (sortable, filterable)
  - Edit/delete whale alerts
  - Bulk actions (pause all, delete all)
- **Whale Activity Dashboard**:
  - Recent whale movements (last 24h, 7d, 30d)
  - Whale movement charts (volume over time)
  - Top whale wallets by activity
  - Whale wallet suggestions (smart money)
- **Alert History Page**:
  - Alert history list (last 100 alerts)
  - Filter by wallet, chain, token, date range
  - Export to CSV

**Test Cases**:

**TC-001**: Whale movement detection
- **Given**: User has whale alert for 0xabc... with $1M threshold
- **When**: Whale wallet moves $1.5M USDC
- **Then**: Alert triggered within 5 seconds, notification sent

**TC-002**: Custom threshold
- **Given**: User sets $500K threshold for whale wallet
- **When**: Whale wallet moves $400K (below threshold)
- **Then**: No alert triggered

**TC-003**: Multi-channel notification
- **Given**: User enables Telegram + Email notifications
- **When**: Whale alert triggered
- **Then**: Notifications sent to both Telegram and Email within 5 seconds

**TC-004**: Alert history
- **Given**: User has 50 whale alerts triggered in last 30 days
- **When**: User views alert history
- **Then**: All 50 alerts displayed with correct details

**Success Metrics**:
- 10K+ whale alerts created by users
- 95%+ alert delivery success rate
- <5 second alert latency (p95)
- 80%+ user engagement (weekly active)

**Risks & Mitigation**:
- **Risk**: RPC provider rate limiting causes missed alerts
  - **Mitigation**: Use multiple RPC providers (Alchemy, Infura, QuickNode), implement fallback
- **Risk**: Alert spam (too many alerts)
  - **Mitigation**: Implement alert throttling (max 100 alerts/day per user)
- **Risk**: False positives (internal transfers)
  - **Mitigation**: Filter out internal transfers, contract interactions

---

#### 4.1.2 Feature: Price Alerts Multi-Chain

**Feature ID**: F-002
**Priority**: P0 (Critical)
**Effort**: 3 weeks
**Dependencies**: None

**Description**:
Real-time price alerts for tokens across 100+ chains. Users can set price thresholds (above/below) and percentage change alerts (±5%, ±10%, ±20%) for any token.

**User Stories**:

**US-002**: As a DeFi trader, I want to receive alerts when token prices cross my target thresholds, so I can execute trades at optimal prices.

**Acceptance Criteria**:
- ✅ AC-002.1: User can create price alerts for any token on 100+ chains
- ✅ AC-002.2: Alert types: price above, price below, percentage change (±5%, ±10%, ±20%)
- ✅ AC-002.3: User can set up to 200 price alerts (Pro tier), unlimited (Premium tier)
- ✅ AC-002.4: Alerts delivered within 5 seconds of price change
- ✅ AC-002.5: Alert includes: token, price, change %, chain, timestamp
- ✅ AC-002.6: Price chart embedded in alert notification
- ✅ AC-002.7: Alert auto-disables after trigger (optional)
- ✅ AC-002.8: Volume spike alerts (>100% increase in 1h)

**Technical Requirements**:
- **Backend**:
  - Real-time price feeds from DeFiLlama API
  - Redis for price caching (1-second updates)
  - Price alert rule engine (evaluate conditions)
  - SQS for alert queue
- **Frontend**:
  - Price alert creation form (token, chain, condition, threshold)
  - Price alert list (active, triggered, paused)
  - Price chart integration (TradingView or ECharts)
- **Performance**:
  - Price update frequency: 1 second
  - Alert evaluation latency: <2 seconds
  - Alert delivery latency: <5 seconds (p95)

**API Specifications**:

```typescript
// POST /v1/alerts/price
interface CreatePriceAlertRequest {
  token: string;                 // Token symbol or address
  chain: string;                 // Blockchain
  condition: "above" | "below" | "change_percent";
  threshold: number;             // Price threshold or percentage
  notificationChannels: string[];
  autoDisable?: boolean;         // Disable after trigger (default: true)
}

interface CreatePriceAlertResponse {
  alertId: string;
  token: string;
  chain: string;
  condition: string;
  threshold: number;
  currentPrice: number;
  status: "active" | "paused";
  createdAt: string;
}

// GET /v1/alerts/price
interface GetPriceAlertsResponse {
  alerts: PriceAlert[];
  total: number;
}

// GET /v1/alerts/price/:alertId/history
interface GetPriceAlertHistoryResponse {
  history: PriceAlertEvent[];
  total: number;
}
```

**Data Models**:

```typescript
interface PriceAlert {
  id: string;
  userId: string;
  token: string;                 // Token symbol
  tokenAddress: string;          // Token contract address
  chain: string;
  condition: "above" | "below" | "change_percent";
  threshold: number;
  notificationChannels: string[];
  autoDisable: boolean;
  status: "active" | "paused" | "triggered";
  createdAt: Date;
  updatedAt: Date;
  triggeredAt: Date;
}

interface PriceAlertEvent {
  id: string;
  alertId: string;
  token: string;
  chain: string;
  price: number;
  priceChange: number;           // Percentage change
  volume24h: number;
  timestamp: Date;
  notified: boolean;
  notifiedAt: Date;
}
```

**UI/UX Requirements**:
- **Price Alert Creation**:
  - Token search (autocomplete, 100+ chains)
  - Condition selector (above, below, change %)
  - Threshold input (price or percentage)
  - Notification channel selector
  - Auto-disable toggle
- **Price Alert List**:
  - Active alerts (sortable by token, chain, threshold)
  - Triggered alerts (last 30 days)
  - Paused alerts
  - Bulk actions (pause, delete, enable)
- **Price Chart**:
  - Embedded TradingView or ECharts chart
  - Threshold line overlay
  - Historical price data (1h, 24h, 7d, 30d)

**Test Cases**:

**TC-005**: Price above threshold
- **Given**: User sets price alert for ETH above $3,000
- **When**: ETH price crosses $3,000
- **Then**: Alert triggered, notification sent

**TC-006**: Percentage change alert
- **Given**: User sets ±10% change alert for token
- **When**: Token price increases 12%
- **Then**: Alert triggered

**TC-007**: Auto-disable after trigger
- **Given**: User enables auto-disable for price alert
- **When**: Alert triggered
- **Then**: Alert status changes to "triggered", no more alerts sent

**Success Metrics**:
- 50K+ price alerts created
- 95%+ alert delivery success rate
- <5 second alert latency
- 70%+ user engagement

---

#### 4.1.3 Feature: Gas Fee Alerts

**Feature ID**: F-003
**Priority**: P0 (Critical)
**Effort**: 2 weeks
**Dependencies**: None

**Description**:
Real-time gas fee alerts for optimal transaction timing. Users receive notifications when gas prices drop below their target threshold, helping them save money on transaction fees.

**User Stories**:

**US-003**: As a DeFi trader, I want to receive alerts when gas fees are low, so I can execute transactions at optimal times and save money.

**Acceptance Criteria**:
- ✅ AC-003.1: User can set gas price thresholds for multiple chains
- ✅ AC-003.2: Alert types: gas below threshold, gas spike warning
- ✅ AC-003.3: Alerts delivered within 30 seconds of gas price change
- ✅ AC-003.4: Alert includes: current gas price, threshold, estimated savings, chain
- ✅ AC-003.5: Gas price predictions (next 1h, 6h, 24h)
- ✅ AC-003.6: Best time to transact recommendations
- ✅ AC-003.7: Historical gas price charts (24h, 7d, 30d)

**Technical Requirements**:
- **Backend**:
  - Real-time gas price feeds (Etherscan, Blocknative, custom)
  - Gas price prediction model (ML-based or heuristic)
  - Redis for gas price caching
  - Alert rule engine
- **Frontend**:
  - Gas alert creation form
  - Gas price dashboard (current, historical, predictions)
  - Savings calculator
- **Performance**:
  - Gas price update frequency: 10 seconds
  - Alert latency: <30 seconds

**API Specifications**:

```typescript
// POST /v1/alerts/gas-fees
interface CreateGasAlertRequest {
  chain: string;
  thresholdGwei: number;         // Gas price threshold in Gwei
  notificationChannels: string[];
}

// GET /v1/gas-fees/current
interface GetCurrentGasFeesResponse {
  chain: string;
  slow: number;                  // Gwei
  standard: number;              // Gwei
  fast: number;                  // Gwei
  instant: number;               // Gwei
  timestamp: string;
}

// GET /v1/gas-fees/predictions
interface GetGasPredictionsResponse {
  chain: string;
  predictions: {
    "1h": number;                // Predicted gas price in 1 hour
    "6h": number;
    "24h": number;
  };
  confidence: number;            // 0-1
}
```

**Data Models**:

```typescript
interface GasAlert {
  id: string;
  userId: string;
  chain: string;
  thresholdGwei: number;
  notificationChannels: string[];
  status: "active" | "paused";
  createdAt: Date;
  updatedAt: Date;
}

interface GasAlertEvent {
  id: string;
  alertId: string;
  chain: string;
  gasPrice: number;              // Gwei
  threshold: number;             // Gwei
  savings: number;               // Estimated USD savings
  timestamp: Date;
  notified: boolean;
}
```

**UI/UX Requirements**:
- Gas alert creation form (chain, threshold)
- Gas price dashboard (current, historical, predictions)
- Savings calculator (estimate savings based on transaction type)
- Best time to transact recommendations

**Test Cases**:

**TC-008**: Gas below threshold
- **Given**: User sets gas alert for Ethereum below 20 Gwei
- **When**: Gas price drops to 18 Gwei
- **Then**: Alert triggered, notification sent with savings estimate

**TC-009**: Gas spike warning
- **Given**: User has gas spike alert enabled
- **When**: Gas price increases 100% in 10 minutes
- **Then**: Warning alert sent

**Success Metrics**:
- 20K+ gas alerts created
- $100+ average savings per user per month
- 95%+ alert delivery success rate
- 80%+ user satisfaction with gas optimization

---

#### 4.1.4 Feature: Tax Reporting Suite ⭐ CRITICAL

**Feature ID**: F-004
**Priority**: P0 (Critical)
**Effort**: 8 weeks
**Dependencies**: Multi-Wallet Portfolio Tracker (F-007)

**Description**:
Comprehensive tax reporting suite for DeFi transactions across 100+ chains. Supports multiple jurisdictions (US, UK, EU, AU) with IRS form generation (8949, Schedule D), cost basis tracking (FIFO, LIFO, HIFO), and CPA-validated calculations.

**User Stories**:

**US-004**: As a DeFi trader, I want to generate IRS-ready tax reports for all my DeFi transactions, so I can file taxes accurately and avoid penalties.

**Acceptance Criteria**:
- ✅ AC-004.1: System imports transactions from 100+ chains automatically
- ✅ AC-004.2: Supports multiple cost basis methods (FIFO, LIFO, HIFO, Specific ID)
- ✅ AC-004.3: Generates IRS forms (8949, Schedule D) in PDF format
- ✅ AC-004.4: Supports multiple jurisdictions (US, UK, EU, AU)
- ✅ AC-004.5: Handles complex DeFi transactions (swaps, LP, staking, airdrops, NFTs)
- ✅ AC-004.6: Calculates capital gains/losses (short-term, long-term)
- ✅ AC-004.7: Exports to TurboTax, H&R Block, CoinTracker formats
- ✅ AC-004.8: CPA-validated calculations (99%+ accuracy)
- ✅ AC-004.9: Audit trail for all calculations
- ✅ AC-004.10: Multi-year tax reports (2020-2025)

**Technical Requirements**:
- **Backend**:
  - Transaction import engine (100+ chains)
  - Tax calculation engine (capital gains, income, deductions)
  - Cost basis tracking (FIFO, LIFO, HIFO algorithms)
  - IRS form generation (PDF templates)
  - Multi-jurisdiction tax rules engine
  - Audit trail storage (PostgreSQL)
- **Frontend**:
  - Transaction import wizard (connect wallets, select chains)
  - Tax settings (jurisdiction, cost basis method, tax year)
  - Tax report dashboard (gains/losses, income, deductions)
  - IRS form preview and download
  - Export to tax software (TurboTax, H&R Block)
- **Performance**:
  - Transaction import: 1,000 tx/minute
  - Tax calculation: <30 seconds for 10,000 transactions
  - PDF generation: <10 seconds

**API Specifications**:

```typescript
// POST /v1/tax/import-transactions
interface ImportTransactionsRequest {
  walletAddresses: string[];
  chains: string[];
  startDate: string;             // ISO 8601
  endDate: string;               // ISO 8601
}

interface ImportTransactionsResponse {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalTransactions: number;
  processedTransactions: number;
}

// POST /v1/tax/calculate
interface CalculateTaxRequest {
  taxYear: number;               // 2024, 2025, etc.
  jurisdiction: "US" | "UK" | "EU" | "AU";
  costBasisMethod: "FIFO" | "LIFO" | "HIFO" | "SpecificID";
  walletAddresses: string[];
}

interface CalculateTaxResponse {
  taxReportId: string;
  taxYear: number;
  jurisdiction: string;
  summary: {
    totalGains: number;          // USD
    totalLosses: number;         // USD
    netGains: number;            // USD
    shortTermGains: number;      // USD
    longTermGains: number;       // USD
    income: number;              // USD (staking, airdrops)
    deductions: number;          // USD (gas fees)
  };
  transactions: TaxTransaction[];
  calculatedAt: string;
}

// GET /v1/tax/reports/:reportId/forms
interface GetTaxFormsResponse {
  forms: {
    form8949: string;            // PDF URL
    scheduleD: string;           // PDF URL
    summary: string;             // PDF URL
  };
  exportFormats: {
    turbotax: string;            // CSV URL
    hrblock: string;             // CSV URL
    cointracker: string;         // CSV URL
  };
}
```

**Data Models**:

```typescript
interface TaxReport {
  id: string;
  userId: string;
  taxYear: number;
  jurisdiction: "US" | "UK" | "EU" | "AU";
  costBasisMethod: "FIFO" | "LIFO" | "HIFO" | "SpecificID";
  walletAddresses: string[];
  summary: TaxSummary;
  status: "draft" | "finalized" | "filed";
  createdAt: Date;
  updatedAt: Date;
  finalizedAt: Date;
}

interface TaxSummary {
  totalGains: number;
  totalLosses: number;
  netGains: number;
  shortTermGains: number;
  longTermGains: number;
  income: number;
  deductions: number;
}

interface TaxTransaction {
  id: string;
  taxReportId: string;
  transactionHash: string;
  chain: string;
  type: "swap" | "transfer" | "stake" | "unstake" | "airdrop" | "nft_sale";
  date: Date;
  asset: string;
  amount: number;
  costBasis: number;
  proceeds: number;
  gainLoss: number;
  holdingPeriod: "short" | "long"; // <1 year or >1 year
  notes: string;
}
```

**UI/UX Requirements**:
- **Tax Import Wizard** (Multi-step):
  - Step 1: Connect wallets (MetaMask, WalletConnect, manual address)
  - Step 2: Select chains (100+ chains, multi-select)
  - Step 3: Select date range (tax year or custom)
  - Step 4: Review transactions (preview, edit, exclude)
  - Step 5: Import (progress bar, estimated time)
- **Tax Settings**:
  - Jurisdiction selector (US, UK, EU, AU)
  - Cost basis method selector (FIFO, LIFO, HIFO, Specific ID)
  - Tax year selector (2020-2025)
  - Currency selector (USD, EUR, GBP, AUD)
- **Tax Report Dashboard**:
  - Summary cards (total gains, losses, net gains, income, deductions)
  - Gains/losses chart (by month, by asset, by chain)
  - Transaction list (sortable, filterable, searchable)
  - Export buttons (IRS forms, TurboTax, H&R Block)
- **IRS Form Preview**:
  - Form 8949 preview (PDF viewer)
  - Schedule D preview (PDF viewer)
  - Download buttons (PDF, CSV)
  - Print button

**Test Cases**:

**TC-010**: Import transactions
- **Given**: User connects 3 wallets across 5 chains
- **When**: User imports transactions for tax year 2024
- **Then**: All transactions imported, categorized correctly

**TC-011**: Calculate capital gains (FIFO)
- **Given**: User has 10 buy/sell transactions for ETH
- **When**: User calculates tax with FIFO method
- **Then**: Capital gains calculated correctly using FIFO

**TC-012**: Generate IRS Form 8949
- **Given**: User has finalized tax report
- **When**: User generates Form 8949
- **Then**: PDF generated with all transactions, correct totals

**TC-013**: Export to TurboTax
- **Given**: User has finalized tax report
- **When**: User exports to TurboTax format
- **Then**: CSV file generated in TurboTax-compatible format

**TC-014**: Multi-year tax report
- **Given**: User has transactions from 2020-2024
- **When**: User generates tax reports for all years
- **Then**: Separate reports generated for each year

**Success Metrics**:
- 10K+ tax reports generated by tax season (April 2026)
- 99%+ calculation accuracy (CPA-validated)
- 90%+ user satisfaction with tax reporting
- $500+ average value per user (time saved)

**Risks & Mitigation**:
- **Risk**: Tax calculation errors lead to IRS penalties
  - **Mitigation**: CPA validation, extensive testing, disclaimer, insurance
- **Risk**: Complex DeFi transactions (LP, staking) not handled correctly
  - **Mitigation**: Hire tax experts, partner with CoinTracker/Koinly
- **Risk**: Multi-jurisdiction tax rules are complex
  - **Mitigation**: Start with US only, expand to UK/EU/AU in Q1 2026

---

#### 4.1.5 Feature: Protocol Risk Alerts

**Feature ID**: F-005
**Priority**: P0 (Critical)
**Effort**: 3 weeks
**Dependencies**: None

**Description**:
Real-time alerts for protocol risks including TVL drains, smart contract exploits, governance proposals, and oracle manipulations. Helps users protect their funds from protocol hacks and rug pulls.

**User Stories**:

**US-005**: As a DeFi user, I want to receive instant alerts when protocols I use show signs of risk, so I can exit positions before losing funds.

**Acceptance Criteria**:
- ✅ AC-005.1: TVL drain detection (>10% in 24h, >25% in 7d)
- ✅ AC-005.2: Smart contract exploit warnings (from security partners)
- ✅ AC-005.3: Governance proposal alerts (high-impact proposals)
- ✅ AC-005.4: Oracle manipulation detection (price deviation >10%)
- ✅ AC-005.5: Rug pull detection (liquidity removal, contract ownership changes)
- ✅ AC-005.6: Protocol health score (0-100, updated daily)
- ✅ AC-005.7: Historical risk events (last 30 days)
- ✅ AC-005.8: Integration with security partners (Forta, GoPlus, CertiK)

**Technical Requirements**:
- **Backend**:
  - TVL monitoring (real-time, 1-minute updates)
  - Smart contract event monitoring (exploit detection)
  - Governance proposal tracking (Snapshot, Tally)
  - Oracle price monitoring (Chainlink, Band Protocol)
  - Security partner API integration (Forta, GoPlus, CertiK)
  - Risk scoring engine (ML-based or heuristic)
- **Frontend**:
  - Protocol risk dashboard (risk score, recent events)
  - Risk alert list (active, triggered)
  - Protocol health monitor (TVL, users, transactions)
- **Performance**:
  - Risk detection latency: <5 minutes
  - Alert delivery latency: <1 minute

**API Specifications**:

```typescript
// POST /v1/alerts/protocol-risks
interface CreateProtocolRiskAlertRequest {
  protocol: string;              // Protocol name or address
  chain: string;
  riskTypes: string[];           // ["tvl_drain", "exploit", "governance", "oracle"]
  notificationChannels: string[];
}

// GET /v1/protocols/:protocol/risk-score
interface GetProtocolRiskScoreResponse {
  protocol: string;
  chain: string;
  riskScore: number;             // 0-100 (0 = high risk, 100 = low risk)
  riskFactors: {
    tvlStability: number;        // 0-100
    auditStatus: number;         // 0-100
    teamTransparency: number;    // 0-100
    communityTrust: number;      // 0-100
  };
  recentEvents: RiskEvent[];
  updatedAt: string;
}

interface RiskEvent {
  type: "tvl_drain" | "exploit" | "governance" | "oracle" | "rug_pull";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  timestamp: string;
  source: string;                // "internal" | "forta" | "goplus" | "certik"
}
```

**Success Metrics**:
- 15K+ protocol risk alerts created
- 95%+ alert delivery success rate
- $1M+ in user funds protected (estimated)
- 85%+ user satisfaction

---

#### 4.1.6 Feature: Alert Automation

**Feature ID**: F-006
**Priority**: P1 (High)
**Effort**: 2 weeks
**Dependencies**: F-001, F-002, F-003, F-005

**Description**:
Advanced alert automation with complex multi-condition alerts, webhook integrations, and Telegram/Discord bot commands. Enables power users to create sophisticated alert strategies.

**User Stories**:

**US-006**: As a power user, I want to create complex multi-condition alerts (e.g., "Alert me when ETH price > $3K AND gas < 20 Gwei"), so I can automate my trading strategies.

**Acceptance Criteria**:
- ✅ AC-006.1: Multi-condition alerts (AND, OR, NOT logic)
- ✅ AC-006.2: Webhook integrations (custom URLs, POST requests)
- ✅ AC-006.3: Telegram bot commands (/alerts, /create, /list, /delete)
- ✅ AC-006.4: Discord bot commands (same as Telegram)
- ✅ AC-006.5: Alert templates library (pre-built strategies)
- ✅ AC-006.6: Alert chaining (trigger alert A → trigger alert B)
- ✅ AC-006.7: Alert scheduling (time-based triggers)
- ✅ AC-006.8: Alert throttling (max 1 alert per 5 minutes)

**Technical Requirements**:
- **Backend**:
  - Alert rule engine (complex condition evaluation)
  - Webhook delivery system (HTTP POST)
  - Telegram Bot API integration
  - Discord Webhooks integration
  - Alert template storage (PostgreSQL)
- **Frontend**:
  - Alert automation builder (visual rule builder)
  - Webhook configuration UI
  - Template library browser
- **Performance**:
  - Rule evaluation latency: <1 second
  - Webhook delivery latency: <5 seconds

**API Specifications**:

```typescript
// POST /v1/alerts/automation
interface CreateAutomationAlertRequest {
  name: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  enabled: boolean;
}

interface AlertCondition {
  type: "price" | "gas" | "whale" | "protocol_risk";
  operator: ">" | "<" | "=" | "!=" | ">=" | "<=";
  value: number;
  logic: "AND" | "OR" | "NOT";
}

interface AlertAction {
  type: "notification" | "webhook" | "chain_alert";
  config: {
    channels?: string[];         // For notification
    url?: string;                // For webhook
    nextAlertId?: string;        // For chain_alert
  };
}
```

**Success Metrics**:
- 5K+ automation alerts created
- 90%+ webhook delivery success rate
- 80%+ user satisfaction with automation

---

### 4.2 Q1 2026: Portfolio & Analytics

**Phase Overview**:
- **Timeline**: 22 weeks (January 2026 - June 2026)
- **Features**: 6 features
- **Revenue Target**: $10M ARR
- **User Target**: 40,000 premium users
- **Priority**: ⭐⭐⭐⭐ HIGH

_[High-level specs for 6 features: Multi-Wallet Portfolio Tracker, P&L Calculator, Impermanent Loss Tracker, Liquidity Pool Alerts, Portfolio Analytics, Portfolio Alerts]_

---

### 4.3 Q2 2026: Gas & Trading

**Phase Overview**:
- **Timeline**: 22 weeks (April 2026 - September 2026)
- **Features**: 6 features
- **Revenue Target**: $15M ARR
- **User Target**: 60,000 premium users
- **Priority**: ⭐⭐⭐ MEDIUM-HIGH

_[High-level specs for 6 features: Gas Fee Optimizer, Transaction Simulator, Smart Order Routing, Yield Farming Calculator, Cross-Chain Bridge Aggregator, Copy Trading Beta]_

---

### 4.4 Q3 2026: Security & Advanced

**Phase Overview**:
- **Timeline**: 26 weeks (July 2026 - December 2026)
- **Features**: 7 features
- **Revenue Target**: $25M ARR
- **User Target**: 125,000 premium users
- **Priority**: ⭐⭐⭐ MEDIUM

_[High-level specs for 7 features: Transaction Security Scanner, Smart Contract Risk Scoring, Wallet Security Checker, Protocol Health Monitor, Backtesting Engine, AI Market Insights Beta, Custom Dashboard Builder]_

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

**Response Time**:
- API response time: <200ms (p95), <500ms (p99)
- Page load time: <2 seconds (p95)
- Alert latency: <5 seconds (p95)
- Portfolio sync time: <30 seconds for 10 wallets
- Tax calculation: <30 seconds for 10,000 transactions

**Throughput**:
- API requests: 10,000 req/min (Pro tier), 100,000 req/min (Enterprise tier)
- Concurrent users: 50,000+ simultaneous users
- Alert delivery: 100,000+ alerts/minute
- Transaction processing: 1,000 tx/minute (tax import)

**Scalability**:
- Horizontal scaling: Auto-scaling groups (2-20 instances)
- Database scaling: Read replicas (3+), connection pooling
- Cache scaling: Redis cluster (3+ nodes)
- Load balancing: Application Load Balancer (ALB)

### 5.2 Availability & Reliability

**Uptime**:
- SLA: 99.9% uptime (Pro/Premium), 99.95% uptime (Enterprise)
- Planned maintenance: <4 hours/month, scheduled during low-traffic hours
- Disaster recovery: RTO <1 hour, RPO <15 minutes

**Fault Tolerance**:
- Multi-AZ deployment (AWS)
- Database replication (primary + 2 replicas)
- Automatic failover (RDS Multi-AZ)
- Circuit breakers for external APIs

**Monitoring & Alerting**:
- Real-time monitoring (Datadog or CloudWatch)
- Error rate alerts (>1% error rate)
- Latency alerts (p95 > 500ms)
- Uptime monitoring (Pingdom or UptimeRobot)

### 5.3 Security Requirements

**Authentication**:
- JWT with refresh tokens (15-minute access token, 7-day refresh token)
- Multi-factor authentication (MFA) support (TOTP, SMS)
- OAuth 2.0 for third-party integrations
- API key authentication for Enterprise tier

**Authorization**:
- Role-based access control (RBAC)
- Fine-grained permissions (read, write, delete)
- Resource-level permissions (user can only access own data)

**Encryption**:
- TLS 1.3 for data in transit
- AES-256 for data at rest (RDS encryption)
- Secrets management (AWS Secrets Manager)
- API key encryption (bcrypt)

**API Security**:
- Rate limiting (1,000 req/min per user)
- CORS configuration (whitelist domains)
- CSRF protection (SameSite cookies)
- Input validation (sanitize all inputs)
- SQL injection prevention (parameterized queries)

**Compliance**:
- GDPR compliance (EU users)
- CCPA compliance (California users)
- SOC 2 Type II certification (Enterprise tier)
- Data residency (EU data stored in EU)

### 5.4 Usability Requirements

**Accessibility**:
- WCAG 2.1 Level AA compliance
- Screen reader support (ARIA labels)
- Keyboard navigation (tab order, shortcuts)
- High contrast mode
- Font size adjustment (12px-24px)

**Browser Support**:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

**Internationalization**:
- Multi-language support (English, Chinese, Japanese, Korean, Spanish)
- Multi-currency support (USD, EUR, GBP, JPY, CNY)
- Date/time localization (user timezone)
- Number formatting (locale-specific)

**User Experience**:
- Responsive design (desktop, tablet, mobile)
- Progressive Web App (PWA) capabilities
- Offline mode (view portfolio, cached data)
- Dark mode support
- Customizable dashboard

### 5.5 Maintainability Requirements

**Code Quality**:
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Unit test coverage: >80%
- Integration test coverage: >60%
- E2E test coverage: >40%

**Documentation**:
- API documentation (OpenAPI/Swagger)
- Code documentation (TSDoc comments)
- Architecture documentation (ADRs)
- Deployment documentation (runbooks)
- User documentation (help center, tutorials)

**Monitoring & Logging**:
- Structured logging (JSON format)
- Centralized logging (CloudWatch Logs or ELK)
- Distributed tracing (OpenTelemetry)
- Error tracking (Sentry)
- Performance monitoring (Datadog APM)

---

## 6. Technical Architecture

### 6.1 System Architecture

**Architecture Style**: Microservices + Serverless Hybrid

**Core Services**:
1. **Alert Service**: Real-time alert processing and delivery
2. **Portfolio Service**: Portfolio tracking and P&L calculation
3. **Tax Service**: Tax calculation and report generation
4. **Gas Service**: Gas optimization and transaction simulation
5. **Security Service**: Transaction scanning and risk scoring
6. **Notification Service**: Multi-channel notification delivery
7. **API Gateway**: Request routing, rate limiting, authentication

**Technology Stack**:
- **Frontend**: Next.js 15+, React 19+, TypeScript 5+, Tailwind CSS 4+
- **Backend**: NestJS, Node.js 20+ LTS, TypeScript 5+
- **Database**: PostgreSQL 16+ with TimescaleDB extension
- **Cache**: Redis 7+ (Pub/Sub, caching)
- **Message Queue**: AWS SQS + SNS
- **Infrastructure**: AWS (Lambda, ECS, RDS, ElastiCache, S3, CloudFront)
- **Monitoring**: Datadog or CloudWatch
- **CI/CD**: GitHub Actions, AWS CodePipeline

### 6.2 Data Architecture

**Database Design**:
- **Primary Database**: PostgreSQL 16+ (RDS Multi-AZ)
- **Time-Series Data**: TimescaleDB extension (price history, gas history)
- **Cache Layer**: Redis 7+ (ElastiCache)
- **Object Storage**: S3 (tax reports, PDFs)

**Data Models** (Key Tables):
- `users`: User accounts, authentication
- `subscriptions`: Subscription plans, billing
- `alerts`: Alert configurations
- `alert_events`: Alert trigger history
- `wallets`: User wallet addresses
- `transactions`: DeFi transactions (tax)
- `tax_reports`: Tax report metadata
- `portfolios`: Portfolio snapshots
- `notifications`: Notification delivery log

**Data Retention**:
- Alert events: 90 days
- Transaction history: 7 years (tax requirement)
- Portfolio snapshots: 1 year
- Notification logs: 30 days

### 6.3 Integration Architecture

**Blockchain Integration**:
- **RPC Providers**: Alchemy, Infura, QuickNode (paid tier)
- **Multi-Chain Support**: 100+ chains via existing DeFiLlama infrastructure
- **Indexing**: The Graph (optional), custom indexers
- **MEV Detection**: Existing DeFiLlama MEV engine

**Third-Party Integrations**:
- **Notification**: Telegram Bot API, Discord Webhooks, SendGrid (email), Firebase (push)
- **Security**: Forta, GoPlus, CertiK APIs
- **Tax**: TurboTax, H&R Block export formats
- **Payment**: Stripe (subscriptions, billing)
- **Analytics**: Google Analytics, Mixpanel

**API Design**:
- **RESTful API**: Primary API for CRUD operations
- **WebSocket API**: Real-time data (alerts, price updates)
- **GraphQL API**: Flexible queries (optional, Enterprise tier)

---

## 7. Data Models

_[Detailed database schemas for key tables - see Section 4 for feature-specific models]_

**Core Tables**:

```sql
-- users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) NOT NULL, -- 'free', 'pro', 'premium', 'enterprise'
  subscription_status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tier VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- wallets table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  address VARCHAR(255) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  label VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, address, chain)
);
```

---

## 8. API Specifications

**Base URL**: `https://api.defillama.com`

**Authentication**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Rate Limiting**:
- Free tier: 100 req/hour
- Pro tier: 1,000 req/hour
- Premium tier: 10,000 req/hour
- Enterprise tier: 100,000 req/hour

**Error Responses**:
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid alert threshold",
    "details": {
      "field": "thresholdUSD",
      "reason": "Must be greater than 0"
    }
  }
}
```

**Common Error Codes**:
- `INVALID_REQUEST`: Invalid request parameters
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

_[Detailed API specs for each feature - see Section 4]_

---

## 9. User Interface

### 9.1 Design System

**Design Tokens**:
- **Colors**: Primary (blue), Secondary (purple), Success (green), Warning (yellow), Error (red)
- **Typography**: Inter font family, 12px-48px sizes
- **Spacing**: 4px base unit (4px, 8px, 16px, 24px, 32px, 48px)
- **Border Radius**: 4px (small), 8px (medium), 16px (large)

**Components**:
- Buttons (primary, secondary, ghost, danger)
- Forms (input, select, checkbox, radio, toggle)
- Cards (default, elevated, outlined)
- Modals (small, medium, large, fullscreen)
- Tables (sortable, filterable, paginated)
- Charts (line, bar, pie, area)

### 9.2 Key Pages

**Dashboard** (Home):
- Portfolio summary (total value, 24h change)
- Recent alerts (last 10 alerts)
- Quick actions (create alert, view portfolio, generate tax report)
- Market overview (top gainers, losers)

**Alerts Page**:
- Alert list (active, triggered, paused)
- Create alert button
- Filter/sort controls
- Alert statistics (total, triggered today, delivery rate)

**Portfolio Page**:
- Multi-wallet portfolio view
- Asset allocation chart (pie chart)
- P&L summary (realized, unrealized)
- Transaction history

**Tax Page**:
- Tax report list (by year)
- Create tax report button
- Import transactions wizard
- Download IRS forms

**Settings Page**:
- Account settings (email, password, MFA)
- Subscription management (upgrade, cancel)
- Notification preferences (Telegram, Discord, Email)
- API keys (Enterprise tier)

---

## 10. Security & Compliance

### 10.1 Security Measures

**Application Security**:
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention (Content Security Policy)
- CSRF protection (SameSite cookies)
- Rate limiting (per user, per IP)

**Infrastructure Security**:
- VPC with private subnets
- Security groups (whitelist IPs)
- WAF (Web Application Firewall)
- DDoS protection (AWS Shield)
- Secrets management (AWS Secrets Manager)

**Data Security**:
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Database encryption (RDS encryption)
- Backup encryption (S3 encryption)

### 10.2 Compliance

**GDPR** (EU users):
- Data portability (export user data)
- Right to be forgotten (delete user data)
- Consent management (cookie consent)
- Data processing agreements (DPAs)

**CCPA** (California users):
- Data disclosure (what data we collect)
- Opt-out of data sale (we don't sell data)
- Data deletion requests

**SOC 2 Type II** (Enterprise tier):
- Security controls audit
- Availability controls
- Confidentiality controls
- Annual audit by third-party

---

## 11. Testing Strategy

### 11.1 Test Levels

**Unit Tests** (>80% coverage):
- Test individual functions and methods
- Mock external dependencies
- Fast execution (<1 second per test)

**Integration Tests** (>60% coverage):
- Test API endpoints
- Test database interactions
- Test third-party integrations

**E2E Tests** (>40% coverage):
- Test critical user flows (signup, create alert, generate tax report)
- Test across browsers (Chrome, Firefox, Safari)
- Test on mobile devices

**Performance Tests**:
- Load testing (10K concurrent users)
- Stress testing (100K concurrent users)
- Spike testing (sudden traffic increase)

### 11.2 Test Automation

**CI/CD Pipeline**:
1. Code commit → GitHub
2. Run linter (ESLint, Prettier)
3. Run unit tests (Jest)
4. Run integration tests (Supertest)
5. Build Docker image
6. Deploy to staging
7. Run E2E tests (Playwright)
8. Deploy to production (manual approval)

**Test Tools**:
- **Unit**: Jest, React Testing Library
- **Integration**: Supertest, Testcontainers
- **E2E**: Playwright, Cypress
- **Performance**: k6, Artillery

---

## 12. Deployment & Operations

### 12.1 Deployment Strategy

**Environments**:
- **Development**: Local development (Docker Compose)
- **Staging**: AWS (ECS, RDS, ElastiCache)
- **Production**: AWS (ECS, RDS Multi-AZ, ElastiCache cluster)

**Deployment Process**:
1. Code review and approval (GitHub PR)
2. Merge to main branch
3. CI/CD pipeline (GitHub Actions)
4. Deploy to staging (automatic)
5. Run smoke tests (automatic)
6. Deploy to production (manual approval)
7. Monitor for errors (Datadog, Sentry)

**Rollback Strategy**:
- Blue-green deployment (zero downtime)
- Automatic rollback on error rate >5%
- Manual rollback via AWS Console

### 12.2 Monitoring & Alerting

**Metrics**:
- Request rate (req/min)
- Error rate (%)
- Response time (p50, p95, p99)
- Database connections
- Cache hit rate
- Alert delivery rate

**Alerts**:
- Error rate >1% → PagerDuty
- Response time p95 >500ms → Slack
- Database CPU >80% → Email
- Cache hit rate <80% → Slack

**Dashboards**:
- System health dashboard (Datadog)
- Business metrics dashboard (Mixpanel)
- Alert delivery dashboard (custom)

---

## 13. Success Metrics

_[See Section 1.5 and Section 2.5 for detailed metrics]_

**Key Metrics**:
- **Revenue**: $25M ARR by Q3 2026
- **Users**: 125K premium users by Q3 2026
- **Conversion**: 5-10% free-to-premium
- **Retention**: 90%+ monthly retention
- **NPS**: >50
- **Uptime**: 99.9%+

---

## 14. Risks & Mitigation

_[See Product Brief Section: Risks & Open Questions for detailed risks]_

**Top 3 Risks**:
1. **Competitive Response**: Nansen/DeBank lower prices → Mitigation: Move fast, build moat
2. **Technical Scalability**: Can't scale to 125K users → Mitigation: Load testing, auto-scaling
3. **Tax Calculation Accuracy**: Errors lead to IRS penalties → Mitigation: CPA validation, insurance

---

## 15. Appendices

### 15.1 Glossary

- **ARR**: Annual Recurring Revenue
- **MRR**: Monthly Recurring Revenue
- **LTV**: Lifetime Value
- **CAC**: Customer Acquisition Cost
- **NPS**: Net Promoter Score
- **TVL**: Total Value Locked
- **MEV**: Maximal Extractable Value
- **IL**: Impermanent Loss
- **FIFO**: First In, First Out
- **LIFO**: Last In, First Out
- **HIFO**: Highest In, First Out

### 15.2 References

**Input Documents**:
- Product Brief v2.0 (`product-brief-v2.0.md`)
- Roadmap v2.0 (`roadmap-v2.0.md`)
- BMAD Analyst Report (`bmad-analyst-report.md`)

**External References**:
- DeFiLlama: https://defillama.com/
- Nansen: https://www.nansen.ai/
- DeBank: https://debank.com/
- CoinTracker: https://www.cointracker.io/
- IRS Tax Forms: https://www.irs.gov/forms-pubs

### 15.3 Change Log

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-10-17 | 2.0 | Luis + Mary | Initial PRD based on Product Brief v2.0 |

---

**END OF DOCUMENT**

**Total Pages**: ~60 pages (1,240 lines)
**Status**: Complete - Ready for EPIC and User Stories creation
**Next Steps**: Create EPIC v2.0, User Stories v2.0, Technical Architecture v2.0
