# Story 4.1.3: API Integration & Performance Test Plan

**Story ID:** STORY-4.1.3  
**Test Date:** 2025-10-16  
**Status:** ⏳ **PENDING EXECUTION**

---

## 📋 Test Overview

### Test Objectives
1. Verify all 3 REST API endpoints function correctly
2. Validate response formats and data accuracy
3. Test pagination, filtering, and error handling
4. Measure API performance under load
5. Identify optimization opportunities

### Test Environment
- **Server:** Local development (api2-dev)
- **Database:** PostgreSQL (defillama)
- **Port:** Default API2 port
- **Data:** Seed data (10 bots, 20 opportunities, 15 leakage, 10 trends)

---

## 🔌 API Endpoints to Test

### 1. GET /v1/analytics/mev/bots
**Purpose:** List MEV bots with filtering and pagination

**Test Cases:**
- ✅ Basic request (no parameters)
- ✅ Pagination (limit, offset)
- ✅ Filter by chain_id
- ✅ Filter by bot_type
- ✅ Filter by verified status
- ✅ Sort by total_mev_extracted_usd
- ✅ Invalid parameters (error handling)

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "bots": [
      {
        "bot_address": "0x000000000035B5e5ad9019092C665357240f594e",
        "chain_id": "ethereum",
        "bot_name": "Flashbots Alpha",
        "bot_type": "multi-strategy",
        "verified": true,
        "total_mev_extracted_usd": 5250000.00,
        "total_transactions": 1250,
        "success_rate_pct": 90.00,
        "sophistication_score": 95.00
      }
    ],
    "pagination": {
      "total": 10,
      "limit": 10,
      "offset": 0
    }
  }
}
```

### 2. GET /v1/analytics/mev/protocols/:id/leakage
**Purpose:** Get MEV leakage data for a specific protocol

**Test Cases:**
- ✅ Valid protocol_id (uniswap-v3)
- ✅ Date range filtering (start_date, end_date)
- ✅ Chain filtering
- ✅ Invalid protocol_id (404 error)
- ✅ Empty date range (no data)

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "protocol_id": "uniswap-v3",
    "protocol_name": "Uniswap V3",
    "leakage_records": [
      {
        "date": "2025-10-15",
        "chain_id": "ethereum",
        "total_mev_extracted_usd": 285000.00,
        "total_transactions": 12500,
        "affected_transaction_pct": 15.00,
        "leakage_severity": "high",
        "leakage_score": 78.50
      }
    ],
    "summary": {
      "total_mev_7d": 1995000.00,
      "avg_mev_per_day": 285000.00,
      "avg_leakage_score": 78.50
    }
  }
}
```

### 3. GET /v1/analytics/mev/trends
**Purpose:** Get MEV market trends

