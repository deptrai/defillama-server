/**
 * Liquidity Migration Engine
 * Story: 2.1.3 - Liquidity Analysis Tools
 * 
 * Tracks and analyzes liquidity flows between protocols,
 * identifies migration patterns, causes, and TVL impacts.
 */

import { query } from '../db/connection';

// ============================================================================
// Types
// ============================================================================

export interface Migration {
  id: string;
  fromProtocolId: string;
  toProtocolId: string;
  chainId: string;
  walletAddress: string;
  amountUsd: number;
  tokenSymbols: string[];
  migrationTimestamp: Date;
  timeBetweenExitEntry: number; // minutes
  reason: string;
  fromApy: number;
  toApy: number;
  apyDifference: number;
  fromTvl: number;
  toTvl: number;
  isCompleteExit: boolean;
  migrationPct: number;
}

export interface MigrationFlow {
  fromProtocolId: string;
  toProtocolId: string;
  chainId: string;
  migrationCount: number;
  totalAmount: number;
  averageAmount: number;
  averageApyDifference: number;
}

export interface MigrationCause {
  reason: string;
  count: number;
  totalAmount: number;
  averageApyDifference: number;
  successRate: number; // % with positive APY difference
}

export interface TVLImpact {
  protocolId: string;
  timeRange: string;
  totalInflows: number;
  totalOutflows: number;
  netChange: number;
  impactPct: number;
  migrationCount: number;
}

export interface SignificantMigration {
  migration: Migration;
  significance: 'large_amount' | 'sudden_spike' | 'protocol_exodus';
  impactScore: number; // 0-100
}

export interface MigrationFilters {
  fromProtocolId?: string;
  toProtocolId?: string;
  chainId?: string;
  walletAddress?: string;
  reason?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  sortBy?: 'timestamp' | 'amount' | 'apy_difference';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ============================================================================
// Liquidity Migration Engine
// ============================================================================

export class LiquidityMigrationEngine {
  private static instance: LiquidityMigrationEngine;

  private constructor() {}

  public static getInstance(): LiquidityMigrationEngine {
    if (!LiquidityMigrationEngine.instance) {
      LiquidityMigrationEngine.instance = new LiquidityMigrationEngine();
    }
    return LiquidityMigrationEngine.instance;
  }

