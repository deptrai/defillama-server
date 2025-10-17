# 🏗️ Technical Architecture - DeFiLlama Premium Features v2.0

**Epic**: Premium Features Platform (premium-features-v2)
**Date**: October 17, 2025
**Architect**: Luis (Winston - System Architect)
**Version**: 2.0
**Based On**: PRD v2.0, EPIC v2.0, Product Brief v2.0

---

## 📋 **DOCUMENT CONTROL**

**Revision History**:
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2025-10-17 | Luis + Winston | Initial architecture for Premium Features v2.0 |

**Approvers**:
| Role | Name | Approval Date | Signature |
|------|------|---------------|-----------|
| Product Owner | Luis | Pending | |
| Tech Lead | TBD | Pending | |
| System Architect | Winston | 2025-10-17 | ✓ |

**Distribution List**:
- Engineering Team (5 engineers: 2 BE, 2 FE, 1 FS)
- Product Team (Luis, Mary)
- DevOps Team
- Security Team

---

## 📖 **TABLE OF CONTENTS**

1. [Architecture Overview](#1-architecture-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Core Components](#3-core-components)
4. [Technology Stack](#4-technology-stack)
5. [Data Architecture](#5-data-architecture)
6. [API Architecture](#6-api-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Infrastructure Architecture](#8-infrastructure-architecture)
9. [Integration Architecture](#9-integration-architecture)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Performance & Scalability](#12-performance--scalability)
13. [Architecture Decision Records](#13-architecture-decision-records)
14. [Source Tree Structure](#14-source-tree-structure)
15. [Appendices](#15-appendices)

---

## 1. **ARCHITECTURE OVERVIEW**

### 1.1 System Vision

Transform DeFiLlama from a free TVL tracking platform into a **comprehensive premium DeFi analytics and management platform** by adding 25 premium features across 6 EPICs, targeting $25M ARR and 125K premium users in 12 months (Q4 2025 - Q3 2026).

**Key Value Proposition**: "Never miss an opportunity, track everything, simplify taxes, optimize gas, stay secure" - all in one platform across 100+ chains.

### 1.2 Architecture Principles

**1. Extend, Don't Replace**: Build on existing DeFiLlama infrastructure
- Leverage existing AWS serverless architecture
- Reuse existing services (authentication, protocol data, price data)
- Maintain consistency with existing patterns

**2. Isolation & Independence**: Premium features don't affect free platform
- Separate premium database (avoid overloading free platform DB)
- Independent scaling for premium services
- Graceful degradation (premium failures don't affect free users)

**3. Serverless-First**: Leverage AWS Lambda for auto-scaling and cost efficiency
- Auto-scaling based on demand
- Pay-per-use pricing model
- No server management overhead

**4. Event-Driven**: Real-time data processing using event streams
- SQS for async processing
- SNS for pub/sub notifications
- Redis Pub/Sub for real-time updates

**5. API-First**: RESTful and WebSocket APIs for all functionality
- Consistent API design patterns
- Versioned APIs (v1, v2)
- OpenAPI/Swagger documentation

**6. Microservices**: Loosely coupled services with clear boundaries
- 6 premium services (1 per EPIC)
- Independent deployment and scaling
- Clear service contracts

**7. Multi-Chain Native**: Support 100+ blockchains with unified data models
- Chain-agnostic data models
- Unified APIs across chains
- Extensible for new chains

**8. Security-First**: SOC 2 Type II compliance, GDPR compliance
- Encryption at rest and in transit
- Row-level security (RLS)
- Audit logging for all operations

### 1.3 Business Context

**Target Market**:
- **Primary**: Active DeFi Traders & Yield Farmers (50K-100K users)
- **Secondary**: Protocol Teams & Institutional Investors (600-1,200 users)

**Revenue Model**:
- **Tier 1 - Starter**: $25/month (basic alerts, portfolio tracking)
- **Tier 2 - Pro**: $50/month (+ tax reporting, gas optimization)
- **Tier 3 - Enterprise**: $500-5,000/month (+ API access, custom features)

**Success Metrics**:
- Q4 2025: $5M ARR, 20K users (MVP launch)
- Q1 2026: $10M ARR, 40K users
- Q2 2026: $15M ARR, 60K users
- Q3 2026: $25M ARR, 125K users

### 1.4 Scope

**In Scope** (25 Features across 6 EPICs):
1. **EPIC-1**: Alerts & Notifications (5 features, 130 points, Q4 2025)
2. **EPIC-2**: Tax & Compliance (1 feature, 80 points, Q4 2025)
3. **EPIC-3**: Portfolio Management (6 features, 110 points, Q1 2026)
4. **EPIC-4**: Gas & Trading Optimization (9 features, 191 points, Q2 2026)
5. **EPIC-5**: Security & Risk Management (4 features, 80 points, Q3 2026)
6. **EPIC-6**: Advanced Analytics & AI (3 features, 100 points, Q3 2026)

**Out of Scope**:
- Changes to existing free platform features
- Mobile app development (web-first approach)
- Fiat on/off ramp integration
- Custody services
- Trading execution (only routing/aggregation)

### 1.5 Constraints

**Technical Constraints**:
- Must use existing AWS infrastructure (Lambda, ECS, RDS, ElastiCache)
- Must maintain <200ms API response time
- Must support 100+ chains (existing chain support)
- Must maintain 99.9% uptime SLA

**Business Constraints**:
- 12-month timeline (Q4 2025 - Q3 2026)
- 5-engineer team (2 BE, 2 FE, 1 FS)
- $2M-2.9M total investment budget
- Must not disrupt existing free platform

**Regulatory Constraints**:
- SOC 2 Type II compliance (required for enterprise customers)
- GDPR compliance (EU users)
- Tax reporting compliance (IRS Form 8949, Schedule D)
- No financial advice (disclaimer required)

### 1.6 Assumptions

**Technical Assumptions**:
- Existing DeFiLlama infrastructure can handle additional load with scaling
- AWS services availability and reliability
- Third-party APIs (CoinGecko, Etherscan, etc.) remain available
- Blockchain RPC endpoints remain accessible

**Business Assumptions**:
- 5-10% conversion rate from free to premium users
- $25-75/month average revenue per user (ARPU)
- 80% annual retention rate for premium users
- Tax reporting demand peaks in Q1 (tax season)

**User Assumptions**:
- Users have MetaMask or similar wallet
- Users understand basic DeFi concepts
- Users willing to connect wallets for portfolio tracking
- Users willing to pay for premium features

---

## 2. **HIGH-LEVEL ARCHITECTURE**

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Web Dashboard (Next.js)  │  Mobile Browser  │  API Clients  │  Webhooks    │
│  - Free features          │  - Responsive    │  - REST API   │  - Alerts    │
│  - Premium features       │  - PWA support   │  - WebSocket  │  - Events    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  CloudFront CDN  │  API Gateway v2 (REST)  │  API Gateway v2 (WebSocket)   │
│  - Static assets │  - Rate limiting        │  - Real-time connections      │
│  - Edge caching  │  - Authentication       │  - Pub/Sub messaging          │
│                  │  - Request validation   │  - Connection management      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER (FREE)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Protocol API    │  TVL API         │  Price API       │  Analytics API     │
│  - 3000+ protocols│ - Historical TVL │ - Real-time     │ - Charts          │
│  - Multi-chain   │  - Aggregations  │ - Multi-chain   │ - Dashboards      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (PREMIUM - NEW)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Alerts Service  │  Tax Service     │  Portfolio Service │  Gas & Trading  │
│  (EPIC-4)        │  (EPIC-2)        │  (EPIC-3)          │  (EPIC-4)       │
│  - Whale alerts  │  - Tax calc      │  - Multi-chain     │  - Gas optimize │
│  - Price alerts  │  - Reports       │  - Performance     │  - DEX routing  │
│  - Gas alerts    │  - Multi-juris   │  - Asset alloc     │  - MEV protect  │
│                  │                  │                    │  - Yield farming│
│                  │                  │                    │  - Bridging     │
│                  │                  │                    │  - Copy trading │
│                  │                  │                    │                 │
│  Security Service│  Analytics Service│  Subscription Svc │  Notification   │
│  (EPIC-5)        │  (EPIC-6)        │  (NEW)             │  Service (NEW)  │
│  - Tx scanning   │  - AI predictions│  - Billing         │  - Email        │
│  - Risk scoring  │  - Dashboards    │  - Tiers           │  - Webhook      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROCESSING LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Event Processor │  Alert Engine    │  Tax Calculator  │  Portfolio Agg    │
│  - SQS consumers │  - Rule matching │  - Cost basis    │  - Cross-chain    │
│  - Async jobs    │  - Notifications │  - P&L calc      │  - Aggregation    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  FREE DB         │  PREMIUM DB      │  TIME-SERIES DB  │  REDIS CACHE      │
│  (PostgreSQL)    │  (PostgreSQL)    │  (TimescaleDB)   │  (ElastiCache)    │
│  - Protocols     │  - Users         │  - Portfolios    │  - Hot data       │
│  - TVL data      │  - Alerts        │  - Prices        │  - Sessions       │
│  - Prices        │  - Tax data      │  - Gas prices    │  - Rate limits    │
│                  │                  │                  │                   │
│  S3 DATA LAKE    │  DynamoDB        │  ElasticSearch   │                   │
│  - Historical    │  - WebSocket     │  - Logs          │                   │
│  - Backups       │  - Connections   │  - Analytics     │                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┘
│                         BLOCKCHAIN LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Ethereum RPC    │  Polygon RPC     │  BSC RPC         │  100+ Chain RPCs  │
│  Arbitrum RPC    │  Optimism RPC    │  Solana RPC      │  Base RPC         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Service Boundaries

**6 Premium Services** (1 per EPIC):

**1. Alerts Service** (EPIC-1)
- **Responsibility**: Real-time alerts for whale movements, price changes, gas fees, protocol risks
- **Dependencies**: Price API, Protocol API, Blockchain RPCs
- **Data**: Alert rules, alert history, notification preferences
- **APIs**: REST (CRUD alerts), WebSocket (real-time alerts)

**2. Tax Service** (EPIC-2)
- **Responsibility**: Tax calculation, report generation, multi-jurisdiction support
- **Dependencies**: Portfolio Service, Price API, Blockchain RPCs
- **Data**: Tax transactions, cost basis, tax reports
- **APIs**: REST (tax reports, calculations)

**3. Portfolio Service** (EPIC-3)
- **Responsibility**: Multi-chain portfolio tracking, performance analytics, asset allocation
- **Dependencies**: Price API, Protocol API, Blockchain RPCs
- **Data**: Portfolio snapshots, performance metrics, asset allocations
- **APIs**: REST (portfolio data), WebSocket (real-time updates)

**Multi-Chain Data Fetching Strategy**:
```
┌─────────────────────────────────────────────────────────────┐
│           PORTFOLIO AGGREGATOR (Background Job)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Fetch user wallet addresses (125K users)                │
│  2. Parallel fetch balances from 100+ chains                │
│     - Batch size: 10 chains per batch                       │
│     - Concurrency: 10 parallel batches                      │
│     - Rate limiting: 100 req/s per chain                    │
│     - Timeout: 5s per chain                                 │
│  3. Aggregate balances across chains                        │
│  4. Calculate total portfolio value (USD)                   │
│  5. Store snapshot in TimescaleDB                           │
│  6. Publish update via WebSocket                            │
│                                                             │
│  Frequency: Every 1 hour (configurable)                     │
│  Duration: ~10-15 minutes for 125K users                    │
│  Cost: ~$50-75/month (Lambda + RPC calls)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Consistency Strategy**:
- **Eventual Consistency**: Portfolio snapshots updated every 1 hour
- **Real-time Updates**: WebSocket pushes updates when new snapshot available
- **Cache Strategy**: Redis cache for latest snapshot (TTL: 1 hour)
- **Fallback**: If RPC fails, use cached data from previous snapshot

**Performance Optimization**:
- **Parallel Fetching**: 10 chains × 10 batches = 100 chains in parallel
- **Connection Pooling**: Reuse RPC connections across requests
- **Caching**: Cache chain metadata, token prices (TTL: 5 minutes)
- **Compression**: Compress snapshots in TimescaleDB (10:1 ratio)

**4. Gas & Trading Service** (EPIC-4)
- **Responsibility**: Gas optimization, DEX aggregation, order routing, slippage protection, MEV protection, yield farming, cross-chain bridging, copy trading
- **Dependencies**: Price API, DEX APIs, Blockchain RPCs, Bridge APIs, Yield APIs
- **Data**: Gas predictions, trade routes, slippage data, yield pools, bridges, trader performance
- **APIs**: REST (gas estimates, trade routes, yield recommendations, bridge comparison, trader leaderboards)

**5. Security Service** (EPIC-5)
- **Responsibility**: Transaction scanning, contract analysis, risk scoring, fraud detection
- **Dependencies**: Blockchain RPCs, Security APIs (GoPlus, etc.)
- **Data**: Security scans, risk scores, fraud patterns
- **APIs**: REST (security scans, risk scores)

**6. Analytics Service** (EPIC-6)
- **Responsibility**: AI predictions, custom dashboards, advanced analytics
- **Dependencies**: All premium services, ML models
- **Data**: Predictions, dashboard configs, analytics data
- **APIs**: REST (predictions, dashboards)

**2 Shared Services**:

**7. Subscription Service** (NEW)
- **Responsibility**: Billing, subscription management, tier enforcement
- **Dependencies**: Stripe API, User authentication
- **Data**: Subscriptions, payments, usage tracking
- **APIs**: REST (subscription CRUD), Webhooks (Stripe events)

**8. Notification Service** (NEW)
- **Responsibility**: Email, webhook, push notifications
- **Dependencies**: SendGrid, SNS, FCM
- **Data**: Notification templates, delivery status
- **APIs**: Internal (send notifications)

### 2.3 Data Flow Patterns

**Pattern 1: Real-time Alert Flow**
```
User creates alert rule → Alerts Service → Store in Premium DB
                                         ↓
Blockchain event occurs → Event Processor → Check alert rules
                                         ↓
Rule matched → Alert Engine → Notification Service → User (email/webhook/push)
                           ↓
                    Store alert history
```

**Pattern 2: Tax Report Generation Flow**
```
User requests tax report → Tax Service → Fetch transactions (Portfolio Service)
                                      ↓
                              Fetch prices (Price API)
                                      ↓
                              Calculate cost basis, P&L
                                      ↓
                              Generate report (PDF/CSV)
                                      ↓
                              Store in S3 → Return download link
```

**Pattern 3: Portfolio Aggregation Flow**
```
User connects wallet → Portfolio Service → Fetch balances (Blockchain RPCs)
                                        ↓
                                Fetch prices (Price API)
                                        ↓
                                Calculate total value
                                        ↓
                                Store snapshot (TimescaleDB)
                                        ↓
                                Cache result (Redis) → Return to user
```

**Pattern 4: Gas Optimization Flow**
```
User requests gas estimate → Gas & Trading Service → Fetch current gas prices
                                                   ↓
                                           Predict optimal time (ML model)
                                                   ↓
                                           Cache prediction (Redis)
                                                   ↓
                                           Return recommendation
```

### 2.4 Integration Points

**With Existing Free Platform**:
1. **User Authentication**: Shared authentication service (JWT tokens)
2. **Protocol Data**: Read from free platform DB (protocols, TVL, chains)
3. **Price Data**: Use existing Price API (real-time prices, historical)
4. **Frontend**: Premium UI components in existing Next.js app

**With External Services**:
1. **Blockchain RPCs**: Alchemy, Infura, QuickNode (100+ chains)
2. **Price APIs**: CoinGecko, CoinMarketCap (backup)
3. **Tax APIs**: TaxBit, CoinTracker (optional integration)
4. **Security APIs**: GoPlus, Forta, Certik (contract scanning)
5. **Payment**: Stripe (subscription billing)
6. **Email**: SendGrid (transactional emails)
7. **Monitoring**: Datadog, CloudWatch (metrics, logs, traces)

---



## 3. **CORE COMPONENTS**

### 3.1 EPIC-1: Alerts Service

**Purpose**: Real-time alerts for whale movements, price changes, gas fees, protocol risks

**Components**:
- **Alert Rule Engine**: Match events against user-defined rules
- **Event Processor**: Process blockchain events from SQS
- **Notification Dispatcher**: Send alerts via email/webhook/push
- **Alert History Manager**: Store and query alert history

**Technology Stack**:
```typescript
// Alert Rule Engine
interface AlertRule {
  id: string;
  userId: string;
  type: 'whale' | 'price' | 'gas' | 'protocol_risk';
  conditions: AlertCondition[];
  actions: AlertAction[];
  enabled: boolean;
}

interface AlertCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number | string;
}

interface AlertAction {
  type: 'email' | 'webhook' | 'push';
  destination: string;
  template: string;
}

class AlertRuleEngine {
  async evaluateRule(rule: AlertRule, event: BlockchainEvent): Promise<boolean> {
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, event)) {
        return false;
      }
    }
    return true;
  }
}
```

**Scalability Requirements**:
- Support 1M+ alert checks per minute
- Process 100K+ blockchain events per minute
- Send 10K+ notifications per minute
- <1s latency from event to notification

**Database Schema**:
```sql
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id),
  user_id UUID NOT NULL REFERENCES users(id),
  event_data JSONB NOT NULL,
  triggered_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 EPIC-2: Tax Service

**Purpose**: Tax calculation, report generation, multi-jurisdiction support

**Components**:
- **Transaction Aggregator**: Collect all transactions across chains
- **Cost Basis Calculator**: Calculate cost basis using FIFO/LIFO/HIFO
- **P&L Calculator**: Calculate realized/unrealized gains/losses
- **Report Generator**: Generate IRS Form 8949, Schedule D, CSV exports

**Technology Stack**:
```typescript
class TaxCalculator {
  async calculateTaxes(
    userId: string,
    year: number,
    method: 'FIFO' | 'LIFO' | 'HIFO'
  ): Promise<TaxReport> {
    const transactions = await this.fetchTransactions(userId, year);
    const withCostBasis = await this.calculateCostBasis(transactions, method);
    const withGainLoss = await this.calculateGainLoss(withCostBasis);
    const summary = this.aggregateGainLoss(withGainLoss);
    return this.generateReport(summary, year);
  }
}
```

**Database Schema**:
```sql
CREATE TABLE tax_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  chain VARCHAR(50) NOT NULL,
  tx_hash VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  type VARCHAR(50) NOT NULL,
  asset VARCHAR(100) NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  cost_basis NUMERIC,
  gain_loss NUMERIC
);

CREATE TABLE tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  year INTEGER NOT NULL,
  method VARCHAR(20) NOT NULL,
  total_gain_loss NUMERIC NOT NULL,
  report_url TEXT,
  generated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 EPIC-3: Portfolio Service

**Purpose**: Multi-chain portfolio tracking, performance analytics

**Components**:
- **Portfolio Aggregator**: Aggregate balances across chains
- **Performance Calculator**: Calculate P&L, ROI, APY
- **Asset Allocator**: Track asset allocation by category/chain

**Database Schema** (TimescaleDB):
```sql
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  timestamp TIMESTAMP NOT NULL,
  total_value NUMERIC NOT NULL,
  chain_breakdown JSONB NOT NULL,
  asset_breakdown JSONB NOT NULL
);

SELECT create_hypertable('portfolio_snapshots', 'timestamp');
```

### 3.4 EPIC-4: Gas & Trading Service

**Purpose**: Gas optimization, DEX aggregation, order routing, yield farming, bridging, copy trading

**Components**:
- **Gas Predictor**: ML model for gas price prediction (LSTM, 75-80% accuracy)
- **Gas Optimizer**: Batching and timing optimization for gas savings
- **DEX Aggregator**: Find best trade routes across 100+ DEXs
- **Slippage Calculator**: Calculate and protect against slippage
- **MEV Protector**: Protect against MEV attacks (Flashbots integration)
- **Limit Order Engine**: Advanced limit order functionality
- **Transaction Simulator**: Simulate trades before execution (95%+ accuracy)
- **Yield Aggregator**: Compare yields across 1,000+ pools
- **Bridge Aggregator**: Compare and execute cross-chain bridges (20+ bridges)
- **Copy Trading Engine**: Follow and copy top traders

### 3.5 EPIC-5: Security Service

**Purpose**: Transaction scanning, contract analysis, risk scoring

**Components**:
- **Transaction Scanner**: Scan transactions for risks
- **Contract Analyzer**: Analyze smart contract security
- **Risk Scorer**: Calculate risk scores for addresses/contracts

### 3.6 EPIC-6: Analytics Service

**Purpose**: AI predictions, custom dashboards, advanced analytics

**Components**:
- **Prediction Engine**: ML models for price/TVL predictions
- **Dashboard Builder**: Custom dashboard creation
- **Analytics Processor**: Advanced analytics calculations

---


## 4. **TECHNOLOGY STACK**

### 4.1 Technology Stack Table

| Category | Technology | Version | Purpose | Justification |
|----------|-----------|---------|---------|---------------|
| **Frontend** |
| Framework | Next.js | 15.5.0 | React framework | Existing stack, SSR, API routes |
| Language | TypeScript | 5.3+ | Type safety | Existing stack, better DX |
| Styling | Tailwind CSS | 3.4+ | Utility-first CSS | Existing stack, fast development |
| State Management | React Query | 5.0+ | Server state | Existing stack, caching |
| Charts | ECharts | 6.0.0 | Data visualization | Existing stack, powerful |
| Forms | React Hook Form | 7.50+ | Form management | Validation, performance |
| **Backend** |
| Runtime | Node.js | 20 LTS | JavaScript runtime | Existing stack, AWS Lambda support |
| Language | TypeScript | 5.3+ | Type safety | Existing stack, better DX |
| Framework | NestJS | 10.3+ | Backend framework | Modular, scalable, TypeScript-first |
| API | Express | 4.18+ | HTTP server | Existing stack, middleware support |
| WebSocket | ws | 8.16+ | Real-time | Existing stack, AWS API Gateway v2 |
| **Database** |
| Primary (Free) | PostgreSQL | 16+ | Relational DB | Existing stack, ACID, JSON support |
| Primary (Premium) | PostgreSQL | 16+ | Relational DB | Isolation, independent scaling |
| Time-Series | TimescaleDB | 2.14+ | Time-series data | Portfolio snapshots, price history |
| Cache | Redis | 7+ | In-memory cache | Existing stack, ElastiCache |
| NoSQL | DynamoDB | N/A | WebSocket connections | Existing stack, serverless |
| **Infrastructure** |
| Cloud Provider | AWS | N/A | Cloud infrastructure | Existing stack, serverless |
| Compute | Lambda | N/A | Serverless functions | Existing stack, auto-scaling |
| Compute | ECS Fargate | N/A | Container orchestration | Long-running services |
| API Gateway | API Gateway v2 | N/A | REST + WebSocket | Existing stack, managed |
| CDN | CloudFront | N/A | Content delivery | Existing stack, edge caching |
| Storage | S3 | N/A | Object storage | Tax reports, backups |
| Queue | SQS | N/A | Message queue | Async processing |
| Pub/Sub | SNS | N/A | Notifications | Event broadcasting |
| **Monitoring** |
| APM | Datadog | N/A | Application monitoring | Existing stack, metrics, traces |
| Logs | CloudWatch Logs | N/A | Log aggregation | Existing stack, AWS native |
| Alerts | CloudWatch Alarms | N/A | Alerting | Existing stack, AWS native |
| **Security** |
| Authentication | JWT | N/A | Token-based auth | Existing stack, stateless |
| Encryption | AWS KMS | N/A | Key management | Existing stack, managed |
| Secrets | AWS Secrets Manager | N/A | Secret storage | Existing stack, rotation |
| **External APIs** |
| Blockchain RPCs | Alchemy, Infura | N/A | Blockchain data | Multi-chain support |
| Price Data | CoinGecko API | v3 | Price feeds | Existing integration |
| Security | GoPlus API | v1 | Contract scanning | Security checks |
| Payment | Stripe API | 2024-10-28 | Subscription billing | Industry standard |
| Email | SendGrid API | v3 | Transactional emails | Reliable delivery |
| **Development** |
| Package Manager | pnpm | 9+ | Dependency management | Fast, efficient |
| Linter | ESLint | 8+ | Code quality | Existing stack |
| Formatter | Prettier | 3+ | Code formatting | Existing stack |
| Testing | Jest | 29+ | Unit testing | Existing stack |
| E2E Testing | Playwright | 1.40+ | End-to-end testing | Browser automation |
| **CI/CD** |
| Version Control | Git | 2.40+ | Source control | Industry standard |
| CI/CD | GitHub Actions | N/A | Automation | Existing stack |
| Deployment | AWS CDK | 2.100+ | Infrastructure as code | TypeScript-based |

### 4.2 Technology Decisions

**Frontend: Next.js 15.5.0**
- **Reason**: Existing stack, SSR for SEO, API routes for BFF pattern
- **Alternatives Considered**: Remix, SvelteKit
- **Decision**: Keep existing stack for consistency

**Backend: NestJS 10.3+**
- **Reason**: Modular architecture, TypeScript-first, dependency injection
- **Alternatives Considered**: Express only, Fastify
- **Decision**: NestJS for better structure and scalability

**Database: Hybrid Strategy**
- **Free Platform DB**: Existing PostgreSQL (protocols, TVL, prices)
- **Premium DB**: New PostgreSQL (users, alerts, tax, portfolio)
- **Time-Series DB**: TimescaleDB (portfolio snapshots, price history)
- **Reason**: Isolation, performance, independent scaling
- **Cost**: ~$450-600/month (vs $10K+ for single large instance)

**Infrastructure: AWS Serverless**
- **Reason**: Existing stack, auto-scaling, pay-per-use, no server management
- **Alternatives Considered**: Kubernetes (EKS), Traditional VMs (EC2)
- **Decision**: Keep serverless for cost efficiency and scalability

**Monitoring: Datadog**
- **Reason**: Existing stack, comprehensive APM, metrics, logs, traces
- **Alternatives Considered**: New Relic, Grafana + Prometheus
- **Decision**: Keep Datadog for consistency

---


## 5. **DATA ARCHITECTURE**

### 5.1 Database Strategy

**Hybrid Multi-Database Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│              FREE PLATFORM DATABASE (Existing)              │
│  PostgreSQL RDS (db.r6g.xlarge)                             │
├─────────────────────────────────────────────────────────────┤
│  - protocols (3000+ protocols)                              │
│  - protocol_tvl (time-series TVL data)                      │
│  - price_data (real-time prices, 100+ chains)               │
│  - chains (100+ chain metadata)                             │
│  - users (3M+ free users)                                   │
│  - api_keys (API access)                                    │
├─────────────────────────────────────────────────────────────┤
│  Read-heavy workload                                        │
│  ~1,000-5,000 QPS                                           │
│  ~500GB-1TB storage                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│             PREMIUM DATABASE (New)                          │
│  PostgreSQL RDS (db.r6g.xlarge)                             │
├─────────────────────────────────────────────────────────────┤
│  - premium_users (125K premium users)                       │
│  - subscriptions (billing, tiers)                           │
│  - alert_rules (1.25M rules)                                │
│  - alert_history (12.5M alerts/month)                       │
│  - tax_transactions (125M transactions)                     │
│  - tax_reports (1.25M reports/year)                         │
│  - security_scans (1M scans/day)                            │
│  - risk_scores (2M scores/day)                              │
├─────────────────────────────────────────────────────────────┤
│  Write-heavy workload                                       │
│  ~3,000-5,000 QPS                                           │
│  ~2-3TB storage                                             │
│  Cost: ~$300-400/month                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           TIME-SERIES DATABASE (New)                        │
│  TimescaleDB (PostgreSQL extension)                         │
│  RDS (db.r6g.large)                                         │
├─────────────────────────────────────────────────────────────┤
│  - portfolio_snapshots (3M snapshots/day)                   │
│  - price_history (historical prices)                        │
│  - gas_predictions (1M predictions/day)                     │
│  - performance_metrics (P&L, ROI tracking)                  │
├─────────────────────────────────────────────────────────────┤
│  Time-series optimized                                      │
│  Automatic data retention (90 days)                         │
│  Compression (10:1 ratio)                                   │
│  Cost: ~$150-200/month                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                REDIS CACHE (Existing)                       │
│  ElastiCache Redis (cache.r6g.xlarge)                       │
├─────────────────────────────────────────────────────────────┤
│  - Hot data caching (prices, alerts, portfolios)            │
│  - Session management                                       │
│  - Rate limiting                                            │
│  - Pub/Sub messaging                                        │
├─────────────────────────────────────────────────────────────┤
│  Reduce DB load by 80-90%                                   │
│  <10ms latency                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Database Schema Design

**Premium Database Tables**:

```sql
-- Users & Subscriptions
CREATE TABLE premium_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  wallet_address VARCHAR(255),
  tier VARCHAR(20) NOT NULL, -- 'starter', 'pro', 'enterprise'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'active', 'canceled', 'past_due'
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Alerts (EPIC-1)
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'whale', 'price', 'gas', 'protocol_risk'
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_user_id ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_type ON alert_rules(type);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);

-- Tax (EPIC-2)
CREATE TABLE tax_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  chain VARCHAR(50) NOT NULL,
  tx_hash VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'buy', 'sell', 'swap', 'transfer'
  asset VARCHAR(100) NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  cost_basis NUMERIC,
  gain_loss NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tax_transactions_user_id ON tax_transactions(user_id);
CREATE INDEX idx_tax_transactions_timestamp ON tax_transactions(timestamp);

-- Security (EPIC-5)
CREATE TABLE security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  scan_type VARCHAR(50) NOT NULL, -- 'transaction', 'contract', 'address'
  target VARCHAR(255) NOT NULL,
  risk_score INTEGER NOT NULL, -- 0-100
  findings JSONB NOT NULL,
  scanned_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_security_scans_user_id ON security_scans(user_id);
CREATE INDEX idx_security_scans_risk_score ON security_scans(risk_score);
```

**Time-Series Database Tables** (TimescaleDB):

```sql
-- Portfolio Snapshots (EPIC-3)
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  total_value NUMERIC NOT NULL,
  chain_breakdown JSONB NOT NULL,
  asset_breakdown JSONB NOT NULL,
  category_breakdown JSONB NOT NULL
);

-- Convert to hypertable (TimescaleDB)
SELECT create_hypertable('portfolio_snapshots', 'timestamp');

-- Retention policy (keep 90 days)
SELECT add_retention_policy('portfolio_snapshots', INTERVAL '90 days');

-- Compression policy (compress data older than 7 days)
ALTER TABLE portfolio_snapshots SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'user_id'
);