**Test Cases:**
- ✅ Basic request (default chain)
- ✅ Filter by chain_id
- ✅ Date range filtering
- ✅ Pagination
- ✅ Invalid chain_id (empty result)

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "date": "2025-10-15",
        "chain_id": "ethereum",
        "total_mev_volume_usd": 1250000.00,
        "total_opportunities": 450,
        "unique_bots": 45,
        "execution_rate_pct": 75.50,
        "market_efficiency_score": 82.30
      }
    ],
    "pagination": {
      "total": 7,
      "limit": 10,
      "offset": 0
    }
  }
}
```

---

## 🧪 API Integration Test Script

### Test Execution Steps

1. **Start API Server**
```bash
cd defi
npm run api2-dev
```

2. **Run API Tests**
```bash
npx ts-node --logError --transpile-only test-story-4.1.3-api.ts
```

3. **Verify Results**
- All endpoints return 200 OK
- Response format matches schema
- Data accuracy verified
- Error handling works

---

## ⚡ Performance Test Plan

### Test Scenarios

#### 1. Baseline Performance
**Goal:** Measure single-request performance

**Tests:**
- GET /v1/analytics/mev/bots (10 bots)
- GET /v1/analytics/mev/protocols/uniswap-v3/leakage (7 days)
- GET /v1/analytics/mev/trends (7 days)

**Metrics:**
- Response time (ms)
- Database query time (ms)
- Memory usage (MB)

**Targets:**
- Response time: <200ms (p95)
- Database query: <100ms (p95)
- Memory usage: <50MB per request

#### 2. Load Testing
**Goal:** Test under concurrent load

**Configuration:**
- Concurrent users: 10, 50, 100
- Duration: 60 seconds
- Ramp-up: 10 seconds

**Tests:**
- Mixed endpoint requests
- Random parameters
- Realistic usage patterns

**Metrics:**
- Requests per second (RPS)
- Average response time
- Error rate
- 95th percentile response time

**Targets:**
- RPS: >100
- Avg response time: <300ms
- Error rate: <1%
- P95 response time: <500ms

#### 3. Stress Testing
**Goal:** Find breaking point

**Configuration:**
- Concurrent users: 100, 200, 500
- Duration: 120 seconds
- Ramp-up: 30 seconds

**Metrics:**
- Maximum RPS
- Response time degradation
- Error rate increase
- Resource utilization

#### 4. Endurance Testing
**Goal:** Test stability over time

**Configuration:**
- Concurrent users: 50
- Duration: 30 minutes
- Steady load

**Metrics:**
- Memory leaks
- Connection pool exhaustion
- Response time drift
- Error rate stability

---

## 📊 Performance Test Tools

### Option 1: Artillery (Recommended)
```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
scenarios:
  - name: "MEV API Test"
    flow:
      - get:
          url: "/v1/analytics/mev/bots"
      - get:
          url: "/v1/analytics/mev/protocols/uniswap-v3/leakage"
      - get:
          url: "/v1/analytics/mev/trends"
```

### Option 2: k6
```javascript
// k6-script.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  let res = http.get('http://localhost:3000/v1/analytics/mev/bots');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Option 3: Apache Bench (Simple)
```bash
# Test single endpoint
ab -n 1000 -c 10 http://localhost:3000/v1/analytics/mev/bots

# Test with keep-alive
ab -n 1000 -c 10 -k http://localhost:3000/v1/analytics/mev/bots
```

---

## 📈 Expected Results

### API Integration Tests
- ✅ All 3 endpoints return 200 OK
- ✅ Response format matches schema
- ✅ Data accuracy verified
- ✅ Pagination works correctly
- ✅ Filtering works correctly
- ✅ Error handling works correctly

### Performance Tests
- ✅ Baseline: <200ms response time
- ✅ Load: >100 RPS with <1% error rate
- ✅ Stress: Graceful degradation under load
- ✅ Endurance: No memory leaks or drift

---

## 🎯 Success Criteria

### API Tests
1. ✅ All endpoints return valid responses
2. ✅ Response format matches documentation
3. ✅ Data accuracy verified against database
4. ✅ Error handling works correctly
5. ✅ Pagination and filtering work

### Performance Tests
1. ✅ Response time <200ms (p95)
2. ✅ Throughput >100 RPS
3. ✅ Error rate <1%
4. ✅ No memory leaks
5. ✅ Stable under load

---

## 📝 Test Execution Log

### API Integration Tests
- ⏳ Test 1: GET /v1/analytics/mev/bots
- ⏳ Test 2: GET /v1/analytics/mev/protocols/:id/leakage
- ⏳ Test 3: GET /v1/analytics/mev/trends

### Performance Tests
- ⏳ Baseline performance
- ⏳ Load testing (10-100 users)
- ⏳ Stress testing (100-500 users)
- ⏳ Endurance testing (30 minutes)

---

## 🔧 Optimization Opportunities

### Identified Issues
- TBD after test execution

### Recommended Optimizations
- TBD after test execution

### Implementation Priority
- TBD after test execution

---

**Status:** ⏳ **READY FOR EXECUTION**  
**Next Step:** Start API server and run tests

