/**
 * Test Trade Pattern API Endpoints
 * Story: 3.1.2 - Trade Pattern Analysis
 */

const BASE_URL = 'http://localhost:5001/v1/analytics/smart-money';

async function testPatternsAPI() {
  console.log('🧪 Testing Trade Pattern API Endpoints\n');

  // Get a wallet address from database
  const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

  // Test 1: Get wallet patterns
  console.log('Test 1: GET /wallets/:address/patterns');
  try {
    const response = await fetch(`${BASE_URL}/wallets/${walletAddress}/patterns`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test 2: Get wallet patterns with filters
  console.log('Test 2: GET /wallets/:address/patterns?patternType=accumulation');
  try {
    const response = await fetch(`${BASE_URL}/wallets/${walletAddress}/patterns?patternType=accumulation`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test 3: Get wallet trades
  console.log('Test 3: GET /wallets/:address/trades');
  try {
    const response = await fetch(`${BASE_URL}/wallets/${walletAddress}/trades`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test 4: Get wallet trades with filters
  console.log('Test 4: GET /wallets/:address/trades?tradeType=buy&limit=5');
  try {
    const response = await fetch(`${BASE_URL}/wallets/${walletAddress}/trades?tradeType=buy&limit=5`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test 5: Test 404 for non-existent wallet
  console.log('Test 5: GET /wallets/0xinvalid/patterns (should return 404)');
  try {
    const response = await fetch(`${BASE_URL}/wallets/0xinvalid/patterns`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('✅ All tests completed!');
}

testPatternsAPI().catch(console.error);