SELECT add_compression_policy('portfolio_snapshots', INTERVAL '7 days');

-- Gas Predictions (EPIC-4)
CREATE TABLE gas_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  current_gas_price NUMERIC NOT NULL,
  predicted_gas_price NUMERIC NOT NULL,
  optimal_time TIMESTAMP NOT NULL,
  confidence NUMERIC NOT NULL -- 0-1
);

SELECT create_hypertable('gas_predictions', 'timestamp');
SELECT add_retention_policy('gas_predictions', INTERVAL '30 days');
```

**Premium Database Tables (Additional)**:

```sql
-- Gas & Trading (EPIC-4)
CREATE TABLE trade_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  chain VARCHAR(50) NOT NULL,
  token_in VARCHAR(100) NOT NULL,
  token_out VARCHAR(100) NOT NULL,
  amount_in NUMERIC NOT NULL,
  amount_out NUMERIC NOT NULL,
  route JSONB NOT NULL,
  gas_estimate NUMERIC NOT NULL,
  slippage NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trade_routes_user_id ON trade_routes(user_id);
CREATE INDEX idx_trade_routes_chain ON trade_routes(chain);

-- Yield Farming (EPIC-4, F-016)
CREATE TABLE yield_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain VARCHAR(50) NOT NULL,
  protocol VARCHAR(100) NOT NULL,
  pool_address VARCHAR(100) NOT NULL,
  apy NUMERIC NOT NULL,
  tvl NUMERIC NOT NULL,
  fees NUMERIC NOT NULL,
  il_risk NUMERIC NOT NULL,
  risk_score NUMERIC NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_yield_pools_chain ON yield_pools(chain);
