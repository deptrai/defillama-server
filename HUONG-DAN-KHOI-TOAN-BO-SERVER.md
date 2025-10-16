# 🚀 HƯỚNG DẪN KHỞI ĐỘNG TOÀN BỘ SERVER DEFILLAMA

## 📋 TỔNG QUAN HỆ THỐNG

DeFiLlama Server là một hệ thống phức tạp gồm nhiều dịch vụ hoạt động cùng nhau để cung cấp dữ liệu DeFi real-time. Hệ thống được xây dựng theo kiến trúc microservices với Docker.

### 🏗️ CÁC THÀNH PHẦN CHÍNH

#### 1. DATABASE LAYER
- **PostgreSQL** (Port 5433): Database chính cho DeFiLlama
- **Redis** (Port 6380): Cache và session storage
- **DynamoDB Local** (Port 8000): Database cho serverless functions

#### 2. SUPABASE LAYER (WebSocket & API)
- **Supabase Kong** (Port 8000): API Gateway
- **Supabase Realtime** (Port 4000): WebSocket engine cho real-time updates
- **Supabase Auth**: Authentication service
- **Supabase REST**: Auto-generated REST API
- **Supabase Storage**: File storage service

#### 3. DEFILLAMA SERVICES
- **DeFiLlama WebSocket** (Port 8082): Custom WebSocket server
- **Coins Service** (Port 3005): Price và token data service
- **DeFi Service** (Port 3006): Protocol và TVL data service

#### 4. MONITORING LAYER
- **Prometheus** (Port 9090): Metrics collection
- **Grafana** (Port 3002): Monitoring dashboard
- **Node Exporter**: System metrics
- **PostgreSQL Exporter**: Database metrics

#### 5. LOAD BALANCER
- **Nginx** (Port 80/443): Load balancer và reverse proxy

## 🔑 PHƯƠG PHÁP KHỞI ĐỘNG

### PHƯƠNG PHÁP 1: DOCKER COMPLETO (DEVELOPMENT)

#### Bước 1: Chuẩn bị môi trường
```bash
# Clone repository
git clone https://github.com/DefiLlama/defillama-server.git
cd defillama-server

# Cài đặt Docker và Docker Compose nếu chưa có
# Mac: brew install docker docker-compose
# Ubuntu: sudo apt install docker.io docker-compose

# Start Docker Desktop (Mac) hoặc service (Linux)
```

#### Bước 2: Cấu hình Environment
```bash
# Copy file môi trường
cp .env.supabase .env

# Tạo secure passwords
openssl rand -base64 32  # POSTGRES_PASSWORD
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 64  # REALTIME_SECRET_KEY_BASE

# Edit .env file với các giá trị generated
nano .env
```

#### Bước 3: Khởi động tất cả services
```bash
# Khởi động cơ sở dữ liệu và monitoring
docker-compose -f docker-compose.yml up -d

# Đợi 30 giây cho database khởi động
sleep 30

# Khởi động Supabase layer
docker-compose -f docker-compose.supabase.yml up -d

# Đợi 60 giây cho Supabase初始化
sleep 60

# Khởi động hệ thống complete
docker-compose -f docker-compose.defillama-complete.yml up -d
```

#### Bước 4: Verify hệ thống
```bash
# Check tất cả containers
docker-compose -f docker-compose.defillama-complete.yml ps

# Health checks
curl http://localhost:8082/health      # DeFiLlama WebSocket
curl http://localhost:8000/_/health    # Supabase Kong
curl http://localhost:9090/targets     # Prometheus
curl http://localhost:3002/login       # Grafana
```

### PHƯƠNG PHÁP 2: LOCAL DEVELOPMENT

#### Bước 1: Database services
```bash
# Chỉ khởi động database và cache
docker-compose -f docker-compose.yml up -d postgres redis dynamodb-local
```

#### Bước 2: Cài đặt dependencies
```bash
# DeFi service dependencies
cd defi
npm install
cd ..

# Coins service dependencies  
cd coins
npm install
cd ..
```

