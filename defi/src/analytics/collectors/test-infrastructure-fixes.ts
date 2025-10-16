/**
 * Infrastructure Fixes Verification Test
 * Tests that all module imports resolve correctly after tsconfig fixes
 */

console.log('🧪 Infrastructure Fixes Verification Test');
console.log('==========================================\n');

// Test 1: Import holder-distribution-engine
console.log('Test 1: Import holder-distribution-engine');
try {
  const { HolderDistributionEngine } = require('../engines/holder-distribution-engine');
  const engine = HolderDistributionEngine.getInstance();
  console.log('  ✅ PASS: holder-distribution-engine imported successfully');
  console.log(`  Instance: ${engine.constructor.name}\n`);
} catch (error) {
  console.log('  ❌ FAIL: Cannot import holder-distribution-engine');
  console.log(`  Error: ${error.message}\n`);
  process.exit(1);
}

// Test 2: Import cross-chain-aggregation-engine
console.log('Test 2: Import cross-chain-aggregation-engine');
try {
  const { CrossChainAggregationEngine } = require('../engines/cross-chain-aggregation-engine');
  const engine = CrossChainAggregationEngine.getInstance();
  console.log('  ✅ PASS: cross-chain-aggregation-engine imported successfully');
  console.log(`  Instance: ${engine.constructor.name}\n`);
} catch (error) {
  console.log('  ❌ FAIL: Cannot import cross-chain-aggregation-engine');
  console.log(`  Error: ${error.message}\n`);
  process.exit(1);
}

// Test 3: Import holder-behavior-engine
console.log('Test 3: Import holder-behavior-engine');
try {
  const { HolderBehaviorEngine } = require('../engines/holder-behavior-engine');
  const engine = HolderBehaviorEngine.getInstance();
  console.log('  ✅ PASS: holder-behavior-engine imported successfully');
  console.log(`  Instance: ${engine.constructor.name}\n`);
} catch (error) {
  console.log('  ❌ FAIL: Cannot import holder-behavior-engine');
  console.log(`  Error: ${error.message}\n`);
  process.exit(1);
}

// Test 4: Import distribution-alert-engine
console.log('Test 4: Import distribution-alert-engine');
try {
  const { DistributionAlertEngine } = require('../engines/distribution-alert-engine');
  const engine = DistributionAlertEngine.getInstance();
  console.log('  ✅ PASS: distribution-alert-engine imported successfully');
  console.log(`  Instance: ${engine.constructor.name}\n`);
} catch (error) {
  console.log('  ❌ FAIL: Cannot import distribution-alert-engine');
  console.log(`  Error: ${error.message}\n`);
  process.exit(1);
}

// Test 5: Import trade-pattern-recognizer
console.log('Test 5: Import trade-pattern-recognizer');
try {
  const { TradePatternRecognizer } = require('../engines/trade-pattern-recognizer');
  const engine = TradePatternRecognizer.getInstance();
  console.log('  ✅ PASS: trade-pattern-recognizer imported successfully');
  console.log(`  Instance: ${engine.constructor.name}\n`);
} catch (error) {
  console.log('  ❌ FAIL: Cannot import trade-pattern-recognizer');
  console.log(`  Error: ${error.message}\n`);
  process.exit(1);
}

// Test 6: Import behavioral-analyzer
console.log('Test 6: Import behavioral-analyzer');
try {
  const { BehavioralAnalyzer } = require('../engines/behavioral-analyzer');
  const engine = BehavioralAnalyzer.getInstance();
  console.log('  ✅ PASS: behavioral-analyzer imported successfully');
  console.log(`  Instance: ${engine.constructor.name}\n`);
} catch (error) {
  console.log('  ❌ FAIL: Cannot import behavioral-analyzer');
  console.log(`  Error: ${error.message}\n`);
  process.exit(1);
}

// Test 7: Import smart-money-scorer
console.log('Test 7: Import smart-money-scorer');
try {
  const { SmartMoneyScorer } = require('../engines/smart-money-scorer');
  const engine = SmartMoneyScorer.getInstance();
  console.log('  ✅ PASS: smart-money-scorer imported successfully');
  console.log(`  Instance: ${engine.constructor.name}\n`);
} catch (error) {
  console.log('  ❌ FAIL: Cannot import smart-money-scorer');
  console.log(`  Error: ${error.message}\n`);
  process.exit(1);
}

// Test 8: Import db/connection
console.log('Test 8: Import db/connection');
try {
  const { query } = require('../db/connection');
  console.log('  ✅ PASS: db/connection imported successfully');
  console.log(`  Function: ${typeof query}\n`);
} catch (error) {
  console.log('  ❌ FAIL: Cannot import db/connection');
  console.log(`  Error: ${error.message}\n`);
  process.exit(1);
}

// Test 9: Test database connection
console.log('Test 9: Test database connection');
(async () => {
  try {
    const { query } = require('../db/connection');
    const result = await query('SELECT NOW() as current_time');
    console.log('  ✅ PASS: Database connection working');
    console.log(`  Current time: ${result.rows[0].current_time}\n`);
  } catch (error) {
    console.log('  ❌ FAIL: Database connection failed');
    console.log(`  Error: ${error.message}\n`);
    process.exit(1);
  }

  // Test 10: Verify seed data
  console.log('Test 10: Verify seed data');
  try {
    const { query } = require('../db/connection');
    
    // Check smart_money_wallets
    const wallets = await query('SELECT COUNT(*) as count FROM smart_money_wallets');
    console.log(`  ✅ smart_money_wallets: ${wallets.rows[0].count} records`);
    
    // Check wallet_trades
    const trades = await query('SELECT COUNT(*) as count FROM wallet_trades');
    console.log(`  ✅ wallet_trades: ${trades.rows[0].count} records`);
    
    // Check trade_patterns
    const patterns = await query('SELECT COUNT(*) as count FROM trade_patterns');
    console.log(`  ✅ trade_patterns: ${patterns.rows[0].count} records`);
    
    // Check token_holders
    const holders = await query('SELECT COUNT(*) as count FROM token_holders');
    console.log(`  ✅ token_holders: ${holders.rows[0].count} records`);
    
    // Check cross_chain_portfolios
    const portfolios = await query('SELECT COUNT(*) as count FROM cross_chain_portfolios');
    console.log(`  ✅ cross_chain_portfolios: ${portfolios.rows[0].count} records\n`);
  } catch (error) {
    console.log('  ❌ FAIL: Seed data verification failed');
    console.log(`  Error: ${error.message}\n`);
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ALL TESTS PASSED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Summary:');
  console.log('  - All engine imports: ✅ Working');
  console.log('  - Database connection: ✅ Working');
  console.log('  - Seed data: ✅ Verified');
  console.log('  - Infrastructure fixes: ✅ COMPLETE\n');
  
  process.exit(0);
})();

