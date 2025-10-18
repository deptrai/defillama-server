/**
 * Common Utilities Index
 * Exports all shared utilities
 * 
 * Optimization Phase 1 & 2: Code Consolidation & Logging Enhancement
 */

// Response utilities
export {
  CORS_HEADERS,
  successResponse,
  errorResponse,
  getUserId,
  isAuthenticated,
  type SuccessResponse,
  type ErrorResponse,
} from './response';

// Test helpers
export {
  createMockEvent,
  createMockWhaleAlert,
  createMockPriceAlert,
  createMockPaginationResult,
  createMockSql,
  generateUUID,
  generateUserId,
  generateTimestamp,
  assertSuccessResponse,
  assertErrorResponse,
} from './test-helpers';

// Validation utilities
export {
  validatePagination,
  validateUUID,
  validateEmail,
  validateURL,
  sanitizeString,
  sanitizeAndValidateString,
  validatePositiveNumber,
  validateNumberRange,
  validateNonEmptyArray,
  validateArrayLength,
  paginationSchema,
  uuidSchema,
  emailSchema,
  urlSchema,
} from './validation';

// Logger utilities
export {
  logger,
  createLogger,
  logExecutionTime,
  logDatabaseQuery,
  logAPIRequest,
  logValidationError,
  logRateLimitExceeded,
  LogLevel,
  type LogContext,
} from './logger';

