# 🔗 Blockchain Integration Guide

**Date**: 2025-10-16  
**Status**: ✅ IMPLEMENTED  
**Version**: 1.0.0

---

## 📋 Overview

This guide explains how to integrate real-time blockchain data into the MEV detection system. The integration enables:

- **Real-time MEV detection** from live blockchain data
- **Mempool monitoring** for pending transactions
- **Block listener** for confirmed transactions
- **Multi-chain support** (Ethereum, Arbitrum, Optimism, BSC, Polygon)
- **Automatic data ingestion** into PostgreSQL database

---

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Blockchain Networks                       │
│  (Ethereum, Arbitrum, Optimism, BSC, Polygon)               │
└────────────────────┬────────────────────────────────────────┘
                     │ WebSocket RPC
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Blockchain Listener Service                     │
│  - Block monitoring                                          │
│  - Mempool monitoring                                        │
│  - Transaction parsing                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                MEV Detection Engines                         │
│  - Sandwich Detector                                         │
│  - Frontrun Detector                                         │
│  - Arbitrage Detector                                        │
│  - Liquidation Detector                                      │
│  - Backrun Detector                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                             │
│  - mev_opportunities                                         │
│  - mev_bots                                                  │
│  - protocol_mev_leakage                                      │
│  - mev_market_trends                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites

**Required:**
- Node.js 20.x
- PostgreSQL 15+
- Redis 7+
- WebSocket RPC endpoints

**Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/defillama

# RPC Endpoints (WebSocket preferred)
ETHEREUM_RPC=wss://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC=wss://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
OPTIMISM_RPC=wss://opt-mainnet.g.alchemy.com/v2/YOUR_KEY
BSC_RPC=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_KEY
POLYGON_RPC=wss://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### 2. Start Ingestion Service

**Option A: CLI Command**
```bash
# Start all chains
npx ts-node start-mev-ingestion.ts

# Start specific chain
npx ts-node start-mev-ingestion.ts --chain ethereum

# Test mode (60 seconds)
npx ts-node start-mev-ingestion.ts --test --duration 60
```

**Option B: API Endpoint**
```bash
# Start service
curl -X POST http://localhost:6060/v1/analytics/mev/ingestion/start

# Check status
curl http://localhost:6060/v1/analytics/mev/ingestion/status

# Stop service
curl -X POST http://localhost:6060/v1/analytics/mev/ingestion/stop
```

**Option C: Programmatic**
```typescript
import { mevIngestionService } from './src/analytics/services/mev-ingestion-service';

// Start service
await mevIngestionService.start();

// Get status
const status = mevIngestionService.getStatus();
console.log(status);

// Stop service
await mevIngestionService.stop();
```

---

## 📊 Data Flow

### 1. Block Detection
```
New Block → Blockchain Listener → MEV Detectors → Database
```

**Process:**
1. WebSocket receives new block event
2. Fetch block with transactions
3. Run all MEV detectors in parallel
4. Store detected opportunities in database
5. Update bot tracking and analytics

### 2. Mempool Monitoring
```
Pending TX → Blockchain Listener → MEV Protection Analysis → Cache
```

**Process:**
1. WebSocket receives pending transaction
2. Analyze transaction vulnerability
3. Cache analysis results (Redis)
4. Available for real-time protection API

---

## 🔧 Configuration

### Chain Configuration

**File:** `src/analytics/services/mev-ingestion-service.ts`

```typescript
const chains: ChainConfig[] = [
  {
    chainId: 'ethereum',
    rpcUrl: 'wss://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    enableMempool: true,  // Enable mempool monitoring
    enableBlocks: true,   // Enable block monitoring
  },
  {
    chainId: 'arbitrum',
    rpcUrl: 'wss://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
    enableMempool: false, // L2s have different mempool
    enableBlocks: true,
  },
];
```

### Detector Configuration

**File:** `src/analytics/services/blockchain-listener.ts`

```typescript
// Customize detection parameters
const detectors = {
  sandwich: SandwichDetector.getInstance(),
  frontrun: FrontrunDetector.getInstance(),
  arbitrage: ArbitrageDetector.getInstance(),
  liquidation: LiquidationDetector.getInstance(),
  backrun: BackrunDetector.getInstance(),
};
```

---

## 📡 API Endpoints

### Ingestion Control

