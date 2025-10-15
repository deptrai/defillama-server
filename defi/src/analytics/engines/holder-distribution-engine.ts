/**
 * Holder Distribution Engine
 * Story: 2.2.2 - Holder Distribution Analysis
 * 
 * Calculates holder distribution metrics including Gini coefficient,
 * concentration scores, and top holder percentages
 */

import { query } from '../db/connection';

export interface HolderDistribution {
  tokenAddress: string;
  chainId: string;
  totalHolders: number;
  concentration: {
    giniCoefficient: number; // 0-1
    concentrationScore: number; // 0-100
    top10Percentage: number;
    top50Percentage: number;
    top100Percentage: number;
  };
  holderTypes: {
    whales: { count: number; percentage: number };
    large: { count: number; percentage: number };
    medium: { count: number; percentage: number };
    small: { count: number; percentage: number };
    dust: { count: number; percentage: number };
  };
  distribution: Array<{
    range: string;
    holderCount: number;
    totalBalance: number;
    percentage: number;
  }>;
  lastUpdated: Date;
}

export interface TopHolder {
  rank: number;
  walletAddress: string;
  balance: number;
  balanceUsd: number;
  supplyPercentage: number;
  holderType: string;
  isContract: boolean;
  isExchange: boolean;
  behavior: {
    firstSeen: Date;
    lastActive: Date;
    holdingPeriodDays: number;
    transactionCount: number;
  };
}

export class HolderDistributionEngine {
  private static instance: HolderDistributionEngine;

  private constructor() {}

  public static getInstance(): HolderDistributionEngine {
    if (!HolderDistributionEngine.instance) {
      HolderDistributionEngine.instance = new HolderDistributionEngine();
    }
    return HolderDistributionEngine.instance;
  }

