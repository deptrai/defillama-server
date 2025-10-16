/**
 * Contract Risk Analyzer Engine
 * Story: 3.2.1 - Protocol Risk Assessment
 * 
 * Analyzes smart contract risk based on:
 * - Audit status and auditor reputation
 * - Known vulnerabilities (CWE IDs)
 * - Code complexity
 */

import { query } from '../db/connection';

export interface ContractRiskMetrics {
  protocolId: string;
  auditStatus: 'audited' | 'unaudited' | 'in_progress' | 'none';
  auditorNames: string[];
  auditorReputationScore: number | null;
  auditDate: string | null;
  knownVulnerabilitiesCount: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  vulnerabilityIds: string[];
  codeComplexityScore: number | null;
  contractAgeDays: number | null;
  contractRiskScore: number;
  breakdown: {
    auditScore: number;
    vulnerabilityScore: number;
    complexityScore: number;
  };
}

export class ContractRiskAnalyzer {
  private static instance: ContractRiskAnalyzer;

  private constructor() {}

  public static getInstance(): ContractRiskAnalyzer {
    if (!ContractRiskAnalyzer.instance) {
      ContractRiskAnalyzer.instance = new ContractRiskAnalyzer();
    }
    return ContractRiskAnalyzer.instance;
  }

  /**
   * Analyze contract risk for a protocol
   */
  public async analyzeContractRisk(protocolId: string): Promise<ContractRiskMetrics> {
    // Fetch contract risk data
    const result = await query<any>(
      `SELECT * FROM protocol_contract_risks WHERE protocol_id = $1`,
      [protocolId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Contract risk data not found for protocol: ${protocolId}`);
    }

    const data = result.rows[0];

    // Calculate individual scores
    const auditScore = this.calculateAuditScore(
      data.audit_status,
      data.auditor_reputation_score,
      data.contract_age_days
    );

    const vulnerabilityScore = this.calculateVulnerabilityScore(
      data.critical_vulnerabilities,
      data.high_vulnerabilities,
      data.medium_vulnerabilities,
      data.low_vulnerabilities
    );

    const complexityScore = this.calculateCodeQualityScore(
      data.code_complexity_score,
      data.contract_age_days
    );

    // Calculate overall contract risk score (weighted average)
    const contractRiskScore = this.calculateOverallScore(
      auditScore,
      vulnerabilityScore,
      complexityScore
    );

    return {
      protocolId: data.protocol_id,
      auditStatus: data.audit_status,
      auditorNames: data.auditor_names || [],
      auditorReputationScore: data.auditor_reputation_score,
      auditDate: data.audit_date,
      knownVulnerabilitiesCount: data.known_vulnerabilities_count,
      criticalVulnerabilities: data.critical_vulnerabilities,
      highVulnerabilities: data.high_vulnerabilities,
      mediumVulnerabilities: data.medium_vulnerabilities,
      lowVulnerabilities: data.low_vulnerabilities,
      vulnerabilityIds: data.vulnerability_ids || [],
      codeComplexityScore: data.code_complexity_score,
      contractAgeDays: data.contract_age_days,
      contractRiskScore: Math.round(contractRiskScore * 100) / 100,
      breakdown: {
        auditScore: Math.round(auditScore * 100) / 100,
        vulnerabilityScore: Math.round(vulnerabilityScore * 100) / 100,
        complexityScore: Math.round(complexityScore * 100) / 100,
      },
    };
  }

  /**
   * Calculate audit score (0-100, lower is better)
   */
  public calculateAuditScore(
    auditStatus: string,
    auditorReputation: number | null,
    contractAge: number | null
  ): number {
    let score = 0;

    // Base score from audit status
    switch (auditStatus) {
      case 'audited':
        // Score based on auditor reputation
        if (auditorReputation !== null) {
          if (auditorReputation >= 90) score = 10; // Top-tier auditor
          else if (auditorReputation >= 75) score = 25; // Mid-tier auditor
          else if (auditorReputation >= 60) score = 40; // Low-tier auditor
          else score = 55; // Unknown auditor
        } else {
          score = 40; // Audited but no reputation data
        }
        break;
      case 'in_progress':
        score = 60;
        break;
      case 'unaudited':
        score = 75;
        break;
      case 'none':
        score = 90;
        break;
      default:
        score = 80;
    }

    // Penalty for old audits (audit should be refreshed every 2 years)
    if (contractAge !== null && contractAge > 730) {
      const yearsSinceAudit = contractAge / 365;
      const agePenalty = Math.min((yearsSinceAudit - 2) * 5, 20);
      score += agePenalty;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate vulnerability score (0-100, lower is better)
   */
  public calculateVulnerabilityScore(
    critical: number,
    high: number,
    medium: number,
    low: number
  ): number {
    // Weighted scoring for vulnerabilities
    const criticalWeight = 60;
    const highWeight = 40;
    const mediumWeight = 20;
    const lowWeight = 10;

    const score =
      critical * criticalWeight +
      high * highWeight +
      medium * mediumWeight +
      low * lowWeight;

    // Normalize to 0-100 scale
    // Assume 1 critical = 60, 2 high = 80, 3 medium = 60, 4 low = 40
    // Total max reasonable = 240 (4 critical)
    return Math.min((score / 240) * 100, 100);
  }

  /**
   * Calculate code quality score (0-100, lower is better)
   */
  public calculateCodeQualityScore(
    complexityScore: number | null,
    contractAge: number | null
  ): number {
    if (complexityScore === null) {
      // No data, assume medium risk
      return 50;
    }

    let score = complexityScore;

    // Bonus for mature contracts (battle-tested)
    if (contractAge !== null && contractAge > 365) {
      const maturityBonus = Math.min((contractAge / 365) * 5, 15);
      score = Math.max(score - maturityBonus, 0);
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate overall contract risk score
   * Weights: Audit 40%, Vulnerability 40%, Complexity 20%
   */
  private calculateOverallScore(
    auditScore: number,
    vulnerabilityScore: number,
    complexityScore: number
  ): number {
    const weights = {
      audit: 0.4,
      vulnerability: 0.4,
      complexity: 0.2,
    };

    return (
      auditScore * weights.audit +
      vulnerabilityScore * weights.vulnerability +
      complexityScore * weights.complexity
    );
  }

  /**
   * Store contract risk metrics in database
   */
  public async storeContractRisk(metrics: ContractRiskMetrics): Promise<void> {
    await query(
      `UPDATE protocol_contract_risks 
       SET contract_risk_score = $1, updated_at = NOW()
       WHERE protocol_id = $2`,
      [metrics.contractRiskScore, metrics.protocolId]
    );
  }
}

