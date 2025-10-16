/**
 * MEV Trend Analyzers
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Three analyzers for MEV market trends:
 * 1. MarketTrendCalculator - Calculate daily MEV market trends
 * 2. OpportunityDistributionAnalyzer - Analyze opportunity distribution over time
 * 3. BotCompetitionAnalyzer - Analyze bot competition metrics
 */

import { query } from '../db/connection';
import { MEVOpportunityType } from './mev-types';

// ============================================================================
// Common Types
// ============================================================================

export interface TimeRange {
  start_date?: Date;
  end_date?: Date;
}

// ============================================================================
// Market Trend Types
// ============================================================================

export interface MarketTrend {
  date: Date;
  chain_id: string;

  // Total MEV metrics
  total_mev_volume_usd: number;
  total_opportunities: number;
  total_executed_opportunities: number;
  execution_rate_pct: number;

  // Opportunity distribution
  sandwich_count: number;
  sandwich_volume_usd: number;
  sandwich_share_pct: number;
  frontrun_count: number;
  frontrun_volume_usd: number;
  frontrun_share_pct: number;
  backrun_count: number;
  backrun_volume_usd: number;
  backrun_share_pct: number;
  arbitrage_count: number;
  arbitrage_volume_usd: number;
  arbitrage_share_pct: number;
  liquidation_count: number;
  liquidation_volume_usd: number;
  liquidation_share_pct: number;

  // Profit metrics
  avg_profit_per_opportunity_usd: number;
  median_profit_usd: number;
  max_profit_usd: number;
  min_profit_usd: number;

  // Bot competition
  unique_bots: number;
  new_bots: number;
  active_bots: number;
  bot_concentration_hhi: number;
  top_10_bots_share_pct: number;

  // Gas metrics
  avg_gas_price_gwei: number;
  avg_priority_fee_gwei: number;
  total_gas_spent_usd: number;

  // Top protocols
  top_protocols: Array<{ protocol_id: string; volume_usd: number }>;

  // Top tokens
  top_tokens: Array<{ token_symbol: string; volume_usd: number }>;
}

export interface OpportunityDistribution {
  opportunity_type: MEVOpportunityType;
  count: number;
  volume_usd: number;
  share_pct: number;
  avg_profit_usd: number;
  growth_rate_pct?: number; // Compared to previous period
}

export interface BotCompetition {
  unique_bots: number;
  active_bots: number;
  new_bots: number;
  bot_concentration_hhi: number; // 0-10000
  concentration_level: 'low' | 'moderate' | 'high' | 'very_high';
  top_10_bots_share_pct: number;
  competition_intensity: 'low' | 'medium' | 'high' | 'extreme';
}

// ============================================================================
// MarketTrendCalculator
// ============================================================================

export class MarketTrendCalculator {
  private static instance: MarketTrendCalculator;

  private constructor() {}

  public static getInstance(): MarketTrendCalculator {
    if (!MarketTrendCalculator.instance) {
      MarketTrendCalculator.instance = new MarketTrendCalculator();
    }
    return MarketTrendCalculator.instance;
  }