CREATE INDEX idx_yield_pools_apy ON yield_pools(apy DESC);

-- Cross-Chain Bridges (EPIC-4, F-017)
CREATE TABLE bridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  source_chain VARCHAR(50) NOT NULL,
  dest_chain VARCHAR(50) NOT NULL,
  fee NUMERIC NOT NULL,
  estimated_time INTEGER NOT NULL, -- seconds
  security_rating NUMERIC NOT NULL,
  tvl NUMERIC NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bridges_chains ON bridges(source_chain, dest_chain);

CREATE TABLE bridge_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  bridge_id UUID NOT NULL REFERENCES bridges(id),
  source_chain VARCHAR(50) NOT NULL,
  dest_chain VARCHAR(50) NOT NULL,
  asset VARCHAR(100) NOT NULL,
  amount NUMERIC NOT NULL,
  fee NUMERIC NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, completed, failed
  tx_hash VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_bridge_transactions_user_id ON bridge_transactions(user_id);
CREATE INDEX idx_bridge_transactions_status ON bridge_transactions(status);

-- Copy Trading (EPIC-4, F-018)
CREATE TABLE traders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(100) NOT NULL UNIQUE,
  username VARCHAR(100),
  bio TEXT,
  strategy VARCHAR(100),
  chains VARCHAR(200),
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_traders_address ON traders(address);

