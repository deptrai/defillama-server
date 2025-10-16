/**
 * MEV Data Ingestion API Routes
 * Control and monitor real-time MEV data collection
 * 
 * Endpoints:
 * - GET  /v1/analytics/mev/ingestion/status - Get ingestion service status
 * - POST /v1/analytics/mev/ingestion/start  - Start ingestion service
 * - POST /v1/analytics/mev/ingestion/stop   - Stop ingestion service
 * - POST /v1/analytics/mev/ingestion/restart/:chain - Restart specific chain
 */

import * as HyperExpress from 'hyper-express';
import { successResponse, errorResponse } from '../../utils';
import { mevIngestionService } from '../../../../analytics/services/mev-ingestion-service';

/**
 * Register MEV ingestion routes
 */
export function registerMEVIngestionRoutes(router: HyperExpress.Router): void {
  // Get ingestion service status
  router.get('/ingestion/status', getIngestionStatus);

  // Start ingestion service
  router.post('/ingestion/start', startIngestion);

  // Stop ingestion service
  router.post('/ingestion/stop', stopIngestion);

  // Restart specific chain
  router.post('/ingestion/restart/:chain', restartChain);
}

/**
 * GET /v1/analytics/mev/ingestion/status
 * Get current status of MEV data ingestion service
 */
async function getIngestionStatus(req: any, res: any) {
  try {
    const status = mevIngestionService.getStatus();

    return successResponse(res, {
      service: 'MEV Data Ingestion',
      status: status.isRunning ? 'running' : 'stopped',
      active_chains: status.activeChains,
      listeners: status.listenerStatuses,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * POST /v1/analytics/mev/ingestion/start
 * Start MEV data ingestion service
 * 
 * Request body:
 * {
 *   "chains": ["ethereum", "arbitrum"] // Optional: specific chains to start
 * }
 */
async function startIngestion(req: any, res: any) {
  try {
    // Check if already running
    const currentStatus = mevIngestionService.getStatus();
    if (currentStatus.isRunning) {
      return successResponse(res, {
        message: 'MEV ingestion service is already running',
        status: currentStatus,
      });
    }

    // Start service
    await mevIngestionService.start();

    // Get updated status
    const status = mevIngestionService.getStatus();

    return successResponse(res, {
      message: 'MEV ingestion service started successfully',
      status: {
        is_running: status.isRunning,
        active_chains: status.activeChains,
        listeners: status.listenerStatuses,
      },
      started_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return errorResponse(res, `Failed to start ingestion service: ${error.message}`, 500);
  }
}

/**
 * POST /v1/analytics/mev/ingestion/stop
 * Stop MEV data ingestion service
 */
async function stopIngestion(req: any, res: any) {
  try {
    // Check if running
    const currentStatus = mevIngestionService.getStatus();
    if (!currentStatus.isRunning) {
      return successResponse(res, {
        message: 'MEV ingestion service is not running',
        status: currentStatus,
      });
    }

    // Stop service
    await mevIngestionService.stop();

    return successResponse(res, {
      message: 'MEV ingestion service stopped successfully',
      stopped_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return errorResponse(res, `Failed to stop ingestion service: ${error.message}`, 500);
  }
}

/**
 * POST /v1/analytics/mev/ingestion/restart/:chain
 * Restart ingestion for a specific chain
 * 
 * Path parameters:
 * - chain: Chain ID (ethereum, arbitrum, optimism, bsc, polygon)
 */
async function restartChain(req: any, res: any) {
  try {
    const { chain } = req.path_parameters;

    if (!chain) {
      return errorResponse(res, 'Chain parameter is required', 400);
    }

    // Validate chain
    const validChains = ['ethereum', 'arbitrum', 'optimism', 'bsc', 'polygon'];
    if (!validChains.includes(chain)) {
      return errorResponse(
        res,
        `Invalid chain: ${chain}. Valid chains: ${validChains.join(', ')}`,
        400
      );
    }

    // Check if service is running
    const currentStatus = mevIngestionService.getStatus();
    if (!currentStatus.isRunning) {
      return errorResponse(res, 'MEV ingestion service is not running', 400);
    }

    // Check if chain is active
    if (!currentStatus.activeChains.includes(chain)) {
      return errorResponse(res, `Chain ${chain} is not active`, 400);
    }

    // Restart chain
    await mevIngestionService.restartChain(chain);

    // Get updated status
    const status = mevIngestionService.getStatus();

    return successResponse(res, {
      message: `Chain ${chain} restarted successfully`,
      chain_status: status.listenerStatuses[chain],
      restarted_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return errorResponse(res, `Failed to restart chain: ${error.message}`, 500);
  }
}

