/**
 * Test Database Connection
 * Verify PostgreSQL connection before starting API server
 */

import { query } from './src/analytics/db/connection';

async function testConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  try {
    // Test 1: Simple query
    console.log('Test 1: Simple SELECT query');
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connected successfully!');
    console.log(`   Current Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL Version: ${result.rows[0].pg_version.split(' ')[0]}\n`);
    
    // Test 2: Check mev_opportunities table
    console.log('Test 2: Check mev_opportunities table');
    const tableCheck = await query(`
      SELECT COUNT(*) as count 
      FROM mev_opportunities
    `);
    console.log(`✅ mev_opportunities table exists`);
    console.log(`   Total records: ${tableCheck.rows[0].count}\n`);
    
    // Test 3: Sample MEV opportunity
    console.log('Test 3: Fetch sample MEV opportunity');
    const sample = await query(`
      SELECT
        id,
        opportunity_type,
        chain_id,
        mev_profit_usd,
        confidence_score,
        status
      FROM mev_opportunities
      LIMIT 1
    `);

    if (sample.rows.length > 0) {
      console.log('✅ Sample MEV opportunity:');
      console.log(`   ID: ${sample.rows[0].id}`);
      console.log(`   Type: ${sample.rows[0].opportunity_type}`);
      console.log(`   Chain: ${sample.rows[0].chain_id}`);
      console.log(`   Profit: $${sample.rows[0].mev_profit_usd}`);
      console.log(`   Confidence: ${sample.rows[0].confidence_score}%`);
      console.log(`   Status: ${sample.rows[0].status}\n`);
    } else {
      console.log('⚠️  No MEV opportunities found in database\n');
    }
    
    console.log('🎉 ALL DATABASE TESTS PASSED!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('\nPossible issues:');
    console.error('1. PostgreSQL not running (check: lsof -i:5432)');
    console.error('2. Wrong credentials in .env file');
    console.error('3. Database "defillama" not created');
    console.error('4. mev_opportunities table not created (run migration)');
    process.exit(1);
  }
}

testConnection();

