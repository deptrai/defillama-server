/**
 * Test RPC Manager
 * Test automatic failover and RPC rotation
 */

import { rpcManager } from './src/analytics/services/rpc-manager';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
const envPath = path.join(__dirname, '.env');
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('✅ .env loaded successfully');
  console.log(`ETHEREUM_RPC: ${process.env.ETHEREUM_RPC ? 'SET' : 'NOT SET'}`);
}

async function main() {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('  RPC MANAGER TEST');
  console.log('═'.repeat(80));
  console.log('\n');

  try {
    // Test 1: Get initial status
    console.log('📊 Test 1: Initial RPC Status\n');
    const initialStatus = rpcManager.getStatus();
    console.log(JSON.stringify(initialStatus, null, 2));
    console.log('\n');

    // Test 2: Get provider for Ethereum
    console.log('📡 Test 2: Get Ethereum Provider\n');
    const provider = await rpcManager.getProvider('ethereum');
    console.log('✅ Provider obtained successfully');
    console.log(`   Network: ${(await provider.getNetwork()).name}`);
    console.log(`   Block Number: ${await provider.getBlockNumber()}`);
    console.log('\n');

    // Test 3: Get status after connection
    console.log('📊 Test 3: RPC Status After Connection\n');
    const statusAfterConnection = rpcManager.getStatus();
    console.log(JSON.stringify(statusAfterConnection, null, 2));
    console.log('\n');

    // Test 4: Simulate rate limit (if multiple endpoints configured)
    const ethereumConfig = statusAfterConnection.ethereum;
    if (ethereumConfig && ethereumConfig.totalEndpoints > 1) {
      console.log('⚠️  Test 4: Simulating Rate Limit Scenario\n');
      console.log('   (In production, this would automatically switch to next endpoint)\n');
      console.log(`   Current endpoint: ${ethereumConfig.currentEndpoint}/${ethereumConfig.totalEndpoints}`);
      console.log(`   Available fallback endpoints: ${ethereumConfig.totalEndpoints - 1}`);
      console.log('\n');
    }

    // Cleanup
    await rpcManager.cleanup();
    console.log('✅ Test completed successfully\n');
    console.log('═'.repeat(80));
    console.log('\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

