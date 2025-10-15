/**
 * Smart Money API Routes
 * Story: 3.1.1 - Smart Money Identification
 *
 * Endpoints:
 * - GET /v1/analytics/smart-money/wallets - List smart money wallets
 * - GET /v1/analytics/smart-money/monitoring - Monitoring dashboard (Enhancement 4)
 * - GET /v1/analytics/smart-money/monitoring/cache - Cache metrics
 * - GET /v1/analytics/smart-money/monitoring/job - Job metrics
 * - GET /v1/analytics/smart-money/monitoring/api - API metrics
 * - POST /v1/analytics/smart-money/monitoring/reset - Reset metrics
 */

import { Router } from 'hyper-express';
import { wrap as ew } from '../../../utils/errorWrapper';
import * as handlers from './handlers';
import * as monitoring from './monitoring';

const router = new Router();

/**
 * GET /v1/analytics/smart-money/wallets
 * 
 * List smart money wallets with filtering, sorting, and pagination
 * 
 * Query Parameters:
 * - chains: string[] - Filter by chain IDs (e.g., ethereum,polygon)
 * - minScore: number - Minimum smart money score (0-100)
 * - verified: boolean - Filter by verification status
 * - walletType: string - Filter by wallet type (whale, fund, trader, protocol)
 * - sortBy: string - Sort field (score, roi, pnl, trades)
 * - sortOrder: string - Sort order (asc, desc)
 * - page: number - Page number (default: 1)
 * - limit: number - Results per page (default: 20, max: 100)
 * 
 * Response:
 * {
 *   data: SmartMoneyWallet[],
 *   pagination: {
 *     page: number,
 *     limit: number,
 *     total: number,
 *     totalPages: number
 *   }
 * }
 */
router.get('/wallets', ew(handlers.getSmartMoneyWallets));

/**
 * Monitoring endpoints (Enhancement 4)
 */
router.get('/monitoring', ew(monitoring.getMonitoringDashboard));
router.get('/monitoring/cache', ew(monitoring.getCacheMetrics));
router.get('/monitoring/job', ew(monitoring.getJobMetrics));
router.get('/monitoring/api', ew(monitoring.getAPIMetrics));
router.post('/monitoring/reset', ew(monitoring.resetMetrics));

export default router;

