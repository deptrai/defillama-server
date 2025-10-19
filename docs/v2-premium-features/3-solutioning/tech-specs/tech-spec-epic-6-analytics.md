# Technical Specification: EPIC-6 Advanced Analytics & AI

**Document Version**: 1.0  
**Date**: 2025-10-17  
**Status**: Draft for Review  
**EPIC ID**: EPIC-6  
**EPIC Name**: Advanced Analytics & AI System

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-17 | Winston (Architect) | Initial draft |

---

## 1. OVERVIEW

### 1.1 EPIC Summary

**EPIC-6: Advanced Analytics & AI** provides AI-powered predictions and custom analytics dashboards.

**Business Value**: $2.5M ARR (10% of total)  
**Story Points**: 100 points  
**Timeline**: Q3 2026 (Months 10-12)  
**Priority**: P2 (Medium)

### 1.2 Features (3 Features)

| Feature ID | Feature Name | Story Points | Timeline |
|------------|--------------|--------------|----------|
| F-023 | Backtesting Engine | 34 | Week 1-6 |
| F-024 | AI Market Insights Beta | 34 | Week 7-14 |
| F-025 | Custom Dashboard Builder | 32 | Week 15-20 |

### 1.3 Success Metrics

**F-023: Backtesting Engine**:
- 15K+ users
- 50K+ strategies backtested
- 85%+ user satisfaction
- <5 minutes backtest execution

**F-024: AI Market Insights Beta**:
- 20K+ users
- 70%+ prediction accuracy
- 80%+ user satisfaction
- <2 seconds AI inference

**F-025: Custom Dashboard Builder**:
- 10K+ users
- 30K+ custom dashboards created
- 85%+ user satisfaction
- <2 seconds dashboard load time

---

## 2. ARCHITECTURE

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 ANALYTICS SERVICE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Prediction   │  │ Dashboard    │  │ Analytics    │     │
│  │ Engine       │  │ Builder      │  │ Processor    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ ML Models    │  │ Widget       │  │ Data         │     │
│  │ (TensorFlow) │  │ Library      │  │ Aggregator   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │ Premium DB   │  │ Redis Cache  │     │
│  │ (Partitioned)│  │ (Dashboards) │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. DATA MODEL

### 3.1 Database Schema (✅ ALIGNED WITH EXISTING PATTERN - PostgreSQL)

**Based on**: `defi/src/alerts/db.ts` (existing database pattern)

