/**
 * Smart Money Monitoring API
 * Story: 3.1.1 - Smart Money Identification (Enhancement 4)
 * 
 * Real-time monitoring dashboard for smart money analytics
 */

import { Request, Response } from 'hyper-express';
import { MonitoringService } from '../../../analytics/services/monitoring-service';

/**
 * GET /v1/analytics/smart-money/monitoring
 * 
 * Get monitoring dashboard with real-time metrics
 */
export async function getMonitoringDashboard(req: Request, res: Response) {
  try {
    const monitoring = MonitoringService.getInstance();
    const dashboard = await monitoring.getDashboard();

    // Set cache headers (1 minute)
    const cacheMaxAge = 60; // 1 minute
    const expiresDate = new Date(Date.now() + cacheMaxAge * 1000);
    res.setHeader('Expires', expiresDate.toUTCString());
    res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}`);

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    console.error('Error getting monitoring dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * GET /v1/analytics/smart-money/monitoring/cache
 * 
 * Get cache metrics only
 */
export async function getCacheMetrics(req: Request, res: Response) {
  try {
    const monitoring = MonitoringService.getInstance();
    const metrics = await monitoring.getCacheMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    console.error('Error getting cache metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * GET /v1/analytics/smart-money/monitoring/job
 * 
 * Get job execution metrics only
 */
export async function getJobMetrics(req: Request, res: Response) {
  try {
    const monitoring = MonitoringService.getInstance();
    const metrics = await monitoring.getJobMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    console.error('Error getting job metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * GET /v1/analytics/smart-money/monitoring/api
 * 
 * Get API performance metrics only
 */
export async function getAPIMetrics(req: Request, res: Response) {
  try {
    const monitoring = MonitoringService.getInstance();
    const metrics = await monitoring.getAPIMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    console.error('Error getting API metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * POST /v1/analytics/smart-money/monitoring/reset
 * 
 * Reset all monitoring metrics
 */
export async function resetMetrics(req: Request, res: Response) {
  try {
    const monitoring = MonitoringService.getInstance();
    await monitoring.resetMetrics();

    res.status(200).json({
      success: true,
      message: 'Metrics reset successfully',
    });
  } catch (error: any) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

