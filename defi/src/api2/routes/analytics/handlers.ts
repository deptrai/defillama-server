/**
 * Analytics API Handlers
 * Story: 2.1.1 - Protocol Performance Dashboard
 * Phase: 2 - API Implementation
 */

import * as HyperExpress from 'hyper-express';
import * as sdk from '@defillama/sdk';
import { successResponse, errorResponse } from '../utils';
import {
  apyCalculator,
  userMetricsEngine,
  revenueAnalyzer,
  benchmarkEngine,
} from '../../../analytics/engines';
import {
  validateProtocolId,
  validateTimeRange,
  validateDate,
  validatePeriods,
  validateProtocolIds,
  validateCategory,
  validateMetric,
  validateBoolean,
} from './validation';
import {
  getPerformanceCacheConfig,
  getAPYCacheConfig,
  getUsersCacheConfig,
  getRevenueCacheConfig,
  getBenchmarkCacheConfig,
  getTimeRangeDates,
  parseDate,
  parsePeriods,
  parseBoolean,
} from './cache';
import { ErrorCode } from './types';

/**
 * GET /analytics/protocol/:protocolId/performance
 * 
 * Returns comprehensive performance metrics for a protocol
 */
export async function getProtocolPerformance(
  req: HyperExpress.Request,
  res: HyperExpress.Response
) {
  const startTime = Date.now();

  try {
    // Extract parameters
    const protocolId = req.path_parameters.protocolId;
    const timeRange = (req.query_parameters.timeRange as string) || '30d';
    const includeHistory = parseBoolean(req.query_parameters.includeHistory as string);

    // Validate parameters
    const protocolIdValidation = validateProtocolId(protocolId);
    if (!protocolIdValidation.valid) {
      return errorResponse(res, protocolIdValidation.error!.error, {
        statusCode: 400,
      });
    }

    const timeRangeValidation = validateTimeRange(timeRange);
    if (!timeRangeValidation.valid) {
      return errorResponse(res, timeRangeValidation.error!.error, {
        statusCode: 400,
      });
    }

    // Get cache config
    const cacheConfig = getPerformanceCacheConfig(protocolId, timeRange, includeHistory);

    // Calculate metrics from all engines
    const { startDate, endDate } = getTimeRangeDates(timeRange);

    const [apyResult, userMetricsResult, revenueResult] = await Promise.all([
      apyCalculator.calculateComprehensiveAPY(protocolId),
      userMetricsEngine.calculateUserMetrics(protocolId, endDate),
      revenueAnalyzer.calculateRevenueAnalysis(protocolId),
    ]);

    // Check for errors
    if (!apyResult.success) {
      sdk.log('APY calculation error:', apyResult.error);
    }
    if (!userMetricsResult.success) {
      sdk.log('User metrics calculation error:', userMetricsResult.error);
    }
    if (!revenueResult.success) {
      sdk.log('Revenue calculation error:', revenueResult.error);
    }

    // Aggregate response
    const response = {
      protocolId,
      timestamp: new Date().toISOString(),
      timeRange,
      apy: apyResult.success ? apyResult.data : null,
      userMetrics: userMetricsResult.success ? userMetricsResult.data : null,
      revenue: revenueResult.success ? revenueResult.data : null,
      executionTimeMs: Date.now() - startTime,
    };

    // Return with cache headers
    return successResponse(res, response, cacheConfig.ttl / 60); // Convert to minutes
  } catch (error) {
    sdk.log('Error in getProtocolPerformance:', error);
    return errorResponse(res, 'Internal server error', { statusCode: 500 });
  }
}

/**
 * GET /analytics/protocol/:protocolId/apy
 * 
 * Returns APY/APR analysis for a protocol
 */
