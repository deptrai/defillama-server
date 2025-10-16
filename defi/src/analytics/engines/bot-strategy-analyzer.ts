/**
 * Bot Strategy Analyzer Engine
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Analyzes MEV bot strategies and preferences:
 * - Preferred opportunity types (sandwich, frontrun, arbitrage, etc.)
 * - Preferred protocols (Uniswap, Curve, Aave, etc.)
 * - Preferred tokens (WETH, USDC, DAI, etc.)
 * - Preferred DEXes (Uniswap, Sushiswap, Curve, etc.)
 * - Strategy patterns and specialization
 * 
 * Algorithm:
 * 1. Query historical opportunities for bot
 * 2. Analyze opportunity type distribution
 * 3. Analyze protocol preferences
 * 4. Analyze token preferences
 * 5. Determine strategy classification
 * 6. Calculate specialization score
 */

import { query } from '../db/connection';
import { MEVOpportunityType } from './mev-types';
import cacheManager, { getCacheKey, CACHE_PREFIX, CACHE_TTL, cacheFunction } from '../cache/redis-cache';

// ============================================================================
// Types
// ============================================================================

export interface BotStrategyAnalysis {
  bot_address: string;
  chain_id: string;

  // Opportunity Type Analysis
  opportunity_types: OpportunityTypePreference[];
  primary_strategy: MEVOpportunityType;
  is_multi_strategy: boolean;
  specialization_score: number; // 0-100, higher = more specialized

  // Protocol Analysis
  preferred_protocols: ProtocolPreference[];
  protocol_diversity_score: number; // 0-100, higher = more diverse

  // Token Analysis
  preferred_tokens: TokenPreference[];
  token_diversity_score: number; // 0-100, higher = more diverse

  // DEX Analysis
  preferred_dexes?: DexPreference[];

  // Strategy Classification
  strategy_classification: StrategyClassification;
}

export interface OpportunityTypePreference {
  opportunity_type: MEVOpportunityType;
  count: number;
  total_profit_usd: number;
  success_rate_pct: number;
  share_pct: number; // Percentage of total opportunities
}

export interface ProtocolPreference {
  protocol_id: string;
  protocol_name: string;
  count: number;
  total_profit_usd: number;
  avg_profit_per_tx_usd: number;
  share_pct: number;
}

export interface TokenPreference {
  token_symbol: string;
  count: number;
  total_profit_usd: number;
  avg_profit_per_tx_usd: number;
  share_pct: number;
}

export interface DexPreference {
  dex_name: string;
  count: number;
  total_profit_usd: number;
  share_pct: number;
}

export interface StrategyClassification {
  type: 'specialist' | 'generalist' | 'opportunistic';
  focus: string; // e.g., "sandwich specialist", "multi-strategy generalist"
  confidence: number; // 0-100
}

// ============================================================================
// BotStrategyAnalyzer Class
// ============================================================================

/**
 * BotStrategyAnalyzer - Singleton engine for analyzing bot strategies
 */
