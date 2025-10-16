/**
 * Backrun Detector Engine
 * Story: 4.1.1 - MEV Opportunity Detection
 * 
 * Detects backrunning opportunities by:
 * 1. Monitoring high-impact transactions
 * 2. Detecting price movements after transactions
 * 3. Identifying profit opportunities from price changes
 * 4. Verifying liquidity availability
 * 
 * Detection Algorithm:
 * - Monitor completed transactions
 * - Detect significant price movements (>1%)
 * - Identify backrun opportunities
 * - Calculate profit from price arbitrage
 * - Score confidence based on timing and liquidity
 */

import { query } from '../db/connection';
import { BlockchainDataService } from '../services/blockchain-data-service';
import {
  BackrunOpportunity,
  BackrunDetectionResult,
  BackrunTransaction,
  MEVStatus,
} from './mev-types';

// ============================================================================
// Backrun Detector
// ============================================================================

export class BackrunDetector {
  private static instance: BackrunDetector;
  private readonly DETECTOR_VERSION = 'v1.0.0';
  private blockchainDataService: BlockchainDataService;

  // Detection thresholds
  private readonly MIN_PROFIT_USD = 100;
  private readonly MIN_PRICE_MOVEMENT_PCT = 1.0; // Minimum 1% price movement
  private readonly MAX_TIMING_SECONDS = 30; // Max time after trigger transaction
  private readonly MIN_LIQUIDITY_USD = 10000; // Minimum liquidity required
  private readonly MIN_CONFIDENCE_SCORE = 75;

  private constructor() {
    this.blockchainDataService = BlockchainDataService.getInstance();
  }

  public static getInstance(): BackrunDetector {
    if (!BackrunDetector.instance) {
      BackrunDetector.instance = new BackrunDetector();
    }
    return BackrunDetector.instance;
  }