  /**
   * Calculate daily market trend
   */
  public async calculateTrend(chainId: string, date: Date): Promise<MarketTrend> {
    // Aggregate from mev_profit_attribution
    const result = await query<any>(
      `
      WITH daily_data AS (
        SELECT 
          chain_id,
          date,
          opportunity_type,
          net_profit_usd,
          gas_cost_usd,
          bot_address,
          protocol_id,
          primary_token_symbol
        FROM mev_profit_attribution
        WHERE chain_id = $1 AND date = $2
      ),
      aggregated AS (
        SELECT 
          chain_id,
          date,
          SUM(net_profit_usd) as total_volume,
          COUNT(*) as total_opps,
          COUNT(DISTINCT bot_address) as unique_bots,
          SUM(gas_cost_usd) as total_gas,
          AVG(net_profit_usd) as avg_profit,
          MAX(net_profit_usd) as max_profit,
          MIN(net_profit_usd) as min_profit,
          -- Opportunity distribution
          COUNT(CASE WHEN opportunity_type = 'sandwich' THEN 1 END) as sandwich_count,
          SUM(CASE WHEN opportunity_type = 'sandwich' THEN net_profit_usd ELSE 0 END) as sandwich_volume,
          COUNT(CASE WHEN opportunity_type = 'frontrun' THEN 1 END) as frontrun_count,
          SUM(CASE WHEN opportunity_type = 'frontrun' THEN net_profit_usd ELSE 0 END) as frontrun_volume,
          COUNT(CASE WHEN opportunity_type = 'backrun' THEN 1 END) as backrun_count,
          SUM(CASE WHEN opportunity_type = 'backrun' THEN net_profit_usd ELSE 0 END) as backrun_volume,
          COUNT(CASE WHEN opportunity_type = 'arbitrage' THEN 1 END) as arbitrage_count,
          SUM(CASE WHEN opportunity_type = 'arbitrage' THEN net_profit_usd ELSE 0 END) as arbitrage_volume,
          COUNT(CASE WHEN opportunity_type = 'liquidation' THEN 1 END) as liquidation_count,
          SUM(CASE WHEN opportunity_type = 'liquidation' THEN net_profit_usd ELSE 0 END) as liquidation_volume
        FROM daily_data
        GROUP BY chain_id, date
      ),
      top_protocols AS (
        SELECT protocol_id, SUM(net_profit_usd) as volume
        FROM daily_data
        WHERE protocol_id IS NOT NULL
        GROUP BY protocol_id
        ORDER BY volume DESC
        LIMIT 5
      ),
      top_tokens AS (
        SELECT primary_token_symbol, SUM(net_profit_usd) as volume
        FROM daily_data
        WHERE primary_token_symbol IS NOT NULL
        GROUP BY primary_token_symbol
        ORDER BY volume DESC
        LIMIT 5
      )
      SELECT 
        a.*,
        ARRAY_AGG(DISTINCT tp.protocol_id ORDER BY tp.volume DESC) FILTER (WHERE tp.protocol_id IS NOT NULL) as top_protocol_ids,
        ARRAY_AGG(DISTINCT tp.volume ORDER BY tp.volume DESC) FILTER (WHERE tp.volume IS NOT NULL) as top_protocol_volumes,
        ARRAY_AGG(DISTINCT tt.primary_token_symbol ORDER BY tt.volume DESC) FILTER (WHERE tt.primary_token_symbol IS NOT NULL) as top_token_symbols,
        ARRAY_AGG(DISTINCT tt.volume ORDER BY tt.volume DESC) FILTER (WHERE tt.volume IS NOT NULL) as top_token_volumes
      FROM aggregated a
      LEFT JOIN top_protocols tp ON true
      LEFT JOIN top_tokens tt ON true
      GROUP BY a.chain_id, a.date, a.total_volume, a.total_opps, a.unique_bots, a.total_gas,
               a.avg_profit, a.max_profit, a.min_profit,
               a.sandwich_count, a.sandwich_volume, a.frontrun_count, a.frontrun_volume,
               a.backrun_count, a.backrun_volume, a.arbitrage_count, a.arbitrage_volume,
               a.liquidation_count, a.liquidation_volume
      `,
      [chainId, date]
    );

    if (result.rows.length === 0) {
      throw new Error(`No data found for chain ${chainId} on ${date}`);
    }

    const row = result.rows[0];
    const totalVolume = parseFloat(row.total_volume);
    const totalOpps = parseInt(row.total_opps, 10);

    // Calculate bot competition metrics
    const botCompetition = await this.calculateBotCompetition(chainId, date);

    // Build top protocols array
    const topProtocols = (row.top_protocol_ids || []).map((id: string, i: number) => ({
      protocol_id: id,
      volume_usd: parseFloat((row.top_protocol_volumes || [])[i] || '0'),
    }));

    // Build top tokens array
    const topTokens = (row.top_token_symbols || []).map((symbol: string, i: number) => ({
      token_symbol: symbol,
      volume_usd: parseFloat((row.top_token_volumes || [])[i] || '0'),
    }));

    return {
      date,
      chain_id: chainId,
      total_mev_volume_usd: totalVolume,
      total_opportunities: totalOpps,
      total_executed_opportunities: totalOpps, // All in attribution are executed
      execution_rate_pct: 100,
      sandwich_count: parseInt(row.sandwich_count, 10),
      sandwich_volume_usd: parseFloat(row.sandwich_volume),
      sandwich_share_pct: (parseFloat(row.sandwich_volume) / totalVolume) * 100,
      frontrun_count: parseInt(row.frontrun_count, 10),
      frontrun_volume_usd: parseFloat(row.frontrun_volume),
      frontrun_share_pct: (parseFloat(row.frontrun_volume) / totalVolume) * 100,
      backrun_count: parseInt(row.backrun_count, 10),
      backrun_volume_usd: parseFloat(row.backrun_volume),
      backrun_share_pct: (parseFloat(row.backrun_volume) / totalVolume) * 100,
      arbitrage_count: parseInt(row.arbitrage_count, 10),
      arbitrage_volume_usd: parseFloat(row.arbitrage_volume),
      arbitrage_share_pct: (parseFloat(row.arbitrage_volume) / totalVolume) * 100,
      liquidation_count: parseInt(row.liquidation_count, 10),
      liquidation_volume_usd: parseFloat(row.liquidation_volume),
      liquidation_share_pct: (parseFloat(row.liquidation_volume) / totalVolume) * 100,
      avg_profit_per_opportunity_usd: parseFloat(row.avg_profit),
      median_profit_usd: 0, // TODO: Calculate median
      max_profit_usd: parseFloat(row.max_profit),
      min_profit_usd: parseFloat(row.min_profit),
      unique_bots: botCompetition.unique_bots,
      new_bots: botCompetition.new_bots,
      active_bots: botCompetition.active_bots,
      bot_concentration_hhi: botCompetition.bot_concentration_hhi,
      top_10_bots_share_pct: botCompetition.top_10_bots_share_pct,
      avg_gas_price_gwei: 0, // TODO: Calculate from gas data
      avg_priority_fee_gwei: 0, // TODO: Calculate from gas data
      total_gas_spent_usd: parseFloat(row.total_gas),
      top_protocols: topProtocols,
      top_tokens: topTokens,
    };
  }

