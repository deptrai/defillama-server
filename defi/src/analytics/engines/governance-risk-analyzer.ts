/**
 * Governance Risk Analyzer Engine
 * Story: 3.2.1 - Protocol Risk Assessment
 * 
 * Analyzes governance risk based on:
 * - Governance type (DAO, multisig, centralized, none)
 * - Token distribution (Gini coefficient)
 * - Admin key management
 */

import { query } from '../db/connection';

export interface GovernanceRiskMetrics {
  protocolId: string;
  governanceType: 'dao' | 'multisig' | 'centralized' | 'none';
  multisigThreshold: number | null;
  multisigSignersCount: number | null;
  tokenDistributionGini: number | null;
  governanceTokenSymbol: string | null;
  adminKeyHolders: string[];
  adminKeyCount: number | null;
  timelockDelayHours: number | null;
  governanceRiskScore: number;
  breakdown: {
    governanceTypeScore: number;
    distributionScore: number;
    adminKeyScore: number;
  };
}

export class GovernanceRiskAnalyzer {
  private static instance: GovernanceRiskAnalyzer;

  private constructor() {}

  public static getInstance(): GovernanceRiskAnalyzer {
    if (!GovernanceRiskAnalyzer.instance) {
      GovernanceRiskAnalyzer.instance = new GovernanceRiskAnalyzer();
    }
    return GovernanceRiskAnalyzer.instance;
  }

  public async analyzeGovernanceRisk(protocolId: string): Promise<GovernanceRiskMetrics> {
    const result = await query<any>(
      `SELECT * FROM protocol_governance_risks WHERE protocol_id = $1`,
      [protocolId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Governance risk data not found for protocol: ${protocolId}`);
    }

    const data = result.rows[0];

    const governanceTypeScore = this.calculateGovernanceTypeScore(
      data.governance_type,
      data.multisig_threshold,
      data.multisig_signers_count,
      data.timelock_delay_hours
    );

    const distributionScore = this.calculateDistributionScore(
      data.token_distribution_gini
    );

    const adminKeyScore = this.calculateAdminKeyScore(
      data.admin_key_count,
      data.governance_type
    );

    const governanceRiskScore = this.calculateOverallScore(
      governanceTypeScore,
      distributionScore,
      adminKeyScore
    );

    return {
      protocolId: data.protocol_id,
      governanceType: data.governance_type,
      multisigThreshold: data.multisig_threshold,
      multisigSignersCount: data.multisig_signers_count,
      tokenDistributionGini: data.token_distribution_gini ? parseFloat(data.token_distribution_gini) : null,
      governanceTokenSymbol: data.governance_token_symbol,
      adminKeyHolders: data.admin_key_holders || [],
      adminKeyCount: data.admin_key_count,
      timelockDelayHours: data.timelock_delay_hours,
      governanceRiskScore: Math.round(governanceRiskScore * 100) / 100,
      breakdown: {
        governanceTypeScore: Math.round(governanceTypeScore * 100) / 100,
        distributionScore: Math.round(distributionScore * 100) / 100,
        adminKeyScore: Math.round(adminKeyScore * 100) / 100,
      },
    };
  }

  public calculateGovernanceTypeScore(
    type: string,
    threshold: number | null,
    signers: number | null,
    timelockHours: number | null
  ): number {
    let score = 0;

    switch (type) {
      case 'dao':
        score = timelockHours && timelockHours >= 48 ? 10 : 20;
        break;
      case 'multisig':
        if (threshold && signers) {
          if (signers >= 7 && threshold >= 5) score = 30;
          else if (signers >= 5 && threshold >= 3) score = 45;
          else if (signers >= 3 && threshold >= 2) score = 60;
          else score = 75;
        } else {
          score = 50;
        }
        break;
      case 'centralized':
        score = 85;
        break;
      case 'none':
        score = 95;
        break;
      default:
        score = 80;
    }

    return score;
  }

  public calculateDistributionScore(gini: number | null): number {
    if (gini === null) return 50;

    // Gini coefficient: 0 = perfect equality, 1 = perfect inequality
    // Convert to risk score (0-100, lower is better)
    if (gini < 0.4) return 15;
    else if (gini < 0.5) return 30;
    else if (gini < 0.6) return 45;
    else if (gini < 0.7) return 60;
    else if (gini < 0.8) return 75;
    else return 90;
  }

  public calculateAdminKeyScore(adminCount: number | null, type: string): number {
    if (type === 'dao' && (adminCount === null || adminCount === 0)) {
      return 10; // DAO with no admin keys is best
    }

    if (adminCount === null) return 50;

    if (adminCount === 0) return 15;
    else if (adminCount === 1) return 80;
    else if (adminCount === 2) return 60;
    else if (adminCount <= 4) return 45;
    else return 30;
  }

  private calculateOverallScore(
    typeScore: number,
    distributionScore: number,
    adminKeyScore: number
  ): number {
    return typeScore * 0.5 + distributionScore * 0.3 + adminKeyScore * 0.2;
  }

  public async storeGovernanceRisk(metrics: GovernanceRiskMetrics): Promise<void> {
    await query(
      `UPDATE protocol_governance_risks 
       SET governance_risk_score = $1, updated_at = NOW()
       WHERE protocol_id = $2`,
      [metrics.governanceRiskScore, metrics.protocolId]
    );
  }
}

