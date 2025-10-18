/**
 * Whale Alert Controller
 * Story 1.1.1: Configure Whale Alert Thresholds
 * EPIC-1: Smart Alerts & Notifications
 * 
 * API Endpoints:
 * - POST   /v2/premium/alerts/whale
 * - GET    /v2/premium/alerts/whale
 * - GET    /v2/premium/alerts/whale/:id
 * - PUT    /v2/premium/alerts/whale/:id
 * - DELETE /v2/premium/alerts/whale/:id
 * - PATCH  /v2/premium/alerts/whale/:id/toggle
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { whaleAlertService } from '../services/whale-alert.service';
import {
  validateWhaleAlertRule,
  safeValidateWhaleAlertRule,
  validateWhaleAlertRuleUpdate,
  safeValidateWhaleAlertRuleUpdate
} from '../dto';
import { successResponse, errorResponse, getUserId, logger } from '../../common/utils';

// ============================================================================
// Controller Functions
// ============================================================================

/**
 * Create Whale Alert Rule
 * POST /v2/premium/alerts/whale
 */
export async function createWhaleAlert(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let validation: any = null;

  try {
    // Check authentication
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse and validate request body
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }

    const body = JSON.parse(event.body);
    validation = safeValidateWhaleAlertRule(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, JSON.stringify(validation.errors));
    }

    // Create whale alert rule
    const rule = await whaleAlertService.createWhaleAlertRule(userId, validation.data);

    return successResponse(rule, 201);
  } catch (error: any) {
    logger.error('Error creating whale alert', error, { userId: userId ?? undefined, alertData: validation?.data });
    return errorResponse('Internal server error', 500, error.message);
  }
}

/**
 * Get Whale Alert Rules
 * GET /v2/premium/alerts/whale
 */
export async function getWhaleAlerts(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let page: number = 1;
  let per_page: number = 20;

  try {
    // Check authentication
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse pagination parameters
    page = parseInt(event.queryStringParameters?.page || '1');
    per_page = parseInt(event.queryStringParameters?.per_page || '20');

    // Get whale alert rules
    const result = await whaleAlertService.getWhaleAlertRules(userId, { page, per_page });

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error getting whale alerts', error, { userId: userId ?? undefined, page, per_page });
    return errorResponse('Internal server error', 500, error.message);
  }
}

/**
 * Get Whale Alert Rule by ID
 * GET /v2/premium/alerts/whale/:id
 */
export async function getWhaleAlertById(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let id: string | undefined = undefined;

  try {
    // Check authentication
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert rule ID from path parameters
    id = event.pathParameters?.id;
    if (!id) {
      return errorResponse('Alert rule ID is required', 400);
    }

    // Get whale alert rule
    const rule = await whaleAlertService.getWhaleAlertRuleById(userId, id);

    if (!rule) {
      return errorResponse('Alert rule not found', 404);
    }

    return successResponse(rule);
  } catch (error: any) {
    logger.error('Error getting whale alert', error, { userId: userId ?? undefined, alertId: id });
    return errorResponse('Internal server error', 500, error.message);
  }
}

/**
 * Update Whale Alert Rule
 * PUT /v2/premium/alerts/whale/:id
 */
export async function updateWhaleAlert(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let id: string | undefined = undefined;
  let validation: any = null;

  try {
    // Check authentication
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert rule ID from path parameters
    id = event.pathParameters?.id;
    if (!id) {
      return errorResponse('Alert rule ID is required', 400);
    }

    // Parse and validate request body
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }

    const body = JSON.parse(event.body);
    validation = safeValidateWhaleAlertRuleUpdate(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, JSON.stringify(validation.errors));
    }

    // Update whale alert rule
    const rule = await whaleAlertService.updateWhaleAlertRule(userId, id, validation.data);

    if (!rule) {
      return errorResponse('Alert rule not found', 404);
    }

    return successResponse(rule);
  } catch (error: any) {
    logger.error('Error updating whale alert', error, { userId: userId ?? undefined, alertId: id, updateData: validation?.data });
    return errorResponse('Internal server error', 500, error.message);
  }
}

/**
 * Delete Whale Alert Rule
 * DELETE /v2/premium/alerts/whale/:id
 */
export async function deleteWhaleAlert(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let id: string | undefined = undefined;

  try {
    // Check authentication
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert rule ID from path parameters
    id = event.pathParameters?.id;
    if (!id) {
      return errorResponse('Alert rule ID is required', 400);
    }

    // Delete whale alert rule
    const deleted = await whaleAlertService.deleteWhaleAlertRule(userId, id);

    if (!deleted) {
      return errorResponse('Alert rule not found', 404);
    }

    return successResponse({ message: 'Alert rule deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting whale alert', error, { userId: userId ?? undefined, alertId: id });
    return errorResponse('Internal server error', 500, error.message);
  }
}

/**
 * Toggle Whale Alert Rule
 * PATCH /v2/premium/alerts/whale/:id/toggle
 */
export async function toggleWhaleAlert(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let id: string | undefined = undefined;
  let enabled: boolean | undefined = undefined;

  try {
    // Check authentication
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get alert rule ID from path parameters
    id = event.pathParameters?.id;
    if (!id) {
      return errorResponse('Alert rule ID is required', 400);
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

    // Toggle whale alert rule
    const rule = await whaleAlertService.toggleWhaleAlertRule(userId, id, enabled);

    if (!rule) {
      return errorResponse('Alert rule not found', 404);
    }

    return successResponse(rule);
  } catch (error: any) {
    logger.error('Error toggling whale alert', error, { userId: userId ?? undefined, alertId: id, enabled });
    return errorResponse('Internal server error', 500, error.message);
  }
}

