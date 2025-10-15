/**
 * Validation Layer: Cross-chain Portfolio API
 * Story: 2.2.3 - Cross-chain Portfolio Aggregation
 */

export class ValidationResult {
  constructor(
    public success: boolean,
    public error?: string
  ) {}

  static success(): ValidationResult {
    return new ValidationResult(true);
  }

  static failure(error: string): ValidationResult {
    return new ValidationResult(false, error);
  }
}

/**
 * Validate user ID
 */
export function validateUserId(userId: string | undefined): ValidationResult {
  if (!userId || userId.trim() === '') {
    return ValidationResult.failure('User ID is required');
  }

  if (userId.length > 255) {
    return ValidationResult.failure('User ID must be less than 255 characters');
  }

  return ValidationResult.success();
}

/**
 * Validate chain ID filter (optional)
 */
export function validateChainId(chainId: string | undefined): ValidationResult {
  if (!chainId) {
    return ValidationResult.success(); // Optional parameter
  }

  const validChains = [
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
    'bsc',
    'avalanche',
    'fantom',
    'base',
    'linea',
    'scroll',
    'zksync',
    'starknet',
  ];

  if (!validChains.includes(chainId.toLowerCase())) {
    return ValidationResult.failure(
      `Invalid chain ID. Supported chains: ${validChains.join(', ')}`
    );
  }

  return ValidationResult.success();
}

/**
 * Validate category filter (optional)
 */
export function validateCategory(category: string | undefined): ValidationResult {
  if (!category) {
    return ValidationResult.success(); // Optional parameter
  }

  const validCategories = ['defi', 'stablecoin', 'native', 'other'];

  if (!validCategories.includes(category.toLowerCase())) {
    return ValidationResult.failure(
      `Invalid category. Supported categories: ${validCategories.join(', ')}`
    );
  }

  return ValidationResult.success();
}

/**
 * Validate minimum value filter (optional)
 */
export function validateMinValue(minValue: string | undefined): ValidationResult {
  if (!minValue) {
    return ValidationResult.success(); // Optional parameter
  }

  const value = parseFloat(minValue);

  if (isNaN(value)) {
    return ValidationResult.failure('Minimum value must be a valid number');
  }

  if (value < 0) {
    return ValidationResult.failure('Minimum value must be non-negative');
  }

  return ValidationResult.success();
}

/**
 * Validate transaction type filter (optional)
 */
export function validateTransactionType(type: string | undefined): ValidationResult {
  if (!type) {
    return ValidationResult.success(); // Optional parameter
  }

  const validTypes = ['transfer', 'swap', 'stake', 'unstake', 'claim'];

  if (!validTypes.includes(type.toLowerCase())) {
    return ValidationResult.failure(
      `Invalid transaction type. Supported types: ${validTypes.join(', ')}`
    );
  }

  return ValidationResult.success();
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  limit: string | undefined,
  offset: string | undefined
): ValidationResult {
  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return ValidationResult.failure('Limit must be between 1 and 1000');
    }
  }

  if (offset) {
    const offsetNum = parseInt(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return ValidationResult.failure('Offset must be non-negative');
    }
  }

  return ValidationResult.success();
}