  /**
   * Calculate bot competition metrics
   */
  private async calculateBotCompetition(chainId: string, date: Date): Promise<BotCompetition> {
    const analyzer = BotCompetitionAnalyzer.getInstance();
    return await analyzer.analyzeCompetition(chainId, date);
  }

  /**
   * Save trend to database
   */
  public async saveTrend(trend: MarketTrend): Promise<void> {
    await query(
      `
      INSERT INTO mev_market_trends (
        date, chain_id,
        total_mev_volume_usd, total_opportunities, total_executed_opportunities, execution_rate_pct,
        sandwich_count, sandwich_volume_usd, sandwich_share_pct,
        frontrun_count, frontrun_volume_usd, frontrun_share_pct,
        backrun_count, backrun_volume_usd, backrun_share_pct,
        arbitrage_count, arbitrage_volume_usd, arbitrage_share_pct,
        liquidation_count, liquidation_volume_usd, liquidation_share_pct,
        avg_profit_per_opportunity_usd, median_profit_usd, max_profit_usd, min_profit_usd,
        unique_bots, new_bots, active_bots, bot_concentration_hhi, top_10_bots_share_pct,
        avg_gas_price_gwei, avg_priority_fee_gwei, total_gas_spent_usd,
        top_protocol_1_id, top_protocol_1_volume_usd,
        top_protocol_2_id, top_protocol_2_volume_usd,
        top_protocol_3_id, top_protocol_3_volume_usd,
        top_protocol_4_id, top_protocol_4_volume_usd,
        top_protocol_5_id, top_protocol_5_volume_usd,
        top_token_1_symbol, top_token_1_volume_usd,
        top_token_2_symbol, top_token_2_volume_usd,
        top_token_3_symbol, top_token_3_volume_usd,
        top_token_4_symbol, top_token_4_volume_usd,
        top_token_5_symbol, top_token_5_volume_usd
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24, $25,
        $26, $27, $28, $29, $30,
        $31, $32, $33,
        $34, $35, $36, $37, $38, $39, $40, $41, $42, $43,
        $44, $45, $46, $47, $48, $49, $50, $51, $52, $53
      )
      ON CONFLICT (date, chain_id)
      DO UPDATE SET
        total_mev_volume_usd = EXCLUDED.total_mev_volume_usd,
        total_opportunities = EXCLUDED.total_opportunities,
        sandwich_count = EXCLUDED.sandwich_count,
        sandwich_volume_usd = EXCLUDED.sandwich_volume_usd,
        updated_at = NOW()
      `,
      [
        trend.date,
        trend.chain_id,
        trend.total_mev_volume_usd,
        trend.total_opportunities,
        trend.total_executed_opportunities,
        trend.execution_rate_pct,
        trend.sandwich_count,
        trend.sandwich_volume_usd,
        trend.sandwich_share_pct,
        trend.frontrun_count,
        trend.frontrun_volume_usd,
        trend.frontrun_share_pct,
        trend.backrun_count,
        trend.backrun_volume_usd,
        trend.backrun_share_pct,
        trend.arbitrage_count,
        trend.arbitrage_volume_usd,
        trend.arbitrage_share_pct,
        trend.liquidation_count,
        trend.liquidation_volume_usd,
        trend.liquidation_share_pct,
        trend.avg_profit_per_opportunity_usd,
        trend.median_profit_usd,
        trend.max_profit_usd,
        trend.min_profit_usd,
        trend.unique_bots,
        trend.new_bots,
        trend.active_bots,
        trend.bot_concentration_hhi,
        trend.top_10_bots_share_pct,
        trend.avg_gas_price_gwei,
        trend.avg_priority_fee_gwei,
        trend.total_gas_spent_usd,
        trend.top_protocols[0]?.protocol_id || null,
        trend.top_protocols[0]?.volume_usd || 0,
        trend.top_protocols[1]?.protocol_id || null,
        trend.top_protocols[1]?.volume_usd || 0,
        trend.top_protocols[2]?.protocol_id || null,
        trend.top_protocols[2]?.volume_usd || 0,
        trend.top_protocols[3]?.protocol_id || null,
        trend.top_protocols[3]?.volume_usd || 0,
        trend.top_protocols[4]?.protocol_id || null,
        trend.top_protocols[4]?.volume_usd || 0,
        trend.top_tokens[0]?.token_symbol || null,
        trend.top_tokens[0]?.volume_usd || 0,
        trend.top_tokens[1]?.token_symbol || null,
        trend.top_tokens[1]?.volume_usd || 0,
        trend.top_tokens[2]?.token_symbol || null,
        trend.top_tokens[2]?.volume_usd || 0,
        trend.top_tokens[3]?.token_symbol || null,
        trend.top_tokens[3]?.volume_usd || 0,
        trend.top_tokens[4]?.token_symbol || null,
        trend.top_tokens[4]?.volume_usd || 0,
      ]
    );
  }
}

