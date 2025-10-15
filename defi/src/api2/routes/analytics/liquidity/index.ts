/**
 * Liquidity Analysis API Routes
 * Story: 2.1.3 - Liquidity Analysis Tools
 */

import HyperExpress from 'hyper-express';
import { errorWrapper as ew } from '../../utils';
import { getTimeInFutureMinutes } from '../../../utils/time';
import * as handlers from './handlers';

const router = new HyperExpress.Router();

// Cache TTL: 5 minutes for all endpoints
const CACHE_MINUTES = 5;

/**
 * GET /v1/analytics/liquidity-pools
 * List liquidity pools with filters, sorting, and pagination
 */
router.get(
  '/',
  ew(async (req, res) => {
    // Set cache headers
    res.setHeaders({
      'Expires': getTimeInFutureMinutes(CACHE_MINUTES),
      'Cache-Control': `public, max-age=${CACHE_MINUTES * 60}`,
    });

    await handlers.getPoolsList(req, res);
  })
);

/**
 * GET /v1/analytics/liquidity-pools/:id/depth
 * Get depth chart for a specific pool
 */
router.get(
  '/:id/depth',
  ew(async (req, res) => {
    // Set cache headers
    res.setHeaders({
      'Expires': getTimeInFutureMinutes(CACHE_MINUTES),
      'Cache-Control': `public, max-age=${CACHE_MINUTES * 60}`,
    });

    await handlers.getPoolDepth(req, res);
  })
);

/**
 * GET /v1/analytics/liquidity-pools/:id/providers
 * Get LP analysis for a pool
 */
router.get(
  '/:id/providers',
  ew(async (req, res) => {
    // Set cache headers
    res.setHeaders({
      'Expires': getTimeInFutureMinutes(CACHE_MINUTES),
      'Cache-Control': `public, max-age=${CACHE_MINUTES * 60}`,
    });

    await handlers.getPoolProviders(req, res);
  })
);

/**
 * GET /v1/analytics/liquidity-pools/:id/impermanent-loss
 * Get impermanent loss data for a pool
 */
router.get(
  '/:id/impermanent-loss',
  ew(async (req, res) => {
    // Set cache headers
    res.setHeaders({
      'Expires': getTimeInFutureMinutes(CACHE_MINUTES),
      'Cache-Control': `public, max-age=${CACHE_MINUTES * 60}`,
    });

    await handlers.getPoolIL(req, res);
  })
);

export default router;

