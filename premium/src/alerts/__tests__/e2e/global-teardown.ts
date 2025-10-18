/**
 * Global Teardown for E2E Tests
 * Runs once after all E2E tests
 */

import { globalTeardown } from './setup';

export default async function() {
  console.log('\n🧹 Finishing E2E Test Suite...\n');
  await globalTeardown();
}

