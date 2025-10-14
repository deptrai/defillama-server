# Docker Swarm Scaling Guide

**Version:** 1.0  
**Last Updated:** 2025-10-14  
**Author:** Augment Agent (Claude Sonnet 4)

---

## Overview

This guide provides instructions for migrating from Docker Compose to Docker Swarm for horizontal scaling and high availability.

**Benefits:**
- Native Docker orchestration
- Built-in load balancing
- Service discovery
- Rolling updates
- Health checks
- Secrets management

**Target Architecture:**
- 3+ manager nodes (high availability)
- 5+ worker nodes (scalability)
- Overlay network for service communication
- Shared storage for stateful services

---

## Prerequisites

- Docker 20.10+ installed on all nodes
- Network connectivity between nodes
- Shared storage (NFS, GlusterFS, or Ceph)
- Load balancer (HAProxy or Nginx)

---

## Migration Steps

### 1. Initialize Swarm

```bash
# On manager node
docker swarm init --advertise-addr <MANAGER-IP>

# Save join tokens
docker swarm join-token manager  # For additional managers
docker swarm join-token worker   # For workers
```

### 2. Add Nodes

```bash
# On additional manager nodes
docker swarm join --token <MANAGER-TOKEN> <MANAGER-IP>:2377

# On worker nodes
docker swarm join --token <WORKER-TOKEN> <MANAGER-IP>:2377

# Verify nodes
docker node ls
```

### 3. Create Overlay Network

```bash
# Create overlay network
docker network create \
  --driver overlay \
  --attachable \
  defillama-network

# Verify network
docker network ls
```

### 4. Setup Shared Storage

**NFS Setup:**

```bash
# On NFS server
apt-get install nfs-kernel-server
mkdir -p /mnt/nfs/postgres /mnt/nfs/redis
echo "/mnt/nfs *(rw,sync,no_subtree_check,no_root_squash)" >> /etc/exports
exportfs -a
systemctl restart nfs-kernel-server

# On all nodes
apt-get install nfs-common
mkdir -p /mnt/postgres /mnt/redis
mount <NFS-SERVER>:/mnt/nfs/postgres /mnt/postgres
mount <NFS-SERVER>:/mnt/nfs/redis /mnt/redis
```

### 5. Convert Docker Compose to Stack

**docker-compose.swarm.yml:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
    environment:
      POSTGRES_DB: defillama
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - defillama-network
    secrets:
      - postgres_password

  redis:
    image: redis:7-alpine
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
    volumes:
      - redis_data:/data
    networks:
      - defillama-network

  api:
    image: ghcr.io/defillama/api:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      rollback_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        max_attempts: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    environment:
      NODE_ENV: production
      POSTGRES_HOST: postgres
      REDIS_HOST: redis
    networks:
      - defillama-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    image: ghcr.io/defillama/worker:latest
    deploy:
      replicas: 5
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
    environment:
      NODE_ENV: production
      POSTGRES_HOST: postgres
      REDIS_HOST: redis
    networks:
      - defillama-network

volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=<NFS-SERVER>,rw
      device: ":/mnt/nfs/postgres"
  
  redis_data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=<NFS-SERVER>,rw
      device: ":/mnt/nfs/redis"

networks:
  defillama-network:
    external: true

secrets:
  postgres_password:
    external: true
```

### 6. Create Secrets

```bash
# Create secrets
echo "your_postgres_password" | docker secret create postgres_password -
echo "your_redis_password" | docker secret create redis_password -

# Verify secrets
docker secret ls
```

### 7. Deploy Stack

```bash
# Deploy stack
docker stack deploy -c docker-compose.swarm.yml defillama

# Verify deployment
docker stack ls
docker stack services defillama
docker stack ps defillama
```

---

## Scaling Operations

### Scale Services

```bash
# Scale API service
docker service scale defillama_api=5

# Scale worker service
docker service scale defillama_worker=10

# Verify scaling
docker service ls
docker service ps defillama_api
```

### Update Services

```bash
# Update API image
docker service update --image ghcr.io/defillama/api:v2.0 defillama_api

# Update with rollback on failure
docker service update \
  --image ghcr.io/defillama/api:v2.0 \
  --update-failure-action rollback \
  defillama_api
```

### Rolling Updates

```bash
# Configure rolling update
docker service update \
  --update-parallelism 2 \
  --update-delay 30s \
  --update-order start-first \
  defillama_api
```

---

## Monitoring

### Service Status

```bash
# List services
docker service ls

# Inspect service
docker service inspect defillama_api

# View service logs
docker service logs -f defillama_api

# View task status
docker service ps defillama_api
```

### Node Status

```bash
# List nodes
docker node ls

# Inspect node
docker node inspect <NODE-ID>

# View node tasks
docker node ps <NODE-ID>
```

---

## High Availability

### Manager Quorum

- **3 managers:** Tolerates 1 failure
- **5 managers:** Tolerates 2 failures
- **7 managers:** Tolerates 3 failures

### Drain Node for Maintenance

```bash
# Drain node (move tasks to other nodes)
docker node update --availability drain <NODE-ID>

# Perform maintenance
# ...

# Activate node
docker node update --availability active <NODE-ID>
```

---

## Troubleshooting

### Service Not Starting

```bash
# Check service logs
docker service logs defillama_api

# Check task status
docker service ps defillama_api --no-trunc

# Inspect service
docker service inspect defillama_api
```

### Network Issues

```bash
# Check overlay network
docker network inspect defillama-network

# Test connectivity
docker run --rm --network defillama-network alpine ping postgres
```

### Storage Issues

```bash
# Check NFS mount
df -h | grep nfs
mount | grep nfs

# Remount NFS
umount /mnt/postgres
mount <NFS-SERVER>:/mnt/nfs/postgres /mnt/postgres
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-14  
**Next Review:** 2025-11-14

