#!/bin/bash

# Check Extended MEV Test Progress
# Quick script to check current test status

echo "================================================================================"
echo "MEV EXTENDED TEST PROGRESS"
echo "================================================================================"
echo ""

# Check if test is running
if pgrep -f "run-extended-mev-test.ts" > /dev/null; then
    echo "✅ Test Status: RUNNING"
    echo ""
else
    echo "❌ Test Status: NOT RUNNING"
    echo ""
    exit 1
fi

# Count opportunities in last hour
echo "📊 Opportunities in Last Hour:"
echo "------------------------------"
docker exec -i chainlens-postgres psql -U defillama -d defillama -t -c "
SELECT COUNT(*) 
FROM mev_opportunities 
WHERE created_at >= NOW() - INTERVAL '1 hour';
" 2>/dev/null | xargs echo "Total:"

echo ""

# Opportunities by detector
echo "By Detector:"
docker exec -i chainlens-postgres psql -U defillama -d defillama -t -c "
SELECT detector_type, COUNT(*) 
FROM mev_opportunities 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY detector_type
ORDER BY COUNT(*) DESC;
" 2>/dev/null | sed 's/^/  /'

echo ""

# Opportunities by profit tier
echo "By Profit Tier:"
docker exec -i chainlens-postgres psql -U defillama -d defillama -t -c "
SELECT 
  CASE 
    WHEN estimated_profit_usd < 50 THEN 'MICRO'
    WHEN estimated_profit_usd < 100 THEN 'SMALL'
    WHEN estimated_profit_usd < 1000 THEN 'MEDIUM'
    WHEN estimated_profit_usd < 10000 THEN 'LARGE'
    ELSE 'WHALE'
  END AS tier,
  COUNT(*)
FROM mev_opportunities
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY tier
ORDER BY 
  CASE tier
    WHEN 'MICRO' THEN 1
    WHEN 'SMALL' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LARGE' THEN 4
    WHEN 'WHALE' THEN 5
  END;
" 2>/dev/null | sed 's/^/  /'

echo ""

# Average confidence
echo "📈 Average Confidence Score:"
echo "----------------------------"
docker exec -i chainlens-postgres psql -U defillama -d defillama -t -c "
SELECT ROUND(AVG(confidence_score), 2) || '%'
FROM mev_opportunities
WHERE created_at >= NOW() - INTERVAL '1 hour';
" 2>/dev/null | xargs echo ""

echo ""

# Total profit
echo "💰 Total Profit (Last Hour):"
echo "----------------------------"
docker exec -i chainlens-postgres psql -U defillama -d defillama -t -c "
SELECT '$' || ROUND(SUM(estimated_profit_usd), 2)
FROM mev_opportunities
WHERE created_at >= NOW() - INTERVAL '1 hour';
" 2>/dev/null | xargs echo ""

echo ""

# Latest reports
echo "📄 Latest Reports:"
echo "------------------"
if [ -d "./test-reports" ]; then
    ls -lht ./test-reports/*.json 2>/dev/null | head -3 | awk '{print "  " $9 " (" $6 " " $7 " " $8 ")"}'
else
    echo "  No reports yet"
fi

echo ""
echo "================================================================================"
echo ""
echo "💡 Tips:"
echo "  - Run this script anytime: ./check-test-progress.sh"
echo "  - View latest report: cat test-reports/mev-test-report-*.json | jq ."
echo "  - Stop test gracefully: Press Ctrl+C in test terminal"
echo ""
echo "================================================================================"

