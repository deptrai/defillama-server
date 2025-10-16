# Extended MEV Detection Testing Guide

**Story**: 4.1.3 - Advanced MEV Analytics  
**Phase**: Phase 1 Detector Accuracy Optimization  
**Status**: Testing Phase  
**Duration**: 24-48 hours  
**Date**: 2025-10-16

---

## Overview

This guide provides instructions for running extended testing of Phase 1 detector optimizations to validate improvements in accuracy, detection rate, and false positive reduction.

---

## Test Objectives

### Primary Goals

1. **Validate Detection Rate Improvements**
   - Target: +25-35% increase in detection rate
   - Measure: Opportunities detected per hour
   - Compare: Baseline vs optimized detectors

2. **Validate Confidence Score Accuracy**
   - Target: +15-20 percentage points improvement
   - Measure: Average confidence score
   - Verify: Multi-factor scoring effectiveness

3. **Validate Profit Tier Distribution**
   - Target: 10x more MICRO tier opportunities ($10-50)
   - Measure: Distribution across all tiers
   - Verify: Lower threshold working correctly

4. **Validate False Positive Reduction**
   - Target: -15-20% reduction in false positives
   - Measure: Validation success rate
   - Verify: Enhanced confidence scoring accuracy

5. **Validate Performance**
   - Target: <50ms detection time per opportunity
   - Measure: Average detection time
   - Verify: No performance degradation

---

## Test Setup

### Prerequisites

1. **Database**: PostgreSQL with all migrations applied
2. **Redis**: Running on localhost:6379
3. **RPC Endpoints**: 38 endpoints configured in `.env`
4. **Node.js**: v20.19.5 (LTS)
5. **Disk Space**: At least 10GB free for logs and reports

### Configuration

**Environment Variables** (`.env`):
```bash
# Database
DATABASE_URL=postgresql://defillama:password@localhost:5432/defillama

# Redis
REDIS_URL=redis://localhost:6379

# RPC Endpoints (38 total)
ETHEREUM_RPC=https://eth.llamarpc.com,https://rpc.ankr.com/eth,...
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc,https://arbitrum.llamarpc.com,...
OPTIMISM_RPC=https://mainnet.optimism.io,https://optimism.llamarpc.com,...
BSC_RPC=https://bsc-dataseed.binance.org,https://bsc.llamarpc.com,...
POLYGON_RPC=https://polygon-rpc.com,https://polygon.llamarpc.com,...
```

---

## Running Extended Test

### Option 1: 24-Hour Test (Recommended)

```bash
cd defi

# Start 24-hour test
npx ts-node run-extended-mev-test.ts --duration 24

# With custom report interval (every 30 minutes)
npx ts-node run-extended-mev-test.ts --duration 24 --report-interval 30

# With custom output directory
npx ts-node run-extended-mev-test.ts --duration 24 --output-dir ./my-test-reports
```

**Expected Output**:
- Periodic reports every 60 minutes (default)
- Real-time detection logs
- Automatic error recovery
- Final comprehensive report

### Option 2: 48-Hour Test (Comprehensive)

```bash
cd defi

# Start 48-hour test
npx ts-node run-extended-mev-test.ts --duration 48

# With hourly reports
npx ts-node run-extended-mev-test.ts --duration 48 --report-interval 60
```

**Expected Output**:
- More comprehensive data
- Better statistical significance
- Longer-term performance validation

### Option 3: Specific Chains Only

```bash
cd defi

# Test only Ethereum and Arbitrum
npx ts-node run-extended-mev-test.ts --duration 24 --chains ethereum,arbitrum
```

---

## Monitoring Test Progress

### Real-Time Monitoring

**Console Output**:
- Detection events in real-time
- Periodic reports (every 60 minutes)
- Error messages and RPC failovers
- Performance metrics

**Example Output**:
```
📦 New block: 23592886
Processing block 23592886 with 283 transactions
Frontrun detection completed in 26ms. Found 1 opportunities.
Sandwich detection completed in 27ms. Found 1 opportunities.
Liquidation detection completed in 27ms. Found 2 opportunities.

================================================================================
PERIODIC REPORT - 2025-10-16T12:00:00.000Z
================================================================================

Elapsed Time: 1.00 hours
Total Opportunities: 24
Average Confidence: 82.45%
Average Profit: $156.78
Total Profit: $3,762.72
Errors: 0
RPC Failovers: 3

By Detector:
  sandwich: 8 (33.3%)
  frontrun: 7 (29.2%)
  liquidation: 5 (20.8%)
  arbitrage: 3 (12.5%)
  backrun: 1 (4.2%)

By Chain:
  ethereum: 15 (62.5%)
  arbitrum: 5 (20.8%)
  optimism: 3 (12.5%)
  bsc: 1 (4.2%)

By Profit Tier:
  MICRO: 8 (33.3%)
  SMALL: 6 (25.0%)
  MEDIUM: 7 (29.2%)
  LARGE: 2 (8.3%)
  WHALE: 1 (4.2%)

================================================================================
```

### Database Monitoring

**Query Opportunities**:
```sql
-- Total opportunities in last hour
SELECT COUNT(*) 
FROM mev_opportunities 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Opportunities by detector
SELECT detector_type, COUNT(*) 
FROM mev_opportunities 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY detector_type
ORDER BY COUNT(*) DESC;

-- Opportunities by profit tier
SELECT 
  CASE 
    WHEN estimated_profit_usd < 50 THEN 'MICRO'
    WHEN estimated_profit_usd < 100 THEN 'SMALL'
    WHEN estimated_profit_usd < 1000 THEN 'MEDIUM'
    WHEN estimated_profit_usd < 10000 THEN 'LARGE'
    ELSE 'WHALE'
  END AS tier,
  COUNT(*)
FROM mev_opportunities
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY tier
ORDER BY 
  CASE tier
    WHEN 'MICRO' THEN 1
    WHEN 'SMALL' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LARGE' THEN 4
    WHEN 'WHALE' THEN 5
  END;
```

