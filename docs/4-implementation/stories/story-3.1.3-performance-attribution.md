# Story 3.1.3: Performance Attribution

**Epic:** On-Chain Services V1  
**Feature:** 3.1 - Smart Money Tracking  
**Story ID:** STORY-3.1.3  
**Story Points:** 8  
**Priority:** P1 (High)  
**Sprint:** Phase 3, Month 11  
**Created:** 2025-10-14  
**Product Manager:** Luis  

---

## 📖 User Story

**As a** DeFi trader or researcher  
**I want to** analyze the performance attribution of smart money wallets  
**So that** I can understand their P&L breakdown, win rate, Sharpe ratio, and strategy classification to evaluate their trading effectiveness  

---

## 🎯 Business Value

**Revenue Impact:** $300K ARR (15% of Phase 3 target)  
**User Impact:** 750 premium users (15% of Phase 3 target)  
**Strategic Value**: Advanced analytics, institutional appeal  

**Key Metrics:**
- Wallets analyzed: 10,000+ smart money wallets
- Performance metrics calculated: P&L, ROI, win rate, Sharpe ratio, max drawdown
- Strategy classification accuracy: 85%+
- User engagement: 40% of smart money feature users
- Revenue per user: $400/year

---

## ✅ Acceptance Criteria

### AC1: P&L Tracking
**Given** a smart money wallet with trading history  
**When** calculating P&L  
**Then** the system should show realized P&L, unrealized P&L, and total P&L with token-level breakdown  

**Verification:**
- [ ] Realized P&L calculation (closed positions)
- [ ] Unrealized P&L calculation (open positions)
- [ ] Total P&L = Realized + Unrealized
- [ ] Token-level P&L breakdown
- [ ] Time-series P&L tracking (daily, weekly, monthly)
- [ ] Calculation accuracy >95%

### AC2: Win Rate Calculation
**Given** a smart money wallet's trade history  
**When** calculating win rate  
**Then** the system should show overall win rate, win rate by token, and win rate by strategy  

**Verification:**
- [ ] Overall win rate = (Winning trades / Total trades) × 100
- [ ] Win rate by token
- [ ] Win rate by strategy (accumulation, distribution, rotation, arbitrage)
- [ ] Win rate by time period
- [ ] Calculation accuracy >95%

### AC3: Sharpe Ratio Calculation
**Given** a smart money wallet's return history  
**When** calculating Sharpe ratio  
**Then** the system should show Sharpe ratio, Sortino ratio, and max drawdown  

**Verification:**
- [ ] Sharpe ratio = (Average return - Risk-free rate) / Standard deviation
- [ ] Sortino ratio = (Average return - Risk-free rate) / Downside deviation
- [ ] Max drawdown = Maximum peak-to-trough decline
- [ ] Calculation accuracy >95%

### AC4: Strategy Classification
**Given** a smart money wallet's trading patterns  
**When** classifying strategy  
**Then** the system should identify primary strategy, secondary strategies, and strategy effectiveness  

**Verification:**
- [ ] Primary strategy identification (accumulation, distribution, rotation, arbitrage, swing, day, position)
- [ ] Secondary strategies (if applicable)
- [ ] Strategy effectiveness metrics (P&L, win rate, Sharpe ratio per strategy)
- [ ] Strategy consistency score
- [ ] Classification accuracy >85%

### AC5: Performance Attribution API
**Given** I am an authenticated user  
**When** I request performance attribution for a wallet  
**Then** I should receive comprehensive performance metrics  

**Verification:**
- [ ] API endpoint: GET `/v1/smart-money/wallets/:address/performance`
- [ ] Includes P&L, win rate, Sharpe ratio, strategy classification
- [ ] Time range filtering support
- [ ] Response time <500ms (p95)
- [ ] Rate limiting enforced

---

## 🔧 Technical Requirements

### Performance Calculator

