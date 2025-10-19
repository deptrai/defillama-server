/**
 * Alert History Controller
 * Story: 1.1.5 - View Whale Alert History
 * 
 * Handles HTTP requests for alert history retrieval and export
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { alertHistoryService, GetAlertHistoryOptions } from '../services/alert-history.service';
import { getUserId } from '../../common/utils/auth';
import { logger } from '../../common/utils/logger';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Success response helper
 */
function successResponse(data: any, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(data),
  };
}

/**
 * CSV response helper
 */
function csvResponse(csv: string, filename: string): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: csv,
  };
}

/**
 * Error response helper
 */
function errorResponse(message: string, statusCode: number = 500, details?: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      error: message,
      details,
    }),
  };
}

// ============================================================================
// Controller Functions
// ============================================================================

/**
 * Get Alert History
 * GET /v2/premium/alerts/history
 */
export async function getAlertHistory(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let options: GetAlertHistoryOptions = {};

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse query parameters
    const params = event.queryStringParameters || {};
    
    // Pagination
    const page = params.page ? parseInt(params.page) : undefined;
    const per_page = params.per_page ? parseInt(params.per_page) : undefined;
    
    // Validate pagination
    if (page !== undefined && (isNaN(page) || page < 1)) {
      return errorResponse('Invalid page parameter', 400);
    }
    if (per_page !== undefined && (isNaN(per_page) || per_page < 1 || per_page > 100)) {
      return errorResponse('Invalid per_page parameter (must be 1-100)', 400);
    }

    // Filtering
    const alert_type = params.alert_type as 'whale' | 'price' | undefined;
    if (alert_type && !['whale', 'price'].includes(alert_type)) {
      return errorResponse('Invalid alert_type parameter (must be whale or price)', 400);
    }

    const chain = params.chain;
    const token = params.token;
    const start_date = params.start_date;
    const end_date = params.end_date;

    // Validate dates
    if (start_date && isNaN(Date.parse(start_date))) {
      return errorResponse('Invalid start_date parameter (must be ISO 8601 date)', 400);
    }
    if (end_date && isNaN(Date.parse(end_date))) {
      return errorResponse('Invalid end_date parameter (must be ISO 8601 date)', 400);
    }

    // Sorting
    const sort_by = params.sort_by as 'date' | 'amount' | undefined;
    if (sort_by && !['date', 'amount'].includes(sort_by)) {
      return errorResponse('Invalid sort_by parameter (must be date or amount)', 400);
    }

    const sort_order = params.sort_order as 'asc' | 'desc' | undefined;
    if (sort_order && !['asc', 'desc'].includes(sort_order)) {
      return errorResponse('Invalid sort_order parameter (must be asc or desc)', 400);
    }

    // Export format
    const format = params.format as 'json' | 'csv' | undefined;
    if (format && !['json', 'csv'].includes(format)) {
      return errorResponse('Invalid format parameter (must be json or csv)', 400);
    }

    // Build options
    options = {
      page,
      per_page,
      alert_type,
      chain,
      token,
      start_date,
      end_date,
      sort_by,
      sort_order,
    };

    // Handle export
    if (format === 'csv') {
      const csv = await alertHistoryService.exportAlertHistory(userId, 'csv', options);
      const filename = `alert-history-${Date.now()}.csv`;
      return csvResponse(csv, filename);
    }

    // Get alert history
    const result = await alertHistoryService.getAlertHistory(userId, options);

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error getting alert history', error, { userId: userId ?? undefined, options });
    return errorResponse('Internal server error', 500, error.message);
  }
}

/**
 * Get Alert History by ID
 * GET /v2/premium/alerts/history/{id}
 */
export async function getAlertHistoryById(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let historyId: string | undefined;

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get history ID from path parameters
    historyId = event.pathParameters?.id;
    if (!historyId) {
      return errorResponse('History ID is required', 400);
    }

    // Get alert history entry
    const entry = await alertHistoryService.getAlertHistoryById(userId, historyId);

    if (!entry) {
      return errorResponse('Alert history not found', 404);
    }

    return successResponse(entry);
  } catch (error: any) {
    logger.error('Error getting alert history by ID', error, { userId: userId ?? undefined, historyId });
    return errorResponse('Internal server error', 500, error.message);
  }
}

