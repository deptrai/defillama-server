/**
 * Integration Tests for Story 4.1.3: Advanced MEV Analytics
 * 
 * This script tests:
 * 1. Database migrations
 * 2. Seed data insertion
 * 3. Engine integration
 * 4. API endpoints
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Database connection
const connectionString = 
  process.env.ANALYTICS_DB || 
  process.env.ALERTS_DB || 
  'postgresql://defillama:defillama123@localhost:5432/defillama';

const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test results
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

// Helper function to run test
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      name,
      status: 'PASS',
      duration: Date.now() - start,
    });
    console.log(`✅ ${name} - PASS (${Date.now() - start}ms)`);
  } catch (error) {
    results.push({
      name,
      status: 'FAIL',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`❌ ${name} - FAIL (${Date.now() - start}ms)`);
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Test 1: Database Connection
async function testDatabaseConnection(): Promise<void> {
  const result = await pool.query('SELECT NOW()');
  if (!result.rows[0]) {
    throw new Error('Database connection failed');
  }
}

// Test 2: Check if tables exist
async function testTablesExist(): Promise<void> {
  const tables = ['mev_bots', 'mev_profit_attribution', 'protocol_mev_leakage', 'mev_market_trends'];
  
  for (const table of tables) {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [table]
    );
    
    if (!result.rows[0].exists) {
      throw new Error(`Table ${table} does not exist`);
    }
  }
}

// Test 3: Run migrations (if tables don't exist)
async function testRunMigrations(): Promise<void> {
  const migrations = [
    '038-create-mev-bots.sql',
    '039-create-mev-profit-attribution.sql',
    '040-create-protocol-mev-leakage.sql',
    '041-create-mev-market-trends.sql',
  ];

  for (const migration of migrations) {
    const migrationPath = path.join(__dirname, 'src/analytics/migrations', migration);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migration}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    try {
      await pool.query(sql);
      console.log(`   ✓ Migration ${migration} executed`);
    } catch (error) {
      // If table already exists, skip
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log(`   ⊙ Migration ${migration} skipped (table exists)`);
      } else {
        throw error;
      }
    }
  }
}

// Test 4: Insert seed data
async function testInsertSeedData(): Promise<void> {
  const seedFiles = [
    'seed-mev-bots.sql',
    'seed-protocol-mev-leakage.sql',
    'seed-mev-market-trends.sql',
  ];

  for (const seedFile of seedFiles) {
    const seedPath = path.join(__dirname, 'src/analytics/db', seedFile);
    
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found: ${seedFile}`);
    }

    const sql = fs.readFileSync(seedPath, 'utf8');
    
    try {
      await pool.query(sql);
      console.log(`   ✓ Seed data ${seedFile} inserted`);
    } catch (error) {
      // If data already exists, skip
      if (error instanceof Error && error.message.includes('duplicate key')) {
        console.log(`   ⊙ Seed data ${seedFile} skipped (data exists)`);
      } else {
        throw error;
      }
    }
  }
}

// Test 5: Verify seed data
async function testVerifySeedData(): Promise<void> {
  // Check mev_bots
  const botsResult = await pool.query('SELECT COUNT(*) FROM mev_bots');
  const botsCount = parseInt(botsResult.rows[0].count, 10);
  if (botsCount < 5) {
    throw new Error(`Expected at least 5 bots, got ${botsCount}`);
  }
  console.log(`   ✓ mev_bots: ${botsCount} rows`);

  // Check protocol_mev_leakage
  const leakageResult = await pool.query('SELECT COUNT(*) FROM protocol_mev_leakage');
  const leakageCount = parseInt(leakageResult.rows[0].count, 10);
  if (leakageCount < 10) {
    throw new Error(`Expected at least 10 leakage records, got ${leakageCount}`);
  }
  console.log(`   ✓ protocol_mev_leakage: ${leakageCount} rows`);

  // Check mev_market_trends
  const trendsResult = await pool.query('SELECT COUNT(*) FROM mev_market_trends');
  const trendsCount = parseInt(trendsResult.rows[0].count, 10);
  if (trendsCount < 10) {
    throw new Error(`Expected at least 10 trend records, got ${trendsCount}`);
  }
  console.log(`   ✓ mev_market_trends: ${trendsCount} rows`);
}

// Test 6: Test MEV Bot Identifier
async function testMEVBotIdentifier(): Promise<void> {
  const { MEVBotIdentifier } = await import('./src/analytics/engines/mev-bot-identifier');
  
  const identifier = MEVBotIdentifier.getInstance();
  
  // Test known bot
  const knownBot = identifier.isKnownBot('0xa57bd00134b2850b2a1c55860c9e9ea100fdd6cf');
  if (!knownBot) {
    throw new Error('Known bot not recognized');
  }
  console.log(`   ✓ Known bot recognized`);

  // Test unknown bot
  const unknownBot = identifier.isKnownBot('0x1234567890123456789012345678901234567890');
  if (unknownBot) {
    throw new Error('Unknown bot incorrectly recognized as known');
  }
  console.log(`   ✓ Unknown bot correctly identified`);
}

// Test 7: Test Bot Performance Calculator
async function testBotPerformanceCalculator(): Promise<void> {
  const { BotPerformanceCalculator } = await import('./src/analytics/engines/bot-performance-calculator');
  
  const calculator = BotPerformanceCalculator.getInstance();
  
  // Get first bot from database
  const botResult = await pool.query('SELECT bot_address, chain_id FROM mev_bots LIMIT 1');
  if (botResult.rows.length === 0) {
    throw new Error('No bots found in database');
  }

  const { bot_address, chain_id } = botResult.rows[0];
  
  const performance = await calculator.calculatePerformance(bot_address, chain_id);
  
  if (!performance.financial_metrics) {
    throw new Error('Financial metrics not calculated');
  }
  console.log(`   ✓ Performance calculated for bot ${bot_address.substring(0, 10)}...`);
}

// Test 8: Test Market Trend Calculator
async function testMarketTrendCalculator(): Promise<void> {
  const { MarketTrendCalculator } = await import('./src/analytics/engines/mev-trend-analyzers');
  
  const calculator = MarketTrendCalculator.getInstance();
  
  // Get latest trend date
  const trendResult = await pool.query(
    'SELECT date, chain_id FROM mev_market_trends ORDER BY date DESC LIMIT 1'
  );
  
  if (trendResult.rows.length === 0) {
    throw new Error('No trends found in database');
  }

  const { date, chain_id } = trendResult.rows[0];
  
  const trend = await calculator.calculateTrend(chain_id, new Date(date));
  
  if (!trend.total_mev_volume_usd) {
    throw new Error('Trend not calculated');
  }
  console.log(`   ✓ Trend calculated for ${chain_id} on ${date}`);
}

// Main test runner
async function runIntegrationTests(): Promise<void> {
  console.log('\n🧪 Story 4.1.3: Integration Tests\n');
  console.log('='.repeat(60));
  console.log('\n📊 Database Tests\n');

  await runTest('1. Database Connection', testDatabaseConnection);
  await runTest('2. Check Tables Exist', testTablesExist);
  await runTest('3. Run Migrations', testRunMigrations);
  await runTest('4. Insert Seed Data', testInsertSeedData);
  await runTest('5. Verify Seed Data', testVerifySeedData);

  console.log('\n🔧 Engine Integration Tests\n');

  await runTest('6. MEV Bot Identifier', testMEVBotIdentifier);
  await runTest('7. Bot Performance Calculator', testBotPerformanceCalculator);
  await runTest('8. Market Trend Calculator', testMarketTrendCalculator);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Test Summary\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⊙ Skipped: ${skipped}`);

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`\n⏱️  Total Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:\n');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`   ${r.name}`);
        console.log(`   Error: ${r.error}`);
      });
  }

  console.log('\n' + '='.repeat(60));

  // Close pool
  await pool.end();

  // Exit with error code if tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runIntegrationTests().catch((error) => {
  console.error('Fatal error:', error);
  pool.end();
  process.exit(1);
});

