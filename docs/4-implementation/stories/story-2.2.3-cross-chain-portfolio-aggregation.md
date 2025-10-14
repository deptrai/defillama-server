# Story 2.2.3: Cross-chain Portfolio Aggregation

**Epic:** On-Chain Services V1  
**Feature:** 2.2 - Portfolio Analysis  
**Story ID:** STORY-2.2.3  
**Story Points:** 13  
**Priority:** P1 (High)  
**Sprint:** Phase 2, Month 9  
**Created:** 2025-10-14  
**Product Manager:** Luis  

---

## 📖 User Story

**As a** DeFi investor with assets across multiple blockchains  
**I want to** view my aggregated portfolio across all chains in a unified dashboard  
**So that** I can track my total net worth, asset allocation, and performance without manually checking each chain  

---

## 🎯 Business Value

**Revenue Impact:** $400K ARR (20% of Phase 2 target)  
**User Impact**: 1,000 premium users (20% of Phase 2 target)  
**Strategic Value**: Multi-chain support, user retention, competitive advantage  

**Key Metrics:**
- Chains supported: 100+ blockchains
- Wallets tracked: 10,000+ wallets
- Assets aggregated: 50,000+ unique tokens
- Data freshness: <5 minutes
- User engagement: 55% of premium users
- Revenue per user: $400/year

---

## ✅ Acceptance Criteria

### AC1: Multi-Chain Wallet Aggregation
**Given** a user with wallets on multiple chains  
**When** adding wallets to portfolio  
**Then** the system should aggregate balances across all supported chains  

**Verification:**
- [ ] Support 100+ blockchains (Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, etc.)
- [ ] Add multiple wallet addresses per chain
- [ ] Automatic balance fetching for all chains
- [ ] Real-time balance updates (<5 minutes)
- [ ] Support for native tokens and ERC-20/BEP-20/etc. tokens
- [ ] Support for NFTs (optional)

### AC2: Unified Portfolio View
**Given** aggregated wallet data  
**When** viewing portfolio dashboard  
**Then** the system should show total net worth, asset breakdown, and chain distribution  

**Verification:**
- [ ] Total net worth (USD)
- [ ] Net worth change (24h, 7d, 30d)
- [ ] Asset breakdown by token (top 10)
- [ ] Asset breakdown by chain
- [ ] Asset breakdown by category (DeFi, NFT, stablecoins, etc.)
- [ ] Portfolio allocation pie chart
- [ ] Historical net worth chart

### AC3: Cross-Chain Asset Normalization
**Given** assets on different chains  
**When** aggregating portfolio  
**Then** the system should normalize asset values to USD  

**Verification:**
- [ ] Real-time price fetching for all tokens
- [ ] USD value calculation for each asset
- [ ] Handle wrapped tokens (WETH, WBTC, etc.)
- [ ] Handle bridged tokens (same token on different chains)
- [ ] Handle stablecoins (USDC, USDT, DAI, etc.)
- [ ] Price data freshness <5 minutes

### AC4: Cross-Chain Transaction History
**Given** a user's portfolio  
**When** viewing transaction history  
**Then** the system should show unified transaction history across all chains  

**Verification:**
- [ ] Unified transaction list (all chains)
- [ ] Transaction type identification (transfer, swap, stake, etc.)
- [ ] Transaction value (USD)
- [ ] Transaction timestamp
- [ ] Chain identification
- [ ] Filter by chain, type, date range
- [ ] Sort by timestamp, value
- [ ] Pagination support

### AC5: Cross-Chain Performance Analytics
**Given** a user's portfolio  
**When** viewing performance analytics  
**Then** the system should show portfolio performance across all chains  

**Verification:**
- [ ] Total P&L (realized + unrealized)
- [ ] P&L by chain
- [ ] P&L by token
- [ ] ROI calculation
- [ ] Performance chart (historical)
- [ ] Best/worst performing assets
- [ ] Performance comparison vs. market (BTC, ETH)

### AC6: Cross-Chain Portfolio API
**Given** I am an authenticated user  
**When** I request cross-chain portfolio data  
**Then** I should receive aggregated portfolio information  

**Verification:**
- [ ] API endpoint: GET `/v1/portfolio/cross-chain/:userId`
- [ ] Includes net worth, assets, chains, transactions
- [ ] Chain filtering support
- [ ] Asset type filtering support
- [ ] Response time <1 second (p95)
- [ ] Rate limiting enforced

