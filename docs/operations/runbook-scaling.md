# Scaling Runbook

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Author:** Augment Agent (Claude Sonnet 4)

---

## Table of Contents

1. [Overview](#overview)
2. [Horizontal Scaling](#horizontal-scaling)
3. [Vertical Scaling](#vertical-scaling)
4. [Database Scaling](#database-scaling)
5. [Cache Scaling](#cache-scaling)
6. [Load Balancing](#load-balancing)
7. [Auto-scaling](#auto-scaling)
8. [Monitoring and Metrics](#monitoring-and-metrics)

---

## Overview

This runbook provides procedures for scaling DeFiLlama infrastructure to handle increased load.

**Scaling Strategies:**
- **Horizontal Scaling:** Add more instances (recommended)
- **Vertical Scaling:** Increase instance resources
- **Database Scaling:** Read replicas, connection pooling
- **Cache Scaling:** Redis cluster, sharding

**Target Metrics:**
- 10,000+ concurrent connections
- <100ms WebSocket latency
- <200ms API response time
- 99.9% uptime

---

## Horizontal Scaling

### Application Scaling

**Docker Compose Scaling:**

```bash
# Scale API service to 3 replicas
docker-compose up -d --scale api=3

# Scale worker service to 5 replicas
docker-compose up -d --scale worker=5

# Verify scaling
docker-compose ps
```

**Docker Swarm Scaling:**

```bash
# Initialize Docker Swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml defillama

# Scale services
docker service scale defillama_api=3
docker service scale defillama_worker=5

# Verify scaling
docker service ls
docker service ps defillama_api
```

**Kubernetes Scaling:**

```bash
# Scale deployment
kubectl scale deployment defillama-api --replicas=3
kubectl scale deployment defillama-worker --replicas=5

# Verify scaling
kubectl get pods
kubectl get deployments
```

### Load Distribution

**Nginx Load Balancer Configuration:**

```nginx
upstream api_backend {
    least_conn;  # Load balancing method
    
    server api-1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server api-2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server api-3:3000 weight=1 max_fails=3 fail_timeout=30s;
    
    keepalive 32;
}

server {
    listen 80;
    server_name defillama.com;
    
    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## Vertical Scaling

### Increase Container Resources

**Docker Compose:**

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

**Apply Changes:**

```bash
# Update docker-compose.yml
# Restart services
docker-compose down
docker-compose up -d

# Verify resources
docker stats
```

### Increase Server Resources

**AWS EC2:**
1. Stop instance
2. Change instance type (e.g., t3.medium → t3.large)
3. Start instance
4. Verify: `htop`, `free -h`

**Self-hosted:**
1. Add more RAM
2. Add more CPU cores
3. Upgrade disk (SSD recommended)
4. Restart server

---

## Database Scaling

### PostgreSQL Read Replicas

**Setup Read Replica:**

```bash
# On primary server
# Edit postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_size = 64MB

# Create replication user
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'password';

# On replica server
# Create base backup
pg_basebackup -h primary-host -D /var/lib/postgresql/data -U replicator -P

# Start replica
docker run -d \
  --name postgres-replica \
  -v postgres_replica_data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=password \
  postgres:15-alpine
```

**Application Configuration:**

```typescript
// Use read replica for read queries
const readPool = new Pool({
  host: 'postgres-replica',
  port: 5432,
  database: 'defillama',
  user: 'postgres',
  password: 'password',
  max: 20
});

// Use primary for write queries
const writePool = new Pool({
  host: 'postgres-primary',
  port: 5432,
  database: 'defillama',
  user: 'postgres',
  password: 'password',
  max: 10
});
```

### Connection Pooling (PgBouncer)

```bash
# Deploy PgBouncer
docker run -d \
  --name pgbouncer \
  -p 6432:6432 \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=password \
  -e POOL_MODE=transaction \
  -e MAX_CLIENT_CONN=1000 \
  -e DEFAULT_POOL_SIZE=25 \
  edoburu/pgbouncer

# Update application to use PgBouncer
# Change port from 5432 to 6432
```

---

## Cache Scaling

### Redis Cluster

**Setup Redis Cluster:**

```bash
# Create 6 Redis nodes (3 masters, 3 replicas)
for port in 7000 7001 7002 7003 7004 7005; do
  docker run -d \
    --name redis-$port \
    -p $port:6379 \
    redis:7-alpine \
    redis-server --cluster-enabled yes --cluster-config-file nodes.conf
done

# Create cluster
docker exec redis-7000 redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

**Application Configuration:**

```typescript
import Redis from 'ioredis';

const cluster = new Redis.Cluster([
  { host: 'localhost', port: 7000 },
  { host: 'localhost', port: 7001 },
  { host: 'localhost', port: 7002 }
]);
```

---

## Load Balancing

### HAProxy Configuration

```bash
# Install HAProxy
apt-get install haproxy

# Configure /etc/haproxy/haproxy.cfg
frontend http_front
    bind *:80
    default_backend http_back

backend http_back
    balance roundrobin
    option httpchk GET /health
    server api1 10.0.1.10:3000 check
    server api2 10.0.1.11:3000 check
    server api3 10.0.1.12:3000 check

# Restart HAProxy
systemctl restart haproxy
```

---

## Auto-scaling

### Docker Swarm Auto-scaling

```yaml
version: '3.8'
services:
  api:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      placement:
        constraints:
          - node.role == worker
```

### Kubernetes HPA (Horizontal Pod Autoscaler)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: defillama-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: defillama-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Monitoring and Metrics

### Key Metrics to Monitor

**Application Metrics:**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (%)
- Active connections

**Infrastructure Metrics:**
- CPU usage (%)
- Memory usage (%)
- Disk I/O (IOPS)
- Network throughput (Mbps)

**Database Metrics:**
- Connection count
- Query latency
- Cache hit rate
- Replication lag

### Grafana Dashboards

- **Application Dashboard:** http://localhost:3002/d/app
- **Infrastructure Dashboard:** http://localhost:3002/d/infra
- **Database Dashboard:** http://localhost:3002/d/db

### Alerts

Configure alerts for:
- CPU > 80% for 5 minutes
- Memory > 90% for 5 minutes
- Response time > 500ms for 5 minutes
- Error rate > 5% for 5 minutes

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-14  
**Next Review:** 2025-11-14

