/**
 * Migration Script for Story 1.4: Advanced Query Processor
 * 
 * This script applies the database schema for the Advanced Query Processor.
 * It creates 4 tables: protocols, protocol_tvl, token_prices, protocol_stats
 * 
 * Usage:
 *   npx ts-node defi/src/query/db/migrate.ts
 *   npx ts-node defi/src/query/db/migrate.ts --rollback
 */

import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const MIGRATION_NAME = 'story-1.4-advanced-query-processor';
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

// Database connection configuration
// Use environment variable or default to local PostgreSQL
const DB_URL = process.env.ALERTS_DB || 'postgresql://defillama:defillama123@localhost:5432/defillama';

const sql = postgres(DB_URL);

// ============================================================================
// Migration Tracking Table
// ============================================================================

async function createMigrationTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✅ Migration tracking table ready');
}

// ============================================================================
// Check if Migration Applied
// ============================================================================

async function isMigrationApplied(): Promise<boolean> {
  const result = await sql`
    SELECT COUNT(*) as count 
    FROM migrations 
    WHERE name = ${MIGRATION_NAME}
  `;
  return Number(result[0].count) > 0;
}

// ============================================================================
// Record Migration
// ============================================================================

async function recordMigration() {
  await sql`
    INSERT INTO migrations (name) 
    VALUES (${MIGRATION_NAME})
    ON CONFLICT (name) DO NOTHING
  `;
  console.log(`✅ Migration recorded: ${MIGRATION_NAME}`);
}

// ============================================================================
// Remove Migration Record
// ============================================================================

async function removeMigrationRecord() {
  await sql`
    DELETE FROM migrations 
    WHERE name = ${MIGRATION_NAME}
  `;
  console.log(`✅ Migration record removed: ${MIGRATION_NAME}`);
}

// ============================================================================
// Apply Migration (Up)
// ============================================================================

async function applyMigration() {
  console.log(`\n🚀 Applying migration: ${MIGRATION_NAME}\n`);

  // Check if already applied
  const applied = await isMigrationApplied();
  if (applied) {
    console.log('⚠️  Migration already applied. Skipping.');
    return;
  }

  // Read schema file
  const schema = fs.readFileSync(SCHEMA_FILE, 'utf-8');
  console.log(`📄 Read schema file: ${SCHEMA_FILE}`);

  // Apply schema
  try {
    await sql.unsafe(schema);
    console.log('✅ Schema applied successfully');
  } catch (error) {
    console.error('❌ Failed to apply schema:', error);
    throw error;
  }

  // Record migration
  await recordMigration();

  // Verify tables created
  await verifyTables();

  console.log('\n✅ Migration completed successfully!\n');
}

// ============================================================================
// Rollback Migration (Down)
// ============================================================================

async function rollbackMigration() {
  console.log(`\n🔄 Rolling back migration: ${MIGRATION_NAME}\n`);

  // Check if applied
  const applied = await isMigrationApplied();
  if (!applied) {
    console.log('⚠️  Migration not applied. Nothing to rollback.');
    return;
  }

  // Drop tables in reverse order (respecting foreign keys)
  const tables = [
    'protocol_stats',
    'protocol_tvl',
    'token_prices',
    'protocols',
  ];

  for (const table of tables) {
    try {
      await sql`DROP TABLE IF EXISTS ${sql(table)} CASCADE`;
      console.log(`✅ Dropped table: ${table}`);
    } catch (error) {
      console.error(`❌ Failed to drop table ${table}:`, error);
    }
  }

  // Drop views
  const views = [
    'protocol_summary',
    'latest_token_prices',
    'latest_protocol_tvl',
  ];

  for (const view of views) {
    try {
      await sql`DROP VIEW IF EXISTS ${sql(view)} CASCADE`;
      console.log(`✅ Dropped view: ${view}`);
    } catch (error) {
      console.error(`❌ Failed to drop view ${view}:`, error);
    }
  }

  // Drop functions
  const functions = [
    'update_all_protocol_stats',
    'update_protocol_stats',
    'update_updated_at_column',
  ];

  for (const func of functions) {
    try {
      await sql`DROP FUNCTION IF EXISTS ${sql(func)} CASCADE`;
      console.log(`✅ Dropped function: ${func}`);
    } catch (error) {
      console.error(`❌ Failed to drop function ${func}:`, error);
    }
  }

  // Remove migration record
  await removeMigrationRecord();

  console.log('\n✅ Rollback completed successfully!\n');
}

// ============================================================================
// Verify Tables Created
// ============================================================================

async function verifyTables() {
  console.log('\n🔍 Verifying tables...\n');

  const tables = [
    'protocols',
    'protocol_tvl',
    'token_prices',
    'protocol_stats',
  ];

  for (const table of tables) {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${table}
    `;

    const exists = Number(result[0].count) > 0;
    if (exists) {
      console.log(`✅ Table exists: ${table}`);
    } else {
      console.error(`❌ Table missing: ${table}`);
      throw new Error(`Table ${table} was not created`);
    }
  }

  // Verify views
  const views = [
    'latest_protocol_tvl',
    'latest_token_prices',
    'protocol_summary',
  ];

  for (const view of views) {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = ${view}
    `;

    const exists = Number(result[0].count) > 0;
    if (exists) {
      console.log(`✅ View exists: ${view}`);
    } else {
      console.error(`❌ View missing: ${view}`);
      throw new Error(`View ${view} was not created`);
    }
  }

  // Verify functions
  const functions = [
    'update_protocol_stats',
    'update_all_protocol_stats',
    'update_updated_at_column',
  ];

  for (const func of functions) {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = ${func}
    `;

    const exists = Number(result[0].count) > 0;
    if (exists) {
      console.log(`✅ Function exists: ${func}`);
    } else {
      console.error(`❌ Function missing: ${func}`);
      throw new Error(`Function ${func} was not created`);
    }
  }

  console.log('\n✅ All database objects verified!\n');
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  try {
    // Create migration tracking table
    await createMigrationTable();

    // Check command line arguments
    const args = process.argv.slice(2);
    const isRollback = args.includes('--rollback');

    if (isRollback) {
      await rollbackMigration();
    } else {
      await applyMigration();
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await sql.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { applyMigration, rollbackMigration, verifyTables };

