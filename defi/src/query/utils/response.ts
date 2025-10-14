/**
 * Response Formatter
 * Formats API responses
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { QueryResponse } from '../types';

/**
 * Format success response
 */
export function formatSuccessResponse(result: QueryResponse): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      success: true,
      data: result.data,
      metadata: {
        count: result.count,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        executionTime: result.executionTime,
        cacheHit: result.cacheHit,
        timestamp: new Date().toISOString(),
      },
    }),
  };
}

/**
 * Format error response
 */
export function formatErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: any
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      success: false,
      error: {
        code,
        message,
        details,
      },
    }),
  };
}

