# Technical Specification - Phase 3: Smart Money Tracking

**Project:** DeFiLlama On-Chain Services Platform  
**Epic ID:** on-chain-services-v1  
**Phase:** Phase 3 - Intelligence  
**Feature:** 3.1 - Smart Money Tracking  
**Date:** 2025-10-14  
**Architect:** Luis  
**Version:** 1.0  

---

## 1. Overview and Scope

### 1.1 Executive Summary

This technical specification defines the implementation details for **Feature 3.1: Smart Money Tracking**, a core component of Phase 3 Intelligence features. This feature enables users to identify, track, and analyze the trading behavior of successful DeFi traders ("smart money") to gain actionable investment insights.

**Business Objectives:**
- Target: $2M ARR, 5,000 premium users (Phase 3)
- Enable copy-trading and alpha discovery
- Provide competitive intelligence for traders
- Support data-driven investment strategies

**Technical Objectives:**
- Real-time tracking of 10,000+ smart money wallets
- Sub-second trade detection and notification
- Historical performance analysis (2+ years)
- Pattern recognition and behavioral analysis
- 99.9% uptime for critical alerts

### 1.2 Scope

**In Scope:**
- **Story 3.1.1: Smart Money Identification**
  - Wallet scoring algorithm
  - Performance metrics calculation
  - Automated wallet discovery
  - Manual wallet curation

- **Story 3.1.2: Trade Pattern Analysis**
  - Trade detection and classification
  - Pattern recognition (accumulation, distribution, rotation)
  - Behavioral analysis (timing, sizing, frequency)
  - Correlation analysis

- **Story 3.1.3: Performance Attribution**
  - P&L tracking per wallet
  - Win rate and Sharpe ratio calculation
  - Token-level performance
  - Strategy classification

**Out of Scope:**
- Automated copy-trading execution (Phase 4)
- Social features (following, commenting) (Phase 4)
- Machine learning-based predictions (Phase 4)
- Cross-chain MEV analysis (Phase 4)

### 1.3 Architecture Alignment

Phase 3 extends Phase 1 & 2 architecture with:
- **Real-time Processing**: WebSocket + Lambda for trade detection
- **Big Data Analytics**: S3 + Athena for historical analysis
- **Machine Learning**: SageMaker for pattern recognition
- **Graph Database**: Neptune for wallet relationship mapping

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Dashboard  │  Mobile App  │  Trading Bots  │  Alerts       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  REST API  │  WebSocket API  │  GraphQL API (Smart Money)       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER (Phase 3)                   │
├─────────────────────────────────────────────────────────────────┤
│  Smart Money Identification  │  Trade Pattern Analyzer          │
│  Performance Attribution     │  Wallet Scoring Engine           │
│  Alert Engine (Phase 1)      │  Query Processor (Phase 1)       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PROCESSING LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Trade Detector (Real-time)  │  Pattern Recognition (ML)        │
│  Performance Calculator      │  Wallet Relationship Mapper      │
│  Behavioral Analyzer         │  Strategy Classifier             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Wallets, Trades)  │  Redis (Real-time Cache)       │
│  Neptune (Wallet Graph)        │  S3 (Historical Data)          │
│  Athena (Analytics Queries)    │  SageMaker (ML Models)         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Architecture

**Real-time Trade Detection Flow:**
```
Blockchain Mempool → Trade Detector Lambda →
Trade Classification → Wallet Scoring Update →
Redis Cache Update → WebSocket Broadcast →
Alert Evaluation → Notification Dispatch
```

**Historical Analysis Flow:**
```
Raw Transaction Data (S3) → Athena Query →
Performance Calculation → Pattern Recognition (SageMaker) →
PostgreSQL Storage → API Response
```

**Wallet Relationship Mapping Flow:**
```
Transaction Data → Wallet Interaction Extraction →
Neptune Graph Update → Relationship Analysis →
Cluster Detection → API Response
```

---

## 3. Database Schema Design

### 3.1 Smart Money Wallets

