/**
 * Performance Benchmark for Liquidity Analysis Engines
 * Story: 2.1.3 - Liquidity Analysis Tools
 * 
 * Verifies that p95 latency < 500ms for key operations
 * 
 * Run with: ts-node defi/src/analytics/collectors/performance-benchmark.ts
 */

import { query } from '../db/connection';
import { liquidityDepthEngine } from '../engines/liquidity-depth-engine';
import { lpAnalysisEngine } from '../engines/lp-analysis-engine';
import { impermanentLossEngine } from '../engines/impermanent-loss-engine';
import { liquidityMigrationEngine } from '../engines/liquidity-migration-engine';

interface BenchmarkResult {
  operation: string;
  samples: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

async function measurePerformance(
  operation: string,
  fn: () => Promise<any>,
  samples: number = 10
): Promise<BenchmarkResult> {
  const times: number[] = [];

  console.log(`\n📊 Benchmarking: ${operation}`);
  console.log(`   Running ${samples} samples...`);

  for (let i = 0; i < samples; i++) {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    times.push(duration);
    process.stdout.write('.');
  }

  console.log(' Done!');

  // Sort times for percentile calculations
  times.sort((a, b) => a - b);

  const min = times[0];
  const max = times[times.length - 1];
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];

  return {
    operation,
    samples,
    min,
    max,
    avg,
    p50,
    p95,
    p99,
  };
}

function printResult(result: BenchmarkResult) {
  console.log(`\n   Results:`);
  console.log(`   - Min:  ${result.min}ms`);
  console.log(`   - Avg:  ${result.avg.toFixed(2)}ms`);
  console.log(`   - p50:  ${result.p50}ms`);
  console.log(`   - p95:  ${result.p95}ms ${result.p95 < 500 ? '✅' : '❌ (> 500ms)'}`);
  console.log(`   - p99:  ${result.p99}ms`);
  console.log(`   - Max:  ${result.max}ms`);
}

async function runBenchmarks() {
  console.log('🚀 Performance Benchmark for Liquidity Analysis Engines');
  console.log('=' .repeat(60));

  // Get sample data
  const poolResult = await query<any>('SELECT id FROM liquidity_pools LIMIT 1', []);
  const lpResult = await query<any>('SELECT id FROM liquidity_providers LIMIT 1', []);

  if (poolResult.rows.length === 0 || lpResult.rows.length === 0) {
    console.error('❌ No data found. Run seed script first.');
    process.exit(1);
  }

  const poolId = poolResult.rows[0].id;
  const lpId = lpResult.rows[0].id;

  const results: BenchmarkResult[] = [];

  // Benchmark 1: Depth Chart Generation
  results.push(
    await measurePerformance(
      'Depth Chart Generation (10 levels)',
      () => liquidityDepthEngine.getDepthChart(poolId, 10),
      20
    )
  );
  printResult(results[results.length - 1]);

  // Benchmark 2: Price Impact Calculation
  results.push(
    await measurePerformance(
      'Price Impact Calculation (4 trade sizes)',
      () => liquidityDepthEngine.getPriceImpact(poolId, [1000, 10000, 100000, 1000000]),
      20
    )
  );
  printResult(results[results.length - 1]);

  // Benchmark 3: LP Position Analysis
  results.push(
    await measurePerformance(
      'LP Position Analysis (pool)',
      () => lpAnalysisEngine.getLPPositions({ poolId, limit: 20 }),
      20
    )
  );
  printResult(results[results.length - 1]);

  // Benchmark 4: LP Profitability Calculation
  results.push(
    await measurePerformance(
      'LP Profitability Calculation',
      () => lpAnalysisEngine.getLPProfitability(poolId),
      20
    )
  );
  printResult(results[results.length - 1]);

  // Benchmark 5: Impermanent Loss Calculation
  results.push(
    await measurePerformance(
      'Impermanent Loss Calculation',
      () => impermanentLossEngine.calculateIL(lpId),
      20
    )
  );
  printResult(results[results.length - 1]);

  // Benchmark 6: IL vs Fees Comparison
  results.push(
    await measurePerformance(
      'IL vs Fees Comparison',
      () => impermanentLossEngine.compareILvsFees(lpId),
      20
    )
  );
  printResult(results[results.length - 1]);

  // Benchmark 7: Migration Flow Analysis
  results.push(
    await measurePerformance(
      'Migration Flow Analysis (30 days)',
      () => liquidityMigrationEngine.analyzeMigrationFlows(30),
      20
    )
  );
  printResult(results[results.length - 1]);

  // Benchmark 8: Migration Cause Analysis
  results.push(
    await measurePerformance(
      'Migration Cause Analysis',
      () => liquidityMigrationEngine.getMigrationCauses(30),
      20
    )
  );
  printResult(results[results.length - 1]);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Performance Summary');
  console.log('='.repeat(60));

  const allP95 = results.map(r => r.p95);
  const maxP95 = Math.max(...allP95);
  const avgP95 = allP95.reduce((sum, p) => sum + p, 0) / allP95.length;

  console.log(`\nTotal Operations Tested: ${results.length}`);
  console.log(`Average p95 Latency: ${avgP95.toFixed(2)}ms`);
  console.log(`Maximum p95 Latency: ${maxP95}ms`);
  console.log(`Target: < 500ms`);

  const allPass = allP95.every(p => p < 500);
  if (allPass) {
    console.log(`\n✅ All operations meet p95 < 500ms requirement!`);
  } else {
    console.log(`\n❌ Some operations exceed 500ms p95 latency`);
    results.forEach(r => {
      if (r.p95 >= 500) {
        console.log(`   - ${r.operation}: ${r.p95}ms`);
      }
    });
  }

  console.log('\n' + '='.repeat(60));

  process.exit(allPass ? 0 : 1);
}

// Run benchmarks
runBenchmarks().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

