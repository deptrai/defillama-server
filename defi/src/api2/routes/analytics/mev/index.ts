/**
 * MEV API Routes
 * Story: 4.1.1 - MEV Opportunity Detection
 * 
 * API endpoints for MEV opportunity detection and analysis
 */

import * as HyperExpress from 'hyper-express';
import { query } from '../../../../analytics/db/connection';
import { successResponse, errorResponse } from '../../utils';
import {
  validateListOpportunitiesQuery,
  validateStatsQuery,
  validateDetectQuery,
  validateOpportunityId,
  validateProtectionAnalysisRequest,
} from './validation';
import {
  SandwichDetector,
  FrontrunDetector,
  ArbitrageDetector,
  LiquidationDetector,
  BackrunDetector,
} from '../../../../analytics/engines';
import { MEVProtectionAnalyzer } from '../../../../analytics/engines/mev-protection-analyzer';

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /v1/analytics/mev/opportunities
 * List MEV opportunities with filtering and pagination
 */
async function listOpportunities(req: any, res: any) {
  try {
    const params = validateListOpportunitiesQuery(req.query_parameters);
    
    // Build SQL query
    let sql = `
      SELECT * FROM mev_opportunities
      WHERE timestamp >= $1 AND timestamp <= $2
    `;
    
    const values: any[] = [params.time_range.start, params.time_range.end];
    let paramIndex = 3;
    
    // Add filters
    if (params.chain_id) {
      sql += ` AND chain_id = $${paramIndex++}`;
      values.push(params.chain_id);
    }
    
    if (params.opportunity_type) {
      sql += ` AND opportunity_type = $${paramIndex++}`;
      values.push(params.opportunity_type);
    }
    
    if (params.min_profit > 0) {
      sql += ` AND mev_profit_usd >= $${paramIndex++}`;
      values.push(params.min_profit);
    }
    
    if (params.min_confidence > 0) {
      sql += ` AND confidence_score >= $${paramIndex++}`;
      values.push(params.min_confidence);
    }
    
    if (params.status) {
      sql += ` AND status = $${paramIndex++}`;
      values.push(params.status);
    }
    
    // Add sorting
    sql += ` ORDER BY ${params.sort_by} ${params.order}`;
    
    // Add pagination
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(params.pagination.limit, params.pagination.offset);
    
    // Execute query
    const result = await query(sql, values);
    
    // Get total count
    let countSql = `
      SELECT COUNT(*) as total FROM mev_opportunities
      WHERE timestamp >= $1 AND timestamp <= $2
    `;
    const countValues = [params.time_range.start, params.time_range.end];
    const countResult = await query(countSql, countValues);
    const total = parseInt(countResult.rows[0].total, 10);
    
    return successResponse(res, {
      opportunities: result.rows,
      pagination: {
        page: params.pagination.page,
        limit: params.pagination.limit,
        total,
        total_pages: Math.ceil(total / params.pagination.limit),
      },
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
}

/**
 * GET /v1/analytics/mev/opportunities/:id
 * Get MEV opportunity by ID
 */
async function getOpportunityById(req: any, res: any) {
  try {
    const id = validateOpportunityId(req.path_parameters.id);
    
    const sql = `SELECT * FROM mev_opportunities WHERE id = $1`;
    const result = await query(sql, [id]);
    
    if (result.rows.length === 0) {
      return errorResponse(res, 'Opportunity not found', 404);
    }
    
    return successResponse(res, result.rows[0]);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
}

/**
 * GET /v1/analytics/mev/stats
 * Get MEV statistics
 */
async function getStats(req: any, res: any) {
  try {
    const params = validateStatsQuery(req.query_parameters);
    
    // Total profit by type
    const profitByTypeSql = `
      SELECT 
        opportunity_type,
        COUNT(*) as count,
        SUM(mev_profit_usd) as total_profit,
        AVG(mev_profit_usd) as avg_profit,
        MAX(mev_profit_usd) as max_profit
      FROM mev_opportunities
      WHERE timestamp >= $1 AND timestamp <= $2
        AND chain_id = $3
      GROUP BY opportunity_type
    `;
    
    const profitByType = await query(profitByTypeSql, [
      params.time_range.start,
      params.time_range.end,
      params.chain_id,
    ]);
    
    // Overall stats
    const overallSql = `
      SELECT 
        COUNT(*) as total_opportunities,
        SUM(mev_profit_usd) as total_profit,
        AVG(mev_profit_usd) as avg_profit,
        AVG(confidence_score) as avg_confidence
      FROM mev_opportunities
      WHERE timestamp >= $1 AND timestamp <= $2
        AND chain_id = $3
    `;
    
    const overall = await query(overallSql, [
      params.time_range.start,
      params.time_range.end,
      params.chain_id,
    ]);
    
    return successResponse(res, {
      overall: overall.rows[0],
      by_type: profitByType.rows,
      time_range: params.time_range,
      chain_id: params.chain_id,
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
}

/**
 * POST /v1/analytics/mev/detect
 * Trigger MEV detection
 */
async function detectOpportunities(req: any, res: any) {
  try {
    const params = validateDetectQuery(req.query_parameters);

    let results: any[] = [];

    // Run appropriate detector
    switch (params.opportunity_type) {
      case 'sandwich':
        const sandwichDetector = SandwichDetector.getInstance();
        results = await sandwichDetector.detectSandwichAttacks(
          params.chain_id,
          params.block_number
        );
        break;

      case 'frontrun':
        const frontrunDetector = FrontrunDetector.getInstance();
        results = await frontrunDetector.detectFrontrunning(
          params.chain_id,
          params.block_number
        );
        break;

      case 'arbitrage':
        const arbitrageDetector = ArbitrageDetector.getInstance();
        results = await arbitrageDetector.detectArbitrage(params.chain_id);
        break;

      case 'liquidation':
        const liquidationDetector = LiquidationDetector.getInstance();
        results = await liquidationDetector.detectLiquidations(params.chain_id);
        break;

      case 'backrun':
        const backrunDetector = BackrunDetector.getInstance();
        results = await backrunDetector.detectBackrunning(
          params.chain_id,
          params.block_number
        );
        break;
    }

    return successResponse(res, {
      opportunity_type: params.opportunity_type,
      chain_id: params.chain_id,
      block_number: params.block_number,
      results_count: results.length,
      results: results.filter(r => r.detected),
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
}

/**
 * POST /v1/analytics/mev/protection/analyze
 * Analyze transaction vulnerability to MEV attacks
 * Story: 4.1.2 - MEV Protection Insights
 */
async function analyzeProtection(req: any, res: any) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const params = validateProtectionAnalysisRequest(body);

    // Analyze vulnerability
    const analyzer = MEVProtectionAnalyzer.getInstance();
    const assessment = await analyzer.analyzeVulnerability(params);

    // Save to database
    const sql = `
      INSERT INTO transaction_vulnerability_assessments (
        tx_hash, user_address, chain_id, timestamp,
        token_in_address, token_out_address,
        amount_in, amount_out,
        slippage_tolerance,
        vulnerability_score, risk_category,
        sandwich_risk, frontrun_risk, backrun_risk,
        estimated_mev_loss_usd, estimated_slippage_pct,
        recommended_slippage, recommended_gas_price,
        use_private_mempool, use_mev_protection_rpc,
        alternative_routes, simulation_results
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING id
    `;

    const values = [
      null, // tx_hash (not yet executed)
      params.from_address || 'unknown',
      params.chain_id,
      assessment.timestamp,
      params.token_in_address,
      params.token_out_address,
      params.amount_in,
      assessment.simulation.expected_case.amount_out,
      params.slippage_tolerance_pct,
      assessment.vulnerability_score,
      assessment.risk_category,
      assessment.risks.sandwich_risk,
      assessment.risks.frontrun_risk,
      assessment.risks.backrun_risk,
      assessment.estimated_impact.mev_loss_usd,
      assessment.estimated_impact.slippage_pct,
      assessment.recommendations.recommended_slippage,
      assessment.recommendations.recommended_gas_price,
      assessment.recommendations.use_private_mempool,
      assessment.recommendations.use_mev_protection_rpc,
      JSON.stringify(assessment.recommendations.alternative_routes || []),
      JSON.stringify(assessment.simulation),
    ];

    await query(sql, values);

    return successResponse(res, assessment);
  } catch (error: any) {
    return errorResponse(res, error.message, 400);
  }
}

// ============================================================================
// Route Registration
// ============================================================================

export default function registerMEVRoutes(router: HyperExpress.Router) {
  // List opportunities
  router.get('/v1/analytics/mev/opportunities', async (req: any, res: any) => {
    return listOpportunities(req, res);
  });

  // Get opportunity by ID
  router.get('/v1/analytics/mev/opportunities/:id', async (req: any, res: any) => {
    return getOpportunityById(req, res);
  });

  // Get statistics
  router.get('/v1/analytics/mev/stats', async (req: any, res: any) => {
    return getStats(req, res);
  });

  // Trigger detection
  router.post('/v1/analytics/mev/detect', async (req: any, res: any) => {
    return detectOpportunities(req, res);
  });

  // Analyze protection (Story 4.1.2)
  router.post('/v1/analytics/mev/protection/analyze', async (req: any, res: any) => {
    return analyzeProtection(req, res);
  });
}

