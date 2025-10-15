/**
 * Yield Opportunity Engine
 * Story: 2.1.2 - Yield Opportunity Scanner
 * 
 * Queries yield opportunities with filters, sorting, and pagination
 */

import { query } from '../db/connection';
import { riskScoringEngine } from './risk-scoring-engine';

export interface YieldOpportunity {
  id: string;
  protocolId: string;
  poolId: string;
  chainId: string;
  poolName: string;
  poolType: 'lending' | 'staking' | 'lp' | 'farming';
  tokenSymbols: string[];
  apy: number;
  apr?: number;
  baseApy?: number;
  rewardApy?: number;
  autoCompound: boolean;
  tvl: number;
  volume24h?: number;
  volume7d?: number;
  riskScore: number;
  riskCategory: 'low' | 'medium' | 'high';
  auditStatus: string;
  protocolAgeDays: number;
  yieldVolatility?: number;
  yieldStabilityScore?: number;
  lastUpdated: Date;
}

export interface YieldOpportunityFilters {
  chains?: string[];
  protocols?: string[];
  poolTypes?: ('lending' | 'staking' | 'lp' | 'farming')[];
  minApy?: number;
  maxRiskScore?: number;
  minTvl?: number;
  riskCategories?: ('low' | 'medium' | 'high')[];
}

export interface YieldOpportunitySortOptions {
  sortBy?: 'apy' | 'risk_adjusted_yield' | 'tvl' | 'volume_24h' | 'risk_score';
  sortOrder?: 'asc' | 'desc';
}

export interface YieldOpportunityPagination {
  page?: number;
  pageSize?: number;
}

export interface YieldOpportunityResult {
  opportunities: YieldOpportunity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class YieldOpportunityEngine {
  private static instance: YieldOpportunityEngine;

  private constructor() {}

  public static getInstance(): YieldOpportunityEngine {
    if (!YieldOpportunityEngine.instance) {
      YieldOpportunityEngine.instance = new YieldOpportunityEngine();
    }
    return YieldOpportunityEngine.instance;
  }

  /**
   * Get yield opportunities with filters, sorting, and pagination
   */
  public async getOpportunities(
    filters: YieldOpportunityFilters = {},
    sortOptions: YieldOpportunitySortOptions = {},
    pagination: YieldOpportunityPagination = {}
  ): Promise<YieldOpportunityResult> {
    const {
      chains,
      protocols,
      poolTypes,
      minApy,
      maxRiskScore,
      minTvl,
      riskCategories,
    } = filters;

    const { sortBy = 'apy', sortOrder = 'desc' } = sortOptions;
    const { page = 1, pageSize = 20 } = pagination;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (chains && chains.length > 0) {
      conditions.push(`chain_id = ANY($${paramIndex})`);
      params.push(chains);
      paramIndex++;
    }

    if (protocols && protocols.length > 0) {
      conditions.push(`protocol_id = ANY($${paramIndex})`);
      params.push(protocols);
      paramIndex++;
    }

    if (poolTypes && poolTypes.length > 0) {
      conditions.push(`pool_type = ANY($${paramIndex})`);
      params.push(poolTypes);
      paramIndex++;
    }

    if (minApy !== undefined) {
      conditions.push(`apy >= $${paramIndex}`);
      params.push(minApy);
      paramIndex++;
    }

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

    if (riskCategories && riskCategories.length > 0) {
      conditions.push(`risk_category = ANY($${paramIndex})`);
      params.push(riskCategories);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderByClause = '';
    if (sortBy === 'risk_adjusted_yield') {
      // Calculate risk-adjusted yield on the fly
      orderByClause = `ORDER BY (apy * (1 - risk_score / 100.0)) ${sortOrder.toUpperCase()}`;
    } else {
      orderByClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM yield_opportunities ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Calculate pagination
    const offset = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    // Get opportunities
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
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageSize, offset]
    );

    const opportunities: YieldOpportunity[] = result.rows.map(row => ({
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

    return {
      opportunities,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get a single yield opportunity by ID
   */
  public async getOpportunityById(id: string): Promise<YieldOpportunity | null> {
    const result = await query<any>(
      `SELECT 
        id, protocol_id, pool_id, chain_id, pool_name, pool_type, token_symbols,
        apy, apr, base_apy, reward_apy, auto_compound,
        tvl, volume_24h, volume_7d,
        risk_score, risk_category, audit_status, protocol_age_days,
        yield_volatility, yield_stability_score, last_updated
       FROM yield_opportunities
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
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
    };
  }

  /**
   * Get summary statistics
   */
  public async getSummaryStats(): Promise<{
    totalOpportunities: number;
    avgApy: number;
    maxApy: number;
    totalTvl: number;
    byPoolType: Record<string, number>;
    byRiskCategory: Record<string, number>;
  }> {
    const result = await query<any>(
      `SELECT 
        COUNT(*) as total_opportunities,
        AVG(apy) as avg_apy,
        MAX(apy) as max_apy,
        SUM(tvl) as total_tvl,
        pool_type,
        risk_category
       FROM yield_opportunities
       GROUP BY pool_type, risk_category`
    );

    const byPoolType: Record<string, number> = {};
    const byRiskCategory: Record<string, number> = {};
    let totalOpportunities = 0;
    let totalTvl = 0;
    let sumApy = 0;
    let maxApy = 0;

    result.rows.forEach(row => {
      const count = parseInt(row.total_opportunities, 10);
      totalOpportunities += count;
      totalTvl += parseFloat(row.total_tvl || '0');
      sumApy += parseFloat(row.avg_apy || '0') * count;
      maxApy = Math.max(maxApy, parseFloat(row.max_apy || '0'));

      byPoolType[row.pool_type] = (byPoolType[row.pool_type] || 0) + count;
      byRiskCategory[row.risk_category] = (byRiskCategory[row.risk_category] || 0) + count;
    });

    return {
      totalOpportunities,
      avgApy: totalOpportunities > 0 ? sumApy / totalOpportunities : 0,
      maxApy,
      totalTvl,
      byPoolType,
      byRiskCategory,
    };
  }
}

// Export singleton instance
export const yieldOpportunityEngine = YieldOpportunityEngine.getInstance();

