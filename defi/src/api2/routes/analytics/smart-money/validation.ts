/**
 * Smart Money API Validation
 * Story: 3.1.1 - Smart Money Identification
 */

import { Request } from 'hyper-express';

export interface GetSmartMoneyWalletsQuery {
  chains?: string[];
  minScore?: number;
  verified?: boolean;
  walletType?: 'whale' | 'fund' | 'trader' | 'protocol';
  sortBy?: 'score' | 'roi' | 'pnl' | 'trades';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Validate and parse query parameters for GET /wallets
 */
export function validateGetSmartMoneyWalletsQuery(req: Request): GetSmartMoneyWalletsQuery {
  const query: GetSmartMoneyWalletsQuery = {};

  // Parse chains (comma-separated string to array)
  if (req.query.chains) {
    const chainsStr = String(req.query.chains);
    query.chains = chainsStr.split(',').map(c => c.trim()).filter(c => c.length > 0);
  }

  // Parse minScore
  if (req.query.minScore !== undefined) {
    const minScore = Number(req.query.minScore);
    if (isNaN(minScore) || minScore < 0 || minScore > 100) {
      throw new Error('minScore must be a number between 0 and 100');
    }
    query.minScore = minScore;
  }

  // Parse verified
  if (req.query.verified !== undefined) {
    const verifiedStr = String(req.query.verified).toLowerCase();
    if (verifiedStr !== 'true' && verifiedStr !== 'false') {
      throw new Error('verified must be true or false');
    }
    query.verified = verifiedStr === 'true';
  }

  // Parse walletType
  if (req.query.walletType) {
    const walletType = String(req.query.walletType);
    const validTypes = ['whale', 'fund', 'trader', 'protocol'];
    if (!validTypes.includes(walletType)) {
      throw new Error(`walletType must be one of: ${validTypes.join(', ')}`);
    }
    query.walletType = walletType as any;
  }

  // Parse sortBy
  if (req.query.sortBy) {
    const sortBy = String(req.query.sortBy);
    const validSortFields = ['score', 'roi', 'pnl', 'trades'];
    if (!validSortFields.includes(sortBy)) {
      throw new Error(`sortBy must be one of: ${validSortFields.join(', ')}`);
    }
    query.sortBy = sortBy as any;
  } else {
    query.sortBy = 'score'; // Default sort by score
  }

  // Parse sortOrder
  if (req.query.sortOrder) {
    const sortOrder = String(req.query.sortOrder).toLowerCase();
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      throw new Error('sortOrder must be asc or desc');
    }
    query.sortOrder = sortOrder as any;
  } else {
    query.sortOrder = 'desc'; // Default descending
  }

  // Parse page
  if (req.query.page !== undefined) {
    const page = Number(req.query.page);
    if (isNaN(page) || page < 1) {
      throw new Error('page must be a positive integer');
    }
    query.page = page;
  } else {
    query.page = 1; // Default page 1
  }

  // Parse limit
  if (req.query.limit !== undefined) {
    const limit = Number(req.query.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new Error('limit must be between 1 and 100');
    }
    query.limit = limit;
  } else {
    query.limit = 20; // Default 20 results per page
  }

  return query;
}

