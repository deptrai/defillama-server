/**
 * Simple database connection test
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { getAlertsDBConnection, createAlertRule, closeAlertsDBConnection } from '../db';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const sql = getAlertsDBConnection();
    
    // Test simple query
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connection successful:', result[0]);
    
    // Test create alert rule
    console.log('\nTesting create alert rule...');
    const rule = await createAlertRule('test-user-123', {
      name: 'Test Alert',
      description: 'Test description',
      alert_type: 'tvl_change',
      protocol_id: 'uniswap',
      condition: {
        operator: '>',
        threshold: 1000000000,
        metric: 'tvl',
      },
      channels: ['email'],
      throttle_minutes: 5,
      enabled: true,
    });
    
    console.log('✅ Alert rule created:', rule);
    
    await closeAlertsDBConnection();
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConnection();

