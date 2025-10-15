/**
 * Yield Ranking Engine
 * Story: 2.1.2 - Yield Opportunity Scanner
 * 
 * Ranks yield opportunities by various criteria
 */

import { query } from '../db/connection';
import { YieldOpportunity } from './yield-opportunity-engine';

export type RankingCategory = 'highest_apy' | 'best_risk_adjusted' | 'most_stable' | 'trending_up';

export class YieldRankingEngine {
  private static instance: YieldRankingEngine;

  private constructor() {}

  public static getInstance(): YieldRankingEngine {
    if (!YieldRankingEngine.instance) {
      YieldRankingEngine.instance = new YieldRankingEngine();
    }
    return YieldRankingEngine.instance;
  }

  /**
   * Get top opportunities by category
   */
  public async getTopOpportunities(
    category: RankingCategory,
    limit: number = 10,
    filters: {
      maxRiskScore?: number;
      minTvl?: number;
      poolTypes?: string[];
      chains?: string[];
    } = {}
  ): Promise<YieldOpportunity[]> {
    const { maxRiskScore, minTvl, poolTypes, chains } = filters;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (maxRiskScore !== undefined) {
      conditions.push(`risk_score <= $${paramIndex}`);
      params.push(maxRiskScore);
      paramIndex++;
    }

    if (minTvl !== undefined) {
      conditions.push(`tvl >= $${paramIndex}`);
      params.push(minTvl);
      paramIndex++;
    }

    if (poolTypes && poolTypes.length > 0) {
      conditions.push(`pool_type = ANY($${paramIndex})`);
      params.push(poolTypes);
      paramIndex++;
    }

    if (chains && chains.length > 0) {
      conditions.push(`chain_id = ANY($${paramIndex})`);
      params.push(chains);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause based on category
    let orderByClause = '';
    switch (category) {
      case 'highest_apy':
        orderByClause = 'ORDER BY apy DESC';
        break;
      case 'best_risk_adjusted':
        // Risk-adjusted yield = APY * (1 - risk_score/100)
        orderByClause = 'ORDER BY (apy * (1 - risk_score / 100.0)) DESC';
        break;
      case 'most_stable':
        // Higher stability score = more stable
        orderByClause = 'ORDER BY yield_stability_score DESC NULLS LAST, apy DESC';
        break;
      case 'trending_up':
        // For MVP, use APY as proxy (in production, would calculate from history)
        orderByClause = 'ORDER BY apy DESC';
        break;
      default:
        orderByClause = 'ORDER BY apy DESC';
    }

    params.push(limit);
    const result = await query<any>(
      `SELECT 
        id, protocol_id, pool_id, chain_id, pool_name, pool_type, token_symbols,
        apy, apr, base_apy, reward_apy, auto_compound,
        tvl, volume_24h, volume_7d,
        risk_score, risk_category, audit_status, protocol_age_days,
        yield_volatility, yield_stability_score, last_updated
       FROM yield_opportunities
       ${whereClause}
       ${orderByClause}
       LIMIT $${paramIndex}`,
      params
    );

    return result.rows.map(row => ({
      id: row.id,
      protocolId: row.protocol_id,
      poolId: row.pool_id,
      chainId: row.chain_id,
      poolName: row.pool_name,
      poolType: row.pool_type,
      tokenSymbols: row.token_symbols || [],
      apy: parseFloat(row.apy),
      apr: row.apr ? parseFloat(row.apr) : undefined,
      baseApy: row.base_apy ? parseFloat(row.base_apy) : undefined,
      rewardApy: row.reward_apy ? parseFloat(row.reward_apy) : undefined,
      autoCompound: row.auto_compound,
      tvl: parseFloat(row.tvl),
      volume24h: row.volume_24h ? parseFloat(row.volume_24h) : undefined,
      volume7d: row.volume_7d ? parseFloat(row.volume_7d) : undefined,
      riskScore: row.risk_score,
      riskCategory: row.risk_category,
      auditStatus: row.audit_status,
      protocolAgeDays: row.protocol_age_days,
      yieldVolatility: row.yield_volatility ? parseFloat(row.yield_volatility) : undefined,
      yieldStabilityScore: row.yield_stability_score ? parseFloat(row.yield_stability_score) : undefined,
      lastUpdated: new Date(row.last_updated),
    }));
  }

  /**
   * Get opportunities by multiple categories
   */
  public async getTopByAllCategories(
    limit: number = 5,
    filters: {
      maxRiskScore?: number;
      minTvl?: number;
    } = {}
  ): Promise<Record<RankingCategory, YieldOpportunity[]>> {
    const categories: RankingCategory[] = ['highest_apy', 'best_risk_adjusted', 'most_stable', 'trending_up'];
    
    const results = await Promise.all(
      categories.map(category => this.getTopOpportunities(category, limit, filters))
    );

    return {
      highest_apy: results[0],
      best_risk_adjusted: results[1],
      most_stable: results[2],
      trending_up: results[3],
    };
  }
}

// Export singleton instance
export const yieldRankingEngine = YieldRankingEngine.getInstance();

