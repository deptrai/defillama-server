/**
 * Analyze User's RPC Resources
 * Calculate if user has enough RPCs for smooth operation
 */

import { RPCCalculator } from './src/analytics/services/rpc-calculator';

// User's API Keys
const userAPIKeys = {
  infura: [
    '8a288bed3ffe4487a37569e1142c00dd',
    '1468bd7c7bfc47dd8b31ab87ae0b878f',
  ],
  quicknode: [
    {
      name: 'Trial 10M Multichain',
      http: 'https://fabled-soft-orb.quiknode.pro/f606db0038d8af11e7a051444fd158055977e64c',
      wss: 'wss://fabled-soft-orb.solana-mainnet.quiknode.pro/f606db0038d8af11e7a051444fd158055977e64c/',
    },
    {
      name: 'Solana Endpoint',
      http: 'https://polished-virulent-ensemble.solana-mainnet.quiknode.pro/f74a6170f9fa70bd7d239ef68fddd9c156a36d64/',
      wss: 'wss://polished-virulent-ensemble.solana-mainnet.quiknode.pro/f74a6170f9fa70bd7d239ef68fddd9c156a36d64/',
    },
  ],
};

// Public RPC Endpoints (No API Key Required)
const publicRPCs = {
  ethereum: [
    'https://eth.llamarpc.com',
    'https://eth.rpc.grove.city/v1/01fdb492',
    'https://ethereum.publicnode.com',
    'https://rpc.ankr.com/eth',
  ],
  arbitrum: [
    'https://arbitrum-one.rpc.grove.city/v1/01fdb492',
    'https://arbitrum.llamarpc.com',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum.publicnode.com',
    'https://arb1.arbitrum.io/rpc',
  ],
  optimism: [
    'https://optimism.rpc.grove.city/v1/01fdb492',
    'https://optimism.llamarpc.com',
    'https://rpc.ankr.com/optimism',
    'https://optimism.publicnode.com',
    'https://mainnet.optimism.io',
  ],
  bsc: [
    'https://bsc.rpc.grove.city/v1/01fdb492',
    'https://bsc.llamarpc.com',
    'https://rpc.ankr.com/bsc',
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.defibit.io',
  ],
  polygon: [
    'https://polygon.rpc.grove.city/v1/01fdb492',
    'https://polygon.llamarpc.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon-rpc.com',
    'https://polygon.publicnode.com',
  ],
};

