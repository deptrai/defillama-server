/**
 * MEV Bot Tracker Engine
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Tracks MEV bot activities and maintains bot registry:
 * - Creates new bot entries when first detected
 * - Updates bot metrics when new opportunities detected
 * - Maintains performance metrics (total extracted, success rate, etc.)
 * - Tracks activity metrics (first seen, last active, active days)
 * - Updates strategy preferences
 * 
 * Algorithm:
 * 1. Identify bot from opportunity
 * 2. Check if bot exists in database
 * 3. If new: Create bot entry
 * 4. If existing: Update metrics
 * 5. Update activity tracking
 */

import { query } from '../db/connection';
import { MEVOpportunity } from './mev-types';
import { MEVBotIdentifier, BotIdentification } from './mev-bot-identifier';

// ============================================================================
// Types
// ============================================================================

export interface BotTrackingResult {
  bot_id: string;
  bot_address: string;
  chain_id: string;
  is_new: boolean;
  updated_metrics: string[];
}

export interface BotMetricsUpdate {
  total_mev_extracted_usd: number;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  total_gas_spent_usd: number;
  last_active: Date;
}

// ============================================================================
// MEVBotTracker Class
// ============================================================================

/**
 * MEVBotTracker - Singleton engine for tracking MEV bot activities
 */
export class MEVBotTracker {
  private static instance: MEVBotTracker;
  private identifier: MEVBotIdentifier;

