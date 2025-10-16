/**
 * MEV Bot Identifier Engine
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Identifies MEV bots from opportunities and assigns:
 * - Bot address (from opportunity)
 * - Bot type (sandwich, frontrun, arbitrage, liquidation, backrun, multi-strategy)
 * - Bot name (if known from registry)
 * - Verification status
 * 
 * Algorithm:
 * 1. Extract bot_address from MEV opportunity
 * 2. Determine bot_type from opportunity patterns
 * 3. Check known bot registry for name/verification
 * 4. Return bot identification data
 */

import { query } from '../db/connection';
import { MEVOpportunity, MEVOpportunityType } from './mev-types';

// ============================================================================
// Types
// ============================================================================

export interface BotIdentification {
  bot_address: string;
  chain_id: string;
  bot_name?: string;
  bot_type: string;
  verified: boolean;
  confidence: number; // 0-100
}

export interface KnownBot {
  address: string;
  name: string;
  type: string;
  verified: boolean;
  chains: string[];
}

// ============================================================================
// Known Bot Registry
// ============================================================================

/**
 * Registry of known MEV bots
 * In production, this would be loaded from database or external API
 */
const KNOWN_BOTS: KnownBot[] = [
  {
    address: '0x000000000035B5e5ad9019092C665357240f594e',
    name: 'Flashbots Alpha',
    type: 'multi-strategy',
    verified: true,
    chains: ['ethereum', 'arbitrum', 'optimism'],
  },
  {
    address: '0x6b75d8AF000000e20B7a7DDf000Ba900b4009A80',
    name: 'Sandwich Master',
    type: 'sandwich',
    verified: true,
    chains: ['ethereum'],
  },
  {
    address: '0x00000000003b3cc22aF3aE1EAc0440BcEe416B40',
    name: 'Arb Sniper',
    type: 'arbitrage',
    verified: true,
    chains: ['ethereum', 'arbitrum', 'base'],
  },
  {
    address: '0x5050f69a9786F081509234F1a7F4684b5E5b76C9',
    name: 'Liquidation Bot Alpha',
    type: 'liquidation',
    verified: true,
    chains: ['ethereum', 'polygon'],
  },
  {
    address: '0x57757E3D981446D585Af0D9Ae4d7DF6D64647806',
    name: 'Aave Liquidator',
    type: 'liquidation',
    verified: true,
    chains: ['ethereum', 'polygon', 'avalanche'],
  },
];

// ============================================================================
// MEVBotIdentifier Class
// ============================================================================

/**
 * MEVBotIdentifier - Singleton engine for identifying MEV bots
 */
export class MEVBotIdentifier {
  private static instance: MEVBotIdentifier;
  private knownBots: Map<string, KnownBot>;

  private constructor() {
    // Initialize known bots registry
    this.knownBots = new Map();
    for (const bot of KNOWN_BOTS) {
      this.knownBots.set(bot.address.toLowerCase(), bot);
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MEVBotIdentifier {
    if (!MEVBotIdentifier.instance) {
      MEVBotIdentifier.instance = new MEVBotIdentifier();
    }
    return MEVBotIdentifier.instance;
  }

  /**
   * Identify bot from MEV opportunity
   */
  public async identifyBot(opportunity: MEVOpportunity): Promise<BotIdentification | null> {
    // Extract bot address
    const botAddress = opportunity.bot_address;
    if (!botAddress) {
      return null;
    }

    const chainId = opportunity.chain_id;

    // Check if bot is known
    const knownBot = this.knownBots.get(botAddress.toLowerCase());

    if (knownBot) {
      // Known bot - high confidence
      return {
        bot_address: botAddress,
        chain_id: chainId,
        bot_name: knownBot.name,
        bot_type: knownBot.type,
        verified: knownBot.verified,
        confidence: 95,
      };
    }

    // Unknown bot - determine type from opportunity
    const botType = await this.determineBotType(botAddress, chainId, opportunity.opportunity_type);

    return {
      bot_address: botAddress,
      chain_id: chainId,
      bot_name: undefined,
      bot_type: botType,
      verified: false,
      confidence: 70,
    };
  }

  /**
   * Identify multiple bots from opportunities
   */
  public async identifyBots(opportunities: MEVOpportunity[]): Promise<BotIdentification[]> {
    const identifications: BotIdentification[] = [];

    for (const opportunity of opportunities) {
      const identification = await this.identifyBot(opportunity);
      if (identification) {
        identifications.push(identification);
      }
    }

    return identifications;
  }

  /**
   * Determine bot type from historical activity
   */
  private async determineBotType(
    botAddress: string,
    chainId: string,
    currentOpportunityType: MEVOpportunityType
  ): Promise<string> {
    try {
      // Query historical opportunities for this bot
      const result = await query<{
        opportunity_type: string;
        count: string;
      }>(
        `
        SELECT 
          opportunity_type,
          COUNT(*) as count
        FROM mev_opportunities
        WHERE bot_address = $1
          AND chain_id = $2
        GROUP BY opportunity_type
        ORDER BY count DESC
        `,
        [botAddress, chainId]
      );

      if (result.rows.length === 0) {
        // No history - use current opportunity type
        return currentOpportunityType;
      }

      // Check if bot is multi-strategy (2+ types with significant activity)
      const significantTypes = result.rows.filter(
        (row) => parseInt(row.count, 10) >= 5
      );

      if (significantTypes.length >= 2) {
        return 'multi-strategy';
      }

      // Single strategy - return most common type
      return result.rows[0].opportunity_type;
    } catch (error) {
      console.error('Error determining bot type:', error);
      // Fallback to current opportunity type
      return currentOpportunityType;
    }
  }

  /**
   * Check if bot exists in database
   */
  public async botExists(botAddress: string, chainId: string): Promise<boolean> {
    try {
      const result = await query<{ exists: boolean }>(
        `
        SELECT EXISTS(
          SELECT 1 FROM mev_bots
          WHERE bot_address = $1 AND chain_id = $2
        ) as exists
        `,
        [botAddress, chainId]
      );

      return result.rows[0]?.exists || false;
    } catch (error) {
      console.error('Error checking bot existence:', error);
      return false;
    }
  }

  /**
   * Get bot by address and chain
   */
  public async getBot(botAddress: string, chainId: string): Promise<any | null> {
    try {
      const result = await query(
        `
        SELECT * FROM mev_bots
        WHERE bot_address = $1 AND chain_id = $2
        `,
        [botAddress, chainId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting bot:', error);
      return null;
    }
  }

  /**
   * Add bot to known registry (for manual verification)
   */
  public addKnownBot(bot: KnownBot): void {
    this.knownBots.set(bot.address.toLowerCase(), bot);
  }

  /**
   * Get all known bots
   */
  public getKnownBots(): KnownBot[] {
    return Array.from(this.knownBots.values());
  }

  /**
   * Check if address is a known bot
   */
  public isKnownBot(address: string): boolean {
    return this.knownBots.has(address.toLowerCase());
  }

  /**
   * Get known bot info
   */
  public getKnownBotInfo(address: string): KnownBot | undefined {
    return this.knownBots.get(address.toLowerCase());
  }
}

