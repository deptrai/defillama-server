/**
 * MEV API Validation
 * Story: 4.1.1 - MEV Opportunity Detection
 * Story: 4.1.2 - MEV Protection Insights
 *
 * Request validation for MEV API endpoints
 */

import { MEVOpportunityType } from '../../../../analytics/engines/mev-types';
import { TransactionRequest } from '../../../../analytics/engines/mev-protection-analyzer';

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate chain ID
 */
export function validateChainId(chainId: string | undefined): string {
  const validChains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche'];
  
  if (!chainId) {
    return 'ethereum'; // Default
  }
  
  if (!validChains.includes(chainId.toLowerCase())) {
    throw new Error(`Invalid chain_id. Must be one of: ${validChains.join(', ')}`);
  }
  
  return chainId.toLowerCase();
}

/**
 * Validate opportunity type
 */
export function validateOpportunityType(type: string | undefined): MEVOpportunityType | undefined {
  const validTypes: MEVOpportunityType[] = ['sandwich', 'frontrun', 'backrun', 'arbitrage', 'liquidation'];
  
  if (!type) {
    return undefined; // Optional
  }
  
  if (!validTypes.includes(type as MEVOpportunityType)) {
    throw new Error(`Invalid opportunity_type. Must be one of: ${validTypes.join(', ')}`);
  }
  
  return type as MEVOpportunityType;
}

/**
 * Validate minimum profit
 */
export function validateMinProfit(minProfit: string | undefined): number {
  if (!minProfit) {
    return 0; // Default: no minimum
  }
  
  const profit = parseFloat(minProfit);
  
  if (isNaN(profit) || profit < 0) {
    throw new Error('Invalid min_profit. Must be a positive number');
  }
  
  return profit;
}

/**
 * Validate time range
 */
export function validateTimeRange(timeRange: string | undefined): { start: Date; end: Date } {
  const validRanges = ['1h', '24h', '7d', '30d', '90d'];
  
  if (!timeRange) {
    timeRange = '24h'; // Default
  }
  
  if (!validRanges.includes(timeRange)) {
    throw new Error(`Invalid time_range. Must be one of: ${validRanges.join(', ')}`);
  }
  
  const end = new Date();
  const start = new Date();
  
  switch (timeRange) {
    case '1h':
      start.setHours(start.getHours() - 1);
      break;
    case '24h':
      start.setHours(start.getHours() - 24);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
  }
  
  return { start, end };
}

/**
 * Validate pagination
 */
export function validatePagination(
  page: string | undefined,
  limit: string | undefined
): { page: number; limit: number; offset: number } {
  const pageNum = page ? parseInt(page, 10) : 1;
  const limitNum = limit ? parseInt(limit, 10) : 20;
  
  if (isNaN(pageNum) || pageNum < 1) {
    throw new Error('Invalid page. Must be a positive integer');
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw new Error('Invalid limit. Must be between 1 and 100');
  }
  
  const offset = (pageNum - 1) * limitNum;
  
  return { page: pageNum, limit: limitNum, offset };
}

/**
 * Validate sort field
 */
export function validateSortField(sortBy: string | undefined): string {
  const validFields = ['timestamp', 'mev_profit_usd', 'confidence_score', 'net_profit_usd'];
  
  if (!sortBy) {
    return 'timestamp'; // Default
  }
  
  if (!validFields.includes(sortBy)) {
    throw new Error(`Invalid sort_by. Must be one of: ${validFields.join(', ')}`);
  }
  
  return sortBy;
}

/**
 * Validate sort order
 */
export function validateSortOrder(order: string | undefined): 'ASC' | 'DESC' {
  if (!order) {
    return 'DESC'; // Default: newest/highest first
  }
  
  const upperOrder = order.toUpperCase();
  
  if (upperOrder !== 'ASC' && upperOrder !== 'DESC') {
    throw new Error('Invalid order. Must be ASC or DESC');
  }
  
  return upperOrder as 'ASC' | 'DESC';
}

/**
 * Validate opportunity ID
 */
export function validateOpportunityId(id: string | undefined): string {
  if (!id) {
    throw new Error('Opportunity ID is required');
  }
  
  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    throw new Error('Invalid opportunity ID format. Must be a valid UUID');
  }
  
  return id;
}

/**
 * Validate minimum confidence score
 */
export function validateMinConfidence(minConfidence: string | undefined): number {
  if (!minConfidence) {
    return 0; // Default: no minimum
  }
  
  const confidence = parseFloat(minConfidence);
  
  if (isNaN(confidence) || confidence < 0 || confidence > 100) {
    throw new Error('Invalid min_confidence. Must be between 0 and 100');
  }
  
  return confidence;
}

