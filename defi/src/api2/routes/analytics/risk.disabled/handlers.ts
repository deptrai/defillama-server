/**
 * Risk Assessment API Handlers
 * Story: 3.2.1 - Protocol Risk Assessment
 * 
 * Endpoints:
 * - GET /v1/risk/protocols/:protocolId/assessment - Comprehensive risk assessment
 * - GET /v1/risk/protocols/:protocolId/contract - Contract risk details
 * - GET /v1/risk/protocols/:protocolId/liquidity - Liquidity risk details
 * - GET /v1/risk/protocols/:protocolId/governance - Governance risk details
 * - GET /v1/risk/protocols/:protocolId/operational - Operational risk details
 * - GET /v1/risk/protocols/:protocolId/market - Market risk details
 * - GET /v1/risk/protocols/:protocolId/alerts - Risk alerts
 * - GET /v1/risk/protocols - List protocols by risk
 */

import { Request, Response } from 'hyper-express';
import { query } from '../../../../analytics/db/connection';
import {
  ProtocolRiskAggregator,
  ContractRiskAnalyzer,
  LiquidityRiskAnalyzer,
  GovernanceRiskAnalyzer,
  OperationalRiskAnalyzer,
  MarketRiskAnalyzer,
} from '../../../../analytics/engines';

/**
 * GET /v1/risk/protocols/:protocolId/assessment
 * Get comprehensive risk assessment for a protocol
 */
export async function getProtocolRiskAssessment(req: Request, res: Response) {
  try {
    const { protocolId } = req.path_parameters;

    if (!protocolId) {
      return res.status(400).json({
        error: 'Protocol ID is required',
      });
    }

    const aggregator = ProtocolRiskAggregator.getInstance();
    const assessment = await aggregator.assessProtocolRisk(protocolId);

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error: any) {
    console.error('Error getting protocol risk assessment:', error);
    res.status(500).json({
      error: 'Failed to get protocol risk assessment',
      message: error.message,
    });
  }
}

/**
 * GET /v1/risk/protocols/:protocolId/contract
 * Get detailed contract risk analysis
 */
export async function getContractRisk(req: Request, res: Response) {
  try {
    const { protocolId } = req.path_parameters;

    if (!protocolId) {
      return res.status(400).json({
        error: 'Protocol ID is required',
      });
    }

    const analyzer = ContractRiskAnalyzer.getInstance();
    const contractRisk = await analyzer.analyzeContractRisk(protocolId);

    res.json({
      success: true,
      data: contractRisk,
    });
  } catch (error: any) {
    console.error('Error getting contract risk:', error);
    res.status(500).json({
      error: 'Failed to get contract risk',
      message: error.message,
    });
  }
}

/**
 * GET /v1/risk/protocols/:protocolId/liquidity
 * Get detailed liquidity risk analysis
 */
export async function getLiquidityRisk(req: Request, res: Response) {
  try {
    const { protocolId } = req.path_parameters;

    if (!protocolId) {
      return res.status(400).json({
        error: 'Protocol ID is required',
      });
    }

    const analyzer = LiquidityRiskAnalyzer.getInstance();
    const liquidityRisk = await analyzer.analyzeLiquidityRisk(protocolId);

    res.json({
      success: true,
      data: liquidityRisk,
    });
  } catch (error: any) {
    console.error('Error getting liquidity risk:', error);
    res.status(500).json({
      error: 'Failed to get liquidity risk',
      message: error.message,
    });
  }
}

/**
 * GET /v1/risk/protocols/:protocolId/governance
 * Get detailed governance risk analysis
 */
export async function getGovernanceRisk(req: Request, res: Response) {
  try {
    const { protocolId } = req.path_parameters;

    if (!protocolId) {
      return res.status(400).json({
        error: 'Protocol ID is required',
      });
    }

    const analyzer = GovernanceRiskAnalyzer.getInstance();
    const governanceRisk = await analyzer.analyzeGovernanceRisk(protocolId);

    res.json({
      success: true,
      data: governanceRisk,
    });
  } catch (error: any) {
    console.error('Error getting governance risk:', error);
    res.status(500).json({
      error: 'Failed to get governance risk',
      message: error.message,
    });
  }
}

/**
 * GET /v1/risk/protocols/:protocolId/operational
 * Get detailed operational risk analysis
 */
