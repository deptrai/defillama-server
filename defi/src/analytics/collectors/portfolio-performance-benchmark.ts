/**
 * Performance Benchmark for Portfolio Engines
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * Measures p95 latency for key operations
 * Target: < 500ms p95 for all operations
 */

import { PortfolioValuationEngine } from '../engines/portfolio-valuation-engine';
import { AssetAllocationEngine } from '../engines/asset-allocation-engine';
import { PerformanceTrackingEngine } from '../engines/performance-tracking-engine';

const portfolioValuation = PortfolioValuationEngine.getInstance();
const assetAllocation = AssetAllocationEngine.getInstance();
const performanceTracking = PerformanceTrackingEngine.getInstance();

// Test wallets
const WHALE_WALLET = '0x1234567890123456789012345678901234567890';
const DEFI_FARMER = '0x2345678901234567890123456789012345678901';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  maxLatency: number;
  status: 'PASS' | 'FAIL';
}

async function benchmark(
  name: string,
  operation: () => Promise<any>,
  iterations: number = 20
): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  
  console.log(`\n🔄 Benchmarking: ${name} (${iterations} iterations)`);
  
  // Warmup
  await operation();
  
  // Benchmark
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await operation();
    const latency = Date.now() - start;
    latencies.push(latency);
    
    process.stdout.write(`\r   Progress: ${i + 1}/${iterations} (${latency}ms)`);
  }
  
  console.log(''); // New line
  
  // Calculate statistics
  latencies.sort((a, b) => a - b);
  
  const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
  const p50Latency = latencies[Math.floor(latencies.length * 0.5)];
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
  const p99Latency = latencies[Math.floor(latencies.length * 0.99)];
  const maxLatency = latencies[latencies.length - 1];
  
  const status = p95Latency < 500 ? 'PASS' : 'FAIL';
  
  const result: BenchmarkResult = {
    operation: name,
    iterations,
    avgLatency,
    p50Latency,
    p95Latency,
    p99Latency,
    maxLatency,
    status,
  };
  
  console.log(`   Avg: ${avgLatency.toFixed(0)}ms | P50: ${p50Latency}ms | P95: ${p95Latency}ms | P99: ${p99Latency}ms | Max: ${maxLatency}ms`);
  console.log(`   Status: ${status === 'PASS' ? '✅ PASS' : '❌ FAIL'} (P95 < 500ms)`);
  
  return result;
}

async function runBenchmarks() {
  console.log('⚡ Portfolio Performance Benchmark');
  console.log('='.repeat(80));
  console.log('Target: P95 latency < 500ms for all operations\n');
  
  const results: BenchmarkResult[] = [];
  
  // Benchmark 1: Portfolio Summary
  results.push(await benchmark(
    'Portfolio Summary (Multi-chain)',
    () => portfolioValuation.getPortfolioSummary(WHALE_WALLET)
  ));
  
  // Benchmark 2: Portfolio Summary (Single chain)
  results.push(await benchmark(
    'Portfolio Summary (Single chain)',
    () => portfolioValuation.getPortfolioSummary(WHALE_WALLET, ['ethereum'])
  ));
  
  // Benchmark 3: Chain Portfolios
  results.push(await benchmark(
    'Chain Portfolios',
    () => portfolioValuation.getChainPortfolios(WHALE_WALLET)
  ));
  
  // Benchmark 4: Top Holding Percentage
  results.push(await benchmark(
    'Top Holding Percentage',
    () => portfolioValuation.getTopHoldingPercentage(WHALE_WALLET)
  ));
  
  // Benchmark 5: Asset Allocation by Token
  results.push(await benchmark(
    'Asset Allocation by Token',
    () => assetAllocation.getAllocationByToken(WHALE_WALLET)
  ));
  
  // Benchmark 6: Asset Allocation by Protocol
  results.push(await benchmark(
    'Asset Allocation by Protocol',
    () => assetAllocation.getAllocationByProtocol(DEFI_FARMER)
  ));
  
  // Benchmark 7: Asset Allocation by Chain
  results.push(await benchmark(
    'Asset Allocation by Chain',
    () => assetAllocation.getAllocationByChain(WHALE_WALLET)
  ));
  
  // Benchmark 8: Asset Allocation by Category
  results.push(await benchmark(
    'Asset Allocation by Category',
    () => assetAllocation.getAllocationByCategory(WHALE_WALLET)
  ));
  
  // Benchmark 9: Get Holdings
  results.push(await benchmark(
    'Get Holdings (Paginated)',
    () => assetAllocation.getHoldings(WHALE_WALLET, { page: 1, limit: 50 })
  ));
  
  // Benchmark 10: Performance History (30d)
  results.push(await benchmark(
    'Performance History (30d)',
    () => performanceTracking.getPerformanceHistory(WHALE_WALLET, '30d', 'daily')
  ));
  
  // Benchmark 11: Performance with Benchmark
  results.push(await benchmark(
    'Performance with ETH Benchmark',
    () => performanceTracking.getPerformance(WHALE_WALLET, '30d', 'daily', 'eth')
  ));
  
  // Benchmark 12: Top Performers
  results.push(await benchmark(
    'Top Performers',
    () => performanceTracking.getTopPerformers(WHALE_WALLET, 5)
  ));
  
  // Benchmark 13: Compare Wallets
  results.push(await benchmark(
    'Compare Wallets (2 wallets)',
    () => performanceTracking.compareWallets([WHALE_WALLET, DEFI_FARMER], '30d')
  ));
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Benchmark Summary\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const avgP95 = results.reduce((sum, r) => sum + r.p95Latency, 0) / results.length;
  const maxP95 = Math.max(...results.map(r => r.p95Latency));
  
  console.log(`Total Operations: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Avg P95 Latency: ${avgP95.toFixed(0)}ms`);
  console.log(`⏱️  Max P95 Latency: ${maxP95}ms`);
  console.log(`📊 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Operations (P95 >= 500ms):');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`   - ${r.operation}: P95 = ${r.p95Latency}ms`);
      });
  } else {
    console.log('\n✅ All operations meet performance target (P95 < 500ms)');
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Detailed results table
  console.log('\n📋 Detailed Results\n');
  console.log('Operation'.padEnd(40) + 'Avg'.padEnd(10) + 'P50'.padEnd(10) + 'P95'.padEnd(10) + 'P99'.padEnd(10) + 'Max'.padEnd(10) + 'Status');
  console.log('-'.repeat(90));
  
  results.forEach(r => {
    const status = r.status === 'PASS' ? '✅' : '❌';
    console.log(
      r.operation.padEnd(40) +
      `${r.avgLatency.toFixed(0)}ms`.padEnd(10) +
      `${r.p50Latency}ms`.padEnd(10) +
      `${r.p95Latency}ms`.padEnd(10) +
      `${r.p99Latency}ms`.padEnd(10) +
      `${r.maxLatency}ms`.padEnd(10) +
      status
    );
  });
  
  console.log('\n' + '='.repeat(80));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run benchmarks
runBenchmarks().catch(error => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});