#### Bước 3: Cấu hình environment files
```bash
# Copy environment files
cp defi/.env.example defi/.env
cp coins/.env.example coins/.env

# Configure database connections
# defi/.env:
DATABASE_URL=postgres://postgres:password@localhost:5433/defillama
REDIS_URL=redis://localhost:6380

# coins/.env:
DATABASE_URL=postgres://postgres:password@localhost:5433/defillama
REDIS_URL=redis://localhost:6380
```

#### Bước 4: Start local services
```bash
# Start DeFi service (terminal 1)
cd defi
npm run serve

# Start Coins service (terminal 2)
cd coins  
npm run serve

# Start simple mock server (terminal 3)
cd ..
node simple-server.js
```

#### Bước 5: Khởi động WebSocket
```bash
# Navigate đến WebSocket handlers
cd supabase-websocket-handlers

# Install dependencies
npm install

# Start WebSocket server
npm start
```

## 🔍 KIỂM TRA TRẠNG THÁI HỆ THỐNG

### Health Check Commands
```bash
# Tất cả important endpoints
echo "=== DeFiLlama WebSocket ==="
curl -s http://localhost:8082/health | jq .

echo "=== Supabase Kong Gateway ==="
curl -s http://localhost:8000/_/health | jq .

echo "=== PostgreSQL Connection ==="
docker exec defillama-postgres pg_isready -U postgres

echo "=== Redis Connection ==="
docker exec defillama-redis redis-cli ping

echo "=== Prometheus Targets ==="
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'

echo "=== Simple Mock Server ==="
curl -s http://localhost:3002/health | jq .
```

### Check Docker Containers
```bash
# Status tất cả containers
docker-compose -f docker-compose.defillama-complete.yml ps

# Logs của specific service
docker logs defillama-websocket --tail 50
docker logs defillama-supabase-realtime --tail 50  
docker logs defillama-postgres --tail 50

# Resource usage
docker stats
```

## ⚡ OPTIMAL STARTUP SEQUENCE

### Production Startup Sequence
```bash
#!/bin/bash
# defillama-startup.sh

echo "🚀 Starting DeFiLlama Server System..."

# 1. Database layer (phải khởi động trước)
echo "📊 Starting database services..."
docker-compose -f docker-compose.yml up -d postgres redis dynamodb-local

# 2. Đợi database sẵn sàng
echo "⏳ Waiting for databases..."
sleep 30
until docker exec defillama-postgres pg_isready -U postgres; do
    echo "PostgreSQL not ready, waiting..."
    sleep 5
done

# 3. Supabase infrastructure
echo "🔌 Starting Supabase services..."
docker-compose -f docker-compose.supabase.yml up -d

# 4. Đợi Supabase初始化
echo "⏳ Waiting for Supabase..."
sleep 60
curl -f http://localhost:8000/_/health || exit 1

# 5. Application services
echo "🎯 Starting DeFiLlama services..."
docker-compose -f docker-compose.defillama-complete.yml up -d defillama-websocket

# 6. Verify system
echo "✅ Verifying system health..."
./scripts/health-check.sh

echo "🎉 DeFiLlama Server System is READY!"
echo "📊 Dashboard: http://localhost:3002 (Grafana)"
echo "🔌 WebSocket: http://localhost:8082"
echo "🌐 API Gateway: http://localhost:8000"
```

### Health Check Script
```bash
#!/bin/bash
# scripts/health-check.sh

services=(
    "http://localhost:8082/health:DeFiLlama WebSocket"
    "http://localhost:8000/_/health:Supabase Kong"
    "http://localhost:3002/login:Grafana"
)

all_good=true

for service in "${services[@]}"; do
    url=$(echo $service | cut -d: -f1-2)
    name=$(echo $service | cut -d: -f3)
    
    if curl -f -s "$url" > /dev/null; then
        echo "✅ $name is UP"
    else
        echo "❌ $name is DOWN"
        all_good=false
    fi
done

# Database checks
if docker exec defillama-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is UP"
else
    echo "❌ PostgreSQL is DOWN"
    all_good=false
fi

if docker exec defillama-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is UP"
else
    echo "❌ Redis is DOWN"
    all_good=false
fi

if $all_good; then
    echo "🎉 All systems are operational!"
    exit 0
else
    echo "⚠️  Some services are down!"
    exit 1
fi
```

