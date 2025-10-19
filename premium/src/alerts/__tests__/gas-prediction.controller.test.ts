import { APIGatewayProxyEvent } from 'aws-lambda';
import { getGasPredictions, getCurrentGasPrices } from '../controllers/gas-prediction.controller';
import { gasPredictionService } from '../services/gas-prediction.service';
import * as responseUtils from '../../common/utils/response';

/**
 * Gas Prediction Controller Tests
 * 
 * Story 1.3: Gas Fee Alerts (Phase 5)
 * Tests for gas price prediction API endpoints
 */

// ============================================================================
// Mocks
// ============================================================================

jest.mock('../services/gas-prediction.service');
jest.mock('../../common/utils/response');
jest.mock('../../common/utils/logger');

// ============================================================================
// Test Data
// ============================================================================

const mockPredictions = [
  {
    chain: 'ethereum',
    gasType: 'slow' as const,
    currentPrice: 18.5,
    predictions: {
      oneHour: 19.2,
      sixHours: 20.5,
      twentyFourHours: 22.8,
    },
    trend: 'increasing' as const,
    confidence: 95,
    recommendation: 'Gas prices are increasing. Consider transacting now to save ~0.7 Gwei.',
    timestamp: Date.now(),
  },
  {
    chain: 'ethereum',
    gasType: 'standard' as const,
    currentPrice: 20.0,
    predictions: {
      oneHour: 20.8,
      sixHours: 22.2,
      twentyFourHours: 24.6,
    },
    trend: 'increasing' as const,
    confidence: 95,
    recommendation: 'Gas prices are increasing. Consider transacting now to save ~0.8 Gwei.',
    timestamp: Date.now(),
  },
  {
    chain: 'ethereum',
    gasType: 'fast' as const,
    currentPrice: 22.5,
    predictions: {
      oneHour: 23.4,
      sixHours: 25.0,
      twentyFourHours: 27.7,
    },
    trend: 'increasing' as const,
    confidence: 95,
    recommendation: 'Gas prices are increasing. Consider transacting now to save ~0.9 Gwei.',
    timestamp: Date.now(),
  },
  {
    chain: 'ethereum',
    gasType: 'instant' as const,
    currentPrice: 25.0,
    predictions: {
      oneHour: 26.0,
      sixHours: 27.8,
      twentyFourHours: 30.8,
    },
    trend: 'increasing' as const,
    confidence: 95,
    recommendation: 'Gas prices are increasing. Consider transacting now to save ~1.0 Gwei.',
    timestamp: Date.now(),
  },
];

const mockCurrentPrice = {
  chain: 'ethereum',
  slow: 18.5,
  standard: 20.0,
  fast: 22.5,
  instant: 25.0,
  timestamp: new Date().toISOString(),
};

// ============================================================================
// Helper Functions
// ============================================================================