CREATE TABLE trader_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id UUID NOT NULL REFERENCES traders(id),
  timestamp TIMESTAMP NOT NULL,
  total_pnl NUMERIC NOT NULL,
  roi NUMERIC NOT NULL,
  sharpe_ratio NUMERIC NOT NULL,
  win_rate NUMERIC NOT NULL,
  max_drawdown NUMERIC NOT NULL,
  volatility NUMERIC NOT NULL,
  trades_count INTEGER NOT NULL
);

SELECT create_hypertable('trader_performance', 'timestamp');
CREATE INDEX idx_trader_performance_trader_id ON trader_performance(trader_id);

CREATE TABLE copy_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  trader_id UUID NOT NULL REFERENCES traders(id),
  copy_ratio NUMERIC NOT NULL, -- 0.1-1.0
  max_position_size NUMERIC NOT NULL,
  stop_loss NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_copy_trades_user_id ON copy_trades(user_id);
CREATE INDEX idx_copy_trades_trader_id ON copy_trades(trader_id);

-- Limit Orders (EPIC-4, F-015c)
CREATE TABLE limit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  chain VARCHAR(50) NOT NULL,
  token_in VARCHAR(100) NOT NULL,
  token_out VARCHAR(100) NOT NULL,
  amount_in NUMERIC NOT NULL,
  target_price NUMERIC NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, executed, cancelled, expired
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_limit_orders_user_id ON limit_orders(user_id);
CREATE INDEX idx_limit_orders_status ON limit_orders(status);

-- MEV Protection (EPIC-4, F-015b)
CREATE TABLE mev_protection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  chain VARCHAR(50) NOT NULL,
  tx_hash VARCHAR(100) NOT NULL,
  mev_service VARCHAR(50) NOT NULL, -- flashbots, eden, mev_blocker
  protected BOOLEAN NOT NULL,
  savings NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mev_protection_logs_user_id ON mev_protection_logs(user_id);
CREATE INDEX idx_mev_protection_logs_tx_hash ON mev_protection_logs(tx_hash);

-- Security & Risk (EPIC-5)
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(255) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  risk_score INTEGER NOT NULL, -- 0-100
  risk_factors JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_risk_scores_address ON risk_scores(address);
