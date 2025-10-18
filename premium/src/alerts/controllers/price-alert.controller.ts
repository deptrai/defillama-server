/**
 * Price Alert Controller
 * Story 1.1.2: Configure Price Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 * 
 * Lambda handlers for price alert endpoints
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { priceAlertService } from '../services/price-alert.service';
import {
  validateCreatePriceAlert,
  validateUpdatePriceAlert,
  safeValidateCreatePriceAlert,
  safeValidateUpdatePriceAlert,
} from '../dto';
import { successResponse, errorResponse, getUserId, logger } from '../../common/utils';

/**
 * Create Price Alert Handler
 * POST /v2/premium/alerts/price
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function createPriceAlert(
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
    validation = safeValidateCreatePriceAlert(body);
    if (!validation.success) {
      return errorResponse(
        `Validation failed: ${validation.error.errors.map((e: any) => e.message).join(', ')}`,
        400
      );
    }

    // Create price alert
    const alert = await priceAlertService.create(userId, validation.data);

    return successResponse(alert, 201);
  } catch (error: any) {
    logger.error('Error creating price alert', error, { userId: userId ?? undefined, alertData: validation?.data });

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
 * Get Price Alerts Handler
 * GET /v2/premium/alerts/price
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function getPriceAlerts(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let options: any = {};

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse query parameters
    const params = event.queryStringParameters || {};
    options = {
      page: params.page ? parseInt(params.page) : undefined,
      per_page: params.per_page ? parseInt(params.per_page) : undefined,
      status: params.status as any,
      chain: params.chain,
      alert_type: params.alert_type as any,
    };

    // Get price alerts
    const result = await priceAlertService.get(userId, options);

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error getting price alerts', error, { userId: userId ?? undefined, options });
    return errorResponse('Internal server error', 500);
  }
}

/**
 * Get Price Alert By ID Handler
 * GET /v2/premium/alerts/price/:id
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function getPriceAlertById(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let alertId: string | undefined = undefined;

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert ID from path parameters
    alertId = event.pathParameters?.id;
    if (!alertId) {
      return errorResponse('Alert ID is required', 400);
    }

    // Get price alert
    const alert = await priceAlertService.getById(userId, alertId);

    if (!alert) {
      return errorResponse('Price alert not found', 404);
    }

    return successResponse(alert);
  } catch (error: any) {
    logger.error('Error getting price alert', error, { userId: userId ?? undefined, alertId });
    return errorResponse('Internal server error', 500);
  }
}

/**
 * Update Price Alert Handler
 * PUT /v2/premium/alerts/price/:id
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function updatePriceAlert(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let alertId: string | undefined = undefined;
  let validation: any = null;

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert ID from path parameters
    alertId = event.pathParameters?.id;
    if (!alertId) {
      return errorResponse('Alert ID is required', 400);
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Validate request body
    validation = safeValidateUpdatePriceAlert(body);
    if (!validation.success) {
      return errorResponse(
        `Validation failed: ${validation.error.errors.map((e: any) => e.message).join(', ')}`,
        400
      );
    }

    // Update price alert
    const alert = await priceAlertService.update(userId, alertId, validation.data);

    return successResponse(alert);
  } catch (error: any) {
    logger.error('Error updating price alert', error, { userId: userId ?? undefined, alertId, updateData: validation?.data });

    if (error.message.includes('not found')) {
      return errorResponse(error.message, 404);
    }

    if (error.message.includes('Validation failed')) {
      return errorResponse(error.message, 400);
    }

    return errorResponse('Internal server error', 500);
  }
}

/**
 * Delete Price Alert Handler
 * DELETE /v2/premium/alerts/price/:id
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function deletePriceAlert(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let alertId: string | undefined = undefined;

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert ID from path parameters
    alertId = event.pathParameters?.id;
    if (!alertId) {
      return errorResponse('Alert ID is required', 400);
    }

    // Delete price alert
    const deleted = await priceAlertService.delete(userId, alertId);

    if (!deleted) {
      return errorResponse('Price alert not found', 404);
    }

    return successResponse({ message: 'Price alert deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting price alert', error, { userId: userId ?? undefined, alertId });
    return errorResponse('Internal server error', 500);
  }
}

/**
 * Toggle Price Alert Handler
 * PATCH /v2/premium/alerts/price/:id/toggle
 * 
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export async function togglePriceAlert(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let alertId: string | undefined = undefined;
  let enabled: boolean | undefined = undefined;

  try {
    // Get user ID from JWT
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert ID from path parameters
    alertId = event.pathParameters?.id;
    if (!alertId) {
      return errorResponse('Alert ID is required', 400);
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    enabled = body.enabled;

    if (typeof enabled !== 'boolean') {
      return errorResponse('enabled field is required and must be a boolean', 400);
    }

    // Toggle price alert
    const alert = await priceAlertService.toggle(userId, alertId, enabled);

    return successResponse(alert);
  } catch (error: any) {
    logger.error('Error toggling price alert', error, { userId: userId ?? undefined, alertId, enabled });

    if (error.message.includes('not found')) {
      return errorResponse(error.message, 404);
    }

    return errorResponse('Internal server error', 500);
  }
}

