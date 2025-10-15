/**
 * Handlers for Liquidity Analysis API
 * Story: 2.1.3 - Liquidity Analysis Tools
 */

import * as HyperExpress from 'hyper-express';
import { query } from '../../../../analytics/db/connection';
import { liquidityDepthEngine } from '../../../../analytics/engines/liquidity-depth-engine';
import { lpAnalysisEngine } from '../../../../analytics/engines/lp-analysis-engine';
import { impermanentLossEngine } from '../../../../analytics/engines/impermanent-loss-engine';
import { liquidityMigrationEngine } from '../../../../analytics/engines/liquidity-migration-engine';
import {
  validateGetPools,
  validateGetPoolDepth,
  validateGetPoolProviders,
  validateGetPoolIL,
  validateGetMigrations,
} from './validation';

type Request = HyperExpress.Request;
type Response = HyperExpress.Response;

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /v1/analytics/liquidity-pools
 * List liquidity pools with filters
 */
export async function getPoolsList(req: Request, res: Response) {
  // Validate query parameters
  const validation = validateGetPools(req);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  const {
    protocolId,
    chainId,
    poolType,
    minLiquidity,
    sortBy = 'liquidity',
    limit = 20,
    offset = 0,
  } = req.query_parameters;

  try {
    // Build query conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (protocolId) {
      conditions.push(`protocol_id = $${paramIndex++}`);
      params.push(protocolId);
    }

    if (chainId) {
      conditions.push(`chain_id = $${paramIndex++}`);
      params.push(chainId);
    }

    if (poolType) {
      conditions.push(`pool_type = $${paramIndex++}`);
      params.push(poolType);
    }

    if (minLiquidity) {
      conditions.push(`total_liquidity >= $${paramIndex++}`);
      params.push(minLiquidity);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortColumn = {
      liquidity: 'total_liquidity',
      volume: 'volume_24h',
      fees: 'fee_24h',
    }[sortBy];

    // Query pools
    const result = await query<any>(
      `SELECT 
        id,
        protocol_id as "protocolId",
        pool_address as "poolAddress",
        chain_id as "chainId",
        pool_name as "poolName",
        token0_symbol as "token0Symbol",
        token1_symbol as "token1Symbol",
        pool_type as "poolType",
        total_liquidity::FLOAT as "totalLiquidity",
        token0_reserve::FLOAT as "token0Reserve",
        token1_reserve::FLOAT as "token1Reserve",
        bid_depth_1pct::FLOAT as "bidDepth1Pct",
        ask_depth_1pct::FLOAT as "askDepth1Pct",
        bid_ask_spread::FLOAT as "bidAskSpread",
        volume_24h::FLOAT as "volume24h",
        fee_24h::FLOAT as "fee24h",
        lp_count::INT as "lpCount",
        last_updated as "lastUpdated"
      FROM liquidity_pools
      ${whereClause}
      ORDER BY ${sortColumn} DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      pools: result.rows,
      pagination: {
        limit,
        offset,
        total: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Error getting pools list:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve liquidity pools',
    });
  }
}

/**
 * GET /v1/analytics/liquidity-pools/:id/depth
 * Get depth chart for a specific pool
 */
export async function getPoolDepth(req: Request, res: Response) {
  // Validate parameters
  const validation = validateGetPoolDepth(req);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  const poolId = req.path_parameters.id;
  const levels = Number(req.query_parameters.levels || 10);

  try {
    // Get depth chart
    const depthChart = await liquidityDepthEngine.getDepthChart(poolId, levels);

    // Get spread analysis
    const spread = await liquidityDepthEngine.getSpread(poolId);

    // Get price impact for common trade sizes
    const priceImpact = await liquidityDepthEngine.getPriceImpact(poolId, [
      1000, 10000, 100000, 1000000,
    ]);

    return res.status(200).json({
      poolId,
      depthChart,
      spread,
      priceImpact,
    });
  } catch (error) {
    console.error('Error getting pool depth:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Pool not found',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve pool depth data',
    });
  }
}

/**
 * GET /v1/analytics/liquidity-pools/:id/providers
 * Get LP analysis for a pool
 */
export async function getPoolProviders(req: Request, res: Response) {
  // Validate parameters
  const validation = validateGetPoolProviders(req);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  const poolId = req.path_parameters.id;
  const { sortBy = 'value', limit = 20, offset = 0 } = req.query_parameters;

  try {
    // Get LP positions
    const positions = await lpAnalysisEngine.getLPPositions({
      poolId,
      sortBy,
      limit: Number(limit),
      offset: Number(offset),
    });

    // Get LP profitability
    const profitability = await lpAnalysisEngine.getLPProfitability(poolId);

    // Get LP rankings
    const rankings = await lpAnalysisEngine.rankLPs(poolId);

    // Get concentration metrics
    const concentration = await lpAnalysisEngine.calculateConcentration(poolId);

    return res.status(200).json({
      poolId,
      positions,
      profitability,
      rankings,
      concentration,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: positions.length,
      },
    });
  } catch (error) {
    console.error('Error getting pool providers:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Pool not found',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve LP data',
    });
  }
}

/**
 * GET /v1/analytics/liquidity-pools/:id/impermanent-loss
 * Get IL data for a pool
 */
export async function getPoolIL(req: Request, res: Response) {
  // Validate parameters
  const validation = validateGetPoolIL(req);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  const poolId = req.path_parameters.id;
  const lpId = req.query_parameters.lpId;

  try {
    // Get risk score for the pool
    const riskScore = await impermanentLossEngine.scoreILRisk(poolId);

    // If specific LP requested
    if (lpId) {
      const ilData = await impermanentLossEngine.calculateIL(lpId);
      const comparison = await impermanentLossEngine.compareILvsFees(lpId);
      const history = await impermanentLossEngine.getHistoricalIL(lpId, 30);

      return res.status(200).json({
        poolId,
        lpId,
        riskScore,
        impermanentLoss: ilData,
        comparison,
        history,
      });
    }

    // Otherwise, get IL data for all LPs in the pool
    const lpPositions = await lpAnalysisEngine.getLPPositions({ poolId, limit: 100 });
    const ilDataList = await Promise.all(
      lpPositions.map(async (lp) => {
        const ilData = await impermanentLossEngine.calculateIL(lp.id);
        const comparison = await impermanentLossEngine.compareILvsFees(lp.id);
        return {
          lpId: lp.id,
          walletAddress: lp.walletAddress,
          impermanentLoss: ilData,
          comparison,
        };
      })
    );

    return res.status(200).json({
      poolId,
      riskScore,
      lpData: ilDataList,
    });
  } catch (error) {
    console.error('Error getting pool IL:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Pool or LP not found',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve impermanent loss data',
    });
  }
}

/**
 * GET /v1/analytics/liquidity-migrations
 * Get liquidity migration data
 */
export async function getMigrations(req: Request, res: Response) {
  // Validate parameters
  const validation = validateGetMigrations(req);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: validation.errors,
    });
  }

  const {
    fromProtocolId,
    toProtocolId,
    chainId,
    reason,
    days = 30,
    limit = 20,
    offset = 0,
  } = req.query_parameters;

  try {
    // Get migrations
    const migrations = await liquidityMigrationEngine.getMigrations({
      fromProtocolId,
      toProtocolId,
      chainId,
      reason,
      limit: Number(limit),
      offset: Number(offset),
    });

    // Get migration flows
    const flows = await liquidityMigrationEngine.analyzeMigrationFlows(Number(days));

    // Get migration causes
    const causes = await liquidityMigrationEngine.getMigrationCauses(Number(days));

    return res.status(200).json({
      migrations,
      flows,
      causes,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: migrations.length,
      },
    });
  } catch (error) {
    console.error('Error getting migrations:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve migration data',
    });
  }
}