---

## Analyzing Results

### After Test Completion

**1. Generate Comparison Report**:
```bash
cd defi

# Compare last 24 hours vs previous 24 hours
npx ts-node analyze-mev-improvements.ts --hours 24

# Compare specific date ranges
npx ts-node analyze-mev-improvements.ts \
  --baseline-start "2025-10-15T00:00:00Z" \
  --baseline-end "2025-10-16T00:00:00Z" \
  --test-start "2025-10-16T00:00:00Z" \
  --test-end "2025-10-17T00:00:00Z"

# Save results to file
npx ts-node analyze-mev-improvements.ts --hours 24 --output comparison-report.json
```

**2. Review Periodic Reports**:
```bash
# List all reports
ls -lh test-reports/

# View latest report
cat test-reports/mev-test-report-*.json | jq .
```

**3. Query Accuracy Metrics**:
```sql
-- Detector accuracy metrics
SELECT 
  detector_type,
  chain_id,
  AVG(precision) as avg_precision,
  AVG(recall) as avg_recall,
  AVG(f1_score) as avg_f1_score,
  SUM(true_positives) as total_true_positives,
  SUM(false_positives) as total_false_positives,
  SUM(false_negatives) as total_false_negatives
FROM mev_detector_metrics
WHERE date >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY detector_type, chain_id
ORDER BY detector_type, chain_id;

-- Confidence factor breakdown
SELECT 
  AVG(gas_price_factor) as avg_gas_factor,
  AVG(timing_factor) as avg_timing_factor,
  AVG(volume_factor) as avg_volume_factor,
  AVG(liquidity_factor) as avg_liquidity_factor,
  AVG(historical_factor) as avg_historical_factor,
  AVG(final_confidence) as avg_final_confidence
FROM mev_confidence_factors
WHERE created_at >= NOW() - INTERVAL '1 day';

-- Profit tier performance
SELECT 
  profit_tier,
  AVG(avg_confidence) as avg_confidence,
  SUM(total_opportunities) as total_opportunities,
  AVG(avg_profit_usd) as avg_profit
FROM mev_profit_tier_stats
WHERE date >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY profit_tier
ORDER BY 
  CASE profit_tier
    WHEN 'MICRO' THEN 1
    WHEN 'SMALL' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LARGE' THEN 4
    WHEN 'WHALE' THEN 5
  END;
```

---

## Success Criteria

### Detection Rate
- ✅ **Target**: +25-35% improvement
- ✅ **Measurement**: Opportunities per hour
- ✅ **Baseline**: ~6.7 opportunities/hour (from previous test)
- ✅ **Expected**: ~8.4-9.0 opportunities/hour

### Confidence Accuracy
- ✅ **Target**: +15-20 percentage points
- ✅ **Measurement**: Average confidence score
- ✅ **Baseline**: ~75% (static threshold)
- ✅ **Expected**: ~90-95% (multi-factor)

### Profit Tier Distribution
- ✅ **Target**: 10x more MICRO tier opportunities
- ✅ **Measurement**: MICRO tier count
- ✅ **Baseline**: 0 opportunities (threshold was $100)
- ✅ **Expected**: 30-40% of total opportunities

### False Positive Rate
- ✅ **Target**: -15-20% reduction
- ✅ **Measurement**: Validation success rate
- ✅ **Baseline**: 20-30% false positives
- ✅ **Expected**: 5-10% false positives

### Performance
- ✅ **Target**: <50ms detection time
- ✅ **Measurement**: Average detection time per opportunity
- ✅ **Baseline**: 1-27ms (from previous test)
- ✅ **Expected**: <50ms (no degradation)

---

## Troubleshooting

### Common Issues

**1. RPC Rate Limiting**:
```
Error: could not coalesce error (error={ "code": -32000, "message": "internal error" })
```
**Solution**: Automatic failover will handle this. Monitor `RPC Failovers` count in reports.

**2. Database Connection Issues**:
```
Error: Connection terminated unexpectedly
```
**Solution**: Check PostgreSQL is running and connection string is correct.

**3. Redis Connection Issues**:
```
Error: Redis connection failed
```
**Solution**: Start Redis: `brew services start redis` or `redis-server --daemonize yes`

**4. Out of Memory**:
```
Error: JavaScript heap out of memory
```
**Solution**: Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096" npx ts-node ...`

---

## Next Steps

### After 24-48 Hour Test

1. **Review Results**:
   - Check periodic reports
   - Run comparison analysis
   - Query accuracy metrics
   - Validate success criteria

2. **Generate Final Report**:
   - Compile all metrics
   - Compare with baseline
   - Document improvements
   - Identify any issues

3. **Decision Point**:
   - **If successful**: Deploy to production
   - **If issues found**: Iterate and re-test
   - **If inconclusive**: Extend test duration

4. **Production Deployment**:
   - Update production configuration
   - Deploy optimized detectors
   - Monitor production metrics
   - Set up alerting

---

## Contact

For questions or issues during testing:
- Check logs in `test-reports/` directory
- Review database metrics
- Check RPC failover counts
- Monitor system resources

---

**Status**: Ready for 24-48 hour extended testing  
**Last Updated**: 2025-10-16  
**Next Review**: After test completion

