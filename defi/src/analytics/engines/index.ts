/**
 * Analytics Engines
 * Stories: 2.1.1 - Protocol Performance Dashboard, 2.1.2 - Yield Opportunity Scanner
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
};

export default analyticsEngines;

