#!/bin/bash

# DeFiLlama Monitoring Stack Test Script
# Tests all monitoring components and verifies they are working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Test functions
test_service_running() {
    local service=$1
    local container=$2
    
    if docker ps | grep -q "$container"; then
        print_success "$service is running"
        return 0
    else
        print_error "$service is not running"
        return 1
    fi
}

test_service_health() {
    local service=$1
    local url=$2
    local expected_status=${3:-200}
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$status" = "$expected_status" ]; then
        print_success "$service health check passed (HTTP $status)"
        return 0
    else
        print_error "$service health check failed (HTTP $status, expected $expected_status)"
        return 1
    fi
}

test_prometheus_targets() {
    local url="http://localhost:9090/api/v1/targets"
    local response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | jq -e '.data.activeTargets | length > 0' > /dev/null 2>&1; then
        local active_targets=$(echo "$response" | jq '.data.activeTargets | length')
        local healthy_targets=$(echo "$response" | jq '[.data.activeTargets[] | select(.health == "up")] | length')
        
        print_success "Prometheus has $active_targets targets ($healthy_targets healthy)"
        
        # List unhealthy targets
        local unhealthy=$(echo "$response" | jq -r '[.data.activeTargets[] | select(.health != "up") | .labels.job] | join(", ")')
        if [ -n "$unhealthy" ]; then
            print_error "Unhealthy targets: $unhealthy"
        fi
        
        return 0
    else
        print_error "Prometheus has no active targets"
        return 1
    fi
}

test_prometheus_rules() {
    local url="http://localhost:9090/api/v1/rules"
    local response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | jq -e '.data.groups | length > 0' > /dev/null 2>&1; then
        local rule_groups=$(echo "$response" | jq '.data.groups | length')
        local total_rules=$(echo "$response" | jq '[.data.groups[].rules | length] | add')
        
        print_success "Prometheus has $rule_groups rule groups with $total_rules rules"
        return 0
    else
        print_error "Prometheus has no rules loaded"
        return 1
    fi
}

test_alertmanager_config() {
    local url="http://localhost:9093/api/v2/status"
    local response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | jq -e '.config' > /dev/null 2>&1; then
        print_success "Alertmanager configuration is valid"
        return 0
    else
        print_error "Alertmanager configuration is invalid"
        return 1
    fi
}

test_grafana_datasources() {
    local url="http://localhost:3000/api/datasources"
    local response=$(curl -s -u admin:admin "$url" 2>/dev/null)
    
    if echo "$response" | jq -e 'length > 0' > /dev/null 2>&1; then
        local datasources=$(echo "$response" | jq 'length')
        print_success "Grafana has $datasources datasources configured"
        return 0
    else
        print_error "Grafana has no datasources configured"
        return 1
    fi
}

test_grafana_dashboards() {
    local url="http://localhost:3000/api/search"
    local response=$(curl -s -u admin:admin "$url" 2>/dev/null)
    
    if echo "$response" | jq -e 'length > 0' > /dev/null 2>&1; then
        local dashboards=$(echo "$response" | jq 'length')
        print_success "Grafana has $dashboards dashboards loaded"
        
        # List dashboards
        echo "$response" | jq -r '.[] | "  - \(.title)"'
        
        return 0
    else
        print_error "Grafana has no dashboards loaded"
        return 1
    fi
}

test_loki_ready() {
    local url="http://localhost:3100/ready"
    local response=$(curl -s "$url" 2>/dev/null)
    
    if [ "$response" = "ready" ]; then
        print_success "Loki is ready"
        return 0
    else
        print_error "Loki is not ready"
        return 1
    fi
}

test_promtail_targets() {
    local url="http://localhost:9080/targets"
    local response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | jq -e '.activeTargets | length > 0' > /dev/null 2>&1; then
        local active_targets=$(echo "$response" | jq '.activeTargets | length')
        print_success "Promtail has $active_targets active targets"
        return 0
    else
        print_error "Promtail has no active targets"
        return 1
    fi
}

test_exporters() {
    local exporters=(
        "postgres-exporter:9187"
        "redis-exporter:9121"
        "node-exporter:9100"
        "cadvisor:8080"
    )
    
    for exporter in "${exporters[@]}"; do
        local name=$(echo "$exporter" | cut -d: -f1)
        local port=$(echo "$exporter" | cut -d: -f2)
        local url="http://localhost:$port/metrics"
        
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$name is exposing metrics"
        else
            print_error "$name is not exposing metrics"
        fi
    done
}

# Main test execution
main() {
    print_header "DeFiLlama Monitoring Stack Tests"
    
    print_info "Starting monitoring stack tests..."
    print_info "This will verify all monitoring components are working correctly."
    echo ""
    
    # Test 1: Service Status
    print_header "Test 1: Service Status"
    test_service_running "Prometheus" "defillama-prometheus"
    test_service_running "Alertmanager" "defillama-alertmanager"
    test_service_running "Grafana" "defillama-grafana"
    test_service_running "Loki" "defillama-loki"
    test_service_running "Promtail" "defillama-promtail"
    test_service_running "PostgreSQL Exporter" "defillama-postgres-exporter"
    test_service_running "Redis Exporter" "defillama-redis-exporter"
    test_service_running "Node Exporter" "defillama-node-exporter"
    test_service_running "cAdvisor" "defillama-cadvisor"
    
    # Test 2: Service Health
    print_header "Test 2: Service Health"
    test_service_health "Prometheus" "http://localhost:9090/-/healthy"
    test_service_health "Alertmanager" "http://localhost:9093/-/healthy"
    test_service_health "Grafana" "http://localhost:3000/api/health"
    test_loki_ready
    
    # Test 3: Prometheus Configuration
    print_header "Test 3: Prometheus Configuration"
    test_prometheus_targets
    test_prometheus_rules
    
    # Test 4: Alertmanager Configuration
    print_header "Test 4: Alertmanager Configuration"
    test_alertmanager_config
    
    # Test 5: Grafana Configuration
    print_header "Test 5: Grafana Configuration"
    test_grafana_datasources
    test_grafana_dashboards
    
    # Test 6: Promtail Configuration
    print_header "Test 6: Promtail Configuration"
    test_promtail_targets
    
    # Test 7: Exporters
    print_header "Test 7: Exporters"
    test_exporters
    
    # Summary
    print_header "Test Summary"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_success "All tests passed! Monitoring stack is healthy."
        exit 0
    else
        print_error "Some tests failed. Please check the output above."
        exit 1
    fi
}

# Run main function
main

