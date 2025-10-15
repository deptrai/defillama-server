/**
 * Yield Opportunities API Routes
 * Story: 2.1.2 - Yield Opportunity Scanner
 */

import HyperExpress from 'hyper-express';
import { errorWrapper as ew } from '../../utils';
import { getTimeInFutureMinutes } from '../../../utils/time';
import * as handlers from './handlers';

const router = new HyperExpress.Router();

// Cache TTL: 5 minutes for most endpoints
const CACHE_MINUTES = 5;

/**
 * GET /v1/analytics/yield-opportunities
 * List yield opportunities with filters, sorting, and pagination
 */
router.get(
  '/',
  ew(async (req, res) => {
    // Set cache headers
    res.setHeaders({
      'Expires': getTimeInFutureMinutes(CACHE_MINUTES),
      'Cache-Control': `public, max-age=${CACHE_MINUTES * 60}`,
    });

    await handlers.getOpportunities(req, res);
  })
);

/**
 * GET /v1/analytics/yield-opportunities/top
 * Get top yield opportunities by category
 * Note: This must come BEFORE /:id routes to avoid matching "top" as an ID
 */
router.get(
  '/top',
  ew(async (req, res) => {
    // Set cache headers
    res.setHeaders({
      'Expires': getTimeInFutureMinutes(CACHE_MINUTES),
      'Cache-Control': `public, max-age=${CACHE_MINUTES * 60}`,
    });

    await handlers.getTop(req, res);
  })
);

/**
 * GET /v1/analytics/yield-opportunities/:id/history
 * Get historical yield data for an opportunity
 */
router.get(
  '/:id/history',
  ew(async (req, res) => {
    // Set cache headers
    res.setHeaders({
      'Expires': getTimeInFutureMinutes(CACHE_MINUTES),
      'Cache-Control': `public, max-age=${CACHE_MINUTES * 60}`,
    });

    await handlers.getHistory(req, res);
  })
);

export default router;