// ============================================================================
// OpportunityDistributionAnalyzer
// ============================================================================

export class OpportunityDistributionAnalyzer {
  private static instance: OpportunityDistributionAnalyzer;

  private constructor() {}

  public static getInstance(): OpportunityDistributionAnalyzer {
    if (!OpportunityDistributionAnalyzer.instance) {
      OpportunityDistributionAnalyzer.instance = new OpportunityDistributionAnalyzer();
    }
    return OpportunityDistributionAnalyzer.instance;
  }

  /**
   * Analyze opportunity distribution from market trend
   */
  public analyzeDistribution(trend: MarketTrend): OpportunityDistribution[] {
    const distribution: OpportunityDistribution[] = [
      {
        opportunity_type: 'sandwich',
        count: trend.sandwich_count,
        volume_usd: trend.sandwich_volume_usd,
        share_pct: trend.sandwich_share_pct,
        avg_profit_usd: trend.sandwich_count > 0 ? trend.sandwich_volume_usd / trend.sandwich_count : 0,
      },
      {
        opportunity_type: 'frontrun',
        count: trend.frontrun_count,
        volume_usd: trend.frontrun_volume_usd,
        share_pct: trend.frontrun_share_pct,
        avg_profit_usd: trend.frontrun_count > 0 ? trend.frontrun_volume_usd / trend.frontrun_count : 0,
      },
      {
        opportunity_type: 'backrun',
        count: trend.backrun_count,
        volume_usd: trend.backrun_volume_usd,
        share_pct: trend.backrun_share_pct,
        avg_profit_usd: trend.backrun_count > 0 ? trend.backrun_volume_usd / trend.backrun_count : 0,
      },
      {
        opportunity_type: 'arbitrage',
        count: trend.arbitrage_count,
        volume_usd: trend.arbitrage_volume_usd,
        share_pct: trend.arbitrage_share_pct,
        avg_profit_usd: trend.arbitrage_count > 0 ? trend.arbitrage_volume_usd / trend.arbitrage_count : 0,
      },
      {
        opportunity_type: 'liquidation',
        count: trend.liquidation_count,
        volume_usd: trend.liquidation_volume_usd,
        share_pct: trend.liquidation_share_pct,
        avg_profit_usd: trend.liquidation_count > 0 ? trend.liquidation_volume_usd / trend.liquidation_count : 0,
      },
    ];

    return distribution.filter((d) => d.volume_usd > 0).sort((a, b) => b.volume_usd - a.volume_usd);
  }
}