CREATE INDEX idx_risk_scores_risk_score ON risk_scores(risk_score);

-- Analytics & AI (EPIC-6)
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout JSONB NOT NULL,
  widgets JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dashboards_user_id ON dashboards(user_id);

CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset VARCHAR(100) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  prediction_type VARCHAR(50) NOT NULL, -- 'price', 'tvl', 'volume'
  current_value NUMERIC NOT NULL,
  predicted_value NUMERIC NOT NULL,
  confidence NUMERIC NOT NULL, -- 0-1
  prediction_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_predictions_asset ON predictions(asset);
CREATE INDEX idx_predictions_prediction_date ON predictions(prediction_date);

-- Portfolio Assets (EPIC-3)
CREATE TABLE portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES premium_users(id),
  chain VARCHAR(50) NOT NULL,
  asset VARCHAR(100) NOT NULL,
  balance NUMERIC NOT NULL,
  value_usd NUMERIC NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_portfolio_assets_user_id ON portfolio_assets(user_id);
CREATE INDEX idx_portfolio_assets_chain ON portfolio_assets(chain);
```

### 5.3 Data Sharing Strategy

**Cross-Database Data Access**:

1. **User Authentication**: Shared via JWT tokens (no cross-DB queries)
2. **Protocol/Price Data**: Premium services read from Free DB via API or read replica
3. **Premium Data**: Isolated in Premium DB (no access from Free platform)

**Read Replica Strategy**:
```
Free DB (Primary) → Read Replica → Premium Services (read-only)
```

**Benefits**:
- No impact on Free DB write performance
- Premium services get fresh data (<1s lag)
- Cost-effective (~$200/month for read replica)

---


## 6. **API ARCHITECTURE**

### 6.1 API Design Principles

1. **RESTful**: Follow REST principles for CRUD operations
2. **Versioned**: API versioning (v1, v2) for backward compatibility
3. **Consistent**: Consistent response format across all endpoints
4. **Documented**: OpenAPI/Swagger documentation
5. **Secure**: Authentication, authorization, rate limiting

### 6.2 API Endpoints

**Alerts Service (EPIC-1)**:
```
POST   /v1/alerts/rules                    # Create alert rule
GET    /v1/alerts/rules                    # List alert rules
GET    /v1/alerts/rules/:id                # Get alert rule
PUT    /v1/alerts/rules/:id                # Update alert rule
DELETE /v1/alerts/rules/:id                # Delete alert rule
GET    /v1/alerts/history                  # Get alert history
WS     /v1/alerts/stream                   # Real-time alerts (WebSocket)
```

**Tax Service (EPIC-2)**:
```
POST   /v1/tax/reports                     # Generate tax report
GET    /v1/tax/reports                     # List tax reports
GET    /v1/tax/reports/:id                 # Get tax report
GET    /v1/tax/transactions                # Get tax transactions
POST   /v1/tax/transactions/import         # Import transactions
GET    /v1/tax/summary/:year               # Get tax summary
```

**Portfolio Service (EPIC-3)**:
```
GET    /v1/portfolio                       # Get portfolio overview
GET    /v1/portfolio/assets                # Get asset breakdown
GET    /v1/portfolio/chains                # Get chain breakdown
GET    /v1/portfolio/performance           # Get performance metrics
GET    /v1/portfolio/history               # Get historical snapshots
WS     /v1/portfolio/stream                # Real-time updates (WebSocket)
```

**Gas & Trading Service (EPIC-4)**:
```
# Gas Optimization
GET    /v1/gas/estimate                    # Get gas estimate
GET    /v1/gas/predictions                 # Get gas predictions
GET    /v1/gas/optimization                # Get gas optimization recommendations

# Trading
POST   /v1/trading/routes                  # Get trade routes
POST   /v1/trading/simulate                # Simulate trade
GET    /v1/trading/slippage                # Get slippage estimate
POST   /v1/trading/limit-order             # Create limit order
GET    /v1/trading/limit-orders            # Get limit orders
POST   /v1/trading/mev-protect             # Enable MEV protection

# Yield Farming
GET    /v1/yield/pools                     # Get yield pools
GET    /v1/yield/recommendations           # Get yield recommendations
GET    /v1/yield/calculate                 # Calculate real yield

# Cross-Chain Bridges
GET    /v1/bridges/compare                 # Compare bridge options
POST   /v1/bridges/execute                 # Execute bridge transaction
GET    /v1/bridges/history                 # Get bridge history

# Copy Trading
GET    /v1/copy-trading/leaderboard        # Get trader leaderboard
GET    /v1/copy-trading/trader/:id         # Get trader details
POST   /v1/copy-trading/follow             # Follow trader
POST   /v1/copy-trading/unfollow           # Unfollow trader
GET    /v1/copy-trading/following          # Get followed traders
```

**Security Service (EPIC-5)**:
```
POST   /v1/security/scan/transaction       # Scan transaction
POST   /v1/security/scan/contract          # Scan contract
POST   /v1/security/scan/address           # Scan address
GET    /v1/security/scans                  # Get scan history
GET    /v1/security/risk-score/:address    # Get risk score
```

**Analytics Service (EPIC-6)**:
```
GET    /v1/analytics/predictions           # Get AI predictions
POST   /v1/analytics/dashboards            # Create dashboard
GET    /v1/analytics/dashboards            # List dashboards
GET    /v1/analytics/dashboards/:id        # Get dashboard
```

**Subscription Service**:
```
POST   /v1/subscriptions                   # Create subscription
GET    /v1/subscriptions                   # Get subscription
PUT    /v1/subscriptions                   # Update subscription
DELETE /v1/subscriptions                   # Cancel subscription
POST   /v1/subscriptions/webhooks          # Stripe webhooks
```

### 6.3 API Response Format

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-10-17T10:00:00Z",
    "requestId": "req_123456"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid alert rule conditions",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-10-17T10:00:00Z",
    "requestId": "req_123456"
  }
}
```

### 6.4 WebSocket Protocol

**Connection**:
```typescript
// Client connects
ws://api.defillama.com/v1/alerts/stream?token=<JWT>

// Server sends connection confirmation
{
  "type": "connected",
  "connectionId": "conn_123456"
}
```

**Subscribe to Alerts**:
```typescript
// Client subscribes
{
  "type": "subscribe",
  "channel": "alerts",
  "userId": "user_123"
}

// Server sends alerts
{
  "type": "alert",
  "data": {
    "alertId": "alert_123",
    "ruleId": "rule_456",
    "message": "Whale alert: 1000 ETH transferred",
    "timestamp": "2025-10-17T10:00:00Z"
  }
}
```

---

## 7. **SECURITY ARCHITECTURE**

### 7.1 Authentication & Authorization

**Authentication**: JWT-based token authentication
```typescript
// JWT Token Structure
{
  "sub": "user_123",
  "email": "user@example.com",
  "tier": "pro",
  "iat": 1697529600,
  "exp": 1697616000
}
```

**Authorization**: Role-based access control (RBAC)
- **Free User**: Access to free features only
- **Starter**: Access to basic premium features (alerts, portfolio)
- **Pro**: Access to all premium features (+ tax, gas, security)
- **Enterprise**: Access to all features + API access

### 7.2 Data Security

**Encryption at Rest**:
- RDS: AWS KMS encryption
- S3: Server-side encryption (SSE-S3)
- ElastiCache: Encryption at rest

**Encryption in Transit**:
- TLS 1.3 for all API endpoints
- WSS (WebSocket Secure) for real-time connections

**Row-Level Security (RLS)**:
```sql
-- Enable RLS on premium tables
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY alert_rules_user_policy ON alert_rules
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::UUID);
```

### 7.3 API Security

**Rate Limiting**:
- Free users: 100 requests/minute
- Starter: 1,000 requests/minute
- Pro: 10,000 requests/minute
- Enterprise: 100,000 requests/minute

**Input Validation**:
- Schema validation using Joi/Zod
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)

**CORS Policy**:
```typescript
{
  origin: ['https://defillama.com', 'https://app.defillama.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}
```

### 7.4 Compliance

**SOC 2 Type II**:
- Access controls
- Encryption
- Audit logging
- Incident response

**GDPR**:
- Data minimization
- Right to erasure
- Data portability
- Consent management

---


## 8. **INFRASTRUCTURE ARCHITECTURE**

### 8.1 AWS Services

**Compute**:
- **Lambda**: Serverless functions for API endpoints, event processing
- **ECS Fargate**: Long-running services (WebSocket connections, background jobs)

**Database**:
- **RDS PostgreSQL**: Free platform DB (existing)
- **RDS PostgreSQL**: Premium DB (new)
- **RDS PostgreSQL + TimescaleDB**: Time-series DB (new)
- **ElastiCache Redis**: Caching layer (existing)
- **DynamoDB**: WebSocket connection state (existing)

**Storage**:
- **S3**: Tax reports, backups, data lake

**Networking**:
- **API Gateway v2**: REST + WebSocket APIs
- **CloudFront**: CDN for static assets
- **VPC**: Network isolation

