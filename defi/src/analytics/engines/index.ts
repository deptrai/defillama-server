/**
 * Analytics Engines
 * Stories: 2.1.1 - Protocol Performance Dashboard, 2.1.2 - Yield Opportunity Scanner, 2.1.3 - Liquidity Analysis Tools, 2.2.1 - Wallet Portfolio Tracking, 2.2.2 - Holder Distribution Analysis, 2.2.3 - Cross-chain Portfolio Aggregation
 *
 * Central export for all analytics calculation engines
 */

// Export types
export * from './types';

// Export Story 2.1.1 engines
export { APYCalculator, apyCalculator } from './apy-calculator';
export { UserMetricsEngine, userMetricsEngine } from './user-metrics-engine';
export { RevenueAnalyzer, revenueAnalyzer } from './revenue-analyzer';
export { BenchmarkEngine, benchmarkEngine } from './benchmark-engine';

// Export Story 2.1.2 engines
export { RiskScoringEngine, riskScoringEngine } from './risk-scoring-engine';
export { YieldOpportunityEngine, yieldOpportunityEngine } from './yield-opportunity-engine';
export { YieldHistoryEngine, yieldHistoryEngine } from './yield-history-engine';
export { YieldRankingEngine, yieldRankingEngine } from './yield-ranking-engine';
export { AlertMatchingEngine, alertMatchingEngine } from './alert-matching-engine';

// Export Story 2.1.3 engines
export { LiquidityDepthEngine, liquidityDepthEngine } from './liquidity-depth-engine';
export { LPAnalysisEngine, lpAnalysisEngine } from './lp-analysis-engine';
export { ImpermanentLossEngine, impermanentLossEngine } from './impermanent-loss-engine';
export { LiquidityMigrationEngine, liquidityMigrationEngine } from './liquidity-migration-engine';

// Export Story 2.2.1 engines
export { PortfolioValuationEngine } from './portfolio-valuation-engine';
export { AssetAllocationEngine } from './asset-allocation-engine';
export { PerformanceTrackingEngine } from './performance-tracking-engine';

// Export Story 2.2.2 engines
export { HolderDistributionEngine } from './holder-distribution-engine';
export { HolderBehaviorEngine } from './holder-behavior-engine';
export { DistributionAlertEngine } from './distribution-alert-engine';

// Export Story 2.2.3 engines
export { CrossChainAggregationEngine } from './cross-chain-aggregation-engine';

// Export convenience object with all engines
import { apyCalculator } from './apy-calculator';
import { userMetricsEngine } from './user-metrics-engine';
import { revenueAnalyzer } from './revenue-analyzer';
import { benchmarkEngine } from './benchmark-engine';
import { riskScoringEngine } from './risk-scoring-engine';
import { yieldOpportunityEngine } from './yield-opportunity-engine';
import { yieldHistoryEngine } from './yield-history-engine';
import { yieldRankingEngine } from './yield-ranking-engine';
import { alertMatchingEngine } from './alert-matching-engine';
import { liquidityDepthEngine } from './liquidity-depth-engine';
import { lpAnalysisEngine } from './lp-analysis-engine';
import { impermanentLossEngine } from './impermanent-loss-engine';
import { liquidityMigrationEngine } from './liquidity-migration-engine';
import { PortfolioValuationEngine } from './portfolio-valuation-engine';
import { AssetAllocationEngine } from './asset-allocation-engine';
import { PerformanceTrackingEngine } from './performance-tracking-engine';
import { HolderDistributionEngine } from './holder-distribution-engine';
import { HolderBehaviorEngine } from './holder-behavior-engine';
import { DistributionAlertEngine } from './distribution-alert-engine';
import { CrossChainAggregationEngine } from './cross-chain-aggregation-engine';

export const analyticsEngines = {
  // Story 2.1.1
  apy: apyCalculator,
  userMetrics: userMetricsEngine,
  revenue: revenueAnalyzer,
  benchmark: benchmarkEngine,
  // Story 2.1.2
  riskScoring: riskScoringEngine,
  yieldOpportunity: yieldOpportunityEngine,
  yieldHistory: yieldHistoryEngine,
  yieldRanking: yieldRankingEngine,
  alertMatching: alertMatchingEngine,
  // Story 2.1.3
  liquidityDepth: liquidityDepthEngine,
  lpAnalysis: lpAnalysisEngine,
  impermanentLoss: impermanentLossEngine,
  liquidityMigration: liquidityMigrationEngine,
  // Story 2.2.1
  portfolioValuation: PortfolioValuationEngine.getInstance(),
  assetAllocation: AssetAllocationEngine.getInstance(),
  performanceTracking: PerformanceTrackingEngine.getInstance(),
  // Story 2.2.2
  holderDistribution: HolderDistributionEngine.getInstance(),
  holderBehavior: HolderBehaviorEngine.getInstance(),
  distributionAlert: DistributionAlertEngine.getInstance(),
  // Story 2.2.3
  crossChainAggregation: CrossChainAggregationEngine.getInstance(),
};

export default analyticsEngines;

