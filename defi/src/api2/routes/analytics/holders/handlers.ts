/**
 * Holder Distribution API Handlers
 * Story: 2.2.2 - Holder Distribution Analysis
 */

import { Request, Response } from 'hyper-express';
import { HolderDistributionEngine } from '../../../analytics/engines/holder-distribution-engine';
import { HolderBehaviorEngine } from '../../../analytics/engines/holder-behavior-engine';
import { DistributionAlertEngine } from '../../../analytics/engines/distribution-alert-engine';
import {
  validateDistributionRequest,
  validateTopHoldersRequest,
  validateBehaviorRequest,
  validateHistoryRequest,
  validateCreateAlertRequest,
} from './validation';

// Get engine instances
const distributionEngine = HolderDistributionEngine.getInstance();
const behaviorEngine = HolderBehaviorEngine.getInstance();
const alertEngine = DistributionAlertEngine.getInstance();

/**
 * Set cache headers (5-min TTL)
 */
function setCacheHeaders(res: Response): void {
  const ttl = 5 * 60; // 5 minutes
  const expires = new Date(Date.now() + ttl * 1000);
  res.setHeader('Expires', expires.toUTCString());
  res.setHeader('Cache-Control', `public, max-age=${ttl}`);
}

/**
 * GET /v1/analytics/tokens/:tokenAddress/holders/distribution
 * Get holder distribution metrics
 */
export async function getDistribution(req: Request, res: Response): Promise<void> {
  try {
    const { tokenAddress } = req.path_parameters;
    const chainId = (req.query.chainId as string) || 'ethereum';

    // Validate
    const validation = validateDistributionRequest(tokenAddress, chainId);
    if (!validation.success) {
      res.status(400).json({ error: validation.error });
      return;
    }

    // Get distribution
    const distribution = await distributionEngine.getDistribution(tokenAddress, chainId);

    // Set cache headers
    setCacheHeaders(res);

    res.json(distribution);
  } catch (error: any) {
    console.error('Error getting distribution:', error);
    if (error.message?.includes('No holders found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

/**
 * GET /v1/analytics/tokens/:tokenAddress/holders/top
 * Get top holders
 */
export async function getTopHolders(req: Request, res: Response): Promise<void> {
  try {
    const { tokenAddress } = req.path_parameters;
    const chainId = (req.query.chainId as string) || 'ethereum';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const excludeContracts = req.query.excludeContracts === 'true';
    const excludeExchanges = req.query.excludeExchanges === 'true';

    // Validate
    const validation = validateTopHoldersRequest(
      tokenAddress,
      chainId,
      limit,
      excludeContracts,
      excludeExchanges
    );
    if (!validation.success) {
      res.status(400).json({ error: validation.error });
      return;
    }

    // Get top holders
    const holders = await distributionEngine.getTopHolders(tokenAddress, chainId, {
      limit,
      excludeContracts,
      excludeExchanges,
    });

    // Set cache headers
    setCacheHeaders(res);

    res.json({
      tokenAddress,
      chainId,
      holders,
    });
  } catch (error: any) {
    console.error('Error getting top holders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /v1/analytics/tokens/:tokenAddress/holders/behavior
 * Get holder behavior analysis
 */
export async function getBehavior(req: Request, res: Response): Promise<void> {
  try {
    const { tokenAddress } = req.path_parameters;
    const chainId = (req.query.chainId as string) || 'ethereum';
    const timeRange = (req.query.timeRange as '7d' | '30d' | '90d' | '1y') || '30d';

    // Validate
    const validation = validateBehaviorRequest(tokenAddress, chainId, timeRange);
    if (!validation.success) {
      res.status(400).json({ error: validation.error });
      return;
    }

    // Get behavior
    const behavior = await behaviorEngine.getBehavior(tokenAddress, chainId, timeRange);

    // Set cache headers
    setCacheHeaders(res);

    res.json(behavior);
  } catch (error: any) {
    console.error('Error getting behavior:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /v1/analytics/tokens/:tokenAddress/holders/history
 * Get distribution history
 */
export async function getHistory(req: Request, res: Response): Promise<void> {
  try {
    const { tokenAddress } = req.path_parameters;
    const chainId = (req.query.chainId as string) || 'ethereum';
    const timeRange = (req.query.timeRange as '7d' | '30d' | '90d' | '1y') || '30d';
    const granularity = (req.query.granularity as 'daily' | 'weekly') || 'daily';

    // Validate
    const validation = validateHistoryRequest(tokenAddress, chainId, timeRange, granularity);
    if (!validation.success) {
      res.status(400).json({ error: validation.error });
      return;
    }

    // Get history
    const history = await behaviorEngine.getHistory(tokenAddress, chainId, timeRange, granularity);

    // Set cache headers
    setCacheHeaders(res);

    res.json(history);
  } catch (error: any) {
    console.error('Error getting history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /v1/analytics/tokens/:tokenAddress/holders/alerts
 * Create distribution alert
 */
export async function createAlert(req: Request, res: Response): Promise<void> {
  try {
    const { tokenAddress } = req.path_parameters;
    const body = await req.json();

    const {
      userId,
      chainId,
      alertType,
      threshold,
      channels,
      webhookUrl,
    } = body;

    // Validate
    const validation = validateCreateAlertRequest(
      userId,
      tokenAddress,
      chainId,
      alertType,
      threshold,
      channels
    );
    if (!validation.success) {
      res.status(400).json({ error: validation.error });
      return;
    }

    // Create alert
    const alert = await alertEngine.createAlert({
      userId,
      tokenAddress,
      chainId: chainId || 'ethereum',
      alertType,
      threshold,
      channels,
      webhookUrl,
    });

    res.status(201).json(alert);
  } catch (error: any) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /v1/analytics/tokens/:tokenAddress/holders/alerts
 * Get user alerts for a token
 */
export async function getUserAlerts(req: Request, res: Response): Promise<void> {
  try {
    const { tokenAddress } = req.path_parameters;
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Get alerts
    const alerts = await alertEngine.getUserAlerts(userId, tokenAddress);

    // Set cache headers
    setCacheHeaders(res);

    res.json({
      tokenAddress,
      userId,
      alerts,
    });
  } catch (error: any) {
    console.error('Error getting user alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /v1/analytics/tokens/:tokenAddress/holders/alerts/:alertId
 * Delete an alert
 */
export async function deleteAlert(req: Request, res: Response): Promise<void> {
  try {
    const { alertId } = req.path_parameters;

    if (!alertId) {
      res.status(400).json({ error: 'alertId is required' });
      return;
    }

    // Delete alert
    await alertEngine.deleteAlert(alertId);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

