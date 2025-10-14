# k6 Load Tests for Advanced Query Processor

Comprehensive performance and load testing suite for the Advanced Query Processor using k6.

## 📋 Overview

This test suite includes 6 different test scenarios to validate the performance, scalability, and reliability of the Advanced Query Processor:

1. **Baseline Performance Test** - Establishes baseline metrics for simple queries
2. **Complex Query Load Test** - Tests filters, aggregations, and GROUP BY queries
3. **Cache Performance Test** - Validates cache hit/miss scenarios and effectiveness
4. **Pagination Load Test** - Tests pagination with different page sizes and deep pagination
5. **Stress & Spike Test** - Finds system limits and tests spike scenarios
6. **Soak Test** - Long-running test to identify memory leaks and stability issues

## 🚀 Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

**Docker:**
```bash
docker pull grafana/k6:latest
```

### Start API Server

Ensure the Advanced Query Processor API is running:

```bash
cd defi
npm run dev
```

The API should be accessible at `http://localhost:3000`.

## 📊 Test Scenarios

### 1. Baseline Performance Test

**Duration:** ~7 minutes  
**Load:** 10 → 50 → 100 VUs  
**Thresholds:**
- P95 response time < 500ms
- P99 response time < 1s
- Error rate < 1%

**Run:**
```bash
k6 run baseline-performance.js
```

**Purpose:** Establishes baseline performance metrics for simple SELECT queries.

---

### 2. Complex Query Load Test

**Duration:** ~9 minutes  
**Load:** 20 → 50 VUs  
**Thresholds:**
- P95 response time < 1s
- P99 response time < 2s
- Error rate < 2%

**Run:**
```bash
k6 run complex-query-load.js
```

**Purpose:** Tests performance of complex queries with filters (AND, OR, IN), aggregations (SUM, AVG, MIN, MAX, COUNT), and GROUP BY operations.

---

### 3. Cache Performance Test

**Duration:** ~5.5 minutes  
**Load:** 10 → 30 VUs  
**Thresholds:**
- P95 response time < 500ms
- Cache hit rate > 50%

**Run:**
```bash
k6 run cache-performance.js
```

**Purpose:** Validates cache effectiveness by testing cache hit/miss scenarios, repeated queries, and different queries.

---

### 4. Pagination Load Test

**Duration:** ~5.5 minutes  
**Load:** 15 → 30 VUs  
**Thresholds:**
- P95 response time < 800ms
- P99 response time < 1.5s

**Run:**
```bash
k6 run pagination-load.js
```

**Purpose:** Tests pagination performance with different page sizes (10, 50, 100 items) and deep pagination (pages 10, 50, 100).

---

### 5. Stress & Spike Test

**Duration:** ~17 minutes  
**Load:** 50 → 100 → 200 → 300 → 500 VUs (spike)  
**Thresholds:**
- P95 response time < 2s
- P99 response time < 5s
- Error rate < 5%

**Run:**
```bash
k6 run stress-spike.js
```

**Purpose:** Finds system breaking point by gradually increasing load, then tests sudden spike scenarios and recovery.

---

### 6. Soak Test

**Duration:** ~34 minutes  
**Load:** 50 VUs sustained for 30 minutes  
**Thresholds:**
- P95 response time < 1s
- P99 response time < 2s
- Error rate < 2%

**Run:**
```bash
k6 run soak-test.js
```

**Purpose:** Identifies memory leaks, resource exhaustion, and long-term stability issues.

## 🎯 Running Tests

### Using Test Runner Script

The easiest way to run tests is using the provided script:

```bash
chmod +x run-tests.sh
./run-tests.sh
```

This will present a menu to select which test(s) to run.

### Running Individual Tests

```bash
# Set API URL (optional, defaults to http://localhost:3000)
export API_URL=http://localhost:3000

# Run specific test
k6 run baseline-performance.js
k6 run complex-query-load.js
k6 run cache-performance.js
k6 run pagination-load.js
k6 run stress-spike.js
k6 run soak-test.js
```

### Running with Docker

```bash
docker run --rm -i --network=host \
  -v $(pwd):/tests \
  grafana/k6:latest run /tests/baseline-performance.js
```

## 📈 Analyzing Results

### HTML Reports

Each test generates an HTML report in the current directory:
- `baseline-performance-report.html`
- `complex-query-load-report.html`
- `cache-performance-report.html`
- `pagination-load-report.html`
- `stress-spike-report.html`
- `soak-test-report.html`

Open these files in a browser to view detailed metrics and visualizations.

### JSON Results

JSON results are saved to `./results/` directory:
- `baseline-performance-results.json`
- `complex-query-load-results.json`
- etc.

### Key Metrics to Monitor

1. **Response Time Percentiles:**
   - P50 (median)
   - P95 (95th percentile)
   - P99 (99th percentile)

2. **Error Rates:**
   - HTTP 4xx errors
   - HTTP 5xx errors
   - Custom error rate

3. **Throughput:**
   - Requests per second
   - Data transferred

4. **Cache Metrics:**
   - Cache hit rate
   - Cache miss rate

5. **Custom Metrics:**
   - Query duration
   - Request counter

## 🔧 Configuration

### Environment Variables

- `API_URL`: API endpoint URL (default: `http://localhost:3000`)

### Modifying Thresholds

Edit the `options.thresholds` object in each test file:

```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    // Add more thresholds...
  },
};
```

### Adjusting Load Patterns

Modify the `options.stages` array:

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 VUs
    { duration: '1m', target: 10 },   // Stay at 10 VUs
    // Add more stages...
  ],
};
```

## 📝 Best Practices

1. **Start Small:** Begin with baseline tests before running stress tests
2. **Monitor Resources:** Watch CPU, memory, and database connections during tests
3. **Warm Up:** Run a quick test first to warm up caches and connections
4. **Isolate Tests:** Run tests on a dedicated environment, not production
5. **Analyze Trends:** Compare results over time to detect performance regressions
6. **Document Findings:** Record baseline metrics and any issues discovered

## 🐛 Troubleshooting

### Connection Refused

Ensure the API server is running:
```bash
curl http://localhost:3000/health
```

### High Error Rates

- Check API logs for errors
- Verify database is running and accessible
- Check Redis is running (for cache tests)
- Reduce load (lower VU count)

### Slow Response Times

- Check database query performance
- Verify indexes are created
- Monitor database connection pool
- Check Redis performance

## 📚 Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/api-load-testing/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)

