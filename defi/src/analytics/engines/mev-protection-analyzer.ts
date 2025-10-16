/**
 * MEV Protection Analyzer
 * Story: 4.1.2 - MEV Protection Insights
 * 
 * Analyzes transaction vulnerability to MEV attacks and provides protection recommendations
 * 
 * Features:
 * - Transaction vulnerability analysis
 * - Risk breakdown (sandwich, frontrun, backrun)
 * - Estimated MEV impact
 * - Transaction simulation (worst/best/expected cases)
 * - Protection recommendations
 * 
 * Integration:
 * - VulnerabilityScorer: Overall risk calculation
 * - TransactionSimulator: Transaction simulation
 * - Risk Calculators: Individual risk assessments
 */

import { VulnerabilityScorer, VulnerabilityInput, VulnerabilityScore } from './vulnerability-scorer';
import { TransactionSimulator } from './transaction-simulator';
import { SimulationInput, SimulationResult } from './mev-types';

// ============================================================================
// Types
// ============================================================================

export interface TransactionRequest {
  // Transaction details
  chain_id: string;
  from_address?: string;
  to_address?: string;
  
  // Token details
  token_in_address: string;
  token_out_address: string;
  amount_in: number;              // Amount in token units
  amount_in_usd: number;          // Amount in USD
  
  // Transaction parameters
  slippage_tolerance_pct: number;
  gas_price_gwei?: number;
  
  // Pool details
  pool_address?: string;
  pool_liquidity_usd?: number;
  pool_volume_24h_usd?: number;
  dex?: string;
  
  // Optional
  is_time_sensitive?: boolean;
  use_private_mempool?: boolean;
}

export interface VulnerabilityAssessment {
  // Overall assessment
  vulnerability_score: number;           // 0-100
  risk_category: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;              // 0-100
  
  // Risk breakdown
  risks: {
    sandwich_risk: number;               // 0-100
    frontrun_risk: number;               // 0-100
    backrun_risk: number;                // 0-100
  };
  
  // Estimated impact
  estimated_impact: {
    mev_loss_usd: number;
    slippage_pct: number;
    total_cost_usd: number;
  };
  
  // Simulation results
  simulation: {
    worst_case: SimulationResult;
    best_case: SimulationResult;
    expected_case: SimulationResult;
  };
  
  // Recommendations
  recommendations: {
    recommended_slippage: number;
    recommended_gas_price: number;
    use_private_mempool: boolean;
    use_mev_protection_rpc: boolean;
    alternative_routes?: Array<{
      dex: string;
      estimated_output: number;
      estimated_risk: number;
    }>;
  };
  
  // Explanation
  explanation: string;
  timestamp: Date;
}

// ============================================================================
// MEV Protection Analyzer
// ============================================================================

export class MEVProtectionAnalyzer {
  private static instance: MEVProtectionAnalyzer;

  private vulnerabilityScorer: VulnerabilityScorer;
  private transactionSimulator: TransactionSimulator;

  // Network data (mock - will be replaced with real data sources)
  private readonly NETWORK_AVG_GAS_PRICE: Record<string, number> = {
    ethereum: 50,
    arbitrum: 0.1,
    polygon: 100,
    optimism: 0.001,
  };

  private readonly BLOCK_TIME_SECONDS: Record<string, number> = {
    ethereum: 12,
    arbitrum: 0.25,
    polygon: 2,
    optimism: 2,
  };

  private constructor() {
    this.vulnerabilityScorer = VulnerabilityScorer.getInstance();
    this.transactionSimulator = TransactionSimulator.getInstance();
  }

  public static getInstance(): MEVProtectionAnalyzer {
    if (!MEVProtectionAnalyzer.instance) {
      MEVProtectionAnalyzer.instance = new MEVProtectionAnalyzer();
    }
    return MEVProtectionAnalyzer.instance;
  }