#### smart_money_wallets
```sql
CREATE TABLE smart_money_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Identification
  wallet_name VARCHAR(255),
  wallet_type VARCHAR(50), -- 'whale', 'fund', 'trader', 'protocol'
  discovery_method VARCHAR(50), -- 'algorithm', 'manual', 'community'
  verified BOOLEAN DEFAULT FALSE,
  
  -- Scoring
  smart_money_score DECIMAL(5, 2) NOT NULL, -- 0-100
  confidence_level VARCHAR(20), -- 'high', 'medium', 'low'
  
  -- Performance Metrics
  total_pnl DECIMAL(20, 2),
  roi_all_time DECIMAL(10, 4),
  win_rate DECIMAL(5, 2),
  sharpe_ratio DECIMAL(10, 4),
  max_drawdown DECIMAL(10, 4),
  
  -- Activity Metrics
  total_trades INTEGER DEFAULT 0,
  avg_trade_size DECIMAL(20, 2),
  avg_holding_period_days DECIMAL(10, 2),
  last_trade_timestamp TIMESTAMP,
  
  -- Behavioral Traits
  trading_style VARCHAR(50), -- 'swing', 'day', 'position', 'scalp'
  risk_profile VARCHAR(20), -- 'conservative', 'moderate', 'aggressive'
  preferred_tokens VARCHAR(255)[],
  preferred_protocols VARCHAR(255)[],
  
  -- Metadata
  first_seen TIMESTAMP NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smart_money_wallets_address ON smart_money_wallets(wallet_address);
CREATE INDEX idx_smart_money_wallets_chain ON smart_money_wallets(chain_id);
CREATE INDEX idx_smart_money_wallets_score ON smart_money_wallets(smart_money_score DESC);
CREATE INDEX idx_smart_money_wallets_verified ON smart_money_wallets(verified);
CREATE INDEX idx_smart_money_wallets_composite ON smart_money_wallets(smart_money_score DESC, verified, chain_id);
```

#### wallet_trades
```sql
CREATE TABLE wallet_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES smart_money_wallets(id),
  
  -- Transaction Info
  tx_hash VARCHAR(255) NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  
  -- Trade Details
  trade_type VARCHAR(20) NOT NULL, -- 'buy', 'sell', 'swap', 'add_liquidity', 'remove_liquidity'
  token_in_address VARCHAR(255),
  token_in_symbol VARCHAR(50),
  token_in_amount DECIMAL(30, 10),
  token_in_value_usd DECIMAL(20, 2),
  
  token_out_address VARCHAR(255),
  token_out_symbol VARCHAR(50),
  token_out_amount DECIMAL(30, 10),
  token_out_value_usd DECIMAL(20, 2),
  
  -- Protocol Info
  protocol_id VARCHAR(255),
  protocol_name VARCHAR(255),
  dex_name VARCHAR(255),
  
  -- Trade Metrics
  trade_size_usd DECIMAL(20, 2),
  gas_fee_usd DECIMAL(10, 2),
  slippage_pct DECIMAL(5, 2),
  
  -- Performance (calculated later)
  realized_pnl DECIMAL(20, 2),
  unrealized_pnl DECIMAL(20, 2),
  roi DECIMAL(10, 4),
  holding_period_days INTEGER,
  
  -- Classification
  trade_pattern VARCHAR(50), -- 'accumulation', 'distribution', 'rotation', 'arbitrage'
  trade_timing VARCHAR(20), -- 'early', 'mid', 'late', 'exit'
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_trades_wallet_id ON wallet_trades(wallet_id);
CREATE INDEX idx_wallet_trades_timestamp ON wallet_trades(timestamp DESC);
CREATE INDEX idx_wallet_trades_token_in ON wallet_trades(token_in_address);
CREATE INDEX idx_wallet_trades_token_out ON wallet_trades(token_out_address);
CREATE INDEX idx_wallet_trades_composite ON wallet_trades(wallet_id, timestamp DESC);
CREATE INDEX idx_wallet_trades_pattern ON wallet_trades(trade_pattern);
```

