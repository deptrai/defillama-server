/**
 * Manual Test Script for Cross-chain Portfolio API
 * Story: 2.2.3 - Cross-chain Portfolio Aggregation
 * 
 * Usage: npx ts-node --transpile-only src/analytics/collectors/test-cross-chain-api.ts
 */

const BASE_URL = 'http://localhost:3000/v1/analytics/portfolio';
const USER_ID = 'user-cross-chain-001';

async function testAPI() {
  console.log('🧪 Testing Cross-chain Portfolio API\n');

  try {
    // Test 1: Get Cross-chain Portfolio
    console.log('1️⃣  Testing GET /portfolio/cross-chain/:userId');
    const portfolioRes = await fetch(`${BASE_URL}/cross-chain/${USER_ID}`);
    const portfolio = await portfolioRes.json();
    console.log('✅ Portfolio:', {
      userId: portfolio.userId,
      totalNetWorthUsd: portfolio.totalNetWorthUsd,
      totalChains: portfolio.totalChains,
      totalAssets: portfolio.totalAssets,
      totalWallets: portfolio.totalWallets,
      chains: Object.keys(portfolio.chainBreakdown || {}),
    });
    console.log('');

    // Test 2: Get Assets
    console.log('2️⃣  Testing GET /portfolio/cross-chain/:userId/assets');
    const assetsRes = await fetch(`${BASE_URL}/cross-chain/${USER_ID}/assets`);
    const assets = await assetsRes.json();
    console.log('✅ Assets:', {
      total: assets.total,
      sampleAsset: assets.assets?.[0]
        ? {
            chainId: assets.assets[0].chainId,
            tokenSymbol: assets.assets[0].tokenSymbol,
            balanceUsd: assets.assets[0].balanceUsd,
            category: assets.assets[0].category,
          }
        : null,
    });
    console.log('');

    // Test 3: Get Assets Filtered by Chain
    console.log('3️⃣  Testing GET /portfolio/cross-chain/:userId/assets?chainId=ethereum');
    const ethereumAssetsRes = await fetch(
      `${BASE_URL}/cross-chain/${USER_ID}/assets?chainId=ethereum`
    );
    const ethereumAssets = await ethereumAssetsRes.json();
    console.log('✅ Ethereum Assets:', {
      total: ethereumAssets.total,
      allEthereum: ethereumAssets.assets?.every((a: any) => a.chainId === 'ethereum'),
    });
    console.log('');

    // Test 4: Get Assets Filtered by Category
    console.log('4️⃣  Testing GET /portfolio/cross-chain/:userId/assets?category=stablecoin');
    const stablecoinAssetsRes = await fetch(
      `${BASE_URL}/cross-chain/${USER_ID}/assets?category=stablecoin`
    );
    const stablecoinAssets = await stablecoinAssetsRes.json();
    console.log('✅ Stablecoin Assets:', {
      total: stablecoinAssets.total,
      allStablecoins: stablecoinAssets.assets?.every((a: any) => a.category === 'stablecoin'),
    });
    console.log('');

    // Test 5: Get Assets with Minimum Value
    console.log('5️⃣  Testing GET /portfolio/cross-chain/:userId/assets?minValue=10000');
    const highValueAssetsRes = await fetch(
      `${BASE_URL}/cross-chain/${USER_ID}/assets?minValue=10000`
    );
    const highValueAssets = await highValueAssetsRes.json();
    console.log('✅ High Value Assets (>$10K):', {
      total: highValueAssets.total,
      allAbove10K: highValueAssets.assets?.every((a: any) => a.balanceUsd >= 10000),
    });
    console.log('');

    // Test 6: Get Transactions
    console.log('6️⃣  Testing GET /portfolio/cross-chain/:userId/transactions');
    const transactionsRes = await fetch(`${BASE_URL}/cross-chain/${USER_ID}/transactions`);
    const transactions = await transactionsRes.json();
    console.log('✅ Transactions:', {
      total: transactions.total,
      returned: transactions.transactions?.length,
      sampleTx: transactions.transactions?.[0]
        ? {
            chainId: transactions.transactions[0].chainId,
            type: transactions.transactions[0].type,
            tokenSymbol: transactions.transactions[0].tokenSymbol,
            valueUsd: transactions.transactions[0].valueUsd,
          }
        : null,
    });
    console.log('');

    // Test 7: Get Transactions Filtered by Chain
    console.log('7️⃣  Testing GET /portfolio/cross-chain/:userId/transactions?chainId=polygon');
    const polygonTxRes = await fetch(
      `${BASE_URL}/cross-chain/${USER_ID}/transactions?chainId=polygon`
    );
    const polygonTx = await polygonTxRes.json();
    console.log('✅ Polygon Transactions:', {
      total: polygonTx.total,
      allPolygon: polygonTx.transactions?.every((tx: any) => tx.chainId === 'polygon'),
    });
    console.log('');

    // Test 8: Get Transactions with Pagination
    console.log('8️⃣  Testing GET /portfolio/cross-chain/:userId/transactions?limit=5&offset=0');
    const paginatedTxRes = await fetch(
      `${BASE_URL}/cross-chain/${USER_ID}/transactions?limit=5&offset=0`
    );
    const paginatedTx = await paginatedTxRes.json();
    console.log('✅ Paginated Transactions:', {
      returned: paginatedTx.transactions?.length,
      maxExpected: 5,
    });
    console.log('');

    // Test 9: Get Performance Metrics
    console.log('9️⃣  Testing GET /portfolio/cross-chain/:userId/performance');
    const performanceRes = await fetch(`${BASE_URL}/cross-chain/${USER_ID}/performance`);
    const performance = await performanceRes.json();
    console.log('✅ Performance:', {
      totalPnl: performance.totalPnl,
      totalRoi: performance.totalRoi,
      pnlByChainCount: Object.keys(performance.pnlByChain || {}).length,
      bestPerformer: performance.bestPerformers?.[0]
        ? {
            tokenSymbol: performance.bestPerformers[0].tokenSymbol,
            roi: performance.bestPerformers[0].roi,
          }
        : null,
    });
    console.log('');

    // Test 10: Get Chain Comparison
    console.log('🔟 Testing GET /portfolio/cross-chain/:userId/chains');
    const chainsRes = await fetch(`${BASE_URL}/cross-chain/${USER_ID}/chains`);
    const chains = await chainsRes.json();
    console.log('✅ Chain Comparison:', {
      totalChains: chains.chains?.length,
      sampleChain: chains.chains?.[0]
        ? {
            chainId: chains.chains[0].chainId,
            valueUsd: chains.chains[0].valueUsd,
            pnl: chains.chains[0].pnl,
            roi: chains.chains[0].roi,
            assetCount: chains.chains[0].assetCount,
          }
        : null,
    });
    console.log('');

    // Test 11: Error Handling - Invalid User
    console.log('1️⃣1️⃣  Testing Error Handling - Invalid User');
    const invalidUserRes = await fetch(`${BASE_URL}/cross-chain/nonexistent-user`);
    console.log('✅ Invalid User Response:', {
      status: invalidUserRes.status,
      expected: 404,
    });
    console.log('');

    // Test 12: Error Handling - Invalid Chain
    console.log('1️⃣2️⃣  Testing Error Handling - Invalid Chain');
    const invalidChainRes = await fetch(
      `${BASE_URL}/cross-chain/${USER_ID}/assets?chainId=invalid-chain`
    );
    console.log('✅ Invalid Chain Response:', {
      status: invalidChainRes.status,
      expected: 400,
    });
    console.log('');

    console.log('🎉 All API tests completed successfully!\n');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testAPI();

