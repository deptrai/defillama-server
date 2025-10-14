# 🔌 API Specification v1.0 - DeFiLlama On-Chain Services

**Version**: 1.0  
**Date**: October 14, 2025  
**API Architect**: Luis  
**Base URL**: `https://api.llama.fi/v2/`  
**WebSocket URL**: `wss://api.llama.fi/v2/realtime`  

---

## 🎯 **API Overview**

The DeFiLlama On-Chain Services API provides comprehensive real-time and historical data for DeFi protocols, tokens, and blockchain analytics. The API supports both REST endpoints for historical data and WebSocket connections for real-time streaming.

### API Features
- **Real-time data streaming** via WebSocket
- **Historical analytics** via REST endpoints
- **Smart money tracking** and insights
- **Risk assessment** and monitoring
- **MEV detection** and opportunities
- **Custom alerts** and notifications

---

## 🔐 **Authentication**

### API Key Authentication
```http
GET /protocols
Authorization: Bearer YOUR_API_KEY
X-API-Key: YOUR_API_KEY
```

### JWT Token Authentication
```http
GET /user/alerts
Authorization: Bearer YOUR_JWT_TOKEN
```

### Rate Limits

| Tier | REST API | WebSocket | Alerts |
|------|----------|-----------|---------|
| Free | 100/hour | 1 connection | 10/month |
| Basic | 1,000/hour | 5 connections | 100/month |
| Pro | 10,000/hour | 25 connections | 1,000/month |
| Enterprise | Unlimited | 100 connections | Unlimited |

---

## 📊 **REST API Endpoints**

### 1. Protocol Endpoints

#### GET /protocols
Get list of all supported protocols with current metrics.

**Parameters:**
- `category` (optional): Filter by protocol category
- `chain` (optional): Filter by blockchain
- `limit` (optional): Number of results (default: 100, max: 1000)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "data": [
    {
      "id": "uniswap-v3",
      "name": "Uniswap V3",
      "category": "dex",
      "chain": "ethereum",
      "tvl": 1234567890.50,
      "tvlChange24h": 0.05,
      "volume24h": 987654321.25,
      "fees24h": 1234567.89,
      "users24h": 15432,
      "lastUpdated": "2025-10-14T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 3000,
    "limit": 100,
    "offset": 0,
    "hasNext": true
  }
}
```

#### GET /protocols/{id}
Get detailed information for a specific protocol.

**Response:**
```json
{
  "data": {
    "id": "uniswap-v3",
    "name": "Uniswap V3",
    "description": "Automated market maker protocol",
    "category": "dex",
    "chain": "ethereum",
    "contractAddress": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    "website": "https://uniswap.org",
    "twitter": "Uniswap",
    "metrics": {
      "tvl": 1234567890.50,
      "tvlChange24h": 0.05,
      "volume24h": 987654321.25,
      "fees24h": 1234567.89,
      "users24h": 15432,
      "apy": 0.15
    },
    "riskScore": 25,
    "lastUpdated": "2025-10-14T10:30:00Z"
  }
}
```

#### GET /protocols/{id}/history
Get historical metrics for a protocol.

**Parameters:**
- `metric` (required): Metric type (tvl, volume, fees, users)
- `timeframe` (optional): 1h, 1d, 7d, 30d, 90d, 1y (default: 30d)
- `granularity` (optional): 1h, 1d, 1w (default: 1d)

**Response:**
```json
{
  "data": {
    "protocolId": "uniswap-v3",
    "metric": "tvl",
    "timeframe": "30d",
    "granularity": "1d",
    "points": [
      {
        "timestamp": "2025-09-14T00:00:00Z",
        "value": 1200000000.00
      },
      {
        "timestamp": "2025-09-15T00:00:00Z",
        "value": 1210000000.00
      }
    ]
  }
}
```

### 2. Token Endpoints

#### GET /tokens
Get list of supported tokens with current prices.

**Parameters:**
- `chain` (optional): Filter by blockchain
- `search` (optional): Search by symbol or name
- `limit` (optional): Number of results (default: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "ethereum",
      "symbol": "ETH",
      "name": "Ethereum",
      "chain": "ethereum",
      "contractAddress": null,
      "price": 2500.50,
      "priceChange24h": 0.025,
      "volume24h": 15000000000.00,
      "marketCap": 300000000000.00,
      "lastUpdated": "2025-10-14T10:30:00Z"
    }
  ]
}
```

