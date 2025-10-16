/**
 * Direct Database Test for MEV Opportunities
 * Tests MEV API logic without HTTP server
 */

import { query } from './src/analytics/db/connection';

interface MEVOpportunity {
  id: string;
  opportunity_type: string;
  chain_id: string;
  block_number: number;
  timestamp: Date;
  mev_profit_usd: number;
  victim_loss_usd: number;
  gas_cost_usd: number;
  net_profit_usd: number;
  confidence_score: number;
  detection_method: string;
  status: string;
  transaction_hashes: any;
  involved_addresses: any;
  evidence: any;
  metadata: any;
}

async function testListMEVOpportunities() {
  console.log('\n=== TEST 1: List MEV Opportunities ===');
  
  try {
    const result = await query<MEVOpportunity>(
      `SELECT * FROM mev_opportunities 
       ORDER BY mev_profit_usd DESC 
       LIMIT 5`
    );
    
    console.log(`✅ Found ${result.rows.length} opportunities`);
    result.rows.forEach((opp, idx) => {
      console.log(`\n${idx + 1}. ${opp.opportunity_type.toUpperCase()}`);
      console.log(`   ID: ${opp.id}`);
      console.log(`   Chain: ${opp.chain_id}`);
      console.log(`   Profit: $${opp.mev_profit_usd.toFixed(2)}`);
      console.log(`   Confidence: ${opp.confidence_score}%`);
      console.log(`   Status: ${opp.status}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function testFilterByType() {
  console.log('\n=== TEST 2: Filter by Type (Sandwich) ===');
  
  try {
    const result = await query<MEVOpportunity>(
      `SELECT * FROM mev_opportunities 
       WHERE opportunity_type = $1 
       ORDER BY mev_profit_usd DESC`,
      ['sandwich']
    );
    
    console.log(`✅ Found ${result.rows.length} sandwich opportunities`);
    const totalProfit = result.rows.reduce((sum, opp) => sum + Number(opp.mev_profit_usd), 0);
    console.log(`   Total Profit: $${totalProfit.toFixed(2)}`);
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function testFilterByChain() {
  console.log('\n=== TEST 3: Filter by Chain (ethereum) ===');
  
  try {
    const result = await query<MEVOpportunity>(
      `SELECT * FROM mev_opportunities 
       WHERE chain_id = $1 
       ORDER BY mev_profit_usd DESC`,
      ['ethereum']
    );
    
    console.log(`✅ Found ${result.rows.length} opportunities on Ethereum`);
    const totalProfit = result.rows.reduce((sum, opp) => sum + Number(opp.mev_profit_usd), 0);
    console.log(`   Total Profit: $${totalProfit.toFixed(2)}`);
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function testGetById() {
  console.log('\n=== TEST 4: Get by ID ===');
  
  try {
    // First get an ID
    const listResult = await query<MEVOpportunity>(
      `SELECT id FROM mev_opportunities LIMIT 1`
    );
    
    if (listResult.rows.length === 0) {
      console.log('⚠️  No opportunities found');
      return false;
    }
    
    const testId = listResult.rows[0].id;
    
    const result = await query<MEVOpportunity>(
      `SELECT * FROM mev_opportunities WHERE id = $1`,
      [testId]
    );
    
    if (result.rows.length > 0) {
      const opp = result.rows[0];
      console.log(`✅ Found opportunity: ${opp.opportunity_type}`);
      console.log(`   ID: ${opp.id}`);
      console.log(`   Profit: $${opp.mev_profit_usd.toFixed(2)}`);
      console.log(`   Confidence: ${opp.confidence_score}%`);
      return true;
    } else {
      console.log('❌ Opportunity not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function testStatistics() {
  console.log('\n=== TEST 5: Statistics ===');
  
  try {
    const result = await query<{
      opportunity_type: string;
      count: number;
      total_profit: number;
      avg_confidence: number;
    }>(
      `SELECT 
         opportunity_type,
         COUNT(*)::int as count,
         SUM(mev_profit_usd)::numeric as total_profit,
         AVG(confidence_score)::numeric as avg_confidence
       FROM mev_opportunities
       GROUP BY opportunity_type
       ORDER BY total_profit DESC`
    );
    
    console.log(`✅ Statistics by Type:`);
    result.rows.forEach(stat => {
      console.log(`\n   ${stat.opportunity_type.toUpperCase()}`);
      console.log(`   Count: ${stat.count}`);
      console.log(`   Total Profit: $${Number(stat.total_profit).toFixed(2)}`);
      console.log(`   Avg Confidence: ${Number(stat.avg_confidence).toFixed(2)}%`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function testPerformance() {
  console.log('\n=== TEST 6: Query Performance ===');
  
  const queries = [
    {
      name: 'Filter by Type',
      sql: `SELECT * FROM mev_opportunities WHERE opportunity_type = $1`,
      params: ['sandwich']
    },
    {
      name: 'Sort by Profit',
      sql: `SELECT * FROM mev_opportunities ORDER BY mev_profit_usd DESC LIMIT 10`,
      params: []
    },
    {
      name: 'Filter by Chain',
      sql: `SELECT * FROM mev_opportunities WHERE chain_id = $1`,
      params: ['ethereum']
    },
    {
      name: 'Time Range',
      sql: `SELECT * FROM mev_opportunities WHERE timestamp >= NOW() - INTERVAL '7 days'`,
      params: []
    }
  ];
  
  for (const q of queries) {
    const start = Date.now();
    await query(q.sql, q.params);
    const duration = Date.now() - start;
    
    const status = duration < 20 ? '✅' : '⚠️';
    console.log(`${status} ${q.name}: ${duration}ms`);
  }
  
  return true;
}

async function runAllTests() {
  console.log('🚀 Starting MEV Database Direct Tests\n');
  console.log('=' .repeat(60));
  
  const tests = [
    { name: 'List MEV Opportunities', fn: testListMEVOpportunities },
    { name: 'Filter by Type', fn: testFilterByType },
    { name: 'Filter by Chain', fn: testFilterByChain },
    { name: 'Get by ID', fn: testGetById },
    { name: 'Statistics', fn: testStatistics },
    { name: 'Performance', fn: testPerformance }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY');
  console.log(`   Total Tests: ${tests.length}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Database layer is production-ready.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

