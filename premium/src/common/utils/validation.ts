/**
 * Shared Validation Utilities
 * Common validation helpers
 * 
 * Optimization Phase 1: Code Consolidation
 * Reduces validation code duplication
 */

import { z } from 'zod';

// ============================================================================
// Pagination Validation
// ============================================================================

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().max(100).default(20),
});

/**
 * Validate pagination parameters
 * 
 * @param params - Query parameters
 * @returns Validated pagination parameters
 * 
 * @example
 * const { page, per_page } = validatePagination(event.queryStringParameters);
 */
export function validatePagination(params: any = {}) {
  return paginationSchema.parse({
    page: params.page ? parseInt(params.page) : 1,
    per_page: params.per_page ? parseInt(params.per_page) : 20,
  });
}

// ============================================================================
// UUID Validation
// ============================================================================

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 * 
 * @param id - UUID string to validate
 * @returns True if valid UUID, false otherwise
 * 
 * @example
 * if (!validateUUID(alertId)) {
 *   throw new Error('Invalid alert ID format');
 * }
 */
export function validateUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * UUID schema for Zod validation
 */
export const uuidSchema = z.string().refine(validateUUID, {
  message: 'Invalid UUID format',
});

// ============================================================================
// String Sanitization
// ============================================================================

/**
 * Sanitize string input
 * Removes HTML tags and trims whitespace
 * 
 * @param str - String to sanitize
 * @returns Sanitized string
 * 
 * @example
 * const name = sanitizeString(userInput);
 */
export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Sanitize and validate string length
 * 
 * @param str - String to validate
 * @param minLength - Minimum length (default: 1)
 * @param maxLength - Maximum length (default: 255)
 * @returns Sanitized string
 * @throws Error if length is invalid
 * 
 * @example
 * const name = sanitizeAndValidateString(userInput, 1, 100);
 */
export function sanitizeAndValidateString(
  str: string,
  minLength: number = 1,
  maxLength: number = 255
): string {
  const sanitized = sanitizeString(str);
  
  if (sanitized.length < minLength) {
    throw new Error(`String must be at least ${minLength} characters`);
  }
  
  if (sanitized.length > maxLength) {
    throw new Error(`String must be at most ${maxLength} characters`);
  }
  
  return sanitized;
}

// ============================================================================
// Number Validation
// ============================================================================

/**
 * Validate positive number
 * 
 * @param value - Number to validate
 * @param fieldName - Field name for error message
 * @returns Validated number
 * @throws Error if not a positive number
 * 
 * @example
 * const threshold = validatePositiveNumber(input, 'threshold');
 */
export function validatePositiveNumber(value: any, fieldName: string = 'value'): number {
  const num = Number(value);
  
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a number`);
  }
  
  if (num <= 0) {
    throw new Error(`${fieldName} must be positive`);
  }
  
  return num;
}

/**
 * Validate number range
 * 
 * @param value - Number to validate
 * @param min - Minimum value
 * @param max - Maximum value
 * @param fieldName - Field name for error message
 * @returns Validated number
 * @throws Error if out of range
 * 
 * @example
 * const throttle = validateNumberRange(input, 1, 60, 'throttle_minutes');
 */
export function validateNumberRange(
  value: any,
  min: number,
  max: number,
  fieldName: string = 'value'
): number {
  const num = Number(value);
  
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a number`);
  }
  
  if (num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  
  return num;
}

// ============================================================================
// Array Validation
// ============================================================================

/**
 * Validate non-empty array
 * 
 * @param arr - Array to validate
 * @param fieldName - Field name for error message
 * @returns Validated array
 * @throws Error if not a non-empty array
 * 
 * @example
 * const tokens = validateNonEmptyArray(input, 'tokens');
 */
export function validateNonEmptyArray<T>(arr: any, fieldName: string = 'array'): T[] {
  if (!Array.isArray(arr)) {
    throw new Error(`${fieldName} must be an array`);
  }
  
  if (arr.length === 0) {
    throw new Error(`${fieldName} must not be empty`);
  }
  
  return arr as T[];
}

/**
 * Validate array length
 * 
 * @param arr - Array to validate
 * @param minLength - Minimum length
 * @param maxLength - Maximum length
 * @param fieldName - Field name for error message
 * @returns Validated array
 * @throws Error if length is invalid
 * 
 * @example
 * const chains = validateArrayLength(input, 1, 10, 'chains');
 */
export function validateArrayLength<T>(
  arr: any,
  minLength: number,
  maxLength: number,
  fieldName: string = 'array'
): T[] {
  if (!Array.isArray(arr)) {
    throw new Error(`${fieldName} must be an array`);
  }
  
  if (arr.length < minLength) {
    throw new Error(`${fieldName} must have at least ${minLength} items`);
  }
  
  if (arr.length > maxLength) {
    throw new Error(`${fieldName} must have at most ${maxLength} items`);
  }
  
  return arr as T[];
}

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Email regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 * 
 * @param email - Email string to validate
 * @returns True if valid email, false otherwise
 * 
 * @example
 * if (!validateEmail(userEmail)) {
 *   throw new Error('Invalid email format');
 * }
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Email schema for Zod validation
 */
export const emailSchema = z.string().refine(validateEmail, {
  message: 'Invalid email format',
});

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Validate URL format
 * 
 * @param url - URL string to validate
 * @returns True if valid URL, false otherwise
 * 
 * @example
 * if (!validateURL(webhookUrl)) {
 *   throw new Error('Invalid URL format');
 * }
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * URL schema for Zod validation
 */
export const urlSchema = z.string().refine(validateURL, {
  message: 'Invalid URL format',
});

