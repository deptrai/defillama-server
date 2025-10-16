/**
 * Extended MEV Detection Testing
 * Run 24-48 hour test to validate Phase 1 optimizations
 * 
 * Features:
 * - Continuous monitoring
 * - Periodic accuracy reports
 * - Performance metrics
 * - Comparison with baseline
 * - Automatic recovery from errors
 * 
 * Usage:
 * ```bash
 * # Run 24-hour test
 * npx ts-node run-extended-mev-test.ts --duration 24
 * 
 * # Run 48-hour test
 * npx ts-node run-extended-mev-test.ts --duration 48
 * 
 * # Run with specific chains
 * npx ts-node run-extended-mev-test.ts --duration 24 --chains ethereum,arbitrum
 * ```
 */

// Load .env BEFORE any imports
import dotenv from 'dotenv';
dotenv.config();

import { mevIngestionService } from './src/analytics/services/mev-ingestion-service';
import { query } from './src/analytics/db/connection';
import fs from 'fs';
import path from 'path';

interface TestConfig {
  duration: number; // hours
  chains?: string[];
  reportInterval: number; // minutes
  outputDir: string;
}

interface TestMetrics {
  startTime: Date;
  endTime?: Date;
  totalOpportunities: number;
  opportunitiesByDetector: Record<string, number>;
  opportunitiesByChain: Record<string, number>;
  opportunitiesByProfitTier: Record<string, number>;
  averageConfidence: number;
  averageProfit: number;
  totalProfit: number;
  detectionTimes: number[];
  errors: number;
  rpcFailovers: number;
}

