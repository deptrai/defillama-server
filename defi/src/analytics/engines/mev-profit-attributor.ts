/**
 * MEV Profit Attributor Engine
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Attributes MEV profits to multiple dimensions:
 * - Bot attribution (bot_address, bot_id)
 * - Strategy attribution (opportunity_type)
 * - Protocol attribution (protocol_id, protocol_name)
 * - Token attribution (token_addresses, primary_token)
 * - Time attribution (date, hour)
 * 
 * Algorithm:
 * 1. Extract opportunity data
 * 2. Get bot_id from mev_bots table
 * 3. Calculate financial metrics (gross profit, costs, net profit)
 * 4. Extract all attribution dimensions
 * 5. Insert into mev_profit_attribution table
 * 6. Return attribution record
 */

import { query } from '../db/connection';
import { MEVOpportunity } from './mev-types';

// ============================================================================
// Types
// ============================================================================

export interface ProfitAttribution {
  id?: string;
  opportunity_id: string;
  bot_id?: string;
  bot_address: string;
  chain_id: string;
  opportunity_type: string;

  // Protocol attribution
  protocol_id?: string;
  protocol_name?: string;
  dex_name?: string;

  // Token attribution
  token_addresses?: string[];
  token_symbols?: string[];
  primary_token_address?: string;
  primary_token_symbol?: string;

  // Time attribution
  block_number: number;
  timestamp: Date;
  date: Date;
  hour: number;

  // Financial metrics
  gross_profit_usd: number;
  gas_cost_usd: number;
  protocol_fees_usd: number;
  slippage_cost_usd: number;
  other_costs_usd: number;
  net_profit_usd: number;

  // Victim impact
  victim_loss_usd?: number;
  victim_address?: string;

  // Transaction details
  mev_tx_hashes?: string[];
  target_tx_hash?: string;

  // Quality
  confidence_score: number;
  attribution_quality: 'high' | 'medium' | 'low';
}

export interface AttributionResult {
  attribution_id: string;
  opportunity_id: string;
  bot_address: string;
  net_profit_usd: number;
  attribution_quality: string;
}

// ============================================================================
// MEVProfitAttributor Class
// ============================================================================

/**
 * MEVProfitAttributor - Singleton engine for attributing MEV profits
 */
