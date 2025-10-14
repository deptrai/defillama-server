# DeFiLlama Monitoring Stack

Complete monitoring solution for DeFiLlama self-hosted Supabase infrastructure with Prometheus, Grafana, Loki, and Alertmanager.

## Components

### Prometheus
- **Metrics collection** with 30-day retention
- **12 scrape configs** for all services
- **30+ alert rules** (P1, P2, P3 priorities)
- **80+ recording rules** for performance optimization
- **5 exporters**: PostgreSQL, Redis, Node, cAdvisor, Kong

### Alertmanager
- **Priority-based routing**:
  - P1 (Critical) → PagerDuty + Slack + Email
  - P2 (High) → Slack + Email
  - P3 (Medium) → Slack only
- **Inhibition rules** to suppress redundant alerts
- **Component-specific routing** (database, websocket, api_gateway)
- **Alert grouping and throttling**

### Grafana
- **5 pre-configured dashboards**:
  1. System Overview - CPU, memory, disk, network
  2. Database (PostgreSQL) - Connections, queries, cache hit ratio
  3. WebSocket - Connections, messages, latency, errors
  4. API Gateway (Kong) - Requests, errors, latency, bandwidth
  5. Business Metrics - Subscriptions, events, alerts, queries
- **Auto-provisioning** enabled
- **10-second refresh** interval

### Loki
- **Log aggregation** with 30-day retention
- **Chunk store** with 1GB cache
- **Query optimization** with result caching
- **Ruler** for log-based alerting

### Promtail
- **Docker container log shipping**
- **System log collection**
- **PostgreSQL log parsing**
- **Nginx log parsing**
- **DeFiLlama application log parsing** with JSON support

## Quick Start

### 1. Configure Environment Variables

Create `.env` file:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_FROM=alerts@defillama.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Slack Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty Configuration
PAGERDUTY_SERVICE_KEY=your-pagerduty-service-key

# Alert Email Recipients
ALERT_EMAIL_CRITICAL=ops@defillama.com
ALERT_EMAIL_HIGH=ops@defillama.com

# Grafana Configuration
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password

# Database Configuration
POSTGRES_USER=defillama
POSTGRES_PASSWORD=defillama123
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=defillama

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 2. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Check service status
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 3. Access Dashboards

- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **Grafana**: http://localhost:3000 (admin/your-password)
- **Loki**: http://localhost:3100

### 4. Verify Metrics Collection

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Alertmanager alerts
curl http://localhost:9093/api/v2/alerts

# Check Loki health
curl http://localhost:3100/ready
```

## Alert Rules

### P1 (Critical) - 15 alerts
- **System**: HighCPUUsage, HighMemoryUsage, DiskSpaceLow, ServiceDown
- **Database**: PostgreSQLDown, PostgreSQLTooManyConnections, PostgreSQLHighReplicationLag
- **Redis**: RedisDown, RedisHighMemoryUsage
- **WebSocket**: WebSocketServerDown
- **API Gateway**: KongDown, KongHighErrorRate
- **Realtime**: RealtimeDown

### P2 (High) - 12 alerts
- **Database**: PostgreSQLDeadlocks
- **Redis**: RedisHighConnectionCount, RedisHighEvictionRate
- **WebSocket**: WebSocketHighConnectionCount, WebSocketHighLatency, WebSocketHighErrorRate
- **API Gateway**: KongHighLatency
- **Realtime**: RealtimeHighChannelCount, RealtimeHighEventRate
- **Business**: HighUnsubscribeRate, NoEventsProcessed
- **Docker**: ContainerHighCPU, ContainerHighMemory, ContainerRestarting

### P3 (Medium) - 5 alerts
- **API Gateway**: KongHighRequestRate
- **Business**: LowSubscriptionRate

## Recording Rules

### System Metrics
- CPU, memory, disk, network utilization

### Database Metrics
- Connections, transactions, queries, cache hit ratio, replication lag, deadlocks

### Redis Metrics
- Memory, connections, commands, cache hit ratio, evictions, expired keys

### WebSocket Metrics
- Connections, messages, errors, latency (P50, P95, P99)

### API Gateway Metrics
- Requests, errors, latency (P50, P95, P99), bandwidth

### Realtime Metrics
- Channels, events, broadcasts, presence

### Business Metrics
- Subscriptions, events, alerts, notifications, queries, cache hit ratio

### Docker Metrics
- CPU, memory, network, restarts

### Availability Metrics
- 5m, 1h, 24h, 7d, 30d

### Performance Metrics
- API latency, WebSocket latency, database query latency

## Grafana Dashboards

### 1. System Overview
- CPU, memory, disk usage gauges
- Network traffic graph
- Service availability timeline

### 2. Database (PostgreSQL)
- Active connections gauge
- Cache hit ratio gauge
- Transaction rate graph
- Query rate graph (total + slow queries)
- Replication lag graph

### 3. WebSocket
- Active connections gauge
- Message rate graph
- Message latency graph (P50, P95, P99)
- Error rate graph

### 4. API Gateway (Kong)
- Request rate by status (2xx, 4xx, 5xx)
- Error rate gauge
- Request latency graph (P50, P95, P99)
- Bandwidth graph (receive + transmit)

### 5. Business Metrics
- Subscription rate graph
- Active subscriptions gauge
- Event processing rate graph (events, alerts, notifications)
- Query rate graph
- Cache hit ratio gauge

## Troubleshooting

### Prometheus not scraping targets

```bash
# Check Prometheus logs
docker logs defillama-prometheus

