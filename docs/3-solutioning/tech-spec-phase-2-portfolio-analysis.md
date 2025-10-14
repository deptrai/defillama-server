# Technical Specification - Phase 2: Portfolio Analysis

**Project:** DeFiLlama On-Chain Services Platform  
**Epic ID:** on-chain-services-v1  
**Phase:** Phase 2 - Enhancement (Portfolio Analysis)  
**Date:** 2025-10-14  
**Architect:** Luis  
**Version**: 1.0  

---

## 1. Overview

This document extends the Phase 2 technical specification, focusing specifically on **Portfolio Analysis** features (Feature 2.2).

---

## 2. Database Schema - Portfolio Analysis

### 2.1 Wallet Portfolio Tables

#### wallet_portfolios
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
  concentration_score DECIMAL(5, 2),
  diversification_score DECIMAL(5, 2),
  
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_portfolios_address ON wallet_portfolios(wallet_address);
CREATE INDEX idx_wallet_portfolios_chain ON wallet_portfolios(chain_id);
CREATE INDEX idx_wallet_portfolios_value ON wallet_portfolios(total_value_usd DESC);
CREATE UNIQUE INDEX idx_wallet_portfolios_unique ON wallet_portfolios(wallet_address, chain_id);
```

#### wallet_holdings
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
  allocation_pct DECIMAL(5, 2),
  
  -- Protocol Info
  protocol_id VARCHAR(255),
  position_type VARCHAR(50),
  
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

#### portfolio_history
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

### 2.2 Holder Distribution Tables

#### token_holders
```sql
CREATE TABLE token_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  
  -- Holdings
  balance DECIMAL(30, 10) NOT NULL,
  balance_usd DECIMAL(20, 2),
  supply_percentage DECIMAL(10, 6),
  
  -- Classification
  holder_type VARCHAR(50),
  is_contract BOOLEAN DEFAULT FALSE,
  is_exchange BOOLEAN DEFAULT FALSE,
  
  -- Behavior
  first_seen TIMESTAMP,
  last_active TIMESTAMP,
  holding_period_days INTEGER,
  transaction_count INTEGER,
  
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_token_holders_token ON token_holders(token_address);
CREATE INDEX idx_token_holders_wallet ON token_holders(wallet_address);
CREATE INDEX idx_token_holders_balance ON token_holders(balance DESC);
CREATE INDEX idx_token_holders_supply_pct ON token_holders(supply_percentage DESC);
CREATE UNIQUE INDEX idx_token_holders_unique ON token_holders(token_address, chain_id, wallet_address);
```

#### holder_distribution_snapshots
```sql
CREATE TABLE holder_distribution_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- Distribution Metrics
  total_holders INTEGER NOT NULL,
  gini_coefficient DECIMAL(5, 4),
  concentration_score DECIMAL(5, 2),
  
  -- Top Holder Metrics
  top10_percentage DECIMAL(10, 6),
  top50_percentage DECIMAL(10, 6),
  top100_percentage DECIMAL(10, 6),
  
  -- Holder Type Distribution
  whale_count INTEGER,
  whale_percentage DECIMAL(10, 6),
  large_holder_count INTEGER,
  medium_holder_count INTEGER,
  small_holder_count INTEGER,
  
  -- Behavior Metrics
  avg_holding_period_days DECIMAL(10, 2),
  holder_churn_rate DECIMAL(5, 2),
  new_holders_24h INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_holder_snapshots_token ON holder_distribution_snapshots(token_address);
