# DeFiLlama Application Metrics Instrumentation Guide

This guide documents the custom metrics that need to be instrumented in the DeFiLlama application for the monitoring stack to work correctly.

## Overview

The monitoring stack expects certain custom metrics to be exposed by the DeFiLlama application. These metrics are used by:
- Recording rules to compute aggregated metrics
- Alert rules to trigger notifications
- Grafana dashboards to visualize data

## Required Custom Metrics

### 1. WebSocket Metrics

**Purpose:** Monitor WebSocket server performance and health

**Metrics to Instrument:**

```typescript
// Total number of active WebSocket connections
websocket_connections_total: Gauge
// Description: Current number of active WebSocket connections
// Labels: none
// Example: websocket_connections_total 1234

// Total number of WebSocket messages processed
websocket_messages_total: Counter
// Description: Total number of WebSocket messages sent/received
// Labels: direction (inbound/outbound), type (subscribe/unsubscribe/data)
// Example: websocket_messages_total{direction="inbound",type="subscribe"} 5678

// Total number of WebSocket errors
websocket_errors_total: Counter
// Description: Total number of WebSocket errors
// Labels: error_type (connection_error/message_error/timeout)
// Example: websocket_errors_total{error_type="connection_error"} 12

// WebSocket message processing duration
websocket_message_duration_seconds: Histogram
// Description: Time taken to process WebSocket messages
// Labels: type (subscribe/unsubscribe/data)
// Buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
// Example: websocket_message_duration_seconds_bucket{type="subscribe",le="0.01"} 100
```

**Implementation Example (Node.js with prom-client):**

```typescript
import { Counter, Gauge, Histogram, register } from 'prom-client';

// Define metrics
const wsConnections = new Gauge({
  name: 'websocket_connections_total',
  help: 'Current number of active WebSocket connections'
});

const wsMessages = new Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['direction', 'type']
});

const wsErrors = new Counter({
  name: 'websocket_errors_total',
  help: 'Total number of WebSocket errors',
  labelNames: ['error_type']
});

const wsMessageDuration = new Histogram({
  name: 'websocket_message_duration_seconds',
  help: 'WebSocket message processing duration',
  labelNames: ['type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

// Usage in WebSocket handler
wss.on('connection', (ws) => {
  wsConnections.inc();
  
  ws.on('message', async (message) => {
    const start = Date.now();
    try {
      wsMessages.inc({ direction: 'inbound', type: 'data' });
      // Process message...
      const duration = (Date.now() - start) / 1000;
      wsMessageDuration.observe({ type: 'data' }, duration);
    } catch (error) {
      wsErrors.inc({ error_type: 'message_error' });
    }
  });
  
  ws.on('close', () => {
    wsConnections.dec();
  });
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 2. Supabase Realtime Metrics

**Purpose:** Monitor Supabase Realtime server performance

**Metrics to Instrument:**

```typescript
// Total number of active Realtime channels
realtime_channels_total: Gauge
// Description: Current number of active Realtime channels
// Labels: none
// Example: realtime_channels_total 567

// Total number of Realtime events
realtime_events_total: Counter
// Description: Total number of Realtime events processed
// Labels: event_type (insert/update/delete/broadcast)
// Example: realtime_events_total{event_type="insert"} 1234

// Total number of Realtime broadcasts
realtime_broadcasts_total: Counter
// Description: Total number of Realtime broadcasts sent
// Labels: channel_type (public/private)
// Example: realtime_broadcasts_total{channel_type="public"} 890

// Total number of presence updates
realtime_presence_total: Counter
// Description: Total number of presence updates
// Labels: action (join/leave/update)
// Example: realtime_presence_total{action="join"} 456
```

**Implementation Example:**

```typescript
import { Counter, Gauge } from 'prom-client';

const realtimeChannels = new Gauge({
  name: 'realtime_channels_total',
  help: 'Current number of active Realtime channels'
});

const realtimeEvents = new Counter({
  name: 'realtime_events_total',
  help: 'Total number of Realtime events',
  labelNames: ['event_type']
});

const realtimeBroadcasts = new Counter({
  name: 'realtime_broadcasts_total',
  help: 'Total number of Realtime broadcasts',
  labelNames: ['channel_type']
});