export class BotStrategyAnalyzer {
  private static instance: BotStrategyAnalyzer;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): BotStrategyAnalyzer {
    if (!BotStrategyAnalyzer.instance) {
      BotStrategyAnalyzer.instance = new BotStrategyAnalyzer();
    }
    return BotStrategyAnalyzer.instance;
  }

  /**
   * Analyze bot strategy
   */
  public async analyzeStrategy(
    botAddress: string,
    chainId: string
  ): Promise<BotStrategyAnalysis> {
    // Generate cache key
    const cacheKey = getCacheKey(CACHE_PREFIX.BOT_STRATEGY, botAddress, chainId);

    // Try to get from cache
    return cacheFunction(cacheKey, CACHE_TTL.BOT_STRATEGY, async () => {
      // Analyze opportunity types
      const opportunityTypes = await this.analyzeOpportunityTypes(botAddress, chainId);
      const primaryStrategy = opportunityTypes[0]?.opportunity_type || 'sandwich';
      const isMultiStrategy = opportunityTypes.filter((t) => t.share_pct >= 20).length >= 2;
      const specializationScore = this.calculateSpecializationScore(opportunityTypes);

      // Analyze protocols
      const preferredProtocols = await this.analyzeProtocols(botAddress, chainId);
      const protocolDiversityScore = this.calculateDiversityScore(
        preferredProtocols.map((p) => p.share_pct)
      );

      // Analyze tokens
      const preferredTokens = await this.analyzeTokens(botAddress, chainId);
      const tokenDiversityScore = this.calculateDiversityScore(
        preferredTokens.map((t) => t.share_pct)
      );

      // Classify strategy
      const strategyClassification = this.classifyStrategy(
        opportunityTypes,
        specializationScore,
        isMultiStrategy
      );

      return {
        bot_address: botAddress,
        chain_id: chainId,
        opportunity_types: opportunityTypes,
        primary_strategy: primaryStrategy,
        is_multi_strategy: isMultiStrategy,
        specialization_score: specializationScore,
        preferred_protocols: preferredProtocols,
        protocol_diversity_score: protocolDiversityScore,
        preferred_tokens: preferredTokens,
        token_diversity_score: tokenDiversityScore,
        strategy_classification: strategyClassification,
      };
    });
  }

  /**
   * Analyze opportunity type preferences
   */
  private async analyzeOpportunityTypes(
    botAddress: string,
    chainId: string
  ): Promise<OpportunityTypePreference[]> {
    const result = await query<{
      opportunity_type: MEVOpportunityType;
      count: string;
      total_profit: string;
      successful_count: string;
    }>(
      `
      SELECT 
        opportunity_type,
        COUNT(*) as count,
        COALESCE(SUM(mev_profit_usd), 0) as total_profit,
        COUNT(*) FILTER (WHERE status IN ('executed', 'confirmed')) as successful_count
      FROM mev_opportunities
      WHERE bot_address = $1 AND chain_id = $2
      GROUP BY opportunity_type
      ORDER BY count DESC
      `,
      [botAddress, chainId]
    );

    const totalCount = result.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    return result.rows.map((row) => {
      const count = parseInt(row.count, 10);
      const successfulCount = parseInt(row.successful_count, 10);

      return {
        opportunity_type: row.opportunity_type,
        count,
        total_profit_usd: parseFloat(row.total_profit),
        success_rate_pct: count > 0 ? (successfulCount / count) * 100 : 0,
        share_pct: totalCount > 0 ? (count / totalCount) * 100 : 0,
      };
    });
  }

  /**
   * Analyze protocol preferences
   */
  private async analyzeProtocols(
    botAddress: string,
    chainId: string
  ): Promise<ProtocolPreference[]> {
    const result = await query<{
      protocol_id: string;
      protocol_name: string;
      count: string;
      total_profit: string;
    }>(
      `
      SELECT 
        protocol_id,
        protocol_name,
        COUNT(*) as count,
        COALESCE(SUM(mev_profit_usd), 0) as total_profit
      FROM mev_opportunities
      WHERE bot_address = $1 
        AND chain_id = $2
        AND protocol_id IS NOT NULL
      GROUP BY protocol_id, protocol_name
      ORDER BY count DESC
      LIMIT 10
      `,
      [botAddress, chainId]
    );

    const totalCount = result.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    return result.rows.map((row) => {
      const count = parseInt(row.count, 10);
      const totalProfit = parseFloat(row.total_profit);

      return {
        protocol_id: row.protocol_id,
        protocol_name: row.protocol_name,
        count,
        total_profit_usd: totalProfit,
        avg_profit_per_tx_usd: count > 0 ? totalProfit / count : 0,
        share_pct: totalCount > 0 ? (count / totalCount) * 100 : 0,
      };
    });
  }

  /**
   * Analyze token preferences
   */
  private async analyzeTokens(
    botAddress: string,
    chainId: string
  ): Promise<TokenPreference[]> {
    const result = await query<{
      token_symbol: string;
      count: string;
      total_profit: string;
    }>(
      `
      SELECT 
        UNNEST(token_symbols) as token_symbol,
        COUNT(*) as count,
        COALESCE(SUM(mev_profit_usd), 0) as total_profit
      FROM mev_opportunities
      WHERE bot_address = $1 
        AND chain_id = $2
        AND token_symbols IS NOT NULL
      GROUP BY token_symbol
      ORDER BY count DESC
      LIMIT 10
      `,
      [botAddress, chainId]
    );

    const totalCount = result.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    return result.rows.map((row) => {
      const count = parseInt(row.count, 10);
      const totalProfit = parseFloat(row.total_profit);

      return {
        token_symbol: row.token_symbol,
        count,
        total_profit_usd: totalProfit,
        avg_profit_per_tx_usd: count > 0 ? totalProfit / count : 0,
        share_pct: totalCount > 0 ? (count / totalCount) * 100 : 0,
      };
    });
  }

  /**
   * Calculate specialization score (0-100)
   * Higher score = more specialized (focused on one strategy)
   * Lower score = more generalist (diverse strategies)
   */
  private calculateSpecializationScore(
    opportunityTypes: OpportunityTypePreference[]
  ): number {
    if (opportunityTypes.length === 0) return 0;
    if (opportunityTypes.length === 1) return 100;

    // Calculate Herfindahl-Hirschman Index (HHI)
    // HHI = sum of squared market shares
    const hhi = opportunityTypes.reduce((sum, type) => {
      return sum + Math.pow(type.share_pct, 2);
    }, 0);

    // Normalize HHI to 0-100 scale
    // HHI ranges from 1/n (perfectly diverse) to 100 (monopoly)
    // For 5 opportunity types: min HHI = 20, max HHI = 10000
    const minHHI = 100 / opportunityTypes.length;
    const maxHHI = 10000;

    const normalizedScore = ((hhi - minHHI) / (maxHHI - minHHI)) * 100;

    return Math.max(0, Math.min(100, normalizedScore));
  }

  /**
   * Calculate diversity score (0-100)
   * Higher score = more diverse
   * Lower score = more concentrated
   */
  private calculateDiversityScore(shares: number[]): number {
    if (shares.length === 0) return 0;
    if (shares.length === 1) return 0;

    // Calculate entropy-based diversity
    const entropy = shares.reduce((sum, share) => {
      if (share === 0) return sum;
      const p = share / 100;
      return sum - p * Math.log2(p);
    }, 0);

    // Normalize to 0-100 scale
    const maxEntropy = Math.log2(shares.length);
    const diversityScore = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;

    return Math.max(0, Math.min(100, diversityScore));
  }

  /**
   * Classify bot strategy
   */
  private classifyStrategy(
    opportunityTypes: OpportunityTypePreference[],
    specializationScore: number,
    isMultiStrategy: boolean
  ): StrategyClassification {
    if (specializationScore >= 70) {
      // Specialist: Focused on one strategy
      const primaryType = opportunityTypes[0]?.opportunity_type || 'unknown';
      return {
        type: 'specialist',
        focus: `${primaryType} specialist`,
        confidence: specializationScore,
      };
    } else if (isMultiStrategy) {
      // Generalist: Multiple strategies with significant activity
      return {
        type: 'generalist',
        focus: 'multi-strategy generalist',
        confidence: 100 - specializationScore,
      };
    } else {
      // Opportunistic: Diverse but no clear focus
      return {
        type: 'opportunistic',
        focus: 'opportunistic trader',
        confidence: 60,
      };
    }
  }
}