# Verify target configuration
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

### Alertmanager not sending notifications

```bash
# Check Alertmanager logs
docker logs defillama-alertmanager

# Verify alert configuration
curl http://localhost:9093/api/v2/alerts | jq '.'

# Test SMTP configuration
docker exec defillama-alertmanager amtool config routes test
```

### Grafana dashboards not loading

```bash
# Check Grafana logs
docker logs defillama-grafana

# Verify datasources
curl -u admin:your-password http://localhost:3000/api/datasources | jq '.'

# Verify dashboards
curl -u admin:your-password http://localhost:3000/api/search | jq '.'
```

### Loki not receiving logs

```bash
# Check Loki logs
docker logs defillama-loki

# Check Promtail logs
docker logs defillama-promtail

# Verify Loki health
curl http://localhost:3100/ready
```

## Maintenance

### Backup Prometheus Data

```bash
# Stop Prometheus
docker-compose -f docker-compose.monitoring.yml stop prometheus

# Backup data
tar -czf prometheus-backup-$(date +%Y%m%d).tar.gz prometheus_data/

# Start Prometheus
docker-compose -f docker-compose.monitoring.yml start prometheus
```

### Backup Grafana Dashboards

```bash
# Export all dashboards
curl -u admin:your-password http://localhost:3000/api/search | jq -r '.[] | .uid' | \
  xargs -I {} curl -u admin:your-password http://localhost:3000/api/dashboards/uid/{} | \
  jq '.dashboard' > grafana-dashboards-backup-$(date +%Y%m%d).json
```

### Clean Up Old Data

```bash
# Clean Prometheus data older than 30 days (automatic with retention settings)
# Clean Loki data older than 30 days (automatic with retention settings)

# Manual cleanup if needed
docker-compose -f docker-compose.monitoring.yml down -v
docker-compose -f docker-compose.monitoring.yml up -d
```

## Performance Tuning

### Prometheus
- Adjust `scrape_interval` in `prometheus.yml` (default: 15s)
- Adjust `retention.time` in docker-compose (default: 30d)
- Increase memory limit if needed

### Loki
- Adjust `retention_period` in `loki.yml` (default: 30d)
- Adjust `max_query_length` in `loki.yml` (default: 30d)
- Increase cache size if needed

### Grafana
- Adjust `refresh` interval in dashboards (default: 10s)
- Enable query caching
- Optimize dashboard queries

## Support

For issues or questions:
- Check logs: `docker-compose -f docker-compose.monitoring.yml logs`
- Review configuration files in `monitoring/` directory
- Consult official documentation:
  - Prometheus: https://prometheus.io/docs/
  - Grafana: https://grafana.com/docs/
  - Loki: https://grafana.com/docs/loki/
  - Alertmanager: https://prometheus.io/docs/alerting/latest/alertmanager/

