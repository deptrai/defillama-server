/**
 * Shared Response Utilities
 * Standardized API Gateway response helpers
 * 
 * Optimization Phase 1: Code Consolidation
 * Reduces code duplication across controllers
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// ============================================================================
// CORS Headers
// ============================================================================

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
};

// ============================================================================
// Response Types
// ============================================================================

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create a successful API Gateway response
 * 
 * @param data - Response data
 * @param statusCode - HTTP status code (default: 200)
 * @returns API Gateway response
 * 
 * @example
 * return successResponse({ id: '123', name: 'Alert' }, 201);
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      data,
    } as SuccessResponse<T>),
  };
}

/**
 * Create an error API Gateway response
 * 
 * @param error - Error message
 * @param statusCode - HTTP status code (default: 500)
 * @param details - Optional error details
 * @returns API Gateway response
 * 
 * @example
 * return errorResponse('Validation failed', 400, 'Invalid email format');
 */
export function errorResponse(
  error: string,
  statusCode: number = 500,
  details?: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      error,
      details,
    } as ErrorResponse),
  };
}

// ============================================================================
// Authentication Helpers
// ============================================================================

/**
 * Extract user ID from API Gateway event
 * 
 * @param event - API Gateway event
 * @returns User ID or null if not authenticated
 * 
 * @example
 * const userId = getUserId(event);
 * if (!userId) {
 *   return errorResponse('Unauthorized', 401);
 * }
 */
export function getUserId(event: APIGatewayProxyEvent): string | null {
  return event.requestContext?.authorizer?.claims?.sub || null;
}

/**
 * Check if user is authenticated
 * 
 * @param event - API Gateway event
 * @returns True if authenticated, false otherwise
 * 
 * @example
 * if (!isAuthenticated(event)) {
 *   return errorResponse('Unauthorized', 401);
 * }
 */
export function isAuthenticated(event: APIGatewayProxyEvent): boolean {
  return getUserId(event) !== null;
}