**GET /v1/analytics/mev/ingestion/status**
```bash
curl http://localhost:6060/v1/analytics/mev/ingestion/status
```

**Response:**
```json
{
  "service": "MEV Data Ingestion",
  "status": "running",
  "active_chains": ["ethereum", "arbitrum"],
  "listeners": {
    "ethereum": {
      "isRunning": true,
      "enableMempool": true,
      "enableBlocks": true
    }
  }
}
```

**POST /v1/analytics/mev/ingestion/start**
```bash
curl -X POST http://localhost:6060/v1/analytics/mev/ingestion/start
```

**POST /v1/analytics/mev/ingestion/stop**
```bash
curl -X POST http://localhost:6060/v1/analytics/mev/ingestion/stop
```

**POST /v1/analytics/mev/ingestion/restart/:chain**
```bash
curl -X POST http://localhost:6060/v1/analytics/mev/ingestion/restart/ethereum
```

---

## 🧪 Testing

### Test Mode

```bash
# Run for 2 minutes
npx ts-node start-mev-ingestion.ts --test --duration 120
```

### Verify Data Ingestion

```sql
-- Check recent opportunities
SELECT 
  chain_id,
  opportunity_type,
  COUNT(*) as count,
  MAX(detected_at) as latest
FROM mev_opportunities
WHERE detected_at > NOW() - INTERVAL '1 hour'
GROUP BY chain_id, opportunity_type;

-- Check bot activity
SELECT 
  chain_id,
  COUNT(DISTINCT bot_address) as unique_bots,
  SUM(total_mev_extracted_usd) as total_mev
FROM mev_bots
WHERE last_active > NOW() - INTERVAL '1 hour'
GROUP BY chain_id;
```

---

## 🔍 Monitoring

### Health Checks

```bash
# Service status
curl http://localhost:6060/v1/analytics/mev/ingestion/status

# Database health
docker exec -i chainlens-postgres psql -U defillama -d defillama -c "
  SELECT COUNT(*) FROM mev_opportunities 
  WHERE detected_at > NOW() - INTERVAL '5 minutes';"
```

### Logs

```bash
# View ingestion logs
tail -f logs/mev-ingestion.log

# View API logs
tail -f logs/api2.log
```

---

## ⚠️ Troubleshooting

### Issue: WebSocket Connection Fails

**Symptoms:**
```
Error: WebSocket connection failed
```

**Solutions:**
1. Check RPC endpoint is WebSocket (wss://)
2. Verify API key is valid
3. Check firewall allows WebSocket connections
4. Try alternative RPC provider

### Issue: No Data Ingested

**Symptoms:**
- Service running but no opportunities detected
- Database tables empty

**Solutions:**
1. Check RPC endpoint is responding
2. Verify detectors are configured correctly
3. Check database connection
4. Review logs for errors

### Issue: High Memory Usage

**Symptoms:**
- Memory usage increasing over time
- Service crashes with OOM error

**Solutions:**
1. Reduce number of active chains
2. Disable mempool monitoring
3. Increase batch size
4. Add memory limits to Docker

---

## 📈 Performance

### Expected Metrics

| Metric | Value |
|--------|-------|
| Block processing time | <1 second |
| Mempool tx processing | <100ms |
| Opportunities per block | 5-20 |
| Memory usage | 500MB-2GB |
| CPU usage | 20-40% |

### Optimization Tips

1. **Use WebSocket RPC** - Faster than HTTP polling
2. **Enable Redis caching** - Reduce database load
3. **Batch database writes** - Improve throughput
4. **Limit mempool monitoring** - Only for high-value chains
5. **Use archive nodes** - For historical data

---

## 🔐 Security

### Best Practices

1. **Secure RPC endpoints** - Use private endpoints
2. **Rate limiting** - Prevent API abuse
3. **Access control** - Restrict ingestion API
4. **Monitoring** - Alert on anomalies
5. **Backup** - Regular database backups

---

## 📚 References

- [Ethers.js Documentation](https://docs.ethers.org/)
- [MEV Detection Patterns](./tech-spec-phase-4-mev-detection.md)
- [Database Schema](../3-solutioning/database-schema.md)
- [API Documentation](./api-documentation.md)

---

**Status**: ✅ READY FOR PRODUCTION  
**Next Steps**: Deploy to staging, monitor performance, scale as needed

