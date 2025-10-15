/**
 * Manual Collector Run Script
 * 
 * Runs the protocol-performance-collector to populate protocol_performance_metrics table
 */

import { ProtocolPerformanceCollector } from './protocol-performance-collector';

async function main() {
  console.log('='.repeat(80));
  console.log('PROTOCOL PERFORMANCE COLLECTOR - MANUAL RUN');
  console.log('='.repeat(80));
  console.log();

  const collector = new ProtocolPerformanceCollector();

  try {
    // Run collector for test protocols
    console.log('Running collector for test protocols: uniswap, aave, curve');
    console.log();

    const results = await collector.collect({
      protocol_ids: ['uniswap', 'aave', 'curve'],
      batch_size: 10, // Process 10 protocols at a time
    });

    console.log();
    console.log('='.repeat(80));
    console.log('COLLECTION RESULTS');
    console.log('='.repeat(80));
    console.log();

    for (const result of results) {
      console.log(`Protocol: ${result.protocolId}`);
      console.log(`  Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`  Metrics Collected: ${result.metricsCollected}`);
      console.log(`  Duration: ${result.duration}ms`);
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      
      console.log();
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalMetrics = results.reduce((sum, r) => sum + r.metricsCollected, 0);

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Protocols: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Metrics Collected: ${totalMetrics}`);
    console.log();

    // Verify data in database
    console.log('='.repeat(80));
    console.log('DATABASE VERIFICATION');
    console.log('='.repeat(80));
    console.log();

    const { query } = await import('../db/connection');

    // Check total rows
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM protocol_performance_metrics'
    );
    console.log(`Total rows in protocol_performance_metrics: ${countResult.rows[0].count}`);

    // Check per protocol
    const perProtocolResult = await query<{ protocol_id: string; count: string }>(
      `SELECT protocol_id, COUNT(*) as count 
       FROM protocol_performance_metrics 
       GROUP BY protocol_id 
       ORDER BY protocol_id`
    );

    console.log('\nRows per protocol:');
    for (const row of perProtocolResult.rows) {
      console.log(`  ${row.protocol_id}: ${row.count} rows`);
    }

    // Sample data
    console.log('\nSample data (latest 6 rows):');
    const sampleResult = await query<{
      protocol_id: string;
      timestamp: Date;
      dau: number;
      daily_revenue: number;
      apy_7d: number;
    }>(
      `SELECT protocol_id, timestamp, dau, daily_revenue, apy_7d
       FROM protocol_performance_metrics
       ORDER BY timestamp DESC
       LIMIT 6`
    );

    for (const row of sampleResult.rows) {
      console.log(`  ${row.protocol_id} @ ${row.timestamp.toISOString().split('T')[0]}`);
      console.log(`    DAU: ${(row.dau || 0).toLocaleString()}`);
      console.log(`    Revenue: $${(row.daily_revenue || 0).toLocaleString()}`);
      console.log(`    APY (7d): ${Number(row.apy_7d || 0).toFixed(2)}%`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('✅ COLLECTOR RUN COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ COLLECTOR RUN FAILED');
    console.error('='.repeat(80));
    console.error();
    console.error('Error:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      console.error();
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

main();

