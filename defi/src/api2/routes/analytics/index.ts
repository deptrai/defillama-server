/**
 * Analytics API Routes
 * Stories: 2.1.1 - Protocol Performance Dashboard, 2.1.2 - Yield Opportunity Scanner, 2.1.3 - Liquidity Analysis Tools
 *
 * Registers all analytics endpoints
 */

import * as HyperExpress from 'hyper-express';
import { errorWrapper as ew } from '../utils';
import {
  getProtocolPerformance,
  getProtocolAPY,
  getProtocolUsers,
  getProtocolRevenue,
  getProtocolsBenchmark,
} from './handlers';
import yieldOpportunitiesRouter from './yield-opportunities';
import yieldAlertsRouter from './yield-alerts';
import liquidityPoolsRouter from './liquidity';
import liquidityMigrationsRouter from './liquidity-migrations';

/**
 * Register analytics routes
 */
export function setAnalyticsRoutes(router: HyperExpress.Router) {
  // Story 2.1.1: Protocol Performance Dashboard
  // Protocol-specific endpoints
  router.get('/analytics/protocol/:protocolId/performance', ew(getProtocolPerformance));
  router.get('/analytics/protocol/:protocolId/apy', ew(getProtocolAPY));
  router.get('/analytics/protocol/:protocolId/users', ew(getProtocolUsers));
  router.get('/analytics/protocol/:protocolId/revenue', ew(getProtocolRevenue));

  // Multi-protocol endpoints
  router.get('/analytics/protocols/benchmark', ew(getProtocolsBenchmark));

  // Story 2.1.2: Yield Opportunity Scanner
  router.use('/analytics/yield-opportunities', yieldOpportunitiesRouter);
  router.use('/analytics/yield-alerts', yieldAlertsRouter);

  // Story 2.1.3: Liquidity Analysis Tools
  router.use('/analytics/liquidity-pools', liquidityPoolsRouter);
  router.use('/analytics/liquidity-migrations', liquidityMigrationsRouter);
}

