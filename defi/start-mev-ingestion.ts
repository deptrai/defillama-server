/**
 * MEV Data Ingestion Starter
 * Start real-time MEV data collection from blockchain
 * 
 * Usage:
 * ```bash
 * # Start ingestion service
 * npx ts-node start-mev-ingestion.ts
 * 
 * # Start with specific chain
 * npx ts-node start-mev-ingestion.ts --chain ethereum
 * 
 * # Start in test mode (limited duration)
 * npx ts-node start-mev-ingestion.ts --test --duration 60
 * ```
 */

import { mevIngestionService } from './src/analytics/services/mev-ingestion-service';
import dotenv from 'dotenv';

dotenv.config();

interface StartOptions {
  chain?: string;
  test?: boolean;
  duration?: number; // seconds
}

async function parseArgs(): Promise<StartOptions> {
  const args = process.argv.slice(2);
  const options: StartOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--chain':
        options.chain = args[++i];
        break;
      case '--test':
        options.test = true;
        break;
      case '--duration':
        options.duration = parseInt(args[++i], 10);
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
MEV Data Ingestion Service

Usage:
  npx ts-node start-mev-ingestion.ts [options]

Options:
  --chain <name>      Start ingestion for specific chain only
  --test              Run in test mode (limited duration)
  --duration <secs>   Duration for test mode (default: 60 seconds)
  --help              Show this help message

Examples:
  # Start full ingestion service
  npx ts-node start-mev-ingestion.ts

  # Start for Ethereum only
  npx ts-node start-mev-ingestion.ts --chain ethereum

  # Test mode for 2 minutes
  npx ts-node start-mev-ingestion.ts --test --duration 120

Supported Chains:
  - ethereum (Ethereum mainnet)
  - arbitrum (Arbitrum One)
  - optimism (Optimism mainnet)
  - bsc (Binance Smart Chain)
  - polygon (Polygon PoS)

Environment Variables Required:
  ETHEREUM_RPC    - Ethereum RPC endpoint (WebSocket preferred)
  ARBITRUM_RPC    - Arbitrum RPC endpoint
  OPTIMISM_RPC    - Optimism RPC endpoint
  BSC_RPC         - BSC RPC endpoint
  POLYGON_RPC     - Polygon RPC endpoint
  DATABASE_URL    - PostgreSQL connection string

Notes:
  - WebSocket RPC endpoints are required for real-time monitoring
  - HTTP endpoints will be automatically converted to WebSocket
  - Mempool monitoring is only enabled for Ethereum, BSC, and Polygon
  - Press Ctrl+C to stop the service gracefully
  `);
}

async function main() {
  console.log('='.repeat(80));
  console.log('MEV DATA INGESTION SERVICE');
  console.log('='.repeat(80));
  console.log();

  // Parse command line arguments
  const options = await parseArgs();

  // Validate environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!process.env.ETHEREUM_RPC) {
    console.error('❌ ERROR: ETHEREUM_RPC environment variable is required');
    console.error('   Please set it in .env file or environment');
    process.exit(1);
  }

  // Display configuration
  console.log('Configuration:');
  console.log(`  Mode: ${options.test ? 'TEST' : 'PRODUCTION'}`);
  if (options.chain) {
    console.log(`  Chain: ${options.chain}`);
  } else {
    console.log(`  Chains: All configured chains`);
  }
  if (options.test && options.duration) {
    console.log(`  Duration: ${options.duration} seconds`);
  }
  console.log();

  // Setup graceful shutdown
  let isShuttingDown = false;

  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('\n\n🛑 Shutting down gracefully...');
    try {
      await mevIngestionService.stop();
      console.log('✅ Service stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    // Start ingestion service
    console.log('🚀 Starting MEV Data Ingestion Service...\n');
    await mevIngestionService.start();

    // Display status
    const status = mevIngestionService.getStatus();
    console.log('\n📊 Service Status:');
    console.log(`  Running: ${status.isRunning}`);
    console.log(`  Active Chains: ${status.activeChains.join(', ')}`);
    console.log();

    for (const [chain, listenerStatus] of Object.entries(status.listenerStatuses)) {
      console.log(`  ${chain}:`);
      console.log(`    - Running: ${listenerStatus.isRunning}`);
      console.log(`    - Mempool: ${listenerStatus.enableMempool ? 'Enabled' : 'Disabled'}`);
      console.log(`    - Blocks: ${listenerStatus.enableBlocks ? 'Enabled' : 'Disabled'}`);
    }

    console.log('\n✅ Service started successfully!');
    console.log('📡 Listening for MEV opportunities...');
    console.log('Press Ctrl+C to stop\n');

    // Test mode: stop after duration
    if (options.test) {
      const duration = options.duration || 60;
      console.log(`⏱️  Test mode: Will run for ${duration} seconds\n`);

      setTimeout(async () => {
        console.log('\n⏱️  Test duration completed');
        await shutdown();
      }, duration * 1000);
    }

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await shutdown();
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

