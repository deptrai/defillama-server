# Technical Specification: EPIC-4 Gas & Trading Optimization

**Document Version**: 1.0  
**Date**: 2025-10-17  
**Status**: Draft for Review  
**EPIC ID**: EPIC-4  
**EPIC Name**: Gas & Trading Optimization System

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-17 | Winston (Architect) | Initial draft |

---

## 1. OVERVIEW

### 1.1 EPIC Summary

**EPIC-4: Gas & Trading Optimization** provides gas fee optimization, DEX aggregation, yield farming, cross-chain bridging, and copy trading for optimal trading.

**Business Value**: $3.75M ARR (15% of total)
**Story Points**: 191 points
**Timeline**: Q2 2026 (Months 7-9, 28 weeks)
**Priority**: P1 (High)

### 1.2 Features (9 Features)

| Feature ID | Feature Name | Story Points | Timeline |
|------------|--------------|--------------|----------|
| F-013 | Gas Fee Optimizer (Gas Prediction) | 21 | Week 1-3 |
| F-013b | Gas Optimization (Batching & Timing) | 21 | Week 4-6 |
| F-014 | Transaction Simulator | 22 | Week 7-9 |
| F-015 | Smart Order Routing | 34 | Week 10-12 |
| F-015b | MEV Protection | 21 | Week 13-14 |
| F-015c | Limit Orders | 21 | Week 15-16 |
| F-016 | Yield Farming Calculator | 13 | Week 17-19 |
| F-017 | Cross-Chain Bridge Aggregator | 21 | Week 20-23 |
| F-018 | Copy Trading Beta | 17 | Week 24-28 |

### 1.3 Success Metrics

- **Gas Savings**: 20% average gas savings
- **Trade Execution**: 95% success rate
- **Slippage**: <1% average slippage
- **MEV Protection**: 80% MEV attack prevention
- **User Adoption**: 50% of premium users use gas optimization

---

## 2. ARCHITECTURE

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              GAS & TRADING SERVICE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Gas          │  │ DEX          │  │ Slippage     │     │
│  │ Predictor    │  │ Aggregator   │  │ Calculator   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ ML Model     │  │ Route        │  │ MEV          │     │
│  │ (Gas Pred)   │  │ Optimizer    │  │ Protector    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │ Redis Cache  │  │ DEX APIs     │     │
│  │ (Partitioned)│  │              │  │ (1inch, etc) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. DATA MODEL

### 3.1 Database Schema (✅ ALIGNED WITH EXISTING PATTERN - PostgreSQL)

**Based on**: `defi/src/alerts/db.ts` (existing database pattern)

**⚠️ IMPORTANT**: Using **PostgreSQL** (NOT TimescaleDB) - consistent with existing infrastructure

