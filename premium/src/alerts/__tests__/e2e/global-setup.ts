/**
 * Global Setup for E2E Tests
 * Runs once before all E2E tests
 */

import { globalSetup } from './setup';

export default async function() {
  console.log('\n🚀 Starting E2E Test Suite...\n');
  await globalSetup();
}