export class MEVProfitAttributor {
  private static instance: MEVProfitAttributor;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): MEVProfitAttributor {
    if (!MEVProfitAttributor.instance) {
      MEVProfitAttributor.instance = new MEVProfitAttributor();
    }
    return MEVProfitAttributor.instance;
  }

  /**
   * Attribute profit from MEV opportunity
   */
  public async attributeProfit(opportunity: MEVOpportunity): Promise<AttributionResult> {
    // Build attribution record
    const attribution = await this.buildAttribution(opportunity);

    // Insert into database
    const result = await this.insertAttribution(attribution);

    return {
      attribution_id: result.id!,
      opportunity_id: opportunity.id!,
      bot_address: attribution.bot_address,
      net_profit_usd: attribution.net_profit_usd,
      attribution_quality: attribution.attribution_quality,
    };
  }

  /**
   * Attribute profits from multiple opportunities
   */
  public async attributeProfits(opportunities: MEVOpportunity[]): Promise<AttributionResult[]> {
    const results: AttributionResult[] = [];

    for (const opportunity of opportunities) {
      try {
        const result = await this.attributeProfit(opportunity);
        results.push(result);
      } catch (error) {
        console.error(`Error attributing profit for opportunity ${opportunity.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Build attribution record from opportunity
   */
  private async buildAttribution(opportunity: MEVOpportunity): Promise<ProfitAttribution> {
    // Get bot_id if bot exists
    let botId: string | undefined;
    if (opportunity.bot_address) {
      const botResult = await query<{ id: string }>(
        `SELECT id FROM mev_bots WHERE bot_address = $1 AND chain_id = $2`,
        [opportunity.bot_address, opportunity.chain_id]
      );
      botId = botResult.rows[0]?.id;
    }

    // Calculate financial metrics
    const grossProfit = opportunity.mev_profit_usd || 0;
    const gasCost = opportunity.gas_cost_usd || 0;
    const protocolFees = 0; // TODO: Calculate from opportunity data
    const slippageCost = 0; // TODO: Calculate from opportunity data
    const otherCosts = 0;
    const netProfit = opportunity.net_profit_usd || (grossProfit - gasCost);

    // Extract time dimensions
    const timestamp = new Date(opportunity.timestamp);
    const date = new Date(timestamp.toISOString().split('T')[0]);
    const hour = timestamp.getHours();

    // Determine primary token
    const primaryTokenAddress = opportunity.token_addresses?.[0];
    const primaryTokenSymbol = opportunity.token_symbols?.[0];

    // Determine attribution quality
    const attributionQuality = this.determineAttributionQuality(opportunity, botId);

    return {
      opportunity_id: opportunity.id!,
      bot_id: botId,
      bot_address: opportunity.bot_address!,
      chain_id: opportunity.chain_id,
      opportunity_type: opportunity.opportunity_type,

      // Protocol attribution
      protocol_id: opportunity.protocol_id,
      protocol_name: opportunity.protocol_name,
      dex_name: opportunity.dex_name,

      // Token attribution
      token_addresses: opportunity.token_addresses,
      token_symbols: opportunity.token_symbols,
      primary_token_address: primaryTokenAddress,
      primary_token_symbol: primaryTokenSymbol,

      // Time attribution
      block_number: opportunity.block_number,
      timestamp,
      date,
      hour,

      // Financial metrics
      gross_profit_usd: grossProfit,
      gas_cost_usd: gasCost,
      protocol_fees_usd: protocolFees,
      slippage_cost_usd: slippageCost,
      other_costs_usd: otherCosts,
      net_profit_usd: netProfit,

      // Victim impact
      victim_loss_usd: opportunity.victim_loss_usd,
      victim_address: undefined, // TODO: Extract from opportunity data

      // Transaction details
      mev_tx_hashes: opportunity.mev_tx_hashes,
      target_tx_hash: opportunity.target_tx_hash,

      // Quality
      confidence_score: opportunity.confidence_score,
      attribution_quality: attributionQuality,
    };
  }

  /**
   * Insert attribution into database
   */
  private async insertAttribution(attribution: ProfitAttribution): Promise<ProfitAttribution> {
    const result = await query<{ id: string }>(
      `
      INSERT INTO mev_profit_attribution (
        opportunity_id, bot_id, bot_address, chain_id, opportunity_type,
        protocol_id, protocol_name, dex_name,
        token_addresses, token_symbols, primary_token_address, primary_token_symbol,
        block_number, timestamp, date, hour,
        gross_profit_usd, gas_cost_usd, protocol_fees_usd, slippage_cost_usd, other_costs_usd, net_profit_usd,
        victim_loss_usd, victim_address,
        mev_tx_hashes, target_tx_hash,
        confidence_score, attribution_quality
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22,
        $23, $24,
        $25, $26,
        $27, $28
      )
      RETURNING id
      `,
      [
        attribution.opportunity_id,
        attribution.bot_id || null,
        attribution.bot_address,
        attribution.chain_id,
        attribution.opportunity_type,
        attribution.protocol_id || null,
        attribution.protocol_name || null,
        attribution.dex_name || null,
        attribution.token_addresses || [],
        attribution.token_symbols || [],
        attribution.primary_token_address || null,
        attribution.primary_token_symbol || null,
        attribution.block_number,
        attribution.timestamp,
        attribution.date,
        attribution.hour,
        attribution.gross_profit_usd,
        attribution.gas_cost_usd,
        attribution.protocol_fees_usd,
        attribution.slippage_cost_usd,
        attribution.other_costs_usd,
        attribution.net_profit_usd,
        attribution.victim_loss_usd || null,
        attribution.victim_address || null,
        attribution.mev_tx_hashes || [],
        attribution.target_tx_hash || null,
        attribution.confidence_score,
        attribution.attribution_quality,
      ]
    );

    return {
      ...attribution,
      id: result.rows[0].id,
    };
  }

  /**
   * Determine attribution quality based on data completeness
   */
  private determineAttributionQuality(
    opportunity: MEVOpportunity,
    botId?: string
  ): 'high' | 'medium' | 'low' {
    let score = 0;

    // Bot identification (30 points)
    if (botId) score += 30;
    else if (opportunity.bot_address) score += 15;

    // Protocol identification (25 points)
    if (opportunity.protocol_id && opportunity.protocol_name) score += 25;
    else if (opportunity.protocol_id || opportunity.protocol_name) score += 12;

    // Token identification (20 points)
    if (opportunity.token_addresses && opportunity.token_symbols) score += 20;
    else if (opportunity.token_addresses || opportunity.token_symbols) score += 10;

    // Financial data completeness (15 points)
    if (opportunity.mev_profit_usd && opportunity.gas_cost_usd) score += 15;
    else if (opportunity.mev_profit_usd) score += 7;

    // Confidence score (10 points)
    if (opportunity.confidence_score >= 90) score += 10;
    else if (opportunity.confidence_score >= 70) score += 5;

    // Determine quality level
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Get attribution by opportunity ID
   */
  public async getAttributionByOpportunity(opportunityId: string): Promise<ProfitAttribution | null> {
    const result = await query<ProfitAttribution>(
      `SELECT * FROM mev_profit_attribution WHERE opportunity_id = $1`,
      [opportunityId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get attributions by bot
   */
  public async getAttributionsByBot(
    botAddress: string,
    chainId: string,
    limit: number = 100
  ): Promise<ProfitAttribution[]> {
    const result = await query<ProfitAttribution>(
      `
      SELECT * FROM mev_profit_attribution
      WHERE bot_address = $1 AND chain_id = $2
      ORDER BY timestamp DESC
      LIMIT $3
      `,
      [botAddress, chainId, limit]
    );

    return result.rows;
  }
}