#### GET /tokens/{id}/price-history
Get historical price data for a token.

**Parameters:**
- `timeframe` (optional): 1h, 1d, 7d, 30d, 90d, 1y (default: 7d)
- `granularity` (optional): 1m, 5m, 1h, 1d (default: 1h)

### 3. Analytics Endpoints

#### GET /analytics/smart-money
Get smart money wallet rankings and insights.

**Parameters:**
- `chain` (optional): Filter by blockchain
- `timeframe` (optional): 7d, 30d, 90d (default: 30d)
- `minScore` (optional): Minimum smart money score (0-1)
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
{
  "data": [
    {
      "walletAddress": "0x1234...5678",
      "chain": "ethereum",
      "smartMoneyScore": 0.95,
      "totalPnl": 1500000.00,
      "winRate": 0.78,
      "totalTrades": 245,
      "avgTradeSize": 50000.00,
      "topTokens": ["ETH", "USDC", "UNI"],
      "lastActivity": "2025-10-14T09:15:00Z"
    }
  ]
}
```

#### GET /analytics/mev-opportunities
Get current MEV opportunities.

**Parameters:**
- `type` (optional): arbitrage, liquidation, sandwich
- `chain` (optional): Filter by blockchain
- `minProfit` (optional): Minimum profit in USD

**Response:**
```json
{
  "data": [
    {
      "id": "mev-123456",
      "type": "arbitrage",
      "chain": "ethereum",
      "tokenSymbol": "USDC",
      "estimatedProfit": 1500.00,
      "gasCost": 50.00,
      "netProfit": 1450.00,
      "protocols": ["uniswap-v3", "sushiswap"],
      "expiresAt": "2025-10-14T10:35:00Z",
      "detectedAt": "2025-10-14T10:30:00Z"
    }
  ]
}
```

### 4. Alert Endpoints

#### POST /alerts
Create a new alert.

**Request Body:**
```json
{
  "name": "ETH Price Alert",
  "description": "Alert when ETH price goes above $3000",
  "alertType": "price_change",
  "tokenId": "ethereum",
  "conditionOperator": ">",
  "thresholdValue": 3000.00,
  "thresholdType": "absolute",
  "notificationChannels": ["email", "webhook"],
  "webhookUrl": "https://your-webhook.com/alerts",
  "cooldownMinutes": 60
}
```

**Response:**
```json
{
  "data": {
    "id": "alert-123456",
    "name": "ETH Price Alert",
    "alertType": "price_change",
    "isActive": true,
    "createdAt": "2025-10-14T10:30:00Z"
  }
}
```

#### GET /alerts
Get user's alerts.

#### PUT /alerts/{id}
Update an existing alert.

#### DELETE /alerts/{id}
Delete an alert.

---

## 🔌 **WebSocket API**

### Connection
```javascript
const ws = new WebSocket('wss://api.llama.fi/v2/realtime');

