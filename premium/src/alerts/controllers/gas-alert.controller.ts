import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { gasAlertService } from '../services/gas-alert.service';
import { gasPriceMonitorService } from '../services/gas-price-monitor.service';
import { safeValidateCreateGasAlert, safeValidateUpdateGasAlert } from '../dto';
import { getUserId } from '../../auth/jwt';
import { successResponse, errorResponse } from '../../common/utils/response';
import { logger } from '../../common/utils/logger';

/**
 * Gas Alert Controller
 * 
 * REST API endpoints for gas fee alerts
 * 
 * Story 1.3: Gas Fee Alerts
 * Feature ID: F-003
 * EPIC-1: Smart Alerts & Notifications
 */

/**
 * Create Gas Alert Handler
 * POST /v2/premium/alerts/gas
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function createGasAlert(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let validation: any = null;

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Validate request body
    validation = safeValidateCreateGasAlert(body);
    if (!validation.success) {
      return errorResponse(
        `Validation failed: ${validation.error.errors.map((e: any) => e.message).join(', ')}`,
        400
      );
    }

    // Create gas alert
    const alert = await gasAlertService.create(userId, validation.data);

    return successResponse(alert, 201);
  } catch (error: any) {
    logger.error('Error creating gas alert', error, { userId: userId ?? undefined, alertData: validation?.data });

    if (error.message.includes('Alert limit exceeded')) {
      return errorResponse(error.message, 403);
    }

    if (error.message.includes('Validation failed')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse('Internal server error', 500);
  }
}

/**
 * Get Gas Alerts Handler
 * GET /v2/premium/alerts/gas
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function getGasAlerts(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let page: number = 1;
  let per_page: number = 20;

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse query parameters
    if (event.queryStringParameters) {
      page = parseInt(event.queryStringParameters.page || '1');
      per_page = parseInt(event.queryStringParameters.per_page || '20');
    }

    // Validate pagination
    if (page < 1) {
      return errorResponse('Page must be >= 1', 400);
    }

    if (per_page < 1 || per_page > 100) {
      return errorResponse('Per page must be between 1 and 100', 400);
    }

    // Get gas alerts
    const result = await gasAlertService.findAll(userId, page, per_page);

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error getting gas alerts', error, { userId: userId ?? undefined, page, per_page });
    return errorResponse('Internal server error', 500);
  }
}

/**
 * Get Gas Alert By ID Handler
 * GET /v2/premium/alerts/gas/{id}
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function getGasAlertById(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let id: string | undefined;

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert ID from path parameters
    id = event.pathParameters?.id;
    if (!id) {
      return errorResponse('Alert ID is required', 400);
    }

    // Get gas alert
    const alert = await gasAlertService.findById(userId, id);

    if (!alert) {
      return errorResponse('Alert not found', 404);
    }

    return successResponse(alert);
  } catch (error: any) {
    logger.error('Error getting gas alert', error, { userId: userId ?? undefined, id });
    return errorResponse('Internal server error', 500);
  }
}

/**
 * Update Gas Alert Handler
 * PUT /v2/premium/alerts/gas/{id}
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function updateGasAlert(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let id: string | undefined;
  let validation: any = null;

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert ID from path parameters
    id = event.pathParameters?.id;
    if (!id) {
      return errorResponse('Alert ID is required', 400);
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Validate request body
    validation = safeValidateUpdateGasAlert(body);
    if (!validation.success) {
      return errorResponse(
        `Validation failed: ${validation.error.errors.map((e: any) => e.message).join(', ')}`,
        400
      );
    }

    // Update gas alert
    const alert = await gasAlertService.update(userId, id, validation.data);

    if (!alert) {
      return errorResponse('Alert not found', 404);
    }

    return successResponse(alert);
  } catch (error: any) {
    logger.error('Error updating gas alert', error, { userId: userId ?? undefined, id, alertData: validation?.data });

    if (error.message.includes('Validation failed')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse('Internal server error', 500);
  }
}

/**
 * Delete Gas Alert Handler
 * DELETE /v2/premium/alerts/gas/{id}
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function deleteGasAlert(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let id: string | undefined;

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert ID from path parameters
    id = event.pathParameters?.id;
    if (!id) {
      return errorResponse('Alert ID is required', 400);
    }

    // Delete gas alert
    const deleted = await gasAlertService.delete(userId, id);

    if (!deleted) {
      return errorResponse('Alert not found', 404);
    }

    return successResponse({ message: 'Alert deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting gas alert', error, { userId: userId ?? undefined, id });
    return errorResponse('Internal server error', 500);
  }
}

/**
 * Toggle Gas Alert Handler
 * PATCH /v2/premium/alerts/gas/{id}/toggle
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function toggleGasAlert(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let id: string | undefined;
  let enabled: boolean;

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert ID from path parameters
    id = event.pathParameters?.id;
    if (!id) {
      return errorResponse('Alert ID is required', 400);
    }

    // Parse request body
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }

    const body = JSON.parse(event.body);
    enabled = body.enabled;

    if (typeof enabled !== 'boolean') {
      return errorResponse('enabled field must be a boolean', 400);
    }

    // Toggle gas alert
    const alert = await gasAlertService.toggle(userId, id, enabled);

    if (!alert) {
      return errorResponse('Alert not found', 404);
    }

    return successResponse(alert);
  } catch (error: any) {
    logger.error('Error toggling gas alert', error, { userId: userId ?? undefined, id, enabled: enabled! });
    return errorResponse('Internal server error', 500);
  }
}

/**
 * Get Current Gas Prices Handler
 * GET /v2/gas-fees/current
 *
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function getCurrentGasPrices(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Get chain from query parameters
    const chain = event.queryStringParameters?.chain;
    if (!chain) {
      return errorResponse('Chain parameter is required', 400);
    }

    // Get current gas prices
    const gasPrices = await gasPriceMonitorService.getCurrentGasPrices(chain);

    return successResponse(gasPrices);
  } catch (error: any) {
    logger.error('Error getting current gas prices', error, { chain: event.queryStringParameters?.chain });

    if (error.message.includes('Unsupported chain')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse('Internal server error', 500);
  }
}

/**
 * Get Gas Price History Handler
 * GET /v2/gas-fees/history
 *
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function getGasPriceHistory(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Get chain from query parameters
    const chain = event.queryStringParameters?.chain;
    if (!chain) {
      return errorResponse('Chain parameter is required', 400);
    }

    // Get hours parameter (default: 24)
    const hours = parseInt(event.queryStringParameters?.hours || '24');
    if (hours < 1 || hours > 168) { // Max 7 days
      return errorResponse('Hours must be between 1 and 168 (7 days)', 400);
    }

    // Get gas price history
    const history = await gasPriceMonitorService.getHistory(chain, hours);

    return successResponse({
      chain,
      hours,
      data: history,
    });
  } catch (error: any) {
    logger.error('Error getting gas price history', error, {
      chain: event.queryStringParameters?.chain,
      hours: event.queryStringParameters?.hours,
    });

    if (error.message.includes('Unsupported chain')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse('Internal server error', 500);
  }
}

