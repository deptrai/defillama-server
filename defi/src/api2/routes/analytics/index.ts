/**
 * Analytics API Routes
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Phase: 2 - API Implementation
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

/**
 * Register analytics routes
 */
export function setAnalyticsRoutes(router: HyperExpress.Router) {
  // Protocol-specific endpoints
  router.get('/analytics/protocol/:protocolId/performance', ew(getProtocolPerformance));
  router.get('/analytics/protocol/:protocolId/apy', ew(getProtocolAPY));
  router.get('/analytics/protocol/:protocolId/users', ew(getProtocolUsers));
  router.get('/analytics/protocol/:protocolId/revenue', ew(getProtocolRevenue));

  // Multi-protocol endpoints
  router.get('/analytics/protocols/benchmark', ew(getProtocolsBenchmark));
}

