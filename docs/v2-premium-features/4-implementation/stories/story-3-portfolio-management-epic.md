# Story 3: Portfolio Management EPIC

**EPIC ID**: EPIC-3
**Total Story Points**: 110 points
**Priority**: P1 (High)
**Timeline**: Q1 2026 (Months 4-6)
**Revenue Target**: $3.75M ARR (15%)

---

## Overview

Comprehensive portfolio management suite including multi-chain aggregation, real-time tracking, P&L calculation, impermanent loss tracking, liquidity pool alerts, and advanced analytics.

**Business Value**: Core feature for active traders and investors, competitive advantage vs competitors

---

## Feature Mapping

This story file aligns with **User Stories v2.0** while maintaining compatibility with **PRD v2.0**:

| Story Feature | User Stories v2.0 | PRD v2.0 | Points |
|---------------|-------------------|----------|--------|
| Feature 3.1 | Multi-Chain Portfolio Aggregation | F-007: Multi-Wallet Portfolio Tracker | 21 |
| Feature 3.2 | Real-Time Portfolio Tracking | F-007: Multi-Wallet Portfolio Tracker (real-time) | 21 |
| Feature 3.3 | Impermanent Loss Calculator | F-009: Impermanent Loss Tracker | 21 |
| Feature 3.4 | Portfolio Rebalancing Suggestions | F-011: Portfolio Analytics (optimization) | 21 |
| Feature 3.5 | Portfolio Comparison | F-011: Portfolio Analytics (comparison) | 21 |
| Feature 3.6 | Portfolio Export | F-012: Portfolio Alerts (export) | 5 |

**Note**: PRD v2.0 also includes F-008 (P&L Calculator) and F-010 (Liquidity Pool Alerts) which are covered in Features 3.5 and 3.4 respectively.

---

## Features Summary (6 features, 110 points)

### Feature 3.1: Multi-Wallet Portfolio Tracker (21 points)

**Also known as**: "Multi-Chain Portfolio Aggregation" in User Stories v2.0

**PRD Reference**: Feature 7 (F-007) - Multi-Wallet Portfolio Tracker

**User Stories** (3 stories):
1. **Connect Wallet Addresses** (5 points)
   - Add up to 20 wallets with labels
   - Checksum validation
   - Support 100+ chains

2. **Fetch Portfolio Balances** (13 points)
   - Parallel fetching from 100+ chains
   - Rate limiting: 100 req/s per chain
   - Update every 1 hour
   - Performance: 10-15 minutes for 125K users
   - Fallback to cached data (Redis)

3. **Display Portfolio Dashboard** (3 points)
   - Total portfolio value (USD)
   - Breakdown by chain, asset, category
   - React + ECharts visualization

**Technical**:
- Service: PortfolioAggregator (ECS Fargate)
- Database: portfolio_snapshots (PostgreSQL - consistent with existing infrastructure)
- API: `POST /v2/portfolio/wallets`, `GET /v2/portfolio/dashboard`

---

### Feature 3.2: Real-Time Portfolio Tracking (21 points)

**PRD Reference**: Included in Feature 7 (F-007) - Multi-Wallet Portfolio Tracker (real-time valuation)

**User Stories** (4 stories):
1. **Subscribe to Portfolio Updates** (5 points)
   - WebSocket connection: `wss://api.defillama.com/v2/portfolio/ws`
   - JWT authentication
   - 10K concurrent connections
   - 24+ hours stability

2. **Receive Portfolio Updates** (8 points)
   - Real-time updates via WebSocket
   - Payload: total value, change %, top assets
   - <1 minute latency
   - 10K+ updates/minute
   - gzip compression

3. **Display Real-Time Portfolio Chart** (5 points)
   - Portfolio value chart (last 24 hours)
   - Time ranges: 1h, 6h, 24h, 7d, 30d
   - 60 FPS smooth animations
   - ECharts visualization

4. **Portfolio Alerts** (3 points)
   - Set value alert thresholds (% change)
   - Multi-channel notifications (email, push, webhook)
   - Alert includes: current value, change %, time

**Technical**:
- Service: WebSocketGateway (ECS Fargate)
- Frontend: React + ECharts
- Channels: SendGrid, Firebase, Webhooks

---

### Feature 3.3: Impermanent Loss Tracker (21 points)

