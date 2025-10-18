/**
 * E2E Test Setup
 * Sets up test database and seeds test data
 */

import postgres from 'postgres';

// Test database connection
let testDb: ReturnType<typeof postgres>;

export function getTestDb() {
  if (!testDb) {
    const dbUrl = process.env.TEST_DB || process.env.PREMIUM_DB;
    if (!dbUrl) {
      throw new Error('TEST_DB or PREMIUM_DB environment variable not set');
    }
    
    testDb = postgres(dbUrl, {
      idle_timeout: 90,
      max: 10,
    });
  }
  return testDb;
}

/**
 * Setup test database schema
 */
export async function setupDatabase() {
  const db = getTestDb();
  
  // Create alert_rules table if not exists
  await db`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(50) NOT NULL,
      conditions JSONB NOT NULL,
      actions JSONB NOT NULL,
      enabled BOOLEAN DEFAULT true,
      throttle_minutes INTEGER DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  // Create subscriptions table if not exists (for getUserTier)
  await db`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) NOT NULL UNIQUE,
      tier VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  console.log('✅ Test database schema created');
}

/**
 * Seed test data
 */
export async function seedTestData() {
  const db = getTestDb();
  
  // Insert test user subscription (Pro tier)
  await db`
    INSERT INTO subscriptions (user_id, tier, status)
    VALUES ('test-user-pro', 'pro', 'active')
    ON CONFLICT (user_id) DO UPDATE SET
      tier = EXCLUDED.tier,
      status = EXCLUDED.status
  `;
  
  // Insert test user subscription (Premium tier)
  await db`
    INSERT INTO subscriptions (user_id, tier, status)
    VALUES ('test-user-premium', 'premium', 'active')
    ON CONFLICT (user_id) DO UPDATE SET
      tier = EXCLUDED.tier,
      status = EXCLUDED.status
  `;
  
  console.log('✅ Test data seeded');
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  const db = getTestDb();
  
  // Delete all test alerts
  await db`
    DELETE FROM alert_rules
    WHERE user_id LIKE 'test-user-%'
  `;
  
  console.log('✅ Test data cleaned up');
}

/**
 * Teardown test database
 */
export async function teardownDatabase() {
  const db = getTestDb();
  
  // Drop tables (optional - only for complete cleanup)
  // await db`DROP TABLE IF EXISTS alert_rules CASCADE`;
  // await db`DROP TABLE IF EXISTS subscriptions CASCADE`;
  
  // Close connection
  await db.end();
  
  console.log('✅ Test database connection closed');
}

/**
 * Global setup for E2E tests
 */
export async function globalSetup() {
  console.log('🚀 Setting up E2E test environment...');
  await setupDatabase();
  await seedTestData();
  console.log('✅ E2E test environment ready');
}

/**
 * Global teardown for E2E tests
 */
export async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...');
  await cleanupTestData();
  await teardownDatabase();
  console.log('✅ E2E test environment cleaned up');
}

