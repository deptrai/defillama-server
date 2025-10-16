/**
 * Protocol Leakage Analyzers
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Three analyzers for protocol MEV leakage:
 * 1. ProtocolLeakageCalculator - Calculate daily MEV leakage per protocol
 * 2. LeakageBreakdownAnalyzer - Analyze MEV breakdown by type
 * 3. UserImpactCalculator - Calculate user losses from MEV
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

export type LeakageSeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Protocol Leakage Types
// ============================================================================

export interface ProtocolLeakage {
  protocol_id: string;
  protocol_name: string;
  chain_id: string;
  date: Date;

  // Total MEV metrics
  total_mev_extracted_usd: number;
  total_transactions: number;
  total_affected_transactions: number;
  affected_transaction_pct: number;

  // MEV breakdown by type
  sandwich_mev_usd: number;
  sandwich_count: number;
  frontrun_mev_usd: number;
  frontrun_count: number;
  backrun_mev_usd: number;
  backrun_count: number;
  arbitrage_mev_usd: number;
  arbitrage_count: number;
  liquidation_mev_usd: number;
  liquidation_count: number;

  // User impact
  total_user_loss_usd: number;
  avg_loss_per_affected_tx_usd: number;
  unique_affected_users: number;

  // Bot activity
  unique_bots: number;
  top_bot_address?: string;
  top_bot_extracted_usd: number;
  top_bot_share_pct: number;

  // Protocol context
  protocol_volume_usd: number;
  mev_to_volume_ratio_pct: number;

  // Severity
  leakage_severity: LeakageSeverity;
  leakage_score: number;
}

export interface LeakageBreakdown {
  opportunity_type: MEVOpportunityType;
  mev_extracted_usd: number;
  transaction_count: number;
  share_pct: number;
  avg_per_tx_usd: number;
}

export interface UserImpact {
  total_user_loss_usd: number;
  unique_affected_users: number;
  avg_loss_per_user_usd: number;
  avg_loss_per_tx_usd: number;
  max_loss_tx_usd: number;
  impact_severity: LeakageSeverity;
}

// ============================================================================
// ProtocolLeakageCalculator
// ============================================================================

export class ProtocolLeakageCalculator {
  private static instance: ProtocolLeakageCalculator;

  private constructor() {}

  public static getInstance(): ProtocolLeakageCalculator {
    if (!ProtocolLeakageCalculator.instance) {
      ProtocolLeakageCalculator.instance = new ProtocolLeakageCalculator();
    }
    return ProtocolLeakageCalculator.instance;
  }

  /**
   * Calculate daily MEV leakage for a protocol
   */
  public async calculateLeakage(
    protocolId: string,
    chainId: string,
    date: Date
  ): Promise<ProtocolLeakage> {
    // Aggregate MEV data from mev_profit_attribution
    const result = await query<any>(
      `
      WITH protocol_data AS (
        SELECT 
          protocol_id,
          protocol_name,
          chain_id,
          date,
          opportunity_type,
          net_profit_usd,
          victim_loss_usd,
          bot_address
        FROM mev_profit_attribution
        WHERE protocol_id = $1 AND chain_id = $2 AND date = $3
      ),
      aggregated AS (
        SELECT 
          protocol_id,
          protocol_name,
          chain_id,
          date,
          SUM(net_profit_usd) as total_mev,
          COUNT(*) as total_tx,
          COUNT(DISTINCT bot_address) as unique_bots,
          SUM(CASE WHEN opportunity_type = 'sandwich' THEN net_profit_usd ELSE 0 END) as sandwich_mev,
          COUNT(CASE WHEN opportunity_type = 'sandwich' THEN 1 END) as sandwich_count,
          SUM(CASE WHEN opportunity_type = 'frontrun' THEN net_profit_usd ELSE 0 END) as frontrun_mev,
          COUNT(CASE WHEN opportunity_type = 'frontrun' THEN 1 END) as frontrun_count,
          SUM(CASE WHEN opportunity_type = 'backrun' THEN net_profit_usd ELSE 0 END) as backrun_mev,
          COUNT(CASE WHEN opportunity_type = 'backrun' THEN 1 END) as backrun_count,
          SUM(CASE WHEN opportunity_type = 'arbitrage' THEN net_profit_usd ELSE 0 END) as arbitrage_mev,
          COUNT(CASE WHEN opportunity_type = 'arbitrage' THEN 1 END) as arbitrage_count,
          SUM(CASE WHEN opportunity_type = 'liquidation' THEN net_profit_usd ELSE 0 END) as liquidation_mev,
          COUNT(CASE WHEN opportunity_type = 'liquidation' THEN 1 END) as liquidation_count,
          SUM(COALESCE(victim_loss_usd, 0)) as total_user_loss
        FROM protocol_data
        GROUP BY protocol_id, protocol_name, chain_id, date
      ),
      top_bot AS (
        SELECT 
          bot_address,
          SUM(net_profit_usd) as bot_total
        FROM protocol_data
        GROUP BY bot_address
        ORDER BY bot_total DESC
        LIMIT 1
      )
      SELECT 
        a.*,
        tb.bot_address as top_bot_address,
        tb.bot_total as top_bot_extracted,
        (tb.bot_total / NULLIF(a.total_mev, 0) * 100) as top_bot_share
      FROM aggregated a
      LEFT JOIN top_bot tb ON true
      `,
      [protocolId, chainId, date]
    );

    if (result.rows.length === 0) {
      throw new Error(`No data found for protocol ${protocolId} on ${date}`);
    }

    const row = result.rows[0];
    const totalMev = parseFloat(row.total_mev);
    const totalTx = parseInt(row.total_tx, 10);

    // Calculate severity
    const { severity, score } = this.calculateSeverity(totalMev, totalTx, parseFloat(row.total_user_loss));

    return {
      protocol_id: protocolId,
      protocol_name: row.protocol_name,
      chain_id: chainId,
      date,
      total_mev_extracted_usd: totalMev,
      total_transactions: totalTx,
      total_affected_transactions: totalTx, // All MEV tx affect protocol
      affected_transaction_pct: 100, // TODO: Calculate from total protocol volume
      sandwich_mev_usd: parseFloat(row.sandwich_mev),
      sandwich_count: parseInt(row.sandwich_count, 10),
      frontrun_mev_usd: parseFloat(row.frontrun_mev),
      frontrun_count: parseInt(row.frontrun_count, 10),
      backrun_mev_usd: parseFloat(row.backrun_mev),
      backrun_count: parseInt(row.backrun_count, 10),
      arbitrage_mev_usd: parseFloat(row.arbitrage_mev),
      arbitrage_count: parseInt(row.arbitrage_count, 10),
      liquidation_mev_usd: parseFloat(row.liquidation_mev),
      liquidation_count: parseInt(row.liquidation_count, 10),
      total_user_loss_usd: parseFloat(row.total_user_loss),
      avg_loss_per_affected_tx_usd: totalTx > 0 ? parseFloat(row.total_user_loss) / totalTx : 0,
      unique_affected_users: 0, // TODO: Calculate from victim addresses
      unique_bots: parseInt(row.unique_bots, 10),
      top_bot_address: row.top_bot_address,
      top_bot_extracted_usd: parseFloat(row.top_bot_extracted || '0'),
      top_bot_share_pct: parseFloat(row.top_bot_share || '0'),
      protocol_volume_usd: 0, // TODO: Get from protocol volume data
      mev_to_volume_ratio_pct: 0, // TODO: Calculate when volume available
      leakage_severity: severity,
      leakage_score: score,
    };
  }

  /**
   * Calculate leakage severity and score
   */
  private calculateSeverity(
    totalMev: number,
    totalTx: number,
    totalUserLoss: number
  ): { severity: LeakageSeverity; score: number } {
    let score = 0;

    // Factor 1: Total MEV extracted (40 points)
    if (totalMev >= 1000000) score += 40; // $1M+
    else if (totalMev >= 100000) score += 30; // $100K+
    else if (totalMev >= 10000) score += 20; // $10K+
    else if (totalMev >= 1000) score += 10; // $1K+

    // Factor 2: Transaction count (30 points)
    if (totalTx >= 1000) score += 30;
    else if (totalTx >= 100) score += 20;
    else if (totalTx >= 10) score += 10;

    // Factor 3: User loss (30 points)
    if (totalUserLoss >= 100000) score += 30; // $100K+
    else if (totalUserLoss >= 10000) score += 20; // $10K+
    else if (totalUserLoss >= 1000) score += 10; // $1K+

    // Determine severity
    let severity: LeakageSeverity;
    if (score >= 80) severity = 'critical';
    else if (score >= 60) severity = 'high';
    else if (score >= 40) severity = 'medium';
    else severity = 'low';

    return { severity, score };
  }

  /**
   * Save leakage to database
   */
  public async saveLeakage(leakage: ProtocolLeakage): Promise<void> {
    await query(
      `
      INSERT INTO protocol_mev_leakage (
        protocol_id, protocol_name, chain_id, date,
        total_mev_extracted_usd, total_transactions, total_affected_transactions, affected_transaction_pct,
        sandwich_mev_usd, sandwich_count, frontrun_mev_usd, frontrun_count,
        backrun_mev_usd, backrun_count, arbitrage_mev_usd, arbitrage_count,
        liquidation_mev_usd, liquidation_count,
        total_user_loss_usd, avg_loss_per_affected_tx_usd, unique_affected_users,
        unique_bots, top_bot_address, top_bot_extracted_usd, top_bot_share_pct,
        protocol_volume_usd, mev_to_volume_ratio_pct,
        leakage_severity, leakage_score
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18,
        $19, $20, $21,
        $22, $23, $24, $25,
        $26, $27,
        $28, $29
      )
      ON CONFLICT (protocol_id, chain_id, date)
      DO UPDATE SET
        total_mev_extracted_usd = EXCLUDED.total_mev_extracted_usd,
        total_transactions = EXCLUDED.total_transactions,
        sandwich_mev_usd = EXCLUDED.sandwich_mev_usd,
        sandwich_count = EXCLUDED.sandwich_count,
        frontrun_mev_usd = EXCLUDED.frontrun_mev_usd,
        frontrun_count = EXCLUDED.frontrun_count,
        backrun_mev_usd = EXCLUDED.backrun_mev_usd,
        backrun_count = EXCLUDED.backrun_count,
        arbitrage_mev_usd = EXCLUDED.arbitrage_mev_usd,
        arbitrage_count = EXCLUDED.arbitrage_count,
        liquidation_mev_usd = EXCLUDED.liquidation_mev_usd,
        liquidation_count = EXCLUDED.liquidation_count,
        total_user_loss_usd = EXCLUDED.total_user_loss_usd,
        unique_bots = EXCLUDED.unique_bots,
        top_bot_address = EXCLUDED.top_bot_address,
        top_bot_extracted_usd = EXCLUDED.top_bot_extracted_usd,
        top_bot_share_pct = EXCLUDED.top_bot_share_pct,
        leakage_severity = EXCLUDED.leakage_severity,
        leakage_score = EXCLUDED.leakage_score,
        updated_at = NOW()
      `,
      [
        leakage.protocol_id,
        leakage.protocol_name,
        leakage.chain_id,
        leakage.date,
        leakage.total_mev_extracted_usd,
        leakage.total_transactions,
        leakage.total_affected_transactions,
        leakage.affected_transaction_pct,
        leakage.sandwich_mev_usd,
        leakage.sandwich_count,
        leakage.frontrun_mev_usd,
        leakage.frontrun_count,
        leakage.backrun_mev_usd,
        leakage.backrun_count,
        leakage.arbitrage_mev_usd,
        leakage.arbitrage_count,
        leakage.liquidation_mev_usd,
        leakage.liquidation_count,
        leakage.total_user_loss_usd,
        leakage.avg_loss_per_affected_tx_usd,
        leakage.unique_affected_users,
        leakage.unique_bots,
        leakage.top_bot_address || null,
        leakage.top_bot_extracted_usd,
        leakage.top_bot_share_pct,
        leakage.protocol_volume_usd,
        leakage.mev_to_volume_ratio_pct,
        leakage.leakage_severity,
        leakage.leakage_score,
      ]
    );
  }
}