  /**
   * Get holder distribution for a token
   */
  async getDistribution(
    tokenAddress: string,
    chainId: string = 'ethereum'
  ): Promise<HolderDistribution> {
    // Get total holders
    const totalHoldersResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM token_holders
       WHERE token_address = $1 AND chain_id = $2`,
      [tokenAddress, chainId]
    );
    const totalHolders = parseInt(totalHoldersResult.rows[0].count);

    if (totalHolders === 0) {
      throw new Error(`No holders found for token ${tokenAddress} on ${chainId}`);
    }

    // Get concentration metrics
    const concentration = await this.calculateConcentration(tokenAddress, chainId);

    // Get holder type distribution
    const holderTypes = await this.getHolderTypeDistribution(tokenAddress, chainId);

    // Get balance range distribution
    const distribution = await this.getBalanceRangeDistribution(tokenAddress, chainId);

    return {
      tokenAddress,
      chainId,
      totalHolders,
      concentration,
      holderTypes,
      distribution,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate Gini coefficient and concentration metrics
   */
  private async calculateConcentration(
    tokenAddress: string,
    chainId: string
  ): Promise<HolderDistribution['concentration']> {
    // Get all balances sorted
    const balancesResult = await query<{ balance: string; supply_percentage: string }>(
      `SELECT balance, supply_percentage
       FROM token_holders
       WHERE token_address = $1 AND chain_id = $2
       ORDER BY balance ASC`,
      [tokenAddress, chainId]
    );

    const balances = balancesResult.rows.map(r => parseFloat(r.balance));
    const supplyPercentages = balancesResult.rows.map(r => parseFloat(r.supply_percentage));

    // Calculate Gini coefficient
    const giniCoefficient = this.calculateGini(balances);

    // Calculate concentration score (0-100, derived from Gini)
    const concentrationScore = giniCoefficient * 100;

    // Calculate top holder percentages
    const top10Percentage = await this.getTopNPercentage(tokenAddress, chainId, 10);
    const top50Percentage = await this.getTopNPercentage(tokenAddress, chainId, 50);
    const top100Percentage = await this.getTopNPercentage(tokenAddress, chainId, 100);

    return {
      giniCoefficient,
      concentrationScore,
      top10Percentage,
      top50Percentage,
      top100Percentage,
    };
  }

  /**
   * Calculate Gini coefficient
   * Formula: G = (2 * sum(i * x_i)) / (n * sum(x_i)) - (n + 1) / n
   * where x_i are sorted values
   */
  private calculateGini(sortedBalances: number[]): number {
    const n = sortedBalances.length;
    if (n === 0) return 0;

    const totalBalance = sortedBalances.reduce((sum, b) => sum + b, 0);
    if (totalBalance === 0) return 0;

    let numerator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i + 1) * sortedBalances[i];
    }

    const gini = (2 * numerator) / (n * totalBalance) - (n + 1) / n;
    return Math.max(0, Math.min(1, gini)); // Clamp to [0, 1]
  }

  /**
   * Get top N holders percentage
   */
  private async getTopNPercentage(
    tokenAddress: string,
    chainId: string,
    n: number
  ): Promise<number> {
    const result = await query<{ total_percentage: string }>(
      `SELECT COALESCE(SUM(supply_percentage), 0) as total_percentage
       FROM (
         SELECT supply_percentage
         FROM token_holders
         WHERE token_address = $1 AND chain_id = $2
         ORDER BY balance DESC
         LIMIT $3
       ) top_holders`,
      [tokenAddress, chainId, n]
    );

    return parseFloat(result.rows[0].total_percentage);
  }

  /**
   * Get holder type distribution
   */
  private async getHolderTypeDistribution(
    tokenAddress: string,
    chainId: string
  ): Promise<HolderDistribution['holderTypes']> {
    const result = await query<{
      holder_type: string;
      count: string;
      total_percentage: string;
    }>(
      `SELECT 
         holder_type,
         COUNT(*) as count,
         COALESCE(SUM(supply_percentage), 0) as total_percentage
       FROM token_holders
       WHERE token_address = $1 AND chain_id = $2
       GROUP BY holder_type`,
      [tokenAddress, chainId]
    );

    const types: HolderDistribution['holderTypes'] = {
      whales: { count: 0, percentage: 0 },
      large: { count: 0, percentage: 0 },
      medium: { count: 0, percentage: 0 },
      small: { count: 0, percentage: 0 },
      dust: { count: 0, percentage: 0 },
    };

    // Map database holder_type (singular) to types object keys (plural for whales)
    const typeMap: Record<string, keyof typeof types> = {
      whale: 'whales',
      large: 'large',
      medium: 'medium',
      small: 'small',
      dust: 'dust',
    };

    result.rows.forEach(row => {
      const mappedType = typeMap[row.holder_type];
      if (mappedType) {
        types[mappedType] = {
          count: parseInt(row.count),
          percentage: parseFloat(row.total_percentage),
        };
      }
    });

    return types;
  }

  /**
   * Get balance range distribution
   */
  private async getBalanceRangeDistribution(
    tokenAddress: string,
    chainId: string
  ): Promise<HolderDistribution['distribution']> {
    const ranges = [
      { range: '0-0.001%', min: 0, max: 0.001 },
      { range: '0.001-0.01%', min: 0.001, max: 0.01 },
      { range: '0.01-0.1%', min: 0.01, max: 0.1 },
      { range: '0.1-1%', min: 0.1, max: 1 },
      { range: '>1%', min: 1, max: 100 },
    ];

    const distribution: HolderDistribution['distribution'] = [];

    for (const { range, min, max } of ranges) {
      const result = await query<{
        count: string;
        total_balance: string;
        total_percentage: string;
      }>(
        `SELECT 
           COUNT(*) as count,
           COALESCE(SUM(balance), 0) as total_balance,
           COALESCE(SUM(supply_percentage), 0) as total_percentage
         FROM token_holders
         WHERE token_address = $1 
           AND chain_id = $2
           AND supply_percentage >= $3 
           AND supply_percentage < $4`,
        [tokenAddress, chainId, min, max]
      );

      distribution.push({
        range,
        holderCount: parseInt(result.rows[0].count),
        totalBalance: parseFloat(result.rows[0].total_balance),
        percentage: parseFloat(result.rows[0].total_percentage),
      });
    }

    return distribution;
  }

  /**
   * Get top holders
   */
  async getTopHolders(
    tokenAddress: string,
    chainId: string = 'ethereum',
    options: {
      limit?: number;
      excludeContracts?: boolean;
      excludeExchanges?: boolean;
    } = {}
  ): Promise<TopHolder[]> {
    const { limit = 100, excludeContracts = false, excludeExchanges = false } = options;

    let whereClause = 'WHERE token_address = $1 AND chain_id = $2';
    const params: any[] = [tokenAddress, chainId];

    if (excludeContracts) {
      whereClause += ' AND is_contract = FALSE';
    }

    if (excludeExchanges) {
      whereClause += ' AND is_exchange = FALSE';
    }

    const result = await query<{
      wallet_address: string;
      balance: string;
      balance_usd: string;
      supply_percentage: string;
      holder_type: string;
      is_contract: boolean;
      is_exchange: boolean;
      first_seen: Date;
      last_active: Date;
      holding_period_days: number;
      transaction_count: number;
    }>(
      `SELECT 
         wallet_address, balance, balance_usd, supply_percentage,
         holder_type, is_contract, is_exchange,
         first_seen, last_active, holding_period_days, transaction_count
       FROM token_holders
       ${whereClause}
       ORDER BY balance DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    return result.rows.map((row, index) => ({
      rank: index + 1,
      walletAddress: row.wallet_address,
      balance: parseFloat(row.balance),
      balanceUsd: parseFloat(row.balance_usd),
      supplyPercentage: parseFloat(row.supply_percentage),
      holderType: row.holder_type,
      isContract: row.is_contract,
      isExchange: row.is_exchange,
      behavior: {
        firstSeen: row.first_seen,
        lastActive: row.last_active,
        holdingPeriodDays: row.holding_period_days,
        transactionCount: row.transaction_count,
      },
    }));
  }
}

