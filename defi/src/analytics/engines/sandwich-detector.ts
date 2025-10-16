/**
 * Sandwich Attack Detector Engine
 * Story: 4.1.1 - MEV Opportunity Detection
 * 
 * Detects sandwich attacks by identifying the pattern:
 * 1. Frontrun transaction (buy before victim)
 * 2. Victim transaction (target)
 * 3. Backrun transaction (sell after victim)
 * 
 * Detection Algorithm:
 * - Group transactions by token pair
 * - Sort by gas price (frontrun has higher gas)
 * - Identify Buy → Victim → Sell pattern
 * - Calculate profit and confidence score
 */

import { query } from '../db/connection';
import { BlockchainDataService } from '../services/blockchain-data-service';
import {
  SandwichOpportunity,
  SandwichDetectionResult,
  SandwichTransaction,
  MEVStatus,
} from './mev-types';
import {
  SANDWICH_DETECTOR_CONFIG,
  getMinConfidenceForProfit,
  getGasPremiumMultiplier,
  getChainConfig,
} from './detector-config';
import { EnhancedConfidenceScorer, MultiFactorConfidenceInput } from './enhanced-confidence-scorer';
import { DetectorAccuracyTracker } from '../services/detector-accuracy-tracker';

// ============================================================================
// Types
// ============================================================================

interface TransactionGroup {
  token_pair: string;
  transactions: SandwichTransaction[];
  timeframe_seconds: number;
}

interface SandwichPattern {
  frontrun: SandwichTransaction;
  victim: SandwichTransaction;
  backrun: SandwichTransaction;
  profit_usd: number;
  confidence: number;
}

// ============================================================================
// Sandwich Detector
// ============================================================================

export class SandwichDetector {
  private static instance: SandwichDetector;
  private readonly DETECTOR_VERSION = 'v2.0.0'; // Updated version
  private blockchainDataService: BlockchainDataService;
  private confidenceScorer: EnhancedConfidenceScorer;
  private accuracyTracker: DetectorAccuracyTracker;

  // Detection thresholds (now using centralized config)
  private readonly MIN_PROFIT_USD = SANDWICH_DETECTOR_CONFIG.min_profit_usd; // Lowered to $10
  private readonly MAX_TIMEFRAME_SECONDS = SANDWICH_DETECTOR_CONFIG.max_timeframe_seconds;
  private readonly MIN_CONFIDENCE_SCORE = SANDWICH_DETECTOR_CONFIG.min_confidence_score;
  private readonly GAS_PRICE_PREMIUM_THRESHOLD = SANDWICH_DETECTOR_CONFIG.gas_price_premium_threshold; // Increased to 15%

  private constructor() {
    this.blockchainDataService = BlockchainDataService.getInstance();
    this.confidenceScorer = EnhancedConfidenceScorer.getInstance();
    this.accuracyTracker = DetectorAccuracyTracker.getInstance();
  }

  public static getInstance(): SandwichDetector {
    if (!SandwichDetector.instance) {
      SandwichDetector.instance = new SandwichDetector();
    }
    return SandwichDetector.instance;
  }

