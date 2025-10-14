/**
 * Condition Evaluator Tests
 */

import * as dotenv from 'dotenv';
dotenv.config();

import {
  evaluateCondition,
  evaluateSimpleCondition,
  evaluateComplexCondition,
  extractMetricValue,
  evaluateOperator,
} from '../condition-evaluator';
import {
  SimpleCondition,
  ComplexCondition,
} from '../../types';
import {
  PriceUpdateEvent,
  TvlChangeEvent,
  EventType,
  EventSource,
} from '../../../events/event-types';

describe('Condition Evaluator', () => {
  // Mock events
  const mockPriceEvent: PriceUpdateEvent = {
    eventId: 'test-event-1',
    eventType: EventType.PRICE_UPDATE,
    timestamp: Date.now(),
    source: EventSource.DYNAMODB_STREAM,
    version: '1.0',
    metadata: {
      correlationId: 'test-correlation-1',
      confidence: 1.0,
      processingTime: 100,
      retryCount: 0,
      tags: [],
    },
    data: {
      tokenId: 'ethereum:0x...',
      symbol: 'ETH',
      chain: 'ethereum',
      previousPrice: 2000,
      currentPrice: 2500,
      changePercent: 25,
      changeAbsolute: 500,
      volume24h: 15000000000,
      marketCap: 300000000000,
      decimals: 18,
    },
  };

  const mockTvlEvent: TvlChangeEvent = {
    eventId: 'test-event-2',
    eventType: EventType.TVL_CHANGE,
    timestamp: Date.now(),
    source: EventSource.DYNAMODB_STREAM,
    version: '1.0',
    metadata: {
      correlationId: 'test-correlation-2',
      confidence: 1.0,
      processingTime: 100,
      retryCount: 0,
      tags: [],
    },
    data: {
      protocolId: 'uniswap-v3',
      protocolName: 'Uniswap V3',
      previousTvl: 1000000000,
      currentTvl: 1500000000,
      changePercent: 50,
      changeAbsolute: 500000000,
    },
  };

  describe('extractMetricValue', () => {
    it('should extract price from price event', () => {
      const value = extractMetricValue(mockPriceEvent, 'price');
      expect(value).toBe(2500);
    });

    it('should extract price_change_24h from price event', () => {
      const value = extractMetricValue(mockPriceEvent, 'price_change_24h');
      expect(value).toBe(25);
    });

    it('should extract volume_24h from price event', () => {
      const value = extractMetricValue(mockPriceEvent, 'volume_24h');
      expect(value).toBe(15000000000);
    });

    it('should extract tvl from tvl event', () => {
      const value = extractMetricValue(mockTvlEvent, 'tvl');
      expect(value).toBe(1500000000);
    });

    it('should return null for unavailable metric', () => {
      const value = extractMetricValue(mockPriceEvent, 'tvl');
      expect(value).toBeNull();
    });
  });

  describe('evaluateOperator', () => {
    it('should evaluate > operator', () => {
      expect(evaluateOperator(100, '>', 50)).toBe(true);
      expect(evaluateOperator(50, '>', 100)).toBe(false);
    });

    it('should evaluate < operator', () => {
      expect(evaluateOperator(50, '<', 100)).toBe(true);
      expect(evaluateOperator(100, '<', 50)).toBe(false);
    });

    it('should evaluate >= operator', () => {
      expect(evaluateOperator(100, '>=', 100)).toBe(true);
      expect(evaluateOperator(100, '>=', 50)).toBe(true);
      expect(evaluateOperator(50, '>=', 100)).toBe(false);
    });

    it('should evaluate <= operator', () => {
      expect(evaluateOperator(100, '<=', 100)).toBe(true);
      expect(evaluateOperator(50, '<=', 100)).toBe(true);
      expect(evaluateOperator(100, '<=', 50)).toBe(false);
    });

    it('should evaluate == operator', () => {
      expect(evaluateOperator(100, '==', 100)).toBe(true);
      expect(evaluateOperator(100, '==', 50)).toBe(false);
    });

    it('should evaluate != operator', () => {
      expect(evaluateOperator(100, '!=', 50)).toBe(true);
      expect(evaluateOperator(100, '!=', 100)).toBe(false);
    });
  });

  describe('evaluateSimpleCondition', () => {
    it('should evaluate price > threshold', () => {
      const condition: SimpleCondition = {
        operator: '>',
        threshold: 2000,
        metric: 'price',
      };
      const result = evaluateSimpleCondition(condition, mockPriceEvent);
      expect(result.result).toBe(true);
      expect(result.value).toBe(2500);
    });

    it('should evaluate price_change_24h > threshold', () => {
      const condition: SimpleCondition = {
        operator: '>',
        threshold: 10,
        metric: 'price_change_24h',
        unit: 'percent',
      };
      const result = evaluateSimpleCondition(condition, mockPriceEvent);
      expect(result.result).toBe(true);
      expect(result.value).toBe(25);
    });

    it('should evaluate tvl > threshold', () => {
      const condition: SimpleCondition = {
        operator: '>',
        threshold: 1000000000,
        metric: 'tvl',
      };
      const result = evaluateSimpleCondition(condition, mockTvlEvent);
      expect(result.result).toBe(true);
      expect(result.value).toBe(1500000000);
    });

    it('should return false for unavailable metric', () => {
      const condition: SimpleCondition = {
        operator: '>',
        threshold: 1000,
        metric: 'tvl',
      };
      const result = evaluateSimpleCondition(condition, mockPriceEvent);
      expect(result.result).toBe(false);
      expect(result.value).toBeNull();
    });
  });

  describe('evaluateComplexCondition', () => {
    it('should evaluate AND condition (all true)', () => {
      const condition: ComplexCondition = {
        type: 'and',
        conditions: [
          { operator: '>', threshold: 2000, metric: 'price' },
          { operator: '>', threshold: 10, metric: 'price_change_24h', unit: 'percent' },
        ],
      };
      const result = evaluateComplexCondition(condition, mockPriceEvent);
      expect(result.result).toBe(true);
    });

    it('should evaluate AND condition (one false)', () => {
      const condition: ComplexCondition = {
        type: 'and',
        conditions: [
          { operator: '>', threshold: 3000, metric: 'price' },  // False
          { operator: '>', threshold: 10, metric: 'price_change_24h', unit: 'percent' },  // True
        ],
      };
      const result = evaluateComplexCondition(condition, mockPriceEvent);
      expect(result.result).toBe(false);
    });

    it('should evaluate OR condition (one true)', () => {
      const condition: ComplexCondition = {
        type: 'or',
        conditions: [
          { operator: '>', threshold: 3000, metric: 'price' },  // False
          { operator: '>', threshold: 10, metric: 'price_change_24h', unit: 'percent' },  // True
        ],
      };
      const result = evaluateComplexCondition(condition, mockPriceEvent);
      expect(result.result).toBe(true);
    });

    it('should evaluate nested complex condition', () => {
      const condition: ComplexCondition = {
        type: 'and',
        conditions: [
          { operator: '>', threshold: 2000, metric: 'price' },
          {
            type: 'or',
            conditions: [
              { operator: '>', threshold: 50, metric: 'price_change_24h', unit: 'percent' },  // False
              { operator: '>', threshold: 10000000000, metric: 'volume_24h' },  // True
            ],
          },
        ],
      };
      const result = evaluateComplexCondition(condition, mockPriceEvent);
      expect(result.result).toBe(true);
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate simple condition', () => {
      const condition: SimpleCondition = {
        operator: '>',
        threshold: 2000,
        metric: 'price',
      };
      const result = evaluateCondition(condition, mockPriceEvent);
      expect(result.result).toBe(true);
      expect(result.triggeredValue).toBe(2500);
      expect(result.thresholdValue).toBe(2000);
    });

    it('should evaluate complex condition', () => {
      const condition: ComplexCondition = {
        type: 'and',
        conditions: [
          { operator: '>', threshold: 2000, metric: 'price' },
          { operator: '>', threshold: 10, metric: 'price_change_24h', unit: 'percent' },
        ],
      };
      const result = evaluateCondition(condition, mockPriceEvent);
      expect(result.result).toBe(true);
    });
  });
});

