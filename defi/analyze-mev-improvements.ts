/**
 * MEV Detection Improvements Analyzer
 * Compare Phase 1 optimizations vs baseline
 * 
 * Analyzes:
 * - Detection rate improvements
 * - Confidence score accuracy
 * - Profit tier distribution
 * - False positive reduction
 * - Performance metrics
 * 
 * Usage:
 * ```bash
 * # Analyze last 24 hours
 * npx ts-node analyze-mev-improvements.ts --hours 24
 * 
 * # Compare specific date ranges
 * npx ts-node analyze-mev-improvements.ts --baseline-start "2025-10-15" --baseline-end "2025-10-16" --test-start "2025-10-16" --test-end "2025-10-17"
 * ```
 */

import dotenv from 'dotenv';
dotenv.config();

import { query } from './src/analytics/db/connection';
import fs from 'fs';

interface AnalysisConfig {
  baselineStart: Date;
  baselineEnd: Date;
  testStart: Date;
  testEnd: Date;
  outputFile?: string;
}

interface DetectorMetrics {
  totalOpportunities: number;
  averageConfidence: number;
  averageProfit: number;
  totalProfit: number;
  profitTierDistribution: Record<string, number>;
  chainDistribution: Record<string, number>;
  detectionRate: number; // opportunities per hour
}

interface ComparisonResult {
  baseline: DetectorMetrics;
  test: DetectorMetrics;
  improvements: {
    detectionRateChange: number; // percentage
    confidenceChange: number; // percentage points
    profitChange: number; // percentage
    profitTierChanges: Record<string, number>; // percentage
  };
}

class MEVImprovementsAnalyzer {
  private config: AnalysisConfig;

  constructor(config: AnalysisConfig) {
    this.config = config;
  }

  /**
   * Run analysis
   */
  public async analyze(): Promise<void> {
    console.log('================================================================================');
    console.log('MEV DETECTION IMPROVEMENTS ANALYSIS');
    console.log('================================================================================\n');

    console.log('Baseline Period:');
    console.log(`  Start: ${this.config.baselineStart.toISOString()}`);
    console.log(`  End: ${this.config.baselineEnd.toISOString()}\n`);

    console.log('Test Period:');
    console.log(`  Start: ${this.config.testStart.toISOString()}`);
    console.log(`  End: ${this.config.testEnd.toISOString()}\n`);

    // Get baseline metrics
    console.log('📊 Analyzing baseline period...');
    const baseline = await this.getMetrics(
      this.config.baselineStart,
      this.config.baselineEnd
    );

    // Get test metrics
    console.log('📊 Analyzing test period...');
    const test = await this.getMetrics(
      this.config.testStart,
      this.config.testEnd
    );

    // Calculate improvements
    const comparison = this.calculateImprovements(baseline, test);

    // Print results
    this.printResults(comparison);

    // Save results
    if (this.config.outputFile) {
      this.saveResults(comparison);
    }
  }

  /**
   * Get metrics for a time period
   */
  private async getMetrics(start: Date, end: Date): Promise<DetectorMetrics> {
    // Query opportunities
    const opportunities = await query(
      `SELECT 
        detector_type,
        chain_id,
        estimated_profit_usd,
        confidence_score,
        created_at
      FROM mev_opportunities
      WHERE created_at >= $1 AND created_at < $2
      ORDER BY created_at DESC`,
      [start, end]
    );

    const rows = opportunities.rows;
    const totalOpportunities = rows.length;

    // Calculate duration in hours
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Calculate averages
    let averageConfidence = 0;
    let averageProfit = 0;
    let totalProfit = 0;

    if (totalOpportunities > 0) {
      const totalConfidence = rows.reduce(
        (sum: number, opp: any) => sum + parseFloat(opp.confidence_score),
        0
      );
      averageConfidence = totalConfidence / totalOpportunities;

      totalProfit = rows.reduce(
        (sum: number, opp: any) => sum + parseFloat(opp.estimated_profit_usd),
        0
      );
      averageProfit = totalProfit / totalOpportunities;
    }

    // Profit tier distribution
    const profitTierDistribution: Record<string, number> = {
      MICRO: 0,
      SMALL: 0,
      MEDIUM: 0,
      LARGE: 0,
      WHALE: 0,
    };

    rows.forEach((opp: any) => {
      const profit = parseFloat(opp.estimated_profit_usd);
      if (profit < 50) profitTierDistribution.MICRO++;
      else if (profit < 100) profitTierDistribution.SMALL++;
      else if (profit < 1000) profitTierDistribution.MEDIUM++;
      else if (profit < 10000) profitTierDistribution.LARGE++;
      else profitTierDistribution.WHALE++;
    });

    // Chain distribution
    const chainDistribution: Record<string, number> = {};
    rows.forEach((opp: any) => {
      const chain = opp.chain_id;
      chainDistribution[chain] = (chainDistribution[chain] || 0) + 1;
    });

    return {
      totalOpportunities,
      averageConfidence,
      averageProfit,
      totalProfit,
      profitTierDistribution,
      chainDistribution,
      detectionRate: totalOpportunities / durationHours,
    };
  }