  /**
   * Get migration events with filters
   */
  public async getMigrations(filters: MigrationFilters = {}): Promise<Migration[]> {
    const {
      fromProtocolId,
      toProtocolId,
      chainId,
      walletAddress,
      reason,
      startDate,
      endDate,
      minAmount,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      limit = 100,
      offset = 0,
    } = filters;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (fromProtocolId) {
      conditions.push(`from_protocol_id = $${paramIndex++}`);
      params.push(fromProtocolId);
    }

    if (toProtocolId) {
      conditions.push(`to_protocol_id = $${paramIndex++}`);
      params.push(toProtocolId);
    }

    if (chainId) {
      conditions.push(`chain_id = $${paramIndex++}`);
      params.push(chainId);
    }

    if (walletAddress) {
      conditions.push(`wallet_address = $${paramIndex++}`);
      params.push(walletAddress);
    }

    if (reason) {
      conditions.push(`reason = $${paramIndex++}`);
      params.push(reason);
    }

    if (startDate) {
      conditions.push(`migration_timestamp >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`migration_timestamp <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (minAmount) {
      conditions.push(`amount_usd >= $${paramIndex++}`);
      params.push(minAmount);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortColumn = {
      timestamp: 'migration_timestamp',
      amount: 'amount_usd',
      apy_difference: 'apy_difference',
    }[sortBy];

    const result = await query<any>(
      `SELECT 
        id,
        from_protocol_id as "fromProtocolId",
        to_protocol_id as "toProtocolId",
        chain_id as "chainId",
        wallet_address as "walletAddress",
        amount_usd::FLOAT as "amountUsd",
        token_symbols as "tokenSymbols",
        migration_timestamp as "migrationTimestamp",
        COALESCE(time_between_exit_entry, 0) as "timeBetweenExitEntry",
        COALESCE(reason, 'other') as reason,
        COALESCE(from_apy, 0)::FLOAT as "fromApy",
        COALESCE(to_apy, 0)::FLOAT as "toApy",
        COALESCE(apy_difference, 0)::FLOAT as "apyDifference",
        COALESCE(from_tvl, 0)::FLOAT as "fromTvl",
        COALESCE(to_tvl, 0)::FLOAT as "toTvl",
        COALESCE(is_complete_exit, true) as "isCompleteExit",
        COALESCE(migration_pct, 1.0)::FLOAT as "migrationPct"
      FROM liquidity_migrations
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return result.rows;
  }

  /**
   * Analyze migration flows between protocols
   */
  public async analyzeMigrationFlows(days: number = 30): Promise<MigrationFlow[]> {
    const result = await query<any>(
      `SELECT 
        from_protocol_id as "fromProtocolId",
        to_protocol_id as "toProtocolId",
        chain_id as "chainId",
        COUNT(*)::INT as "migrationCount",
        SUM(amount_usd)::FLOAT as "totalAmount",
        AVG(amount_usd)::FLOAT as "averageAmount",
        AVG(apy_difference)::FLOAT as "averageApyDifference"
      FROM liquidity_migrations
      WHERE migration_timestamp >= NOW() - INTERVAL '${days} days'
      GROUP BY from_protocol_id, to_protocol_id, chain_id
      ORDER BY "totalAmount" DESC`,
      []
    );

    return result.rows;
  }

  /**
   * Analyze migration causes
   */
  public async getMigrationCauses(days: number = 30): Promise<MigrationCause[]> {
    const result = await query<any>(
      `SELECT 
        COALESCE(reason, 'other') as reason,
        COUNT(*)::INT as count,
        SUM(amount_usd)::FLOAT as "totalAmount",
        AVG(apy_difference)::FLOAT as "averageApyDifference",
        (COUNT(*) FILTER (WHERE apy_difference > 0)::FLOAT / COUNT(*)::FLOAT * 100) as "successRate"
      FROM liquidity_migrations
      WHERE migration_timestamp >= NOW() - INTERVAL '${days} days'
      GROUP BY reason
      ORDER BY count DESC`,
      []
    );

    return result.rows;
  }

  /**
   * Calculate TVL impact for a protocol
   */
  public async calculateTVLImpact(protocolId: string, days: number = 30): Promise<TVLImpact> {
    const result = await query<any>(
      `SELECT 
        $1 as "protocolId",
        $2::TEXT as "timeRange",
        COALESCE(SUM(amount_usd) FILTER (WHERE to_protocol_id = $1), 0)::FLOAT as "totalInflows",
        COALESCE(SUM(amount_usd) FILTER (WHERE from_protocol_id = $1), 0)::FLOAT as "totalOutflows",
        COUNT(*) FILTER (WHERE to_protocol_id = $1 OR from_protocol_id = $1)::INT as "migrationCount"
      FROM liquidity_migrations
      WHERE (from_protocol_id = $1 OR to_protocol_id = $1)
        AND migration_timestamp >= NOW() - INTERVAL '${days} days'`,
      [protocolId, `${days} days`]
    );

    const data = result.rows[0];
    const netChange = data.totalInflows - data.totalOutflows;

    // Calculate impact percentage (relative to outflows if any, otherwise 100%)
    const impactPct = data.totalOutflows > 0 
      ? (netChange / data.totalOutflows) * 100 
      : (data.totalInflows > 0 ? 100 : 0);

    return {
      ...data,
      netChange,
      impactPct,
    };
  }

  /**
   * Detect significant migrations
   */
  public async detectSignificantMigrations(thresholdUsd: number = 100000): Promise<SignificantMigration[]> {
    // Get large migrations
    const largeMigrations = await this.getMigrations({
      minAmount: thresholdUsd,
      sortBy: 'amount',
      sortOrder: 'desc',
      limit: 10,
    });

    return largeMigrations.map(migration => {
      // Calculate impact score based on amount
      const impactScore = Math.min((migration.amountUsd / thresholdUsd) * 50, 100);

      return {
        migration,
        significance: 'large_amount' as const,
        impactScore,
      };
    });
  }
}

// Export singleton instance
export const liquidityMigrationEngine = LiquidityMigrationEngine.getInstance();