**Also known as**: "Impermanent Loss Calculator" in User Stories v2.0

**PRD Reference**: Feature 9 (F-009) - Impermanent Loss Tracker

**User Stories** (4 stories):
1. **Add Liquidity Positions** (5 points)
   - Add pool address, chain, entry price, entry date
   - Up to 50 positions
   - Validate pool addresses
   - Fetch current pool data from DEX APIs

2. **Calculate Impermanent Loss** (8 points)
   - Formula: IL = (2 * sqrt(price_ratio) / (1 + price_ratio)) - 1
   - Calculate IL % and IL USD
   - Update every 1 hour
   - Handle multiple token pairs

3. **Display IL Dashboard** (5 points)
   - IL chart (historical IL over time)
   - IL breakdown by position
   - Total IL (USD and %)
   - Export IL report (CSV, PDF)

4. **IL Alerts** (3 points)
   - Set IL threshold alerts
   - Notify when IL exceeds threshold
   - Multi-channel notifications

**Technical**:
- Service: ILCalculatorService
- Data Source: DEX APIs (Uniswap, Sushiswap, Curve)
- Database: portfolio_assets table

---

### Feature 3.4: Portfolio Rebalancing Suggestions (21 points)

**PRD Reference**: Included in Feature 11 (F-011) - Portfolio Analytics (portfolio optimization recommendations)

**User Stories** (4 stories):
1. **Analyze Portfolio Allocation** (8 points)
   - Analyze portfolio breakdown by asset
   - Calculate current allocation %
   - Compare with target allocation (if set)
   - Identify over/under-allocated assets
   - Generate allocation report

2. **Generate Rebalancing Suggestions** (8 points)
   - Suggest buy/sell actions to reach target allocation
   - Calculate trade amounts (USD, tokens)
   - Consider gas fees and slippage
   - Generate rebalancing plan
   - Optimization: Minimize trades, minimize gas fees

3. **Display Rebalancing Dashboard** (3 points)
   - View current vs target allocation
   - View suggested buy/sell actions
   - View estimated gas fees
   - Accept/reject suggestions
   - React + ECharts visualization

4. **Set Target Allocation** (2 points)
   - Set target allocation % for each asset
   - Save multiple allocation strategies
   - Validate allocation (total = 100%)
   - Edit/delete allocation strategies

**Technical**:
- Service: PortfolioAnalyzerService, RebalancingService
- Algorithm: Variance analysis, Linear programming
- Database: portfolio_snapshots, portfolio_assets tables
- API: `GET /v2/portfolio/rebalancing`, `POST /v2/portfolio/target-allocation`

---

### Feature 3.5: Portfolio Analytics (21 points)

**Also known as**: "Portfolio Comparison" in User Stories v2.0

**PRD Reference**: Feature 11 (F-011) - Portfolio Analytics (risk metrics, diversification analysis, correlation analysis)

**User Stories** (4 stories):
1. **Compare with Market Indices** (8 points)
   - Compare portfolio with BTC, ETH, S&P 500
   - Calculate portfolio ROI vs index ROI
   - Display comparison chart (30d, 90d, 1y)
   - Data source: CoinGecko (BTC, ETH), Yahoo Finance (S&P 500)

2. **Compare with Other Users** (8 points)
   - View leaderboard (top 100 portfolios by ROI)
   - View user rank
   - Filter by time period (30d, 90d, 1y)
   - Anonymized data (no wallet addresses)
   - Leaderboard updates daily

3. **Display Performance Metrics** (3 points)
   - View ROI (absolute, percentage)
   - View Sharpe ratio, max drawdown, volatility
   - Metrics calculated for 30d, 90d, 1y

4. **Export Performance Report** (2 points)
   - Export performance report (PDF, CSV)
   - Report includes: portfolio value, ROI, metrics, charts
   - Report covers selected time period
   - Professionally formatted

**Technical**:
- Service: PortfolioComparisonService
- Database: portfolio_snapshots (PostgreSQL)
- Frontend: React + ECharts
- API: `GET /v2/portfolio/comparison`, `GET /v2/portfolio/leaderboard`, `GET /v2/portfolio/metrics`, `GET /v2/portfolio/export`

---

### Feature 3.6: Portfolio Alerts (5 points)

**Also known as**: "Portfolio Export" in User Stories v2.0