```sql
-- Gas Predictions (Time-Series Data in PostgreSQL)
CREATE TABLE gas_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id VARCHAR(50) NOT NULL,
  prediction_timestamp TIMESTAMP NOT NULL,

  -- Current gas prices
  current_gas_price_gwei NUMERIC(10, 2) NOT NULL,
  current_base_fee NUMERIC(10, 2),
  current_priority_fee NUMERIC(10, 2),

  -- Predicted gas prices
  predicted_gas_price_gwei NUMERIC(10, 2) NOT NULL,
  predicted_base_fee NUMERIC(10, 2),
  predicted_priority_fee NUMERIC(10, 2),

  -- Optimal timing
  optimal_time TIMESTAMP NOT NULL,
  savings_percent NUMERIC(5, 2),

  -- Prediction confidence
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for time-series queries
CREATE INDEX idx_gas_predictions_chain_id ON gas_predictions(chain_id);
CREATE INDEX idx_gas_predictions_timestamp ON gas_predictions(prediction_timestamp DESC);
CREATE INDEX idx_gas_predictions_chain_timestamp ON gas_predictions(chain_id, prediction_timestamp DESC);

-- PostgreSQL partitioning (NOT TimescaleDB)
CREATE TABLE gas_predictions_2025_10 PARTITION OF gas_predictions
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Trade Routes
CREATE TABLE trade_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- String user ID (not UUID reference)

  -- Trade details
  chain_id VARCHAR(50) NOT NULL,
  token_in_symbol VARCHAR(100) NOT NULL,
  token_in_address VARCHAR(255) NOT NULL,
  token_out_symbol VARCHAR(100) NOT NULL,
  token_out_address VARCHAR(255) NOT NULL,

  -- Amounts
  amount_in NUMERIC(36, 18) NOT NULL,
  amount_out NUMERIC(36, 18) NOT NULL,
  amount_out_min NUMERIC(36, 18),

  -- Route details (JSONB)
  route JSONB NOT NULL,
  dex_protocols TEXT[], -- ['Uniswap', 'SushiSwap', ...]

  -- Costs & slippage
  gas_estimate_gwei NUMERIC(10, 2) NOT NULL,
  gas_cost_usd NUMERIC(10, 4),
  slippage_percent NUMERIC(5, 2) NOT NULL,
  price_impact_percent NUMERIC(5, 2),

  -- MEV protection
  mev_protected BOOLEAN DEFAULT false,
  flashbots_bundle BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'executed',
    'failed',
    'expired'
  )),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_trade_routes_user_id ON trade_routes(user_id);
CREATE INDEX idx_trade_routes_chain_id ON trade_routes(chain_id);
CREATE INDEX idx_trade_routes_status ON trade_routes(status);
CREATE INDEX idx_trade_routes_created_at ON trade_routes(created_at DESC);

-- Limit Orders
CREATE TABLE limit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,

  -- Order details
  chain_id VARCHAR(50) NOT NULL,
  token_in_symbol VARCHAR(100) NOT NULL,
  token_in_address VARCHAR(255) NOT NULL,
  token_out_symbol VARCHAR(100) NOT NULL,
  token_out_address VARCHAR(255) NOT NULL,

  -- Amounts
  amount_in NUMERIC(36, 18) NOT NULL,
  target_price NUMERIC(20, 8) NOT NULL,

  -- Order configuration
  order_type VARCHAR(20) CHECK (order_type IN ('limit', 'stop_loss', 'take_profit')),
  slippage_tolerance NUMERIC(5, 2) DEFAULT 0.5,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'active',
    'filled',
    'cancelled',
    'expired'
  )),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  filled_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_limit_orders_user_id ON limit_orders(user_id);
CREATE INDEX idx_limit_orders_status ON limit_orders(status);
CREATE INDEX idx_limit_orders_chain_id ON limit_orders(chain_id);

-- Yield Farming Opportunities
CREATE TABLE yield_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Protocol details
  protocol_name VARCHAR(255) NOT NULL,
  pool_name VARCHAR(255) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  pool_address VARCHAR(255) NOT NULL,

  -- Tokens
  token_symbols TEXT[] NOT NULL,
  token_addresses TEXT[] NOT NULL,

  -- APY/APR
  apy NUMERIC(10, 4) NOT NULL,
  apr NUMERIC(10, 4),

  -- TVL
  tvl_usd NUMERIC(20, 2),

  -- Risk score
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),

  -- Timestamps
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_yield_opportunities_chain_id ON yield_opportunities(chain_id);
CREATE INDEX idx_yield_opportunities_apy ON yield_opportunities(apy DESC);
CREATE INDEX idx_yield_opportunities_protocol ON yield_opportunities(protocol_name);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_yield_opportunities_updated_at
BEFORE UPDATE ON yield_opportunities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Key Differences from Original**:
1. ✅ **PostgreSQL** (NOT TimescaleDB) - consistent with existing infrastructure
2. ✅ **user_id**: `VARCHAR(255)` (not UUID reference) - follows existing pattern
3. ✅ **Specific naming**: `chain_id`, `token_in_symbol`, `prediction_timestamp`, `current_gas_price_gwei`
4. ✅ **High precision**: `NUMERIC(36, 18)` for amounts, `NUMERIC(10, 2)` for gas prices
5. ✅ **Added limit_orders**: NEW table for limit orders feature
6. ✅ **Added yield_opportunities**: NEW table for yield farming calculator
7. ✅ **Native partitioning**: PostgreSQL partitioning (not TimescaleDB hypertables)
8. ✅ **Removed TimescaleDB functions**: No `create_hypertable`, `add_retention_policy`
9. ✅ **Added MEV protection fields**: `mev_protected`, `flashbots_bundle`
10. ✅ **Added status tracking**: Track order/route status

---

## 4. API SPECIFICATION

### 4.1 REST API Endpoints

**Get Gas Estimate** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
GET /v2/premium/gas/estimate?chain_id=ethereum
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "chain_id": "ethereum",
    "current_gas_price_gwei": 30.00,
    "current_base_fee": 25.00,
    "current_priority_fee": 5.00,
    "predicted_gas_price_gwei": 25.00,
    "predicted_base_fee": 20.00,
    "predicted_priority_fee": 5.00,
    "optimal_time": "2025-10-17T12:00:00Z",
    "savings_percent": 16.67,
    "confidence": 0.85,
    "prediction_timestamp": "2025-10-17T10:00:00Z"
  }
}
```