  /**
   * Main detection method
   * Analyzes recent transactions to detect sandwich attacks
   */
  public async detectSandwichAttacks(
    chainId: string = 'ethereum',
    blockNumber?: number
  ): Promise<SandwichDetectionResult[]> {
    try {
      const startTime = Date.now();

      // Get recent transactions (mock data for now)
      const transactions = await this.getRecentTransactions(chainId, blockNumber);

      // Group transactions by token pair
      const groups = this.groupTransactionsByTokenPair(transactions);

      // Detect sandwich patterns in each group
      const results: SandwichDetectionResult[] = [];
      for (const group of groups) {
        const patterns = this.detectPatternsInGroup(group);
        for (const pattern of patterns) {
          const result = await this.createDetectionResult(pattern, chainId);
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
      console.log(`Sandwich detection completed in ${detectionTime}ms. Found ${results.length} opportunities.`);

      return results;
    } catch (error) {
      console.error('Error detecting sandwich attacks:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions from blockchain
   * TODO: Replace with real mempool monitoring
   */
  private async getRecentTransactions(
    chainId: string,
    blockNumber?: number
  ): Promise<SandwichTransaction[]> {
    // Mock data for now - will be replaced with real mempool monitoring
    const mockTransactions: SandwichTransaction[] = [
      {
        tx_hash: '0xfrontrun123',
        wallet_address: '0xbot1',
        token_in: '0xUSDC',
        token_out: '0xWETH',
        amount_in: 100000,
        amount_out: 50,
        gas_price: 150, // High gas price
        timestamp: new Date('2025-10-16T10:00:00Z'),
        type: 'frontrun',
      },
      {
        tx_hash: '0xvictim456',
        wallet_address: '0xuser1',
        token_in: '0xUSDC',
        token_out: '0xWETH',
        amount_in: 50000,
        amount_out: 24.5, // Less than expected due to sandwich
        gas_price: 100, // Normal gas price
        timestamp: new Date('2025-10-16T10:00:05Z'),
        type: 'victim',
      },
      {
        tx_hash: '0xbackrun789',
        wallet_address: '0xbot1',
        token_in: '0xWETH',
        token_out: '0xUSDC',
        amount_in: 50,
        amount_out: 115000, // Profit from sandwich
        gas_price: 150, // High gas price
        timestamp: new Date('2025-10-16T10:00:10Z'),
        type: 'backrun',
      },
    ];

    return mockTransactions;
  }

  /**
   * Group transactions by token pair
   */
  private groupTransactionsByTokenPair(
    transactions: SandwichTransaction[]
  ): TransactionGroup[] {
    const groups = new Map<string, SandwichTransaction[]>();

    for (const tx of transactions) {
      const pair = this.getTokenPair(tx.token_in, tx.token_out);
      if (!groups.has(pair)) {
        groups.set(pair, []);
      }
      groups.get(pair)!.push(tx);
    }

    return Array.from(groups.entries()).map(([token_pair, txs]) => ({
      token_pair,
      transactions: txs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      timeframe_seconds: this.calculateTimeframe(txs),
    }));
  }

  /**
   * Detect sandwich patterns in a transaction group
   */
  private detectPatternsInGroup(group: TransactionGroup): SandwichPattern[] {
    const patterns: SandwichPattern[] = [];
    const txs = group.transactions;

    // Need at least 3 transactions for a sandwich
    if (txs.length < 3) {
      return patterns;
    }

    // Look for Buy → Victim → Sell pattern
    for (let i = 0; i < txs.length - 2; i++) {
      const potential_frontrun = txs[i];
      const potential_victim = txs[i + 1];
      const potential_backrun = txs[i + 2];

      // Check if this matches sandwich pattern
      if (this.isSandwichPattern(potential_frontrun, potential_victim, potential_backrun)) {
        const profit = this.calculateProfit(potential_frontrun, potential_backrun);
        const confidence = this.calculateConfidence(
          potential_frontrun,
          potential_victim,
          potential_backrun,
          profit
        );

        if (profit >= this.MIN_PROFIT_USD) {
          patterns.push({
            frontrun: potential_frontrun,
            victim: potential_victim,
            backrun: potential_backrun,
            profit_usd: profit,
            confidence,
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Check if three transactions match sandwich pattern
   */
  private isSandwichPattern(
    frontrun: SandwichTransaction,
    victim: SandwichTransaction,
    backrun: SandwichTransaction
  ): boolean {
    // Same bot address for frontrun and backrun
    if (frontrun.wallet_address !== backrun.wallet_address) {
      return false;
    }

    // Different address for victim
    if (victim.wallet_address === frontrun.wallet_address) {
      return false;
    }

    // Frontrun and backrun have higher gas price than victim
    if (frontrun.gas_price < victim.gas_price * this.GAS_PRICE_PREMIUM_THRESHOLD) {
      return false;
    }
    if (backrun.gas_price < victim.gas_price * this.GAS_PRICE_PREMIUM_THRESHOLD) {
      return false;
    }

    // Token pair matches (frontrun buys, backrun sells)
    if (frontrun.token_out !== backrun.token_in) {
      return false;
    }

    // Timing: all within timeframe
    const timeSpan =
      (backrun.timestamp.getTime() - frontrun.timestamp.getTime()) / 1000;
    if (timeSpan > this.MAX_TIMEFRAME_SECONDS) {
      return false;
    }

    return true;
  }

  /**
   * Calculate profit from sandwich attack
   */
  private calculateProfit(
    frontrun: SandwichTransaction,
    backrun: SandwichTransaction
  ): number {
    // Profit = backrun output - frontrun input
    const grossProfit = backrun.amount_out - frontrun.amount_in;
    
    // Estimate gas costs (mock for now)
    const gasCost = (frontrun.gas_price + backrun.gas_price) * 0.000021 * 2000; // ~$2000/ETH
    
    return grossProfit - gasCost;
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(
    frontrun: SandwichTransaction,
    victim: SandwichTransaction,
    backrun: SandwichTransaction,
    profit: number
  ): number {
    let score = 0;

    // Pattern match (30 points)
    score += 30;

    // Gas price ordering (20 points)
    if (frontrun.gas_price > victim.gas_price * 1.2) score += 10;
    if (backrun.gas_price > victim.gas_price * 1.2) score += 10;

    // Token pair match (20 points)
    if (frontrun.token_out === backrun.token_in) score += 20;

    // Timing (15 points)
    const timeSpan = (backrun.timestamp.getTime() - frontrun.timestamp.getTime()) / 1000;
    if (timeSpan < 30) score += 15;
    else if (timeSpan < 60) score += 10;

    // Profit threshold (15 points)
    if (profit > 1000) score += 15;
    else if (profit > 500) score += 10;
    else if (profit > 100) score += 5;

    return Math.min(100, score);
  }

  /**
   * Create detection result from pattern
   */
  private async createDetectionResult(
    pattern: SandwichPattern,
    chainId: string
  ): Promise<SandwichDetectionResult> {
    const opportunity: SandwichOpportunity = {
      opportunity_type: 'sandwich',
      chain_id: chainId,
      block_number: 18500000, // Mock
      timestamp: pattern.victim.timestamp,
      
      target_tx_hash: pattern.victim.tx_hash,
      mev_tx_hashes: [pattern.frontrun.tx_hash, pattern.backrun.tx_hash],
      
      token_addresses: [pattern.frontrun.token_in, pattern.frontrun.token_out],
      token_symbols: ['USDC', 'WETH'], // Mock
      
      protocol_id: 'uniswap-v3',
      protocol_name: 'Uniswap V3',
      dex_name: 'Uniswap V3',
      
      mev_profit_usd: pattern.profit_usd,
      victim_loss_usd: pattern.profit_usd * 0.5, // Estimate
      gas_cost_usd: 450,
      net_profit_usd: pattern.profit_usd - 450,
      
      bot_address: pattern.frontrun.wallet_address,
      bot_name: 'sandwich_bot',
      bot_type: 'sandwich_bot',
      
      detection_method: 'pattern_matching',
      confidence_score: pattern.confidence,
      
      status: 'detected' as MEVStatus,
      
      // Sandwich-specific
      frontrun_tx: pattern.frontrun,
      victim_tx: pattern.victim,
      backrun_tx: pattern.backrun,
      price_impact_pct: 2.5,
      slippage_extracted_pct: 1.5,
      victim_expected_output: 25,
      victim_actual_output: 24.5,
    };

    return {
      detected: true,
      opportunity,
      confidence_score: pattern.confidence,
      evidence: {
        pattern_match: true,
        gas_price_ordering: true,
        token_pair_match: true,
        timing_match: true,
        profit_threshold_met: pattern.profit_usd >= this.MIN_PROFIT_USD,
      },
    };
  }

  /**
   * Store opportunity in database
   */
  private async storeOpportunity(opportunity: SandwichOpportunity): Promise<void> {
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

  // Helper methods
  private getTokenPair(tokenA: string, tokenB: string): string {
    return [tokenA, tokenB].sort().join('-');
  }

  private calculateTimeframe(transactions: SandwichTransaction[]): number {
    if (transactions.length === 0) return 0;
    const timestamps = transactions.map((tx) => tx.timestamp.getTime());
    return (Math.max(...timestamps) - Math.min(...timestamps)) / 1000;
  }
}