**PRD Reference**: Feature 12 (F-012) - Portfolio Alerts (total value alerts, allocation alerts, performance alerts)

**User Stories** (2 stories):
1. **Export Portfolio Data** (3 points)
   - Export portfolio data (CSV, JSON)
   - Export includes: assets, balances, values, chains
   - Export includes historical snapshots
   - User can select time range
   - Export completes within 1 minute

2. **Schedule Automated Exports** (2 points)
   - Schedule exports (daily, weekly, monthly)
   - Select export format (CSV, JSON, PDF)
   - Select delivery method (email, webhook)
   - System sends exports automatically
   - Manage scheduled exports

**Technical**:
- Service: ScheduledExportService (background job)
- Database: scheduled_exports table
- API: `GET /v2/portfolio/export`, `POST /v2/portfolio/scheduled-exports`
- Delivery: SendGrid (email), Webhooks
- Performance: <1 minute export time

---

## Technical Architecture

### Components

**Backend Services**:
- PortfolioAggregator: Fetch balances from 100+ chains
- WebSocketGateway: Real-time portfolio updates
- ILCalculatorService: Calculate impermanent loss
- PoolMonitor: Monitor liquidity pool metrics
- PortfolioAnalyticsService: Calculate P&L, performance metrics
- EventProcessor: Evaluate portfolio alert rules

**Infrastructure**:
- ECS Fargate: Background jobs (portfolio aggregation)
- WebSocket: Real-time updates (10K concurrent connections)
- PostgreSQL: Portfolio snapshots, portfolio assets, liquidity positions (consistent with existing infrastructure)
- Redis: Caching (balance data, pool data)

**External Integrations**:
- Blockchain RPCs: Fetch balances (Alchemy, Infura, QuickNode)
- DEX APIs: Fetch pool data (Uniswap, Sushiswap, Curve)
- DeFiLlama API: Fetch protocol data

### Database Schema

**portfolio_snapshots** table (PostgreSQL):
```sql
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- String user ID (consistent with existing pattern)
  total_value_usd DECIMAL(20,8) NOT NULL,
  change_24h_pct DECIMAL(10,4),
  assets JSONB NOT NULL, -- [{token, chain, balance, value_usd}]
  snapshot_timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_portfolio_snapshots_user_id ON portfolio_snapshots(user_id);
CREATE INDEX idx_portfolio_snapshots_timestamp ON portfolio_snapshots(snapshot_timestamp);
```

**portfolio_assets** table:
```sql
CREATE TABLE portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- String user ID (consistent with existing pattern)
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('token', 'nft', 'lp_position')),
  token VARCHAR(50),
  chain VARCHAR(50) NOT NULL,
  balance DECIMAL(30,18),
  entry_price_usd DECIMAL(20,8),
  current_price_usd DECIMAL(20,8),
  pnl_usd DECIMAL(20,8),
  il_pct DECIMAL(10,4), -- for LP positions
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_portfolio_assets_user_id ON portfolio_assets(user_id);
CREATE INDEX idx_portfolio_assets_asset_type ON portfolio_assets(asset_type);
```

---

## Success Metrics

**Technical Metrics**:
- Portfolio aggregation: <15 minutes for 125K users
- WebSocket connections: 10K concurrent, 24+ hours stability
- Real-time updates: <1 minute latency
- P&L calculation: <5 seconds for 10K transactions
- IL calculation: <2 seconds per position

**Business Metrics**:
- 30K+ users track portfolios (Q1 2026) - aligned with PRD v2.0
- 150K+ wallets tracked - aligned with PRD v2.0
- 20K+ users use real-time tracking
- 10K+ users calculate IL
- $3.75M ARR from portfolio features
- 90%+ user satisfaction

---

## Dependencies

**External**:
- Blockchain RPC providers (Alchemy, Infura, QuickNode)
- DEX APIs (Uniswap, Sushiswap, Curve)
- DeFiLlama API

**Internal**:
- User authentication system
- Subscription management system
- Alert infrastructure (EPIC-1)

---

**Status**: 📋 Planned for Q1 2026  
**Assigned To**: Backend Team (3 engineers), Frontend Team (2 engineers)  
**Start Date**: Q1 2026, Month 4  
**Target Completion**: Q1 2026, Month 6

