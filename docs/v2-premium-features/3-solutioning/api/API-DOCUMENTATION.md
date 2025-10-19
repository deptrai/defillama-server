# API Documentation - DeFiLlama Premium Features v2.0

**Version**: 2.0.0  
**Base URL**: `https://api.defillama.com/v2`  
**Authentication**: Bearer Token (JWT)

---

## Overview

The DeFiLlama Premium API provides access to premium features including alerts, tax reporting, portfolio management, gas optimization, security scanning, and advanced analytics.

**Key Features**:
- ✅ RESTful API design
- ✅ OpenAPI 3.0 specification
- ✅ JWT authentication
- ✅ Rate limiting by tier
- ✅ Webhook support
- ✅ Real-time WebSocket updates

---

## Authentication

### Get Access Token

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

### Use Access Token

```bash
GET /alerts/rules
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Rate Limits

| Tier | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Free | 10 | 1,000 |
| Pro | 100 | 10,000 |
| Premium | 1,000 | 100,000 |
| Enterprise | Unlimited | Unlimited |

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

---

## API Endpoints

### Alerts API

#### Create Whale Alert Rule

```bash
POST /alerts/rules
Authorization: Bearer {token}
Content-Type: application/json

{
  "rule_type": "whale_movement",
  "conditions": {
    "threshold": 100000,
    "tokens": ["ETH", "USDC"],
    "chains": ["ethereum", "polygon"],
    "wallets": ["0x123..."]
  },
  "notification_channels": {
    "email": true,
    "push": true,
    "webhook": "https://your-webhook.com/alerts"
  }
}

Response 201:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "rule_type": "whale_movement",
  "conditions": {...},
  "notification_channels": {...},
  "is_active": true,
  "created_at": "2025-10-19T10:00:00Z"
}
```

#### Get Alert History

```bash
GET /alerts/history?chain=ethereum&token=ETH&page=1&limit=50
Authorization: Bearer {token}

Response 200:
{
  "alerts": [
    {
      "id": "...",
      "rule_id": "...",
      "alert_type": "whale_movement",
      "event_data": {
        "tx_hash": "0xabc...",
        "amount": 1000000,
        "token": "ETH",
        "chain": "ethereum",
        "wallet": "0x123..."
      },
      "triggered_at": "2025-10-19T10:05:00Z",
      "notified_at": "2025-10-19T10:05:03Z"
    }
  ],
  "total": 1000,
  "page": 1,
  "limit": 50
}
```

### Tax API

#### Generate Tax Report

```bash
POST /tax/reports
Authorization: Bearer {token}
Content-Type: application/json

{
  "year": 2025,
  "wallets": ["0x123...", "0x456..."],
  "chains": ["ethereum", "polygon", "arbitrum"],
  "report_type": "capital_gains",
  "jurisdiction": "US"
}

Response 202:
{
  "report_id": "...",
  "status": "processing",
  "estimated_completion": "2025-10-19T10:15:00Z"
}
```

### Portfolio API

#### Get Portfolio Summary

```bash
GET /portfolio/summary?wallets=0x123,0x456
Authorization: Bearer {token}

Response 200:
{
  "total_value_usd": 1500000,
  "total_pnl_usd": 250000,
  "total_pnl_pct": 20.0,
  "positions": [
    {
      "token": "ETH",
      "chain": "ethereum",
      "balance": 100,
      "value_usd": 200000,
      "cost_basis_usd": 150000,
      "pnl_usd": 50000,
      "pnl_pct": 33.33
    }
  ]
}
```

---

## WebSocket API

### Connect to WebSocket

```javascript
const ws = new WebSocket('wss://api.defillama.com/v2/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
  
  // Subscribe to alerts
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'alerts',
    user_id: 'your-user-id'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Alert received:', data);
};
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "BadRequest",
  "message": "Invalid threshold value. Must be >= $100,000",
  "code": "INVALID_THRESHOLD",
  "details": {
    "field": "conditions.threshold",
    "value": 50000,
    "min": 100000
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing authentication token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMIT_EXCEEDED | 429 | Rate limit exceeded |
| VALIDATION_ERROR | 400 | Request validation failed |
| INTERNAL_ERROR | 500 | Internal server error |

---

## Webhooks

### Configure Webhook

```bash
POST /webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-webhook.com/alerts",
  "events": ["alert.triggered", "alert.failed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload

```json
{
  "event": "alert.triggered",
  "timestamp": "2025-10-19T10:05:00Z",
  "data": {
    "alert_id": "...",
    "rule_id": "...",
    "alert_type": "whale_movement",
    "event_data": {...}
  },
  "signature": "sha256=..."
}
```

### Verify Webhook Signature

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

---

## SDKs & Libraries

### JavaScript/TypeScript

```bash
npm install @defillama/premium-sdk
```

```typescript
import { DeFiLlamaClient } from '@defillama/premium-sdk';

const client = new DeFiLlamaClient({
  apiKey: 'your-api-key'
});

// Create whale alert
const rule = await client.alerts.createRule({
  rule_type: 'whale_movement',
  conditions: {
    threshold: 100000,
    tokens: ['ETH']
  }
});

// Get alert history
const history = await client.alerts.getHistory({
  chain: 'ethereum',
  limit: 50
});
```

### Python

```bash
pip install defillama-premium
```

```python
from defillama import DeFiLlamaClient

client = DeFiLlamaClient(api_key='your-api-key')

# Create whale alert
rule = client.alerts.create_rule(
    rule_type='whale_movement',
    conditions={
        'threshold': 100000,
        'tokens': ['ETH']
    }
)

# Get alert history
history = client.alerts.get_history(
    chain='ethereum',
    limit=50
)
```

---

## Best Practices

### 1. Use Pagination

Always use pagination for large datasets:
```bash
GET /alerts/history?page=1&limit=50
```

### 2. Handle Rate Limits

Implement exponential backoff:
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### 3. Validate Webhooks

Always verify webhook signatures to prevent spoofing.

### 4. Use WebSockets for Real-time

For real-time alerts, use WebSocket instead of polling.

---

## Support

- **Documentation**: https://defillama.com/docs/api
- **OpenAPI Spec**: [openapi-spec-v2.0.yaml](./openapi-spec-v2.0.yaml)
- **Support Email**: api@defillama.com
- **Discord**: https://discord.gg/defillama

---

**Last Updated**: 2025-10-19  
**API Version**: 2.0.0

