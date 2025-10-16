# 🚀 DeFiLamma Server Port Mapping Plan
## 5000-5099 Port Range Allocation

### 📊 PORT ASSIGNMENT MATRIX

| Port | Service | Description | Status |
|------|---------|-------------|--------|
| 5000 | **DeFiLlama API Server** | Main API2 server | PRIMARY |
| 5001 | **MEV WebSocket Server** | Real-time MEV detection | PRIMARY |
| 5002 | **Coins Service** | Price/token data | PRIMARY |
| 5003 | **DeFiLlama Frontend** | Main web interface | PRIMARY |
| 5004 | **PostgreSQL Database** | Main database server | PRIMARY |
| 5005 | **Redis Cache** | Caching layer | PRIMARY |
| 5006 | **Supabase Kong API Gateway** | API gateway | SECONDARY |
| 5007 | **Supabase Realtime WebSocket** | Real-time engine | SECONDARY |
| 5008 | **Supabase REST API** | Auto-generated REST | SECONDARY |
| 5009 | **Monitoring Stack** | Prometheus/Grafana | SECONDARY |

### 🌐 BACKUP PORTS (8000-8099)

| Port | Service | Purpose | Current Status |
|------|---------|---------|-------------|
| 8082 | Legacy WebSocket | DeFiLlama WebSocket | CONFLICT |
| 8000 | Supabase Kong | API Gateway | CONFLICT |
| 3003 | Frontend Dev | Development server | CONFLICT |
| 5500 | Supabase Studio | Database admin | CONFLICT |

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Stop All Services
```bash
# Stop all running services
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.supabase.yml down
docker-compose -f docker-compose.defillama-complete.yml down

# Kill any remaining processes
pkill -f "npm run dev"
pkill -f "next dev"
```

### Phase 2: Update Configuration Files

#### 1. Database Services (`docker-compose.yml`)
```yaml
services:
  postgres:
    container_name: defillama-postgres
    ports:
      - "5004:5432"
    # ... rest of config
```

#### 2. Redis (`docker-compose.yml`)
```yaml
services:
  redis:
    container_name: defillama-redis
    ports:
      - "5005:6379"
    # ... rest of config
```

#### 3. Main API Server
```bash
# Update .env files to use port 5000
echo "API_PORT=5000" >> defi/.env
echo "WS_PORT=5001" >> defi/.env
```

#### 4. Frontend
```bash
# Update next.config.ts for port 5003
```

#### 5. Supabase Complete Stack
```yaml
# docker-compose.defillama-complete.yml updated ports:
supabase-kong: "5006:8000"
supabase-realtime: "5007:4000"
supabase-storage: "5008:5000"
defillama-websocket: "5001:8080"
monitoring-stack: "5009:9090"
```

### Phase 3: Environment Updates

#### Services Configuration
- **DeFi API**: Port 5000
- **WebSocket**: Port 5001  
- **Coins Service**: Port 5002
- **Frontend**: Port 5003
- **PostgreSQL**: Port 5004
- **Redis**: Port 5005

#### Supabase Stack  
- **Kong Gateway**: Port 5006
- **Realtime**: Port 5007
- **REST API**: Port 5008
- **Monitoring**: Port 5009

### Phase 4: Startup Sequence

#### Database Layer First
```bash
# 1. Start PostgreSQL (Port 5004)
# 2. Start Redis (Port 5005)
docker-compose -f docker-compose.yml up -d postgres redis
```

#### Supabase Layer Second
```bash
# 3. Start Supabase complete stack
docker-compose -f docker-compose.supabase.yml up -d
```

#### Application Layer Third
```bash
# 4. Start Coins Service (Port 5002)
cd coins && npm run serve &

# 5. Start DeFi API Server (Port 5000)
cd defi && npm run api2-dev &

# 6. Start WebSocket Server (Port 5001)
cd supabase-websocket-handlers && npm start &
```

#### Frontend Layer Fourth
```bash
# 7. Start DeFiLlama Frontend (Port 5003)
cd defillama-app && npm run dev &
```

---

## 🧪 VALIDATION CHECKLIST

### Post-Startup Verification
```bash
# Check all ports are correct
ports=(
"5000:DeFi API"
"5001:MEV WebSocket" 
"5002:Coins Service"
"5003:Frontend"
"5004:PostgreSQL"
"5005:Redis"
"5006:Supabase Kong"
"5007:Supabase Realtime"
"5008:Supabase REST" 
"5009:Monitoring"
)

for port in "${ports[@]}"; do
  port_num=$(echo $port | cut -d: -f1)
  service=$(echo $port | cut -d: -f2)
  if curl -s http://localhost:$port_num/health > /dev/null 2>&1; then
    echo "✅ $service - Port $port_num: HEALTHY"
  else
    echo "❌ $service - Port $port_num: FAILED"
  fi
done
```

### Integration Tests
```bash
# Test WebSocket connection to new port
curl -s http://localhost:5001/health

# Test API endpoints
curl -s http://localhost:5000/health

# Test database connection  
docker exec defillama-postgres pg_isready -U postgres

# Test frontend
curl -s http://localhost:5003/ | grep -o "DeFiLlama"
```

---

## 🚀 STARTUP SCRIPT