  /**
   * Calculate improvements
   */
  private calculateImprovements(
    baseline: DetectorMetrics,
    test: DetectorMetrics
  ): ComparisonResult {
    // Detection rate change
    const detectionRateChange =
      baseline.detectionRate > 0
        ? ((test.detectionRate - baseline.detectionRate) / baseline.detectionRate) * 100
        : 0;

    // Confidence change (percentage points)
    const confidenceChange = test.averageConfidence - baseline.averageConfidence;

    // Profit change
    const profitChange =
      baseline.averageProfit > 0
        ? ((test.averageProfit - baseline.averageProfit) / baseline.averageProfit) * 100
        : 0;

    // Profit tier changes
    const profitTierChanges: Record<string, number> = {};
    Object.keys(baseline.profitTierDistribution).forEach((tier) => {
      const baselineCount = baseline.profitTierDistribution[tier];
      const testCount = test.profitTierDistribution[tier];
      
      if (baselineCount > 0) {
        profitTierChanges[tier] = ((testCount - baselineCount) / baselineCount) * 100;
      } else {
        profitTierChanges[tier] = testCount > 0 ? 100 : 0;
      }
    });

    return {
      baseline,
      test,
      improvements: {
        detectionRateChange,
        confidenceChange,
        profitChange,
        profitTierChanges,
      },
    };
  }

