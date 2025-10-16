/**
 * Analytics Engines
 * Stories: 2.1.1 - Protocol Performance Dashboard, 2.1.2 - Yield Opportunity Scanner, 2.1.3 - Liquidity Analysis Tools, 2.2.1 - Wallet Portfolio Tracking, 2.2.2 - Holder Distribution Analysis, 2.2.3 - Cross-chain Portfolio Aggregation, 3.1.1 - Smart Money Identification, 3.1.2 - Trade Pattern Analysis, 3.1.3 - Performance Attribution
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

// Export Story 3.1.1 engines
export { SmartMoneyScorer } from './smart-money-scorer';

// Export Story 3.1.2 engines
export { TradePatternRecognizer } from './trade-pattern-recognizer';
export { BehavioralAnalyzer } from './behavioral-analyzer';

// Export Story 3.1.3 engines
export { PerformanceCalculator } from './performance-calculator';
export { StrategyClassifier } from './strategy-classifier';

// Export Story 3.2.1 engines
export { ContractRiskAnalyzer } from './contract-risk-analyzer';
export { LiquidityRiskAnalyzer } from './liquidity-risk-analyzer';
export { GovernanceRiskAnalyzer } from './governance-risk-analyzer';
export { OperationalRiskAnalyzer } from './operational-risk-analyzer';
export { MarketRiskAnalyzer } from './market-risk-analyzer';
export { ProtocolRiskAggregator } from './protocol-risk-aggregator';

// Export Story 3.2.2 engines
export { RugPullDetector } from './rug-pull-detector';
export { WashTradingDetector } from './wash-trading-detector';
export { PumpDumpDetector } from './pump-dump-detector';
export { SybilAttackDetector } from './sybil-attack-detector';

// Export Story 3.2.3 engines
export { SanctionsScreener } from './sanctions-screener';
export { AMLMonitor } from './aml-monitor';
export { KYCVerifier } from './kyc-verifier';
export { PEPScreener } from './pep-screener';
export { AdverseMediaScreener } from './adverse-media-screener';
export { ComplianceScreeningEngine } from './compliance-screening-engine';

// Export Story 4.1.1 engines (MEV Detection)
export * from './mev-types';
export { SandwichDetector } from './sandwich-detector';
export { FrontrunDetector } from './frontrun-detector';
export { ArbitrageDetector } from './arbitrage-detector';
export { LiquidationDetector } from './liquidation-detector';
export { BackrunDetector } from './backrun-detector';

// Export Story 4.1.1 utilities (Phase 3)
export { ProfitCalculator, profitCalculator } from './profit-calculator';
export { ConfidenceScorer, confidenceScorer } from './confidence-scorer';
export { TransactionSimulator, transactionSimulator } from './transaction-simulator';

// Export Story 4.1.3 engines (MEV Bot Tracking & Analytics)
export { MEVBotIdentifier } from './mev-bot-identifier';
export { MEVBotTracker } from './mev-bot-tracker';
export { BotPerformanceCalculator } from './bot-performance-calculator';
export { BotStrategyAnalyzer } from './bot-strategy-analyzer';
export { BotSophisticationScorer } from './bot-sophistication-scorer';

// Export Story 4.1.3 engines (Profit Attribution)
export { MEVProfitAttributor } from './mev-profit-attributor';
export {
  BotAttributionAnalyzer,
  StrategyAttributionAnalyzer,
  ProtocolAttributionAnalyzer,
} from './profit-attribution-analyzers';

// Export Story 4.1.3 engines (Protocol Leakage Analysis)
export {
  ProtocolLeakageCalculator,
  LeakageBreakdownAnalyzer,
  UserImpactCalculator,
} from './protocol-leakage-analyzers';

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
import { SmartMoneyScorer } from './smart-money-scorer';
import { TradePatternRecognizer } from './trade-pattern-recognizer';
import { BehavioralAnalyzer } from './behavioral-analyzer';
import { PerformanceCalculator } from './performance-calculator';
import { StrategyClassifier } from './strategy-classifier';
import { ContractRiskAnalyzer } from './contract-risk-analyzer';
import { LiquidityRiskAnalyzer } from './liquidity-risk-analyzer';
import { GovernanceRiskAnalyzer } from './governance-risk-analyzer';
import { OperationalRiskAnalyzer } from './operational-risk-analyzer';
import { MarketRiskAnalyzer } from './market-risk-analyzer';
import { ProtocolRiskAggregator } from './protocol-risk-aggregator';
import { RugPullDetector } from './rug-pull-detector';
import { WashTradingDetector } from './wash-trading-detector';
import { PumpDumpDetector } from './pump-dump-detector';
import { SybilAttackDetector } from './sybil-attack-detector';
import { SandwichDetector } from './sandwich-detector';
import { FrontrunDetector } from './frontrun-detector';
import { ArbitrageDetector } from './arbitrage-detector';
import { LiquidationDetector } from './liquidation-detector';
import { BackrunDetector } from './backrun-detector';
import { profitCalculator } from './profit-calculator';
import { confidenceScorer } from './confidence-scorer';
import { transactionSimulator } from './transaction-simulator';

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
  // Story 3.1.1
  smartMoneyScorer: SmartMoneyScorer.getInstance(),
  // Story 3.1.2
  tradePatternRecognizer: TradePatternRecognizer.getInstance(),
  behavioralAnalyzer: BehavioralAnalyzer.getInstance(),
  // Story 3.1.3
  performanceCalculator: PerformanceCalculator.getInstance(),
  strategyClassifier: StrategyClassifier.getInstance(),
  // Story 3.2.1
  contractRiskAnalyzer: ContractRiskAnalyzer.getInstance(),
  liquidityRiskAnalyzer: LiquidityRiskAnalyzer.getInstance(),
  governanceRiskAnalyzer: GovernanceRiskAnalyzer.getInstance(),
  operationalRiskAnalyzer: OperationalRiskAnalyzer.getInstance(),
  marketRiskAnalyzer: MarketRiskAnalyzer.getInstance(),
  protocolRiskAggregator: ProtocolRiskAggregator.getInstance(),
  // Story 3.2.2
  rugPullDetector: RugPullDetector.getInstance(),
  washTradingDetector: WashTradingDetector.getInstance(),
  pumpDumpDetector: PumpDumpDetector.getInstance(),
  sybilAttackDetector: SybilAttackDetector.getInstance(),
  // Story 4.1.1
  sandwichDetector: SandwichDetector.getInstance(),
  frontrunDetector: FrontrunDetector.getInstance(),
  arbitrageDetector: ArbitrageDetector.getInstance(),
  liquidationDetector: LiquidationDetector.getInstance(),
  backrunDetector: BackrunDetector.getInstance(),
  // Story 4.1.1 utilities
  profitCalculator,
  confidenceScorer,
  transactionSimulator,
};

export default analyticsEngines;

