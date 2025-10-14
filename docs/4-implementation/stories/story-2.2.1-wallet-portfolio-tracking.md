# Story 2.2.1: Wallet Portfolio Tracking

**Epic**: 2.2 Portfolio Analysis  
**Status**: Ready for Implementation  
**Priority**: P1  
**Effort**: 7 points  
**Value**: High

---

## User Story

**As an** active trader  
**I want** to track and analyze any wallet's portfolio composition  
**So that** I can learn from successful traders

---

## Acceptance Criteria

### AC1: Real-time Portfolio Valuation ✅
- [ ] Real-time portfolio value calculation
- [ ] Multi-chain portfolio aggregation
- [ ] Token balance tracking
- [ ] NFT holdings (optional)
- [ ] Historical portfolio value

### AC2: Asset Allocation Breakdown ✅
- [ ] Asset allocation by token
- [ ] Asset allocation by protocol
- [ ] Asset allocation by chain
- [ ] Asset allocation by category (DeFi, NFT, Stablecoin)
- [ ] Concentration risk metrics

### AC3: Performance Tracking Over Time ✅
- [ ] Portfolio performance charts (7d, 30d, 90d, 1y, all)
- [ ] ROI calculations
- [ ] Profit/loss tracking
- [ ] Best/worst performing assets
- [ ] Performance vs benchmarks (ETH, BTC)

### AC4: Cross-chain Portfolio Aggregation ✅
- [ ] Aggregate holdings across 100+ chains
- [ ] Cross-chain position tracking
- [ ] Cross-chain transaction history
- [ ] Chain-specific analytics
- [ ] Cross-chain risk analysis

---

## Technical Specification

### Database Schema

**1. wallet_portfolios**
```sql
CREATE TABLE wallet_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Portfolio Metrics
  total_value_usd DECIMAL(20, 2) NOT NULL,
  token_count INTEGER,
  protocol_count INTEGER,
  
  -- Performance
  pnl_24h DECIMAL(20, 2),
  pnl_7d DECIMAL(20, 2),
  pnl_30d DECIMAL(20, 2),
  pnl_all_time DECIMAL(20, 2),
  roi_all_time DECIMAL(10, 4),
  
  -- Risk
  concentration_score DECIMAL(5, 2), -- 0-100
  diversification_score DECIMAL(5, 2), -- 0-100
  
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_portfolios_address ON wallet_portfolios(wallet_address);
CREATE INDEX idx_wallet_portfolios_chain ON wallet_portfolios(chain_id);
CREATE INDEX idx_wallet_portfolios_value ON wallet_portfolios(total_value_usd DESC);
CREATE UNIQUE INDEX idx_wallet_portfolios_unique ON wallet_portfolios(wallet_address, chain_id);
```

**2. wallet_holdings**
```sql
CREATE TABLE wallet_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES wallet_portfolios(id),
  
  -- Asset Info
  token_address VARCHAR(255) NOT NULL,
  token_symbol VARCHAR(50) NOT NULL,
  token_name VARCHAR(255),
  
  -- Position
  balance DECIMAL(30, 10) NOT NULL,
  value_usd DECIMAL(20, 2) NOT NULL,
  allocation_pct DECIMAL(5, 2), -- % of portfolio
  
  -- Protocol Info
  protocol_id VARCHAR(255),
  position_type VARCHAR(50), -- 'wallet', 'staked', 'lp', 'lending', 'borrowed'
  
  -- Performance
  cost_basis DECIMAL(20, 2),
  unrealized_pnl DECIMAL(20, 2),
  roi DECIMAL(10, 4),
  
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_holdings_portfolio_id ON wallet_holdings(portfolio_id);
CREATE INDEX idx_wallet_holdings_token ON wallet_holdings(token_address);
CREATE INDEX idx_wallet_holdings_value ON wallet_holdings(value_usd DESC);
```

**3. portfolio_history**
```sql
CREATE TABLE portfolio_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- Snapshot
  total_value_usd DECIMAL(20, 2) NOT NULL,
  token_count INTEGER,
  protocol_count INTEGER,
  
  -- Top Holdings (JSON)
  top_holdings JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_portfolio_history_wallet ON portfolio_history(wallet_address);
CREATE INDEX idx_portfolio_history_timestamp ON portfolio_history(timestamp DESC);
CREATE INDEX idx_portfolio_history_composite ON portfolio_history(wallet_address, timestamp DESC);
```

### API Endpoints