  /**
   * Print results
   */
  private printResults(comparison: ComparisonResult): void {
    console.log('\n================================================================================');
    console.log('COMPARISON RESULTS');
    console.log('================================================================================\n');

    // Overall metrics
    console.log('Overall Metrics:');
    console.log('----------------');
    console.log(`Total Opportunities:`);
    console.log(`  Baseline: ${comparison.baseline.totalOpportunities}`);
    console.log(`  Test: ${comparison.test.totalOpportunities}`);
    console.log(`  Change: ${this.formatChange(comparison.improvements.detectionRateChange)}\n`);

    console.log(`Detection Rate (opportunities/hour):`);
    console.log(`  Baseline: ${comparison.baseline.detectionRate.toFixed(2)}`);
    console.log(`  Test: ${comparison.test.detectionRate.toFixed(2)}`);
    console.log(`  Change: ${this.formatChange(comparison.improvements.detectionRateChange)}\n`);

    console.log(`Average Confidence:`);
    console.log(`  Baseline: ${comparison.baseline.averageConfidence.toFixed(2)}%`);
    console.log(`  Test: ${comparison.test.averageConfidence.toFixed(2)}%`);
    console.log(`  Change: ${this.formatChangePoints(comparison.improvements.confidenceChange)}\n`);

    console.log(`Average Profit:`);
    console.log(`  Baseline: $${comparison.baseline.averageProfit.toFixed(2)}`);
    console.log(`  Test: $${comparison.test.averageProfit.toFixed(2)}`);
    console.log(`  Change: ${this.formatChange(comparison.improvements.profitChange)}\n`);

    console.log(`Total Profit:`);
    console.log(`  Baseline: $${comparison.baseline.totalProfit.toFixed(2)}`);
    console.log(`  Test: $${comparison.test.totalProfit.toFixed(2)}\n`);

    // Profit tier distribution
    console.log('Profit Tier Distribution:');
    console.log('-------------------------');
    const tierOrder = ['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'WHALE'];
    tierOrder.forEach((tier) => {
      const baselineCount = comparison.baseline.profitTierDistribution[tier];
      const testCount = comparison.test.profitTierDistribution[tier];
      const change = comparison.improvements.profitTierChanges[tier];
      
      console.log(`${tier}:`);
      console.log(`  Baseline: ${baselineCount}`);
      console.log(`  Test: ${testCount}`);
      console.log(`  Change: ${this.formatChange(change)}`);
    });

    // Chain distribution
    console.log('\nChain Distribution:');
    console.log('-------------------');
    const allChains = new Set([
      ...Object.keys(comparison.baseline.chainDistribution),
      ...Object.keys(comparison.test.chainDistribution),
    ]);
    
    allChains.forEach((chain) => {
      const baselineCount = comparison.baseline.chainDistribution[chain] || 0;
      const testCount = comparison.test.chainDistribution[chain] || 0;
      
      console.log(`${chain}:`);
      console.log(`  Baseline: ${baselineCount}`);
      console.log(`  Test: ${testCount}`);
    });

    console.log('\n================================================================================\n');

    // Summary
    console.log('Summary:');
    console.log('--------');
    if (comparison.improvements.detectionRateChange > 0) {
      console.log(`✅ Detection rate improved by ${comparison.improvements.detectionRateChange.toFixed(1)}%`);
    } else {
      console.log(`⚠️  Detection rate decreased by ${Math.abs(comparison.improvements.detectionRateChange).toFixed(1)}%`);
    }

    if (comparison.improvements.confidenceChange > 0) {
      console.log(`✅ Confidence improved by ${comparison.improvements.confidenceChange.toFixed(1)} percentage points`);
    } else {
      console.log(`⚠️  Confidence decreased by ${Math.abs(comparison.improvements.confidenceChange).toFixed(1)} percentage points`);
    }

    // Check MICRO tier improvement
    const microChange = comparison.improvements.profitTierChanges.MICRO;
    if (microChange > 0) {
      console.log(`✅ MICRO tier opportunities increased by ${microChange.toFixed(1)}% (lower threshold working!)`);
    }

    console.log('\n================================================================================\n');
  }

  /**
   * Format percentage change
   */
  private formatChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  /**
   * Format percentage points change
   */
  private formatChangePoints(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)} pp`;
  }

  /**
   * Save results to file
   */
  private saveResults(comparison: ComparisonResult): void {
    if (!this.config.outputFile) return;

    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      comparison,
    };

    fs.writeFileSync(this.config.outputFile, JSON.stringify(report, null, 2));
    console.log(`💾 Results saved to: ${this.config.outputFile}\n`);
  }
}

// Parse command line arguments
async function parseArgs(): Promise<AnalysisConfig> {
  const args = process.argv.slice(2);
  
  // Default: compare last 24 hours vs previous 24 hours
  const now = new Date();
  const testEnd = now;
  const testStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const baselineEnd = testStart;
  const baselineStart = new Date(testStart.getTime() - 24 * 60 * 60 * 1000);

  const config: AnalysisConfig = {
    baselineStart,
    baselineEnd,
    testStart,
    testEnd,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--hours' && args[i + 1]) {
      const hours = parseInt(args[i + 1]);
      config.testEnd = now;
      config.testStart = new Date(now.getTime() - hours * 60 * 60 * 1000);
      config.baselineEnd = config.testStart;
      config.baselineStart = new Date(config.testStart.getTime() - hours * 60 * 60 * 1000);
      i++;
    } else if (args[i] === '--baseline-start' && args[i + 1]) {
      config.baselineStart = new Date(args[i + 1]);
      i++;
    } else if (args[i] === '--baseline-end' && args[i + 1]) {
      config.baselineEnd = new Date(args[i + 1]);
      i++;
    } else if (args[i] === '--test-start' && args[i + 1]) {
      config.testStart = new Date(args[i + 1]);
      i++;
    } else if (args[i] === '--test-end' && args[i + 1]) {
      config.testEnd = new Date(args[i + 1]);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      config.outputFile = args[i + 1];
      i++;
    }
  }

  return config;
}

// Main
async function main() {
  const config = await parseArgs();
  const analyzer = new MEVImprovementsAnalyzer(config);
  await analyzer.analyze();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

