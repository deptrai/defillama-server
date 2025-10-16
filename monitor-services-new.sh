#!/bin/bash

echo "🚀 DEFINLAMA SERVICES MONITORING - Port Range 5000-5099"
echo "======================================================="
echo "🕒 " $(date)"
echo ""

# Service endpoint mapping
declare -A services=(
    ["PostgreSQL", "5004", "Database Server", "http://localhost:5004"]
    ["Redis", "5005", "Cache Server", "redis://localhost:5005/"]
    ["DeFi API", "5000", "API Server", "http://localhost:5000/api/v1/"]
    ["MEV WebSocket", "5001", "MEV Detection Server", "ws://localhost:5001/"]
    ["Coins Service", "5002", "Token/Price API", "http://localhost:5002/health"]
    ["DeFiLlama Frontend", "5003", "Web Interface", "http://localhost:5003/"]
    ["Supabase Kong", "5006", "API Gateway", "http://localhost:5006/_/health"]
    ["Supabase Realtime", "5007", "Realtime Engine", "http://localhost:5007/health"]
    ["Supabase REST", "5008", "REST API", "http://localhost:5008/rest/v1/"]
    ["Monitoring Stack", "5009", "Monitoring Dashboard", "http://localhost:5009/targets"]
    ["Supabase Studio", "5500", "Admin Dashboard", "http://localhost:5500/"]
)

# Service status array
declare -A status=()

# Check each service
for service in "${services[@]}"; do
    name="${service[0]}"
    port="${service[1]}"
    desc="${service[2]}"
    endpoint="${service[3]}"
    
    echo -n "🔍 Checking $name (Port $port)..."
    
    case $name in
        "PostgreSQL")
            if docker exec defillama-postgres pg_isready -U postgres > /dev/null 2>&1; then
                status="✅ HEALTHY"
                echo "  ✅ PostgreSQL database connected"
            else
                status="❌ DOWN"
                echo "  ❌ PostgreSQL database connection failed"
            fi
            ;;
        "Redis")
            if docker exec defillama-redis redis-cli ping > /dev/null 2>&1; then
                status="✅ HEALTHY"
                echo "  ✅ Redis cache server responding"
            else
                status="❌ DOWN"
                echo "  ❌ Redis cache server not responding"
            fi
            ;;
        "DeFi API")
            if curl -s --max-time 3 "$endpoint" > /dev/null 2>&1 && curl -s --max-time 3 "$endpoint/api/v1/protocols" > /dev/null 2>&1; then
                status="✅ RUNNING"
                echo "  ✅ API server responding"
            else
                status="❌ DOWN"
                echo "  ❌ API server not responding"
            fi
            ;;
        "MEV WebSocket")
            if curl -s --max-time 3 "http://localhost:5001/health" > /dev/null 2>&1; then
                status="✅ HEALTHY"
                echo "  ✅ MEV WebSocket server healthy"
            else
                status="❌ DOWN"
                echo "  ❌ MEV WebSocket server not responding"
            fi
            ;;
        "Coins Service")
            if curl -s --max-time 3 "$endpoint" > /dev/null 2>&1 || curl -s http://localhost:5002/api/v1/coins > /dev/null 2>&1; then
                status="✅ RUNNING"
                echo "  ✅ Coins service responding"
            else
                status="❌ DOWN"
                echo "  ❌ Coins service not responding"  
            fi
            ;;
        "DeFiLlama Frontend")
            if curl -s --max-time 3 "http://localhost:5003/" | grep -q "DeFiLlama" || curl -s --max-time 3 "http://localhost:5003/api/chains" > /dev/null 2>&1; then
                status="✅ RUNNING"
                echo "  ✅ DeFiLlama frontend accessible"
            else
                status="❌ DOWN"
                echo   ❌ DeFiLlama frontend not accessible"
            fi
            ;;
        "Supabase Kong"|"Supabase Metrics")
            if curl -s --max-time 3 "$endpoint" > /dev/null 2>&1 || curl -s --max-time 3 "http://localhost:5006/_/health" > /dev/null 2>&1; then
                status="✅ HEALTHY"
                echo "  ✅ Supabase Kong API gateway running"
            else
                status="❌ DOWN"
                echo "  ❌ Supabase Kong API gateway not responding"
            fi
            ;;
        "Supabase Realtime")
            if curl -s --max-time 3 "$endpoint" > /dev/null 2>&1 || curl -s --max-time 3 "http://localhost:5007" > /dev/null 2>&1; then
                status="✅ HEALTHY"
                echo "  ✅ Supabase realtime engine running"
            else
                status="❌ DOWN"
                echo "  ❌ Supabase realtime engine not responding"
            fi
            ;;
        "Supabase REST")
            if curl -s --max-time 3 "$endpoint" > /dev/null 2>&1 || curl -s --max-time 3 "http://localhost:5008/rest/v1/" > /dev/null 2>&1; then
                status="✅ RUNNING"
                echo "  ✅ Supabase REST API responding"
            else
                status="❌ DOWN"
                echo "  ❌ Supabase REST API not responding"
            fi
            ;;
        "Monitoring Stack")
            if curl -s --max-time 3 "http://localhost:5009/targets" > /dev/null 2>&1; then
                status="✅ RUNNING"
                echo "  ✅ Prometheus metrics collector running"
            else
                status="❌ DOWN"
                echo "  ❌ Monitoring stack not accessible"
            fi
            ;;
        "Supabase Studio")
            if curl -s --max-time 3 "$endpoint" > /dev/null 2>&1; then
                status="✅ RUNNING"
                echo "  ✅ Supabase Studio admin dashboard accessible"
            else
                status="❌ DOWN"
                echo "  ❌ Supabase Studio not accessible"
            fi
            ;;
    esac
    
    # Update status array
    if [[ "$status" == *"✅"* ]]; then
        status="✅ HEALTHY"
    fi
    
    # Check specific service details
    case $name in
        "DeFi API")
            api_response=$(curl -s --max-time 5 "$endpoint/api/v1/protocols?limit=1" 2>/dev/null)
            if [[ "$api_response" == *"protocols"* ]]; then
                echo "  ✅ API endpoints responding correctly"
            fi
            ;;
        "MEV WebSocket")  
            ws_response=$(curl -s --max-time 3 "$endpoint" 2>/dev/null)
            if [[ "$ws_response" == *"healthy"* ]]; then
                uptime=$(echo "$ws_response" | grep -o '\"uptime\":[0-9]*')
                connections=$(echo "$ws_response" | grep -o '\"connections\":[0-9]*')
                echo "  ⏱️ Uptime: ${uptime:-1}s | Connections: ${connections:-1}"
            fi
            ;;
    esac
    
    echo "  $name: $status"
