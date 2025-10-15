/**
 * Smart Money API Routes
 * Story: 3.1.1 - Smart Money Identification
 * 
 * Endpoints:
 * - GET /v1/analytics/smart-money/wallets - List smart money wallets
 */

import { Router } from 'hyper-express';
import { wrap as ew } from '../../../utils/errorWrapper';
import * as handlers from './handlers';

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

export default router;

