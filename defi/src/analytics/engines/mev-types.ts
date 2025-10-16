/**
 * MEV Detection Types
 * Story: 4.1.1 - MEV Opportunity Detection
 * 
 * Type definitions for MEV opportunity detection, analysis, and protection
 */

// ============================================================================
// Base MEV Types
// ============================================================================

export type MEVOpportunityType = 'sandwich' | 'frontrun' | 'backrun' | 'arbitrage' | 'liquidation';
export type MEVStatus = 'detected' | 'confirmed' | 'executed' | 'failed';
export type DetectionMethod = 'mempool' | 'block' | 'simulation' | 'pattern_matching' | 'ml_model';
export type RiskCategory = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// MEV Opportunity Interface
// ============================================================================

export interface MEVOpportunity {
  id?: string;
  
  // Opportunity Info
  opportunity_type: MEVOpportunityType;
  chain_id: string;
  block_number: number;
  timestamp: Date;
  
  // Transaction Details
  target_tx_hash?: string;
  mev_tx_hashes?: string[];
  
  // Tokens Involved
  token_addresses?: string[];
  token_symbols?: string[];
  
  // Protocol Info
  protocol_id?: string;
  protocol_name?: string;
  dex_name?: string;
  
  // Financial Metrics
  mev_profit_usd: number;
  victim_loss_usd?: number;
  gas_cost_usd?: number;
  net_profit_usd?: number;
  
  // MEV Bot Info
  bot_address?: string;
  bot_name?: string;
  bot_type?: string;
  
  // Detection Metadata
  detection_method: DetectionMethod;
  confidence_score: number; // 0-100
  
  // Status
  status: MEVStatus;
  
  // Timestamps
  created_at?: Date;
  updated_at?: Date;
}

// ============================================================================
// Sandwich Attack Types
// ============================================================================

export interface SandwichTransaction {
  tx_hash: string;
  wallet_address: string;
  token_in: string;
  token_out: string;
  amount_in: number;
  amount_out: number;
  gas_price: number;
  timestamp: Date;
  type: 'frontrun' | 'victim' | 'backrun';
}

export interface SandwichOpportunity extends MEVOpportunity {
  opportunity_type: 'sandwich';
  
  // Sandwich-specific fields
  frontrun_tx?: SandwichTransaction;
  victim_tx: SandwichTransaction;
  backrun_tx?: SandwichTransaction;
  
  // Metrics
  price_impact_pct: number;
  slippage_extracted_pct: number;
  victim_expected_output: number;
  victim_actual_output: number;
}

export interface SandwichDetectionResult {
  detected: boolean;
  opportunity?: SandwichOpportunity;
  confidence_score: number;
  evidence: {
    pattern_match: boolean;
    gas_price_ordering: boolean;
    token_pair_match: boolean;
    timing_match: boolean;
    profit_threshold_met: boolean;
  };
}

// ============================================================================
// Frontrunning Types
// ============================================================================

export interface FrontrunTransaction {
  tx_hash: string;
  wallet_address: string;
  token_address: string;
  amount: number;
  price: number;
  gas_price: number;
  timestamp: Date;
  estimated_price_impact: number;
}

export interface FrontrunOpportunity extends MEVOpportunity {
  opportunity_type: 'frontrun';
  
  // Frontrun-specific fields
  frontrun_tx: FrontrunTransaction;
  target_tx: FrontrunTransaction;
  
  // Metrics
  price_impact_pct: number;
  frontrun_profit_usd: number;
  target_value_usd: number;
}

export interface FrontrunDetectionResult {
  detected: boolean;
  opportunity?: FrontrunOpportunity;
  confidence_score: number;
  evidence: {
    high_value_target: boolean;
    significant_price_impact: boolean;
    gas_price_premium: boolean;
    timing_advantage: boolean;
    profit_threshold_met: boolean;
  };
}

// ============================================================================
// Backrunning Types
// ============================================================================

export interface BackrunTransaction {
  tx_hash: string;
  wallet_address: string;
  token_address: string;
  amount: number;
  price_before: number;
  price_after: number;
  timestamp: Date;
}

export interface BackrunOpportunity extends MEVOpportunity {
  opportunity_type: 'backrun';
  
  // Backrun-specific fields
  trigger_tx: BackrunTransaction;
  backrun_tx: BackrunTransaction;
  
  // Metrics
  price_movement_pct: number;
  backrun_profit_usd: number;
  trigger_value_usd: number;
}

export interface BackrunDetectionResult {
  detected: boolean;
  opportunity?: BackrunOpportunity;
  confidence_score: number;
  evidence: {
    price_movement_detected: boolean;
    timing_match: boolean;
    profit_threshold_met: boolean;
    liquidity_available: boolean;
  };
}

// ============================================================================
// Arbitrage Types
// ============================================================================