**Messaging**:
- **SQS**: Async job queues
- **SNS**: Event notifications

**Monitoring**:
- **CloudWatch**: Logs, metrics, alarms
- **Datadog**: APM, distributed tracing

**Security**:
- **KMS**: Encryption key management
- **Secrets Manager**: Secret storage
- **IAM**: Access control

### 8.2 Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFRONT CDN                           │
│  - Static assets (JS, CSS, images)                          │
│  - Edge caching                                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  API GATEWAY v2                             │
│  - REST API (HTTP)                                          │
│  - WebSocket API (WSS)                                      │
│  - Rate limiting, authentication                            │
└─────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
┌──────────────────┐           ┌──────────────────┐
│  LAMBDA          │           │  ECS FARGATE     │
│  - API handlers  │           │  - WebSocket mgr │
│  - Event proc    │           │  - Background    │
└──────────────────┘           └──────────────────┘
         │                               │
         └───────────────┬───────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    VPC (Private Subnet)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ RDS (Free)  │  │ RDS (Prem)  │  │ TimescaleDB │        │
│  │ PostgreSQL  │  │ PostgreSQL  │  │ PostgreSQL  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐                         │
│  │ ElastiCache │  │  DynamoDB   │                         │
│  │   Redis     │  │             │                         │
│  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    SQS + SNS                                │
│  - Event queues                                             │
│  - Notifications                                            │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Deployment Strategy

**Blue-Green Deployment**:
- Deploy new version to "green" environment
- Run smoke tests
- Switch traffic from "blue" to "green"
- Keep "blue" for rollback

**Canary Deployment** (for high-risk changes):
- Deploy to 5% of traffic
- Monitor metrics for 1 hour
- Gradually increase to 100%

### 8.4 Infrastructure Cost Breakdown

**Monthly Cost Estimate** (125K premium users, 50K req/min):

| Service | Configuration | Monthly Cost | Notes |
|---------|--------------|--------------|-------|
| **Compute** | | | |
| Lambda | 50M requests/month, 512MB, 3s avg | $150-200 | API endpoints, event processing |
| ECS Fargate | 4 tasks × 2 vCPU × 4GB × 24/7 | $300-400 | WebSocket, background jobs |
| **Database** | | | |
| RDS Premium DB | db.r6g.xlarge (4 vCPU, 32GB) | $300-400 | Premium user data, alerts, tax |
| RDS TimescaleDB | db.r6g.large (2 vCPU, 16GB) | $150-200 | Portfolio snapshots, time-series |
| ElastiCache Redis | cache.r6g.large (2 vCPU, 13GB) | $150-200 | Caching, sessions, rate limits |
| DynamoDB | 10M reads, 5M writes/month | $50-100 | WebSocket connection state |
| **Storage** | | | |
| S3 | 500GB storage, 1TB transfer | $50-75 | Tax reports, backups |
| **Networking** | | | |
| API Gateway | 50M requests/month | $175-225 | REST + WebSocket APIs |
| CloudFront | 1TB transfer, 10M requests | $85-100 | CDN for static assets |
| Data Transfer | 2TB outbound | $180-200 | Data transfer costs |
| **Monitoring** | | | |
| CloudWatch | Logs, metrics, alarms | $50-75 | Basic monitoring |
| Datadog | APM, distributed tracing | $200-300 | Advanced monitoring (optional) |
| **Security** | | | |
| KMS | 10K requests/month | $5-10 | Encryption key management |
| Secrets Manager | 50 secrets | $20-30 | Secret storage |
| **Total (without Datadog)** | | **$1,665-2,215/month** | ~$20K-27K/year |
| **Total (with Datadog)** | | **$1,865-2,515/month** | ~$22K-30K/year |

**Cost Per User**:
- 125K users → **$13.32-20.12/user/month**
- Target ARPU: $16.67/user/month ($200/year)
- **Gross Margin**: 17-20% (before other costs)

**Cost Optimization Strategies**:
1. **Reserved Instances**: Save 30-40% on RDS, ElastiCache (commit 1-3 years)
2. **Savings Plans**: Save 20-30% on Lambda, Fargate (commit 1-3 years)
3. **S3 Intelligent-Tiering**: Auto-move cold data to cheaper storage
4. **CloudFront Caching**: Reduce origin requests by 80-90%
5. **Lambda Optimization**: Reduce memory, execution time
6. **Database Optimization**: Use read replicas, connection pooling

**Projected Cost Savings** (with optimization):
- Reserved Instances: -$200-300/month
- Savings Plans: -$100-150/month
- S3 Tiering: -$20-30/month
- CloudFront Caching: -$50-75/month
- **Total Savings**: -$370-555/month (-20-25%)

**Optimized Monthly Cost**: **$1,295-1,960/month** (~$15.5K-23.5K/year)
**Optimized Cost Per User**: **$10.36-15.68/user/month**
**Optimized Gross Margin**: 38-42% (before other costs)

---

## 9. **INTEGRATION ARCHITECTURE**

### 9.1 External Integrations

**Blockchain RPCs** (100+ chains):
- **Ethereum**: Infura, Alchemy, QuickNode
- **Polygon**: Polygon RPC, Alchemy
- **Arbitrum**: Arbitrum RPC, Infura
- **Other Chains**: Public RPCs, custom nodes

**DEX APIs**:
- **1inch**: DEX aggregation, trade routing
- **Uniswap**: Liquidity pools, swap quotes
- **Sushiswap**: Liquidity pools, swap quotes

**Security APIs**:
- **CertiK**: Smart contract audits, security scores
- **Immunefi**: Bug bounty platform, vulnerability reports
- **Forta**: Real-time threat detection

**Payment APIs**:
- **Stripe**: Subscription billing, payment processing
- **Coinbase Commerce**: Crypto payments (optional)

**Notification APIs**:
- **SendGrid**: Email notifications
- **Firebase Cloud Messaging**: Push notifications
- **Twilio**: SMS notifications (optional)

**Data APIs**:
- **CoinGecko**: Price data, market cap
- **DeFiLlama**: TVL data, protocol data (existing)
- **Santiment**: On-chain metrics, social sentiment
- **LunarCrush**: Social sentiment, influencer data

### 9.2 Integration Patterns

**API Gateway Pattern**:
```
Premium Services → API Gateway → External APIs
                 ↓
              Rate Limiting
              Authentication
              Caching
```

**Circuit Breaker Pattern**:
- **Closed**: Normal operation
- **Open**: Too many failures, stop calling API
- **Half-Open**: Test if API recovered

**Retry Pattern**:
- **Exponential Backoff**: 1s, 2s, 4s, 8s, 16s
- **Max Retries**: 5 attempts
- **Timeout**: 30s per attempt

---

## 10. **DEPLOYMENT ARCHITECTURE**

### 10.1 Deployment Environments

**Development** (dev):
- **Purpose**: Local development, unit testing
- **Infrastructure**: Docker Compose, LocalStack
- **Database**: PostgreSQL (local), Redis (local)
- **Cost**: $0/month

**Staging** (stg):
- **Purpose**: Integration testing, QA, UAT
- **Infrastructure**: AWS (smaller instances)
- **Database**: RDS (db.t3.medium), ElastiCache (cache.t3.medium)
- **Cost**: ~$200-300/month

**Production** (prod):
- **Purpose**: Live production environment
- **Infrastructure**: AWS (full-scale)
- **Database**: RDS (db.r6g.xlarge), ElastiCache (cache.r6g.large)
- **Cost**: ~$1,295-1,960/month (optimized)

### 10.2 CI/CD Pipeline

**GitHub Actions Workflow**:
```yaml
name: Deploy Premium Services

on:
  push:
    branches: [main]
    paths: ['premium/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Run unit tests
      - Run integration tests
      - Run security scans (Snyk, SonarQube)

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - Build Docker images
      - Push to ECR

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - Deploy to staging (auto)
      - Run smoke tests
      - Deploy to production (manual approval)
```

**Deployment Strategy**:
1. **Commit**: Developer commits code to GitHub
2. **Build**: GitHub Actions builds Docker images
3. **Test**: Run unit tests, integration tests, security scans
4. **Deploy to Staging**: Auto-deploy to staging environment
5. **Smoke Tests**: Run smoke tests on staging
6. **Manual Approval**: Product owner approves production deployment
7. **Deploy to Production**: Blue-green deployment to production
8. **Monitor**: Monitor metrics, logs, errors

---

## 11. **MONITORING & OBSERVABILITY**

### 11.1 Monitoring Stack

**CloudWatch** (AWS native):
- **Logs**: Application logs, Lambda logs, RDS logs
- **Metrics**: CPU, memory, disk, network
- **Alarms**: Threshold-based alerts (email, SNS)

**Datadog** (APM):
- **APM**: Distributed tracing, service maps
- **Logs**: Centralized log aggregation
- **Metrics**: Custom metrics, dashboards
- **Alerts**: Anomaly detection, forecasting

### 11.2 Key Metrics

**Application Metrics**:
- **API Response Time**: p50, p95, p99
- **Error Rate**: 4xx, 5xx errors
- **Throughput**: Requests per second
- **Availability**: Uptime percentage

