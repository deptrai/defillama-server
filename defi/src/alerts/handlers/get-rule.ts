/**
 * Get Single Alert Rule Handler
 * GET /alerts/:id
 */

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getAlertRuleById } from '../db';
import { AlertRuleResponse } from '../types';
import { validateUUIDParam } from '../utils/uuid';

/**
 * Get a single alert rule by ID
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

    // Get rule ID from path parameters and validate UUID
    const ruleId = event.pathParameters?.id;
    const uuidValidation = validateUUIDParam(ruleId, 'Rule ID');
    if (!uuidValidation.valid) {
      return uuidValidation.error!;
    }

    // Get alert rule (ruleId is guaranteed to be defined after validation)
    const rule = await getAlertRuleById(userId, ruleId!);

    if (!rule) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Not Found',
          message: 'Alert rule not found',
        }),
      };
    }

    // Format response
    const response: AlertRuleResponse = {
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
    console.error('Error getting alert rule:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to get alert rule',
      }),
    };
  }
};