---

## 🔧 Technical Requirements

### Database Schema

**Table: `cross_chain_portfolios`**
```sql
CREATE TABLE cross_chain_portfolios (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  wallet_addresses JSONB NOT NULL,
  total_net_worth_usd DECIMAL(20, 2),
  net_worth_change_24h DECIMAL(10, 4),
  net_worth_change_7d DECIMAL(10, 4),
  net_worth_change_30d DECIMAL(10, 4),
  total_assets INTEGER,
  total_chains INTEGER,
  asset_breakdown JSONB,
  chain_breakdown JSONB,
  category_breakdown JSONB,
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cross_chain_portfolios_user ON cross_chain_portfolios(user_id);
CREATE INDEX idx_cross_chain_portfolios_net_worth ON cross_chain_portfolios(total_net_worth_usd DESC);
```

**Table: `cross_chain_assets`**
```sql
CREATE TABLE cross_chain_assets (
  id UUID PRIMARY KEY,
  portfolio_id UUID REFERENCES cross_chain_portfolios(id),
  chain_id VARCHAR(50) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  token_address VARCHAR(255),
  token_symbol VARCHAR(50),
  token_name VARCHAR(255),
  balance DECIMAL(30, 10),
  balance_usd DECIMAL(20, 2),
  price_usd DECIMAL(20, 10),
  category VARCHAR(50),
  is_native BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cross_chain_assets_portfolio ON cross_chain_assets(portfolio_id);
CREATE INDEX idx_cross_chain_assets_chain ON cross_chain_assets(chain_id);
CREATE INDEX idx_cross_chain_assets_wallet ON cross_chain_assets(wallet_address);
```

### Cross-Chain Aggregation Engine

```typescript
class CrossChainPortfolioAggregator {
  async aggregatePortfolio(userId: string): Promise<CrossChainPortfolio> {
    // Get user's wallets across all chains
    const wallets = await this.getUserWallets(userId);
    
    // Fetch balances for all wallets in parallel
    const balances = await Promise.all(
      wallets.map(wallet => this.fetchWalletBalance(wallet))
    );
    
    // Normalize assets to USD
    const normalizedAssets = await this.normalizeAssets(balances);
    
    // Calculate total net worth
    const totalNetWorth = normalizedAssets.reduce(
      (sum, asset) => sum + asset.balanceUSD,
      0
    );
    
    // Calculate breakdowns
    const assetBreakdown = this.calculateAssetBreakdown(normalizedAssets);
    const chainBreakdown = this.calculateChainBreakdown(normalizedAssets);
    const categoryBreakdown = this.calculateCategoryBreakdown(normalizedAssets);
    
    return {
      userId,
      wallets,
      totalNetWorth,
      totalAssets: normalizedAssets.length,
      totalChains: new Set(normalizedAssets.map(a => a.chainId)).size,
      assets: normalizedAssets,
      assetBreakdown,
      chainBreakdown,
      categoryBreakdown,
      lastUpdated: new Date(),
    };
  }
  
  private async fetchWalletBalance(wallet: Wallet): Promise<Balance[]> {
    const chainProvider = this.getChainProvider(wallet.chainId);
    
    // Fetch native token balance
    const nativeBalance = await chainProvider.getBalance(wallet.address);
    
    // Fetch ERC-20 token balances
    const tokenBalances = await chainProvider.getTokenBalances(wallet.address);
    
    return [
      {
        chainId: wallet.chainId,
        walletAddress: wallet.address,
        tokenAddress: null,
        tokenSymbol: chainProvider.nativeToken,
        balance: nativeBalance,
        isNative: true,
      },
      ...tokenBalances,
    ];
  }
  
  private async normalizeAssets(balances: Balance[][]): Promise<NormalizedAsset[]> {
    const flatBalances = balances.flat();
    
    // Get prices for all tokens
    const prices = await this.getPrices(
      flatBalances.map(b => ({
        chainId: b.chainId,
        tokenAddress: b.tokenAddress || 'native',
      }))
    );
    
    // Normalize to USD
    return flatBalances.map(balance => {
      const price = prices.get(`${balance.chainId}:${balance.tokenAddress || 'native'}`);
      
      return {
        ...balance,
        priceUSD: price,
        balanceUSD: balance.balance * price,
        category: this.categorizeAsset(balance),
      };
    });
  }
  
  private calculateAssetBreakdown(assets: NormalizedAsset[]): AssetBreakdown {
    const breakdown = new Map<string, number>();
    
    for (const asset of assets) {
      const key = `${asset.tokenSymbol}`;
      const current = breakdown.get(key) || 0;
      breakdown.set(key, current + asset.balanceUSD);
    }
    
    // Sort by value and take top 10
    const sorted = Array.from(breakdown.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return Object.fromEntries(sorted);
  }
  
  private calculateChainBreakdown(assets: NormalizedAsset[]): ChainBreakdown {
    const breakdown = new Map<string, number>();
    
    for (const asset of assets) {
      const current = breakdown.get(asset.chainId) || 0;
      breakdown.set(asset.chainId, current + asset.balanceUSD);
    }
    
    return Object.fromEntries(breakdown);
  }
  
  async getCrossChainTransactions(userId: string): Promise<Transaction[]> {
    const wallets = await this.getUserWallets(userId);
    
    // Fetch transactions for all wallets in parallel
    const transactions = await Promise.all(
      wallets.map(wallet => this.fetchWalletTransactions(wallet))
    );
    
    // Flatten and sort by timestamp
    return transactions
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}
```