**Business Metrics**:
- **Active Users**: Daily, weekly, monthly
- **Alert Volume**: Alerts triggered per day
- **Tax Reports**: Reports generated per day
- **Revenue**: MRR, ARR, churn rate

**Infrastructure Metrics**:
- **CPU Utilization**: Lambda, ECS, RDS
- **Memory Utilization**: Lambda, ECS, RDS
- **Database Connections**: Active, idle
- **Cache Hit Ratio**: Redis hit rate

### 11.3 Alerting Strategy

**Critical Alerts** (PagerDuty):
- API error rate >5%
- Database CPU >90%
- Service downtime >5 minutes

**Warning Alerts** (Slack):
- API response time >500ms (p95)
- Database connections >80%
- Cache hit ratio <80%

**Info Alerts** (Email):
- Deployment completed
- Daily metrics summary
- Weekly cost report

---

## 12. **PERFORMANCE & SCALABILITY**

### 12.1 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time | <200ms (p95) | CloudWatch, Datadog |
| Page Load Time | <1s (p95) | Lighthouse, RUM |
| WebSocket Latency | <100ms | Custom metrics |
| Database Query Time | <50ms (p95) | RDS Performance Insights |
| Cache Hit Ratio | >90% | Redis INFO |
| Uptime | 99.9% | CloudWatch, Datadog |

### 12.2 Scalability Strategy

**Horizontal Scaling**:
- **Lambda**: Auto-scales to 1,000+ concurrent executions
- **ECS Fargate**: Auto-scales based on CPU/memory
- **RDS**: Read replicas for read-heavy workloads
- **ElastiCache**: Cluster mode for horizontal scaling

**Vertical Scaling**:
- **RDS**: Upgrade instance size (db.r6g.xlarge → db.r6g.2xlarge)
- **ElastiCache**: Upgrade node size (cache.r6g.xlarge → cache.r6g.2xlarge)

**Caching Strategy**:
- **L1 Cache**: In-memory (Node.js process)
- **L2 Cache**: Redis (5-minute TTL)
- **L3 Cache**: CloudFront (1-hour TTL for static assets)

### 12.3 Load Testing

**Target Load** (Q3 2026):
- 125K premium users
- 10K concurrent users (peak)
- 50K requests/minute (peak)
- 1M+ alert checks/minute

**Load Testing Tools**:
- **k6**: API load testing
- **Artillery**: WebSocket load testing
- **Locust**: Distributed load testing

---

## 13. **ARCHITECTURE DECISION RECORDS (ADRs)**

### ADR-001: Hybrid Database Strategy

**Status**: Accepted
**Date**: 2025-10-17
**Decision**: Use separate databases for free platform, premium features, and time-series data

**Context**:
- Free platform DB handles 3M users, 1,000-5,000 QPS
- Premium features will add 125K users, 3,000-5,000 QPS
- Risk of overloading single database

**Decision**:
- Free Platform DB: Existing PostgreSQL (protocols, TVL, prices)
- Premium DB: New PostgreSQL (users, alerts, tax, portfolio)
- Time-Series DB: TimescaleDB (portfolio snapshots, price history)

**Consequences**:
- **Pros**: Isolation, independent scaling, better performance
- **Cons**: More complexity, cross-database queries
- **Cost**: ~$450-600/month (vs $10K+ for single large instance)

### ADR-002: Serverless-First Architecture

**Status**: Accepted
**Date**: 2025-10-17
**Decision**: Use AWS Lambda for API endpoints and event processing

**Context**:
- Existing DeFiLlama uses serverless architecture
- Variable load (peak during market hours)
- Cost optimization important

**Decision**:
- Lambda for API endpoints (auto-scaling, pay-per-use)
- ECS Fargate for long-running services (WebSocket, background jobs)

**Consequences**:
- **Pros**: Auto-scaling, cost-effective, no server management
- **Cons**: Cold starts, vendor lock-in
- **Mitigation**: Provisioned concurrency for critical endpoints

### ADR-003: NestJS for Backend Framework

**Status**: Accepted
**Date**: 2025-10-17
**Decision**: Use NestJS as the backend framework for premium services

**Context**:
- Need modular, scalable architecture
- TypeScript-first approach
- Dependency injection for testability

**Decision**:
- NestJS 10.3+ for all premium services
- Modular architecture (1 module per EPIC)

**Consequences**:
- **Pros**: Better structure, testability, scalability
- **Cons**: Learning curve, more boilerplate
- **Mitigation**: Training, code templates

### ADR-004: TimescaleDB for Time-Series Data

**Status**: Accepted
**Date**: 2025-10-17
**Decision**: Use TimescaleDB for portfolio snapshots and price history

**Context**:
- Portfolio snapshots: 3M/day (125K users × 24 snapshots/day)
- Need efficient time-series storage and queries
- PostgreSQL compatibility important

**Decision**:
- TimescaleDB (PostgreSQL extension) for time-series data
- Automatic compression (10:1 ratio)
- Retention policies (90 days)

**Consequences**:
- **Pros**: Efficient storage, fast queries, PostgreSQL compatibility
- **Cons**: Additional database to manage
- **Cost**: ~$150-200/month

---


## 14. **SOURCE TREE STRUCTURE**

### 14.1 Proposed Source Tree

