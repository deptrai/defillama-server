/**
 * Portfolio API Validation
 * Story: 2.2.1 - Wallet Portfolio Tracking
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
 * Validate portfolio summary request
 */
export function validatePortfolioSummaryRequest(
  walletAddress: string,
  chains?: string[],
  includeNfts?: boolean
): ValidationResult {
  // Validate wallet address
  if (!walletAddress) {
    return ValidationResult.failure('Wallet address is required');
  }

  if (!isValidAddress(walletAddress)) {
    return ValidationResult.failure('Invalid wallet address format');
  }

  // Validate chains
  if (chains && chains.length > 0) {
    for (const chain of chains) {
      if (!isValidChain(chain)) {
        return ValidationResult.failure(`Invalid chain: ${chain}`);
      }
    }
  }

  return ValidationResult.success();
}

/**
 * Validate allocation request
 */
export function validateAllocationRequest(
  walletAddress: string,
  groupBy: string,
  minAllocation?: number
): ValidationResult {
  // Validate wallet address
  if (!walletAddress) {
    return ValidationResult.failure('Wallet address is required');
  }

  if (!isValidAddress(walletAddress)) {
    return ValidationResult.failure('Invalid wallet address format');
  }

  // Validate groupBy
  const validGroupBy = ['token', 'protocol', 'chain', 'category'];
  if (!validGroupBy.includes(groupBy)) {
    return ValidationResult.failure(
      `Invalid groupBy. Must be one of: ${validGroupBy.join(', ')}`
    );
  }

  // Validate minAllocation
  if (minAllocation !== undefined) {
    if (isNaN(minAllocation) || minAllocation < 0 || minAllocation > 100) {
      return ValidationResult.failure('minAllocation must be between 0 and 100');
    }
  }

  return ValidationResult.success();
}

/**
 * Validate holdings request
 */
export function validateHoldingsRequest(
  walletAddress: string,
  chains?: string[],
  minValue?: number,
  page?: number,
  limit?: number
): ValidationResult {
  // Validate wallet address
  if (!walletAddress) {
    return ValidationResult.failure('Wallet address is required');
  }

  if (!isValidAddress(walletAddress)) {
    return ValidationResult.failure('Invalid wallet address format');
  }

  // Validate chains
  if (chains && chains.length > 0) {
    for (const chain of chains) {
      if (!isValidChain(chain)) {
        return ValidationResult.failure(`Invalid chain: ${chain}`);
      }
    }
  }

  // Validate minValue
  if (minValue !== undefined) {
    if (isNaN(minValue) || minValue < 0) {
      return ValidationResult.failure('minValue must be >= 0');
    }
  }

  // Validate page
  if (page !== undefined) {
    if (isNaN(page) || page < 1) {
      return ValidationResult.failure('page must be >= 1');
    }
  }

  // Validate limit
  if (limit !== undefined) {
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return ValidationResult.failure('limit must be between 1 and 100');
    }
  }

  return ValidationResult.success();
}

/**
 * Validate performance request
 */
export function validatePerformanceRequest(
  walletAddress: string,
  timeRange: string,
  granularity: string,
  benchmark: string
): ValidationResult {
  // Validate wallet address
  if (!walletAddress) {
    return ValidationResult.failure('Wallet address is required');
  }

  if (!isValidAddress(walletAddress)) {
    return ValidationResult.failure('Invalid wallet address format');
  }

  // Validate timeRange
  const validTimeRanges = ['7d', '30d', '90d', '1y', 'all'];
  if (!validTimeRanges.includes(timeRange)) {
    return ValidationResult.failure(
      `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`
    );
  }

  // Validate granularity
  const validGranularities = ['hourly', 'daily', 'weekly'];
  if (!validGranularities.includes(granularity)) {
    return ValidationResult.failure(
      `Invalid granularity. Must be one of: ${validGranularities.join(', ')}`
    );
  }

  // Validate benchmark
  const validBenchmarks = ['eth', 'btc', 'none'];
  if (!validBenchmarks.includes(benchmark)) {
    return ValidationResult.failure(
      `Invalid benchmark. Must be one of: ${validBenchmarks.join(', ')}`
    );
  }

  return ValidationResult.success();
}

/**
 * Validate compare request
 */
export function validateCompareRequest(
  wallets: string[],
  timeRange: string
): ValidationResult {
  // Validate wallets
  if (!wallets || wallets.length === 0) {
    return ValidationResult.failure('At least one wallet address is required');
  }

  if (wallets.length > 5) {
    return ValidationResult.failure('Maximum 5 wallets can be compared');
  }

  for (const wallet of wallets) {
    if (!isValidAddress(wallet)) {
      return ValidationResult.failure(`Invalid wallet address: ${wallet}`);
    }
  }

  // Validate timeRange
  const validTimeRanges = ['7d', '30d', '90d', '1y'];
  if (!validTimeRanges.includes(timeRange)) {
    return ValidationResult.failure(
      `Invalid timeRange. Must be one of: ${validTimeRanges.join(', ')}`
    );
  }

  return ValidationResult.success();
}