async function main() {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('  USER RPC RESOURCES ANALYSIS');
  console.log('═'.repeat(80));
  console.log('\n');

  const calculator = new RPCCalculator();

  // Calculate requirements
  console.log('📊 SYSTEM REQUIREMENTS:\n');
  const chains = ['ethereum', 'arbitrum', 'optimism', 'bsc', 'polygon'];
  const requirements: any = {};
  
  chains.forEach(chainId => {
    requirements[chainId] = calculator.calculateChainRequirements(chainId);
  });

  // Display requirements
  chains.forEach(chainId => {
    const req = requirements[chainId];
    console.log(`${chainId.toUpperCase()}:`);
    console.log(`  Requests/Second: ${req.requestsPerSecond.toFixed(2)}`);
    console.log(`  Minimum Free RPCs: ${req.minimumFreeRPCs}`);
    console.log(`  Recommended Free RPCs: ${req.recommendedFreeRPCs}`);
    console.log('');
  });

  // Count user's resources
  console.log('═'.repeat(80));
  console.log('💼 YOUR RPC RESOURCES:\n');

  console.log('**Infura API Keys**: 2 keys');
  console.log('  - Key 1: 8a28...00dd (10 req/s, 100k req/day per chain)');
  console.log('  - Key 2: 1468...878f (10 req/s, 100k req/day per chain)');
  console.log('  - **Total Capacity**: 20 req/s per chain\n');

  console.log('**QuickNode Trial**: 1 endpoint (10M requests/month)');
  console.log('  - Multichain support');
  console.log('  - ~5 req/s limit (estimated)');
  console.log('  - Note: Solana endpoints not applicable for EVM chains\n');

  console.log('**Public RPCs**: No API key required');
  console.log('  - Ethereum: 4 endpoints');
  console.log('  - Arbitrum: 5 endpoints');
  console.log('  - Optimism: 5 endpoints');
  console.log('  - BSC: 5 endpoints');
  console.log('  - Polygon: 5 endpoints');
  console.log('  - **Total**: 24 public endpoints\n');

  // Calculate coverage
  console.log('═'.repeat(80));
  console.log('✅ COVERAGE ANALYSIS:\n');

  const coverage: any = {};

  // Ethereum
  coverage.ethereum = {
    required: requirements.ethereum.recommendedFreeRPCs,
    infura: 2, // 2 Infura keys
    quicknode: 1, // 1 QuickNode trial
    public: publicRPCs.ethereum.length,
    total: 2 + 1 + publicRPCs.ethereum.length,
  };

  // Arbitrum (HIGH VOLUME)
  coverage.arbitrum = {
    required: requirements.arbitrum.recommendedFreeRPCs,
    infura: 2,
    quicknode: 1,
    public: publicRPCs.arbitrum.length,
    total: 2 + 1 + publicRPCs.arbitrum.length,
  };

  // Optimism
  coverage.optimism = {
    required: requirements.optimism.recommendedFreeRPCs,
    infura: 2,
    quicknode: 1,
    public: publicRPCs.optimism.length,
    total: 2 + 1 + publicRPCs.optimism.length,
  };

  // BSC
  coverage.bsc = {
    required: requirements.bsc.recommendedFreeRPCs,
    infura: 0, // Infura doesn't support BSC
    quicknode: 1,
    public: publicRPCs.bsc.length,
    total: 0 + 1 + publicRPCs.bsc.length,
  };

  // Polygon
  coverage.polygon = {
    required: requirements.polygon.recommendedFreeRPCs,
    infura: 2,
    quicknode: 1,
    public: publicRPCs.polygon.length,
    total: 2 + 1 + publicRPCs.polygon.length,
  };

  // Display coverage
  chains.forEach(chainId => {
    const cov = coverage[chainId];
    const status = cov.total >= cov.required ? '✅ SUFFICIENT' : '⚠️ INSUFFICIENT';
    const percentage = Math.round((cov.total / cov.required) * 100);
    
    console.log(`${chainId.toUpperCase()}: ${status}`);
    console.log(`  Required: ${cov.required} RPCs`);
    console.log(`  Available: ${cov.total} RPCs (${percentage}% coverage)`);
    console.log(`    - Infura: ${cov.infura}`);
    console.log(`    - QuickNode: ${cov.quicknode}`);
    console.log(`    - Public: ${cov.public}`);
    console.log('');
  });

  // Overall assessment
  console.log('═'.repeat(80));
  console.log('🎯 OVERALL ASSESSMENT:\n');

  const totalRequired = chains.reduce((sum, chain) => sum + coverage[chain].required, 0);
  const totalAvailable = chains.reduce((sum, chain) => sum + coverage[chain].total, 0);
  const overallPercentage = Math.round((totalAvailable / totalRequired) * 100);

  console.log(`Total Required: ${totalRequired} RPCs`);
  console.log(`Total Available: ${totalAvailable} RPCs`);
  console.log(`Overall Coverage: ${overallPercentage}%\n`);

  if (totalAvailable >= totalRequired) {
    console.log('✅ **VERDICT**: YOU HAVE ENOUGH RPCs!');
    console.log('   Your resources are sufficient for smooth operation.\n');
  } else {
    const deficit = totalRequired - totalAvailable;
    console.log(`⚠️ **VERDICT**: NEED ${deficit} MORE RPCs`);
    console.log('   Consider getting more API keys or using paid tier.\n');
  }

  // Recommendations
  console.log('═'.repeat(80));
  console.log('💡 RECOMMENDATIONS:\n');

  console.log('**Optimal Configuration**:');
  console.log('1. Use Infura keys for Ethereum, Arbitrum, Optimism, Polygon');
  console.log('2. Use QuickNode trial as backup for all chains');
  console.log('3. Use public RPCs as additional fallback');
  console.log('4. Priority order: Infura → QuickNode → Public RPCs\n');

  console.log('**For Arbitrum (High Volume)**:');
  console.log('- Arbitrum needs 9 RPCs (highest requirement)');
  console.log(`- You have ${coverage.arbitrum.total} RPCs available`);
  if (coverage.arbitrum.total < coverage.arbitrum.required) {
    console.log('- ⚠️ Consider upgrading Infura to paid tier ($50/month)');
    console.log('- Or get more free API keys from Alchemy, Ankr, etc.\n');
  } else {
    console.log('- ✅ Sufficient with current resources\n');
  }

  console.log('**Cost Optimization**:');
  console.log('- Current setup: $0/month (all free)');
  console.log('- Upgrade option: $50/month (Infura Growth for Arbitrum)');
  console.log('- This would guarantee 99.9% uptime for Arbitrum\n');

  console.log('═'.repeat(80));
  console.log('\n');
}

main().catch(console.error);

