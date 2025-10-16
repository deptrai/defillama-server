/**
 * Comprehensive Database & Engine Tests
 * Tests all database queries and engine functionality
 */

import { query } from '../db/connection';
import { TradePatternRecognizer } from '../engines/trade-pattern-recognizer';
import { BehavioralAnalyzer } from '../engines/behavioral-analyzer';
import { SmartMoneyScorer } from '../engines/smart-money-scorer';
import { HolderDistributionEngine } from '../engines/holder-distribution-engine';
import { CrossChainAggregationEngine } from '../engines/cross-chain-aggregation-engine';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<any>): Promise<void> {
  const startTime = Date.now();
  
  try {
    const data = await testFn();
    const duration = Date.now() - startTime;
    
    results.push({
      name,
      status: 'PASS',
      duration,
      data,
    });
    
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    results.push({
      name,
      status: 'FAIL',
      duration,
      error: error.message,
    });
    
    console.log(`❌ ${name} (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🧪 Comprehensive Database & Engine Tests');
  console.log('=========================================\n');

  // Database Connection Tests
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Database Connection Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await runTest('Database Connection', async () => {
    const result = await query('SELECT NOW() as current_time');
    return result.rows[0];
  });

  await runTest('Check wallet_trades table', async () => {
    const result = await query('SELECT COUNT(*) as count FROM wallet_trades');
    const count = parseInt(result.rows[0].count);
    if (count === 0) throw new Error('No trades found');
    return { count };
  });

  await runTest('Check trade_patterns table', async () => {
    const result = await query('SELECT COUNT(*) as count FROM trade_patterns');
    return { count: parseInt(result.rows[0].count) };
  });

  await runTest('Check smart_money_wallets table', async () => {
    const result = await query('SELECT COUNT(*) as count FROM smart_money_wallets');
    const count = parseInt(result.rows[0].count);
    if (count === 0) throw new Error('No wallets found');
    return { count };
  });

  await runTest('Check token_holders table', async () => {
    const result = await query('SELECT COUNT(*) as count FROM token_holders');
    return { count: parseInt(result.rows[0].count) };
  });

  await runTest('Check cross_chain_portfolios table', async () => {
    const result = await query('SELECT COUNT(*) as count FROM cross_chain_portfolios');
    return { count: parseInt(result.rows[0].count) };
  });

  // Story 3.1.2: Trade Pattern Analysis
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Story 3.1.2: Trade Pattern Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await runTest('Get wallet trades', async () => {
    const result = await query(`
      SELECT * FROM wallet_trades 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    return { count: result.rows.length, sample: result.rows[0] };
  });

  await runTest('Get trades by wallet', async () => {
    const walletResult = await query('SELECT wallet_id FROM wallet_trades LIMIT 1');
    const walletId = walletResult.rows[0].wallet_id;
    
    const result = await query(`
      SELECT * FROM wallet_trades 
      WHERE wallet_id = $1 
      ORDER BY timestamp DESC
    `, [walletId]);
    
    return { walletId, count: result.rows.length };
  });

  await runTest('TradePatternRecognizer - Detect Accumulation', async () => {
    const walletResult = await query('SELECT wallet_id FROM wallet_trades LIMIT 1');
    const walletId = walletResult.rows[0].wallet_id;
    
    const tradesResult = await query(`
      SELECT * FROM wallet_trades 
      WHERE wallet_id = $1 
      ORDER BY timestamp ASC
    `, [walletId]);
    
    const recognizer = TradePatternRecognizer.getInstance();
    const pattern = recognizer.detectAccumulation(tradesResult.rows);
    
    return { 
      walletId, 
      tradesCount: tradesResult.rows.length,
      patternDetected: pattern !== null,
      pattern 
    };
  });

  await runTest('TradePatternRecognizer - Detect Distribution', async () => {
    const walletResult = await query('SELECT wallet_id FROM wallet_trades LIMIT 1');
    const walletId = walletResult.rows[0].wallet_id;
    
    const tradesResult = await query(`
      SELECT * FROM wallet_trades 
      WHERE wallet_id = $1 
      ORDER BY timestamp ASC
    `, [walletId]);
    
    const recognizer = TradePatternRecognizer.getInstance();
    const pattern = recognizer.detectDistribution(tradesResult.rows);
    
    return { 
      walletId, 
      tradesCount: tradesResult.rows.length,
      patternDetected: pattern !== null 
    };
  });

  await runTest('BehavioralAnalyzer - Analyze Behavior', async () => {
    const walletResult = await query('SELECT wallet_id FROM wallet_trades LIMIT 1');
    const walletId = walletResult.rows[0].wallet_id;
    
    const tradesResult = await query(`
      SELECT * FROM wallet_trades 
      WHERE wallet_id = $1 
      ORDER BY timestamp ASC
    `, [walletId]);
    
    const analyzer = BehavioralAnalyzer.getInstance();
    const profile = analyzer.analyzeBehavior(tradesResult.rows);
    
    return { 
      walletId, 
      tradesCount: tradesResult.rows.length,
      profile 
    };
  });

  // Story 3.1.1: Smart Money Identification
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Story 3.1.1: Smart Money Identification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await runTest('Get smart money wallets', async () => {
    const result = await query(`
      SELECT * FROM smart_money_wallets 
      WHERE overall_score >= 70 
      ORDER BY overall_score DESC 
      LIMIT 10
    `);
    return { count: result.rows.length, topScore: result.rows[0]?.overall_score };
  });

  await runTest('SmartMoneyScorer - Calculate Score', async () => {
    const walletResult = await query('SELECT wallet_address FROM smart_money_wallets LIMIT 1');
    const walletAddress = walletResult.rows[0].wallet_address;
    
    const scorer = SmartMoneyScorer.getInstance();
    const score = await scorer.calculateScore(walletAddress);
    
    return { walletAddress, score };
  });

  // Story 2.2.2: Holder Distribution Analysis
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Story 2.2.2: Holder Distribution Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await runTest('Get token holders', async () => {
    const result = await query(`
      SELECT token_address, COUNT(*) as holder_count 
      FROM token_holders 
      GROUP BY token_address 
      LIMIT 5
    `);
    return { tokens: result.rows.length, sample: result.rows[0] };
  });

  await runTest('HolderDistributionEngine - Get Distribution', async () => {
    const tokenResult = await query('SELECT DISTINCT token_address FROM token_holders LIMIT 1');
    
    if (tokenResult.rows.length === 0) {
      return { message: 'No token holders found, skipping test' };
    }
    
    const tokenAddress = tokenResult.rows[0].token_address;
    
    const engine = HolderDistributionEngine.getInstance();
    const distribution = await engine.getDistribution(tokenAddress);
    
    return { tokenAddress, distribution };
  });

  // Story 2.2.3: Cross-chain Portfolio Aggregation
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Story 2.2.3: Cross-chain Portfolio');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await runTest('Get cross-chain portfolios', async () => {
    const result = await query(`
      SELECT user_id, COUNT(*) as chain_count 
      FROM cross_chain_portfolios 
      GROUP BY user_id 
      LIMIT 5
    `);
    return { users: result.rows.length, sample: result.rows[0] };
  });

  await runTest('CrossChainAggregationEngine - Get Portfolio', async () => {
    const userResult = await query('SELECT DISTINCT user_id FROM cross_chain_portfolios LIMIT 1');
    
    if (userResult.rows.length === 0) {
      return { message: 'No portfolios found, skipping test' };
    }
    
    const userId = userResult.rows[0].user_id;
    
    const engine = CrossChainAggregationEngine.getInstance();
    const portfolio = await engine.getAggregatedPortfolio(userId);
    
    return { userId, portfolio };
  });

  // Print Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test Results Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed} (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed / results.length) * 100).toFixed(1)}%)`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  console.log(`⏱️  Average Duration: ${(totalDuration / results.length).toFixed(0)}ms\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    });
    console.log('');
  }

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! 🎉\n');
    process.exit(0);
  } else {
    console.log('⚠️  SOME TESTS FAILED ⚠️\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});