// ============================================================================
// LeakageBreakdownAnalyzer
// ============================================================================

export class LeakageBreakdownAnalyzer {
  private static instance: LeakageBreakdownAnalyzer;

  private constructor() {}

  public static getInstance(): LeakageBreakdownAnalyzer {
    if (!LeakageBreakdownAnalyzer.instance) {
      LeakageBreakdownAnalyzer.instance = new LeakageBreakdownAnalyzer();
    }
    return LeakageBreakdownAnalyzer.instance;
  }

  /**
   * Analyze MEV breakdown by type for a protocol
   */
  public async analyzeBreakdown(leakage: ProtocolLeakage): Promise<LeakageBreakdown[]> {
    const breakdown: LeakageBreakdown[] = [
      {
        opportunity_type: 'sandwich',
        mev_extracted_usd: leakage.sandwich_mev_usd,
        transaction_count: leakage.sandwich_count,
        share_pct: (leakage.sandwich_mev_usd / leakage.total_mev_extracted_usd) * 100,
        avg_per_tx_usd: leakage.sandwich_count > 0 ? leakage.sandwich_mev_usd / leakage.sandwich_count : 0,
      },
      {
        opportunity_type: 'frontrun',
        mev_extracted_usd: leakage.frontrun_mev_usd,
        transaction_count: leakage.frontrun_count,
        share_pct: (leakage.frontrun_mev_usd / leakage.total_mev_extracted_usd) * 100,
        avg_per_tx_usd: leakage.frontrun_count > 0 ? leakage.frontrun_mev_usd / leakage.frontrun_count : 0,
      },
      {
        opportunity_type: 'backrun',
        mev_extracted_usd: leakage.backrun_mev_usd,
        transaction_count: leakage.backrun_count,
        share_pct: (leakage.backrun_mev_usd / leakage.total_mev_extracted_usd) * 100,
        avg_per_tx_usd: leakage.backrun_count > 0 ? leakage.backrun_mev_usd / leakage.backrun_count : 0,
      },
      {
        opportunity_type: 'arbitrage',
        mev_extracted_usd: leakage.arbitrage_mev_usd,
        transaction_count: leakage.arbitrage_count,
        share_pct: (leakage.arbitrage_mev_usd / leakage.total_mev_extracted_usd) * 100,
        avg_per_tx_usd: leakage.arbitrage_count > 0 ? leakage.arbitrage_mev_usd / leakage.arbitrage_count : 0,
      },
      {
        opportunity_type: 'liquidation',
        mev_extracted_usd: leakage.liquidation_mev_usd,
        transaction_count: leakage.liquidation_count,
        share_pct: (leakage.liquidation_mev_usd / leakage.total_mev_extracted_usd) * 100,
        avg_per_tx_usd: leakage.liquidation_count > 0 ? leakage.liquidation_mev_usd / leakage.liquidation_count : 0,
      },
    ];

    return breakdown.filter((b) => b.mev_extracted_usd > 0).sort((a, b) => b.mev_extracted_usd - a.mev_extracted_usd);
  }
}