export interface DEXPrice {
  dex_name: string;
  token_address: string;
  price: number;
  liquidity_usd: number;
  timestamp: Date;
}

export interface ArbitrageRoute {
  buy_dex: string;
  sell_dex: string;
  token_address: string;
  buy_price: number;
  sell_price: number;
  price_difference_pct: number;
  estimated_profit_usd: number;
}

export interface ArbitrageOpportunity extends MEVOpportunity {
  opportunity_type: 'arbitrage';
  
  // Arbitrage-specific fields
  route: ArbitrageRoute;
  dex_prices: DEXPrice[];
  
  // Metrics
  price_difference_pct: number;
  gross_profit_usd: number;
  slippage_pct: number;
  execution_time_ms: number;
}

export interface ArbitrageDetectionResult {
  detected: boolean;
  opportunity?: ArbitrageOpportunity;
  confidence_score: number;
  evidence: {
    price_difference_threshold_met: boolean;
    liquidity_sufficient: boolean;
    profit_after_gas_positive: boolean;
    execution_feasible: boolean;
  };
}

// ============================================================================
// Liquidation Types
// ============================================================================

export interface LendingPosition {
  protocol_id: string;
  user_address: string;
  collateral_token: string;
  collateral_amount: number;
  collateral_value_usd: number;
  debt_token: string;
  debt_amount: number;
  debt_value_usd: number;
  health_factor: number;
  liquidation_threshold: number;
}

export interface LiquidationOpportunity extends MEVOpportunity {
  opportunity_type: 'liquidation';
  
  // Liquidation-specific fields
  position: LendingPosition;
  liquidation_amount: number;
  liquidation_bonus_pct: number;
  
  // Metrics
  health_factor: number;
  liquidation_profit_usd: number;
  collateral_seized_usd: number;
}

export interface LiquidationDetectionResult {
  detected: boolean;
  opportunity?: LiquidationOpportunity;
  confidence_score: number;
  evidence: {
    health_factor_below_threshold: boolean;
    liquidation_profitable: boolean;
    position_size_sufficient: boolean;
    protocol_supported: boolean;
  };
}

// ============================================================================
// Detection Engine Interfaces
// ============================================================================

export interface DetectionEngineConfig {
  enabled: boolean;
  min_profit_usd: number;
  min_confidence_score: number;
  max_gas_cost_usd: number;
  chains: string[];
}

export interface DetectionResult {
  detected: boolean;
  opportunities: MEVOpportunity[];
  total_profit_usd: number;
  detection_time_ms: number;
  errors?: string[];
}

// ============================================================================
// Profit Calculation Types
// ============================================================================

export interface ProfitCalculationInput {
  gross_profit_usd: number;
  gas_cost_usd: number;
  slippage_pct?: number;
  protocol_fees_usd?: number;
  other_costs_usd?: number;
}

export interface ProfitCalculationResult {
  gross_profit_usd: number;
  total_costs_usd: number;
  net_profit_usd: number;
  profit_margin_pct: number;
  roi_pct: number;
}

// ============================================================================
// Confidence Scoring Types
// ============================================================================

export interface ConfidenceFactors {
  pattern_strength: number; // 0-100
  historical_accuracy: number; // 0-100
  data_quality: number; // 0-100
  execution_feasibility: number; // 0-100
  risk_factors: number; // 0-100 (lower is better)
}

export interface ConfidenceScore {
  overall_score: number; // 0-100
  factors: ConfidenceFactors;
  explanation: string;
}

// ============================================================================
// Transaction Simulation Types
// ============================================================================

export interface SimulationInput {
  chain_id: string;
  token_in: string;
  token_out: string;
  amount_in: number;
  dex_name: string;
  slippage_tolerance_pct: number;
}

export interface SimulationResult {
  success: boolean;
  amount_out: number;
  price_impact_pct: number;
  gas_cost_usd: number;
  execution_time_ms: number;
  error?: string;
}

// ============================================================================
// MEV Bot Types
// ============================================================================

export interface MEVBot {
  id?: string;
  bot_address: string;
  chain_id: string;
  bot_name?: string;
  bot_type?: string;
  verified: boolean;
  
  // Performance Metrics
  total_mev_extracted: number;
  total_transactions: number;
  success_rate: number;
  avg_profit_per_tx: number;
  
  // Activity Metrics
  first_seen: Date;
  last_active?: Date;
  active_days: number;
  
  // Strategy Analysis
  preferred_opportunity_types?: MEVOpportunityType[];
  preferred_protocols?: string[];
  preferred_tokens?: string[];
  
  // Sophistication
  sophistication_score?: number;
  uses_flashbots: boolean;
  uses_private_mempool: boolean;
  
  created_at?: Date;
  updated_at?: Date;
}

