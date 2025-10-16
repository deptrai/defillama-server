/**
 * Arbitrage Detector Engine
 * Story: 4.1.1 - MEV Opportunity Detection
 * 
 * Detects arbitrage opportunities by:
 * 1. Monitoring prices across multiple DEXes
 * 2. Identifying price differences >0.5%
 * 3. Calculating profit after gas and slippage
 * 4. Verifying liquidity availability
 * 
 * Detection Algorithm:
 * - Fetch prices from multiple DEXes (Uniswap, Sushiswap, Curve, Balancer)
 * - Calculate price differences
 * - Simulate arbitrage execution
 * - Calculate net profit after costs
 * - Score confidence based on execution feasibility
 */

import { query } from '../db/connection';
import { BlockchainDataService } from '../services/blockchain-data-service';
import {
  ArbitrageOpportunity,
  ArbitrageDetectionResult,
  DEXPrice,
  ArbitrageRoute,
  MEVStatus,
} from './mev-types';
import {
  ARBITRAGE_DETECTOR_CONFIG,
  getMinConfidenceForProfit,
  getChainConfig,
} from './detector-config';
import { EnhancedConfidenceScorer } from './enhanced-confidence-scorer';
import { DetectorAccuracyTracker } from '../services/detector-accuracy-tracker';

// ============================================================================
// Arbitrage Detector
// ============================================================================

export class ArbitrageDetector {
  private static instance: ArbitrageDetector;
  private readonly DETECTOR_VERSION = 'v2.0.0'; // Updated version
  private blockchainDataService: BlockchainDataService;
  private confidenceScorer: EnhancedConfidenceScorer;
  private accuracyTracker: DetectorAccuracyTracker;

  // Detection thresholds (now using centralized config)
  private readonly MIN_PROFIT_USD = ARBITRAGE_DETECTOR_CONFIG.min_profit_usd; // Lowered to $10
  private readonly MIN_PRICE_DIFFERENCE_PCT = 0.5; // 0.5% minimum price difference
  private readonly MIN_LIQUIDITY_USD = 50000; // Minimum liquidity required
  private readonly MIN_CONFIDENCE_SCORE = ARBITRAGE_DETECTOR_CONFIG.min_confidence_score;
  private readonly SLIPPAGE_PCT = 0.3; // Estimated slippage

  // Supported DEXes
  private readonly SUPPORTED_DEXES = [
    'Uniswap V3',
    'Uniswap V2',
    'Sushiswap',
    'Curve',
    'Balancer',
  ];

  private constructor() {
    this.blockchainDataService = BlockchainDataService.getInstance();
    this.confidenceScorer = EnhancedConfidenceScorer.getInstance();
    this.accuracyTracker = DetectorAccuracyTracker.getInstance();
  }

  public static getInstance(): ArbitrageDetector {
    if (!ArbitrageDetector.instance) {
      ArbitrageDetector.instance = new ArbitrageDetector();
    }
    return ArbitrageDetector.instance;
  }

  /**
   * Main detection method
   */
  public async detectArbitrage(
    chainId: string = 'ethereum',
    tokenAddress?: string
  ): Promise<ArbitrageDetectionResult[]> {
    try {
      const startTime = Date.now();

      // Get prices from multiple DEXes (mock data for now)
      const dexPrices = await this.getDEXPrices(chainId, tokenAddress);

      // Find arbitrage opportunities
      const routes = this.findArbitrageRoutes(dexPrices);

      // Create detection results
      const results: ArbitrageDetectionResult[] = [];
      for (const route of routes) {
        const result = await this.createDetectionResult(route, dexPrices, chainId);
        
        if (result.detected && result.confidence_score >= this.MIN_CONFIDENCE_SCORE) {
          results.push(result);
          
          // Store in database
          if (result.opportunity) {
            await this.storeOpportunity(result.opportunity);
          }
        }
      }

      const detectionTime = Date.now() - startTime;
      console.log(`Arbitrage detection completed in ${detectionTime}ms. Found ${results.length} opportunities.`);

      return results;
    } catch (error) {
      console.error('Error detecting arbitrage:', error);
      throw error;
    }
  }

  /**
   * Get prices from multiple DEXes
   * TODO: Replace with real DEX price feeds
   */
  private async getDEXPrices(
    chainId: string,
    tokenAddress?: string
  ): Promise<DEXPrice[]> {
    // Mock data for now
    const mockPrices: DEXPrice[] = [
      {
        dex_name: 'Uniswap V3',
        token_address: '0xUSDC',
        price: 1.0,
        liquidity_usd: 500000,
        timestamp: new Date(),
      },
      {
        dex_name: 'Sushiswap',
        token_address: '0xUSDC',
        price: 1.006, // 0.6% higher
        liquidity_usd: 300000,
        timestamp: new Date(),
      },
      {
        dex_name: 'Curve',
        token_address: '0xUSDC',
        price: 0.998, // 0.2% lower
        liquidity_usd: 800000,
        timestamp: new Date(),
      },
    ];

    return mockPrices;
  }