export async function getOperationalRisk(req: Request, res: Response) {
  try {
    const { protocolId } = req.path_parameters;

    if (!protocolId) {
      return res.status(400).json({
        error: 'Protocol ID is required',
      });
    }

    const analyzer = OperationalRiskAnalyzer.getInstance();
    const operationalRisk = await analyzer.analyzeOperationalRisk(protocolId);

    res.json({
      success: true,
      data: operationalRisk,
    });
  } catch (error: any) {
    console.error('Error getting operational risk:', error);
    res.status(500).json({
      error: 'Failed to get operational risk',
      message: error.message,
    });
  }
}

/**
 * GET /v1/risk/protocols/:protocolId/market
 * Get detailed market risk analysis
 */
export async function getMarketRisk(req: Request, res: Response) {
  try {
    const { protocolId } = req.path_parameters;

    if (!protocolId) {
      return res.status(400).json({
        error: 'Protocol ID is required',
      });
    }

    const analyzer = MarketRiskAnalyzer.getInstance();
    const marketRisk = await analyzer.analyzeMarketRisk(protocolId);

    res.json({
      success: true,
      data: marketRisk,
    });
  } catch (error: any) {
    console.error('Error getting market risk:', error);
    res.status(500).json({
      error: 'Failed to get market risk',
      message: error.message,
    });
  }
}

/**
 * GET /v1/risk/protocols/:protocolId/alerts
 * Get risk alerts for a protocol
 */
export async function getProtocolAlerts(req: Request, res: Response) {
  try {
    const { protocolId } = req.path_parameters;
    const { severity, acknowledged, limit = '50' } = req.query;

    if (!protocolId) {
      return res.status(400).json({
        error: 'Protocol ID is required',
      });
    }

    let queryStr = `SELECT * FROM protocol_risk_alerts WHERE protocol_id = $1`;
    const params: any[] = [protocolId];
    let paramIndex = 2;

    if (severity) {
      queryStr += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (acknowledged !== undefined) {
      queryStr += ` AND acknowledged = $${paramIndex}`;
      params.push(acknowledged === 'true');
      paramIndex++;
    }

    queryStr += ` ORDER BY triggered_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string, 10));

    const result = await query<any>(queryStr, params);

    res.json({
      success: true,
      data: {
        protocolId,
        count: result.rows.length,
        alerts: result.rows,
      },
    });
  } catch (error: any) {
    console.error('Error getting protocol alerts:', error);
    res.status(500).json({
      error: 'Failed to get protocol alerts',
      message: error.message,
    });
  }
}

/**
 * GET /v1/risk/protocols
 * List protocols by risk level
 */
export async function listProtocolsByRisk(req: Request, res: Response) {
  try {
    const {
      riskCategory,
      minScore,
      maxScore,
      sortBy = 'overall_risk_score',
      order = 'asc',
      limit = '100',
    } = req.query;

    let queryStr = `SELECT * FROM protocol_risk_assessments WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (riskCategory) {
      queryStr += ` AND risk_category = $${paramIndex}`;
      params.push(riskCategory);
      paramIndex++;
    }

    if (minScore) {
      queryStr += ` AND overall_risk_score >= $${paramIndex}`;
      params.push(parseFloat(minScore as string));
      paramIndex++;
    }

    if (maxScore) {
      queryStr += ` AND overall_risk_score <= $${paramIndex}`;
      params.push(parseFloat(maxScore as string));
      paramIndex++;
    }

    const validSortFields = [
      'overall_risk_score',
      'contract_risk_score',
      'liquidity_risk_score',
      'governance_risk_score',
      'operational_risk_score',
      'market_risk_score',
      'assessment_date',
    ];

    const sortField = validSortFields.includes(sortBy as string)
      ? sortBy
      : 'overall_risk_score';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    queryStr += ` ORDER BY ${sortField} ${sortOrder} LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string, 10));

    const result = await query<any>(queryStr, params);

    res.json({
      success: true,
      data: {
        count: result.rows.length,
        protocols: result.rows,
      },
    });
  } catch (error: any) {
    console.error('Error listing protocols by risk:', error);
    res.status(500).json({
      error: 'Failed to list protocols by risk',
      message: error.message,
    });
  }
}

