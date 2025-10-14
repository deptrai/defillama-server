#!/bin/bash

# Run Query Tests Script
# Runs all query module tests and reports results

set -e

echo "=========================================="
echo "Running Query Module Tests"
echo "=========================================="
echo ""

export ALERTS_DB="postgresql://defillama:defillama123@localhost:5432/defillama"

# Test files
TEST_FILES=(
  "src/query/tests/query-parser.test.ts"
  "src/query/tests/query-builder.test.ts"
  "src/query/tests/cache-manager.integration.test.ts"
  "src/query/tests/aggregation-engine.integration.test.ts"
  "src/query/tests/api-handler.integration.test.ts"
)

TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_SKIPPED=0

# Run each test file
for test_file in "${TEST_FILES[@]}"; do
  echo "Running: $test_file"
  echo "----------------------------------------"
  
  # Run test and capture output
  if npm test -- "$test_file" --passWithNoTests 2>&1 | tee /tmp/test-output.txt; then
    # Extract test counts from output
    PASSED=$(grep -oE "[0-9]+ passed" /tmp/test-output.txt | grep -oE "[0-9]+" || echo "0")
    FAILED=$(grep -oE "[0-9]+ failed" /tmp/test-output.txt | grep -oE "[0-9]+" || echo "0")
    SKIPPED=$(grep -oE "[0-9]+ skipped" /tmp/test-output.txt | grep -oE "[0-9]+" || echo "0")
    
    TOTAL_PASSED=$((TOTAL_PASSED + PASSED))
    TOTAL_FAILED=$((TOTAL_FAILED + FAILED))
    TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED))
    
    echo "✅ Passed: $PASSED, Failed: $FAILED, Skipped: $SKIPPED"
  else
    echo "❌ Test file failed to run"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
  fi
  
  echo ""
done

# Print summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total Passed:  $TOTAL_PASSED"
echo "Total Failed:  $TOTAL_FAILED"
echo "Total Skipped: $TOTAL_SKIPPED"
echo "Total Tests:   $((TOTAL_PASSED + TOTAL_FAILED + TOTAL_SKIPPED))"
echo ""

if [ $TOTAL_FAILED -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi

