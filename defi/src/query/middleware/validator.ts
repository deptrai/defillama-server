/**
 * Request Validator Middleware
 * Validates query request structure
 */

import { ValidationResult } from '../types';

/**
 * Validate request body
 */
export function validateRequest(body: any): ValidationResult {
  const errors: any[] = [];

  // Check if body is object
  if (typeof body !== 'object' || body === null) {
    errors.push({ field: 'body', message: 'Request body must be a JSON object' });
    return { valid: false, errors };
  }

  // Check required fields
  if (!body.table) {
    errors.push({ field: 'table', message: 'Table name is required' });
  }

  // Validate table name
  const validTables = ['protocols', 'protocol_tvl', 'token_prices', 'protocol_stats'];
  if (body.table && !validTables.includes(body.table)) {
    errors.push({ field: 'table', message: `Invalid table name. Must be one of: ${validTables.join(', ')}` });
  }

  // Validate filters (if present)
  if (body.filters !== undefined && typeof body.filters !== 'object') {
    errors.push({ field: 'filters', message: 'Filters must be an object' });
  }

  // Validate aggregations (if present)
  if (body.aggregations !== undefined && !Array.isArray(body.aggregations)) {
    errors.push({ field: 'aggregations', message: 'Aggregations must be an array' });
  }

  // Validate groupBy (if present)
  if (body.groupBy !== undefined && !Array.isArray(body.groupBy)) {
    errors.push({ field: 'groupBy', message: 'GroupBy must be an array' });
  }

  // Validate orderBy (if present)
  if (body.orderBy !== undefined && !Array.isArray(body.orderBy)) {
    errors.push({ field: 'orderBy', message: 'OrderBy must be an array' });
  }

  // Validate pagination (if present)
  if (body.pagination !== undefined) {
    if (typeof body.pagination !== 'object') {
      errors.push({ field: 'pagination', message: 'Pagination must be an object' });
    } else {
      if (body.pagination.page !== undefined && typeof body.pagination.page !== 'number') {
        errors.push({ field: 'pagination.page', message: 'Page must be a number' });
      }
      if (body.pagination.limit !== undefined && typeof body.pagination.limit !== 'number') {
        errors.push({ field: 'pagination.limit', message: 'Limit must be a number' });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