```sql
-- Dashboards
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- String user ID (not UUID reference)

  -- Dashboard details
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Layout & widgets (JSONB)
  layout JSONB NOT NULL,
  widgets JSONB NOT NULL,

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dashboards_user_id ON dashboards(user_id);
CREATE INDEX idx_dashboards_is_public ON dashboards(is_public) WHERE is_public = true;
CREATE INDEX idx_dashboards_is_template ON dashboards(is_template) WHERE is_template = true;

-- Predictions
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Asset details
  asset_symbol VARCHAR(100) NOT NULL,
  asset_address VARCHAR(255),
  chain_id VARCHAR(50) NOT NULL,

  -- Prediction type
  prediction_type VARCHAR(50) NOT NULL CHECK (prediction_type IN (
    'price',
    'tvl',
    'volume',
    'apy',
    'market_cap'
  )),

  -- Current & predicted values
  current_value NUMERIC(20, 8) NOT NULL,
  predicted_value NUMERIC(20, 8) NOT NULL,

  -- Prediction metadata
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  prediction_horizon VARCHAR(10), -- '1h', '24h', '7d', '30d'
  prediction_date TIMESTAMP NOT NULL,

  -- Model info
  model_name VARCHAR(100),
  model_version VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_predictions_asset_symbol ON predictions(asset_symbol);
CREATE INDEX idx_predictions_chain_id ON predictions(chain_id);
CREATE INDEX idx_predictions_prediction_type ON predictions(prediction_type);
CREATE INDEX idx_predictions_prediction_date ON predictions(prediction_date DESC);

-- Backtests
CREATE TABLE backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,

  -- Backtest configuration
  strategy_name VARCHAR(255) NOT NULL,
  strategy_config JSONB NOT NULL,

  -- Time period
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,

  -- Results
  total_return NUMERIC(10, 4),
  sharpe_ratio NUMERIC(10, 4),
  max_drawdown NUMERIC(10, 4),
  win_rate NUMERIC(5, 2),
  total_trades INTEGER,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'running',
    'completed',
    'failed'
  )),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_backtests_user_id ON backtests(user_id);
CREATE INDEX idx_backtests_status ON backtests(status);
CREATE INDEX idx_backtests_created_at ON backtests(created_at DESC);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dashboards_updated_at
BEFORE UPDATE ON dashboards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Key Differences from Original**:
1. ✅ **user_id**: `VARCHAR(255)` (not UUID reference) - follows existing pattern
2. ✅ **Specific naming**: `chain_id`, `asset_symbol`, `prediction_type`
3. ✅ **High precision**: `NUMERIC(20, 8)` for values, `NUMERIC(3, 2)` for confidence
4. ✅ **Added backtests**: NEW table for backtesting engine
5. ✅ **Added sharing fields**: `is_public`, `is_template` for dashboards
6. ✅ **Added model info**: `model_name`, `model_version` for predictions
7. ✅ **Triggers**: Auto-update updated_at timestamps

---

## 4. API SPECIFICATION

### 4.1 REST API Endpoints

**Get AI Predictions** (✅ ALIGNED WITH ACTUAL IMPLEMENTATION):
```
GET /v2/premium/analytics/predictions?asset_symbol=ETH&chain_id=ethereum&period=7d
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "asset_symbol": "ETH",
    "asset_address": "0x0000000000000000000000000000000000000000",
    "chain_id": "ethereum",
    "current_value": 2000.00,
    "prediction_type": "price",
    "predictions": [
      {
        "prediction_date": "2025-10-18T00:00:00Z",
        "predicted_value": 2050.00,
        "confidence": 0.75,
        "model_name": "LSTM",
        "model_version": "v1.0"
      },
      {
        "prediction_date": "2025-10-19T00:00:00Z",
        "predicted_value": 2100.00,
        "confidence": 0.70,
        "model_name": "LSTM",
        "model_version": "v1.0"
      },
      ...
      {
        "prediction_date": "2025-10-24T00:00:00Z",
        "predicted_value": 2200.00,
        "confidence": 0.60,
        "model_name": "LSTM",
        "model_version": "v1.0"
      }
    ]
  }
}
```

**Create Dashboard**:
```
POST /v2/premium/analytics/dashboards
Authorization: Bearer <JWT>

Request Body:
{
  "name": "My DeFi Dashboard",
  "description": "Track my DeFi portfolio",
  "layout": { ... },
  "widgets": [
    {
      "type": "portfolio_value",
      "config": { ... }
    },
    {
      "type": "price_chart",
      "config": { "asset": "ETH" }
    }
  ]
}

