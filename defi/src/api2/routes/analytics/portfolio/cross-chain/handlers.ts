/**
 * API Handlers: Cross-chain Portfolio
 * Story: 2.2.3 - Cross-chain Portfolio Aggregation
 */

import type { Request, Response } from 'hyper-express';
import { CrossChainAggregationEngine } from '../../../../../analytics/engines/cross-chain-aggregation-engine';
import {
  validateUserId,
  validateChainId,
  validateCategory,
  validateMinValue,
  validateTransactionType,
  validatePagination,
} from './validation';

// Get engine instance
const aggregationEngine = CrossChainAggregationEngine.getInstance();

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
 * GET /v1/analytics/portfolio/cross-chain/:userId
 * Get aggregated cross-chain portfolio
 */
export async function getPortfolio(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    // Validate user ID
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.success) {
      res.status(400).json({ error: userIdValidation.error });
      return;
    }

    // Get portfolio
    const portfolio = await aggregationEngine.getPortfolio(userId);

    // Set cache headers
    setCacheHeaders(res);

    res.json(portfolio);
  } catch (error: any) {
    if (error.message.includes('No cross-chain portfolio found')) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error getting cross-chain portfolio:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

/**
 * GET /v1/analytics/portfolio/cross-chain/:userId/assets
 * Get detailed assets across all chains
 */
export async function getAssets(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { chainId, category, minValue } = req.query as Record<string, string>;

    // Validate user ID
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.success) {
      res.status(400).json({ error: userIdValidation.error });
      return;
    }

    // Validate filters
    const chainValidation = validateChainId(chainId);
    if (!chainValidation.success) {
      res.status(400).json({ error: chainValidation.error });
      return;
    }

    const categoryValidation = validateCategory(category);
    if (!categoryValidation.success) {
      res.status(400).json({ error: categoryValidation.error });
      return;
    }

    const minValueValidation = validateMinValue(minValue);
    if (!minValueValidation.success) {
      res.status(400).json({ error: minValueValidation.error });
      return;
    }

    // Get assets with filters
    const assets = await aggregationEngine.getAssets(userId, {
      chainId,
      category,
      minValueUsd: minValue ? parseFloat(minValue) : undefined,
    });

    // Set cache headers
    setCacheHeaders(res);

    res.json({ assets, total: assets.length });
  } catch (error: any) {
    if (error.message.includes('No cross-chain portfolio found')) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error getting cross-chain assets:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

/**
 * GET /v1/analytics/portfolio/cross-chain/:userId/transactions
 * Get cross-chain transaction history
 */
export async function getTransactions(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { chainId, type, limit, offset } = req.query as Record<string, string>;

    // Validate user ID
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.success) {
      res.status(400).json({ error: userIdValidation.error });
      return;
    }

    // Validate filters
    const chainValidation = validateChainId(chainId);
    if (!chainValidation.success) {
      res.status(400).json({ error: chainValidation.error });
      return;
    }

    const typeValidation = validateTransactionType(type);
    if (!typeValidation.success) {
      res.status(400).json({ error: typeValidation.error });
      return;
    }

    const paginationValidation = validatePagination(limit, offset);
    if (!paginationValidation.success) {
      res.status(400).json({ error: paginationValidation.error });
      return;
    }

    // Get transactions with filters
    const result = await aggregationEngine.getCrossChainTransactions(userId, {
      chainId,
      type,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    // Set cache headers
    setCacheHeaders(res);

    res.json(result);
  } catch (error: any) {
    if (error.message.includes('No cross-chain portfolio found')) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error getting cross-chain transactions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

/**
 * GET /v1/analytics/portfolio/cross-chain/:userId/performance
 * Get cross-chain performance metrics
 */
export async function getPerformance(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    // Validate user ID
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.success) {
      res.status(400).json({ error: userIdValidation.error });
      return;
    }

    // Get performance metrics
    const performance = await aggregationEngine.getPerformanceMetrics(userId);

    // Set cache headers
    setCacheHeaders(res);

    res.json(performance);
  } catch (error: any) {
    if (error.message.includes('No cross-chain portfolio found')) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error getting cross-chain performance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

/**
 * GET /v1/analytics/portfolio/cross-chain/:userId/chains
 * Compare performance across chains
 */
export async function getChainComparison(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    // Validate user ID
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.success) {
      res.status(400).json({ error: userIdValidation.error });
      return;
    }

    // Get chain comparison
    const chains = await aggregationEngine.compareChainPerformance(userId);

    // Set cache headers
    setCacheHeaders(res);

    res.json({ chains });
  } catch (error: any) {
    if (error.message.includes('No cross-chain portfolio found')) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error getting chain comparison:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

