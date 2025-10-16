/**
 * Test Protection API Endpoint
 * Story: 4.1.2 - MEV Protection Insights
 */

async function testProtectionAPI() {
  const baseUrl = 'http://localhost:5010';
  
  console.log('🧪 Testing MEV Protection API...\n');
  
  // Test 1: Low Risk Transaction
  console.log('Test 1: Low Risk Transaction');
  const lowRiskRequest = {
    chain_id: 'ethereum',
    token_in_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    token_out_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount_in: 1.0,
    amount_in_usd: 2000,
    slippage_tolerance_pct: 0.30,
    gas_price_gwei: 40,
    pool_liquidity_usd: 10000000,
    pool_volume_24h_usd: 5000000,
    dex: 'uniswap-v3',
    is_time_sensitive: false,
  };
  
  try {
    const response = await fetch(`${baseUrl}/v1/analytics/mev/protection/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lowRiskRequest),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Low Risk Test PASSED');
      console.log(`   Vulnerability Score: ${data.data.vulnerability_score}`);
      console.log(`   Risk Category: ${data.data.risk_category}`);
      console.log(`   Confidence: ${data.data.confidence_score}`);
      console.log(`   MEV Loss: $${data.data.estimated_impact.mev_loss_usd.toFixed(2)}`);
      console.log(`   Private Mempool: ${data.data.recommendations.use_private_mempool}`);
    } else {
      console.log('❌ Low Risk Test FAILED');
      console.log(`   Error: ${data.error}`);
    }
  } catch (error: any) {
    console.log('❌ Low Risk Test FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('');
  
  // Test 2: High Risk Transaction
  console.log('Test 2: High Risk Transaction');
  const highRiskRequest = {
    chain_id: 'ethereum',
    token_in_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    token_out_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount_in: 120,
    amount_in_usd: 240000,
    slippage_tolerance_pct: 1.50,
    gas_price_gwei: 120,
    pool_liquidity_usd: 1000000,
    pool_volume_24h_usd: 500000,
    dex: 'uniswap-v3',
    is_time_sensitive: false,
  };
  
  try {
    const response = await fetch(`${baseUrl}/v1/analytics/mev/protection/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(highRiskRequest),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ High Risk Test PASSED');
      console.log(`   Vulnerability Score: ${data.data.vulnerability_score}`);
      console.log(`   Risk Category: ${data.data.risk_category}`);
      console.log(`   Confidence: ${data.data.confidence_score}`);
      console.log(`   MEV Loss: $${data.data.estimated_impact.mev_loss_usd.toFixed(2)}`);
      console.log(`   Private Mempool: ${data.data.recommendations.use_private_mempool}`);
      console.log(`   Recommended Slippage: ${data.data.recommendations.recommended_slippage}%`);
    } else {
      console.log('❌ High Risk Test FAILED');
      console.log(`   Error: ${data.error}`);
    }
  } catch (error: any) {
    console.log('❌ High Risk Test FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('');
  
  // Test 3: Critical Risk Transaction
  console.log('Test 3: Critical Risk Transaction');
  const criticalRiskRequest = {
    chain_id: 'ethereum',
    token_in_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    token_out_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount_in: 500,
    amount_in_usd: 1000000,
    slippage_tolerance_pct: 5.00,
    gas_price_gwei: 250,
    pool_liquidity_usd: 100000,
    pool_volume_24h_usd: 50000,
    dex: 'uniswap-v3',
    is_time_sensitive: true,
  };
  
  try {
    const response = await fetch(`${baseUrl}/v1/analytics/mev/protection/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criticalRiskRequest),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Critical Risk Test PASSED');
      console.log(`   Vulnerability Score: ${data.data.vulnerability_score}`);
      console.log(`   Risk Category: ${data.data.risk_category}`);
      console.log(`   Confidence: ${data.data.confidence_score}`);
      console.log(`   MEV Loss: $${data.data.estimated_impact.mev_loss_usd.toFixed(2)}`);
      console.log(`   Private Mempool: ${data.data.recommendations.use_private_mempool}`);
      console.log(`   Explanation: ${data.data.explanation}`);
    } else {
      console.log('❌ Critical Risk Test FAILED');
      console.log(`   Error: ${data.error}`);
    }
  } catch (error: any) {
    console.log('❌ Critical Risk Test FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('');
  
  // Test 4: Validation Error (missing required field)
  console.log('Test 4: Validation Error Test');
  const invalidRequest = {
    chain_id: 'ethereum',
    // Missing token_in_address
    token_out_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount_in: 10,
    amount_in_usd: 20000,
    slippage_tolerance_pct: 0.50,
  };
  
  try {
    const response = await fetch(`${baseUrl}/v1/analytics/mev/protection/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidRequest),
    });
    
    const data = await response.json();
    
    if (!response.ok && data.error) {
      console.log('✅ Validation Error Test PASSED');
      console.log(`   Error Message: ${data.error}`);
    } else {
      console.log('❌ Validation Error Test FAILED');
      console.log('   Expected validation error but got success');
    }
  } catch (error: any) {
    console.log('❌ Validation Error Test FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n🎉 All tests completed!');
}

// Run tests
testProtectionAPI().catch(console.error);

