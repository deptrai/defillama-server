/**
 * Jest Setup for E2E Tests
 * Runs before each test file
 *
 * Purpose:
 * - Load environment variables from .env.test
 * - Set environment variables
 * - Configure test timeout
 * - Reset mock servers before each test file (for test isolation)
 */

// Load environment variables from .env.test
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test file from premium directory
const envPath = path.resolve(__dirname, '../../../../../.env.test');
dotenv.config({ path: envPath });

// Set environment variables for E2E tests
process.env.NODE_ENV = 'test';

// Use TEST_DB if available, otherwise fall back to PREMIUM_DB
if (!process.env.TEST_DB && !process.env.PREMIUM_DB) {
  console.warn('⚠️  WARNING: Neither TEST_DB nor PREMIUM_DB environment variable is set!');
  console.warn('⚠️  E2E tests will fail without a database connection.');
  console.warn('⚠️  Please set TEST_DB or PREMIUM_DB environment variable.');
  console.warn(`⚠️  Tried to load from: ${envPath}`);
} else {
  console.log(`✅ Database connection configured: ${process.env.TEST_DB || process.env.PREMIUM_DB}`);
}

// Increase test timeout for E2E tests
jest.setTimeout(30000); // 30 seconds

/**
 * Global beforeEach hook
 * Runs before EACH test in EVERY test file
 *
 * This ensures test isolation by resetting mock servers
 * between test files when running the full suite
 */
beforeEach(async () => {
  // Reset mock servers to ensure clean state
  try {
    // Reset Telegram mock server
    await fetch('http://localhost:3100/reset', { method: 'POST' }).catch(() => {
      // Silently ignore if mock server not available
    });

    // Reset Discord mock server
    await fetch('http://localhost:3101/reset', { method: 'POST' }).catch(() => {
      // Silently ignore if mock server not available
    });

    // Reset Webhook mock server
    await fetch('http://localhost:3102/reset', { method: 'POST' }).catch(() => {
      // Silently ignore if mock server not available
    });
  } catch (error) {
    // Silently ignore errors - mock servers may not be running
  }
});