export async function getProtocolAPY(
  req: HyperExpress.Request,
  res: HyperExpress.Response
) {
  const startTime = Date.now();

  try {
    // Extract parameters
    const protocolId = req.path_parameters.protocolId;
    const timeRange = (req.query_parameters.timeRange as string) || '30d';

    // Validate parameters
    const protocolIdValidation = validateProtocolId(protocolId);
    if (!protocolIdValidation.valid) {
      return errorResponse(res, protocolIdValidation.error!.error, {
        statusCode: 400,
      });
    }

    const timeRangeValidation = validateTimeRange(timeRange);
    if (!timeRangeValidation.valid) {
      return errorResponse(res, timeRangeValidation.error!.error, {
        statusCode: 400,
      });
    }

    // Get cache config
    const cacheConfig = getAPYCacheConfig(protocolId, timeRange);

    // Calculate APY metrics
    const apyResult = await apyCalculator.calculateComprehensiveAPY(protocolId);

    if (!apyResult.success) {
      sdk.log('APY calculation error:', apyResult.error);
      
      // Check if it's a "not found" error
      if (apyResult.error?.code === 'NO_DATA') {
        return errorResponse(res, `No APY data found for protocol: ${protocolId}`, {
          statusCode: 404,
        });
      }

      return errorResponse(res, 'Failed to calculate APY metrics', {
        statusCode: 500,
      });
    }

    // Format response
    const response = {
      protocolId,
      timestamp: new Date().toISOString(),
      timeRange,
      data: apyResult.data,
      executionTimeMs: Date.now() - startTime,
    };

    // Return with cache headers
    return successResponse(res, response, cacheConfig.ttl / 60); // Convert to minutes
  } catch (error) {
    sdk.log('Error in getProtocolAPY:', error);
    return errorResponse(res, 'Internal server error', { statusCode: 500 });
  }
}

/**
 * GET /analytics/protocol/:protocolId/users
 * 
 * Returns user metrics and retention analysis
 */
export async function getProtocolUsers(
  req: HyperExpress.Request,
  res: HyperExpress.Response
) {
  const startTime = Date.now();

  try {
    // Extract parameters
    const protocolId = req.path_parameters.protocolId;
    const dateStr = req.query_parameters.date as string;
    const periodsStr = req.query_parameters.periods as string;

    // Validate parameters
    const protocolIdValidation = validateProtocolId(protocolId);
    if (!protocolIdValidation.valid) {
      return errorResponse(res, protocolIdValidation.error!.error, {
        statusCode: 400,
      });
    }

    const dateValidation = validateDate(dateStr);
    if (!dateValidation.valid) {
      return errorResponse(res, dateValidation.error!.error, {
        statusCode: 400,
      });
    }

    const periodsValidation = validatePeriods(periodsStr);
    if (!periodsValidation.valid) {
      return errorResponse(res, periodsValidation.error!.error, {
        statusCode: 400,
      });
    }

    // Parse parameters
    const date = parseDate(dateStr);
    const periods = parsePeriods(periodsStr);

    // Get cache config
    const cacheConfig = getUsersCacheConfig(protocolId, date.toISOString(), periods);

    // Calculate user metrics
    const [userMetricsResult, retentionResult] = await Promise.all([
      userMetricsEngine.calculateUserMetrics(protocolId, date),
      userMetricsEngine.calculateRetentionAnalysis(protocolId, periods),
    ]);

    if (!userMetricsResult.success) {
      sdk.log('User metrics calculation error:', userMetricsResult.error);
      
      if (userMetricsResult.error?.code === 'NO_DATA') {
        return errorResponse(res, `No user data found for protocol: ${protocolId}`, {
          statusCode: 404,
        });
      }

      return errorResponse(res, 'Failed to calculate user metrics', {
        statusCode: 500,
      });
    }

    // Format response
    const response = {
      protocolId,
      timestamp: new Date().toISOString(),
      date: date.toISOString(),
      metrics: userMetricsResult.data,
      retention: retentionResult.success ? retentionResult.data : null,
      executionTimeMs: Date.now() - startTime,
    };

    // Return with cache headers
    return successResponse(res, response, cacheConfig.ttl / 60); // Convert to minutes
  } catch (error) {
    sdk.log('Error in getProtocolUsers:', error);
    return errorResponse(res, 'Internal server error', { statusCode: 500 });
  }
}

/**
 * GET /analytics/protocol/:protocolId/revenue
 *
 * Returns revenue analysis and projections
 */
