/**
 * RPC Requirements Calculator CLI
 * Calculate minimum number of free RPC endpoints needed
 * 
 * Usage:
 * ```bash
 * npx ts-node calculate-rpc-requirements.ts
 * ```
 */

import { rpcCalculator } from './src/analytics/services/rpc-calculator';

async function main() {
  console.log('\n');
  
  // Generate and display report
  const report = rpcCalculator.generateReport();
  console.log(report);

  // Get recommended configuration
  console.log('═'.repeat(80));
  console.log('🔧 RECOMMENDED .ENV CONFIGURATION:\n');
  
  const config = rpcCalculator.getRecommendedConfig();
  
  for (const [chainId, urls] of Object.entries(config)) {
    const envVar = `${chainId.toUpperCase()}_RPC`;
    console.log(`# ${chainId.charAt(0).toUpperCase() + chainId.slice(1)} (${urls.length} endpoints)`);
    console.log(`${envVar}=${urls.join(',')}\n`);
  }
  
  console.log('═'.repeat(80));
  console.log('\n📝 NOTES:\n');
  console.log('  1. Replace YOUR_KEY_X with actual API keys from providers');
  console.log('  2. Use comma-separated list for multiple endpoints');
  console.log('  3. First endpoint has highest priority');
  console.log('  4. System will automatically failover on rate limits');
  console.log('  5. Monitor RPC status with: curl http://localhost:6060/v1/analytics/mev/ingestion/status\n');
  console.log('═'.repeat(80));
  console.log('\n');
}

main().catch(console.error);

