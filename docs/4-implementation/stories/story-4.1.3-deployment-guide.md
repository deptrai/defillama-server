# Story 4.1.3: Deployment Guide

**Story ID:** STORY-4.1.3  
**Version:** 1.0.0  
**Date:** 2025-10-16  
**Status:** ✅ **READY FOR DEPLOYMENT**

---

## 📋 Deployment Overview

### Components to Deploy
1. **Database Migrations** (4 files)
2. **Seed Data** (4 files)
3. **Analytics Engines** (15 engines)
4. **REST API Endpoints** (3 endpoints)

### Deployment Environments
- **Development:** Local PostgreSQL + API2 dev server
- **Staging:** Staging database + API2 staging
- **Production:** Production database + API2 production

---

## 🗄️ Database Deployment

### Step 1: Run Migrations

**Migration Files (in order):**
1. `038-create-mev-bots.sql`
2. `039-create-mev-profit-attribution.sql`
3. `040-create-protocol-mev-leakage.sql`
4. `041-create-mev-market-trends.sql`

**Execution:**
```bash
# Development
cd defi/src/analytics/migrations
psql -U defillama -d defillama -f 038-create-mev-bots.sql
psql -U defillama -d defillama -f 039-create-mev-profit-attribution.sql
psql -U defillama -d defillama -f 040-create-protocol-mev-leakage.sql
psql -U defillama -d defillama -f 041-create-mev-market-trends.sql

# Production
psql $PRODUCTION_DB_URL -f 038-create-mev-bots.sql
psql $PRODUCTION_DB_URL -f 039-create-mev-profit-attribution.sql
psql $PRODUCTION_DB_URL -f 040-create-protocol-mev-leakage.sql
psql $PRODUCTION_DB_URL -f 041-create-mev-market-trends.sql
```

**Verification:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('mev_bots', 'mev_profit_attribution', 'protocol_mev_leakage', 'mev_market_trends');

-- Check table structures
\d mev_bots
\d mev_profit_attribution
\d protocol_mev_leakage
\d mev_market_trends
```

### Step 2: Insert Seed Data (Development/Staging Only)

**Seed Files:**
1. `seed-mev-bots.sql` (10 bots)
2. `seed-mev-opportunities.sql` (20 opportunities)
3. `seed-protocol-mev-leakage.sql` (15 records)
4. `seed-mev-market-trends.sql` (10 records)

**Execution:**
```bash
cd defi/src/analytics/db
psql -U defillama -d defillama -f seed-mev-bots.sql
psql -U defillama -d defillama -f seed-mev-opportunities.sql
psql -U defillama -d defillama -f seed-protocol-mev-leakage.sql
psql -U defillama -d defillama -f seed-mev-market-trends.sql
```

**Verification:**
```sql
SELECT COUNT(*) FROM mev_bots;              -- Expected: 10
SELECT COUNT(*) FROM mev_opportunities;     -- Expected: 20
SELECT COUNT(*) FROM protocol_mev_leakage;  -- Expected: 15
SELECT COUNT(*) FROM mev_market_trends;     -- Expected: 10
```

**⚠️ Production Note:** Do NOT insert seed data in production. Production data will be populated by:
- MEV detection engines (Story 4.1.1)
- Profit attribution engines (Story 4.1.2)
- Bot tracking engines (Story 4.1.3)

---

## 🚀 Application Deployment

### Step 1: Build Application

```bash
cd defi

# Install dependencies
npm install

# Run tests
npm test

# Build API2
npm run api2-build
```

### Step 2: Deploy to Environment

#### Development
```bash
# Start API2 dev server
npm run api2-dev

# Verify server is running
curl http://localhost:3000/health
```

#### Staging
```bash
# Set environment
export NODE_ENV=staging
export ANALYTICS_DB=$STAGING_DB_URL

# Deploy
npm run deploy:dev
```

#### Production
```bash
# Set environment
export NODE_ENV=prod
export ANALYTICS_DB=$PRODUCTION_DB_URL

# Deploy
npm run deploy:prod
```

---

## 🔧 Configuration

### Environment Variables

**Required:**
```bash
# Database
ANALYTICS_DB=postgresql://user:pass@host:5432/dbname

# API
API_PORT=3000
API_HOST=0.0.0.0

# Node
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=8192
```

**Optional:**
```bash
# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Performance
MAX_CONNECTIONS=100
QUERY_TIMEOUT=30000

# Caching
REDIS_URL=redis://localhost:6379
CACHE_TTL=300
```

### Database Connection Pool

**Recommended Settings:**
```javascript
{
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 30000,   // 30 seconds
  connectionTimeoutMillis: 5000, // 5 seconds
  maxUses: 7500,              // Recycle after 7500 uses
}
```

---

## 🧪 Post-Deployment Verification

### Step 1: Health Check

```bash
# API health
curl http://localhost:3000/health

