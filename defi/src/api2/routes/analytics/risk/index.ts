/**
 * Risk Assessment API Routes
 * Story: 3.2.1 - Protocol Risk Assessment
 */

import { Router } from 'hyper-express';
import { ew } from '../../../utils/error-wrapper';
import * as handlers from './handlers';

const router = new Router();

// Protocol risk assessment endpoints
router.get('/protocols/:protocolId/assessment', ew(handlers.getProtocolRiskAssessment));
router.get('/protocols/:protocolId/contract', ew(handlers.getContractRisk));
router.get('/protocols/:protocolId/liquidity', ew(handlers.getLiquidityRisk));
router.get('/protocols/:protocolId/governance', ew(handlers.getGovernanceRisk));
router.get('/protocols/:protocolId/operational', ew(handlers.getOperationalRisk));
router.get('/protocols/:protocolId/market', ew(handlers.getMarketRisk));
router.get('/protocols/:protocolId/alerts', ew(handlers.getProtocolAlerts));
router.get('/protocols', ew(handlers.listProtocolsByRisk));

export default router;

