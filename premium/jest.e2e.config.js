/**
 * Jest Configuration for E2E Tests
 * Runs tests with REAL database connection
 */

// Load environment variables from .env.test BEFORE Jest starts
require('dotenv').config({ path: '.env.test' });

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/e2e/**/*.e2e.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000, // 30 seconds for E2E tests (database operations)
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/alerts/__tests__/e2e/global-setup.ts',
  globalTeardown: '<rootDir>/src/alerts/__tests__/e2e/global-teardown.ts',
  
  // Environment variables for E2E tests
  setupFilesAfterEnv: ['<rootDir>/src/alerts/__tests__/e2e/jest-setup.ts'],
};