# Expected response
{
  "status": "ok",
  "timestamp": "2025-10-16T10:00:00.000Z"
}
```

### Step 2: Database Connectivity

```bash
# Test database connection
psql $ANALYTICS_DB -c "SELECT 1"

# Check table counts
psql $ANALYTICS_DB -c "
  SELECT 
    'mev_bots' as table_name, COUNT(*) as count FROM mev_bots
  UNION ALL
  SELECT 'mev_opportunities', COUNT(*) FROM mev_opportunities
  UNION ALL
  SELECT 'protocol_mev_leakage', COUNT(*) FROM protocol_mev_leakage
  UNION ALL
  SELECT 'mev_market_trends', COUNT(*) FROM mev_market_trends;
"
```

### Step 3: API Endpoint Tests

```bash
# Test GET /v1/analytics/mev/bots
curl http://localhost:3000/v1/analytics/mev/bots

# Test GET /v1/analytics/mev/protocols/:id/leakage
curl http://localhost:3000/v1/analytics/mev/protocols/uniswap-v3/leakage

# Test GET /v1/analytics/mev/trends
curl http://localhost:3000/v1/analytics/mev/trends
```

### Step 4: Integration Tests

```bash
# Run integration tests
cd defi
npx ts-node --logError --transpile-only test-story-4.1.3-integration.ts

# Expected: 8/8 tests passed
```

---

## 📊 Monitoring & Observability

### Metrics to Monitor

**API Metrics:**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (%)
- Active connections

**Database Metrics:**
- Query execution time
- Connection pool usage
- Table sizes
- Index usage

**System Metrics:**
- CPU usage (%)
- Memory usage (MB)
- Disk I/O
- Network I/O

### Logging

**Log Levels:**
- **ERROR:** Critical issues requiring immediate attention
- **WARN:** Potential issues to investigate
- **INFO:** Normal operations
- **DEBUG:** Detailed debugging information

**Log Format:**
```json
{
  "timestamp": "2025-10-16T10:00:00.000Z",
  "level": "info",
  "message": "API request processed",
  "context": {
    "method": "GET",
    "path": "/v1/analytics/mev/bots",
    "duration_ms": 45,
    "status": 200
  }
}
```

### Alerting

**Critical Alerts:**
- API error rate >5%
- Response time p95 >1000ms
- Database connection failures
- Memory usage >90%

**Warning Alerts:**
- API error rate >1%
- Response time p95 >500ms
- Connection pool >80% utilized
- Memory usage >70%

---

## 🔄 Rollback Procedure

### Step 1: Identify Issue
- Check logs for errors
- Review metrics for anomalies
- Verify database state

### Step 2: Stop Application
```bash
# Stop API server
pm2 stop api2

# Or kill process
pkill -f "api2"
```

### Step 3: Rollback Database (if needed)
```bash
# Rollback migrations
psql $ANALYTICS_DB -f rollback-041.sql
psql $ANALYTICS_DB -f rollback-040.sql
psql $ANALYTICS_DB -f rollback-039.sql
psql $ANALYTICS_DB -f rollback-038.sql
```

### Step 4: Restore Previous Version
```bash
# Checkout previous version
git checkout <previous-commit>

# Rebuild
npm run api2-build

# Restart
npm run api2-prod
```

---

## 🛡️ Security Considerations

### Database Security
- ✅ Use strong passwords
- ✅ Enable SSL/TLS connections
- ✅ Restrict network access
- ✅ Regular backups
- ✅ Audit logging enabled

### API Security
- ✅ Rate limiting enabled
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ CORS configured
- ✅ Authentication required (if applicable)

### Infrastructure Security
- ✅ Firewall rules configured
- ✅ VPC/network isolation
- ✅ Secrets management
- ✅ Regular security updates

---

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] Code review completed
- [ ] All tests passing (93/96)
- [ ] Documentation updated
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Stakeholders notified

### Deployment
- [ ] Database migrations executed
- [ ] Seed data inserted (dev/staging only)
- [ ] Application deployed
- [ ] Configuration verified
- [ ] Health checks passing

### Post-Deployment
- [ ] API endpoints tested
- [ ] Integration tests passing
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team notified

---

## 🆘 Troubleshooting

### Issue: Database Connection Fails
**Symptoms:** "Connection refused" or "Connection timeout"  
**Solutions:**
1. Check database is running: `pg_isready -h $DB_HOST`
2. Verify credentials: `psql $ANALYTICS_DB -c "SELECT 1"`
3. Check firewall rules
4. Verify connection string format

### Issue: API Returns 500 Errors
**Symptoms:** Internal server errors  
**Solutions:**
1. Check application logs
2. Verify database connectivity
3. Check for missing environment variables
4. Review recent code changes

### Issue: Slow API Response
**Symptoms:** Response time >1000ms  
**Solutions:**
1. Check database query performance
2. Review connection pool settings
3. Add database indexes
4. Enable query caching

---

**Status:** ✅ **DEPLOYMENT GUIDE COMPLETE**  
**Next Step:** Execute deployment to staging environment