  /**
   * Analyze transaction vulnerability to MEV attacks
   */
  public async analyzeVulnerability(tx: TransactionRequest): Promise<VulnerabilityAssessment> {
    // Step 1: Simulate transaction (worst/best/expected cases)
    const simulation = await this.simulateTransaction(tx);

    // Step 2: Calculate vulnerability score
    const vulnerabilityScore = await this.calculateVulnerabilityScore(tx, simulation);

    // Step 3: Estimate MEV impact
    const estimatedImpact = this.estimateImpact(tx, simulation, vulnerabilityScore);

    // Step 4: Generate recommendations
    const recommendations = this.generateRecommendations(tx, vulnerabilityScore, estimatedImpact);

    // Step 5: Generate explanation
    const explanation = this.generateExplanation(vulnerabilityScore, estimatedImpact, recommendations);

    return {
      vulnerability_score: vulnerabilityScore.overall_score,
      risk_category: vulnerabilityScore.risk_category,
      confidence_score: vulnerabilityScore.confidence_score,
      risks: {
        sandwich_risk: vulnerabilityScore.sandwich_risk,
        frontrun_risk: vulnerabilityScore.frontrun_risk,
        backrun_risk: vulnerabilityScore.backrun_risk,
      },
      estimated_impact: estimatedImpact,
      simulation,
      recommendations,
      explanation,
      timestamp: new Date(),
    };
  }

  /**
   * Simulate transaction in worst/best/expected cases
   */
  private async simulateTransaction(tx: TransactionRequest): Promise<{
    worst_case: SimulationResult;
    best_case: SimulationResult;
    expected_case: SimulationResult;
  }> {
    const baseInput: SimulationInput = {
      chain_id: tx.chain_id,
      from_token: tx.token_in_address,
      to_token: tx.token_out_address,
      amount_in: tx.amount_in,
      dex: tx.dex || 'uniswap-v3',
      gas_price_gwei: tx.gas_price_gwei || this.NETWORK_AVG_GAS_PRICE[tx.chain_id] || 50,
      liquidity_usd: tx.pool_liquidity_usd || 1000000,
      price_ratio: 1.0,
    };

    // Worst case: Maximum MEV attack
    const worstCase = await this.transactionSimulator.simulateSwap({
      ...baseInput,
      liquidity_usd: (tx.pool_liquidity_usd || 1000000) * 0.8, // 20% less liquidity
    });

    // Best case: No MEV attack
    const bestCase = await this.transactionSimulator.simulateSwap({
      ...baseInput,
      liquidity_usd: (tx.pool_liquidity_usd || 1000000) * 1.2, // 20% more liquidity
    });

    // Expected case: Average scenario
    const expectedCase = await this.transactionSimulator.simulateSwap(baseInput);

    return {
      worst_case: worstCase,
      best_case: bestCase,
      expected_case: expectedCase,
    };
  }

  /**
   * Calculate vulnerability score using VulnerabilityScorer
   */
  private async calculateVulnerabilityScore(
    tx: TransactionRequest,
    simulation: { worst_case: SimulationResult; best_case: SimulationResult; expected_case: SimulationResult }
  ): Promise<VulnerabilityScore> {
    const input: VulnerabilityInput = {
      amount_in_usd: tx.amount_in_usd,
      tx_value_usd: tx.amount_in_usd,
      slippage_tolerance_pct: tx.slippage_tolerance_pct,
      expected_price_impact_pct: simulation.expected_case.price_impact_pct || 0,
      pool_liquidity_usd: tx.pool_liquidity_usd || 1000000,
      pool_volume_24h_usd: tx.pool_volume_24h_usd || 500000,
      gas_price_gwei: tx.gas_price_gwei || this.NETWORK_AVG_GAS_PRICE[tx.chain_id] || 50,
      network_avg_gas_price_gwei: this.NETWORK_AVG_GAS_PRICE[tx.chain_id] || 50,
      mempool_pending_txs: 5000, // Mock data
      block_time_seconds: this.BLOCK_TIME_SECONDS[tx.chain_id] || 12,
      is_time_sensitive: tx.is_time_sensitive || false,
      use_private_mempool: tx.use_private_mempool || false,
      chain_id: tx.chain_id,
    };

    return this.vulnerabilityScorer.calculateVulnerability(input);
  }

