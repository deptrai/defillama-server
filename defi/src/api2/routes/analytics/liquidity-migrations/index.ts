/**
 * Liquidity Migrations API Routes
 * Story: 2.1.3 - Liquidity Analysis Tools
 */

import HyperExpress from 'hyper-express';
import { errorWrapper as ew } from '../../utils';
import { getTimeInFutureMinutes } from '../../../utils/time';
import { getMigrations } from '../liquidity/handlers';

const router = new HyperExpress.Router();

// Cache TTL: 5 minutes
const CACHE_MINUTES = 5;

/**
 * GET /v1/analytics/liquidity-migrations
 * Get liquidity migration data with filters
 */
router.get(
  '/',
  ew(async (req, res) => {
    // Set cache headers
    res.setHeaders({
      'Expires': getTimeInFutureMinutes(CACHE_MINUTES),
      'Cache-Control': `public, max-age=${CACHE_MINUTES * 60}`,
    });

    await getMigrations(req, res);
  })
);

export default router;

