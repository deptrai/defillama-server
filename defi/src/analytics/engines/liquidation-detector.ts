/**
 * Liquidation Detector Engine
 * Story: 4.1.1 - MEV Opportunity Detection
 * 
 * Detects liquidation opportunities by:
 * 1. Monitoring lending protocol positions (Aave, Compound, MakerDAO)
 * 2. Calculating health factors
 * 3. Identifying positions below liquidation threshold
 * 4. Estimating liquidation profit (bonus + collateral)
 * 
 * Detection Algorithm:
 * - Monitor lending positions
 * - Calculate health factor = (collateral * liquidation_threshold) / debt
 * - Identify positions with health_factor < 1.0
 * - Calculate liquidation profit (liquidation bonus)
 * - Score confidence based on position size and protocol
 */

import { query } from '../db/connection';
import { BlockchainDataService } from '../services/blockchain-data-service';
import {
  LiquidationOpportunity,
  LiquidationDetectionResult,
  LendingPosition,
  MEVStatus,
} from './mev-types';
import {
  LIQUIDATION_DETECTOR_CONFIG,
  getMinConfidenceForProfit,
  getChainConfig,
} from './detector-config';
import { EnhancedConfidenceScorer } from './enhanced-confidence-scorer';
import { DetectorAccuracyTracker } from '../services/detector-accuracy-tracker';

// ============================================================================
// Liquidation Detector
// ============================================================================

export class LiquidationDetector {
  private static instance: LiquidationDetector;
  private readonly DETECTOR_VERSION = 'v2.0.0'; // Updated version
  private blockchainDataService: BlockchainDataService;
  private confidenceScorer: EnhancedConfidenceScorer;
  private accuracyTracker: DetectorAccuracyTracker;

  // Detection thresholds (now using centralized config)
  private readonly MIN_PROFIT_USD = LIQUIDATION_DETECTOR_CONFIG.min_profit_usd; // Lowered to $10
  private readonly HEALTH_FACTOR_THRESHOLD = 1.0; // Below 1.0 = liquidatable
  private readonly MIN_POSITION_SIZE_USD = 1000; // Minimum position size
  private readonly MIN_CONFIDENCE_SCORE = LIQUIDATION_DETECTOR_CONFIG.min_confidence_score;

  // Protocol configurations
  private readonly SUPPORTED_PROTOCOLS = {
    'aave-v3': { liquidation_bonus: 0.05, liquidation_threshold: 0.85 },
    'compound-v3': { liquidation_bonus: 0.08, liquidation_threshold: 0.80 },
    'makerdao': { liquidation_bonus: 0.13, liquidation_threshold: 0.75 },
  };

  private constructor() {
    this.blockchainDataService = BlockchainDataService.getInstance();
    this.confidenceScorer = EnhancedConfidenceScorer.getInstance();
    this.accuracyTracker = DetectorAccuracyTracker.getInstance();
  }

  public static getInstance(): LiquidationDetector {
    if (!LiquidationDetector.instance) {
      LiquidationDetector.instance = new LiquidationDetector();
    }
    return LiquidationDetector.instance;
  }

  /**
   * Main detection method
   */
  public async detectLiquidations(
    chainId: string = 'ethereum',
    protocolId?: string
  ): Promise<LiquidationDetectionResult[]> {
    try {
      const startTime = Date.now();

      // Get lending positions (mock data for now)
      const positions = await this.getLendingPositions(chainId, protocolId);

      // Identify liquidatable positions
      const liquidatablePositions = this.identifyLiquidatablePositions(positions);

      // Create detection results
      const results: LiquidationDetectionResult[] = [];
      for (const position of liquidatablePositions) {
        const result = await this.createDetectionResult(position, chainId);
        
        if (result.detected && result.confidence_score >= this.MIN_CONFIDENCE_SCORE) {
          results.push(result);
          
          // Store in database
          if (result.opportunity) {
            await this.storeOpportunity(result.opportunity);
          }
        }
      }

      const detectionTime = Date.now() - startTime;
      console.log(`Liquidation detection completed in ${detectionTime}ms. Found ${results.length} opportunities.`);

      return results;
    } catch (error) {
      console.error('Error detecting liquidations:', error);
      throw error;
    }
  }

  /**
   * Get lending positions from protocols
   * TODO: Replace with real protocol data
   */
  private async getLendingPositions(
    chainId: string,
    protocolId?: string
  ): Promise<LendingPosition[]> {
    // Mock data for now
    const mockPositions: LendingPosition[] = [
      {
        protocol_id: 'aave-v3',
        user_address: '0xuser1',
        collateral_token: '0xWETH',
        collateral_amount: 10,
        collateral_value_usd: 20000,
        debt_token: '0xUSDC',
        debt_amount: 18000,
        debt_value_usd: 18000,
        health_factor: 0.94, // Below 1.0 = liquidatable
        liquidation_threshold: 0.85,
      },
      {
        protocol_id: 'compound-v3',
        user_address: '0xuser2',
        collateral_token: '0xWBTC',
        collateral_amount: 0.5,
        collateral_value_usd: 25000,
        debt_token: '0xDAI',
        debt_amount: 22000,
        debt_value_usd: 22000,
        health_factor: 0.91, // Below 1.0 = liquidatable
        liquidation_threshold: 0.80,
      },
    ];

    return mockPositions;
  }