### Complete System Startup Script
```bash
#!/bin/bash
echo "🚀 Starting DeFiLlama Server - Port Range 5000-5099"
echo "=========================================="

# Function to check port availability
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN | grep -q LISTEN; then
        echo "❌ Port $port is in use"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Check all required ports are available
required_ports=(5000 5001 5002 5003 5004 5005 5006 5007 5008 5009)
echo "🔍 Checking port availability..."

for port in "${required_ports[@]}"; do
    check_port $port || exit 1
done

echo "✅ All required ports are available"
echo ""

# Stop all existing services
echo "🛑 Stopping existing services..."
docker-compose -f docker-compose.yml down --remove-orphans || true
docker-compose -f docker-compose.supabase.yml down --remove-orphans || true  
docker-compose -f docker-compose.defillama-complete.yml down --remove-orphans || true

# Kill any remaining processes
echo "🔌 Cleaning up remaining processes..."
pkill -f "node.*serve" || true
pkill -f "npm.*dev" || true
pkill -f "next.*dev" || true

sleep 3

# Start database layer
echo "📊 Starting database layer..."
docker-compose -f docker-compose.yml up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database initialization..."
sleep 10

# Start Supabase stack  
echo "🔌 Starting Supabase stack..."
docker-compose -f docker-compose.supabase.yml up -d

# Wait for Supabase to be ready
echo "⏳ Waiting for Supabase initialization..."
sleep 15

# Start application services
echo "🚀 Starting application services..."

# Coins service
cd coins
nohup npm run serve > ../logs/coins.log 2>&1 &
echo "✅ Coins Service started on port 5002"

# DeFi API server
cd ../defi  
nohup npm run api2-dev > ../logs/api.log 2>&1 &
echo "✅ DeFi API started on port 5000"

# WebSocket service
cd ../supabase-websocket-handlers
nohup npm start > ../logs/websocket.log 2>&1 &
echo "✅ WebSocket server started on port 5001"

# Frontend
cd ../defillama-app
nohup npm run dev > ../logs/frontend.log 2>&1 &
echo "✅ Frontend started on port 5003"

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 20

# Verification
echo "🔍 Verifying all services..."

# Check critical endpoints
if curl -s http://localhost:5001/health | grep -q "healthy"; then
    echo "✅ WebSocket Server: HEALTHY"
else
    echo "❌ WebSocket Server: FAILED"
fi

if curl -s http://localhost:5000/api/v1/protocols > /dev/null; then
    echo "✅ DeFi API: RUNNING"
else
    echo "❌ DeFi API: FAILED"  
fi

if curl -s http://localhost:5002/health > /dev/null; then
    echo "✅ Coins Service: RUNNING"
else
    echo "❌ Coins Service: FAILED"
fi

if curl -s http://localhost:5003/ | grep -q "DeFiLlama"; then
    echo "✅ Frontend: RUNNING"
else
    echo "❌ Frontend: FAILED"
fi

echo ""
echo "🎉 DeFiLlama Server Started Successfully!"
echo "=========================================="
echo "📍 Access Points:"
echo "  • Frontend: http://localhost:5003"
echo "  • API Server: http://localhost:5000"
echo "  • WebSocket: ws://localhost:5001"
echo "  • Coins API: http://localhost:5002"
echo "  • Database: PostgreSQL on localhost:5004"
echo "  • Redis: localhost:5005"
echo "  • Monitoring: http://localhost:5009"
echo ""
echo "📊 Status Summary:"
echo "  ✅ Database PostgreSQL - Port 5004"
echo "  ✅ Redis Cache - Port 5005"  
echo "  ✅ Supabase Kong - Port 5006"
echo "  ✅ Supabase Realtime - Port 5007"
echo "  ✅ Supabase REST - Port 5008"
echo "  ✅ Monitoring Stack - Port 5009"
echo "  ✅ MEV WebSocket - Port 5001"
echo "  ✅ DeFi API - Port 5000"
echo "  ✅ Coins Service - Port 5002"
echo "  ✅ Main Frontend - Port 5003"
echo "=========================================="

# Create monitor script
cat > monitor-services.sh << 'EOF'
#!/bin/bash
echo "📊 Service Status Monitor - $(date)"
echo "============================="

services=(
    "Defi API:http://localhost:5000/api/v1/protocols"
    "WebSocket:http://localhost:5001/health"
    "Coins:http://localhost:5002/health"  
    "Frontend:http://localhost:5003/"
    "PostgreSQL:localhost:5004"
    "Redis:localhost:5005"
    "Supabase Kong:http://localhost:5006/_/health"
    "Monitoring:http://localhost:5009/targets"
)

for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    endpoint=$(echo $service | cut -d: -f2)
    
    if curl -s --max-time 3 "$endpoint" > /dev/null 2>&1; then
        echo "✅ $name: RUNNING"
    else
        echo "❌ $name: DOWN"
    fi
done
EOF

chmod +x monitor-services.sh

echo ""
echo "📋 Created monitoring script: ./monitor-services.sh"
echo ""
echo "💡 Use './monitor-services.sh' to check service status anytime"
echo ""
```

Phần tiếp theo: Bây cấu hình các file Docker và environment theo kế hoạch trên.
