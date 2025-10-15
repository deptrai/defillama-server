/**
 * API Routes: Cross-chain Portfolio
 * Story: 2.2.3 - Cross-chain Portfolio Aggregation
 */

import { Router } from 'hyper-express';
import { errorWrapper as ew } from '../../../utils';
import {
  getPortfolio,
  getAssets,
  getTransactions,
  getPerformance,
  getChainComparison,
} from './handlers';

const router = new Router();

/**
 * GET /v1/analytics/portfolio/cross-chain/:userId
 * Get aggregated cross-chain portfolio
 * 
 * Query params: None
 * Response: CrossChainPortfolio object
 */
router.get('/cross-chain/:userId', ew(getPortfolio));

/**
 * GET /v1/analytics/portfolio/cross-chain/:userId/assets
 * Get detailed assets across all chains
 * 
 * Query params:
 * - chainId (optional): Filter by chain (ethereum, polygon, arbitrum, etc.)
 * - category (optional): Filter by category (defi, stablecoin, native, other)
 * - minValue (optional): Minimum USD value filter
 * 
 * Response: { assets: CrossChainAsset[], total: number }
 */
router.get('/cross-chain/:userId/assets', ew(getAssets));

/**
 * GET /v1/analytics/portfolio/cross-chain/:userId/transactions
 * Get cross-chain transaction history
 * 
 * Query params:
 * - chainId (optional): Filter by chain
 * - type (optional): Filter by transaction type (transfer, swap, stake, unstake, claim)
 * - limit (optional): Number of transactions to return (default: 50, max: 1000)
 * - offset (optional): Pagination offset (default: 0)
 * 
 * Response: { transactions: CrossChainTransaction[], total: number }
 */
router.get('/cross-chain/:userId/transactions', ew(getTransactions));

/**
 * GET /v1/analytics/portfolio/cross-chain/:userId/performance
 * Get cross-chain performance metrics
 * 
 * Query params: None
 * Response: PerformanceMetrics object
 */
router.get('/cross-chain/:userId/performance', ew(getPerformance));

/**
 * GET /v1/analytics/portfolio/cross-chain/:userId/chains
 * Compare performance across chains
 * 
 * Query params: None
 * Response: { chains: ChainPerformance[] }
 */
router.get('/cross-chain/:userId/chains', ew(getChainComparison));

export default router;

