/**
 * Yield Opportunities API Validation
 * Story: 2.1.2 - Yield Opportunity Scanner
 */

import { Request } from 'hyper-express';

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationResult {
  constructor(
    public isValid: boolean,
    public errors: ValidationError[] = []
  ) {}

  static success(): ValidationResult {
    return new ValidationResult(true, []);
  }

  static failure(errors: ValidationError[]): ValidationResult {
    return new ValidationResult(false, errors);
  }
}

/**
 * Validate GET /yield-opportunities query parameters
 */
export function validateGetOpportunities(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const query = req.query;

  // Validate chains (optional array)
  if (query.chains) {
    const chains = Array.isArray(query.chains) ? query.chains : [query.chains];
    if (!chains.every((c: any) => typeof c === 'string')) {
      errors.push({ field: 'chains', message: 'chains must be an array of strings' });
    }
  }

  // Validate protocols (optional array)
  if (query.protocols) {
    const protocols = Array.isArray(query.protocols) ? query.protocols : [query.protocols];
    if (!protocols.every((p: any) => typeof p === 'string')) {
      errors.push({ field: 'protocols', message: 'protocols must be an array of strings' });
    }
  }

  // Validate poolTypes (optional array)
  if (query.poolTypes) {
    const poolTypes = Array.isArray(query.poolTypes) ? query.poolTypes : [query.poolTypes];
    const validTypes = ['lending', 'staking', 'lp', 'farming'];
    if (!poolTypes.every((t: any) => validTypes.includes(t))) {
      errors.push({ field: 'poolTypes', message: `poolTypes must be one of: ${validTypes.join(', ')}` });
    }
  }

  // Validate minApy (optional number)
  if (query.minApy !== undefined) {
    const minApy = parseFloat(query.minApy as string);
    if (isNaN(minApy) || minApy < 0) {
      errors.push({ field: 'minApy', message: 'minApy must be a positive number' });
    }
  }

  // Validate maxRiskScore (optional number 0-100)
  if (query.maxRiskScore !== undefined) {
    const maxRiskScore = parseInt(query.maxRiskScore as string, 10);
    if (isNaN(maxRiskScore) || maxRiskScore < 0 || maxRiskScore > 100) {
      errors.push({ field: 'maxRiskScore', message: 'maxRiskScore must be between 0 and 100' });
    }
  }

  // Validate minTvl (optional number)
  if (query.minTvl !== undefined) {
    const minTvl = parseFloat(query.minTvl as string);
    if (isNaN(minTvl) || minTvl < 0) {
      errors.push({ field: 'minTvl', message: 'minTvl must be a positive number' });
    }
  }

  // Validate sortBy (optional)
  if (query.sortBy) {
    const validSortBy = ['apy', 'risk_adjusted_yield', 'tvl', 'volume_24h', 'risk_score'];
    if (!validSortBy.includes(query.sortBy as string)) {
      errors.push({ field: 'sortBy', message: `sortBy must be one of: ${validSortBy.join(', ')}` });
    }
  }

  // Validate sortOrder (optional)
  if (query.sortOrder) {
    const validSortOrder = ['asc', 'desc'];
    if (!validSortOrder.includes(query.sortOrder as string)) {
      errors.push({ field: 'sortOrder', message: 'sortOrder must be either asc or desc' });
    }
  }

  // Validate page (optional positive integer)
  if (query.page !== undefined) {
    const page = parseInt(query.page as string, 10);
    if (isNaN(page) || page < 1) {
      errors.push({ field: 'page', message: 'page must be a positive integer' });
    }
  }

  // Validate pageSize (optional positive integer, max 100)
  if (query.pageSize !== undefined) {
    const pageSize = parseInt(query.pageSize as string, 10);
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      errors.push({ field: 'pageSize', message: 'pageSize must be between 1 and 100' });
    }
  }

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

/**
 * Validate GET /yield-opportunities/:id/history query parameters
 */
