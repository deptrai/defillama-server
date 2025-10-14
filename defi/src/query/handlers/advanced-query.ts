/**
 * Advanced Query Handler
 * Lambda handler for POST /v1/query/advanced endpoint
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { queryParser } from '../query-parser';
import { aggregationEngine } from '../aggregation-engine';
import { cacheManager } from '../cache-manager';
import { formatSuccessResponse, formatErrorResponse } from '../utils/response';
import { logQuery } from '../utils/logger';
import { validateRequest } from '../middleware/validator';
import { authenticateRequest } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rate-limiter';

/**
 * Main Lambda handler
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Authenticate request (optional - extract user ID if present)
    try {
      const authResult = await authenticateRequest(event);
      userId = authResult.userId;
    } catch (error) {
      // Allow anonymous requests with lower rate limit
      userId = undefined;
    }

    // Check rate limit
    try {
      await checkRateLimit(userId || 'anonymous', event.requestContext.requestId);
    } catch (error) {
      return formatErrorResponse(429, 'RATE_LIMIT_EXCEEDED', error.message);
    }

    // Validate request
    const validationResult = validateRequest(body);
    if (!validationResult.valid) {
      return formatErrorResponse(400, 'VALIDATION_ERROR', 'Invalid request', validationResult.errors);
    }

    // Parse query
    const query = queryParser.parse(body);

    // Check cache
    const cachedResult = await cacheManager.get(query);
    if (cachedResult) {
      // Log query
      await logQuery({
        userId,
        query,
        executionTime: Date.now() - startTime,
        resultCount: cachedResult.count,
        cacheHit: true,
      });

      return formatSuccessResponse(cachedResult);
    }

    // Execute query
    const result = await aggregationEngine.execute(query);

    // Cache result
    await cacheManager.set(query, result);

    // Log query
    await logQuery({
      userId,
      query,
      executionTime: result.executionTime,
      resultCount: result.count,
      cacheHit: false,
    });

    return formatSuccessResponse(result);
  } catch (error) {
    console.error('Query execution error:', error);

    // Log error
    if (userId) {
      try {
        await logQuery({
          userId,
          query: JSON.parse(event.body || '{}'),
          executionTime: Date.now() - startTime,
          resultCount: 0,
          cacheHit: false,
          error: error.message,
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    // Return error response
    if (error.name === 'QueryValidationError') {
      return formatErrorResponse(400, 'VALIDATION_ERROR', error.message, error.errors);
    }

    if (error.name === 'AggregationError') {
      return formatErrorResponse(500, 'QUERY_EXECUTION_ERROR', error.message);
    }

    return formatErrorResponse(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
  }
}