Response (201 Created):
{
  "success": true,
  "data": {
    "id": "dashboard_123",
    "name": "My DeFi Dashboard",
    "createdAt": "2025-10-17T10:00:00Z"
  }
}
```

**Get Dashboard**:
```
GET /v2/premium/analytics/dashboards/:id
Authorization: Bearer <JWT>

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "dashboard_123",
    "name": "My DeFi Dashboard",
    "widgets": [ ... ]
  }
}
```

---

## 5. IMPLEMENTATION DETAILS

### 5.1 Technology Stack

- **Framework**: NestJS 10.3+
- **ML Framework**: TensorFlow.js
- **Database**: PostgreSQL 16+ (with native partitioning)
- **Cache**: Redis 7+
- **Charts**: ECharts 6.0.0 (frontend)

### 5.2 Key Classes

**PredictionEngineService**:
```typescript
@Injectable()
export class PredictionEngineService {
  async predictPrice(
    asset: string,
    period: string
  ): Promise<PricePrediction[]> {
    // Use ML model to predict price
  }
}
```

**DashboardBuilderService**:
```typescript
@Injectable()
export class DashboardBuilderService {
  async createDashboard(
    userId: string,
    dashboard: CreateDashboardDto
  ): Promise<Dashboard> {
    // Create custom dashboard
  }
}
```

### 5.3 ML Model Training Details

**Price Prediction Model**:

**Model Architecture**:
- **Type**: Transformer-based time series model
- **Framework**: TensorFlow.js
- **Input Features** (15 features):
  - Historical prices (last 30 days)
  - Trading volume
  - Market cap
  - TVL (Total Value Locked)
  - Social sentiment score
  - On-chain metrics (active addresses, transactions)
  - Correlation with BTC/ETH
  - Technical indicators (RSI, MACD, Bollinger Bands)
  - News sentiment score
  - Whale activity score

**Training Data**:
- **Source**: CoinGecko, DeFiLlama, Santiment, LunarCrush
- **Time Range**: Last 24 months (730 days)
- **Assets**: Top 100 crypto assets by market cap
- **Data Points**: ~2.2M data points (100 assets × 730 days × 30 features)
- **Update Frequency**: Retrain daily with new data

**Model Performance**:
- **Accuracy**: 70-75% (7-day predictions within 15% of actual)
- **MAE (Mean Absolute Error)**: 8-12%
- **RMSE (Root Mean Square Error)**: 12-18%
- **Inference Time**: <500ms per prediction

**Training Process**:
1. **Data Collection**: Fetch historical data from APIs
2. **Data Preprocessing**: Normalize features, handle missing values
3. **Feature Engineering**: Create technical indicators, sentiment scores
4. **Model Training**: Train Transformer model with 80/20 train/test split
5. **Model Evaluation**: Evaluate on test set, calculate metrics
6. **Model Deployment**: Deploy to ECS Fargate, serve via API

**Cost**:
- **Training**: ~$50-100/month (ECS Fargate, 1 hour/day)
- **Inference**: ~$100-150/month (Lambda, 500K predictions/month)

### 5.4 Dashboard Widget Library

**Available Widgets** (20 widgets):

**Portfolio Widgets**:
1. **Portfolio Value**: Total portfolio value (USD)
2. **Portfolio Chart**: Historical portfolio value chart
3. **Asset Breakdown**: Pie chart of assets by value
4. **Chain Breakdown**: Pie chart of chains by value
5. **Category Breakdown**: Pie chart of categories (DeFi, NFT, etc.)

**Performance Widgets**:
6. **P&L Summary**: Profit/loss summary (absolute, percentage)
7. **ROI Chart**: Return on investment chart
8. **Sharpe Ratio**: Risk-adjusted return metric
9. **Performance Comparison**: Compare with BTC/ETH/S&P500

**Market Widgets**:
10. **Price Chart**: Asset price chart (candlestick, line)
11. **Volume Chart**: Trading volume chart
12. **TVL Chart**: Total value locked chart
13. **Market Cap**: Market capitalization

**Analytics Widgets**:
14. **AI Predictions**: Price predictions (7-day, 30-day)
15. **Sentiment Score**: Social sentiment score
16. **Whale Activity**: Whale transaction alerts
17. **On-Chain Metrics**: Active addresses, transactions

**Alert Widgets**:
18. **Active Alerts**: List of active alerts
19. **Alert History**: Recent alert history
20. **Alert Performance**: Alert accuracy metrics

**Widget Configuration**:
```typescript
interface WidgetConfig {
  type: string; // Widget type (e.g., 'portfolio_value')
  title: string; // Widget title
  size: 'small' | 'medium' | 'large'; // Widget size
  refreshInterval: number; // Refresh interval (seconds)
  config: Record<string, any>; // Widget-specific config
}
```

---

## 6. TESTING STRATEGY

### 6.1 Unit Tests

- Test prediction accuracy
- Test dashboard CRUD operations
- Test widget rendering
- Target: 75% code coverage

### 6.2 Integration Tests

- Test ML model integration
- Test dashboard data fetching
- Test real-time updates

### 6.3 Performance Tests

- Test prediction generation (<10s)
- Test dashboard load time (<3s)
- Test concurrent users (10K)

---

## 7. DEPLOYMENT

### 7.1 Infrastructure

- **Lambda**: Analytics API
- **ECS Fargate**: ML Model (predictions)
- **PostgreSQL**: RDS Premium DB (db.r6g.xlarge)
- **Redis**: ElastiCache (cache.r6g.large)

---

**END OF DOCUMENT**

