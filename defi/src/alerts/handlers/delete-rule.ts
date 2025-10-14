/**
 * Delete Alert Rule Handler
 * DELETE /alerts/:id
 */

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { deleteAlertRule } from '../db';
import { DeleteAlertRuleResponse } from '../types';
import { validateUUIDParam } from '../utils/uuid';

/**
 * Delete an alert rule
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

    // Delete alert rule (ruleId is guaranteed to be defined after validation)
    const deleted = await deleteAlertRule(userId, ruleId!);

    if (!deleted) {
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

    // Format response (ruleId is guaranteed to be defined after validation)
    const response: DeleteAlertRuleResponse = {
      message: 'Alert rule deleted successfully',
      deleted_rule_id: ruleId!,
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
    console.error('Error deleting alert rule:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to delete alert rule',
      }),
    };
  }
};

