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

## Features Summary (6 features, 110 points)

### Feature 3.1: Multi-Chain Portfolio Aggregation (21 points)

**Note**: Also known as "Multi-Wallet Portfolio Tracker" in PRD v2.0

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

### Feature 3.3: Impermanent Loss Calculator (21 points)

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

### Feature 3.4: Liquidity Pool Alerts (13 points)

**User Stories** (3 stories):
1. **Configure Pool Alert Rules** (5 points)
   - Monitor specific pools
   - Set alert conditions (APY change, TVL change, volume change)
   - Multi-chain support

2. **Monitor Pool Metrics** (5 points)
   - Fetch pool data from DEX APIs
   - Evaluate alert rules every 1 hour
   - Detect metric changes

3. **Send Pool Alert Notifications** (3 points)
   - Multi-channel notifications
   - Alert includes: pool name, metric, change %, chain

**Technical**:
- Service: PoolMonitor
- Data Source: DEX APIs, DeFiLlama API
- API: `POST /v1/alerts/rules` (pool alert)

---

### Feature 3.5: Portfolio Analytics (21 points)

**User Stories** (4 stories):
1. **P&L Calculator** (8 points)
   - Calculate realized P&L (closed positions)
   - Calculate unrealized P&L (open positions)
   - Calculate total P&L (realized + unrealized)
   - Breakdown by asset, chain, time period
   - Performance: <5 seconds for 10K transactions

2. **Portfolio Performance Metrics** (5 points)
   - ROI (Return on Investment)
   - Sharpe Ratio (risk-adjusted return)
   - Max Drawdown
   - Win Rate
   - Time-weighted return

3. **Asset Allocation Analysis** (5 points)
   - Breakdown by asset type (tokens, NFTs, LP positions)
   - Breakdown by chain
   - Breakdown by category (DeFi, Gaming, etc.)
   - Pie charts, bar charts

4. **Historical Portfolio Snapshots** (3 points)
   - View portfolio value at any point in time
   - Compare portfolio across time periods
   - Export historical data (CSV, JSON)

**Technical**:
- Service: PortfolioAnalyticsService
- Database: portfolio_snapshots (TimescaleDB)
- Frontend: React + ECharts, Recharts

---

### Feature 3.6: Portfolio Alerts (13 points)

**User Stories** (3 stories):
1. **Configure Portfolio Alert Rules** (5 points)
   - Set value change alerts (% or USD)
   - Set asset-specific alerts
   - Set allocation alerts (rebalancing needed)

2. **Monitor Portfolio Changes** (5 points)
   - Evaluate alert rules every 1 hour
   - Detect value changes, allocation changes
   - Trigger alerts when conditions met

3. **Send Portfolio Alert Notifications** (3 points)
   - Multi-channel notifications
   - Alert includes: portfolio value, change %, affected assets

**Technical**:
- Service: EventProcessor
- API: `POST /v1/alerts/rules` (portfolio alert)
- Channels: SendGrid, Firebase, Webhooks

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

