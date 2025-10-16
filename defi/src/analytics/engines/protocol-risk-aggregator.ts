/**
 * Protocol Risk Aggregator Engine
 * Story: 3.2.1 - Protocol Risk Assessment
 * 
 * Aggregates all risk factors into overall protocol risk score:
 * - Contract risk (30%)
 * - Liquidity risk (25%)
 * - Governance risk (20%)
 * - Operational risk (15%)
 * - Market risk (10%)
 */

import { query } from '../db/connection';
import { ContractRiskAnalyzer } from './contract-risk-analyzer';
import { LiquidityRiskAnalyzer } from './liquidity-risk-analyzer';
import { GovernanceRiskAnalyzer } from './governance-risk-analyzer';
import { OperationalRiskAnalyzer } from './operational-risk-analyzer';
import { MarketRiskAnalyzer } from './market-risk-analyzer';

export interface ProtocolRiskAssessment {
  protocolId: string;
  protocolName: string;
  assessmentDate: string;
  overallRiskScore: number;
  riskCategory: 'low' | 'medium' | 'high' | 'critical';
  contractRiskScore: number;
  liquidityRiskScore: number;
  governanceRiskScore: number;
  operationalRiskScore: number;
  marketRiskScore: number;
  weights: {
    contract: number;
    liquidity: number;
    governance: number;
    operational: number;
    market: number;
  };
  breakdown: {
    contract: any;
    liquidity: any;
    governance: any;
    operational: any;
    market: any;
  };
}

export class ProtocolRiskAggregator {
  private static instance: ProtocolRiskAggregator;
  private contractAnalyzer: ContractRiskAnalyzer;
  private liquidityAnalyzer: LiquidityRiskAnalyzer;
  private governanceAnalyzer: GovernanceRiskAnalyzer;
  private operationalAnalyzer: OperationalRiskAnalyzer;
  private marketAnalyzer: MarketRiskAnalyzer;

  private constructor() {
    this.contractAnalyzer = ContractRiskAnalyzer.getInstance();
    this.liquidityAnalyzer = LiquidityRiskAnalyzer.getInstance();
    this.governanceAnalyzer = GovernanceRiskAnalyzer.getInstance();
    this.operationalAnalyzer = OperationalRiskAnalyzer.getInstance();
    this.marketAnalyzer = MarketRiskAnalyzer.getInstance();
  }

  public static getInstance(): ProtocolRiskAggregator {
    if (!ProtocolRiskAggregator.instance) {
      ProtocolRiskAggregator.instance = new ProtocolRiskAggregator();
    }
    return ProtocolRiskAggregator.instance;
  }

  /**
   * Assess overall protocol risk
   */
  public async assessProtocolRisk(protocolId: string): Promise<ProtocolRiskAssessment> {
    // Get protocol name
    const protocolResult = await query<any>(
      `SELECT protocol_name FROM protocol_risk_assessments WHERE protocol_id = $1`,
      [protocolId]
    );

    if (protocolResult.rows.length === 0) {
      throw new Error(`Protocol not found: ${protocolId}`);
    }

    const protocolName = protocolResult.rows[0].protocol_name;

    // Analyze all risk factors
    const contractRisk = await this.contractAnalyzer.analyzeContractRisk(protocolId);
    const liquidityRisk = await this.liquidityAnalyzer.analyzeLiquidityRisk(protocolId);
    const governanceRisk = await this.governanceAnalyzer.analyzeGovernanceRisk(protocolId);
    const operationalRisk = await this.operationalAnalyzer.analyzeOperationalRisk(protocolId);
    const marketRisk = await this.marketAnalyzer.analyzeMarketRisk(protocolId);

    // Define weights
    const weights = {
      contract: 0.30,
      liquidity: 0.25,
      governance: 0.20,
      operational: 0.15,
      market: 0.10,
    };

    // Calculate overall risk score
    const overallRiskScore =
      contractRisk.contractRiskScore * weights.contract +
      liquidityRisk.liquidityRiskScore * weights.liquidity +
      governanceRisk.governanceRiskScore * weights.governance +
      operationalRisk.operationalRiskScore * weights.operational +
      marketRisk.marketRiskScore * weights.market;

    // Categorize risk
    const riskCategory = this.categorizeRisk(overallRiskScore);

    const assessment: ProtocolRiskAssessment = {
      protocolId,
      protocolName,
      assessmentDate: new Date().toISOString(),
      overallRiskScore: Math.round(overallRiskScore * 100) / 100,
      riskCategory,
      contractRiskScore: contractRisk.contractRiskScore,
      liquidityRiskScore: liquidityRisk.liquidityRiskScore,
      governanceRiskScore: governanceRisk.governanceRiskScore,
      operationalRiskScore: operationalRisk.operationalRiskScore,
      marketRiskScore: marketRisk.marketRiskScore,
      weights,
      breakdown: {
        contract: contractRisk,
        liquidity: liquidityRisk,
        governance: governanceRisk,
        operational: operationalRisk,
        market: marketRisk,
      },
    };

    // Store assessment
    await this.storeAssessment(assessment);

    // Check for alerts
    await this.checkAndGenerateAlerts(protocolId, assessment);

    return assessment;
  }