function createMockEvent(
  pathParameters: Record<string, string> = {},
  headers: Record<string, string> = {}
): APIGatewayProxyEvent {
  return {
    pathParameters,
    headers: {
      Authorization: 'Bearer valid-token',
      ...headers,
    },
    body: null,
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/v2/premium/gas/predictions/ethereum',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    multiValueHeaders: {},
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('GasPredictionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGasPredictions()', () => {
    it('should return gas predictions for valid chain', async () => {
      // Mock getUserId to return valid user
      (responseUtils.getUserId as jest.Mock).mockReturnValue('user_123');

      // Mock gasPredictionService.predictGasPrices
      (gasPredictionService.predictGasPrices as jest.Mock).mockResolvedValue(mockPredictions);

      // Mock successResponse
      (responseUtils.successResponse as jest.Mock).mockReturnValue({
        statusCode: 200,
        body: JSON.stringify({ success: true, data: mockPredictions }),
      });

      // Create mock event
      const event = createMockEvent({ chain: 'ethereum' });

      // Call handler
      const result = await getGasPredictions(event);

      // Verify getUserId was called
      expect(responseUtils.getUserId).toHaveBeenCalledWith(event);

      // Verify predictGasPrices was called with correct chain
      expect(gasPredictionService.predictGasPrices).toHaveBeenCalledWith('ethereum');

      // Verify successResponse was called with predictions
      expect(responseUtils.successResponse).toHaveBeenCalledWith(mockPredictions, 200);

      // Verify response
      expect(result.statusCode).toBe(200);
    });

    it('should return 401 for unauthorized request', async () => {
      // Mock getUserId to return null (unauthorized)
      (responseUtils.getUserId as jest.Mock).mockReturnValue(null);

      // Mock errorResponse
      (responseUtils.errorResponse as jest.Mock).mockReturnValue({
        statusCode: 401,
        body: JSON.stringify({ success: false, error: 'Unauthorized' }),
      });

      // Create mock event
      const event = createMockEvent({ chain: 'ethereum' });

      // Call handler
      const result = await getGasPredictions(event);

      // Verify errorResponse was called
      expect(responseUtils.errorResponse).toHaveBeenCalledWith('Unauthorized', 401);

      // Verify response
      expect(result.statusCode).toBe(401);

      // Verify predictGasPrices was NOT called
      expect(gasPredictionService.predictGasPrices).not.toHaveBeenCalled();
    });

    it('should return 400 for missing chain parameter', async () => {
      // Mock getUserId to return valid user
      (responseUtils.getUserId as jest.Mock).mockReturnValue('user_123');

      // Mock errorResponse
      (responseUtils.errorResponse as jest.Mock).mockReturnValue({
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Chain parameter is required' }),
      });

      // Create mock event without chain parameter
      const event = createMockEvent({});

      // Call handler
      const result = await getGasPredictions(event);

      // Verify errorResponse was called
      expect(responseUtils.errorResponse).toHaveBeenCalledWith('Chain parameter is required', 400);

      // Verify response
      expect(result.statusCode).toBe(400);

      // Verify predictGasPrices was NOT called
      expect(gasPredictionService.predictGasPrices).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid chain parameter', async () => {
      // Mock getUserId to return valid user
      (responseUtils.getUserId as jest.Mock).mockReturnValue('user_123');

      // Mock errorResponse
      (responseUtils.errorResponse as jest.Mock).mockReturnValue({
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Validation failed: ...' }),
      });

      // Create mock event with invalid chain
      const event = createMockEvent({ chain: 'invalid-chain' });

      // Call handler
      const result = await getGasPredictions(event);

      // Verify errorResponse was called with validation error
      expect(responseUtils.errorResponse).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed'),
        400
      );

      // Verify response
      expect(result.statusCode).toBe(400);

      // Verify predictGasPrices was NOT called
      expect(gasPredictionService.predictGasPrices).not.toHaveBeenCalled();
    });

    it('should return 503 for insufficient historical data', async () => {
      // Mock getUserId to return valid user
      (responseUtils.getUserId as jest.Mock).mockReturnValue('user_123');

      // Mock gasPredictionService to throw insufficient data error
      (gasPredictionService.predictGasPrices as jest.Mock).mockRejectedValue(
        new Error('Insufficient historical data')
      );

      // Mock errorResponse
      (responseUtils.errorResponse as jest.Mock).mockReturnValue({
        statusCode: 503,
        body: JSON.stringify({ success: false, error: 'Insufficient historical data...' }),
      });

      // Create mock event
      const event = createMockEvent({ chain: 'ethereum' });

      // Call handler
      const result = await getGasPredictions(event);

      // Verify errorResponse was called with 503
      expect(responseUtils.errorResponse).toHaveBeenCalledWith(
        'Insufficient historical data for predictions. Please try again later.',
        503
      );

      // Verify response
      expect(result.statusCode).toBe(503);
    });

    it('should return 500 for internal server error', async () => {
      // Mock getUserId to return valid user
      (responseUtils.getUserId as jest.Mock).mockReturnValue('user_123');

      // Mock gasPredictionService to throw generic error
      (gasPredictionService.predictGasPrices as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Mock errorResponse
      (responseUtils.errorResponse as jest.Mock).mockReturnValue({
        statusCode: 500,
        body: JSON.stringify({ success: false, error: 'Internal server error' }),
      });

      // Create mock event
      const event = createMockEvent({ chain: 'ethereum' });

      // Call handler
      const result = await getGasPredictions(event);

      // Verify errorResponse was called with 500
      expect(responseUtils.errorResponse).toHaveBeenCalledWith('Internal server error', 500);

      // Verify response
      expect(result.statusCode).toBe(500);
    });
  });

  describe('getCurrentGasPrices()', () => {
    it('should return current gas prices for valid chain', async () => {
      // Mock getUserId to return valid user
      (responseUtils.getUserId as jest.Mock).mockReturnValue('user_123');

      // Mock getHistoricalPrices (private method)
      (gasPredictionService as any).getHistoricalPrices = jest
        .fn()
        .mockResolvedValue([mockCurrentPrice]);

      // Mock successResponse
      (responseUtils.successResponse as jest.Mock).mockReturnValue({
        statusCode: 200,
        body: JSON.stringify({ success: true, data: mockCurrentPrice }),
      });

      // Create mock event
      const event = createMockEvent({ chain: 'ethereum' });

      // Call handler
      const result = await getCurrentGasPrices(event);

      // Verify getUserId was called
      expect(responseUtils.getUserId).toHaveBeenCalledWith(event);

      // Verify getHistoricalPrices was called
      expect((gasPredictionService as any).getHistoricalPrices).toHaveBeenCalledWith(
        'ethereum',
        0.01
      );

      // Verify successResponse was called with current price
      expect(responseUtils.successResponse).toHaveBeenCalledWith(mockCurrentPrice, 200);

      // Verify response
      expect(result.statusCode).toBe(200);
    });

    it('should return 503 for no current data available', async () => {
      // Mock getUserId to return valid user
      (responseUtils.getUserId as jest.Mock).mockReturnValue('user_123');

      // Mock getHistoricalPrices to return empty array
      (gasPredictionService as any).getHistoricalPrices = jest.fn().mockResolvedValue([]);

      // Mock errorResponse
      (responseUtils.errorResponse as jest.Mock).mockReturnValue({
        statusCode: 503,
        body: JSON.stringify({ success: false, error: 'No current gas price data available...' }),
      });

      // Create mock event
      const event = createMockEvent({ chain: 'ethereum' });

      // Call handler
      const result = await getCurrentGasPrices(event);

      // Verify errorResponse was called with 503
      expect(responseUtils.errorResponse).toHaveBeenCalledWith(
        'No current gas price data available. Please try again later.',
        503
      );

      // Verify response
      expect(result.statusCode).toBe(503);
    });
  });
});

