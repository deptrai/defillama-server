/**
 * Portfolio API Handlers
 * Story: 2.2.1 - Wallet Portfolio Tracking
 */

import { Request, Response } from 'hyper-express';
import { PortfolioValuationEngine } from '../../../../analytics/engines/portfolio-valuation-engine';
import { AssetAllocationEngine } from '../../../../analytics/engines/asset-allocation-engine';
import { PerformanceTrackingEngine } from '../../../../analytics/engines/performance-tracking-engine';
import {
  validatePortfolioSummaryRequest,
  validateAllocationRequest,
  validateHoldingsRequest,
  validatePerformanceRequest,
  validateCompareRequest,
} from './validation';

const portfolioValuation = PortfolioValuationEngine.getInstance();
const assetAllocation = AssetAllocationEngine.getInstance();
const performanceTracking = PerformanceTrackingEngine.getInstance();

/**
 * Get portfolio summary
 */
export async function getPortfolioSummary(req: Request, res: Response) {
  const { walletAddress } = req.path_parameters;
  const chains = req.query.chains ? (req.query.chains as string).split(',') : undefined;
  const includeNfts = req.query.includeNfts === 'true';

  // Validate request
  const validation = validatePortfolioSummaryRequest(walletAddress, chains, includeNfts);
  if (!validation.success) {
    res.status(400);
    return { error: validation.error };
  }

  try {
    const summary = await portfolioValuation.getPortfolioSummary(walletAddress, chains);
    return summary;
  } catch (error: any) {
    if (error.message.includes('No portfolio found')) {
      res.status(404);
      return { error: `Portfolio not found for wallet ${walletAddress}` };
    }
    throw error;
  }
}

/**
 * Get asset allocation
 */
export async function getAssetAllocation(req: Request, res: Response) {
  const { walletAddress } = req.path_parameters;
  const groupBy = (req.query.groupBy as string) || 'token';
  const minAllocation = req.query.minAllocation ? parseFloat(req.query.minAllocation as string) : undefined;

  // Validate request
  const validation = validateAllocationRequest(walletAddress, groupBy, minAllocation);
  if (!validation.success) {
    res.status(400);
    return { error: validation.error };
  }

  try {
    const allocation = await assetAllocation.getAllocation(
      walletAddress,
      groupBy as 'token' | 'protocol' | 'chain' | 'category',
      minAllocation
    );
    return allocation;
  } catch (error: any) {
    if (error.message.includes('Invalid groupBy')) {
      res.status(400);
      return { error: error.message };
    }
    throw error;
  }
}

/**
 * Get detailed holdings
 */
export async function getHoldings(req: Request, res: Response) {
  const { walletAddress } = req.path_parameters;
  const chains = req.query.chains ? (req.query.chains as string).split(',') : undefined;
  const minValue = req.query.minValue ? parseFloat(req.query.minValue as string) : undefined;
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

  // Validate request
  const validation = validateHoldingsRequest(walletAddress, chains, minValue, page, limit);
  if (!validation.success) {
    res.status(400);
    return { error: validation.error };
  }

  try {
    const result = await assetAllocation.getHoldings(walletAddress, {
      chains,
      minValue,
      page,
      limit,
    });

    return {
      walletAddress,
      holdings: result.holdings,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  } catch (error: any) {
    throw error;
  }
}

/**
 * Get performance history
 */
export async function getPerformance(req: Request, res: Response) {
  const { walletAddress } = req.path_parameters;
  const timeRange = (req.query.timeRange as string) || '30d';
  const granularity = (req.query.granularity as string) || 'daily';
  const benchmark = (req.query.benchmark as string) || 'none';

  // Validate request
  const validation = validatePerformanceRequest(walletAddress, timeRange, granularity, benchmark);
  if (!validation.success) {
    res.status(400);
    return { error: validation.error };
  }

  try {
    const performance = await performanceTracking.getPerformance(
      walletAddress,
      timeRange as '7d' | '30d' | '90d' | '1y' | 'all',
      granularity as 'hourly' | 'daily' | 'weekly',
      benchmark as 'eth' | 'btc' | 'none'
    );
    return performance;
  } catch (error: any) {
    if (error.message.includes('No portfolio found')) {
      res.status(404);
      return { error: `Portfolio not found for wallet ${walletAddress}` };
    }
    throw error;
  }
}

/**
 * Compare wallets
 */
export async function compareWallets(req: Request, res: Response) {
  const wallets = req.query.wallets ? (req.query.wallets as string).split(',') : [];
  const timeRange = (req.query.timeRange as string) || '30d';

  // Validate request
  const validation = validateCompareRequest(wallets, timeRange);
  if (!validation.success) {
    res.status(400);
    return { error: validation.error };
  }

  try {
    const comparison = await performanceTracking.compareWallets(
      wallets,
      timeRange as '7d' | '30d' | '90d' | '1y'
    );
    return comparison;
  } catch (error: any) {
    if (error.message.includes('Must provide')) {
      res.status(400);
      return { error: error.message };
    }
    if (error.message.includes('No portfolio found')) {
      res.status(404);
      return { error: error.message };
    }
    throw error;
  }
}

