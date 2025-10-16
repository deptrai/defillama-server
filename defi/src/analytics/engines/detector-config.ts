/**
 * MEV Detector Configuration
 * Centralized configuration for all MEV detectors
 * 
 * Features:
 * - Dynamic thresholds based on market conditions
 * - Profitability tiers
 * - Adaptive confidence scoring
 * - Chain-specific parameters
 */

// ============================================================================
// Profitability Tiers
// ============================================================================

export enum ProfitTier {
  MICRO = 'micro',     // $10-50
  SMALL = 'small',     // $50-100
  MEDIUM = 'medium',   // $100-1000
  LARGE = 'large',     // $1000-10000
  WHALE = 'whale',     // $10000+
}

export interface ProfitTierConfig {
  min_usd: number;
  max_usd: number;
  min_confidence: number;
  priority: number;
}

export const PROFIT_TIERS: Record<ProfitTier, ProfitTierConfig> = {
  [ProfitTier.MICRO]: {
    min_usd: 10,
    max_usd: 50,
    min_confidence: 90, // High confidence required for small profits
    priority: 1,
  },
  [ProfitTier.SMALL]: {
    min_usd: 50,
    max_usd: 100,
    min_confidence: 85,
    priority: 2,
  },
  [ProfitTier.MEDIUM]: {
    min_usd: 100,
    max_usd: 1000,
    min_confidence: 75, // Standard confidence
    priority: 3,
  },
  [ProfitTier.LARGE]: {
    min_usd: 1000,
    max_usd: 10000,
    min_confidence: 65, // Lower confidence OK for large profits
    priority: 4,
  },
  [ProfitTier.WHALE]: {
    min_usd: 10000,
    max_usd: Infinity,
    min_confidence: 60, // Even lower confidence OK for whale opportunities
    priority: 5,
  },
};

// ============================================================================
// Network Congestion Levels
// ============================================================================

export enum NetworkCongestion {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  EXTREME = 'extreme',
}

export interface CongestionConfig {
  gas_price_gwei_threshold: number;
  gas_premium_multiplier: number;
  min_confidence_adjustment: number;
}

export const CONGESTION_CONFIGS: Record<NetworkCongestion, CongestionConfig> = {
  [NetworkCongestion.LOW]: {
    gas_price_gwei_threshold: 20,
    gas_premium_multiplier: 1.05, // 5% premium sufficient
    min_confidence_adjustment: 0, // No adjustment
  },
  [NetworkCongestion.NORMAL]: {
    gas_price_gwei_threshold: 50,
    gas_premium_multiplier: 1.15, // 15% premium needed
    min_confidence_adjustment: 0,
  },
  [NetworkCongestion.HIGH]: {
    gas_price_gwei_threshold: 100,
    gas_premium_multiplier: 1.30, // 30% premium needed
    min_confidence_adjustment: -5, // Slightly lower confidence OK
  },
  [NetworkCongestion.EXTREME]: {
    gas_price_gwei_threshold: 200,
    gas_premium_multiplier: 1.50, // 50% premium needed
    min_confidence_adjustment: -10, // Lower confidence OK
  },
};

// ============================================================================
// Chain-Specific Configurations
// ============================================================================

export interface ChainConfig {
  min_profit_usd: number;
  avg_block_time_seconds: number;
  avg_gas_price_gwei: number;
  typical_gas_cost_usd: number;
}

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    min_profit_usd: 10,
    avg_block_time_seconds: 12,
    avg_gas_price_gwei: 30,
    typical_gas_cost_usd: 15,
  },
  arbitrum: {
    min_profit_usd: 5, // Lower threshold for L2
    avg_block_time_seconds: 0.25,
    avg_gas_price_gwei: 0.1,
    typical_gas_cost_usd: 0.5,
  },
  optimism: {
    min_profit_usd: 5,
    avg_block_time_seconds: 2,
    avg_gas_price_gwei: 0.001,
    typical_gas_cost_usd: 0.3,
  },
  bsc: {
    min_profit_usd: 5,
    avg_block_time_seconds: 3,
    avg_gas_price_gwei: 5,
    typical_gas_cost_usd: 1,
  },
  polygon: {
    min_profit_usd: 5,
    avg_block_time_seconds: 2,
    avg_gas_price_gwei: 50,
    typical_gas_cost_usd: 0.5,
  },
};

// ============================================================================
// Detector-Specific Configurations
// ============================================================================

export interface DetectorConfig {
  enabled: boolean;
  min_profit_usd: number;
  min_confidence_score: number;
  max_timeframe_seconds: number;
  gas_price_premium_threshold: number;
}