// Authentication
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'authenticate',
    apiKey: 'YOUR_API_KEY'
  }));
};
```

### Message Types

#### 1. Authentication
```json
{
  "type": "authenticate",
  "apiKey": "YOUR_API_KEY"
}
```

#### 2. Subscribe to Channels
```json
{
  "type": "subscribe",
  "channels": ["protocols", "prices", "alerts"],
  "filters": {
    "protocolIds": ["uniswap-v3", "aave-v3"],
    "tokenIds": ["ethereum", "bitcoin"],
    "chains": ["ethereum", "polygon"]
  }
}
```

#### 3. Unsubscribe
```json
{
  "type": "unsubscribe",
  "channels": ["protocols"]
}
```

### Real-time Updates

#### Protocol Updates
```json
{
  "type": "protocol_update",
  "channel": "protocols",
  "data": {
    "protocolId": "uniswap-v3",
    "tvl": 1234567890.50,
    "tvlChange": 0.025,
    "volume24h": 987654321.25,
    "timestamp": "2025-10-14T10:30:00Z"
  }
}
```

#### Price Updates
```json
{
  "type": "price_update",
  "channel": "prices",
  "data": {
    "tokenId": "ethereum",
    "price": 2500.50,
    "priceChange24h": 0.025,
    "volume24h": 15000000000.00,
    "timestamp": "2025-10-14T10:30:00Z"
  }
}
```

#### Alert Notifications
```json
{
  "type": "alert_triggered",
  "channel": "alerts",
  "data": {
    "alertId": "alert-123456",
    "alertName": "ETH Price Alert",
    "triggeredValue": 3050.00,
    "thresholdValue": 3000.00,
    "message": "ETH price has reached $3,050.00",
    "timestamp": "2025-10-14T10:30:00Z"
  }
}
```

#### Smart Money Activity
```json
{
  "type": "smart_money_activity",
  "channel": "smart_money",
  "data": {
    "walletAddress": "0x1234...5678",
    "action": "buy",
    "tokenSymbol": "ETH",
    "amount": 100.0,
    "amountUsd": 250000.00,
    "protocol": "uniswap-v3",
    "smartMoneyScore": 0.95,
    "timestamp": "2025-10-14T10:30:00Z"
  }
}
```

---

## 📈 **Response Formats**

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2025-10-14T10:30:00Z",
  "requestId": "req-123456"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The parameter 'limit' must be between 1 and 1000",
    "details": {
      "parameter": "limit",
      "value": 2000,
      "allowedRange": "1-1000"
    }
  },
  "timestamp": "2025-10-14T10:30:00Z",
  "requestId": "req-123456"
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_API_KEY` | API key is invalid or expired |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded for your tier |
| `INVALID_PARAMETER` | Request parameter is invalid |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `INTERNAL_ERROR` | Internal server error |
| `MAINTENANCE_MODE` | API is in maintenance mode |

---

## 🔧 **SDK Examples**

### JavaScript/TypeScript
```typescript
import { DeFiLlamaAPI } from '@defillama/sdk';

const api = new DeFiLlamaAPI({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://api.llama.fi/v2'
});

// Get protocols
const protocols = await api.protocols.list({
  category: 'dex',
  limit: 50
});

// Subscribe to real-time updates
const ws = api.realtime.connect();
ws.subscribe(['protocols', 'prices']);
ws.on('protocol_update', (data) => {
  console.log('Protocol update:', data);
});
```

### Python
```python
from defillama import DeFiLlamaAPI

api = DeFiLlamaAPI(api_key='YOUR_API_KEY')

# Get protocols
protocols = api.protocols.list(category='dex', limit=50)

# Create alert
alert = api.alerts.create({
    'name': 'ETH Price Alert',
    'alert_type': 'price_change',
    'token_id': 'ethereum',
    'condition_operator': '>',
    'threshold_value': 3000.00
})
```

---

## 📊 **Webhook Integration**

### Webhook Payload
```json
{
  "type": "alert_triggered",
  "alertId": "alert-123456",
  "userId": "user-789",
  "data": {
    "alertName": "ETH Price Alert",
    "triggeredValue": 3050.00,
    "thresholdValue": 3000.00,
    "message": "ETH price has reached $3,050.00"
  },
  "timestamp": "2025-10-14T10:30:00Z",
  "signature": "sha256=abc123..."
}
```

### Webhook Verification
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}
```

---

## 🚀 **Getting Started**

1. **Sign up** for a DeFiLlama account
2. **Generate API key** in your dashboard
3. **Choose subscription tier** based on your needs
4. **Start making requests** to the API
5. **Set up webhooks** for real-time notifications

### Quick Start Example
```bash
# Get all protocols
curl -H "X-API-Key: YOUR_API_KEY" \
  "https://api.llama.fi/v2/protocols?limit=10"

# Create an alert
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"ETH Alert","alertType":"price_change","tokenId":"ethereum","conditionOperator":">","thresholdValue":3000}' \
  "https://api.llama.fi/v2/alerts"
```

---

**This API specification provides comprehensive access to DeFiLlama's On-Chain Services, enabling developers to build powerful DeFi applications with real-time data and advanced analytics.**