CREATE INDEX idx_holder_snapshots_timestamp ON holder_distribution_snapshots(timestamp DESC);
CREATE INDEX idx_holder_snapshots_composite ON holder_distribution_snapshots(token_address, timestamp DESC);
```

---

## 3. API Specifications - Portfolio Analysis

### 3.1 Wallet Portfolio API

#### GET /v1/portfolio/:walletAddress

**Request:**
```typescript
interface PortfolioRequest {
  walletAddress: string;
  chains?: string[]; // Optional filter
  includeNfts?: boolean; // Default: false
}
```

**Response:**
```typescript
interface PortfolioResponse {
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
    concentrationScore: number;
    diversificationScore: number;
    topHoldingPct: number;
  };
  
  lastUpdated: string;
}
```

#### GET /v1/portfolio/:walletAddress/holdings

**Request:**
```typescript
interface HoldingsRequest {
  walletAddress: string;
  chains?: string[];
  protocols?: string[];
  sortBy?: 'value' | 'allocation' | 'roi' | 'pnl';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
interface HoldingsResponse {
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

### 3.2 Holder Distribution API

#### GET /v1/analytics/tokens/:tokenAddress/holders/distribution

**Request:**
```typescript
interface DistributionRequest {
  tokenAddress: string;
  chainId: string;
}
```

**Response:**
```typescript
interface DistributionResponse {
  tokenAddress: string;
  chainId: string;
  totalHolders: number;
  
  concentration: {
    giniCoefficient: number;
    concentrationScore: number;
    top10Percentage: number;
    top50Percentage: number;
    top100Percentage: number;
  };
  
  holderTypes: {
    whales: { count: number; percentage: number };
    large: { count: number; percentage: number };
    medium: { count: number; percentage: number };
    small: { count: number; percentage: number };
    dust: { count: number; percentage: number };
  };
  
  distribution: Array<{
    range: string;
    holderCount: number;
    totalBalance: number;
    percentage: number;
  }>;
  
  lastUpdated: string;
}
```

---

## 4. Implementation Details

### 4.1 Portfolio Aggregation Engine

```typescript
// Multi-Chain Portfolio Aggregator
export class PortfolioAggregator {
  constructor(
    private chainClients: Map<string, BlockchainClient>,
    private priceService: PriceService
  ) {}

  /**
   * Aggregate portfolio across multiple chains
   */
  async aggregatePortfolio(
    walletAddress: string,
    chains: string[]
  ): Promise<AggregatedPortfolio> {
    // Fetch balances from all chains in parallel
    const balancePromises = chains.map(chainId =>
      this.getChainBalances(walletAddress, chainId)
    );
    
    const chainBalances = await Promise.all(balancePromises);
    
    // Aggregate and calculate metrics
    const holdings = this.mergeHoldings(chainBalances);
    const totalValue = this.calculateTotalValue(holdings);
    const performance = await this.calculatePerformance(walletAddress, holdings);
    const risk = this.calculateRiskMetrics(holdings);
    
    return {
      walletAddress,
      totalValueUsd: totalValue,
      holdings,
      performance,
      risk,
      lastUpdated: new Date()
    };
  }

  /**
   * Get balances for a specific chain
   */
  private async getChainBalances(
    walletAddress: string,
    chainId: string
  ): Promise<ChainBalance[]> {
    const client = this.chainClients.get(chainId);
    if (!client) throw new Error(`Chain ${chainId} not supported`);
    
    // Get token balances
    const balances = await client.getTokenBalances(walletAddress);
    
    // Get prices
    const prices = await this.priceService.getPrices(
      balances.map(b => b.tokenAddress),
      chainId
    );
    
    // Calculate USD values
    return balances.map(balance => ({
      ...balance,
      chainId,
      valueUsd: balance.balance * prices[balance.tokenAddress]
    }));
  }

  /**
   * Calculate risk metrics
   */
  private calculateRiskMetrics(holdings: Holding[]): RiskMetrics {
    const totalValue = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
    
    // Concentration score (Herfindahl index)
    const concentrationScore = holdings.reduce((sum, h) => {
      const share = h.valueUsd / totalValue;
      return sum + (share * share);
    }, 0) * 100;
    
    // Diversification score (inverse of concentration)
    const diversificationScore = 100 - concentrationScore;
    
    // Top holding percentage
    const topHoldingPct = holdings.length > 0
      ? (holdings[0].valueUsd / totalValue) * 100
      : 0;
    
    return {
      concentrationScore,
      diversificationScore,
      topHoldingPct
    };
  }
}
```

### 4.2 Gini Coefficient Calculator

```typescript
// Gini Coefficient for Holder Distribution
export class GiniCoefficientCalculator {
  /**
   * Calculate Gini coefficient (0 = perfect equality, 1 = perfect inequality)
   */
  calculateGini(balances: number[]): number {
    if (balances.length === 0) return 0;
    
    // Sort balances in ascending order
    const sorted = [...balances].sort((a, b) => a - b);
    const n = sorted.length;
    const totalBalance = sorted.reduce((sum, b) => sum + b, 0);
    
    if (totalBalance === 0) return 0;
    
    // Calculate Gini coefficient
    let numerator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (2 * (i + 1) - n - 1) * sorted[i];
    }
    
    const gini = numerator / (n * totalBalance);
    return Math.abs(gini);
  }

  /**
   * Classify distribution based on Gini coefficient
   */
  classifyDistribution(gini: number): string {
    if (gini < 0.3) return 'highly_equal';
    if (gini < 0.5) return 'moderately_equal';
    if (gini < 0.7) return 'moderately_unequal';
    return 'highly_unequal';
  }

  /**
   * Calculate concentration metrics
   */
  calculateConcentration(holders: TokenHolder[]): ConcentrationMetrics {
    const totalSupply = holders.reduce((sum, h) => sum + h.balance, 0);
    
    // Sort by balance descending
    const sorted = [...holders].sort((a, b) => b.balance - a.balance);
    
    // Calculate top holder percentages
    const top10 = sorted.slice(0, 10);
    const top50 = sorted.slice(0, 50);
    const top100 = sorted.slice(0, 100);
    
    return {
      giniCoefficient: this.calculateGini(holders.map(h => h.balance)),
      top10Percentage: this.calculatePercentage(top10, totalSupply),
      top50Percentage: this.calculatePercentage(top50, totalSupply),
      top100Percentage: this.calculatePercentage(top100, totalSupply),
      totalHolders: holders.length
    };
  }

  private calculatePercentage(holders: TokenHolder[], totalSupply: number): number {
    const sum = holders.reduce((acc, h) => acc + h.balance, 0);
    return (sum / totalSupply) * 100;
  }
}
```

---

## 5. Performance Optimization

### 5.1 Caching Strategy

```typescript
// Redis Cache Manager for Portfolio Data
export class PortfolioCacheManager {
  constructor(private redis: Redis) {}

  /**
   * Cache portfolio data with TTL
   */
  async cachePortfolio(
    walletAddress: string,
    portfolio: AggregatedPortfolio,
    ttl: number = 300 // 5 minutes
  ): Promise<void> {
    const key = `portfolio:${walletAddress}`;
    await this.redis.setex(key, ttl, JSON.stringify(portfolio));
  }

  /**
   * Get cached portfolio
   */
  async getCachedPortfolio(
    walletAddress: string
  ): Promise<AggregatedPortfolio | null> {
    const key = `portfolio:${walletAddress}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Invalidate portfolio cache
   */
  async invalidatePortfolio(walletAddress: string): Promise<void> {
    const key = `portfolio:${walletAddress}`;
    await this.redis.del(key);
  }
}
```

### 5.2 Database Query Optimization

```sql
-- Materialized view for portfolio summary
CREATE MATERIALIZED VIEW portfolio_summary AS
SELECT 
  wp.wallet_address,
  wp.chain_id,
  wp.total_value_usd,
  COUNT(wh.id) as holding_count,
  MAX(wh.value_usd) as largest_holding_usd,
  wp.last_updated
FROM wallet_portfolios wp
LEFT JOIN wallet_holdings wh ON wh.portfolio_id = wp.id
GROUP BY wp.id, wp.wallet_address, wp.chain_id, wp.total_value_usd, wp.last_updated;

-- Refresh every 5 minutes
CREATE INDEX idx_portfolio_summary_wallet ON portfolio_summary(wallet_address);
```

---

## 6. Non-Functional Requirements

### 6.1 Performance Requirements

- **API Response Time**: <500ms (p95)
- **Portfolio Aggregation**: <2s for 10 chains
- **Gini Calculation**: <100ms for 10,000 holders
- **Cache Hit Ratio**: >90%
- **Concurrent Requests**: 1000+ requests/second

### 6.2 Scalability Requirements

- **Wallets Supported**: 1M+ unique wallets
- **Chains Supported**: 100+ blockchains
- **Holders Tracked**: 10M+ token holders
- **Historical Data**: 90 days retention

### 6.3 Reliability Requirements

- **API Availability**: 99.9%
- **Data Freshness**: <5 minutes
- **Error Rate**: <0.1%
- **Backup Frequency**: Hourly snapshots

---

**Version**: 1.0  
**Last Updated**: 2025-10-14  
**Status**: Ready for Implementation

