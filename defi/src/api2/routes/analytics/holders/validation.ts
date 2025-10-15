/**
 * Holder Distribution API Validation
 * Story: 2.2.2 - Holder Distribution Analysis
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
 * Validate Ethereum address format
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate chain ID
 */
function isValidChain(chain: string): boolean {
  const validChains = [
    'ethereum',
    'arbitrum',
    'optimism',
    'polygon',
    'avalanche',
    'bsc',
    'fantom',
    'base',
  ];
  return validChains.includes(chain.toLowerCase());
}

/**
 * Validate distribution request
 */
export function validateDistributionRequest(
  tokenAddress: string,
  chainId?: string
): ValidationResult {
  if (!tokenAddress) {
    return ValidationResult.failure('Token address is required');
  }

  if (!isValidAddress(tokenAddress)) {
    return ValidationResult.failure('Invalid token address format');
  }

  if (chainId && !isValidChain(chainId)) {
    return ValidationResult.failure(`Invalid chain: ${chainId}`);
  }

  return ValidationResult.success();
}

/**
 * Validate top holders request
 */
export function validateTopHoldersRequest(
  tokenAddress: string,
  chainId?: string,
  limit?: number,
  excludeContracts?: boolean,
  excludeExchanges?: boolean
): ValidationResult {
  if (!tokenAddress) {
    return ValidationResult.failure('Token address is required');
  }

  if (!isValidAddress(tokenAddress)) {
    return ValidationResult.failure('Invalid token address format');
  }

  if (chainId && !isValidChain(chainId)) {
    return ValidationResult.failure(`Invalid chain: ${chainId}`);
  }

  if (limit !== undefined) {
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return ValidationResult.failure('limit must be between 1 and 1000');
    }
  }

  return ValidationResult.success();
}

/**
 * Validate behavior request
 */
export function validateBehaviorRequest(
  tokenAddress: string,
  chainId?: string,
  timeRange?: string
): ValidationResult {
  if (!tokenAddress) {
    return ValidationResult.failure('Token address is required');
  }

  if (!isValidAddress(tokenAddress)) {
    return ValidationResult.failure('Invalid token address format');
  }

  if (chainId && !isValidChain(chainId)) {
    return ValidationResult.failure(`Invalid chain: ${chainId}`);
  }

  if (timeRange) {
    const validTimeRanges = ['7d', '30d', '90d', '1y'];
    if (!validTimeRanges.includes(timeRange)) {
      return ValidationResult.failure(
        `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`
      );
    }
  }

  return ValidationResult.success();
}

/**
 * Validate history request
 */
export function validateHistoryRequest(
  tokenAddress: string,
  chainId?: string,
  timeRange?: string,
  granularity?: string
): ValidationResult {
  if (!tokenAddress) {
    return ValidationResult.failure('Token address is required');
  }

  if (!isValidAddress(tokenAddress)) {
    return ValidationResult.failure('Invalid token address format');
  }

  if (chainId && !isValidChain(chainId)) {
    return ValidationResult.failure(`Invalid chain: ${chainId}`);
  }

  if (timeRange) {
    const validTimeRanges = ['7d', '30d', '90d', '1y'];
    if (!validTimeRanges.includes(timeRange)) {
      return ValidationResult.failure(
        `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`
      );
    }
  }

  if (granularity) {
    const validGranularities = ['daily', 'weekly'];
    if (!validGranularities.includes(granularity)) {
      return ValidationResult.failure(
        `Invalid granularity. Must be one of: ${validGranularities.join(', ')}`
      );
    }
  }

  return ValidationResult.success();
}

/**
 * Validate create alert request
 */
export function validateCreateAlertRequest(
  userId: string,
  tokenAddress: string,
  chainId: string | undefined,
  alertType: string,
  threshold: number,
  channels: string[]
): ValidationResult {
  if (!userId) {
    return ValidationResult.failure('User ID is required');
  }

  if (!tokenAddress) {
    return ValidationResult.failure('Token address is required');
  }

  if (!isValidAddress(tokenAddress)) {
    return ValidationResult.failure('Invalid token address format');
  }

  if (chainId && !isValidChain(chainId)) {
    return ValidationResult.failure(`Invalid chain: ${chainId}`);
  }

  const validAlertTypes = [
    'whale_accumulation',
    'whale_distribution',
    'concentration_increase',
    'holder_count_change',
  ];
  if (!validAlertTypes.includes(alertType)) {
    return ValidationResult.failure(
      `Invalid alertType. Must be one of: ${validAlertTypes.join(', ')}`
    );
  }

  if (isNaN(threshold) || threshold <= 0) {
    return ValidationResult.failure('threshold must be > 0');
  }

  if (!channels || channels.length === 0) {
    return ValidationResult.failure('At least one channel is required');
  }

  const validChannels = ['email', 'webhook', 'push'];
  for (const channel of channels) {
    if (!validChannels.includes(channel)) {
      return ValidationResult.failure(
        `Invalid channel: ${channel}. Must be one of: ${validChannels.join(', ')}`
      );
    }
  }

  return ValidationResult.success();
}

