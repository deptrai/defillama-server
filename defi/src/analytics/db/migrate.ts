/**
 * Database Migration Runner
 * Story: 2.1.1 - Protocol Performance Dashboard
 * 
 * This script runs database migrations for the analytics module.
 * It reads SQL files from the migrations directory and executes them in order.
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.ANALYTICS_DB || process.env.ALERTS_DB || 'postgresql://defillama:defillama123@localhost:5432/defillama',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

interface Migration {
  filename: string;
  sql: string;
}

/**
 * Get all migration files from the migrations directory
 */
function getMigrationFiles(): Migration[] {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found. Creating...');
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort to ensure migrations run in order
  
  return files.map(filename => ({
    filename,
    sql: fs.readFileSync(path.join(migrationsDir, filename), 'utf-8'),
  }));
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable(): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✓ Migrations tracking table ready');
  } finally {
    client.release();
  }
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations(): Promise<string[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY id'
    );
    
    return result.rows.map(row => row.filename);
  } finally {
    client.release();
  }
}

/**
 * Execute a single migration
 */
async function executeMigration(migration: Migration): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Execute migration SQL
    await client.query(migration.sql);
    
    // Record migration as executed
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [migration.filename]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`✓ Executed migration: ${migration.filename}`);
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...\n');
  
  try {
    // Create migrations tracking table
    await createMigrationsTable();
    
    // Get all migration files
    const migrations = getMigrationFiles();
    
    if (migrations.length === 0) {
      console.log('No migration files found.');
      return;
    }
    
    console.log(`Found ${migrations.length} migration file(s)\n`);
    
    // Get already executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    if (executedMigrations.length > 0) {
      console.log(`Already executed ${executedMigrations.length} migration(s):`);
      executedMigrations.forEach(filename => {
        console.log(`  - ${filename}`);
      });
      console.log();
    }
    
    // Filter out already executed migrations
    const pendingMigrations = migrations.filter(
      migration => !executedMigrations.includes(migration.filename)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✓ All migrations are up to date. Nothing to do.');
      return;
    }
    
    console.log(`Executing ${pendingMigrations.length} pending migration(s):\n`);
    
    // Execute each pending migration
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }
    
    console.log('\n✓ All migrations completed successfully!');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback the last migration (for development/testing)
 */
async function rollbackLastMigration(): Promise<void> {
  console.log('Rolling back last migration...\n');
  
  const client = await pool.connect();
  
  try {
    // Get last executed migration
    const result = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY id DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }
    
    const lastMigration = result.rows[0].filename;
    
    // Start transaction
    await client.query('BEGIN');
    
    // Remove migration record
    await client.query(
      'DELETE FROM schema_migrations WHERE filename = $1',
      [lastMigration]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`✓ Rolled back migration: ${lastMigration}`);
    console.log('\nNote: This only removes the migration record.');
    console.log('You need to manually drop the tables/indexes if needed.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n✗ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Show migration status
 */
async function showStatus(): Promise<void> {
  console.log('Migration Status:\n');
  
  try {
    const migrations = getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();
    
    if (migrations.length === 0) {
      console.log('No migration files found.');
      return;
    }
    
    console.log('Migrations:');
    migrations.forEach(migration => {
      const isExecuted = executedMigrations.includes(migration.filename);
      const status = isExecuted ? '✓ Executed' : '○ Pending';
      console.log(`  ${status} - ${migration.filename}`);
    });
    
    const pendingCount = migrations.length - executedMigrations.length;
    console.log(`\nTotal: ${migrations.length} | Executed: ${executedMigrations.length} | Pending: ${pendingCount}`);
  } catch (error) {
    console.error('\n✗ Failed to get status:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2] || 'up';
  
  try {
    switch (command) {
      case 'up':
        await runMigrations();
        break;
      case 'down':
        await rollbackLastMigration();
        break;
      case 'status':
        await showStatus();
        break;
      default:
        console.log('Usage: ts-node migrate.ts [up|down|status]');
        console.log('  up     - Run all pending migrations (default)');
        console.log('  down   - Rollback the last migration');
        console.log('  status - Show migration status');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { runMigrations, rollbackLastMigration, showStatus };