done

echo ""
echo "📊 SERVICE STATUS SUMMARY"
echo "============================"
total_services=${#services[@]}

# Count services by status
healthy_count=0
down_count=0

for i in "${!status[@]}"; do
    if [[ "$i" == *"✅ HEALTHY"* ]]; then
        ((healthy_count++))
    else
        ((down_count++))
    fi
done

if [ "$healthy_count" -eq "$total_services" ]; then
    echo "🎉 ALL SYSTEMS HEALTHY!"
elif [ "$healthy_count" -gt 0 ]; then
    echo "⚠️  $healthy_count/$total_services services healthy"
else
    echo "❌ ALL SERVICES DOWN!"
fi

echo ""
echo "🔗 QUICK CHECKS:"
echo "  PostgreSQL: $(printf '%s\n' "$(docker exec defillama-postgres pg_isready -U postgres 2>/dev/null && echo 'OK' || echo 'FAILED')"
echo "  Redis: $(docker exec defillama-redis redis-cli ping 2>/dev/null && echo 'OK' || echo 'FAILED')"
echo "  MEV WebSocket: $(curl -s http://localhost:5001/health 2>/dev/null && echo 'OK' || echo 'FAILED')"

echo ""
echo "🛠 MONITORING ENDPOINTS:"
echo "  Database Admin: psql -h localhost -p 5004 -U defillama"
echo "  Redis Admin: redis-cli -h localhost -p 5005"
echo "  API Docs: http://localhost:5000/api/v1/"
echo "  WebSocket API: ws://localhost:5001/"
echo "  Frontend: http://localhost:5003"
echo "  Supabase Studio: http://localhost:5500"
echo "  Monitoring: http://localhost:5009/targets"
