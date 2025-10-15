/**
 * Yield Alerts API Routes
 * Story: 2.1.2 - Yield Opportunity Scanner
 */

import HyperExpress from 'hyper-express';
import { errorWrapper as ew } from '../../utils';
import { getTimeInFutureMinutes } from '../../../utils/time';
import { createAlert, getAlerts } from '../yield-opportunities/handlers';

const router = new HyperExpress.Router();

// Cache TTL: 1 minute for alerts (more dynamic)
const CACHE_MINUTES = 1;

/**
 * POST /v1/analytics/yield-alerts
 * Create a new yield alert
 */
router.post(
  '/',
  ew(async (req, res) => {
    await createAlert(req, res);
  })
);

/**
 * GET /v1/analytics/yield-alerts
 * Get user's yield alerts
 */
router.get(
  '/',
  ew(async (req, res) => {
    // Set cache headers
    res.setHeaders({
      'Expires': getTimeInFutureMinutes(CACHE_MINUTES),
      'Cache-Control': `public, max-age=${CACHE_MINUTES * 60}`,
    });

    await getAlerts(req, res);
  })
);

export default router;

