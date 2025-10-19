# Story 1.3: Gas Fee Alerts - Optimization Plan

**Date**: 2025-10-19
**Story**: Story 1.3 - Gas Fee Alerts (F-003)
**Status**: Optimization Phase
**Author**: AI Agent

---

## 🎯 OPTIMIZATION GOALS

### Primary Goals
1. ✅ Improve error handling and resilience
2. ✅ Add monitoring and observability
3. ✅ Optimize performance
4. ✅ Improve code maintainability

### Success Metrics
- **Error Handling**: 100% coverage for external API calls
- **Monitoring**: CloudWatch metrics for all critical operations
- **Performance**: <30s alert latency, <100ms API response time
- **Code Quality**: 9.5/10 score

---

## 📋 OPTIMIZATION TASKS

### Task 1: Error Handling Improvements (1 hour)

#### 1.1 Add Retry Logic for External APIs
**File**: `gas-price-monitor.service.ts`
**Changes**:
- Add exponential backoff retry logic
- Add circuit breaker pattern
- Add timeout handling
- Add error logging

**Implementation**:
```typescript
// Add retry utility
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Add circuit breaker
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

**Estimated Time**: 30 minutes

---

#### 1.2 Add Timeout Handling
**File**: `gas-price-monitor.service.ts`
**Changes**:
- Add timeout for Etherscan API calls (5s)
- Add timeout for RPC calls (10s)
- Add timeout for Redis operations (1s)

**Implementation**:
```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

// Usage
const gasPriceData = await withTimeout(
  this.fetchFromEtherscan(chain),
  5000,
  'Etherscan API timeout'
);
```

**Estimated Time**: 15 minutes

---

#### 1.3 Add Error Logging
**File**: `gas-price-monitor.service.ts`, `gas-alert.service.ts`, `gas-alert.controller.ts`
**Changes**:
- Add structured logging for all errors
- Add context information (chain, user_id, alert_id)
- Add error categorization (API_ERROR, DB_ERROR, VALIDATION_ERROR)

**Implementation**:
```typescript
// Add logger utility
import { logger } from '../../common/utils/logger';

// Usage
logger.error('Failed to fetch gas price', {
  chain,
  error: error.message,
  stack: error.stack,
  category: 'API_ERROR',
});
```

**Estimated Time**: 15 minutes

---

### Task 2: Monitoring & Observability (1 hour)

#### 2.1 Add CloudWatch Metrics
**File**: `gas-price-monitor.service.ts`, `gas-alert.service.ts`
**Changes**:
- Add metrics for gas price updates
- Add metrics for alert evaluations
- Add metrics for API calls (success/failure)
- Add metrics for cache hits/misses

**Implementation**:
```typescript
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch();

async function publishMetric(
  metricName: string,
  value: number,
  unit: string = 'Count'
) {
  await cloudwatch.putMetricData({
    Namespace: 'DeFiLlama/Premium/GasAlerts',
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
    }],
  }).promise();
}

// Usage
await publishMetric('GasPriceUpdate', 1);
await publishMetric('AlertEvaluation', 1);
await publishMetric('APICallSuccess', 1);
await publishMetric('CacheHit', 1);
```

**Estimated Time**: 30 minutes

---

#### 2.2 Add Performance Tracking
**File**: `gas-price-monitor.service.ts`, `gas-alert.controller.ts`
**Changes**:
- Add timing metrics for all operations
- Add latency tracking for API calls
- Add database query performance tracking

**Implementation**:
```typescript
async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    await publishMetric(`${operation}Duration`, duration, 'Milliseconds');
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    await publishMetric(`${operation}Error`, duration, 'Milliseconds');
    throw error;
  }
}

