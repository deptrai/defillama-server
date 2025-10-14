/**
 * Database Migration Script
 * 
 * Description: Apply alert system database schema
 * Author: Augment Agent (Claude Sonnet 4)
 * Version: 1.0
 * Date: 2025-10-14
 * 
 * Usage: npx ts-node src/alerts/db/migrate.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { getAlertsDBConnection, closeAlertsDBConnection } from '../db';

async function migrate() {
  console.log('🚀 Starting database migration...');
  
  try {
    // Get database connection
    const sql = getAlertsDBConnection();
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('📄 Schema file loaded:', schemaPath);
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await sql.unsafe(statement);
        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
        } else {
          console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Database migration completed successfully!');
    
    // Verify tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_devices', 'alert_rules', 'alert_history', 'notification_logs')
      ORDER BY table_name
    `;
    
    console.log('\n📊 Verified tables:');
    tables.forEach((table: any) => {
      console.log(`  ✓ ${table.table_name}`);
    });
    
    // Close connection
    await closeAlertsDBConnection();
    
    console.log('\n🎉 Migration complete!');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    
    // Close connection
    await closeAlertsDBConnection();
    
    process.exit(1);
  }
}

// Run migration
migrate();