const realtimePresence = new Counter({
  name: 'realtime_presence_total',
  help: 'Total number of presence updates',
  labelNames: ['action']
});

// Usage in Realtime handler
supabase.channel('my-channel')
  .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
    realtimeEvents.inc({ event_type: payload.eventType });
  })
  .on('broadcast', { event: 'message' }, (payload) => {
    realtimeBroadcasts.inc({ channel_type: 'public' });
  })
  .on('presence', { event: 'sync' }, () => {
    realtimePresence.inc({ action: 'sync' });
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      realtimeChannels.inc();
    } else if (status === 'CLOSED') {
      realtimeChannels.dec();
    }
  });
```

### 3. Business Metrics

**Purpose:** Monitor DeFiLlama business KPIs

**Metrics to Instrument:**

```typescript
// Total number of subscriptions
defillama_subscriptions_total: Counter
// Description: Total number of user subscriptions
// Labels: subscription_type (free/premium)
// Example: defillama_subscriptions_total{subscription_type="premium"} 123

// Total number of unsubscriptions
defillama_unsubscriptions_total: Counter
// Description: Total number of user unsubscriptions
// Labels: reason (user_request/payment_failed/expired)
// Example: defillama_unsubscriptions_total{reason="user_request"} 45

// Total number of active subscriptions
defillama_active_subscriptions:total: Gauge
// Description: Current number of active subscriptions
// Labels: subscription_type (free/premium)
// Example: defillama_active_subscriptions_total{subscription_type="premium"} 789

// Total number of events processed
defillama_events_total: Counter
// Description: Total number of blockchain events processed
// Labels: chain (ethereum/polygon/bsc), event_type (swap/transfer/mint)
// Example: defillama_events_total{chain="ethereum",event_type="swap"} 5678

// Total number of alerts triggered
defillama_alerts_total: Counter
// Description: Total number of alerts triggered
// Labels: alert_type (price/volume/tvl), severity (low/medium/high)
// Example: defillama_alerts_total{alert_type="price",severity="high"} 234

// Total number of notifications sent
defillama_notifications_total: Counter
// Description: Total number of notifications sent
// Labels: channel (email/webhook/push), status (success/failed)
// Example: defillama_notifications_total{channel="email",status="success"} 890

// Total number of queries executed
defillama_queries_total: Counter
// Description: Total number of database queries executed
// Labels: query_type (select/insert/update/delete)
// Example: defillama_queries_total{query_type="select"} 12345

// Cache hit ratio
defillama_cache_hits_total: Counter
defillama_cache_misses_total: Counter
// Description: Cache hits and misses for computing hit ratio
// Labels: cache_type (redis/memory)
// Example: defillama_cache_hits_total{cache_type="redis"} 9000
// Example: defillama_cache_misses_total{cache_type="redis"} 1000
```

## Metrics Endpoint

All metrics should be exposed at `/metrics` endpoint in Prometheus format:

```typescript
import express from 'express';
import { register } from 'prom-client';

const app = express();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(9091, () => {
  console.log('Metrics server listening on port 9091');
});
```

## Prometheus Scrape Configuration

Add the metrics endpoint to Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: 'defillama-app'
    static_configs:
      - targets: ['defillama-app:9091']
    scrape_interval: 15s
```

## Testing Metrics

Test metrics endpoint:

```bash
# Check if metrics are exposed
curl http://localhost:9091/metrics

# Verify specific metric
curl http://localhost:9091/metrics | grep websocket_connections_total
```

## Best Practices

1. **Use appropriate metric types:**
   - Counter: For cumulative values that only increase (e.g., total requests)
   - Gauge: For values that can go up and down (e.g., active connections)
   - Histogram: For measuring distributions (e.g., latency)

2. **Add meaningful labels:**
   - Keep label cardinality low (< 100 unique values per label)
   - Use labels for dimensions you want to filter/aggregate by
   - Avoid high-cardinality labels (e.g., user IDs, timestamps)

3. **Follow naming conventions:**
   - Use `_total` suffix for counters
   - Use `_seconds` suffix for durations
   - Use `_bytes` suffix for sizes
   - Use snake_case for metric names

4. **Document metrics:**
   - Add help text to describe what the metric measures
   - Document label meanings
   - Provide example values

## References

- [Prometheus Client Libraries](https://prometheus.io/docs/instrumenting/clientlibs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)