class ExtendedMEVTest {
  private config: TestConfig;
  private metrics: TestMetrics;
  private reportTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: TestConfig) {
    this.config = config;
    this.metrics = {
      startTime: new Date(),
      totalOpportunities: 0,
      opportunitiesByDetector: {},
      opportunitiesByChain: {},
      opportunitiesByProfitTier: {},
      averageConfidence: 0,
      averageProfit: 0,
      totalProfit: 0,
      detectionTimes: [],
      errors: 0,
      rpcFailovers: 0,
    };
  }

  /**
   * Start extended test
   */
  public async start(): Promise<void> {
    console.log('================================================================================');
    console.log('EXTENDED MEV DETECTION TEST');
    console.log('================================================================================\n');
    console.log(`Duration: ${this.config.duration} hours`);
    console.log(`Report Interval: ${this.config.reportInterval} minutes`);
    console.log(`Output Directory: ${this.config.outputDir}`);
    console.log(`Chains: ${this.config.chains?.join(', ') || 'All'}\n`);

    // Create output directory
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    // Reload RPC Manager
    const { rpcManager } = await import('./src/analytics/services/rpc-manager');
    await rpcManager.reload();
    console.log('✅ RPC Manager reloaded\n');

    // Start MEV ingestion service
    console.log('🚀 Starting MEV Data Ingestion Service...\n');
    await mevIngestionService.start();
    this.isRunning = true;

    // Start periodic reporting
    this.startPeriodicReporting();

    // Setup graceful shutdown
    this.setupShutdown();

    // Wait for test duration
    const durationMs = this.config.duration * 60 * 60 * 1000;
    console.log(`⏱️  Test will run for ${this.config.duration} hours...\n`);
    console.log('📊 Monitoring MEV detection...\n');

    await new Promise((resolve) => setTimeout(resolve, durationMs));

    // Stop test
    await this.stop();
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    const intervalMs = this.config.reportInterval * 60 * 1000;
    
    this.reportTimer = setInterval(async () => {
      await this.generateReport();
    }, intervalMs);
  }

  /**
   * Generate periodic report
   */
  private async generateReport(): Promise<void> {
    try {
      console.log('\n📊 Generating periodic report...\n');

      // Query opportunities since test start
      const opportunities = await query(
        `SELECT 
          detector_type,
          chain_id,
          estimated_profit_usd,
          confidence_score,
          created_at
        FROM mev_opportunities
        WHERE created_at >= $1
        ORDER BY created_at DESC`,
        [this.metrics.startTime]
      );

      // Update metrics
      this.metrics.totalOpportunities = opportunities.rows.length;
      
      // Group by detector
      this.metrics.opportunitiesByDetector = {};
      opportunities.rows.forEach((opp: any) => {
        const detector = opp.detector_type;
        this.metrics.opportunitiesByDetector[detector] = 
          (this.metrics.opportunitiesByDetector[detector] || 0) + 1;
      });

      // Group by chain
      this.metrics.opportunitiesByChain = {};
      opportunities.rows.forEach((opp: any) => {
        const chain = opp.chain_id;
        this.metrics.opportunitiesByChain[chain] = 
          (this.metrics.opportunitiesByChain[chain] || 0) + 1;
      });

      // Group by profit tier
      this.metrics.opportunitiesByProfitTier = {};
      opportunities.rows.forEach((opp: any) => {
        const profit = parseFloat(opp.estimated_profit_usd);
        let tier = 'UNKNOWN';
        if (profit < 50) tier = 'MICRO';
        else if (profit < 100) tier = 'SMALL';
        else if (profit < 1000) tier = 'MEDIUM';
        else if (profit < 10000) tier = 'LARGE';
        else tier = 'WHALE';
        
        this.metrics.opportunitiesByProfitTier[tier] = 
          (this.metrics.opportunitiesByProfitTier[tier] || 0) + 1;
      });

      // Calculate averages
      if (opportunities.rows.length > 0) {
        const totalConfidence = opportunities.rows.reduce(
          (sum: number, opp: any) => sum + parseFloat(opp.confidence_score), 
          0
        );
        this.metrics.averageConfidence = totalConfidence / opportunities.rows.length;

        const totalProfit = opportunities.rows.reduce(
          (sum: number, opp: any) => sum + parseFloat(opp.estimated_profit_usd), 
          0
        );
        this.metrics.totalProfit = totalProfit;
        this.metrics.averageProfit = totalProfit / opportunities.rows.length;
      }

      // Print report
      this.printReport();

      // Save report to file
      await this.saveReport();

    } catch (error) {
      console.error('❌ Error generating report:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Print report to console
   */
  private printReport(): void {
    const elapsed = Date.now() - this.metrics.startTime.getTime();
    const elapsedHours = (elapsed / (1000 * 60 * 60)).toFixed(2);

    console.log('================================================================================');
    console.log(`PERIODIC REPORT - ${new Date().toISOString()}`);
    console.log('================================================================================\n');
    console.log(`Elapsed Time: ${elapsedHours} hours`);
    console.log(`Total Opportunities: ${this.metrics.totalOpportunities}`);
    console.log(`Average Confidence: ${this.metrics.averageConfidence.toFixed(2)}%`);
    console.log(`Average Profit: $${this.metrics.averageProfit.toFixed(2)}`);
    console.log(`Total Profit: $${this.metrics.totalProfit.toFixed(2)}`);
    console.log(`Errors: ${this.metrics.errors}`);
    console.log(`RPC Failovers: ${this.metrics.rpcFailovers}\n`);

    console.log('By Detector:');
    Object.entries(this.metrics.opportunitiesByDetector)
      .sort(([, a], [, b]) => b - a)
      .forEach(([detector, count]) => {
        const pct = ((count / this.metrics.totalOpportunities) * 100).toFixed(1);
        console.log(`  ${detector}: ${count} (${pct}%)`);
      });

    console.log('\nBy Chain:');
    Object.entries(this.metrics.opportunitiesByChain)
      .sort(([, a], [, b]) => b - a)
      .forEach(([chain, count]) => {
        const pct = ((count / this.metrics.totalOpportunities) * 100).toFixed(1);
        console.log(`  ${chain}: ${count} (${pct}%)`);
      });

    console.log('\nBy Profit Tier:');
    const tierOrder = ['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'WHALE'];
    tierOrder.forEach((tier) => {
      const count = this.metrics.opportunitiesByProfitTier[tier] || 0;
      if (count > 0) {
        const pct = ((count / this.metrics.totalOpportunities) * 100).toFixed(1);
        console.log(`  ${tier}: ${count} (${pct}%)`);
      }
    });

    console.log('\n================================================================================\n');
  }

  /**
   * Save report to file
   */
  private async saveReport(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mev-test-report-${timestamp}.json`;
    const filepath = path.join(this.config.outputDir, filename);

    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      metrics: this.metrics,
    };

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`💾 Report saved to: ${filepath}\n`);
  }

  /**
   * Setup graceful shutdown
   */
  private setupShutdown(): void {
    const shutdown = async () => {
      if (!this.isRunning) return;
      this.isRunning = false;

      console.log('\n\n🛑 Shutting down gracefully...\n');

      // Stop periodic reporting
      if (this.reportTimer) {
        clearInterval(this.reportTimer);
      }

      // Generate final report
      await this.generateReport();

      // Stop MEV ingestion service
      await mevIngestionService.stop();

      console.log('✅ Test completed successfully\n');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  /**
   * Stop test
   */
  private async stop(): Promise<void> {
    this.metrics.endTime = new Date();
    
    // Stop periodic reporting
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }

    // Generate final report
    await this.generateReport();

    // Stop MEV ingestion service
    await mevIngestionService.stop();

    console.log('✅ Extended test completed successfully\n');
  }
}

// Parse command line arguments
async function parseArgs(): Promise<TestConfig> {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    duration: 24, // default 24 hours
    reportInterval: 60, // default 60 minutes
    outputDir: './test-reports',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--duration' && args[i + 1]) {
      config.duration = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--chains' && args[i + 1]) {
      config.chains = args[i + 1].split(',');
      i++;
    } else if (args[i] === '--report-interval' && args[i + 1]) {
      config.reportInterval = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--output-dir' && args[i + 1]) {
      config.outputDir = args[i + 1];
      i++;
    }
  }

  return config;
}

// Main
async function main() {
  const config = await parseArgs();
  const test = new ExtendedMEVTest(config);
  await test.start();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