export function validateGetHistory(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const query = req.query;
  const params = req.params;

  // Validate ID (required)
  if (!params.id || typeof params.id !== 'string') {
    errors.push({ field: 'id', message: 'id is required and must be a string' });
  }

  // Validate timeRange (optional)
  if (query.timeRange) {
    const validTimeRanges = ['7d', '30d', '90d', '1y'];
    if (!validTimeRanges.includes(query.timeRange as string)) {
      errors.push({ field: 'timeRange', message: `timeRange must be one of: ${validTimeRanges.join(', ')}` });
    }
  }

  // Validate granularity (optional)
  if (query.granularity) {
    const validGranularity = ['hourly', 'daily', 'weekly'];
    if (!validGranularity.includes(query.granularity as string)) {
      errors.push({ field: 'granularity', message: `granularity must be one of: ${validGranularity.join(', ')}` });
    }
  }

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

/**
 * Validate GET /yield-opportunities/top query parameters
 */
export function validateGetTop(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const query = req.query;

  // Validate category (required)
  if (!query.category) {
    errors.push({ field: 'category', message: 'category is required' });
  } else {
    const validCategories = ['highest_apy', 'best_risk_adjusted', 'most_stable', 'trending_up'];
    if (!validCategories.includes(query.category as string)) {
      errors.push({ field: 'category', message: `category must be one of: ${validCategories.join(', ')}` });
    }
  }

  // Validate limit (optional positive integer, max 50)
  if (query.limit !== undefined) {
    const limit = parseInt(query.limit as string, 10);
    if (isNaN(limit) || limit < 1 || limit > 50) {
      errors.push({ field: 'limit', message: 'limit must be between 1 and 50' });
    }
  }

  // Validate maxRiskScore (optional number 0-100)
  if (query.maxRiskScore !== undefined) {
    const maxRiskScore = parseInt(query.maxRiskScore as string, 10);
    if (isNaN(maxRiskScore) || maxRiskScore < 0 || maxRiskScore > 100) {
      errors.push({ field: 'maxRiskScore', message: 'maxRiskScore must be between 0 and 100' });
    }
  }

  // Validate minTvl (optional number)
  if (query.minTvl !== undefined) {
    const minTvl = parseFloat(query.minTvl as string);
    if (isNaN(minTvl) || minTvl < 0) {
      errors.push({ field: 'minTvl', message: 'minTvl must be a positive number' });
    }
  }

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

/**
 * Validate POST /yield-alerts request body
 */
export function validateCreateAlert(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const body = req.body || {};

  // Validate userId (required)
  if (!body.userId || typeof body.userId !== 'string') {
    errors.push({ field: 'userId', message: 'userId is required and must be a string' });
  }

  // Validate alertType (required)
  if (!body.alertType) {
    errors.push({ field: 'alertType', message: 'alertType is required' });
  } else {
    const validTypes = ['yield_increase', 'yield_decrease', 'new_opportunity', 'risk_change'];
    if (!validTypes.includes(body.alertType)) {
      errors.push({ field: 'alertType', message: `alertType must be one of: ${validTypes.join(', ')}` });
    }
  }

  // Validate threshold (optional positive number)
  if (body.threshold !== undefined) {
    const threshold = parseFloat(body.threshold);
    if (isNaN(threshold) || threshold < 0) {
      errors.push({ field: 'threshold', message: 'threshold must be a positive number' });
    }
  }

  // Validate minApy (optional positive number)
  if (body.minApy !== undefined) {
    const minApy = parseFloat(body.minApy);
    if (isNaN(minApy) || minApy < 0) {
      errors.push({ field: 'minApy', message: 'minApy must be a positive number' });
    }
  }

  // Validate maxRiskScore (optional number 0-100)
  if (body.maxRiskScore !== undefined) {
    const maxRiskScore = parseInt(body.maxRiskScore, 10);
    if (isNaN(maxRiskScore) || maxRiskScore < 0 || maxRiskScore > 100) {
      errors.push({ field: 'maxRiskScore', message: 'maxRiskScore must be between 0 and 100' });
    }
  }

  // Validate channels (required array)
  if (!body.channels || !Array.isArray(body.channels) || body.channels.length === 0) {
    errors.push({ field: 'channels', message: 'channels is required and must be a non-empty array' });
  } else {
    const validChannels = ['email', 'webhook', 'push'];
    if (!body.channels.every((c: any) => validChannels.includes(c))) {
      errors.push({ field: 'channels', message: `channels must contain only: ${validChannels.join(', ')}` });
    }
  }

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

/**
 * Validate GET /yield-alerts query parameters
 */
export function validateGetAlerts(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const query = req.query;

  // Validate userId (required)
  if (!query.userId || typeof query.userId !== 'string') {
    errors.push({ field: 'userId', message: 'userId is required and must be a string' });
  }

  // Validate enabled (optional boolean)
  if (query.enabled !== undefined) {
    const enabled = query.enabled as string;
    if (enabled !== 'true' && enabled !== 'false') {
      errors.push({ field: 'enabled', message: 'enabled must be either true or false' });
    }
  }

  return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
}