```
defillama-server/
├── defi/                           # Existing free platform services
│   ├── src/
│   │   ├── api2/                   # Existing REST API
│   │   ├── analytics/              # Existing analytics (from v1.0)
│   │   ├── protocols/              # Protocol adapters
│   │   └── ...
│   ├── package.json
│   └── tsconfig.json
│
├── premium/                        # NEW: Premium services
│   ├── src/
│   │   ├── alerts/                 # EPIC-1: Alerts Service
│   │   │   ├── controllers/
│   │   │   │   ├── alert-rules.controller.ts
│   │   │   │   └── alert-history.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── alert-rule-engine.service.ts
│   │   │   │   ├── event-processor.service.ts
│   │   │   │   └── notification-dispatcher.service.ts
│   │   │   ├── models/
│   │   │   │   ├── alert-rule.model.ts
│   │   │   │   └── alert-history.model.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-alert-rule.dto.ts
│   │   │   │   └── update-alert-rule.dto.ts
│   │   │   ├── alerts.module.ts
│   │   │   └── alerts.spec.ts
│   │   │
│   │   ├── tax/                    # EPIC-2: Tax Service
│   │   │   ├── controllers/
│   │   │   │   ├── tax-reports.controller.ts
│   │   │   │   └── tax-transactions.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── tax-calculator.service.ts
│   │   │   │   ├── cost-basis-calculator.service.ts
│   │   │   │   ├── report-generator.service.ts
│   │   │   │   └── transaction-aggregator.service.ts
│   │   │   ├── models/
│   │   │   │   ├── tax-transaction.model.ts
│   │   │   │   └── tax-report.model.ts
│   │   │   ├── dto/
│   │   │   ├── tax.module.ts
│   │   │   └── tax.spec.ts
│   │   │
│   │   ├── portfolio/              # EPIC-3: Portfolio Service
│   │   │   ├── controllers/
│   │   │   │   ├── portfolio.controller.ts
│   │   │   │   └── performance.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── portfolio-aggregator.service.ts
│   │   │   │   ├── performance-calculator.service.ts
│   │   │   │   └── asset-allocator.service.ts
│   │   │   ├── models/
│   │   │   │   └── portfolio-snapshot.model.ts
│   │   │   ├── dto/
│   │   │   ├── portfolio.module.ts
│   │   │   └── portfolio.spec.ts
│   │   │
│   │   ├── gas-trading/            # EPIC-4: Gas & Trading Service
│   │   │   ├── controllers/
│   │   │   │   ├── gas.controller.ts
│   │   │   │   ├── trading.controller.ts
│   │   │   │   ├── yield.controller.ts
│   │   │   │   ├── bridge.controller.ts
│   │   │   │   └── copy-trading.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── gas-predictor.service.ts
│   │   │   │   ├── gas-optimizer.service.ts
│   │   │   │   ├── dex-aggregator.service.ts
│   │   │   │   ├── slippage-calculator.service.ts
│   │   │   │   ├── mev-protector.service.ts
│   │   │   │   ├── limit-order-engine.service.ts
│   │   │   │   ├── transaction-simulator.service.ts
│   │   │   │   ├── yield-aggregator.service.ts
│   │   │   │   ├── bridge-aggregator.service.ts
│   │   │   │   └── copy-trading-engine.service.ts
│   │   │   ├── models/
│   │   │   │   ├── gas-prediction.model.ts
│   │   │   │   ├── trade-route.model.ts
│   │   │   │   ├── yield-pool.model.ts
│   │   │   │   ├── bridge.model.ts
│   │   │   │   └── trader.model.ts
│   │   │   ├── dto/
│   │   │   ├── gas-trading.module.ts
│   │   │   └── gas-trading.spec.ts
│   │   │
│   │   ├── security/               # EPIC-5: Security Service
│   │   │   ├── controllers/
│   │   │   │   └── security.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── transaction-scanner.service.ts
│   │   │   │   ├── contract-analyzer.service.ts
│   │   │   │   └── risk-scorer.service.ts
│   │   │   ├── models/
│   │   │   │   └── security-scan.model.ts
│   │   │   ├── dto/
│   │   │   ├── security.module.ts
│   │   │   └── security.spec.ts
│   │   │
│   │   ├── analytics/              # EPIC-6: Analytics Service
│   │   │   ├── controllers/
│   │   │   │   ├── predictions.controller.ts
│   │   │   │   └── dashboards.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── prediction-engine.service.ts
│   │   │   │   ├── dashboard-builder.service.ts
│   │   │   │   └── analytics-processor.service.ts
│   │   │   ├── models/
│   │   │   ├── dto/
│   │   │   ├── analytics.module.ts
│   │   │   └── analytics.spec.ts
│   │   │
│   │   ├── subscription/           # Subscription Service
│   │   │   ├── controllers/
│   │   │   │   ├── subscription.controller.ts
│   │   │   │   └── webhook.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── subscription.service.ts
│   │   │   │   ├── billing.service.ts
│   │   │   │   └── stripe.service.ts
│   │   │   ├── models/
│   │   │   │   ├── subscription.model.ts
│   │   │   │   └── payment.model.ts
│   │   │   ├── dto/
│   │   │   ├── subscription.module.ts
│   │   │   └── subscription.spec.ts
│   │   │
│   │   ├── notification/           # Notification Service
│   │   │   ├── services/
│   │   │   │   ├── notification.service.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   ├── webhook.service.ts
│   │   │   │   └── push.service.ts
│   │   │   ├── models/
│   │   │   ├── notification.module.ts
│   │   │   └── notification.spec.ts
│   │   │
│   │   ├── common/                 # Shared utilities
│   │   │   ├── config/
│   │   │   │   ├── database.config.ts
│   │   │   │   ├── redis.config.ts
│   │   │   │   └── aws.config.ts
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── tier.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   └── transform.interceptor.ts
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── decorators/
│   │   │   │   ├── user.decorator.ts
│   │   │   │   └── tier.decorator.ts
│   │   │   ├── utils/
│   │   │   │   ├── logger.util.ts
│   │   │   │   └── crypto.util.ts
│   │   │   └── common.module.ts
│   │   │
│   │   ├── api/                    # Premium API Gateway
│   │   │   ├── main.ts             # Application entry point
│   │   │   ├── app.module.ts       # Root module
│   │   │   └── app.controller.ts   # Health check
│   │   │
│   │   └── websocket/              # WebSocket Gateway
│   │       ├── websocket.gateway.ts
│   │       └── websocket.module.ts
│   │
│   ├── test/                       # E2E tests
│   │   ├── alerts.e2e-spec.ts
│   │   ├── tax.e2e-spec.ts
│   │   ├── portfolio.e2e-spec.ts
│   │   └── ...
│   │
│   ├── migrations/                 # Database migrations
│   │   ├── 001-create-premium-users.sql
│   │   ├── 002-create-alert-tables.sql
│   │   ├── 003-create-tax-tables.sql
│   │   └── ...
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── README.md
│
├── defillama-app/                  # Existing Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── (free)/             # Free platform pages
│   │   │   └── (premium)/          # NEW: Premium pages
│   │   │       ├── alerts/
│   │   │       ├── tax/
│   │   │       ├── portfolio/
│   │   │       ├── gas/
│   │   │       ├── security/
│   │   │       └── analytics/
│   │   ├── components/
│   │   │   ├── (free)/             # Free components
│   │   │   └── (premium)/          # NEW: Premium components
│   │   │       ├── alerts/
│   │   │       ├── tax/
│   │   │       └── ...
│   │   └── lib/
│   │       ├── api/
│   │       │   ├── free-api.ts
│   │       │   └── premium-api.ts  # NEW: Premium API client
│   │       └── hooks/
│   │           └── premium/        # NEW: Premium hooks
│   │               ├── useAlerts.ts
│   │               ├── useTax.ts
│   │               └── ...
│   └── ...
│
├── infrastructure/                 # NEW: Infrastructure as Code
│   ├── cdk/                        # AWS CDK
│   │   ├── lib/
│   │   │   ├── premium-db-stack.ts
│   │   │   ├── timescale-db-stack.ts
│   │   │   ├── lambda-stack.ts
│   │   │   └── ecs-stack.ts
│   │   ├── bin/
│   │   │   └── app.ts
│   │   └── package.json
│   └── terraform/                  # Alternative: Terraform
│       └── ...
│
├── docs/                           # Documentation
│   ├── 1-analysis/
│   ├── 2-plan/
│   │   └── roadmaps/
│   │       └── v2-premium-features/
│   │           ├── product-brief-v2.0.md
│   │           ├── prd-v2.0.md
│   │           └── epic-v2.0.md
│   ├── 3-solutioning/
│   │   ├── technical-architecture-premium-features-v2.md  # THIS FILE
│   │   ├── tech-spec-epic-1-alerts.md                     # TO BE CREATED
│   │   ├── tech-spec-epic-2-tax.md                        # TO BE CREATED
│   │   ├── tech-spec-epic-3-portfolio.md                  # TO BE CREATED
│   │   ├── tech-spec-epic-4-gas-trading.md                # TO BE CREATED
│   │   ├── tech-spec-epic-5-security.md                   # TO BE CREATED
│   │   └── tech-spec-epic-6-analytics.md                  # TO BE CREATED
│   └── 4-implementation/
│
├── .github/
│   └── workflows/
│       ├── premium-ci.yml          # NEW: Premium CI/CD
│       └── premium-deploy.yml      # NEW: Premium deployment
│
├── package.json                    # Root package.json (monorepo)
├── pnpm-workspace.yaml             # pnpm workspace config
└── README.md
```

### 14.2 Key Design Decisions

**Monorepo Structure**:
- Single repository for all services
- Easier code sharing and refactoring
- Atomic commits across services
- Simplified CI/CD

**NestJS Module Structure**:
- One module per EPIC (alerts, tax, portfolio, etc.)
- Clear separation of concerns
- Dependency injection for testability
- Modular, scalable architecture

**Frontend Organization**:
- Premium pages in `(premium)` route group
- Premium components in separate folder
- Premium API client and hooks
- Consistent with existing structure

**Infrastructure as Code**:
- AWS CDK for TypeScript-based IaC
- Separate stacks for each component
- Version controlled infrastructure
- Reproducible deployments

---

## 15. **APPENDICES**

### 15.1 Glossary

- **EPIC**: Large body of work (6 EPICs in v2.0)
- **Story Points**: Fibonacci scale for effort estimation
- **ARR**: Annual Recurring Revenue
- **ARPU**: Average Revenue Per User
- **P&L**: Profit & Loss
- **ROI**: Return on Investment
- **APY**: Annual Percentage Yield
- **TVL**: Total Value Locked
- **DEX**: Decentralized Exchange
- **RPC**: Remote Procedure Call
- **JWT**: JSON Web Token
- **RBAC**: Role-Based Access Control
- **RLS**: Row-Level Security
- **TTL**: Time To Live
- **QPS**: Queries Per Second

### 15.2 References

**Internal Documents**:
- Product Brief v2.0: `docs/2-plan/roadmaps/v2-premium-features/product-brief-v2.0.md`
- PRD v2.0: `docs/2-plan/roadmaps/v2-premium-features/prd-v2.0.md`
- EPIC v2.0: `docs/2-plan/roadmaps/v2-premium-features/epic-v2.0.md`
- On-Chain Services Architecture: `docs/3-solutioning/technical-architecture-on-chain-services.md`

**External References**:
- AWS Well-Architected Framework: https://aws.amazon.com/architecture/well-architected/
- NestJS Documentation: https://docs.nestjs.com/
- TimescaleDB Documentation: https://docs.timescale.com/
- Stripe API Documentation: https://stripe.com/docs/api

### 15.3 Document Statistics

**Document Size**: ~1,500 lines (~60 pages)
**Sections**: 15 sections
**Diagrams**: 5 architecture diagrams
**Code Examples**: 20+ code snippets
**Database Schemas**: 10+ table definitions
**API Endpoints**: 40+ endpoints
**ADRs**: 4 architecture decisions

**Created**: 2025-10-17
**Last Updated**: 2025-10-17
**Version**: 2.0
**Status**: Draft for Review

---

**END OF DOCUMENT**

---

## Next Steps

1. **Review & Approval**: Review this architecture document with stakeholders
2. **Tech Specs**: Create 6 tech spec documents (1 per EPIC)
3. **Database Setup**: Provision Premium DB and TimescaleDB
4. **Infrastructure**: Setup AWS infrastructure (Lambda, ECS, RDS)
5. **Development**: Start implementation (Q4 2025)

**Estimated Timeline**:
- Architecture Review: 1 week
- Tech Specs Creation: 1 week
- Infrastructure Setup: 2 weeks
- Development Start: Week 4

**Total Phase 3 Duration**: 4 weeks

---