// ============================================================================
// BotCompetitionAnalyzer
// ============================================================================

export class BotCompetitionAnalyzer {
  private static instance: BotCompetitionAnalyzer;

  private constructor() {}

  public static getInstance(): BotCompetitionAnalyzer {
    if (!BotCompetitionAnalyzer.instance) {
      BotCompetitionAnalyzer.instance = new BotCompetitionAnalyzer();
    }
    return BotCompetitionAnalyzer.instance;
  }

  /**
   * Analyze bot competition for a specific date
   */
  public async analyzeCompetition(chainId: string, date: Date): Promise<BotCompetition> {
    // Get bot market shares
    const result = await query<{ bot_address: string; volume: string; share: string }>(
      `
      WITH bot_volumes AS (
        SELECT 
          bot_address,
          SUM(net_profit_usd) as volume
        FROM mev_profit_attribution
        WHERE chain_id = $1 AND date = $2
        GROUP BY bot_address
      ),
      total_volume AS (
        SELECT SUM(volume) as total FROM bot_volumes
      ),
      bot_shares AS (
        SELECT 
          bv.bot_address,
          bv.volume,
          (bv.volume / NULLIF(tv.total, 0) * 100) as share
        FROM bot_volumes bv
        CROSS JOIN total_volume tv
      )
      SELECT * FROM bot_shares
      ORDER BY volume DESC
      `,
      [chainId, date]
    );

    const botShares = result.rows.map((row) => ({
      bot_address: row.bot_address,
      volume: parseFloat(row.volume),
      share: parseFloat(row.share),
    }));

    // Calculate HHI (Herfindahl-Hirschman Index)
    const hhi = botShares.reduce((sum, bot) => sum + Math.pow(bot.share, 2), 0);

    // Calculate top 10 bots share
    const top10Share = botShares.slice(0, 10).reduce((sum, bot) => sum + bot.share, 0);

    // Determine concentration level
    const concentrationLevel = this.determineConcentrationLevel(hhi);

    // Determine competition intensity
    const competitionIntensity = this.determineCompetitionIntensity(botShares.length, hhi);

    return {
      unique_bots: botShares.length,
      active_bots: botShares.length,
      new_bots: 0, // TODO: Calculate from historical data
      bot_concentration_hhi: hhi,
      concentration_level: concentrationLevel,
      top_10_bots_share_pct: top10Share,
      competition_intensity: competitionIntensity,
    };
  }

  /**
   * Determine concentration level from HHI
   */
  private determineConcentrationLevel(hhi: number): 'low' | 'moderate' | 'high' | 'very_high' {
    if (hhi < 1500) return 'low'; // Competitive market
    if (hhi < 2500) return 'moderate'; // Moderately concentrated
    if (hhi < 5000) return 'high'; // Highly concentrated
    return 'very_high'; // Very highly concentrated / monopolistic
  }

  /**
   * Determine competition intensity
   */
  private determineCompetitionIntensity(
    botCount: number,
    hhi: number
  ): 'low' | 'medium' | 'high' | 'extreme' {
    // High bot count + low HHI = extreme competition
    if (botCount >= 100 && hhi < 1500) return 'extreme';
    if (botCount >= 50 && hhi < 2500) return 'high';
    if (botCount >= 20 && hhi < 5000) return 'medium';
    return 'low';
  }
}