#### 1. Get Wallet Portfolio
```typescript
GET /v1/portfolio/:walletAddress

Query Parameters:
- chains: string[] (optional, filter specific chains)
- includeNfts: boolean (default: false)

Response:
{
  walletAddress: string;
  totalValueUsd: number;
  chains: Array<{
    chainId: string;
    valueUsd: number;
    tokenCount: number;
    protocolCount: number;
  }>;
  
  performance: {
    pnl24h: number;
    pnl7d: number;
    pnl30d: number;
    pnlAllTime: number;
    roiAllTime: number;
  };
  
  risk: {
    concentrationScore: number; // 0-100
    diversificationScore: number; // 0-100
    topHoldingPct: number; // % of portfolio in largest holding
  };
  
  lastUpdated: string;
}
```

#### 2. Get Asset Allocation
```typescript
GET /v1/portfolio/:walletAddress/allocation

Query Parameters:
- groupBy: 'token' | 'protocol' | 'chain' | 'category'
- minAllocation: number (optional, filter holdings >X%)

Response:
{
  walletAddress: string;
  groupBy: string;
  
  allocation: Array<{
    name: string;
    valueUsd: number;
    allocationPct: number;
    tokenCount: number;
    change24h: number;
  }>;
  
  categories: {
    defi: number; // % of portfolio
    stablecoins: number;
    nfts: number;
    other: number;
  };
}
```

#### 3. Get Holdings Detail
```typescript
GET /v1/portfolio/:walletAddress/holdings

Query Parameters:
- chains: string[] (optional)
- protocols: string[] (optional)
- sortBy: 'value' | 'allocation' | 'roi' | 'pnl'
- sortOrder: 'asc' | 'desc' (default: 'desc')
- page: number (default: 1)
- limit: number (default: 20)

Response:
{
  walletAddress: string;
  holdings: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    tokenName: string;
    chainId: string;
    
    position: {
      balance: number;
      valueUsd: number;
      allocationPct: number;
    };
    
    protocol: {
      protocolId: string;
      protocolName: string;
      positionType: string;
    };
    
    performance: {
      costBasis: number;
      unrealizedPnl: number;
      roi: number;
    };
    
    lastUpdated: string;
  }>;
  
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

#### 4. Get Performance History
```typescript
GET /v1/portfolio/:walletAddress/performance

Query Parameters:
- timeRange: '7d' | '30d' | '90d' | '1y' | 'all'
- granularity: 'hourly' | 'daily' | 'weekly'
- benchmark: 'eth' | 'btc' | 'none' (default: 'none')

Response:
{
  walletAddress: string;
  timeRange: string;
  
  history: Array<{
    timestamp: string;
    totalValueUsd: number;
    pnl: number;
    roi: number;
  }>;
  
  benchmark?: Array<{
    timestamp: string;
    value: number;
    roi: number;
  }>;
  
  statistics: {
    maxValue: number;
    minValue: number;
    avgValue: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  
  bestPerformers: Array<{
    tokenSymbol: string;
    roi: number;
    pnl: number;
  }>;
  
  worstPerformers: Array<{
    tokenSymbol: string;
    roi: number;
    pnl: number;
  }>;
}
```

#### 5. Compare Wallets
```typescript
GET /v1/portfolio/compare

Query Parameters:
- wallets: string[] (comma-separated, max 5)
- timeRange: '7d' | '30d' | '90d' | '1y'

Response:
{
  wallets: Array<{
    walletAddress: string;
    totalValueUsd: number;
    performance: {
      roi: number;
      pnl: number;
      sharpeRatio: number;
    };
    allocation: {
      topHolding: string;
      topHoldingPct: number;
      diversificationScore: number;
    };
  }>;
  
  comparison: {
    bestPerformer: string;
    avgRoi: number;
    correlationMatrix: number[][]; // correlation between wallets
  };
}
```

---

## Implementation Plan

### Phase 1: Data Collection (2 days)
- Create database schema
- Implement multi-chain balance tracking
- Build portfolio aggregation engine
- Create historical snapshot job

### Phase 2: API Implementation (3 days)
- Implement 5 API endpoints
- Add caching layer
- Create API documentation
- Integration tests

### Phase 3: Testing (2 days)
- Performance testing
- Accuracy validation
- Query optimization

---

## Dependencies

- Story 1.4: Advanced Query Processor
- Blockchain indexing infrastructure
- Price feed service

---

## Success Metrics

- API response time <500ms (p95)
- Data freshness <5 minutes
- Accuracy >99.9%
- Support 100+ chains

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-14  
**Author**: AI Development Team

