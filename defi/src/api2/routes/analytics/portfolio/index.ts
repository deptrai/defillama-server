/**
 * Portfolio API Routes
 * Story: 2.2.1 - Wallet Portfolio Tracking
 * 
 * Endpoints:
 * - GET /v1/portfolio/:walletAddress - Portfolio summary
 * - GET /v1/portfolio/:walletAddress/allocation - Asset allocation
 * - GET /v1/portfolio/:walletAddress/holdings - Detailed holdings
 * - GET /v1/portfolio/:walletAddress/performance - Performance history
 * - GET /v1/portfolio/compare - Compare wallets
 */

import { Router } from 'hyper-express';
import { ew } from '../../../utils/error-wrapper';
import {
  getPortfolioSummary,
  getAssetAllocation,
  getHoldings,
  getPerformance,
  compareWallets,
} from './handlers';

const router = new Router();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

/**
 * GET /v1/portfolio/:walletAddress
 * Get portfolio summary for a wallet
 */
router.get('/:walletAddress', ew(async (req, res) => {
  const result = await getPortfolioSummary(req, res);
  
  // Set cache headers
  const expires = new Date(Date.now() + CACHE_TTL);
  res.setHeader('Expires', expires.toUTCString());
  res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL / 1000}`);
  
  res.json(result);
}));

/**
 * GET /v1/portfolio/:walletAddress/allocation
 * Get asset allocation breakdown
 */
router.get('/:walletAddress/allocation', ew(async (req, res) => {
  const result = await getAssetAllocation(req, res);
  
  // Set cache headers
  const expires = new Date(Date.now() + CACHE_TTL);
  res.setHeader('Expires', expires.toUTCString());
  res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL / 1000}`);
  
  res.json(result);
}));

/**
 * GET /v1/portfolio/:walletAddress/holdings
 * Get detailed holdings
 */
router.get('/:walletAddress/holdings', ew(async (req, res) => {
  const result = await getHoldings(req, res);
  
  // Set cache headers
  const expires = new Date(Date.now() + CACHE_TTL);
  res.setHeader('Expires', expires.toUTCString());
  res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL / 1000}`);
  
  res.json(result);
}));

/**
 * GET /v1/portfolio/:walletAddress/performance
 * Get performance history
 */
router.get('/:walletAddress/performance', ew(async (req, res) => {
  const result = await getPerformance(req, res);
  
  // Set cache headers
  const expires = new Date(Date.now() + CACHE_TTL);
  res.setHeader('Expires', expires.toUTCString());
  res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL / 1000}`);
  
  res.json(result);
}));

/**
 * GET /v1/portfolio/compare
 * Compare multiple wallets
 */
router.get('/compare', ew(async (req, res) => {
  const result = await compareWallets(req, res);
  
  // Set cache headers
  const expires = new Date(Date.now() + CACHE_TTL);
  res.setHeader('Expires', expires.toUTCString());
  res.setHeader('Cache-Control', `public, max-age=${CACHE_TTL / 1000}`);
  
  res.json(result);
}));

export default router;

