# Story 4.1.3: Integration Test Plan

**Story ID:** STORY-4.1.3  
**Test Date:** 2025-10-16  
**Test Status:** ⏳ **IN PROGRESS**

---

## 📋 Integration Test Overview

Integration tests verify that all components work together correctly:
- Database migrations
- Seed data insertion
- Engine integration
- API endpoint functionality
- End-to-end data flow

---

## 🗄️ Database Integration Tests

### Test 1: Migration Execution

**Objective:** Verify all migrations run successfully

**Steps:**
```bash
cd defi
psql -U postgres -d defillama_analytics -f src/analytics/migrations/038-create-mev-bots.sql
psql -U postgres -d defillama_analytics -f src/analytics/migrations/039-create-mev-profit-attribution.sql
psql -U postgres -d defillama_analytics -f src/analytics/migrations/040-create-protocol-mev-leakage.sql
psql -U postgres -d defillama_analytics -f src/analytics/migrations/041-create-mev-market-trends.sql
```

**Expected Results:**
- ✅ All tables created successfully
- ✅ All indexes created
- ✅ All constraints defined
- ✅ No errors

**Verification:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('mev_bots', 'mev_profit_attribution', 'protocol_mev_leakage', 'mev_market_trends');

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('mev_bots', 'mev_profit_attribution', 'protocol_mev_leakage', 'mev_market_trends');
```

---

### Test 2: Seed Data Insertion

**Objective:** Verify seed data inserts successfully

**Steps:**
```bash
psql -U postgres -d defillama_analytics -f src/analytics/db/seed-mev-bots.sql
psql -U postgres -d defillama_analytics -f src/analytics/db/seed-protocol-mev-leakage.sql
psql -U postgres -d defillama_analytics -f src/analytics/db/seed-mev-market-trends.sql
```

**Expected Results:**
- ✅ MEV bots inserted (5 bots)
- ✅ Protocol leakage data inserted (Ethereum: 7 days, Arbitrum: 3 days)
- ✅ Market trends data inserted (Ethereum: 7 days, Arbitrum: 3 days)
- ✅ No constraint violations

**Verification:**
```sql
-- Check mev_bots
SELECT COUNT(*) FROM mev_bots;
SELECT bot_address, bot_name, bot_type FROM mev_bots LIMIT 5;

-- Check protocol_mev_leakage
SELECT COUNT(*) FROM protocol_mev_leakage;
SELECT protocol_id, chain_id, date, total_mev_extracted_usd FROM protocol_mev_leakage ORDER BY date DESC LIMIT 10;

-- Check mev_market_trends
SELECT COUNT(*) FROM mev_market_trends;
SELECT chain_id, date, total_mev_volume_usd, unique_bots FROM mev_market_trends ORDER BY date DESC LIMIT 10;
```

---

## 🔧 Engine Integration Tests

### Test 3: Bot Tracking Pipeline

**Objective:** Verify bot tracking engines work together

**Test Flow:**
```
MEV Opportunity → MEVBotIdentifier → MEVBotTracker → Database
                                   ↓
                          BotPerformanceCalculator
                          BotStrategyAnalyzer
                          BotSophisticationScorer
```

**Test Script:**
```typescript
// File: src/analytics/engines/tests/bot-tracking-integration.test.ts

import { MEVBotIdentifier } from '../mev-bot-identifier';
import { MEVBotTracker } from '../mev-bot-tracker';
import { BotPerformanceCalculator } from '../bot-performance-calculator';
import { BotStrategyAnalyzer } from '../bot-strategy-analyzer';
import { BotSophisticationScorer } from '../bot-sophistication-scorer';

describe('Bot Tracking Integration', () => {
  it('should track bot from opportunity to database', async () => {
    const opportunity = {
      id: 'test-opp-1',
      bot_address: '0x1234567890123456789012345678901234567890',
      chain_id: '1',
      opportunity_type: 'sandwich',
      mev_extracted_usd: 1000,
      gas_cost_usd: 50,
      // ... other fields
    };

    // Step 1: Identify bot
    const identifier = MEVBotIdentifier.getInstance();
    const identification = await identifier.identifyBot(opportunity);
    expect(identification).toBeDefined();

    // Step 2: Track bot
    const tracker = MEVBotTracker.getInstance();
    await tracker.trackBot(opportunity, identification);

    // Step 3: Calculate performance
    const perfCalc = BotPerformanceCalculator.getInstance();
    const performance = await perfCalc.calculatePerformance(
      opportunity.bot_address,
      opportunity.chain_id
    );
    expect(performance.total_mev_extracted_usd).toBeGreaterThan(0);

    // Step 4: Analyze strategy
    const strategyAnalyzer = BotStrategyAnalyzer.getInstance();
    const strategy = await strategyAnalyzer.analyzeStrategy(
      opportunity.bot_address,
      opportunity.chain_id
    );
    expect(strategy.opportunity_type_preference).toBeDefined();

    // Step 5: Score sophistication
    const scorer = BotSophisticationScorer.getInstance();
    const score = await scorer.calculateScore(
      opportunity.bot_address,
      opportunity.chain_id
    );
    expect(score.overall_score).toBeGreaterThanOrEqual(0);
    expect(score.overall_score).toBeLessThanOrEqual(100);
  });
});
```

---

### Test 4: Profit Attribution Pipeline

**Objective:** Verify profit attribution engines work together

**Test Flow:**
```
MEV Opportunity → MEVProfitAttributor → Database
                           ↓
                  BotAttributionAnalyzer
                  StrategyAttributionAnalyzer
                  ProtocolAttributionAnalyzer
