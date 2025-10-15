/**
 * Debug APY Calculator
 * Quick test to see what's failing
 */

import { APYCalculator } from '../apy-calculator';

async function main() {
  console.log('Testing APY Calculator...\n');

  const calculator = new APYCalculator();

  // Test each time range individually
  for (const timeRange of ['7d', '30d', '90d', '1y'] as const) {
    console.log(`\nTesting ${timeRange}...`);
    try {
      const result = await calculator.calculateAPYForTimeRange('uniswap', timeRange);
      console.log(`${timeRange} Result:`, JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`${timeRange} Error:`, error);
    }
  }

  console.log('\n\nTesting comprehensive APY...');
  try {
    const result = await calculator.calculateComprehensiveAPY('uniswap');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

main();

