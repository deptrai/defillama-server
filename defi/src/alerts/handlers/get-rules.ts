/**
 * Get Alert Rules Handler
 * GET /alerts
 */

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getAlertRules } from '../db';
import { GetAlertRulesResponse, AlertType } from '../types';

/**
 * Get alert rules with filters and pagination
 */
export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get user ID from JWT (set by authorizer)
    const userId = event.requestContext.authorizer?.userId;
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'User ID not found in request context',
        }),
      };
    }

    // Parse query parameters
    const params = event.queryStringParameters || {};

    // Build filters
    const filters = {
      user_id: userId,
      alert_type: params.alert_type as AlertType | undefined,
      protocol_id: params.protocol_id,
      token_id: params.token_id,
      chain_id: params.chain_id ? parseInt(params.chain_id) : undefined,
      enabled: params.enabled !== undefined ? params.enabled === 'true' : undefined,
    };

    // Build pagination
    const pagination = {
      limit: params.limit ? Math.min(parseInt(params.limit), 100) : 50, // Max 100
      offset: params.offset ? parseInt(params.offset) : 0,
      sort_by: (params.sort_by as any) || 'created_at',
      sort_order: (params.sort_order as 'asc' | 'desc') || 'desc',
    };

    // Validate pagination parameters
    if (isNaN(pagination.limit) || pagination.limit < 1) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid limit parameter',
        }),
      };
    }

    if (isNaN(pagination.offset) || pagination.offset < 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid offset parameter',
        }),
      };
    }

    // Get alert rules
    const { rules, total } = await getAlertRules(filters, pagination);

    // Format response
    const response: GetAlertRulesResponse = {
      rules: rules.map((rule) => ({
        id: rule.id,
        user_id: rule.user_id,
        name: rule.name,
        description: rule.description,
        alert_type: rule.alert_type,
        protocol_id: rule.protocol_id,
        token_id: rule.token_id,
        chain_id: rule.chain_id,
        condition: rule.condition,
        channels: rule.channels,
        throttle_minutes: rule.throttle_minutes,
        enabled: rule.enabled,
        created_at: rule.created_at.toISOString(),
        updated_at: rule.updated_at.toISOString(),
        last_triggered_at: rule.last_triggered_at?.toISOString(),
      })),
      total,
      limit: pagination.limit,
      offset: pagination.offset,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.error('Error getting alert rules:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to get alert rules',
      }),
    };
  }
};