```

**Expected Results:**
- ✅ Attribution created with quality score
- ✅ Bot attribution aggregated correctly
- ✅ Strategy attribution aggregated correctly
- ✅ Protocol attribution aggregated correctly

---

### Test 5: Protocol Leakage Pipeline

**Objective:** Verify protocol leakage engines work together

**Test Flow:**
```
MEV Opportunities → ProtocolLeakageCalculator → Database
                              ↓
                    LeakageBreakdownAnalyzer
                    UserImpactCalculator
```

**Expected Results:**
- ✅ Daily leakage calculated correctly
- ✅ Severity score calculated correctly
- ✅ Breakdown by type accurate
- ✅ User impact calculated correctly

---

### Test 6: Market Trend Pipeline

**Objective:** Verify market trend engines work together

**Test Flow:**
```
MEV Opportunities → MarketTrendCalculator → Database
                            ↓
                  OpportunityDistributionAnalyzer
                  BotCompetitionAnalyzer
```

**Expected Results:**
- ✅ Daily trends calculated correctly
- ✅ Opportunity distribution accurate
- ✅ HHI calculated correctly
- ✅ Competition metrics accurate

---

## 🌐 API Integration Tests

### Test 7: GET /v1/analytics/mev/bots

**Objective:** Verify bot analytics API endpoint

**Test Cases:**

1. **Get all bots (no filters)**
```bash
curl -X GET "http://localhost:3000/v1/analytics/mev/bots?limit=10&offset=0"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "bots": [
      {
        "bot_address": "0x...",
        "bot_name": "...",
        "bot_type": "...",
        "performance": { ... },
        "strategy": { ... },
        "sophistication": { ... }
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 10
    }
  }
}
```

2. **Filter by chain_id**
```bash
curl -X GET "http://localhost:3000/v1/analytics/mev/bots?chain_id=1&limit=10"
```

**Expected:** Only Ethereum bots returned

3. **Pagination**
```bash
curl -X GET "http://localhost:3000/v1/analytics/mev/bots?limit=5&offset=5"
```

**Expected:** Second page of results

---

### Test 8: GET /v1/analytics/mev/protocols/:protocolId/leakage

**Objective:** Verify protocol leakage API endpoint

**Test Cases:**

1. **Get protocol leakage**
```bash
curl -X GET "http://localhost:3000/v1/analytics/mev/protocols/uniswap-v3/leakage?chain_id=1&date=2025-10-15"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "leakage": {
      "protocol_id": "uniswap-v3",
      "total_mev_extracted_usd": 150000,
      "severity_score": 85,
      "severity_classification": "high"
    },
    "breakdown": [
      {
        "opportunity_type": "sandwich",
        "count": 500,
        "mev_extracted_usd": 100000,
        "share_pct": 66.67
      }
    ],
    "user_impact": {
      "total_user_loss_usd": 120000,
      "avg_loss_per_tx_usd": 240,
      "impact_severity": "high"
    }
  }
}
```

2. **Missing required parameters**
```bash
curl -X GET "http://localhost:3000/v1/analytics/mev/protocols/uniswap-v3/leakage"
```

**Expected:** 400 error with message "chain_id and date are required"

---

### Test 9: GET /v1/analytics/mev/trends

**Objective:** Verify market trends API endpoint

**Test Cases:**

1. **Get market trends**
```bash
curl -X GET "http://localhost:3000/v1/analytics/mev/trends?chain_id=1&date=2025-10-15"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "trend": {
      "date": "2025-10-15",
      "chain_id": "1",
      "total_mev_volume_usd": 500000,
      "unique_bots": 150,
      "bot_concentration_hhi": 2500
    },
    "opportunity_distribution": [
      {
        "opportunity_type": "sandwich",
        "count": 1000,
        "volume_usd": 300000,
        "share_pct": 60
      }
    ],
    "bot_competition": {
      "unique_bots": 150,
      "bot_concentration_hhi": 2500,
      "concentration_level": "moderate",
      "competition_intensity": "high"
    }
  }
}
```

---

## ✅ Integration Test Checklist

### Database Tests
- ⏳ Migration execution
- ⏳ Seed data insertion
- ⏳ Data integrity verification

### Engine Integration Tests
- ⏳ Bot tracking pipeline
- ⏳ Profit attribution pipeline
- ⏳ Protocol leakage pipeline
- ⏳ Market trend pipeline

### API Integration Tests
- ⏳ GET /v1/analytics/mev/bots
- ⏳ GET /v1/analytics/mev/protocols/:id/leakage
- ⏳ GET /v1/analytics/mev/trends

### Performance Tests
- ⏳ API response time (<500ms)
- ⏳ Database query performance
- ⏳ Concurrent request handling

---

## 🎯 Next Steps

1. **Run Database Tests:** Execute migrations and seed data
2. **Run Engine Tests:** Test engine integration
3. **Run API Tests:** Test all endpoints
4. **Performance Testing:** Load testing and optimization
5. **Documentation:** Update test results

**Status:** ⏳ Ready to execute integration tests

