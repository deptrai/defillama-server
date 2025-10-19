import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { gasPredictionService } from '../services/gas-prediction.service';
import { getUserId, successResponse, errorResponse } from '../../common/utils/response';
import { logger } from '../../common/utils/logger';
import { z } from 'zod';

/**
 * Gas Prediction Controller
 * 
 * REST API endpoints for gas price predictions
 * 
 * Story 1.3: Gas Fee Alerts (Phase 4)
 * Feature ID: F-003
 * EPIC-1: Smart Alerts & Notifications
 */

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Supported blockchain chains for gas predictions
 */
const SUPPORTED_CHAINS = [
  'ethereum',
  'bsc',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
  'fantom',
  'base',
  'linea',
  'scroll',
] as const;

/**
 * Chain parameter validation schema
 */
const chainParamSchema = z.object({
  chain: z.enum(SUPPORTED_CHAINS, {
    errorMap: () => ({
      message: `Chain must be one of: ${SUPPORTED_CHAINS.join(', ')}`,
    }),
  }),
});

// ============================================================================
// Controller Handlers
// ============================================================================

/**
 * Get Gas Price Predictions Handler
 * GET /v2/premium/gas/predictions/:chain
 * 
 * Returns gas price predictions for all gas types (slow, standard, fast, instant)
 * using linear regression model based on historical data.
 * 
 * @param event - API Gateway event
 * @returns API Gateway response with predictions
 * 
 * @example
 * GET /v2/premium/gas/predictions/ethereum
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "chain": "ethereum",
 *       "gasType": "slow",
 *       "currentPrice": 20.5,
 *       "predictions": {
 *         "oneHour": 21.2,
 *         "sixHours": 23.1,
 *         "twentyFourHours": 25.8
 *       },
 *       "trend": "increasing",
 *       "confidence": 95,
 *       "recommendation": "Gas prices are increasing. Consider transacting now...",
 *       "timestamp": 1634567890123
 *     },
 *     // ... 3 more gas types
 *   ]
 * }
 */
export async function getGasPredictions(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let chain: string | undefined = undefined;

  try {
    // Get user ID from JWT (authentication)
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get chain from path parameters
    chain = event.pathParameters?.chain;
    if (!chain) {
      return errorResponse('Chain parameter is required', 400);
    }

    // Validate chain parameter
    const validation = chainParamSchema.safeParse({ chain });
    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map((e) => e.message)
        .join(', ');
      return errorResponse(`Validation failed: ${errorMessage}`, 400);
    }

    // Get gas price predictions
    const predictions = await gasPredictionService.predictGasPrices(chain);

    // Log successful request
    logger.info('Gas predictions retrieved successfully', {
      userId,
      chain,
      predictionsCount: predictions.length,
    });

    return successResponse(predictions, 200);
  } catch (error: any) {
    // Log error
    logger.error(
      'Error getting gas predictions',
      error instanceof Error ? error : new Error('Unknown error'),
      {
        userId: userId ?? undefined,
        chain,
      }
    );

    // Handle specific errors
    if (error.message.includes('Insufficient historical data')) {
      return errorResponse(
        'Insufficient historical data for predictions. Please try again later.',
        503
      );
    }

    if (error.message.includes('Chain not supported')) {
      return errorResponse(
        `Chain '${chain}' is not supported for gas predictions`,
        400
      );
    }

    // Generic error response
    return errorResponse('Internal server error', 500);
  }
}

/**
 * Get Current Gas Prices Handler
 * GET /v2/premium/gas/current/:chain
 * 
 * Returns current gas prices for all gas types without predictions.
 * Useful for quick price checks without prediction overhead.
 * 
 * @param event - API Gateway event
 * @returns API Gateway response with current prices
 * 
 * @example
 * GET /v2/premium/gas/current/ethereum
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "chain": "ethereum",
 *     "slow": 18.5,
 *     "standard": 20.0,
 *     "fast": 22.5,
 *     "instant": 25.0,
 *     "timestamp": "2024-10-19T10:30:00.000Z"
 *   }
 * }
 */
export async function getCurrentGasPrices(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let userId: string | null = null;
  let chain: string | undefined = undefined;

  try {
    // Get user ID from JWT (authentication)
    userId = getUserId(event);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get chain from path parameters
    chain = event.pathParameters?.chain;
    if (!chain) {
      return errorResponse('Chain parameter is required', 400);
    }

    // Validate chain parameter
    const validation = chainParamSchema.safeParse({ chain });
    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map((e) => e.message)
        .join(', ');
      return errorResponse(`Validation failed: ${errorMessage}`, 400);
    }

    // Get historical prices (last 1 data point = current price)
    const historicalData = await (gasPredictionService as any).getHistoricalPrices(
      chain,
      0.01 // 0.01 hours = ~36 seconds (get most recent data)
    );

    if (historicalData.length === 0) {
      return errorResponse(
        'No current gas price data available. Please try again later.',
        503
      );
    }

    // Get most recent price
    const currentPrice = historicalData[historicalData.length - 1];

    // Log successful request
    logger.info('Current gas prices retrieved successfully', {
      userId,
      chain,
    });

    return successResponse(currentPrice, 200);
  } catch (error: any) {
    // Log error
    logger.error(
      'Error getting current gas prices',
      error instanceof Error ? error : new Error('Unknown error'),
      {
        userId: userId ?? undefined,
        chain,
      }
    );

    // Generic error response
    return errorResponse('Internal server error', 500);
  }
}

