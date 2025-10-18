/**
 * Jest Setup for E2E Tests
 * Runs before each test file
 */

// Set environment variables for E2E tests
process.env.NODE_ENV = 'test';

// Use TEST_DB if available, otherwise fall back to PREMIUM_DB
if (!process.env.TEST_DB && !process.env.PREMIUM_DB) {
  console.warn('⚠️  WARNING: Neither TEST_DB nor PREMIUM_DB environment variable is set!');
  console.warn('⚠️  E2E tests will fail without a database connection.');
  console.warn('⚠️  Please set TEST_DB or PREMIUM_DB environment variable.');
}

// Increase test timeout for E2E tests
jest.setTimeout(30000); // 30 seconds