---

## 📋 Implementation Tasks

### Phase 1: Database Setup (2 days)
- [ ] Create `cross_chain_portfolios` table
- [ ] Create `cross_chain_assets` table
- [ ] Create indexes
- [ ] Set up migrations

### Phase 2: Chain Provider Integration (5 days)
- [ ] Implement Ethereum provider
- [ ] Implement BSC provider
- [ ] Implement Polygon provider
- [ ] Implement Arbitrum/Optimism providers
- [ ] Implement Avalanche provider
- [ ] Implement generic EVM provider
- [ ] Unit tests

### Phase 3: Balance Aggregation Engine (4 days)
- [ ] Implement wallet balance fetcher
- [ ] Implement token balance fetcher
- [ ] Implement parallel fetching
- [ ] Implement error handling and retries
- [ ] Unit tests

### Phase 4: Asset Normalization Engine (3 days)
- [ ] Implement price fetcher
- [ ] Implement USD normalization
- [ ] Implement asset categorization
- [ ] Handle wrapped/bridged tokens
- [ ] Unit tests

### Phase 5: Analytics Engine (3 days)
- [ ] Implement breakdown calculators
- [ ] Implement performance calculator
- [ ] Implement transaction aggregator
- [ ] Unit tests

### Phase 6: API Development (3 days)
- [ ] Implement GET `/v1/portfolio/cross-chain/:userId` endpoint
- [ ] Implement GET `/v1/portfolio/cross-chain/:userId/transactions` endpoint
- [ ] Add caching layer (Redis)
- [ ] API integration tests

### Phase 7: Testing & Documentation (3 days)
- [ ] E2E testing
- [ ] Performance testing
- [ ] API documentation
- [ ] User documentation

**Total Estimated Time:** 23 days (4.5 weeks)

---

## 🧪 Testing Strategy

### Unit Tests
- Chain provider integrations
- Balance fetching
- Asset normalization
- Breakdown calculations
- Coverage target: 90%+

### Integration Tests
- API endpoints
- Database operations
- External blockchain APIs

### Performance Tests
- Balance fetching <10 seconds (100+ chains)
- Aggregation <5 seconds
- API response time <1 second (p95)
- Load testing: 1K concurrent requests

### E2E Tests
- Complete aggregation flow: Wallet → Balance → Normalize → Aggregate → API

---

## 📊 Success Metrics

### Technical Metrics
- Chains supported: 100+
- Wallets tracked: 10,000+
- Assets aggregated: 50,000+ unique tokens
- Data freshness: <5 minutes
- API response time: <1 second (p95)
- System uptime: 99.9%

### Business Metrics
- User engagement: 55% of premium users
- Feature usage: 50,000+ API calls/day
- User satisfaction: 4.5+ rating
- Revenue per user: $400/year

---

## 🔗 Dependencies

**External:**
- Blockchain RPC providers (Infura, Alchemy, QuickNode)
- Price data APIs (CoinGecko, DeFiLlama)
- Token metadata APIs

---

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Status:** Ready for Sprint Planning