  /**
   * Categorize risk based on score
   */
  public categorizeRisk(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score <= 30) return 'low';
    else if (score <= 60) return 'medium';
    else if (score <= 80) return 'high';
    else return 'critical';
  }

  /**
   * Store assessment in database
   */
  private async storeAssessment(assessment: ProtocolRiskAssessment): Promise<void> {
    await query(
      `INSERT INTO protocol_risk_assessments (
        protocol_id, protocol_name, assessment_date,
        overall_risk_score, risk_category,
        contract_risk_score, liquidity_risk_score, governance_risk_score,
        operational_risk_score, market_risk_score,
        contract_risk_weight, liquidity_risk_weight, governance_risk_weight,
        operational_risk_weight, market_risk_weight
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (protocol_id, assessment_date) DO UPDATE SET
        overall_risk_score = EXCLUDED.overall_risk_score,
        risk_category = EXCLUDED.risk_category,
        contract_risk_score = EXCLUDED.contract_risk_score,
        liquidity_risk_score = EXCLUDED.liquidity_risk_score,
        governance_risk_score = EXCLUDED.governance_risk_score,
        operational_risk_score = EXCLUDED.operational_risk_score,
        market_risk_score = EXCLUDED.market_risk_score,
        updated_at = NOW()`,
      [
        assessment.protocolId,
        assessment.protocolName,
        assessment.assessmentDate,
        assessment.overallRiskScore,
        assessment.riskCategory,
        assessment.contractRiskScore,
        assessment.liquidityRiskScore,
        assessment.governanceRiskScore,
        assessment.operationalRiskScore,
        assessment.marketRiskScore,
        assessment.weights.contract,
        assessment.weights.liquidity,
        assessment.weights.governance,
        assessment.weights.operational,
        assessment.weights.market,
      ]
    );
  }

  /**
   * Check for risk changes and generate alerts
   */
  private async checkAndGenerateAlerts(
    protocolId: string,
    currentAssessment: ProtocolRiskAssessment
  ): Promise<void> {
    // Get previous assessment (24h ago)
    const previousResult = await query<any>(
      `SELECT overall_risk_score 
       FROM protocol_risk_assessments 
       WHERE protocol_id = $1 
         AND assessment_date < NOW() - INTERVAL '23 hours'
       ORDER BY assessment_date DESC 
       LIMIT 1`,
      [protocolId]
    );

    if (previousResult.rows.length === 0) {
      return; // No previous assessment to compare
    }

    const previousScore = parseFloat(previousResult.rows[0].overall_risk_score);
    const scoreChange = currentAssessment.overallRiskScore - previousScore;

    // Generate alert if risk increased significantly
    if (scoreChange >= 20) {
      await this.generateAlert(
        protocolId,
        currentAssessment.protocolName,
        'risk_increase',
        'high',
        `Risk score increased by ${scoreChange.toFixed(2)} points in 24 hours`,
        { previousScore, currentScore: currentAssessment.overallRiskScore, scoreChange }
      );
    } else if (scoreChange >= 10) {
      await this.generateAlert(
        protocolId,
        currentAssessment.protocolName,
        'risk_increase',
        'medium',
        `Risk score increased by ${scoreChange.toFixed(2)} points in 24 hours`,
        { previousScore, currentScore: currentAssessment.overallRiskScore, scoreChange }
      );
    }
  }

  /**
   * Generate risk alert
   */
  private async generateAlert(
    protocolId: string,
    protocolName: string,
    alertType: string,
    severity: string,
    message: string,
    details: any
  ): Promise<void> {
    await query(
      `INSERT INTO protocol_risk_alerts (
        protocol_id, protocol_name, alert_type, severity, message, details,
        previous_risk_score, current_risk_score, risk_score_change
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        protocolId,
        protocolName,
        alertType,
        severity,
        message,
        JSON.stringify(details),
        details.previousScore || null,
        details.currentScore || null,
        details.scoreChange || null,
      ]
    );
  }
}

