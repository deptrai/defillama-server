/**
 * Protocol Performance Collector Scheduler
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 2 - Data Collection Pipeline
 * 
 * This scheduler runs the protocol performance collector on a schedule.
 * Can be invoked manually or via AWS Lambda cron.
 */

import { protocolPerformanceCollector } from './protocol-performance-collector';
import { CollectorOptions, CollectionStatistics } from './types';
import { formatDuration, formatNumber } from './utils';
import { closePool } from '../db/connection';

/**
 * Run collector with options
 */
export async function runCollector(options: CollectorOptions = {}): Promise<CollectionStatistics> {
  const startTime = Date.now();
  
  console.log('='.repeat(80));
  console.log('Protocol Performance Collector - Starting');
  console.log('='.repeat(80));
  console.log('Timestamp:', new Date().toISOString());
  console.log('Options:', JSON.stringify(options, null, 2));
  console.log();
  
  try {
    // Run collector
    const results = await protocolPerformanceCollector.collect(options);
    
    // Calculate statistics
    const stats: CollectionStatistics = {
      total_protocols: results.length,
      successful_collections: results.filter(r => r.success).length,
      failed_collections: results.filter(r => !r.success).length,
      total_duration_ms: Date.now() - startTime,
      avg_duration_ms: results.length > 0 
        ? results.reduce((sum, r) => sum + r.duration_ms, 0) / results.length 
        : 0,
      errors: results
        .filter(r => !r.success || (r.errors && r.errors.length > 0))
        .map(r => ({
          protocol_id: r.protocol_id,
          error: r.errors?.join('; ') || 'Unknown error',
          timestamp: r.timestamp,
        })),
    };
    
    // Print summary
    console.log();
    console.log('='.repeat(80));
    console.log('Collection Summary');
    console.log('='.repeat(80));
    console.log(`Total Protocols:      ${formatNumber(stats.total_protocols)}`);
    console.log(`Successful:           ${formatNumber(stats.successful_collections)} (${((stats.successful_collections / stats.total_protocols) * 100).toFixed(1)}%)`);
    console.log(`Failed:               ${formatNumber(stats.failed_collections)}`);
    console.log(`Total Duration:       ${formatDuration(stats.total_duration_ms)}`);
    console.log(`Average Duration:     ${formatDuration(stats.avg_duration_ms)}`);
    console.log();
    
    if (stats.errors.length > 0) {
      console.log('Errors:');
      stats.errors.forEach(err => {
        console.log(`  - ${err.protocol_id}: ${err.error}`);
      });
      console.log();
    }
    
    console.log('='.repeat(80));
    console.log('Collection Complete');
    console.log('='.repeat(80));
    
    return stats;
  } catch (error) {
    console.error();
    console.error('='.repeat(80));
    console.error('FATAL ERROR');
    console.error('='.repeat(80));
    console.error(error);
    console.error('='.repeat(80));
    
    throw error;
  }
}

/**
 * Lambda handler for scheduled collection
 */
export async function handler(event: any = {}, context: any = {}): Promise<any> {
  console.log('Lambda invoked');
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));
  
  try {
    // Parse options from event
    const options: CollectorOptions = {
      protocol_ids: event.protocol_ids,
      skip_existing: event.skip_existing !== false, // Default to true
      batch_size: event.batch_size || 10,
    };
    
    // Run collector
    const stats = await runCollector(options);
    
    // Close database connection
    await closePool();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        statistics: stats,
      }),
    };
  } catch (error) {
    console.error('Lambda handler error:', error);
    
    // Close database connection
    await closePool();
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}

/**
 * Main function for manual execution
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options: CollectorOptions = {};
    
    // Parse --protocol-ids flag
    const protocolIdsIndex = args.indexOf('--protocol-ids');
    if (protocolIdsIndex !== -1 && args[protocolIdsIndex + 1]) {
      options.protocol_ids = args[protocolIdsIndex + 1].split(',');
    }
    
    // Parse --skip-existing flag
    const skipExistingIndex = args.indexOf('--skip-existing');
    if (skipExistingIndex !== -1) {
      options.skip_existing = args[skipExistingIndex + 1] !== 'false';
    }
    
    // Parse --batch-size flag
    const batchSizeIndex = args.indexOf('--batch-size');
    if (batchSizeIndex !== -1 && args[batchSizeIndex + 1]) {
      options.batch_size = parseInt(args[batchSizeIndex + 1], 10);
    }
    
    // Run collector
    await runCollector(options);
    
    // Close database connection
    await closePool();
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    
    // Close database connection
    await closePool();
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
export { main };

