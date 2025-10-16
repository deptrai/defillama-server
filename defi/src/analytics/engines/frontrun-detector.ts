/**
 * Frontrunning Detector Engine
 * Story: 4.1.1 - MEV Opportunity Detection
 * 
 * Detects frontrunning attacks by identifying:
 * 1. High-value target transactions
 * 2. Frontrun transactions with higher gas price
 * 3. Significant price impact (>1%)
 * 4. Profit extraction from price movement
 * 
 * Detection Algorithm:
 * - Monitor pending transactions
 * - Identify high-value swaps
 * - Detect transactions with elevated gas prices
 * - Calculate price impact and profit
 * - Score confidence based on evidence
 */

import { query } from '../db/connection';
import { BlockchainDataService } from '../services/blockchain-data-service';
import {
  FrontrunOpportunity,
  FrontrunDetectionResult,
  FrontrunTransaction,
  MEVStatus,
} from './mev-types';
import {
  FRONTRUN_DETECTOR_CONFIG,
  getMinConfidenceForProfit,
  getGasPremiumMultiplier,
  getChainConfig,
} from './detector-config';
import { EnhancedConfidenceScorer } from './enhanced-confidence-scorer';
import { DetectorAccuracyTracker } from '../services/detector-accuracy-tracker';

// ============================================================================
// Frontrun Detector
// ============================================================================

export class FrontrunDetector {
  private static instance: FrontrunDetector;
  private readonly DETECTOR_VERSION = 'v2.0.0'; // Updated version
  private blockchainDataService: BlockchainDataService;
  private confidenceScorer: EnhancedConfidenceScorer;
  private accuracyTracker: DetectorAccuracyTracker;

  // Detection thresholds (now using centralized config)
  private readonly MIN_PROFIT_USD = FRONTRUN_DETECTOR_CONFIG.min_profit_usd; // Lowered to $10
  private readonly MIN_TARGET_VALUE_USD = 10000; // Minimum target transaction value
  private readonly MIN_PRICE_IMPACT_PCT = 1.0; // Minimum 1% price impact
  private readonly MIN_CONFIDENCE_SCORE = FRONTRUN_DETECTOR_CONFIG.min_confidence_score;
  private readonly GAS_PRICE_PREMIUM_THRESHOLD = FRONTRUN_DETECTOR_CONFIG.gas_price_premium_threshold; // 20%

  private constructor() {
    this.blockchainDataService = BlockchainDataService.getInstance();
    this.confidenceScorer = EnhancedConfidenceScorer.getInstance();
    this.accuracyTracker = DetectorAccuracyTracker.getInstance();
  }

  public static getInstance(): FrontrunDetector {
    if (!FrontrunDetector.instance) {
      FrontrunDetector.instance = new FrontrunDetector();
    }
    return FrontrunDetector.instance;
  }

  /**
   * Main detection method
   */
  public async detectFrontrunning(
    chainId: string = 'ethereum',
    blockNumber?: number
  ): Promise<FrontrunDetectionResult[]> {
    try {
      const startTime = Date.now();

      // Get pending transactions (mock data for now)
      const transactions = await this.getPendingTransactions(chainId, blockNumber);

      // Identify high-value targets
      const targets = this.identifyHighValueTargets(transactions);

      // Detect frontrun opportunities
      const results: FrontrunDetectionResult[] = [];
      for (const target of targets) {
        const frontrunners = this.findFrontrunners(target, transactions);
        
        for (const frontrunner of frontrunners) {
          const result = await this.createDetectionResult(frontrunner, target, chainId);
          
          if (result.detected && result.confidence_score >= this.MIN_CONFIDENCE_SCORE) {
            results.push(result);
            
            // Store in database
            if (result.opportunity) {
              await this.storeOpportunity(result.opportunity);
            }
          }
        }
      }

      const detectionTime = Date.now() - startTime;
      console.log(`Frontrun detection completed in ${detectionTime}ms. Found ${results.length} opportunities.`);

      return results;
    } catch (error) {
      console.error('Error detecting frontrunning:', error);
      throw error;
    }
  }

  /**
   * Get pending transactions from mempool
   * TODO: Replace with real mempool monitoring
   */
  private async getPendingTransactions(
    chainId: string,
    blockNumber?: number
  ): Promise<FrontrunTransaction[]> {
    // Mock data for now
    const mockTransactions: FrontrunTransaction[] = [
      {
        tx_hash: '0xfrontrun123',
        wallet_address: '0xbot1',
        token_address: '0xUNI',
        amount: 50000,
        price: 6.5,
        gas_price: 180, // High gas price
        timestamp: new Date('2025-10-16T10:00:00Z'),
        estimated_price_impact: 1.8,
      },
      {
        tx_hash: '0xtarget456',
        wallet_address: '0xuser1',
        token_address: '0xUNI',
        amount: 100000,
        price: 6.5,
        gas_price: 120, // Normal gas price
        timestamp: new Date('2025-10-16T10:00:02Z'),
        estimated_price_impact: 2.5,
      },
    ];

    return mockTransactions;
  }

  /**
   * Identify high-value target transactions
   */
  private identifyHighValueTargets(
    transactions: FrontrunTransaction[]
  ): FrontrunTransaction[] {
    return transactions.filter(tx => {
      const value = tx.amount * tx.price;
      return value >= this.MIN_TARGET_VALUE_USD &&
             tx.estimated_price_impact >= this.MIN_PRICE_IMPACT_PCT;
    });
  }

