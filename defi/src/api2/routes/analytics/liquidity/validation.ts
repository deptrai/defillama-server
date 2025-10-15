/**
 * Validation for Liquidity Analysis API
 * Story: 2.1.3 - Liquidity Analysis Tools
 */

import * as HyperExpress from 'hyper-express';

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: ValidationError[] = []
  ) {}

  static success(): ValidationResult {
    return new ValidationResult(true, []);
  }

  static failure(errors: ValidationError[]): ValidationResult {
    return new ValidationResult(false, errors);
  }
}

type Request = HyperExpress.Request;

// ============================================================================
// Helper Functions
// ============================================================================

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function parseNumber(value: any, defaultValue?: number): number | undefined {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

function validateEnum(value: any, validValues: string[], fieldName: string): ValidationError | null {
  if (value && !validValues.includes(value)) {
    return {
      field: fieldName,
      message: `${fieldName} must be one of: ${validValues.join(', ')}`,
    };
  }
  return null;
}

function validateNumberRange(
  value: any,
  min: number,
  max: number,
  fieldName: string,
  defaultValue?: number
): { value: number; error: ValidationError | null } {
  const num = parseNumber(value, defaultValue);
  
  if (num === undefined) {
    return {
      value: defaultValue || min,
      error: { field: fieldName, message: `${fieldName} must be a valid number` },
    };
  }

  if (num < min || num > max) {
    return {
      value: defaultValue || min,
      error: { field: fieldName, message: `${fieldName} must be between ${min} and ${max}` },
    };
  }

  return { value: num, error: null };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate GET /liquidity-pools query parameters
 */
export function validateGetPools(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const query = req.query_parameters;

  // Validate poolType (optional enum)
  const poolTypeError = validateEnum(
    query.poolType,
    ['uniswap_v2', 'uniswap_v3', 'curve', 'balancer'],
    'poolType'
  );
  if (poolTypeError) errors.push(poolTypeError);

  // Validate minLiquidity (optional number >= 0)
  if (query.minLiquidity !== undefined) {
    const minLiq = parseNumber(query.minLiquidity);
    if (minLiq === undefined || minLiq < 0) {
      errors.push({ field: 'minLiquidity', message: 'minLiquidity must be a number >= 0' });
    }
  }

  // Validate sortBy (optional enum)
  const sortByError = validateEnum(
    query.sortBy,
    ['liquidity', 'volume', 'fees'],
    'sortBy'
  );
  if (sortByError) errors.push(sortByError);

  // Validate limit (1-100, default: 20)
  const limitResult = validateNumberRange(query.limit, 1, 100, 'limit', 20);
  if (limitResult.error) errors.push(limitResult.error);

  // Validate offset (>= 0, default: 0)
  const offsetResult = validateNumberRange(query.offset, 0, Number.MAX_SAFE_INTEGER, 'offset', 0);
  if (offsetResult.error) errors.push(offsetResult.error);

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

/**
 * Validate GET /liquidity-pools/:id/depth parameters
 */
export function validateGetPoolDepth(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const poolId = req.path_parameters.id;
  const query = req.query_parameters;

  // Validate pool ID (required UUID)
  if (!poolId || !isValidUUID(poolId)) {
    errors.push({ field: 'id', message: 'Pool ID must be a valid UUID' });
  }

  // Validate levels (1-50, default: 10)
  const levelsResult = validateNumberRange(query.levels, 1, 50, 'levels', 10);
  if (levelsResult.error) errors.push(levelsResult.error);

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

/**
 * Validate GET /liquidity-pools/:id/providers parameters
 */
export function validateGetPoolProviders(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const poolId = req.path_parameters.id;
  const query = req.query_parameters;

  // Validate pool ID (required UUID)
  if (!poolId || !isValidUUID(poolId)) {
    errors.push({ field: 'id', message: 'Pool ID must be a valid UUID' });
  }

  // Validate sortBy (optional enum)
  const sortByError = validateEnum(
    query.sortBy,
    ['value', 'fees', 'roi'],
    'sortBy'
  );
  if (sortByError) errors.push(sortByError);

  // Validate limit (1-100, default: 20)
  const limitResult = validateNumberRange(query.limit, 1, 100, 'limit', 20);
  if (limitResult.error) errors.push(limitResult.error);

  // Validate offset (>= 0, default: 0)
  const offsetResult = validateNumberRange(query.offset, 0, Number.MAX_SAFE_INTEGER, 'offset', 0);
  if (offsetResult.error) errors.push(offsetResult.error);

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

/**
 * Validate GET /liquidity-pools/:id/impermanent-loss parameters
 */
export function validateGetPoolIL(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const poolId = req.path_parameters.id;
  const query = req.query_parameters;

  // Validate pool ID (required UUID)
  if (!poolId || !isValidUUID(poolId)) {
    errors.push({ field: 'id', message: 'Pool ID must be a valid UUID' });
  }

  // Validate lpId (optional UUID)
  if (query.lpId && !isValidUUID(query.lpId)) {
    errors.push({ field: 'lpId', message: 'LP ID must be a valid UUID' });
  }

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

/**
 * Validate GET /liquidity-migrations query parameters
 */
export function validateGetMigrations(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const query = req.query_parameters;

  // Validate reason (optional enum)
  const reasonError = validateEnum(
    query.reason,
    ['higher_apy', 'incentives', 'risk_reduction', 'new_pool', 'other'],
    'reason'
  );
  if (reasonError) errors.push(reasonError);

  // Validate days (1-365, default: 30)
  const daysResult = validateNumberRange(query.days, 1, 365, 'days', 30);
  if (daysResult.error) errors.push(daysResult.error);

  // Validate limit (1-100, default: 20)
  const limitResult = validateNumberRange(query.limit, 1, 100, 'limit', 20);
  if (limitResult.error) errors.push(limitResult.error);

  // Validate offset (>= 0, default: 0)
  const offsetResult = validateNumberRange(query.offset, 0, Number.MAX_SAFE_INTEGER, 'offset', 0);
  if (offsetResult.error) errors.push(offsetResult.error);

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