  private constructor() {
    this.identifier = MEVBotIdentifier.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MEVBotTracker {
    if (!MEVBotTracker.instance) {
      MEVBotTracker.instance = new MEVBotTracker();
    }
    return MEVBotTracker.instance;
  }

  /**
   * Track bot from MEV opportunity
   */
  public async trackBot(opportunity: MEVOpportunity): Promise<BotTrackingResult | null> {
    // Identify bot
    const identification = await this.identifier.identifyBot(opportunity);
    if (!identification) {
      return null;
    }

    // Check if bot exists
    const exists = await this.identifier.botExists(
      identification.bot_address,
      identification.chain_id
    );

    if (exists) {
      // Update existing bot
      return await this.updateBot(identification, opportunity);
    } else {
      // Create new bot
      return await this.createBot(identification, opportunity);
    }
  }

  /**
   * Track multiple bots from opportunities
   */
  public async trackBots(opportunities: MEVOpportunity[]): Promise<BotTrackingResult[]> {
    const results: BotTrackingResult[] = [];

    for (const opportunity of opportunities) {
      const result = await this.trackBot(opportunity);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Create new bot entry
   */
  private async createBot(
    identification: BotIdentification,
    opportunity: MEVOpportunity
  ): Promise<BotTrackingResult> {
    const isSuccessful = opportunity.status === 'executed' || opportunity.status === 'confirmed';

    const result = await query<{ id: string }>(
      `
      INSERT INTO mev_bots (
        bot_address, chain_id, bot_name, bot_type, verified,
        total_mev_extracted_usd, total_transactions,
        successful_transactions, failed_transactions,
        total_gas_spent_usd, net_profit_usd,
        first_seen, last_active, active_days,
        preferred_opportunity_types, preferred_protocols, preferred_tokens
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, 1,
        $7, $8,
        $9, $10,
        $11, $11, 1,
        $12, $13, $14
      )
      RETURNING id
      `,
      [
        identification.bot_address,
        identification.chain_id,
        identification.bot_name || null,
        identification.bot_type,
        identification.verified,
        opportunity.mev_profit_usd || 0,
        isSuccessful ? 1 : 0,
        isSuccessful ? 0 : 1,
        opportunity.gas_cost_usd || 0,
        (opportunity.net_profit_usd || opportunity.mev_profit_usd) - (opportunity.gas_cost_usd || 0),
        opportunity.timestamp,
        [opportunity.opportunity_type],
        opportunity.protocol_id ? [opportunity.protocol_id] : [],
        opportunity.token_symbols || [],
      ]
    );

    return {
      bot_id: result.rows[0].id,
      bot_address: identification.bot_address,
      chain_id: identification.chain_id,
      is_new: true,
      updated_metrics: ['created'],
    };
  }

  /**
   * Update existing bot metrics
   */
  private async updateBot(
    identification: BotIdentification,
    opportunity: MEVOpportunity
  ): Promise<BotTrackingResult> {
    const isSuccessful = opportunity.status === 'executed' || opportunity.status === 'confirmed';

    // Get current bot data
    const bot = await this.identifier.getBot(
      identification.bot_address,
      identification.chain_id
    );

    if (!bot) {
      throw new Error('Bot not found');
    }

    // Calculate updated metrics
    const totalMevExtracted = parseFloat(bot.total_mev_extracted_usd || '0') + (opportunity.mev_profit_usd || 0);
    const totalTransactions = parseInt(bot.total_transactions || '0', 10) + 1;
    const successfulTransactions = parseInt(bot.successful_transactions || '0', 10) + (isSuccessful ? 1 : 0);
    const failedTransactions = parseInt(bot.failed_transactions || '0', 10) + (isSuccessful ? 0 : 1);
    const totalGasSpent = parseFloat(bot.total_gas_spent_usd || '0') + (opportunity.gas_cost_usd || 0);
    const netProfit = totalMevExtracted - totalGasSpent;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
    const avgProfitPerTx = totalTransactions > 0 ? totalMevExtracted / totalTransactions : 0;

    // Update preferred opportunity types
    const preferredTypes = bot.preferred_opportunity_types || [];
    if (!preferredTypes.includes(opportunity.opportunity_type)) {
      preferredTypes.push(opportunity.opportunity_type);
    }

    // Update preferred protocols
    const preferredProtocols = bot.preferred_protocols || [];
    if (opportunity.protocol_id && !preferredProtocols.includes(opportunity.protocol_id)) {
      preferredProtocols.push(opportunity.protocol_id);
    }

    // Update preferred tokens
    const preferredTokens = bot.preferred_tokens || [];
    if (opportunity.token_symbols) {
      for (const token of opportunity.token_symbols) {
        if (!preferredTokens.includes(token)) {
          preferredTokens.push(token);
        }
      }
    }

    // Calculate active days
    const firstSeen = new Date(bot.first_seen);
    const lastActive = new Date(opportunity.timestamp);
    const activeDays = Math.ceil((lastActive.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Update database
    await query(
      `
      UPDATE mev_bots SET
        total_mev_extracted_usd = $1,
        total_transactions = $2,
        successful_transactions = $3,
        failed_transactions = $4,
        success_rate = $5,
        avg_profit_per_tx_usd = $6,
        total_gas_spent_usd = $7,
        net_profit_usd = $8,
        last_active = $9,
        active_days = $10,
        preferred_opportunity_types = $11,
        preferred_protocols = $12,
        preferred_tokens = $13,
        updated_at = NOW()
      WHERE bot_address = $14 AND chain_id = $15
      `,
      [
        totalMevExtracted,
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        successRate,
        avgProfitPerTx,
        totalGasSpent,
        netProfit,
        lastActive,
        activeDays,
        preferredTypes,
        preferredProtocols,
        preferredTokens,
        identification.bot_address,
        identification.chain_id,
      ]
    );

    return {
      bot_id: bot.id,
      bot_address: identification.bot_address,
      chain_id: identification.chain_id,
      is_new: false,
      updated_metrics: [
        'total_mev_extracted',
        'total_transactions',
        'success_rate',
        'avg_profit_per_tx',
        'last_active',
        'active_days',
        'preferred_types',
      ],
    };
  }

  /**
   * Get bot statistics
   */
  public async getBotStats(botAddress: string, chainId: string): Promise<any> {
    const result = await query(
      `
      SELECT 
        bot_address,
        chain_id,
        bot_name,
        bot_type,
        verified,
        total_mev_extracted_usd,
        total_transactions,
        successful_transactions,
        failed_transactions,
        success_rate,
        avg_profit_per_tx_usd,
        total_gas_spent_usd,
        net_profit_usd,
        first_seen,
        last_active,
        active_days,
        preferred_opportunity_types,
        preferred_protocols,
        preferred_tokens,
        sophistication_score
      FROM mev_bots
      WHERE bot_address = $1 AND chain_id = $2
      `,
      [botAddress, chainId]
    );

    return result.rows[0] || null;
  }
}