  /**
   * Find potential frontrunners for a target transaction
   */
  private findFrontrunners(
    target: FrontrunTransaction,
    transactions: FrontrunTransaction[]
  ): FrontrunTransaction[] {
    return transactions.filter(tx => {
      // Different wallet
      if (tx.wallet_address === target.wallet_address) return false;

      // Same token
      if (tx.token_address !== target.token_address) return false;

      // Higher gas price
      if (tx.gas_price < target.gas_price * this.GAS_PRICE_PREMIUM_THRESHOLD) return false;

      // Earlier timestamp
      if (tx.timestamp >= target.timestamp) return false;

      // Within reasonable timeframe (< 30 seconds before)
      const timeDiff = (target.timestamp.getTime() - tx.timestamp.getTime()) / 1000;
      if (timeDiff > 30) return false;

      return true;
    });
  }

  /**
   * Calculate profit from frontrunning
   */
  private calculateProfit(
    frontrun: FrontrunTransaction,
    target: FrontrunTransaction
  ): number {
    // Profit from price impact
    const priceIncrease = target.price * (target.estimated_price_impact / 100);
    const grossProfit = frontrun.amount * priceIncrease;

    // Estimate gas costs
    const gasCost = frontrun.gas_price * 0.000021 * 2000; // ~$2000/ETH

    return grossProfit - gasCost;
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(
    frontrun: FrontrunTransaction,
    target: FrontrunTransaction,
    profit: number
  ): number {
    let score = 0;

    // High-value target (25 points)
    const targetValue = target.amount * target.price;
    if (targetValue > 100000) score += 25;
    else if (targetValue > 50000) score += 20;
    else if (targetValue > 10000) score += 15;

    // Significant price impact (25 points)
    if (target.estimated_price_impact > 5) score += 25;
    else if (target.estimated_price_impact > 3) score += 20;
    else if (target.estimated_price_impact > 1) score += 15;

    // Gas price premium (20 points)
    const gasPremium = frontrun.gas_price / target.gas_price;
    if (gasPremium > 1.5) score += 20;
    else if (gasPremium > 1.3) score += 15;
    else if (gasPremium > 1.2) score += 10;

    // Timing advantage (15 points)
    const timeDiff = (target.timestamp.getTime() - frontrun.timestamp.getTime()) / 1000;
    if (timeDiff < 10) score += 15;
    else if (timeDiff < 20) score += 10;
    else if (timeDiff < 30) score += 5;

    // Profit threshold (15 points)
    if (profit > 5000) score += 15;
    else if (profit > 1000) score += 10;
    else if (profit > 100) score += 5;

    return Math.min(100, score);
  }

  /**
   * Create detection result
   */
  private async createDetectionResult(
    frontrun: FrontrunTransaction,
    target: FrontrunTransaction,
    chainId: string
  ): Promise<FrontrunDetectionResult> {
    const profit = this.calculateProfit(frontrun, target);
    const confidence = this.calculateConfidence(frontrun, target, profit);

    const opportunity: FrontrunOpportunity = {
      opportunity_type: 'frontrun',
      chain_id: chainId,
      block_number: 18500000, // Mock
      timestamp: frontrun.timestamp,

      target_tx_hash: target.tx_hash,
      mev_tx_hashes: [frontrun.tx_hash],

      token_addresses: [frontrun.token_address],
      token_symbols: ['UNI'], // Mock

      protocol_id: 'uniswap-v3',
      protocol_name: 'Uniswap V3',
      dex_name: 'Uniswap V3',

      mev_profit_usd: profit,
      victim_loss_usd: profit * 0.6, // Estimate
      gas_cost_usd: frontrun.gas_price * 0.000021 * 2000,
      net_profit_usd: profit - (frontrun.gas_price * 0.000021 * 2000),

      bot_address: frontrun.wallet_address,
      bot_name: 'frontrun_bot',
      bot_type: 'frontrun_bot',

      detection_method: 'price_impact_estimation',
      confidence_score: confidence,

      status: 'detected' as MEVStatus,

      // Frontrun-specific
      frontrun_tx: frontrun,
      target_tx: target,
      price_impact_pct: target.estimated_price_impact,
      frontrun_profit_usd: profit,
      target_value_usd: target.amount * target.price,
    };

    const targetValue = target.amount * target.price;

    return {
      detected: profit >= this.MIN_PROFIT_USD,
      opportunity,
      confidence_score: confidence,
      evidence: {
        high_value_target: targetValue >= this.MIN_TARGET_VALUE_USD,
        significant_price_impact: target.estimated_price_impact >= this.MIN_PRICE_IMPACT_PCT,
        gas_price_premium: frontrun.gas_price >= target.gas_price * this.GAS_PRICE_PREMIUM_THRESHOLD,
        timing_advantage: (target.timestamp.getTime() - frontrun.timestamp.getTime()) / 1000 < 30,
        profit_threshold_met: profit >= this.MIN_PROFIT_USD,
      },
    };
  }

  /**
   * Store opportunity in database
   */
  private async storeOpportunity(opportunity: FrontrunOpportunity): Promise<void> {
    const sql = `
      INSERT INTO mev_opportunities (
        opportunity_type, chain_id, block_number, timestamp,
        target_tx_hash, mev_tx_hashes, token_addresses, token_symbols,
        protocol_id, protocol_name, dex_name,
        mev_profit_usd, victim_loss_usd, gas_cost_usd, net_profit_usd,
        bot_address, bot_name, bot_type,
        detection_method, confidence_score, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING id
    `;

    const values = [
      opportunity.opportunity_type,
      opportunity.chain_id,
      opportunity.block_number,
      opportunity.timestamp,
      opportunity.target_tx_hash,
      opportunity.mev_tx_hashes,
      opportunity.token_addresses,
      opportunity.token_symbols,
      opportunity.protocol_id,
      opportunity.protocol_name,
      opportunity.dex_name,
      opportunity.mev_profit_usd,
      opportunity.victim_loss_usd,
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

