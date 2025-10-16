/**
 * Holder Distribution API Routes
 * Story: 2.2.2 - Holder Distribution Analysis
 * 
 * Endpoints:
 * - GET /v1/analytics/tokens/:tokenAddress/holders/distribution - Distribution metrics
 * - GET /v1/analytics/tokens/:tokenAddress/holders/top - Top holders list
 * - GET /v1/analytics/tokens/:tokenAddress/holders/behavior - Behavior analysis
 * - GET /v1/analytics/tokens/:tokenAddress/holders/history - Historical distribution
 * - POST /v1/analytics/tokens/:tokenAddress/holders/alerts - Create alert
 * - GET /v1/analytics/tokens/:tokenAddress/holders/alerts - Get user alerts
 * - DELETE /v1/analytics/tokens/:tokenAddress/holders/alerts/:alertId - Delete alert
 */

import { Router } from 'hyper-express';
import { errorWrapper as ew } from '../../utils';
import {
  getDistribution,
  getTopHolders,
  getBehavior,
  getHistory,
  createAlert,
  getUserAlerts,
  deleteAlert,
} from './handlers';

const router = new Router();

// GET /v1/analytics/tokens/:tokenAddress/holders/distribution
router.get('/tokens/:tokenAddress/holders/distribution', ew(getDistribution));

// GET /v1/analytics/tokens/:tokenAddress/holders/top
router.get('/tokens/:tokenAddress/holders/top', ew(getTopHolders));

// GET /v1/analytics/tokens/:tokenAddress/holders/behavior
router.get('/tokens/:tokenAddress/holders/behavior', ew(getBehavior));

// GET /v1/analytics/tokens/:tokenAddress/holders/history
router.get('/tokens/:tokenAddress/holders/history', ew(getHistory));

// POST /v1/analytics/tokens/:tokenAddress/holders/alerts
router.post('/tokens/:tokenAddress/holders/alerts', ew(createAlert));

// GET /v1/analytics/tokens/:tokenAddress/holders/alerts
router.get('/tokens/:tokenAddress/holders/alerts', ew(getUserAlerts));

// DELETE /v1/analytics/tokens/:tokenAddress/holders/alerts/:alertId
router.delete('/tokens/:tokenAddress/holders/alerts/:alertId', ew(deleteAlert));

export default router;

