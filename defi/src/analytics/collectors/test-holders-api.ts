/**
 * Manual Test Script for Holder Distribution API
 * Story: 2.2.2 - Holder Distribution Analysis
 * 
 * Usage: npx ts-node --transpile-only src/analytics/collectors/test-holders-api.ts
 */

const BASE_URL = 'http://localhost:3000/v1/analytics';
const TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
const CHAIN_ID = 'ethereum';

async function testAPI() {
  console.log('🧪 Testing Holder Distribution API\n');

  try {
    // Test 1: Get Distribution
    console.log('1️⃣  Testing GET /tokens/:tokenAddress/holders/distribution');
    const distributionRes = await fetch(
      `${BASE_URL}/tokens/${TOKEN_ADDRESS}/holders/distribution?chainId=${CHAIN_ID}`
    );
    const distribution = await distributionRes.json();
    console.log('✅ Distribution:', {
      totalHolders: distribution.totalHolders,
      giniCoefficient: distribution.concentration?.giniCoefficient,
      concentrationScore: distribution.concentration?.concentrationScore,
      whaleCount: distribution.holderTypes?.whales?.count,
    });
    console.log('');

    // Test 2: Get Top Holders
    console.log('2️⃣  Testing GET /tokens/:tokenAddress/holders/top');
    const topHoldersRes = await fetch(
      `${BASE_URL}/tokens/${TOKEN_ADDRESS}/holders/top?chainId=${CHAIN_ID}&limit=10`
    );
    const topHolders = await topHoldersRes.json();
    console.log('✅ Top Holders:', {
      count: topHolders.holders?.length,
      topHolder: topHolders.holders?.[0]
        ? {
            rank: topHolders.holders[0].rank,
            supplyPercentage: topHolders.holders[0].supplyPercentage,
            holderType: topHolders.holders[0].holderType,
          }
        : null,
    });
    console.log('');

    // Test 3: Get Behavior
    console.log('3️⃣  Testing GET /tokens/:tokenAddress/holders/behavior');
    const behaviorRes = await fetch(
      `${BASE_URL}/tokens/${TOKEN_ADDRESS}/holders/behavior?chainId=${CHAIN_ID}&timeRange=30d`
    );
    const behavior = await behaviorRes.json();
    console.log('✅ Behavior:', {
      avgHoldingPeriod: behavior.behavior?.avgHoldingPeriod,
      holderChurnRate: behavior.behavior?.holderChurnRate,
      loyaltyScore: behavior.behavior?.loyaltyScore,
      ageDistributionCount: behavior.ageDistribution?.length,
    });
    console.log('');

    // Test 4: Get History
    console.log('4️⃣  Testing GET /tokens/:tokenAddress/holders/history');
    const historyRes = await fetch(
      `${BASE_URL}/tokens/${TOKEN_ADDRESS}/holders/history?chainId=${CHAIN_ID}&timeRange=30d&granularity=daily`
    );
    const history = await historyRes.json();
    console.log('✅ History:', {
      historyCount: history.history?.length,
      holderGrowthRate: history.trends?.holderGrowthRate,
      concentrationTrend: history.trends?.concentrationTrend,
      whaleActivityTrend: history.trends?.whaleActivityTrend,
    });
    console.log('');

    // Test 5: Create Alert
    console.log('5️⃣  Testing POST /tokens/:tokenAddress/holders/alerts');
    const createAlertRes = await fetch(
      `${BASE_URL}/tokens/${TOKEN_ADDRESS}/holders/alerts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-001',
          chainId: CHAIN_ID,
          alertType: 'whale_accumulation',
          threshold: 0.5,
          channels: ['email'],
        }),
      }
    );
    const alert = await createAlertRes.json();
    console.log('✅ Alert Created:', {
      id: alert.id,
      alertType: alert.alertType,
      threshold: alert.threshold,
      enabled: alert.enabled,
    });
    console.log('');

    // Test 6: Get User Alerts
    console.log('6️⃣  Testing GET /tokens/:tokenAddress/holders/alerts');
    const userAlertsRes = await fetch(
      `${BASE_URL}/tokens/${TOKEN_ADDRESS}/holders/alerts?userId=test-user-001`
    );
    const userAlerts = await userAlertsRes.json();
    console.log('✅ User Alerts:', {
      count: userAlerts.alerts?.length,
    });
    console.log('');

    // Test 7: Delete Alert
    if (alert.id) {
      console.log('7️⃣  Testing DELETE /tokens/:tokenAddress/holders/alerts/:alertId');
      const deleteAlertRes = await fetch(
        `${BASE_URL}/tokens/${TOKEN_ADDRESS}/holders/alerts/${alert.id}`,
        { method: 'DELETE' }
      );
      console.log('✅ Alert Deleted:', {
        status: deleteAlertRes.status,
        success: deleteAlertRes.status === 204,
      });
      console.log('');
    }

    console.log('🎉 All API tests completed successfully!\n');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testAPI();

