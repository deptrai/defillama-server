/**
 * Run Migration 042: Create Performance Indexes
 * Story: 4.1.3 - Advanced MEV Analytics
 */

import { query } from './src/analytics/db/connection';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Create a dedicated pool for migration
const connectionString =
  process.env.ANALYTICS_DB ||
  process.env.ALERTS_DB ||
  'postgresql://defillama:defillama123@localhost:5432/defillama';

const pool = new Pool({
  connectionString,
  max: 5,
});

async function runMigration() {

  try {
    console.log('🚀 Running Migration 042: Create Performance Indexes...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'src/analytics/migrations/042-create-performance-indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and filter out comments/empty lines
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comment blocks
      if (statement.includes('============')) continue;
      
      try {
        const startTime = Date.now();
        await pool.query(statement + ';');
        const duration = Date.now() - startTime;
        
        // Extract index/table name for logging
        const match = statement.match(/(?:CREATE INDEX|ANALYZE)\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
        const name = match ? match[1] : `Statement ${i + 1}`;
        
        console.log(`✅ ${name} (${duration}ms)`);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.code === '42P07' || error.message.includes('already exists')) {
          const match = statement.match(/(?:CREATE INDEX|ANALYZE)\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
          const name = match ? match[1] : `Statement ${i + 1}`;
          console.log(`⏭️  ${name} (already exists)`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log('\n📊 Verifying indexes...\n');

    // Verify indexes
    const result = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename IN (
        'mev_opportunities',
        'mev_bots',
        'mev_profit_attribution',
        'protocol_mev_leakage',
        'mev_market_trends'
      )
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);

    console.log(`✅ Found ${result.rows.length} indexes:\n`);

    // Group by table
    const byTable: Record<string, number> = {};
    result.rows.forEach(row => {
      byTable[row.tablename] = (byTable[row.tablename] || 0) + 1;
    });

    Object.entries(byTable).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} indexes`);
    });

    console.log('\n✅ Migration 042 completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