/**
 * Validate status filter
 */
export function validateStatus(status: string | undefined): string | undefined {
  const validStatuses = ['detected', 'confirmed', 'executed', 'failed'];
  
  if (!status) {
    return undefined; // Optional
  }
  
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }
  
  return status;
}

/**
 * Validate list opportunities query parameters
 */
export function validateListOpportunitiesQuery(queryParams: any): {
  chain_id: string;
  opportunity_type?: MEVOpportunityType;
  min_profit: number;
  min_confidence: number;
  status?: string;
  time_range: { start: Date; end: Date };
  pagination: { page: number; limit: number; offset: number };
  sort_by: string;
  order: 'ASC' | 'DESC';
} {
  return {
    chain_id: validateChainId(queryParams.chain_id),
    opportunity_type: validateOpportunityType(queryParams.opportunity_type),
    min_profit: validateMinProfit(queryParams.min_profit),
    min_confidence: validateMinConfidence(queryParams.min_confidence),
    status: validateStatus(queryParams.status),
    time_range: validateTimeRange(queryParams.time_range),
    pagination: validatePagination(queryParams.page, queryParams.limit),
    sort_by: validateSortField(queryParams.sort_by),
    order: validateSortOrder(queryParams.order),
  };
}

/**
 * Validate stats query parameters
 */
export function validateStatsQuery(queryParams: any): {
  chain_id: string;
  time_range: { start: Date; end: Date };
} {
  return {
    chain_id: validateChainId(queryParams.chain_id),
    time_range: validateTimeRange(queryParams.time_range),
  };
}

/**
 * Validate detect query parameters
 */
export function validateDetectQuery(queryParams: any): {
  opportunity_type: MEVOpportunityType;
  chain_id: string;
  block_number?: number;
} {
  const opportunityType = validateOpportunityType(queryParams.opportunity_type);
  
  if (!opportunityType) {
    throw new Error('opportunity_type is required for detection');
  }
  
  let blockNumber: number | undefined;
  if (queryParams.block_number) {
    blockNumber = parseInt(queryParams.block_number, 10);
    if (isNaN(blockNumber) || blockNumber < 0) {
      throw new Error('Invalid block_number. Must be a positive integer');
    }
  }
  
  return {
    opportunity_type: opportunityType,
    chain_id: validateChainId(queryParams.chain_id),
    block_number: blockNumber,
  };
}

/**
 * Validate protection analysis request
 * Story: 4.1.2 - MEV Protection Insights
 */
export function validateProtectionAnalysisRequest(body: any): TransactionRequest {
  // Required fields
  if (!body.chain_id) {
    throw new Error('chain_id is required');
  }

  if (!body.token_in_address) {
    throw new Error('token_in_address is required');
  }

  if (!body.token_out_address) {
    throw new Error('token_out_address is required');
  }

  if (typeof body.amount_in !== 'number' || body.amount_in <= 0) {
    throw new Error('amount_in must be a positive number');
  }

  if (typeof body.amount_in_usd !== 'number' || body.amount_in_usd <= 0) {
    throw new Error('amount_in_usd must be a positive number');
  }

  if (typeof body.slippage_tolerance_pct !== 'number' || body.slippage_tolerance_pct < 0) {
    throw new Error('slippage_tolerance_pct must be a non-negative number');
  }

  // Validate chain ID
  const chainId = validateChainId(body.chain_id);

  // Optional fields with defaults
  const gasPrice = body.gas_price_gwei && typeof body.gas_price_gwei === 'number' && body.gas_price_gwei > 0
    ? body.gas_price_gwei
    : undefined;

  const poolLiquidity = body.pool_liquidity_usd && typeof body.pool_liquidity_usd === 'number' && body.pool_liquidity_usd > 0
    ? body.pool_liquidity_usd
    : undefined;

  const poolVolume = body.pool_volume_24h_usd && typeof body.pool_volume_24h_usd === 'number' && body.pool_volume_24h_usd > 0
    ? body.pool_volume_24h_usd
    : undefined;

  return {
    chain_id: chainId,
    from_address: body.from_address,
    to_address: body.to_address,
    token_in_address: body.token_in_address,
    token_out_address: body.token_out_address,
    amount_in: body.amount_in,
    amount_in_usd: body.amount_in_usd,
    slippage_tolerance_pct: body.slippage_tolerance_pct,
    gas_price_gwei: gasPrice,
    pool_address: body.pool_address,
    pool_liquidity_usd: poolLiquidity,
    pool_volume_24h_usd: poolVolume,
    dex: body.dex,
    is_time_sensitive: body.is_time_sensitive === true,
    use_private_mempool: body.use_private_mempool === true,
  };
}

