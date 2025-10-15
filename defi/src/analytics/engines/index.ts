/**
 * Analytics Engines
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Task: 3 - Analytics Engine
 * 
 * Central export for all analytics calculation engines
 */

// Export types
export * from './types';

// Export engines
export { APYCalculator, apyCalculator } from './apy-calculator';
export { UserMetricsEngine, userMetricsEngine } from './user-metrics-engine';
export { RevenueAnalyzer, revenueAnalyzer } from './revenue-analyzer';
export { BenchmarkEngine, benchmarkEngine } from './benchmark-engine';

// Export convenience object with all engines
import { apyCalculator } from './apy-calculator';
import { userMetricsEngine } from './user-metrics-engine';
import { revenueAnalyzer } from './revenue-analyzer';
import { benchmarkEngine } from './benchmark-engine';

export const analyticsEngines = {
  apy: apyCalculator,
  userMetrics: userMetricsEngine,
  revenue: revenueAnalyzer,
  benchmark: benchmarkEngine,
};

export default analyticsEngines;