export const SANDWICH_DETECTOR_CONFIG: DetectorConfig = {
  enabled: true,
  min_profit_usd: 10, // Lowered from 100
  min_confidence_score: 75,
  max_timeframe_seconds: 60,
  gas_price_premium_threshold: 1.15, // Increased from 1.1
};

export const FRONTRUN_DETECTOR_CONFIG: DetectorConfig = {
  enabled: true,
  min_profit_usd: 10, // Lowered from 100
  min_confidence_score: 75,
  max_timeframe_seconds: 30,
  gas_price_premium_threshold: 1.20, // Keep at 20%
};

export const ARBITRAGE_DETECTOR_CONFIG: DetectorConfig = {
  enabled: true,
  min_profit_usd: 10, // Lowered from 100
  min_confidence_score: 75,
  max_timeframe_seconds: 120,
  gas_price_premium_threshold: 1.10,
};

export const LIQUIDATION_DETECTOR_CONFIG: DetectorConfig = {
  enabled: true,
  min_profit_usd: 10, // Lowered from 100
  min_confidence_score: 75,
  max_timeframe_seconds: 300,
  gas_price_premium_threshold: 1.15,
};

export const BACKRUN_DETECTOR_CONFIG: DetectorConfig = {
  enabled: true,
  min_profit_usd: 10, // Lowered from 100
  min_confidence_score: 75,
  max_timeframe_seconds: 60,
  gas_price_premium_threshold: 1.10,
};

// ============================================================================
// Multi-Factor Confidence Weights
// ============================================================================

export interface ConfidenceWeights {
  gas_price_factor: number;
  timing_factor: number;
  volume_factor: number;
  liquidity_factor: number;
  historical_factor: number;
}

export const DEFAULT_CONFIDENCE_WEIGHTS: ConfidenceWeights = {
  gas_price_factor: 0.25,   // 25%
  timing_factor: 0.20,      // 20%
  volume_factor: 0.20,      // 20%
  liquidity_factor: 0.20,   // 20%
  historical_factor: 0.15,  // 15%
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get profit tier for a given profit amount
 */
export function getProfitTier(profitUsd: number): ProfitTier {
  if (profitUsd >= PROFIT_TIERS[ProfitTier.WHALE].min_usd) {
    return ProfitTier.WHALE;
  } else if (profitUsd >= PROFIT_TIERS[ProfitTier.LARGE].min_usd) {
    return ProfitTier.LARGE;
  } else if (profitUsd >= PROFIT_TIERS[ProfitTier.MEDIUM].min_usd) {
    return ProfitTier.MEDIUM;
  } else if (profitUsd >= PROFIT_TIERS[ProfitTier.SMALL].min_usd) {
    return ProfitTier.SMALL;
  } else {
    return ProfitTier.MICRO;
  }
}

/**
 * Get minimum confidence score for a profit tier
 */
export function getMinConfidenceForProfit(profitUsd: number): number {
  const tier = getProfitTier(profitUsd);
  return PROFIT_TIERS[tier].min_confidence;
}

/**
 * Determine network congestion level from gas price
 */
export function getNetworkCongestion(gasPriceGwei: number): NetworkCongestion {
  if (gasPriceGwei >= CONGESTION_CONFIGS[NetworkCongestion.EXTREME].gas_price_gwei_threshold) {
    return NetworkCongestion.EXTREME;
  } else if (gasPriceGwei >= CONGESTION_CONFIGS[NetworkCongestion.HIGH].gas_price_gwei_threshold) {
    return NetworkCongestion.HIGH;
  } else if (gasPriceGwei >= CONGESTION_CONFIGS[NetworkCongestion.NORMAL].gas_price_gwei_threshold) {
    return NetworkCongestion.NORMAL;
  } else {
    return NetworkCongestion.LOW;
  }
}

/**
 * Get gas premium multiplier for current network congestion
 */
export function getGasPremiumMultiplier(gasPriceGwei: number): number {
  const congestion = getNetworkCongestion(gasPriceGwei);
  return CONGESTION_CONFIGS[congestion].gas_premium_multiplier;
}

/**
 * Get adjusted minimum confidence based on network congestion
 */
export function getAdjustedMinConfidence(
  baseConfidence: number,
  gasPriceGwei: number
): number {
  const congestion = getNetworkCongestion(gasPriceGwei);
  const adjustment = CONGESTION_CONFIGS[congestion].min_confidence_adjustment;
  return Math.max(50, baseConfidence + adjustment); // Never go below 50%
}

/**
 * Get chain-specific configuration
 */
export function getChainConfig(chainId: string): ChainConfig {
  return CHAIN_CONFIGS[chainId] || CHAIN_CONFIGS.ethereum;
}

