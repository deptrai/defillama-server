#!/bin/bash

# k6 Load Test Runner
# Runs all k6 performance tests for Advanced Query Processor

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
RESULTS_DIR="./results"

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}k6 Load Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}API URL:${NC} $API_URL"
echo -e "${GREEN}Results Directory:${NC} $RESULTS_DIR"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Please install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo -e "${GREEN}✓ k6 is installed${NC}"
echo ""

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    local duration=$3

    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Running: $test_name${NC}"
    echo -e "${BLUE}Duration: ~$duration${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    # Run k6 test
    if k6 run --out json="$RESULTS_DIR/${test_name}-results.json" "$test_file"; then
        echo ""
        echo -e "${GREEN}✓ $test_name completed successfully${NC}"
        echo ""
    else
        echo ""
        echo -e "${RED}✗ $test_name failed${NC}"
        echo ""
        return 1
    fi
}

# Menu
echo "Select test to run:"
echo "1. Baseline Performance Test (~7 minutes)"
echo "2. Complex Query Load Test (~9 minutes)"
echo "3. Cache Performance Test (~5.5 minutes)"
echo "4. Pagination Load Test (~5.5 minutes)"
echo "5. Stress & Spike Test (~17 minutes)"
echo "6. Soak Test (~34 minutes)"
echo "7. Run All Tests (except Soak Test) (~44 minutes)"
echo "8. Run All Tests (including Soak Test) (~78 minutes)"
echo ""
read -p "Enter your choice (1-8): " choice

case $choice in
    1)
        run_test "baseline-performance" "./baseline-performance.js" "7 minutes"
        ;;
    2)
        run_test "complex-query-load" "./complex-query-load.js" "9 minutes"
        ;;
    3)
        run_test "cache-performance" "./cache-performance.js" "5.5 minutes"
        ;;
    4)
        run_test "pagination-load" "./pagination-load.js" "5.5 minutes"
        ;;
    5)
        run_test "stress-spike" "./stress-spike.js" "17 minutes"
        ;;
    6)
        run_test "soak-test" "./soak-test.js" "34 minutes"
        ;;
    7)
        echo -e "${YELLOW}Running all tests (except Soak Test)...${NC}"
        echo ""
        run_test "baseline-performance" "./baseline-performance.js" "7 minutes"
        run_test "complex-query-load" "./complex-query-load.js" "9 minutes"
        run_test "cache-performance" "./cache-performance.js" "5.5 minutes"
        run_test "pagination-load" "./pagination-load.js" "5.5 minutes"
        run_test "stress-spike" "./stress-spike.js" "17 minutes"
        ;;
    8)
        echo -e "${YELLOW}Running all tests (including Soak Test)...${NC}"
        echo ""
        run_test "baseline-performance" "./baseline-performance.js" "7 minutes"
        run_test "complex-query-load" "./complex-query-load.js" "9 minutes"
        run_test "cache-performance" "./cache-performance.js" "5.5 minutes"
        run_test "pagination-load" "./pagination-load.js" "5.5 minutes"
        run_test "stress-spike" "./stress-spike.js" "17 minutes"
        run_test "soak-test" "./soak-test.js" "34 minutes"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}All tests completed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Results saved to:${NC} $RESULTS_DIR"
echo -e "${GREEN}HTML reports generated in current directory${NC}"
echo ""