  /**
   * Identify positions that can be liquidated
   */
  private identifyLiquidatablePositions(
    positions: LendingPosition[]
  ): LendingPosition[] {
    return positions.filter(position => {
      // Health factor below threshold
      if (position.health_factor >= this.HEALTH_FACTOR_THRESHOLD) return false;

      // Position size sufficient
      if (position.collateral_value_usd < this.MIN_POSITION_SIZE_USD) return false;

      // Protocol supported
      if (!this.SUPPORTED_PROTOCOLS[position.protocol_id as keyof typeof this.SUPPORTED_PROTOCOLS]) return false;

      return true;
    });
  }

  /**
   * Calculate liquidation profit
   */
  private calculateLiquidationProfit(position: LendingPosition): number {
    const protocolConfig = this.SUPPORTED_PROTOCOLS[position.protocol_id as keyof typeof this.SUPPORTED_PROTOCOLS];
    if (!protocolConfig) return 0;

    // Liquidation amount (typically 50% of debt)
    const liquidationAmount = position.debt_value_usd * 0.5;

    // Liquidation bonus
    const bonus = liquidationAmount * protocolConfig.liquidation_bonus;

    // Estimate gas costs
    const gasCost = 150 * 0.000021 * 2000; // ~$63

    return bonus - gasCost;
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(
    position: LendingPosition,
    profit: number
  ): number {
    let score = 0;

    // Health factor below threshold (30 points)
    if (position.health_factor < 0.9) score += 30;
    else if (position.health_factor < 0.95) score += 25;
    else if (position.health_factor < 1.0) score += 20;

    // Liquidation profitable (25 points)
    if (profit > 1000) score += 25;
    else if (profit > 500) score += 20;
    else if (profit > 100) score += 15;

    // Position size sufficient (25 points)
    if (position.collateral_value_usd > 50000) score += 25;
    else if (position.collateral_value_usd > 10000) score += 20;
    else if (position.collateral_value_usd > 1000) score += 15;

    // Protocol supported (20 points)
    if (this.SUPPORTED_PROTOCOLS[position.protocol_id as keyof typeof this.SUPPORTED_PROTOCOLS]) {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * Create detection result
   */
  private async createDetectionResult(
    position: LendingPosition,
    chainId: string
  ): Promise<LiquidationDetectionResult> {
    const profit = this.calculateLiquidationProfit(position);
    const confidence = this.calculateConfidence(position, profit);

    const protocolConfig = this.SUPPORTED_PROTOCOLS[position.protocol_id as keyof typeof this.SUPPORTED_PROTOCOLS];
    const liquidationAmount = position.debt_value_usd * 0.5;
    const collateralSeized = liquidationAmount * (1 + protocolConfig.liquidation_bonus);

    const opportunity: LiquidationOpportunity = {
      opportunity_type: 'liquidation',
      chain_id: chainId,
      block_number: 18500000, // Mock
      timestamp: new Date(),

      mev_tx_hashes: [], // Will be filled when executed

      token_addresses: [position.collateral_token, position.debt_token],
      token_symbols: ['WETH', 'USDC'], // Mock

      protocol_id: position.protocol_id,
      protocol_name: position.protocol_id === 'aave-v3' ? 'Aave V3' : 
                     position.protocol_id === 'compound-v3' ? 'Compound V3' : 'MakerDAO',

      mev_profit_usd: profit,
      gas_cost_usd: 63, // Estimated
      net_profit_usd: profit - 63,

      bot_address: '0xliquidator_bot',
      bot_name: 'liquidation_bot',
      bot_type: 'liquidation_bot',

      detection_method: 'health_factor_monitoring',
      confidence_score: confidence,

      status: 'detected' as MEVStatus,

      // Liquidation-specific
      position,
      liquidation_amount: liquidationAmount,
      liquidation_bonus_pct: protocolConfig.liquidation_bonus * 100,
      health_factor: position.health_factor,
      liquidation_profit_usd: profit,
      collateral_seized_usd: collateralSeized,
    };

    return {
      detected: profit >= this.MIN_PROFIT_USD,
      opportunity,
      confidence_score: confidence,
      evidence: {
        health_factor_below_threshold: position.health_factor < this.HEALTH_FACTOR_THRESHOLD,
        liquidation_profitable: profit >= this.MIN_PROFIT_USD,
        position_size_sufficient: position.collateral_value_usd >= this.MIN_POSITION_SIZE_USD,
        protocol_supported: !!this.SUPPORTED_PROTOCOLS[position.protocol_id as keyof typeof this.SUPPORTED_PROTOCOLS],
      },
    };
  }

  /**
   * Store opportunity in database
   */
  private async storeOpportunity(opportunity: LiquidationOpportunity): Promise<void> {
    const sql = `
      INSERT INTO mev_opportunities (
        opportunity_type, chain_id, block_number, timestamp,
        mev_tx_hashes, token_addresses, token_symbols,
        protocol_id, protocol_name,
        mev_profit_usd, gas_cost_usd, net_profit_usd,
        bot_address, bot_name, bot_type,
        detection_method, confidence_score, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING id
    `;

    const values = [
      opportunity.opportunity_type,
      opportunity.chain_id,
      opportunity.block_number,
      opportunity.timestamp,
      opportunity.mev_tx_hashes,
      opportunity.token_addresses,
      opportunity.token_symbols,
      opportunity.protocol_id,
      opportunity.protocol_name,
      opportunity.mev_profit_usd,
      opportunity.gas_cost_usd,
      opportunity.net_profit_usd,
      opportunity.bot_address,
      opportunity.bot_name,
      opportunity.bot_type,
      opportunity.detection_method,
      opportunity.confidence_score,
      opportunity.status,
    ];

    await query(sql, values);
  }
}

