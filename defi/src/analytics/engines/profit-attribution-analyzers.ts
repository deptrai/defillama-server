/**
 * Profit Attribution Analyzers
 * Story: 4.1.3 - Advanced MEV Analytics
 * 
 * Three analyzers for profit attribution:
 * 1. BotAttributionAnalyzer - Analyze by bot
 * 2. StrategyAttributionAnalyzer - Analyze by strategy type
 * 3. ProtocolAttributionAnalyzer - Analyze by protocol
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

export interface AttributionSummary {
  total_profit_usd: number;
  total_transactions: number;
  avg_profit_per_tx_usd: number;
  share_pct: number;
}

// ============================================================================
// Bot Attribution Types
// ============================================================================

export interface BotAttribution extends AttributionSummary {
  bot_address: string;
  bot_name?: string;
  chain_id: string;
  rank: number;
}

// ============================================================================
// Strategy Attribution Types
// ============================================================================

export interface StrategyAttribution extends AttributionSummary {
  opportunity_type: MEVOpportunityType;
  success_rate_pct: number;
  avg_gas_cost_usd: number;
  roi_pct: number;
  rank: number;
}

// ============================================================================
// Protocol Attribution Types
// ============================================================================

export interface ProtocolAttribution extends AttributionSummary {
  protocol_id: string;
  protocol_name: string;
  mev_leakage_usd: number; // Total MEV extracted from protocol
  user_loss_usd: number; // Total user losses
  rank: number;
}

// ============================================================================
// BotAttributionAnalyzer
// ============================================================================

export class BotAttributionAnalyzer {
  private static instance: BotAttributionAnalyzer;

  private constructor() {}

  public static getInstance(): BotAttributionAnalyzer {
    if (!BotAttributionAnalyzer.instance) {
      BotAttributionAnalyzer.instance = new BotAttributionAnalyzer();
    }
    return BotAttributionAnalyzer.instance;
  }

  public async analyzeByBot(
    chainId?: string,
    timeRange?: TimeRange,
    limit: number = 100
  ): Promise<BotAttribution[]> {
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (chainId) {
      whereClauses.push(`chain_id = $${paramIndex++}`);
      params.push(chainId);
    }

    if (timeRange?.start_date) {
      whereClauses.push(`date >= $${paramIndex++}`);
      params.push(timeRange.start_date);
    }

    if (timeRange?.end_date) {
      whereClauses.push(`date <= $${paramIndex++}`);
      params.push(timeRange.end_date);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const result = await query<{
      bot_address: string;
      bot_name: string;
      chain_id: string;
      total_profit: string;
      total_transactions: string;
    }>(
      `
      WITH bot_totals AS (
        SELECT 
          pa.bot_address,
          pa.chain_id,
          COALESCE(mb.bot_name, 'Unknown') as bot_name,
          SUM(pa.net_profit_usd) as total_profit,
          COUNT(*) as total_transactions
        FROM mev_profit_attribution pa
        LEFT JOIN mev_bots mb ON pa.bot_id = mb.id
        ${whereClause}
        GROUP BY pa.bot_address, pa.chain_id, mb.bot_name
      ),
      total_sum AS (
        SELECT SUM(total_profit) as grand_total FROM bot_totals
      )
      SELECT 
        bt.*,
        (bt.total_profit / NULLIF(ts.grand_total, 0) * 100) as share_pct
      FROM bot_totals bt
      CROSS JOIN total_sum ts
      ORDER BY bt.total_profit DESC
      LIMIT $${paramIndex}
      `,
      [...params, limit]
    );

    return result.rows.map((row, index) => ({
      bot_address: row.bot_address,
      bot_name: row.bot_name !== 'Unknown' ? row.bot_name : undefined,
      chain_id: row.chain_id,
      total_profit_usd: parseFloat(row.total_profit),
      total_transactions: parseInt(row.total_transactions, 10),
      avg_profit_per_tx_usd:
        parseInt(row.total_transactions, 10) > 0
          ? parseFloat(row.total_profit) / parseInt(row.total_transactions, 10)
          : 0,
      share_pct: parseFloat((row as any).share_pct || '0'),
      rank: index + 1,
    }));
  }
}

// ============================================================================
// StrategyAttributionAnalyzer
// ============================================================================

export class StrategyAttributionAnalyzer {
  private static instance: StrategyAttributionAnalyzer;

  private constructor() {}

  public static getInstance(): StrategyAttributionAnalyzer {
    if (!StrategyAttributionAnalyzer.instance) {
      StrategyAttributionAnalyzer.instance = new StrategyAttributionAnalyzer();
    }
    return StrategyAttributionAnalyzer.instance;
  }

  public async analyzeByStrategy(
    chainId?: string,
    timeRange?: TimeRange
  ): Promise<StrategyAttribution[]> {
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (chainId) {
      whereClauses.push(`chain_id = $${paramIndex++}`);
      params.push(chainId);
    }

    if (timeRange?.start_date) {
      whereClauses.push(`date >= $${paramIndex++}`);
      params.push(timeRange.start_date);
    }

    if (timeRange?.end_date) {
      whereClauses.push(`date <= $${paramIndex++}`);
      params.push(timeRange.end_date);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const result = await query<{
      opportunity_type: MEVOpportunityType;
      total_profit: string;
      total_gas_cost: string;
      total_transactions: string;
      successful_transactions: string;
    }>(
      `
      WITH strategy_totals AS (
        SELECT 
          pa.opportunity_type,
          SUM(pa.net_profit_usd) as total_profit,
          SUM(pa.gas_cost_usd) as total_gas_cost,
          COUNT(*) as total_transactions,
          COUNT(*) FILTER (WHERE pa.net_profit_usd > 0) as successful_transactions
        FROM mev_profit_attribution pa
        ${whereClause}
        GROUP BY pa.opportunity_type
      ),
      total_sum AS (
        SELECT SUM(total_profit) as grand_total FROM strategy_totals
      )
      SELECT 
        st.*,
        (st.total_profit / NULLIF(ts.grand_total, 0) * 100) as share_pct
      FROM strategy_totals st
      CROSS JOIN total_sum ts
      ORDER BY st.total_profit DESC
      `,
      params
    );

    return result.rows.map((row, index) => {
      const totalTransactions = parseInt(row.total_transactions, 10);
      const successfulTransactions = parseInt(row.successful_transactions, 10);
      const totalProfit = parseFloat(row.total_profit);
      const totalGasCost = parseFloat(row.total_gas_cost);

      return {
        opportunity_type: row.opportunity_type,
        total_profit_usd: totalProfit,
        total_transactions: totalTransactions,
        avg_profit_per_tx_usd: totalTransactions > 0 ? totalProfit / totalTransactions : 0,
        share_pct: parseFloat((row as any).share_pct || '0'),
        success_rate_pct: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
        avg_gas_cost_usd: totalTransactions > 0 ? totalGasCost / totalTransactions : 0,
        roi_pct: totalGasCost > 0 ? (totalProfit / totalGasCost) * 100 : 0,
        rank: index + 1,
      };
    });
  }
}

// ============================================================================
// ProtocolAttributionAnalyzer
// ============================================================================

export class ProtocolAttributionAnalyzer {
  private static instance: ProtocolAttributionAnalyzer;

  private constructor() {}

  public static getInstance(): ProtocolAttributionAnalyzer {
    if (!ProtocolAttributionAnalyzer.instance) {
      ProtocolAttributionAnalyzer.instance = new ProtocolAttributionAnalyzer();
    }
    return ProtocolAttributionAnalyzer.instance;
  }

  public async analyzeByProtocol(
    chainId?: string,
    timeRange?: TimeRange,
    limit: number = 50
  ): Promise<ProtocolAttribution[]> {
    const whereClauses: string[] = ['pa.protocol_id IS NOT NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    if (chainId) {
      whereClauses.push(`pa.chain_id = $${paramIndex++}`);
      params.push(chainId);
    }

    if (timeRange?.start_date) {
      whereClauses.push(`pa.date >= $${paramIndex++}`);
      params.push(timeRange.start_date);
    }

    if (timeRange?.end_date) {
      whereClauses.push(`pa.date <= $${paramIndex++}`);
      params.push(timeRange.end_date);
    }

    const whereClause = `WHERE ${whereClauses.join(' AND ')}`;

    const result = await query<{
      protocol_id: string;
      protocol_name: string;
      total_profit: string;
      total_transactions: string;
      total_user_loss: string;
    }>(
      `
      WITH protocol_totals AS (
        SELECT 
          pa.protocol_id,
          pa.protocol_name,
          SUM(pa.net_profit_usd) as total_profit,
          COUNT(*) as total_transactions,
          SUM(COALESCE(pa.victim_loss_usd, 0)) as total_user_loss
        FROM mev_profit_attribution pa
        ${whereClause}
        GROUP BY pa.protocol_id, pa.protocol_name
      ),
      total_sum AS (
        SELECT SUM(total_profit) as grand_total FROM protocol_totals
      )
      SELECT 
        pt.*,
        (pt.total_profit / NULLIF(ts.grand_total, 0) * 100) as share_pct
      FROM protocol_totals pt
      CROSS JOIN total_sum ts
      ORDER BY pt.total_profit DESC
      LIMIT $${paramIndex}
      `,
      [...params, limit]
    );

    return result.rows.map((row, index) => {
      const totalTransactions = parseInt(row.total_transactions, 10);
      const totalProfit = parseFloat(row.total_profit);

      return {
        protocol_id: row.protocol_id,
        protocol_name: row.protocol_name,
        total_profit_usd: totalProfit,
        total_transactions: totalTransactions,
        avg_profit_per_tx_usd: totalTransactions > 0 ? totalProfit / totalTransactions : 0,
        share_pct: parseFloat((row as any).share_pct || '0'),
        mev_leakage_usd: totalProfit,
        user_loss_usd: parseFloat(row.total_user_loss),
        rank: index + 1,
      };
    });
  }
}