  /**
   * Find profitable arbitrage routes
   */
  private findArbitrageRoutes(dexPrices: DEXPrice[]): ArbitrageRoute[] {
    const routes: ArbitrageRoute[] = [];

    // Group by token
    const tokenGroups = new Map<string, DEXPrice[]>();
    for (const price of dexPrices) {
      if (!tokenGroups.has(price.token_address)) {
        tokenGroups.set(price.token_address, []);
      }
      tokenGroups.get(price.token_address)!.push(price);
    }

    // Find arbitrage opportunities for each token
    for (const [tokenAddress, prices] of tokenGroups) {
      // Need at least 2 DEXes
      if (prices.length < 2) continue;

      // Find best buy and sell prices
      const sortedByPrice = [...prices].sort((a, b) => a.price - b.price);
      const buyDex = sortedByPrice[0]; // Lowest price
      const sellDex = sortedByPrice[sortedByPrice.length - 1]; // Highest price

      const priceDifference = ((sellDex.price - buyDex.price) / buyDex.price) * 100;

      if (priceDifference >= this.MIN_PRICE_DIFFERENCE_PCT) {
        // Estimate profit
        const tradeSize = Math.min(buyDex.liquidity_usd, sellDex.liquidity_usd) * 0.1; // 10% of liquidity
        const grossProfit = tradeSize * (priceDifference / 100);

        routes.push({
          buy_dex: buyDex.dex_name,
          sell_dex: sellDex.dex_name,
          token_address: tokenAddress,
          buy_price: buyDex.price,
          sell_price: sellDex.price,
          price_difference_pct: priceDifference,
          estimated_profit_usd: grossProfit,
        });
      }
    }

    return routes;
  }

  /**
   * Calculate net profit after costs
   */
  private calculateNetProfit(route: ArbitrageRoute): number {
    const grossProfit = route.estimated_profit_usd;

    // Estimate gas costs (2 transactions: buy + sell)
    const gasCost = 150 * 0.000021 * 2000 * 2; // ~$126

    // Estimate slippage
    const slippageCost = grossProfit * (this.SLIPPAGE_PCT / 100);

    return grossProfit - gasCost - slippageCost;
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(
    route: ArbitrageRoute,
    dexPrices: DEXPrice[],
    netProfit: number
  ): number {
    let score = 0;

    // Price difference threshold (30 points)
    if (route.price_difference_pct > 2) score += 30;
    else if (route.price_difference_pct > 1) score += 25;
    else if (route.price_difference_pct > 0.5) score += 20;

    // Liquidity sufficient (25 points)
    const buyDex = dexPrices.find(p => p.dex_name === route.buy_dex);
    const sellDex = dexPrices.find(p => p.dex_name === route.sell_dex);
    const minLiquidity = Math.min(buyDex?.liquidity_usd || 0, sellDex?.liquidity_usd || 0);
    if (minLiquidity > 500000) score += 25;
    else if (minLiquidity > 100000) score += 20;
    else if (minLiquidity > 50000) score += 15;

    // Profit after gas positive (25 points)
    if (netProfit > 1000) score += 25;
    else if (netProfit > 500) score += 20;
    else if (netProfit > 100) score += 15;

    // Execution feasible (20 points)
    if (route.price_difference_pct > 1 && netProfit > 100) score += 20;
    else if (route.price_difference_pct > 0.5 && netProfit > 50) score += 15;

    return Math.min(100, score);
  }

  /**
   * Create detection result
   */
  private async createDetectionResult(
    route: ArbitrageRoute,
    dexPrices: DEXPrice[],
    chainId: string
  ): Promise<ArbitrageDetectionResult> {
    const netProfit = this.calculateNetProfit(route);
    const confidence = this.calculateConfidence(route, dexPrices, netProfit);

    const buyDex = dexPrices.find(p => p.dex_name === route.buy_dex);
    const sellDex = dexPrices.find(p => p.dex_name === route.sell_dex);
    const minLiquidity = Math.min(buyDex?.liquidity_usd || 0, sellDex?.liquidity_usd || 0);

    const opportunity: ArbitrageOpportunity = {
      opportunity_type: 'arbitrage',
      chain_id: chainId,
      block_number: 18500000, // Mock
      timestamp: new Date(),

      mev_tx_hashes: [], // Will be filled when executed

      token_addresses: [route.token_address],
      token_symbols: ['USDC'], // Mock

      protocol_id: 'multi-dex',
      protocol_name: `${route.buy_dex} → ${route.sell_dex}`,
      dex_name: `${route.buy_dex}, ${route.sell_dex}`,

      mev_profit_usd: route.estimated_profit_usd,
      gas_cost_usd: 126, // Estimated
      net_profit_usd: netProfit,

      bot_address: '0xarb_bot',
      bot_name: 'arbitrage_bot',
      bot_type: 'arbitrage_bot',

      detection_method: 'multi_dex_price_comparison',
      confidence_score: confidence,

      status: 'detected' as MEVStatus,

      // Arbitrage-specific
      route,
      dex_prices: dexPrices.filter(p => p.token_address === route.token_address),
      price_difference_pct: route.price_difference_pct,
      gross_profit_usd: route.estimated_profit_usd,
      slippage_pct: this.SLIPPAGE_PCT,
      execution_time_ms: 2000, // Estimated
    };

    return {
      detected: netProfit >= this.MIN_PROFIT_USD,
      opportunity,
      confidence_score: confidence,
      evidence: {
        price_difference_threshold_met: route.price_difference_pct >= this.MIN_PRICE_DIFFERENCE_PCT,
        liquidity_sufficient: minLiquidity >= this.MIN_LIQUIDITY_USD,
        profit_after_gas_positive: netProfit >= this.MIN_PROFIT_USD,
        execution_feasible: route.price_difference_pct > 0.5 && netProfit > 0,
      },
    };
  }

  /**
   * Store opportunity in database
   */
  private async storeOpportunity(opportunity: ArbitrageOpportunity): Promise<void> {
    const sql = `
      INSERT INTO mev_opportunities (
        opportunity_type, chain_id, block_number, timestamp,
        mev_tx_hashes, token_addresses, token_symbols,
        protocol_id, protocol_name, dex_name,
        mev_profit_usd, gas_cost_usd, net_profit_usd,
        bot_address, bot_name, bot_type,
        detection_method, confidence_score, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
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

