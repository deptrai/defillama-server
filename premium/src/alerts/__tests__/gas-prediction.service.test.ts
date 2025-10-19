import { gasPredictionService, GasPrediction } from '../services/gas-prediction.service';
import { GasPriceData } from '../services/gas-price-monitor.service';

// Mock database connection
jest.mock('../../common/utils/db', () => ({
  getAlertsDBConnection: jest.fn(() => jest.fn()),
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    zrangebyscore: jest.fn(),
  }));
});

describe('GasPredictionService', () => {
  let mockRedis: any;

  beforeEach(() => {
    // Get Redis mock instance
    mockRedis = (gasPredictionService as any).redis;
    jest.clearAllMocks();
  });

  describe('calculateLinearRegression()', () => {
    it('should calculate correct slope and intercept for upward trend', () => {
      // Data: y = 2x + 10 (perfect linear)
      const dataPoints: [number, number][] = [
        [0, 10],
        [1, 12],
        [2, 14],
        [3, 16],
        [4, 18],
        [5, 20],
      ];

      const result = (gasPredictionService as any).calculateLinearRegression(dataPoints);

      expect(result.slope).toBeCloseTo(2, 5);
      expect(result.intercept).toBeCloseTo(10, 5);
      expect(result.rSquared).toBeCloseTo(1, 5); // Perfect fit
    });

    it('should calculate correct slope and intercept for downward trend', () => {
      // Data: y = -2x + 20 (perfect linear)
      const dataPoints: [number, number][] = [
        [0, 20],
        [1, 18],
        [2, 16],
        [3, 14],
        [4, 12],
        [5, 10],
      ];

      const result = (gasPredictionService as any).calculateLinearRegression(dataPoints);

      expect(result.slope).toBeCloseTo(-2, 5);
      expect(result.intercept).toBeCloseTo(20, 5);
      expect(result.rSquared).toBeCloseTo(1, 5);
    });

    it('should calculate R² = 0 for flat trend', () => {
      // Data: y = 15 (all same values)
      const dataPoints: [number, number][] = [
        [0, 15],
        [1, 15],
        [2, 15],
        [3, 15],
        [4, 15],
        [5, 15],
      ];

      const result = (gasPredictionService as any).calculateLinearRegression(dataPoints);

      expect(result.slope).toBeCloseTo(0, 5);
      expect(result.intercept).toBeCloseTo(15, 5);
      expect(result.rSquared).toBe(0); // No variance
    });

    it('should throw error with insufficient data points', () => {
      const dataPoints: [number, number][] = [[0, 10]];

      expect(() => {
        (gasPredictionService as any).calculateLinearRegression(dataPoints);
      }).toThrow('Need at least 2 data points for linear regression');
    });

    it('should handle noisy data with lower R²', () => {
      // Data with noise
      const dataPoints: [number, number][] = [
        [0, 10],
        [1, 13], // Should be 12
        [2, 14],
        [3, 17], // Should be 16
        [4, 18],
        [5, 21], // Should be 20
      ];

      const result = (gasPredictionService as any).calculateLinearRegression(dataPoints);

      expect(result.slope).toBeCloseTo(2, 0); // Lower precision for noisy data
      expect(result.intercept).toBeCloseTo(10, 0);
      expect(result.rSquared).toBeLessThan(1); // Not perfect fit
      expect(result.rSquared).toBeGreaterThan(0.9); // But still good
    });
  });

  describe('predictForGasType()', () => {
    it('should predict increasing trend correctly', async () => {
      // Mock historical data: upward trend
      const mockHistoricalData: GasPriceData[] = [];
      for (let i = 0; i < 100; i++) {
        mockHistoricalData.push({
          chain: 'ethereum',
          slow: 10 + i * 0.1,
          standard: 15 + i * 0.1,
          fast: 20 + i * 0.1,
          instant: 25 + i * 0.1,
          timestamp: new Date(Date.now() - (100 - i) * 10000).toISOString(),
        });
      }

      mockRedis.zrangebyscore.mockResolvedValue(
        mockHistoricalData.map((d) => JSON.stringify(d))
      );

      const prediction = await gasPredictionService.predictForGasType('ethereum', 'standard');

      expect(prediction.chain).toBe('ethereum');
      expect(prediction.gasType).toBe('standard');
      expect(prediction.trend).toBe('increasing');
      expect(prediction.predictions.oneHour).toBeGreaterThan(prediction.currentPrice);
      expect(prediction.predictions.sixHours).toBeGreaterThan(prediction.predictions.oneHour);
      expect(prediction.recommendation).toContain('increasing');
      expect(prediction.recommendation).toContain('transacting now');
    });

    it('should predict decreasing trend correctly', async () => {
      // Mock historical data: downward trend
      const mockHistoricalData: GasPriceData[] = [];
      for (let i = 0; i < 100; i++) {
        mockHistoricalData.push({
          chain: 'ethereum',
          slow: 20 - i * 0.1,
          standard: 25 - i * 0.1,
          fast: 30 - i * 0.1,
          instant: 35 - i * 0.1,
          timestamp: new Date(Date.now() - (100 - i) * 10000).toISOString(),
        });
      }

      mockRedis.zrangebyscore.mockResolvedValue(
        mockHistoricalData.map((d) => JSON.stringify(d))
      );

      const prediction = await gasPredictionService.predictForGasType('ethereum', 'standard');

      expect(prediction.trend).toBe('decreasing');
      expect(prediction.predictions.oneHour).toBeLessThan(prediction.currentPrice);
      // sixHours can be 0 (clamped) if trend is steep downward
      expect(prediction.predictions.sixHours).toBeLessThanOrEqual(prediction.predictions.oneHour);
      expect(prediction.recommendation).toContain('decreasing');
      expect(prediction.recommendation).toContain('waiting');
    });

    it('should predict stable trend correctly', async () => {
      // Mock historical data: stable
      const mockHistoricalData: GasPriceData[] = [];
      for (let i = 0; i < 100; i++) {
        mockHistoricalData.push({
          chain: 'ethereum',
          slow: 15 + (Math.random() - 0.5) * 0.1, // Small random noise
          standard: 20 + (Math.random() - 0.5) * 0.1,
          fast: 25 + (Math.random() - 0.5) * 0.1,
          instant: 30 + (Math.random() - 0.5) * 0.1,
          timestamp: new Date(Date.now() - (100 - i) * 10000).toISOString(),
        });
      }

      mockRedis.zrangebyscore.mockResolvedValue(
        mockHistoricalData.map((d) => JSON.stringify(d))
      );

      const prediction = await gasPredictionService.predictForGasType('ethereum', 'standard');

      expect(prediction.trend).toBe('stable');
      expect(prediction.recommendation).toContain('stable');
      expect(prediction.recommendation).toContain('any time');
    });

    it('should throw error with insufficient data', async () => {
      // Mock insufficient data (< 10 points)
      const mockHistoricalData: GasPriceData[] = [];
      for (let i = 0; i < 5; i++) {
        mockHistoricalData.push({
          chain: 'ethereum',
          slow: 15,
          standard: 20,
          fast: 25,
          instant: 30,
          timestamp: new Date(Date.now() - (5 - i) * 10000).toISOString(),
        });
      }

      mockRedis.zrangebyscore.mockResolvedValue(
        mockHistoricalData.map((d) => JSON.stringify(d))
      );

      await expect(
        gasPredictionService.predictForGasType('ethereum', 'standard')
      ).rejects.toThrow('Insufficient data for prediction');
    });

    it('should clamp negative predictions to 0', async () => {
      // Mock historical data: steep downward trend
      const mockHistoricalData: GasPriceData[] = [];
      for (let i = 0; i < 100; i++) {
        mockHistoricalData.push({
          chain: 'ethereum',
          slow: 50 - i * 0.5,
          standard: 60 - i * 0.5,
          fast: 70 - i * 0.5,
          instant: 80 - i * 0.5,
          timestamp: new Date(Date.now() - (100 - i) * 10000).toISOString(),
        });
      }

      mockRedis.zrangebyscore.mockResolvedValue(
        mockHistoricalData.map((d) => JSON.stringify(d))
      );

      const prediction = await gasPredictionService.predictForGasType('ethereum', 'standard');

      // All predictions should be >= 0
      expect(prediction.predictions.oneHour).toBeGreaterThanOrEqual(0);
      expect(prediction.predictions.sixHours).toBeGreaterThanOrEqual(0);
      expect(prediction.predictions.twentyFourHours).toBeGreaterThanOrEqual(0);
    });

    it('should calculate confidence score correctly', async () => {
      // Mock perfect linear data (R² = 1)
      const mockHistoricalData: GasPriceData[] = [];
      for (let i = 0; i < 100; i++) {
        mockHistoricalData.push({
          chain: 'ethereum',
          slow: 10 + i * 0.1,
          standard: 15 + i * 0.1,
          fast: 20 + i * 0.1,
          instant: 25 + i * 0.1,
          timestamp: new Date(Date.now() - (100 - i) * 10000).toISOString(),
        });
      }

      mockRedis.zrangebyscore.mockResolvedValue(
        mockHistoricalData.map((d) => JSON.stringify(d))
      );

      const prediction = await gasPredictionService.predictForGasType('ethereum', 'standard');

      expect(prediction.confidence).toBeGreaterThan(95); // Should be close to 100
    });
  });

  describe('generateRecommendation()', () => {
    it('should recommend transacting now for increasing trend', () => {
      const recommendation = (gasPredictionService as any).generateRecommendation(
        'increasing',
        20,
        { oneHour: 25, sixHours: 30, twentyFourHours: 40 }
      );

      expect(recommendation).toContain('increasing');
      expect(recommendation).toContain('transacting now');
      expect(recommendation).toContain('save');
    });

    it('should recommend waiting for decreasing trend', () => {
      const recommendation = (gasPredictionService as any).generateRecommendation(
        'decreasing',
        20,
        { oneHour: 15, sixHours: 12, twentyFourHours: 10 }
      );

      expect(recommendation).toContain('decreasing');
      expect(recommendation).toContain('waiting');
      expect(recommendation).toContain('save');
    });

    it('should recommend any time for stable trend', () => {
      const recommendation = (gasPredictionService as any).generateRecommendation(
        'stable',
        20,
        { oneHour: 20, sixHours: 20, twentyFourHours: 20 }
      );

      expect(recommendation).toContain('stable');
      expect(recommendation).toContain('any time');
    });
  });

  describe('predictGasPrices()', () => {
    it('should return cached predictions if available', async () => {
      const mockPredictions: GasPrediction[] = [
        {
          chain: 'ethereum',
          gasType: 'standard',
          currentPrice: 20,
          predictions: { oneHour: 22, sixHours: 25, twentyFourHours: 30 },
          trend: 'increasing',
          confidence: 85,
          recommendation: 'Test recommendation',
          timestamp: Date.now(),
        },
      ];

      mockRedis.get.mockResolvedValue(JSON.stringify(mockPredictions));

      const result = await gasPredictionService.predictGasPrices('ethereum');

      expect(result).toEqual(mockPredictions);
      expect(mockRedis.get).toHaveBeenCalledWith('gas:ethereum:predictions');
      expect(mockRedis.zrangebyscore).not.toHaveBeenCalled(); // Should not fetch historical data
    });

    it('should generate and cache predictions if not cached', async () => {
      mockRedis.get.mockResolvedValue(null);

      // Mock historical data
      const mockHistoricalData: GasPriceData[] = [];
      for (let i = 0; i < 100; i++) {
        mockHistoricalData.push({
          chain: 'ethereum',
          slow: 10 + i * 0.1,
          standard: 15 + i * 0.1,
          fast: 20 + i * 0.1,
          instant: 25 + i * 0.1,
          timestamp: new Date(Date.now() - (100 - i) * 10000).toISOString(),
        });
      }

      mockRedis.zrangebyscore.mockResolvedValue(
        mockHistoricalData.map((d) => JSON.stringify(d))
      );

      const result = await gasPredictionService.predictGasPrices('ethereum');

      expect(result).toHaveLength(4); // slow, standard, fast, instant
      expect(result[0].gasType).toBe('slow');
      expect(result[1].gasType).toBe('standard');
      expect(result[2].gasType).toBe('fast');
      expect(result[3].gasType).toBe('instant');
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'gas:ethereum:predictions',
        300, // 5 minutes TTL
        expect.any(String)
      );
    });
  });

  describe('getHistoricalPrices()', () => {
    it('should retrieve and parse historical data from Redis', async () => {
      const mockData: GasPriceData[] = [
        { chain: 'ethereum', slow: 10, standard: 15, fast: 20, instant: 25, timestamp: new Date(1000).toISOString() },
        { chain: 'ethereum', slow: 11, standard: 16, fast: 21, instant: 26, timestamp: new Date(2000).toISOString() },
      ];

      mockRedis.zrangebyscore.mockResolvedValue(mockData.map((d) => JSON.stringify(d)));

      const result = await (gasPredictionService as any).getHistoricalPrices('ethereum', 1);

      expect(result).toEqual(mockData);
      expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
        'gas:ethereum:history',
        expect.any(Number),
        expect.any(Number),
        'LIMIT',
        0,
        360
      );
    });

    it('should return empty array if no data', async () => {
      mockRedis.zrangebyscore.mockResolvedValue([]);

      const result = await (gasPredictionService as any).getHistoricalPrices('ethereum', 1);

      expect(result).toEqual([]);
    });
  });
});