  /**
   * Estimate MEV impact
   */
  private estimateImpact(
    tx: TransactionRequest,
    simulation: { worst_case: SimulationResult; best_case: SimulationResult; expected_case: SimulationResult },
    vulnerabilityScore: VulnerabilityScore
  ): { mev_loss_usd: number; slippage_pct: number; total_cost_usd: number } {
    // Calculate MEV loss as difference between best and worst case
    const bestCaseOutput = simulation.best_case.amount_out || 0;
    const worstCaseOutput = simulation.worst_case.amount_out || 0;
    const mevLossUsd = (bestCaseOutput - worstCaseOutput) * (tx.amount_in_usd / tx.amount_in);

    // Calculate slippage
    const slippagePct = simulation.expected_case.slippage_pct || 0;

    // Calculate total cost (gas + MEV loss + slippage)
    const gasCostUsd = simulation.expected_case.gas_cost_usd || 0;
    const slippageCostUsd = tx.amount_in_usd * (slippagePct / 100);
    const totalCostUsd = gasCostUsd + mevLossUsd + slippageCostUsd;

    return {
      mev_loss_usd: Math.max(0, mevLossUsd),
      slippage_pct: slippagePct,
      total_cost_usd: totalCostUsd,
    };
  }

  /**
   * Generate protection recommendations
   */
  private generateRecommendations(
    tx: TransactionRequest,
    vulnerabilityScore: VulnerabilityScore,
    estimatedImpact: { mev_loss_usd: number; slippage_pct: number; total_cost_usd: number }
  ): VulnerabilityAssessment['recommendations'] {
    const score = vulnerabilityScore.overall_score;

    // Recommended slippage (reduce if high risk)
    let recommendedSlippage = tx.slippage_tolerance_pct;
    if (score >= 60) {
      recommendedSlippage = Math.max(0.3, tx.slippage_tolerance_pct * 0.5);
    }

    // Recommended gas price (reduce if high frontrun risk)
    let recommendedGasPrice = tx.gas_price_gwei || this.NETWORK_AVG_GAS_PRICE[tx.chain_id] || 50;
    if (vulnerabilityScore.frontrun_risk >= 60) {
      recommendedGasPrice = recommendedGasPrice * 0.8;
    }

    // Use private mempool if critical or high risk
    const usePrivateMempool = score >= 70;

    // Use MEV protection RPC if high risk
    const useMevProtectionRpc = score >= 60;

    return {
      recommended_slippage: Math.round(recommendedSlippage * 100) / 100,
      recommended_gas_price: Math.round(recommendedGasPrice * 100) / 100,
      use_private_mempool: usePrivateMempool,
      use_mev_protection_rpc: useMevProtectionRpc,
    };
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    vulnerabilityScore: VulnerabilityScore,
    estimatedImpact: { mev_loss_usd: number; slippage_pct: number; total_cost_usd: number },
    recommendations: VulnerabilityAssessment['recommendations']
  ): string {
    const parts: string[] = [];

    // Overall assessment
    parts.push(`Transaction vulnerability: ${vulnerabilityScore.risk_category.toUpperCase()} (${Math.round(vulnerabilityScore.overall_score)}/100)`);

    // Estimated impact
    parts.push(`Estimated MEV loss: $${estimatedImpact.mev_loss_usd.toFixed(2)}, Total cost: $${estimatedImpact.total_cost_usd.toFixed(2)}`);

    // Recommendations
    if (recommendations.use_private_mempool) {
      parts.push('CRITICAL: Use private mempool (Flashbots, Eden Network) to protect this transaction');
    } else if (recommendations.use_mev_protection_rpc) {
      parts.push('Recommendation: Use MEV-protection RPC endpoint');
    }

    return parts.join('. ');
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const mevProtectionAnalyzer = MEVProtectionAnalyzer.getInstance();

