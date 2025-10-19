import Redis from 'ioredis';
import { logger } from '../../common/utils/logger';
import { GasPriceData } from './gas-price-monitor.service';

/**
 * Gas price prediction for a specific gas type
 */
export interface GasPrediction {
  chain: string;
  gasType: 'slow' | 'standard' | 'fast' | 'instant';
  currentPrice: number;
  predictions: {
    oneHour: number;
    sixHours: number;
    twentyFourHours: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number; // 0-100 (based on R²)
  recommendation: string;
  timestamp: number;
}

/**
 * Linear regression calculation result
 */
interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

/**
 * Prediction configuration
 */
interface PredictionConfig {
  minDataPoints: number;
  maxDataPoints: number;
  cacheTTL: number; // seconds
  stableTrendThreshold: number; // Gwei per hour
}

/**
 * Service for predicting gas prices using linear regression
 */
export class GasPredictionService {
  private redis: Redis;
  private config: PredictionConfig = {
    minDataPoints: 10, // Minimum 100 seconds of data
    maxDataPoints: 360, // Maximum 1 hour of data (360 * 10s)
    cacheTTL: 300, // 5 minutes
    stableTrendThreshold: 0.5, // < 0.5 Gwei/hour = stable
  };

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
    });
  }

  /**
   * Get gas price predictions for all gas types
   * 
   * @param chain - Chain name (ethereum, bsc, polygon, etc.)
   * @returns Array of predictions for each gas type
   */
  async predictGasPrices(chain: string): Promise<GasPrediction[]> {
    try {
      // Check cache first
      const cacheKey = `gas:${chain}:predictions`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        logger.debug('Returning cached gas predictions', {
          service: 'premium-alerts',
          chain,
        });
        return JSON.parse(cached);
      }

      // Generate predictions for all gas types
      const gasTypes: Array<'slow' | 'standard' | 'fast' | 'instant'> = [
        'slow',
        'standard',
        'fast',
        'instant',
      ];

      const predictions = await Promise.all(
        gasTypes.map((gasType) => this.predictForGasType(chain, gasType))
      );

      // Cache predictions
      await this.redis.setex(
        cacheKey,
        this.config.cacheTTL,
        JSON.stringify(predictions)
      );

      logger.info('Generated gas price predictions', {
        service: 'premium-alerts',
        chain,
        gasTypes: gasTypes.length,
      });

      return predictions;
    } catch (error) {
      logger.error(
        'Error predicting gas prices',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          service: 'premium-alerts',
          chain,
        }
      );
      throw error;
    }
  }

  /**
   * Predict gas prices for a specific gas type
   * 
   * @param chain - Chain name
   * @param gasType - Gas type (slow, standard, fast, instant)
   * @returns Prediction for the gas type
   */
  async predictForGasType(
    chain: string,
    gasType: 'slow' | 'standard' | 'fast' | 'instant'
  ): Promise<GasPrediction> {
    try {
      // Get historical prices (last 1 hour)
      const historicalData = await this.getHistoricalPrices(chain, 1);

      if (historicalData.length < this.config.minDataPoints) {
        throw new Error(
          `Insufficient data for prediction. Need at least ${this.config.minDataPoints} data points, got ${historicalData.length}`
        );
      }

      // Extract time series for this gas type
      const dataPoints: [number, number][] = historicalData.map((data, index) => [
        index, // Normalized time (0, 1, 2, ...)
        data[gasType],
      ]);

      // Calculate linear regression
      const regression = this.calculateLinearRegression(dataPoints);

      // Current price (most recent data point)
      const currentPrice = historicalData[historicalData.length - 1][gasType];

      // Predict future prices
      const n = dataPoints.length;
      const oneHourSteps = 360; // 1 hour = 360 * 10s
      const sixHoursSteps = 2160; // 6 hours = 2160 * 10s
      const twentyFourHoursSteps = 8640; // 24 hours = 8640 * 10s

      const predictions = {
        oneHour: Math.max(
          0,
          regression.slope * (n + oneHourSteps) + regression.intercept
        ),
        sixHours: Math.max(
          0,
          regression.slope * (n + sixHoursSteps) + regression.intercept
        ),
        twentyFourHours: Math.max(
          0,
          regression.slope * (n + twentyFourHoursSteps) + regression.intercept
        ),
      };

      // Determine trend
      const hourlySlope = regression.slope * 360; // Gwei per hour
      let trend: 'increasing' | 'decreasing' | 'stable';
      
      if (Math.abs(hourlySlope) < this.config.stableTrendThreshold) {
        trend = 'stable';
      } else if (hourlySlope > 0) {
        trend = 'increasing';
      } else {
        trend = 'decreasing';
      }

      // Confidence score (R² * 100)
      const confidence = Math.round(regression.rSquared * 100);

      // Generate recommendation
      const recommendation = this.generateRecommendation(
        trend,
        currentPrice,
        predictions
      );

      logger.debug('Generated prediction for gas type', {
        service: 'premium-alerts',
        chain,
        gasType,
        currentPrice,
        trend,
        confidence,
      });

      return {
        chain,
        gasType,
        currentPrice,
        predictions,
        trend,
        confidence,
        recommendation,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(
        'Error predicting for gas type',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          service: 'premium-alerts',
          chain,
          gasType,
        }
      );
      throw error;
    }
  }

  /**
   * Calculate linear regression for time series data
   * 
   * Formula:
   * - slope (m) = (n * Σ(xy) - Σx * Σy) / (n * Σ(x²) - (Σx)²)
   * - intercept (b) = (Σy - m * Σx) / n
   * - R² = 1 - (SS_res / SS_tot)
   * 
   * @param dataPoints - Array of [x, y] pairs
   * @returns Linear regression result
   */
  private calculateLinearRegression(
    dataPoints: [number, number][]
  ): LinearRegressionResult {
    const n = dataPoints.length;

    if (n < 2) {
      throw new Error('Need at least 2 data points for linear regression');
    }

    // Calculate sums
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (const [x, y] of dataPoints) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    // Calculate slope and intercept
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R² (coefficient of determination)
    const meanY = sumY / n;
    let ssRes = 0; // Sum of squares of residuals
    let ssTot = 0; // Total sum of squares

    for (const [x, y] of dataPoints) {
      const predicted = slope * x + intercept;
      ssRes += (y - predicted) ** 2;
      ssTot += (y - meanY) ** 2;
    }

    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

    return {
      slope,
      intercept,
      rSquared: Math.max(0, Math.min(1, rSquared)), // Clamp to [0, 1]
    };
  }

  /**
   * Get historical gas prices from Redis
   * 
   * @param chain - Chain name
   * @param hours - Number of hours of history to retrieve
   * @returns Array of gas price data sorted by timestamp
   */
  private async getHistoricalPrices(
    chain: string,
    hours: number
  ): Promise<GasPriceData[]> {
    const key = `gas:${chain}:history`;
    const now = Date.now();
    const startTime = now - hours * 60 * 60 * 1000;

    // Get data from Redis sorted set
    const data = await this.redis.zrangebyscore(
      key,
      startTime,
      now,
      'LIMIT',
      0,
      this.config.maxDataPoints
    );

    // Parse and return
    return data.map((item) => JSON.parse(item) as GasPriceData);
  }

  /**
   * Generate human-readable recommendation
   * 
   * @param trend - Price trend (increasing, decreasing, stable)
   * @param currentPrice - Current gas price
   * @param predictions - Predicted prices
   * @returns Recommendation string
   */
  private generateRecommendation(
    trend: 'increasing' | 'decreasing' | 'stable',
    currentPrice: number,
    predictions: { oneHour: number; sixHours: number; twentyFourHours: number }
  ): string {
    if (trend === 'increasing') {
      const increase1h = predictions.oneHour - currentPrice;
      return `Gas prices are increasing. Consider transacting now to save ~${increase1h.toFixed(1)} Gwei. Prices expected to rise to ${predictions.oneHour.toFixed(1)} Gwei in 1 hour.`;
    }

    if (trend === 'decreasing') {
      const decrease1h = currentPrice - predictions.oneHour;
      return `Gas prices are decreasing. Consider waiting to save ~${decrease1h.toFixed(1)} Gwei. Prices expected to drop to ${predictions.oneHour.toFixed(1)} Gwei in 1 hour.`;
    }

    // Stable
    return `Gas prices are stable around ${currentPrice.toFixed(1)} Gwei. You can transact at any time without significant price changes.`;
  }
}

// Export singleton instance
export const gasPredictionService = new GasPredictionService();