## 🔧 TÙY CHỈNH THEO NHIỆU VỤ

### Development Environment
```yaml
# docker-compose.override.yml cho development
version: '3.8'
services:
  defillama-websocket:
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
    volumes:
      - ./supabase-websocket-handlers/src:/app/src
    command: npm run dev
```

### Production Environment
```yaml
# docker-compose.prod.yml cho production
services:
  defillama-websocket:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    environment:
      NODE_ENV: production
      LOG_LEVEL: info
```

### Performance Tuning
```bash
# System optimization cho high load
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'net.core.somaxconn=65535' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog=65535' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Docker optimization
sudo systemctl edit docker
# Add:
# [Service]
# ExecStart=
# ExecStart=/usr/bin/dockerd --default-ulimit nofile=65536:65536 --default-ulimit nproc=65536:65536
```

## 🚨 TROUBLESHOOTING THÔNG THƯỜNG

### Port Already in Use
```bash
# Tìm process đang dùng port
lsof -i :8082
lsof -i :3002

# Kill process
kill -9 <PID>

# Hoặc thay đổi port trong docker-compose.yml
ports:
  - "8083:8080"  # Change từ 8082 sang 8083
```

### Database Connection Issues
```bash
# Check PostgreSQL status
docker logs defillama-postgres

# Reset database
docker-compose -f docker-compose.yml down postgres
docker volume rm defillama-server_postgres_data
docker-compose -f docker-compose.yml up -d postgres
```

### Memory Issues
```bash
# Increase Docker memory limits
# Docker Desktop -> Settings -> Resources -> Memory -> 8GB+

# Clean unused containers and images
docker system prune -a
docker volume prune
```

### Service Restart
```bash
# Restart specific service
docker-compose -f docker-compose.defillama-complete.yml restart defillama-websocket

# Restart all services
docker-compose -f docker-compose.defillama-complete.yml restart

# Full rebuild
docker-compose -f docker-compose.defillama-complete.yml down
docker-compose -f docker-compose.defillama-complete.yml up -d --build
```

## 📊 MONITORING VÀ LOGS

### Real-time Monitoring
```bash
# Grafana Dashboard
# URL: http://localhost:3002
# Username: admin
# Password: environment variable GRAFANA_PASSWORD

# Prometheus Metrics
# URL: http://localhost:9090
# Targets: http://localhost:9090/targets

# System logs
docker-compose -f docker-compose.defillama-complete.yml logs -f
```

### Important Metrics
- **WebSocket Connections**: Số lượng active connections
- **Message Throughput**: Messages/second qua WebSocket
- **Database Connections**: PostgreSQL connection pool usage
- **Redis Memory**: Redis memory usage
- **API Response Time**: API gateway response times
- **System Resources**: CPU, Memory, Disk usage

## 🎯 NEXT STEPS SAU KHI KHỞI ĐỘNG

1. **Testing**: Verify tất cả endpoints với Postman hoặc curl
2. **Configuration**: Tùy chỉnh environment variables theo production needs
3. **Security**: Configure SSL certificates và firewall rules
4. **Monitoring**: Set up alerts cho critical metrics
5. **Backup**: Configure automated database backups
6. **Documentation**: Update API documentation

## 📞 SUPPORT và TÀI NGUYỂN

- **Source Code**: https://github.com/DefiLlama/defillama-server
- **Documentation**: `/docs` folder
- **Issues**: GitHub Issues
- **Community**: DeFiLlama Discord

---

**🎉 CHÚC BẠN KHỞI ĐỘNG THÀNH CÔNG!** 

Hệ thống DeFiLlama Server của bạn đã sẵn sàng phục vụ với đầy đủ tính năng WebSocket real-time, API gateway, và monitoring complete!
