/**
 * Yield Opportunities API Handlers
 * Story: 2.1.2 - Yield Opportunity Scanner
 */

import { Request, Response } from 'hyper-express';
import { yieldOpportunityEngine } from '../../../../analytics/engines/yield-opportunity-engine';
import { yieldHistoryEngine, TimeRange, Granularity } from '../../../../analytics/engines/yield-history-engine';
import { yieldRankingEngine, RankingCategory } from '../../../../analytics/engines/yield-ranking-engine';
import { alertMatchingEngine } from '../../../../analytics/engines/alert-matching-engine';
import {
  validateGetOpportunities,
  validateGetHistory,
  validateGetTop,
  validateCreateAlert,
  validateGetAlerts,
} from './validation';

/**
 * GET /v1/analytics/yield-opportunities
 * List yield opportunities with filters, sorting, and pagination
 */
export async function getOpportunities(req: Request, res: Response) {
  // Validate request
  const validation = validateGetOpportunities(req);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors,
    });
  }

  const query = req.query;

  // Parse filters
  const filters = {
    chains: query.chains ? (Array.isArray(query.chains) ? query.chains : [query.chains]) : undefined,
    protocols: query.protocols ? (Array.isArray(query.protocols) ? query.protocols : [query.protocols]) : undefined,
    poolTypes: query.poolTypes ? (Array.isArray(query.poolTypes) ? query.poolTypes : [query.poolTypes]) : undefined,
    minApy: query.minApy ? parseFloat(query.minApy as string) : undefined,
    maxRiskScore: query.maxRiskScore ? parseInt(query.maxRiskScore as string, 10) : undefined,
    minTvl: query.minTvl ? parseFloat(query.minTvl as string) : undefined,
  };

  // Parse sort options
  const sortOptions = {
    sortBy: (query.sortBy as any) || 'apy',
    sortOrder: (query.sortOrder as any) || 'desc',
  };

  // Parse pagination
  const pagination = {
    page: query.page ? parseInt(query.page as string, 10) : 1,
    pageSize: query.pageSize ? parseInt(query.pageSize as string, 10) : 20,
  };

  try {
    const result = await yieldOpportunityEngine.getOpportunities(filters, sortOptions, pagination);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting yield opportunities:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * GET /v1/analytics/yield-opportunities/:id/history
 * Get historical yield data for an opportunity
 */
export async function getHistory(req: Request, res: Response) {
  // Validate request
  const validation = validateGetHistory(req);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors,
    });
  }

  const { id } = req.params;
  const query = req.query;
  const timeRange = (query.timeRange as TimeRange) || '30d';
  const granularity = (query.granularity as Granularity) || 'daily';

  try {
    // Get historical data
    const history = await yieldHistoryEngine.getHistory(id, timeRange, granularity);

    // Get statistics
    const stats = await yieldHistoryEngine.getHistoryStats(id, timeRange);

    return res.status(200).json({
      opportunityId: id,
      timeRange,
      granularity,
      history,
      stats,
    });
  } catch (error) {
    console.error('Error getting yield history:', error);
    
    if (error instanceof Error && error.message.includes('No historical data')) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No historical data available for this opportunity',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * GET /v1/analytics/yield-opportunities/top
 * Get top yield opportunities by category
 */
export async function getTop(req: Request, res: Response) {
  // Validate request
  const validation = validateGetTop(req);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors,
    });
  }

  const query = req.query;
  const category = query.category as RankingCategory;
  const limit = query.limit ? parseInt(query.limit as string, 10) : 10;

  const filters = {
    maxRiskScore: query.maxRiskScore ? parseInt(query.maxRiskScore as string, 10) : undefined,
    minTvl: query.minTvl ? parseFloat(query.minTvl as string) : undefined,
  };

  try {
    const opportunities = await yieldRankingEngine.getTopOpportunities(category, limit, filters);

    return res.status(200).json({
      category,
      limit,
      opportunities,
    });
  } catch (error) {
    console.error('Error getting top opportunities:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * POST /v1/analytics/yield-alerts
 * Create a new yield alert
 */
export async function createAlert(req: Request, res: Response) {
  // Validate request
  const validation = validateCreateAlert(req);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors,
    });
  }

  const body = req.body;

  try {
    const alert = await alertMatchingEngine.createAlert({
      userId: body.userId,
      opportunityId: body.opportunityId,
      alertType: body.alertType,
      threshold: body.threshold,
      minApy: body.minApy,
      maxRiskScore: body.maxRiskScore,
      protocolIds: body.protocolIds,
      chainIds: body.chainIds,
      poolTypes: body.poolTypes,
      channels: body.channels,
      webhookUrl: body.webhookUrl,
      enabled: body.enabled !== undefined ? body.enabled : true,
    });

    return res.status(201).json(alert);
  } catch (error) {
    console.error('Error creating alert:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * GET /v1/analytics/yield-alerts
 * Get user's yield alerts
 */
export async function getAlerts(req: Request, res: Response) {
  // Validate request
  const validation = validateGetAlerts(req);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors,
    });
  }

  const query = req.query;
  const userId = query.userId as string;
  const enabled = query.enabled ? query.enabled === 'true' : undefined;

  try {
    const alerts = await alertMatchingEngine.getUserAlerts(userId, enabled);

    return res.status(200).json({
      userId,
      alerts,
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

