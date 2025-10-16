/**
 * Compliance Screening API Routes
 * Story: 3.2.3 - Compliance Monitoring
 * Phase 8: API Development
 */

import { Router } from 'hyper-express';
import {
  screenCompliance,
  getScreening,
  listScreenings,
  batchScreenCompliance,
} from './handlers';

const router = new Router();

/**
 * POST /v1/risk/compliance/screen
 * Screen wallet address for compliance
 * 
 * Request body:
 * {
 *   "wallet_address": "0x1234...",
 *   "chain_id": "ethereum" (optional, default: "ethereum")
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": 1,
 *     "walletAddress": "0x1234...",
 *     "screeningResult": "clear" | "flagged" | "review_required",
 *     "riskLevel": "low" | "medium" | "high" | "critical",
 *     "riskScore": 25.5,
 *     "sanctions": { ... },
 *     "aml": { ... },
 *     "kyc": { ... },
 *     "pep": { ... },
 *     "adverseMedia": { ... },
 *     "timestamp": "2025-10-15T..."
 *   }
 * }
 */
router.post('/screen', screenCompliance);

/**
 * POST /v1/risk/compliance/screen/batch
 * Batch screen multiple wallet addresses
 * 
 * Request body:
 * {
 *   "wallet_addresses": ["0x1234...", "0x5678..."],
 *   "chain_id": "ethereum" (optional, default: "ethereum")
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     { ... screening result 1 ... },
 *     { ... screening result 2 ... }
 *   ]
 * }
 */
router.post('/screen/batch', batchScreenCompliance);

/**
 * GET /v1/risk/compliance/screenings/:id
 * Get screening result by ID
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": 1,
 *     "screening_type": "comprehensive",
 *     "wallet_address": "0x1234...",
 *     "chain_id": "ethereum",
 *     "screening_result": "clear",
 *     "risk_level": "low",
 *     "risk_score": 25.5,
 *     ...
 *   }
 * }
 */
router.get('/screenings/:id', getScreening);

/**
 * GET /v1/risk/compliance/screenings
 * List screenings with filters
 * 
 * Query parameters:
 * - wallet_address: Filter by wallet address
 * - chain_id: Filter by chain ID
 * - screening_result: Filter by result (clear, flagged, review_required)
 * - risk_level: Filter by risk level (low, medium, high, critical)
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Offset for pagination (default: 0)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [ ... screening results ... ],
 *   "pagination": {
 *     "total": 100,
 *     "limit": 20,
 *     "offset": 0
 *   }
 * }
 */
router.get('/screenings', listScreenings);

export default router;

