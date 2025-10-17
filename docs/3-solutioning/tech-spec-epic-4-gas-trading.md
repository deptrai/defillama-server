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
│  │ TimescaleDB  │  │ Redis Cache  │  │ DEX APIs     │     │
│  │ (Gas Data)   │  │              │  │ (1inch, etc) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. DATA MODEL

### 3.1 Database Schema (TimescaleDB)

```sql
-- Gas Predictions (Time-Series)
CREATE TABLE gas_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  current_gas_price NUMERIC NOT NULL,
  predicted_gas_price NUMERIC NOT NULL,
  optimal_time TIMESTAMP NOT NULL,
  confidence NUMERIC NOT NULL -- 0-1
);

SELECT create_hypertable('gas_predictions', 'timestamp');
SELECT add_retention_policy('gas_predictions', INTERVAL '30 days');

-- Trade Routes
CREATE TABLE trade_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chain VARCHAR(50) NOT NULL,
  token_in VARCHAR(100) NOT NULL,
  token_out VARCHAR(100) NOT NULL,
  amount_in NUMERIC NOT NULL,
  amount_out NUMERIC NOT NULL,
  route JSONB NOT NULL,
  gas_estimate NUMERIC NOT NULL,
  slippage NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trade_routes_user_id ON trade_routes(user_id);
```

---

## 4. API SPECIFICATION

### 4.1 REST API Endpoints

**Get Gas Estimate**:
```
GET /v1/gas/estimate?chain=ethereum
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "chain": "ethereum",
    "currentGasPrice": 30,
    "predictedGasPrice": 25,
    "optimalTime": "2025-10-17T12:00:00Z",
    "savings": 16.67
  }
}
```

**Get Trade Routes**:
```
POST /v1/trading/routes
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
POST /v1/trading/simulate
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
- **Database**: TimescaleDB 2.14+
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
- **TimescaleDB**: RDS (db.r6g.large)
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
GET /v1/yield/pools?chain=ethereum&protocol=aave
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

GET /v1/yield/recommendations?minApy=5&maxRisk=5
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
GET /v1/bridges/compare?sourceChain=ethereum&destChain=arbitrum&asset=ETH&amount=1
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

POST /v1/bridges/execute
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
  user_id UUID,
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
GET /v1/copy-trading/leaderboard?sortBy=roi&timeframe=30d
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

GET /v1/copy-trading/trader/:id
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

POST /v1/copy-trading/follow
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
  user_id UUID,
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