```typescript
class PerformanceAttributionEngine {
  async calculatePerformance(walletAddress: string): Promise<PerformanceMetrics> {
    // Get wallet trades
    const trades = await this.getWalletTrades(walletAddress);
    
    // Calculate P&L
    const pnl = await this.calculatePnL(trades);
    
    // Calculate win rate
    const winRate = this.calculateWinRate(trades);
    
    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(trades);
    
    // Classify strategy
    const strategy = await this.classifyStrategy(trades);
    
    return {
      pnl,
      winRate,
      riskMetrics,
      strategy,
    };
  }
  
  private async calculatePnL(trades: Trade[]): Promise<PnLMetrics> {
    let realizedPnL = 0;
    let unrealizedPnL = 0;
    const tokenPnL: Map<string, number> = new Map();
    
    for (const trade of trades) {
      if (trade.status === 'closed') {
        realizedPnL += trade.pnl;
      } else {
        unrealizedPnL += await this.calculateUnrealizedPnL(trade);
      }
      
      // Token-level P&L
      const currentPnL = tokenPnL.get(trade.token) || 0;
      tokenPnL.set(trade.token, currentPnL + trade.pnl);
    }
    
    return {
      realizedPnL,
      unrealizedPnL,
      totalPnL: realizedPnL + unrealizedPnL,
      tokenPnL: Object.fromEntries(tokenPnL),
    };
  }
  
  private calculateWinRate(trades: Trade[]): WinRateMetrics {
    const closedTrades = trades.filter(t => t.status === 'closed');
    const winningTrades = closedTrades.filter(t => t.pnl > 0);
    
    const overallWinRate = (winningTrades.length / closedTrades.length) * 100;
    
    // Win rate by token
    const tokenWinRate: Map<string, number> = new Map();
    const tokenGroups = this.groupByToken(closedTrades);
    
    for (const [token, tokenTrades] of tokenGroups) {
      const wins = tokenTrades.filter(t => t.pnl > 0).length;
      tokenWinRate.set(token, (wins / tokenTrades.length) * 100);
    }
    
    return {
      overallWinRate,
      tokenWinRate: Object.fromEntries(tokenWinRate),
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: closedTrades.length - winningTrades.length,
    };
  }
  
  private calculateRiskMetrics(trades: Trade[]): RiskMetrics {
    const returns = this.calculateDailyReturns(trades);
    
    // Sharpe Ratio
    const avgReturn = this.average(returns);
    const stdDev = this.standardDeviation(returns);
    const riskFreeRate = 0.02 / 365; // 2% annual risk-free rate
    const sharpeRatio = (avgReturn - riskFreeRate) / stdDev;
    
    // Sortino Ratio
    const downsideReturns = returns.filter(r => r < 0);
    const downsideStdDev = this.standardDeviation(downsideReturns);
    const sortinoRatio = (avgReturn - riskFreeRate) / downsideStdDev;
    
    // Max Drawdown
    const maxDrawdown = this.calculateMaxDrawdown(trades);
    
    return {
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      volatility: stdDev,
    };
  }
  
  private async classifyStrategy(trades: Trade[]): Promise<StrategyClassification> {
    // Analyze trade patterns
    const patterns = await this.analyzePatterns(trades);
    
    // Classify primary strategy
    const primaryStrategy = this.identifyPrimaryStrategy(patterns);
    
    // Identify secondary strategies
    const secondaryStrategies = this.identifySecondaryStrategies(patterns);
    
    // Calculate strategy effectiveness
    const effectiveness = this.calculateStrategyEffectiveness(trades, primaryStrategy);
    
    return {
      primaryStrategy,
      secondaryStrategies,
      effectiveness,
      consistency: this.calculateConsistency(patterns),
    };
  }
}
```

---

## 📋 Implementation Tasks

### Phase 1: P&L Calculator (3 days)
- [ ] Implement realized P&L calculator
- [ ] Implement unrealized P&L calculator
- [ ] Implement token-level P&L breakdown
- [ ] Implement time-series P&L tracking
- [ ] Unit tests

### Phase 2: Win Rate Calculator (2 days)
- [ ] Implement overall win rate calculator
- [ ] Implement win rate by token
- [ ] Implement win rate by strategy
- [ ] Unit tests

### Phase 3: Risk Metrics Calculator (3 days)
- [ ] Implement Sharpe ratio calculator
- [ ] Implement Sortino ratio calculator
- [ ] Implement max drawdown calculator
- [ ] Implement volatility calculator
- [ ] Unit tests

### Phase 4: Strategy Classifier (3 days)
- [ ] Implement pattern analyzer
- [ ] Implement primary strategy identifier
- [ ] Implement secondary strategy identifier
- [ ] Implement strategy effectiveness calculator
- [ ] Unit tests

### Phase 5: API Development (2 days)
- [ ] Implement GET `/v1/smart-money/wallets/:address/performance` endpoint
- [ ] Implement time range filtering
- [ ] Add caching layer
- [ ] API integration tests

### Phase 6: Testing & Documentation (2 days)
- [ ] E2E testing
- [ ] Performance testing
- [ ] API documentation
- [ ] User documentation

**Total Estimated Time:** 15 days (3 weeks)

---

## 🧪 Testing Strategy

### Unit Tests
- P&L calculation (realized, unrealized, token-level)
- Win rate calculation (overall, by token, by strategy)
- Risk metrics (Sharpe, Sortino, max drawdown)
- Strategy classification
- Coverage target: 90%+

### Integration Tests
- API endpoints
- Database operations
- Trade data processing

### Performance Tests
- P&L calculation <2 seconds
- Win rate calculation <1 second
- Risk metrics calculation <2 seconds
- Strategy classification <3 seconds
- API response time <500ms (p95)

### E2E Tests
- Complete performance attribution flow: Data collection → Calculation → API response

---

## 📊 Success Metrics

### Technical Metrics
- Wallets analyzed: 10,000+ smart money wallets
- Calculation accuracy: 95%+
- Strategy classification accuracy: 85%+
- API response time: <500ms (p95)
- System uptime: 99.9%

### Business Metrics
- User engagement: 40% of smart money users
- Feature usage: 20,000+ API calls/day
- User satisfaction: 4.5+ rating
- Revenue per user: $400/year

---

## 🔗 Dependencies

**Upstream:**
- Story 3.1.1: Smart Money Identification (wallet data)
- Story 3.1.2: Trade Pattern Analysis (trade data, patterns)

**External:**
- Price data APIs (for unrealized P&L calculation)
- Risk-free rate data

---

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Status:** Ready for Sprint Planning