#### wallet_performance_snapshots
```sql
CREATE TABLE wallet_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES smart_money_wallets(id),
  timestamp TIMESTAMP NOT NULL,
  
  -- Portfolio Metrics
  total_value_usd DECIMAL(20, 2) NOT NULL,
  token_count INTEGER,
  
  -- Performance Metrics
  pnl_24h DECIMAL(20, 2),
  pnl_7d DECIMAL(20, 2),
  pnl_30d DECIMAL(20, 2),
  pnl_all_time DECIMAL(20, 2),
  roi_all_time DECIMAL(10, 4),
  
  -- Risk Metrics
  sharpe_ratio DECIMAL(10, 4),
  sortino_ratio DECIMAL(10, 4),
  max_drawdown DECIMAL(10, 4),
  volatility DECIMAL(10, 4),
  
  -- Activity Metrics
  trades_24h INTEGER,
  trades_7d INTEGER,
  trades_30d INTEGER,
  avg_trade_size DECIMAL(20, 2),
  
  -- Top Holdings (JSON)
  top_holdings JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_performance_wallet_id ON wallet_performance_snapshots(wallet_id);
CREATE INDEX idx_wallet_performance_timestamp ON wallet_performance_snapshots(timestamp DESC);
CREATE INDEX idx_wallet_performance_composite ON wallet_performance_snapshots(wallet_id, timestamp DESC);
```

### 3.2 Trade Patterns

#### trade_patterns
```sql
CREATE TABLE trade_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES smart_money_wallets(id),
  
  -- Pattern Info
  pattern_type VARCHAR(50) NOT NULL, -- 'accumulation', 'distribution', 'rotation', 'arbitrage'
  pattern_name VARCHAR(255),
  confidence_score DECIMAL(5, 2),
  
  -- Time Range
  start_timestamp TIMESTAMP NOT NULL,
  end_timestamp TIMESTAMP,
  duration_hours INTEGER,
  
  -- Pattern Details
  token_address VARCHAR(255),
  token_symbol VARCHAR(50),
  total_trades INTEGER,
  total_volume_usd DECIMAL(20, 2),
  avg_trade_size DECIMAL(20, 2),
  
  -- Outcome
  pattern_status VARCHAR(20), -- 'active', 'completed', 'abandoned'
  realized_pnl DECIMAL(20, 2),
  roi DECIMAL(10, 4),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trade_patterns_wallet_id ON trade_patterns(wallet_id);
CREATE INDEX idx_trade_patterns_type ON trade_patterns(pattern_type);
CREATE INDEX idx_trade_patterns_token ON trade_patterns(token_address);
CREATE INDEX idx_trade_patterns_status ON trade_patterns(pattern_status);
```

---

## 4. API Specifications

### 4.1 Smart Money Identification API

#### GET /v1/smart-money/wallets

**Request:**
```typescript
interface SmartMoneyWalletsRequest {
  chains?: string[];
  minScore?: number;
  verified?: boolean;
  walletType?: 'whale' | 'fund' | 'trader' | 'protocol';
  sortBy?: 'score' | 'roi' | 'pnl' | 'trades';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
interface SmartMoneyWalletsResponse {
  wallets: Array<{
    walletAddress: string;
    chainId: string;
    walletName: string;
    walletType: string;
    verified: boolean;
    
    scoring: {
      smartMoneyScore: number;
      confidenceLevel: string;
    };
    
    performance: {
      totalPnl: number;
      roiAllTime: number;
      winRate: number;
      sharpeRatio: number;
      maxDrawdown: number;
    };
    
    activity: {
      totalTrades: number;
      avgTradeSize: number;
      avgHoldingPeriodDays: number;
      lastTradeTimestamp: string;
    };
    
    behavioral: {
      tradingStyle: string;
      riskProfile: string;
      preferredTokens: string[];
      preferredProtocols: string[];
    };
  }>;
  
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

**Version**: 1.0  
**Last Updated**: 2025-10-14  
**Status**: Ready for Implementation

