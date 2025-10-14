# Database Scaling Guide

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Author:** Augment Agent (Claude Sonnet 4)

---

## Overview

This guide provides strategies for scaling PostgreSQL database to handle increased load and data volume.

**Scaling Strategies:**
- **Read Replicas:** Distribute read queries
- **Connection Pooling:** Reduce connection overhead
- **Partitioning:** Split large tables
- **Sharding:** Distribute data across multiple databases
- **Caching:** Reduce database load

---

## Read Replicas

### Setup Streaming Replication

**Primary Server Configuration:**

```bash
# Edit postgresql.conf
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1GB
hot_standby = on

# Edit pg_hba.conf
host replication replicator 0.0.0.0/0 md5

# Create replication user
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'password';

# Restart PostgreSQL
systemctl restart postgresql
```

**Replica Server Setup:**

```bash
# Stop PostgreSQL
systemctl stop postgresql

# Remove existing data
rm -rf /var/lib/postgresql/15/main/*

# Create base backup
pg_basebackup -h primary-host -D /var/lib/postgresql/15/main -U replicator -P -v -R

# Start PostgreSQL
systemctl start postgresql

# Verify replication
psql -c "SELECT * FROM pg_stat_replication;"
```

### Application Configuration

```typescript
// Read-write splitting
import { Pool } from 'pg';

const primaryPool = new Pool({
  host: 'postgres-primary',
  port: 5432,
  database: 'defillama',
  user: 'postgres',
  password: 'password',
  max: 20
});

const replicaPool = new Pool({
  host: 'postgres-replica',
  port: 5432,
  database: 'defillama',
  user: 'postgres',
  password: 'password',
  max: 50
});

// Use primary for writes
async function writeQuery(sql, params) {
  return primaryPool.query(sql, params);
}

// Use replica for reads
async function readQuery(sql, params) {
  return replicaPool.query(sql, params);
}
```

---

## Connection Pooling

### PgBouncer Setup

```bash
# Install PgBouncer
apt-get install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
defillama = host=localhost port=5432 dbname=defillama

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 100

# Create userlist.txt
echo '"postgres" "md5<password_hash>"' > /etc/pgbouncer/userlist.txt

# Start PgBouncer
systemctl start pgbouncer
systemctl enable pgbouncer
```

**Application Configuration:**

```typescript
// Change port from 5432 to 6432
const pool = new Pool({
  host: 'localhost',
  port: 6432,  // PgBouncer port
  database: 'defillama',
  user: 'postgres',
  password: 'password',
  max: 100  // Can be higher with PgBouncer
});
```

---

## Table Partitioning

### Range Partitioning

```sql
-- Create partitioned table
CREATE TABLE tvl_data (
    id BIGSERIAL,
    protocol_id INT,
    timestamp TIMESTAMP,
    tvl NUMERIC,
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions
CREATE TABLE tvl_data_2024_01 PARTITION OF tvl_data
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE tvl_data_2024_02 PARTITION OF tvl_data
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Create indexes on partitions
CREATE INDEX idx_tvl_data_2024_01_protocol ON tvl_data_2024_01(protocol_id);
CREATE INDEX idx_tvl_data_2024_02_protocol ON tvl_data_2024_02(protocol_id);

-- Auto-create partitions
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date TEXT;
    end_date TEXT;
BEGIN
    partition_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
    partition_name := 'tvl_data_' || TO_CHAR(partition_date, 'YYYY_MM');
    start_date := partition_date::TEXT;
    end_date := (partition_date + INTERVAL '1 month')::TEXT;
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF tvl_data FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Schedule partition creation
SELECT cron.schedule('create-partition', '0 0 1 * *', 'SELECT create_monthly_partition()');
```

---

## Sharding

### Horizontal Sharding

```typescript
// Shard by protocol_id
function getShardConnection(protocolId: number) {
  const shardCount = 4;
  const shardId = protocolId % shardCount;
  
  const shards = [
    { host: 'postgres-shard-0', port: 5432 },
    { host: 'postgres-shard-1', port: 5432 },
    { host: 'postgres-shard-2', port: 5432 },
    { host: 'postgres-shard-3', port: 5432 }
  ];
  
  return new Pool({
    ...shards[shardId],
    database: 'defillama',
    user: 'postgres',
    password: 'password'
  });
}

// Query across shards
async function queryAllShards(sql: string) {
  const results = await Promise.all(
    [0, 1, 2, 3].map(shardId => {
      const pool = getShardConnection(shardId);
      return pool.query(sql);
    })
  );
  
  return results.flatMap(r => r.rows);
}
```

---

## Caching

### Redis Caching Layer

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379
});

async function getCachedQuery(key: string, queryFn: () => Promise<any>, ttl: number = 3600) {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Query database
  const result = await queryFn();
  
  // Cache result
  await redis.setex(key, ttl, JSON.stringify(result));
  
  return result;
}

// Usage
const protocols = await getCachedQuery(
  'protocols:all',
  () => pool.query('SELECT * FROM protocols'),
  3600  // 1 hour TTL
);
```

---

## Performance Tuning

### PostgreSQL Configuration

```ini
# /etc/postgresql/15/main/postgresql.conf

# Memory
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB
maintenance_work_mem = 1GB

# Connections
max_connections = 200

# WAL
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# Query Planning
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000  # Log slow queries (>1s)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

### Indexes

```sql
-- Create indexes for common queries
CREATE INDEX idx_protocols_name ON protocols(name);
CREATE INDEX idx_tvl_protocol_timestamp ON tvl_data(protocol_id, timestamp DESC);
CREATE INDEX idx_transactions_hash ON transactions(hash);

-- Partial indexes
CREATE INDEX idx_active_protocols ON protocols(id) WHERE active = true;

-- Covering indexes
CREATE INDEX idx_protocols_covering ON protocols(id, name, tvl) INCLUDE (description);

-- Analyze tables
ANALYZE protocols;
ANALYZE tvl_data;
```

---

## Monitoring

### Key Metrics

```sql
-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 minute';

-- Cache hit ratio
SELECT 
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-14  
**Next Review:** 2025-11-14

