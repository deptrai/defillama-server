/**
 * Create Alert Rule Handler
 * POST /alerts
 */

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createAlertRule } from '../db';
import { validateCreateAlertRule } from '../validation';
import { CreateAlertRuleRequest, CreateAlertRuleResponse } from '../types';

/**
 * Create a new alert rule
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

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Request body is required',
        }),
      };
    }

    let requestData: CreateAlertRuleRequest;
    try {
      requestData = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid JSON in request body',
        }),
      };
    }

    // Validate request data
    const validationResult = validateCreateAlertRule(requestData);
    if (!validationResult.valid) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Validation Error',
          message: 'Invalid request data',
          errors: validationResult.errors,
        }),
      };
    }

    // Create alert rule
    const rule = await createAlertRule(userId, requestData);

    // Format response
    const response: CreateAlertRuleResponse = {
      rule: {
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
      },
      message: 'Alert rule created successfully',
    };

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.error('Error creating alert rule:', error);

    // Check for database constraint violations
    if (error.code === '23514') {
      // CHECK constraint violation
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Validation Error',
          message: 'At least one target (protocol_id, token_id, or chain_id) is required',
        }),
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to create alert rule',
      }),
    };
  }
};