// ============================================================================
// UserImpactCalculator
// ============================================================================

export class UserImpactCalculator {
  private static instance: UserImpactCalculator;

  private constructor() {}

  public static getInstance(): UserImpactCalculator {
    if (!UserImpactCalculator.instance) {
      UserImpactCalculator.instance = new UserImpactCalculator();
    }
    return UserImpactCalculator.instance;
  }

  /**
   * Calculate user impact from MEV leakage
   */
  public async calculateImpact(leakage: ProtocolLeakage): Promise<UserImpact> {
    const totalUserLoss = leakage.total_user_loss_usd;
    const uniqueUsers = leakage.unique_affected_users || 1; // Avoid division by zero
    const affectedTx = leakage.total_affected_transactions || 1;

    // Determine impact severity
    let impactSeverity: LeakageSeverity;
    if (totalUserLoss >= 100000) impactSeverity = 'critical';
    else if (totalUserLoss >= 10000) impactSeverity = 'high';
    else if (totalUserLoss >= 1000) impactSeverity = 'medium';
    else impactSeverity = 'low';

    return {
      total_user_loss_usd: totalUserLoss,
      unique_affected_users: uniqueUsers,
      avg_loss_per_user_usd: totalUserLoss / uniqueUsers,
      avg_loss_per_tx_usd: totalUserLoss / affectedTx,
      max_loss_tx_usd: 0, // TODO: Query max victim_loss_usd from mev_profit_attribution
      impact_severity: impactSeverity,
    };
  }
}