// Usage
const gasPriceData = await trackPerformance('FetchGasPrice', async () => {
  return await this.fetchFromEtherscan(chain);
});
```

**Estimated Time**: 30 minutes

---

### Task 3: Performance Optimization (30 minutes)

#### 3.1 Optimize Database Queries
**File**: `gas-alert.service.ts`
**Changes**:
- Add database indexes
- Optimize pagination queries
- Add query result caching

**Implementation**:
```sql
-- Add indexes for better query performance
CREATE INDEX idx_alert_rules_user_type ON alert_rules(user_id, type);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled) WHERE enabled = true;
CREATE INDEX idx_alert_rules_created_at ON alert_rules(created_at DESC);
```

**Estimated Time**: 15 minutes

---

#### 3.2 Optimize Redis Operations
**File**: `gas-price-monitor.service.ts`
**Changes**:
- Use Redis pipeline for batch operations
- Optimize cache key structure
- Add cache warming

**Implementation**:
```typescript
// Use pipeline for batch operations
async saveToHistory(chain: string, data: GasPriceData): Promise<void> {
  const pipeline = this.redis.pipeline();
  
  pipeline.zadd(
    `gas:history:${chain}`,
    data.timestamp,
    JSON.stringify(data)
  );
  
  pipeline.zremrangebyscore(
    `gas:history:${chain}`,
    0,
    Date.now() - 7 * 24 * 60 * 60 * 1000
  );
  
  await pipeline.exec();
}
```

**Estimated Time**: 15 minutes

---

### Task 4: Code Quality Improvements (30 minutes)

#### 4.1 Add Input Validation
**File**: `gas-alert.controller.ts`
**Changes**:
- Add request body size limits
- Add rate limiting
- Add input sanitization

**Implementation**:
```typescript
// Add request validation
function validateRequestBody(body: any, maxSize: number = 10000) {
  const bodySize = JSON.stringify(body).length;
  if (bodySize > maxSize) {
    throw new Error(`Request body too large: ${bodySize} bytes`);
  }
}

// Add rate limiting
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(userId: string, maxRequests: number = 100, windowMs: number = 60000) {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];
  
  // Remove old requests
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    throw new Error('Rate limit exceeded');
  }
  
  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
}
```

**Estimated Time**: 15 minutes

---

#### 4.2 Add Documentation
**File**: All files
**Changes**:
- Add JSDoc comments for all public methods
- Add inline comments for complex logic
- Add README for gas alerts module

**Estimated Time**: 15 minutes

---

## 📊 IMPLEMENTATION PLAN

### Phase 1: Error Handling (1 hour)
1. ✅ Add retry logic (30 min)
2. ✅ Add timeout handling (15 min)
3. ✅ Add error logging (15 min)

### Phase 2: Monitoring (1 hour)
1. ✅ Add CloudWatch metrics (30 min)
2. ✅ Add performance tracking (30 min)

### Phase 3: Performance (30 min)
1. ✅ Optimize database queries (15 min)
2. ✅ Optimize Redis operations (15 min)

### Phase 4: Code Quality (30 min)
1. ✅ Add input validation (15 min)
2. ✅ Add documentation (15 min)

**Total Estimated Time**: 3 hours

---

## 🎯 SUCCESS CRITERIA

### Error Handling
- ✅ All external API calls have retry logic
- ✅ All operations have timeout handling
- ✅ All errors are logged with context

### Monitoring
- ✅ CloudWatch metrics for all critical operations
- ✅ Performance tracking for all API endpoints
- ✅ Error rate tracking

### Performance
- ✅ API response time <100ms (p95)
- ✅ Alert latency <30s (p95)
- ✅ Cache hit rate >90%

### Code Quality
- ✅ 100% JSDoc coverage for public methods
- ✅ Input validation for all API endpoints
- ✅ Rate limiting for all API endpoints

---

## 🚀 NEXT STEPS

1. ✅ Implement error handling improvements
2. ✅ Implement monitoring & observability
3. ✅ Implement performance optimizations
4. ✅ Implement code quality improvements
5. ✅ Run tests to verify changes
6. ✅ Update documentation
7. ✅ Call enhanced feedback MCP

---

**Author**: AI Agent
**Date**: 2025-10-19
**Status**: Ready to implement