  /**
   * Main detection method
   */
  public async detectBackrunning(
    chainId: string = 'ethereum',
    blockNumber?: number
  ): Promise<BackrunDetectionResult[]> {
    try {
      const startTime = Date.now();

      // Get recent transactions (mock data for now)
      const transactions = await this.getRecentTransactions(chainId, blockNumber);

      // Identify trigger transactions (high-impact)
      const triggers = this.identifyTriggerTransactions(transactions);

      // Find backrun opportunities
      const results: BackrunDetectionResult[] = [];
      for (const trigger of triggers) {
        const backrunners = this.findBackrunOpportunities(trigger, transactions);
        
        for (const backrunner of backrunners) {
          const result = await this.createDetectionResult(trigger, backrunner, chainId);
          
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
      console.log(`Backrun detection completed in ${detectionTime}ms. Found ${results.length} opportunities.`);

      return results;
    } catch (error) {
      console.error('Error detecting backrunning:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions
   * TODO: Replace with real blockchain data
   */
  private async getRecentTransactions(
    chainId: string,
    blockNumber?: number
  ): Promise<BackrunTransaction[]> {
    // Mock data for now
    const mockTransactions: BackrunTransaction[] = [
      {
        tx_hash: '0xtrigger123',
        wallet_address: '0xuser1',
        token_address: '0xUNI',
        amount: 100000,
        price_before: 6.5,
        price_after: 6.63, // 2% increase
        timestamp: new Date('2025-10-16T10:00:00Z'),
      },
      {
        tx_hash: '0xbackrun456',
        wallet_address: '0xbot1',
        token_address: '0xUNI',
        amount: 50000,
        price_before: 6.63,
        price_after: 6.60, // Profit from selling
        timestamp: new Date('2025-10-16T10:00:05Z'),
      },
    ];

    return mockTransactions;
  }

  /**
   * Identify trigger transactions (high-impact)
   */
  private identifyTriggerTransactions(
    transactions: BackrunTransaction[]
  ): BackrunTransaction[] {
    return transactions.filter(tx => {
      const priceMovement = ((tx.price_after - tx.price_before) / tx.price_before) * 100;
      return Math.abs(priceMovement) >= this.MIN_PRICE_MOVEMENT_PCT;
    });
  }

  /**
   * Find backrun opportunities for a trigger transaction
   */
  private findBackrunOpportunities(
    trigger: BackrunTransaction,
    transactions: BackrunTransaction[]
  ): BackrunTransaction[] {
    return transactions.filter(tx => {
      // Different wallet
      if (tx.wallet_address === trigger.wallet_address) return false;

      // Same token
      if (tx.token_address !== trigger.token_address) return false;

      // After trigger
      if (tx.timestamp <= trigger.timestamp) return false;

      // Within timing window
      const timeDiff = (tx.timestamp.getTime() - trigger.timestamp.getTime()) / 1000;
      if (timeDiff > this.MAX_TIMING_SECONDS) return false;

      // Price movement detected
      const priceMovement = ((tx.price_after - tx.price_before) / tx.price_before) * 100;
      if (Math.abs(priceMovement) < 0.5) return false;

      return true;
    });
  }

  /**
   * Calculate profit from backrunning
   */
  private calculateProfit(
    trigger: BackrunTransaction,
    backrun: BackrunTransaction
  ): number {
    // Profit from price movement
    const priceChange = backrun.price_after - backrun.price_before;
    const grossProfit = backrun.amount * Math.abs(priceChange);

    // Estimate gas costs
    const gasCost = 150 * 0.000021 * 2000; // ~$63

    return grossProfit - gasCost;
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(
    trigger: BackrunTransaction,
    backrun: BackrunTransaction,
    profit: number
  ): number {
    let score = 0;

    // Price movement detected (30 points)
    const triggerMovement = Math.abs(((trigger.price_after - trigger.price_before) / trigger.price_before) * 100);
    if (triggerMovement > 5) score += 30;
    else if (triggerMovement > 3) score += 25;
    else if (triggerMovement > 1) score += 20;

    // Timing match (25 points)
    const timeDiff = (backrun.timestamp.getTime() - trigger.timestamp.getTime()) / 1000;
    if (timeDiff < 10) score += 25;
    else if (timeDiff < 20) score += 20;
    else if (timeDiff < 30) score += 15;

    // Profit threshold met (25 points)
    if (profit > 1000) score += 25;
    else if (profit > 500) score += 20;
    else if (profit > 100) score += 15;

    // Liquidity available (20 points)
    const triggerValue = trigger.amount * trigger.price_before;
    if (triggerValue > 100000) score += 20;
    else if (triggerValue > 50000) score += 15;
    else if (triggerValue > 10000) score += 10;

    return Math.min(100, score);
  }

  /**
   * Create detection result
   */
  private async createDetectionResult(
    trigger: BackrunTransaction,
    backrun: BackrunTransaction,
    chainId: string
  ): Promise<BackrunDetectionResult> {
    const profit = this.calculateProfit(trigger, backrun);
    const confidence = this.calculateConfidence(trigger, backrun, profit);

    const priceMovement = ((trigger.price_after - trigger.price_before) / trigger.price_before) * 100;
    const triggerValue = trigger.amount * trigger.price_before;

    const opportunity: BackrunOpportunity = {
      opportunity_type: 'backrun',
      chain_id: chainId,
      block_number: 18500000, // Mock
      timestamp: backrun.timestamp,

      target_tx_hash: trigger.tx_hash,
      mev_tx_hashes: [backrun.tx_hash],

      token_addresses: [backrun.token_address],
      token_symbols: ['UNI'], // Mock

      protocol_id: 'uniswap-v3',
      protocol_name: 'Uniswap V3',
      dex_name: 'Uniswap V3',

      mev_profit_usd: profit,
      gas_cost_usd: 63, // Estimated
      net_profit_usd: profit - 63,

      bot_address: backrun.wallet_address,
      bot_name: 'backrun_bot',
      bot_type: 'backrun_bot',

      detection_method: 'post_transaction_opportunity',
      confidence_score: confidence,

      status: 'detected' as MEVStatus,

      // Backrun-specific
      trigger_tx: trigger,
      backrun_tx: backrun,
      price_movement_pct: priceMovement,
      backrun_profit_usd: profit,
      trigger_value_usd: triggerValue,
    };

    return {
      detected: profit >= this.MIN_PROFIT_USD,
      opportunity,
      confidence_score: confidence,
      evidence: {
        price_movement_detected: Math.abs(priceMovement) >= this.MIN_PRICE_MOVEMENT_PCT,
        timing_match: (backrun.timestamp.getTime() - trigger.timestamp.getTime()) / 1000 <= this.MAX_TIMING_SECONDS,
        profit_threshold_met: profit >= this.MIN_PROFIT_USD,
        liquidity_available: triggerValue >= this.MIN_LIQUIDITY_USD,
      },
    };
  }

  /**
   * Store opportunity in database
   */
  private async storeOpportunity(opportunity: BackrunOpportunity): Promise<void> {
    const sql = `
      INSERT INTO mev_opportunities (
        opportunity_type, chain_id, block_number, timestamp,
        target_tx_hash, mev_tx_hashes, token_addresses, token_symbols,
        protocol_id, protocol_name, dex_name,
        mev_profit_usd, gas_cost_usd, net_profit_usd,
        bot_address, bot_name, bot_type,
        detection_method, confidence_score, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
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