export async function getProtocolRevenue(
  req: HyperExpress.Request,
  res: HyperExpress.Response
) {
  const startTime = Date.now();

  try {
    // Extract parameters
    const protocolId = req.path_parameters.protocolId;
    const timeRange = (req.query_parameters.timeRange as string) || '30d';

    // Validate parameters
    const protocolIdValidation = validateProtocolId(protocolId);
    if (!protocolIdValidation.valid) {
      return errorResponse(res, protocolIdValidation.error!.error, {
        statusCode: 400,
      });
    }

    const timeRangeValidation = validateTimeRange(timeRange);
    if (!timeRangeValidation.valid) {
      return errorResponse(res, timeRangeValidation.error!.error, {
        statusCode: 400,
      });
    }

    // Get cache config
    const cacheConfig = getRevenueCacheConfig(protocolId, timeRange);

    // Calculate revenue metrics
    const revenueResult = await revenueAnalyzer.calculateRevenueAnalysis(protocolId);

    if (!revenueResult.success) {
      sdk.log('Revenue calculation error:', revenueResult.error);

      if (revenueResult.error?.code === 'NO_DATA') {
        return errorResponse(res, `No revenue data found for protocol: ${protocolId}`, {
          statusCode: 404,
        });
      }

      return errorResponse(res, 'Failed to calculate revenue metrics', {
        statusCode: 500,
      });
    }

    // Format response
    const response = {
      protocolId,
      timestamp: new Date().toISOString(),
      timeRange,
      data: revenueResult.data,
      executionTimeMs: Date.now() - startTime,
    };

    // Return with cache headers
    return successResponse(res, response, cacheConfig.ttl / 60); // Convert to minutes
  } catch (error) {
    sdk.log('Error in getProtocolRevenue:', error);
    return errorResponse(res, 'Internal server error', { statusCode: 500 });
  }
}

/**
 * GET /analytics/protocols/benchmark
 *
 * Returns competitive benchmarking analysis
 */
export async function getProtocolsBenchmark(
  req: HyperExpress.Request,
  res: HyperExpress.Response
) {
  const startTime = Date.now();

  try {
    // Extract parameters
    const protocolIdsStr = req.query_parameters.protocolIds as string;
    const category = req.query_parameters.category as string;
    const metric = req.query_parameters.metric as string;

    // Validate parameters
    const protocolIdsValidation = validateProtocolIds(protocolIdsStr);
    if (!protocolIdsValidation.valid) {
      return errorResponse(res, protocolIdsValidation.error!.error, {
        statusCode: 400,
      });
    }

    const categoryValidation = validateCategory(category);
    if (!categoryValidation.valid) {
      return errorResponse(res, categoryValidation.error!.error, {
        statusCode: 400,
      });
    }

    const metricValidation = validateMetric(metric);
    if (!metricValidation.valid) {
      return errorResponse(res, metricValidation.error!.error, {
        statusCode: 400,
      });
    }

    // Parse protocol IDs
    const protocolIds = protocolIdsStr.split(',').map(id => id.trim()).filter(id => id);

    // Get cache config
    const cacheConfig = getBenchmarkCacheConfig(protocolIds, category, metric);

    // Calculate benchmark metrics
    const [benchmarkResult, marketShareResult] = await Promise.all([
      benchmarkEngine.benchmarkProtocols(protocolIds, category),
      benchmarkEngine.calculateMarketShare(protocolIds),
    ]);

    if (!benchmarkResult.success) {
      sdk.log('Benchmark calculation error:', benchmarkResult.error);
      return errorResponse(res, 'Failed to calculate benchmark metrics', {
        statusCode: 500,
      });
    }

    // Format response
    const response = {
      timestamp: new Date().toISOString(),
      protocolIds,
      category: category || 'all',
      metric: metric || 'all',
      benchmarks: benchmarkResult.data,
      marketShare: marketShareResult.success ? marketShareResult.data : null,
      executionTimeMs: Date.now() - startTime,
    };

    // Return with cache headers
    return successResponse(res, response, cacheConfig.ttl / 60); // Convert to minutes
  } catch (error) {
    sdk.log('Error in getProtocolsBenchmark:', error);
    return errorResponse(res, 'Internal server error', { statusCode: 500 });
  }
}