**Get Trade Routes** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
POST /v2/premium/trading/routes
Authorization: Bearer <JWT>

Request Body:
{
  "chain": "ethereum",
  "tokenIn": "ETH",
  "tokenOut": "USDC",
  "amountIn": 1
}

Response (200 OK):
{
  "success": true,
  "data": {
    "routes": [
      {
        "dex": "Uniswap V3",
        "amountOut": 2000,
        "gasEstimate": 150000,
        "slippage": 0.5
      },
      {
        "dex": "1inch",
        "amountOut": 2010,
        "gasEstimate": 180000,
        "slippage": 0.3
      }
    ],
    "bestRoute": {
      "dex": "1inch",
      "amountOut": 2010,
      "gasEstimate": 180000,
      "slippage": 0.3
    }
  }
}
```

**Simulate Trade**:
```
POST /v2/premium/trading/simulate
Authorization: Bearer <JWT>

Request Body:
{
  "chain": "ethereum",
  "tokenIn": "ETH",
  "tokenOut": "USDC",
  "amountIn": 1,
  "route": { ... }
}

Response (200 OK):
{
  "success": true,
  "data": {
    "amountOut": 2010,
    "gasEstimate": 180000,
    "slippage": 0.3,
    "priceImpact": 0.1,
    "mevRisk": "low"
  }
}
```

---

## 5. IMPLEMENTATION DETAILS

### 5.1 Technology Stack

- **Framework**: NestJS 10.3+
- **ML Model**: TensorFlow.js (gas prediction)
- **DEX APIs**: 1inch, Uniswap, Sushiswap
- **Database**: PostgreSQL 16+ (with native partitioning)
- **Cache**: Redis 7+

### 5.2 Key Classes

**GasPredictorService**:
```typescript
@Injectable()
export class GasPredictorService {
  async predictGasPrice(chain: string): Promise<GasPrediction> {
    // Use ML model to predict gas price
  }
}
```

### 5.3 ML Model Training Details

**Gas Prediction Model**:

**Model Architecture**:
- **Type**: LSTM (Long Short-Term Memory) neural network
- **Framework**: TensorFlow.js 4.15+
- **Model Structure**:
  - **Input Layer**: 10 features × 24 timesteps (last 24 hours)
  - **LSTM Layer 1**: 128 units, return_sequences=True, dropout=0.2
  - **LSTM Layer 2**: 64 units, return_sequences=False, dropout=0.2
  - **Dense Layer 1**: 32 units, activation='relu', dropout=0.1
  - **Output Layer**: 3 units (low, medium, high gas price predictions)
  - **Total Parameters**: ~150K parameters
  - **Model Size**: ~2.5 MB (compressed)

**Input Features** (10 features):
  1. **Current gas price** (gwei) - Normalized [0, 1]
  2. **Block number** - Normalized [0, 1]
  3. **Block timestamp** - Unix timestamp
  4. **Pending transactions count** - Normalized [0, 1]
  5. **Network utilization** (%) - Normalized [0, 1]
  6. **Time of day** (hour) - Cyclical encoding (sin/cos)
  7. **Day of week** - One-hot encoding (7 dimensions)
  8. **Historical gas prices** (last 24 hours) - Rolling window
  9. **Network congestion score** (0-100) - Normalized [0, 1]
  10. **MEV activity score** (0-100) - Normalized [0, 1]

**Training Data**:
- **Source**:
  - Primary: Etherscan API (historical gas prices)
  - Secondary: Blocknative API (real-time gas prices)
  - Tertiary: Infura/Alchemy (block data)
- **Time Range**: Last 12 months (365 days)
- **Data Points**: ~8.7M data points (1 per block × 7,200 blocks/day × 365 days)
- **Data Size**: ~2.5 GB (raw), ~500 MB (preprocessed)
- **Update Frequency**: Retrain weekly with new data (every Sunday 00:00 UTC)
- **Data Retention**: Keep last 24 months for retraining

**Data Preprocessing**:
1. **Missing Value Handling**:
   - Forward fill for gas prices (use last known value)
   - Interpolation for block timestamps
   - Drop rows with >20% missing features
2. **Outlier Removal**:
   - Remove gas prices >99th percentile (extreme spikes)
   - Remove gas prices <1st percentile (anomalies)
   - Use IQR method (Interquartile Range)
3. **Feature Normalization**:
   - Min-Max scaling for continuous features [0, 1]
   - Cyclical encoding for time features (sin/cos)
   - One-hot encoding for categorical features
4. **Sequence Creation**:
   - Create sequences of 24 timesteps (last 24 hours)
   - Sliding window with 1-hour stride
   - Target: Next hour gas price (low, medium, high)

**Model Training**:
- **Train/Validation/Test Split**: 70/15/15
- **Batch Size**: 256
- **Epochs**: 50 (with early stopping)
- **Optimizer**: Adam (learning_rate=0.001, beta_1=0.9, beta_2=0.999)
- **Loss Function**: Mean Squared Error (MSE)
- **Metrics**: MAE, RMSE, MAPE (Mean Absolute Percentage Error)
- **Early Stopping**: Patience=5 epochs (monitor validation loss)
- **Learning Rate Scheduler**: ReduceLROnPlateau (factor=0.5, patience=3)
- **Training Time**: ~45-60 minutes per training run (ECS Fargate, 4 vCPU, 8 GB RAM)

**Model Performance**:
- **Accuracy**: 75-80% (within 10% of actual gas price)
- **MAE (Mean Absolute Error)**: 3-5 gwei
- **RMSE (Root Mean Square Error)**: 5-8 gwei
- **MAPE (Mean Absolute Percentage Error)**: 8-12%
- **R² Score**: 0.85-0.90 (excellent fit)
- **Inference Time**: <100ms per prediction (p95), <50ms (p50)
- **Throughput**: 10K predictions/second (Lambda)

**Model Evaluation**:
- **Validation Set**: 15% of data (last 2 months)
- **Test Set**: 15% of data (last 1 month)
- **Cross-Validation**: 5-fold time-series cross-validation
- **Metrics Tracking**: MLflow (experiment tracking)
- **Model Versioning**: S3 (model artifacts)
- **A/B Testing**: Compare new model vs current model (1 week)

**Training Process**:
1. **Data Collection** (10 minutes):
   - Fetch historical gas prices from Etherscan API
   - Fetch block data from Infura/Alchemy
   - Store raw data in S3 (Parquet format)
2. **Data Preprocessing** (15 minutes):
   - Clean data (missing values, outliers)
   - Normalize features (Min-Max scaling)
   - Create sequences (24 timesteps)
   - Store preprocessed data in S3
3. **Feature Engineering** (10 minutes):
   - Create time-based features (hour, day of week)
   - Create rolling averages (1h, 6h, 24h)
   - Create network congestion score
   - Create MEV activity score
4. **Model Training** (45-60 minutes):
   - Train LSTM model with 80/20 train/test split
   - Use early stopping (patience=5)
   - Use learning rate scheduler
   - Save best model to S3
5. **Model Evaluation** (5 minutes):
   - Evaluate on test set
   - Calculate metrics (MAE, RMSE, MAPE, R²)
   - Compare with current model
   - Log metrics to MLflow
6. **Model Deployment** (5 minutes):
   - Deploy to ECS Fargate (if better than current model)
   - Update API endpoint
   - Monitor performance (Datadog)
   - Rollback if performance degrades

**Total Training Time**: ~90 minutes per training run (weekly)

**Model Monitoring**:
- **Metrics**: MAE, RMSE, MAPE, R², Inference Time
- **Alerts**:
  - MAE >10 gwei (model degradation)
  - Inference time >200ms (performance issue)
  - Prediction errors >20% (data drift)
- **Retraining Triggers**:
  - Weekly scheduled retraining (every Sunday)
  - Performance degradation (MAE >10 gwei)
  - Data drift detection (KL divergence >0.1)

**Cost**:
- **Training**: ~$10-20/month (ECS Fargate, 4 vCPU, 8 GB RAM, 1.5 hours/week)
- **Inference**: ~$50-75/month (Lambda, 1M predictions/month, 128 MB RAM)
- **Storage**: ~$5/month (S3, 10 GB model artifacts + data)
- **Monitoring**: ~$10/month (Datadog, MLflow)
- **Total**: ~$75-110/month

**Multi-Chain Support**:
- **Current**: Ethereum mainnet only
- **Planned**: Polygon, BSC, Arbitrum, Optimism (Q2 2026)
- **Approach**: Train separate models per chain (different gas dynamics)
- **Cost**: ~$75-110/month per chain (5 chains = $375-550/month)

**DEXAggregatorService**:
```typescript
@Injectable()
export class DEXAggregatorService {
  async findBestRoute(
    chain: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<TradeRoute> {
    // Query multiple DEXs
    // Find best route
  }
}
```

---

## 6. TESTING STRATEGY

### 6.1 Unit Tests

- Test gas prediction accuracy
- Test route optimization
- Test slippage calculation
- Target: 80% code coverage

### 6.2 Integration Tests

- Test DEX API integrations
- Test trade simulation
- Test MEV protection

### 6.3 Performance Tests

- Test 1M gas predictions/day
- Test 100K trade routes/day
- Test API response time (<500ms)

---

## 7. DEPLOYMENT

### 7.1 Infrastructure

- **Lambda**: Gas & Trading API
- **ECS Fargate**: ML Model (gas prediction)
- **PostgreSQL**: RDS Premium DB (db.r6g.xlarge)
- **Redis**: ElastiCache (cache.r6g.large)

---

## 8. NEW FEATURES SPECIFICATIONS

### 8.1 Feature F4.7: Yield Farming Calculator

**Purpose**: Compare yields across 1,000+ pools and calculate real returns

**Components**:
- **Yield Aggregator**: Fetch APY data from protocols
- **Real Yield Calculator**: Calculate APY - fees - IL
- **Risk Scorer**: Calculate risk-adjusted yield

**API Endpoints**:
```
GET /v2/premium/yield/pools?chain=ethereum&protocol=aave
Response: {
  "pools": [
    {
      "poolId": "aave-usdc",
      "protocol": "Aave",
      "apy": 5.2,
      "tvl": 1000000000,
      "fees": 0.1,
      "ilRisk": 0,
      "riskScore": 8.5
    }
  ]
}

GET /v2/premium/yield/recommendations?minApy=5&maxRisk=5
Response: {
  "recommendations": [
    {
      "poolId": "aave-usdc",
      "realYield": 5.1,
      "riskAdjustedYield": 0.6
    }
  ]
}
```

**Database Schema**:
```sql
CREATE TABLE yield_pools (
  id UUID PRIMARY KEY,
  chain VARCHAR(50),
  protocol VARCHAR(100),
  pool_address VARCHAR(100),
  apy NUMERIC,
  tvl NUMERIC,
  fees NUMERIC,
  il_risk NUMERIC,
  risk_score NUMERIC,
  updated_at TIMESTAMP
);
```

**Integration**:
- **DeFiLlama Yields API**: Fetch APY data
- **Protocol APIs**: Aave, Compound, Curve, Convex

**Performance**:
- **Update Frequency**: 15 minutes
- **API Response Time**: <500ms
- **Pools Supported**: 1,000+ pools

---

### 8.2 Feature F4.8: Cross-Chain Bridge Aggregator

**Purpose**: Compare and execute cross-chain bridges across 20+ bridges

**Components**:
- **Bridge Aggregator**: Fetch bridge options
- **Security Rater**: Calculate bridge security ratings
- **Route Optimizer**: Find optimal bridge route

**API Endpoints**:
```
GET /v2/premium/bridges/compare?sourceChain=ethereum&destChain=arbitrum&asset=ETH&amount=1
Response: {
  "bridges": [
    {
      "bridgeId": "stargate",
      "name": "Stargate",
      "fee": 0.001,
      "estimatedTime": 300,
      "securityRating": 9.5
    },
    {
      "bridgeId": "across",
      "name": "Across",
      "fee": 0.0005,
      "estimatedTime": 180,
      "securityRating": 9.0
    }
  ],
  "bestBridge": "across"
}

POST /v2/premium/bridges/execute
Request: {
  "bridgeId": "across",
  "sourceChain": "ethereum",
  "destChain": "arbitrum",
  "asset": "ETH",
  "amount": 1
}
Response: {
  "transactionId": "uuid",
  "status": "pending",
  "txHash": "0x..."
}
```

**Database Schema**:
```sql
CREATE TABLE bridges (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  source_chain VARCHAR(50),
  dest_chain VARCHAR(50),
  fee NUMERIC,
  estimated_time INTEGER,
  security_rating NUMERIC,
  tvl NUMERIC,
  updated_at TIMESTAMP
);

CREATE TABLE bridge_transactions (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  bridge_id UUID,
  source_chain VARCHAR(50),
  dest_chain VARCHAR(50),
  asset VARCHAR(100),
  amount NUMERIC,
  fee NUMERIC,
  status VARCHAR(20),
  tx_hash VARCHAR(100),
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

**Integration**:
- **Bridge APIs**: Stargate, Across, Hop, Synapse, Multichain, Celer, Connext, Wormhole, LayerZero
- **Security APIs**: L2Beat, DeFiSafety

**Performance**:
- **Update Frequency**: 5 minutes
- **API Response Time**: <500ms
- **Bridges Supported**: 20+ bridges
- **Success Rate**: 98%+

---

### 8.3 Feature F4.9: Copy Trading Beta

**Purpose**: Follow and copy trades from top DeFi traders

**Components**:
- **Trader Ranker**: Rank traders by performance
- **Trade Copier**: Copy trades in real-time
- **Risk Manager**: Enforce position limits and stop loss

**API Endpoints**:
```
GET /v2/premium/copy-trading/leaderboard?sortBy=roi&timeframe=30d
Response: {
  "traders": [
    {
      "traderId": "uuid",
      "address": "0x...",
      "username": "DefiWhale",
      "totalPnl": 100000,
      "roi": 50.5,
      "sharpeRatio": 2.5,
      "winRate": 65,
      "followersCount": 1000
    }
  ]
}

GET /v2/premium/copy-trading/trader/:id
Response: {
  "trader": {
    "traderId": "uuid",
    "address": "0x...",
    "username": "DefiWhale",
    "bio": "Professional DeFi trader",
    "strategy": "Swing trading",
    "chains": "Ethereum, Arbitrum",
    "performance": {
      "totalPnl": 100000,
      "roi": 50.5,
      "sharpeRatio": 2.5,
      "winRate": 65,
      "maxDrawdown": 15,
      "volatility": 20
    },
    "recentTrades": [...]
  }
}

POST /v2/premium/copy-trading/follow
Request: {
  "traderId": "uuid",
  "copyRatio": 0.5,
  "maxPositionSize": 1000,
  "stopLoss": 10
}
Response: {
  "success": true,
  "copyTradeId": "uuid"
}
```

**Database Schema**:
```sql
CREATE TABLE traders (
  id UUID PRIMARY KEY,
  address VARCHAR(100) UNIQUE,
  username VARCHAR(100),
  bio TEXT,
  strategy VARCHAR(100),
  chains VARCHAR(200),
  followers_count INTEGER,
  created_at TIMESTAMP
);

CREATE TABLE trader_performance (
  id UUID PRIMARY KEY,
  trader_id UUID,
  timestamp TIMESTAMP,
  total_pnl NUMERIC,
  roi NUMERIC,
  sharpe_ratio NUMERIC,
  win_rate NUMERIC,
  max_drawdown NUMERIC,
  volatility NUMERIC,
  trades_count INTEGER
);

CREATE TABLE copy_trades (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  trader_id UUID,
  copy_ratio NUMERIC,
  max_position_size NUMERIC,
  stop_loss NUMERIC,
  is_active BOOLEAN,
  created_at TIMESTAMP
);
```

**Integration**:
- **Blockchain RPCs**: Track trader transactions
- **DEX APIs**: Execute copied trades
- **WebSocket**: Real-time trade notifications

**Performance**:
- **Trade Latency**: <5 seconds (from trader trade to copy execution)
- **API Response Time**: <500ms
- **Traders Tracked**: 1,000+ traders
- **Copy Success Rate**: 95%+

**Risk Management**:
- **Position Limits**: Max position size per trade
- **Stop Loss**: Auto-close when loss > threshold
- **Daily Loss Limit**: Stop copying when daily loss > limit

---

**END OF DOCUMENT**

