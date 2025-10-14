/**
 * Unit Tests for Event Generator
 */

import {
  generateEvent,
  generatePriceUpdateEvent,
  generateTvlChangeEvent,
  batchGenerateEvents,
  validateEvent,
  filterValidEvents,
  calculateConfidence,
  generateTags,
} from '../event-generator';
import {
  DetectedChange,
  EventType,
} from '../event-types';

describe('Event Generator', () => {
  const mockTvlChange: DetectedChange = {
    type: 'tvl',
    pk: 'hourlyTvl#uniswap-v3',
    protocolId: 'uniswap-v3',
    protocolName: 'Uniswap V3',
    oldValue: 1000000000,
    newValue: 1100000000,
    changePercent: 10,
    changeAbsolute: 100000000,
    timestamp: 1234567890,
    rawData: {},
  };

  const mockPriceChange: DetectedChange = {
    type: 'price',
    pk: 'coingecko#ethereum',
    tokenId: 'ethereum',
    symbol: 'ETH',
    chain: 'ethereum',
    oldValue: 2500,
    newValue: 2750,
    changePercent: 10,
    changeAbsolute: 250,
    timestamp: 1234567890,
    decimals: 18,
    rawData: {},
  };

  describe('generatePriceUpdateEvent', () => {
    it('should generate valid price update event', () => {
      const event = generatePriceUpdateEvent(mockPriceChange, Date.now());

      expect(event.eventType).toBe(EventType.PRICE_UPDATE);
      expect(event.data.tokenId).toBe('ethereum');
      expect(event.data.symbol).toBe('ETH');
      expect(event.data.previousPrice).toBe(2500);
      expect(event.data.currentPrice).toBe(2750);
      expect(event.data.changePercent).toBe(10);
      expect(event.metadata.confidence).toBeGreaterThan(0);
      expect(event.metadata.tags).toContain('price');
    });
  });

  describe('generateTvlChangeEvent', () => {
    it('should generate valid TVL change event', () => {
      const event = generateTvlChangeEvent(mockTvlChange, Date.now());

      expect(event.eventType).toBe(EventType.TVL_CHANGE);
      expect(event.data.protocolId).toBe('uniswap-v3');
      expect(event.data.protocolName).toBe('Uniswap V3');
      expect(event.data.previousTvl).toBe(1000000000);
      expect(event.data.currentTvl).toBe(1100000000);
      expect(event.data.changePercent).toBe(10);
      expect(event.metadata.confidence).toBeGreaterThan(0);
      expect(event.metadata.tags).toContain('tvl');
    });
  });

  describe('generateEvent', () => {
    it('should generate price event for price change', () => {
      const event = generateEvent(mockPriceChange);
      expect(event.eventType).toBe(EventType.PRICE_UPDATE);
    });

    it('should generate TVL event for TVL change', () => {
      const event = generateEvent(mockTvlChange);
      expect(event.eventType).toBe(EventType.TVL_CHANGE);
    });
  });

  describe('batchGenerateEvents', () => {
    it('should generate multiple events', () => {
      const changes = [mockTvlChange, mockPriceChange];
      const events = batchGenerateEvents(changes);

      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe(EventType.TVL_CHANGE);
      expect(events[1].eventType).toBe(EventType.PRICE_UPDATE);
    });
  });

  describe('validateEvent', () => {
    it('should validate valid price event', () => {
      const event = generatePriceUpdateEvent(mockPriceChange, Date.now());
      expect(validateEvent(event)).toBe(true);
    });

    it('should validate valid TVL event', () => {
      const event = generateTvlChangeEvent(mockTvlChange, Date.now());
      expect(validateEvent(event)).toBe(true);
    });

    it('should reject event without eventId', () => {
      const event: any = {
        eventType: EventType.PRICE_UPDATE,
        timestamp: Date.now(),
        metadata: { correlationId: 'test' },
        data: {},
      };
      expect(validateEvent(event)).toBe(false);
    });

    it('should reject price event without tokenId', () => {
      const event = generatePriceUpdateEvent(mockPriceChange, Date.now());
      event.data.tokenId = '';
      expect(validateEvent(event)).toBe(false);
    });
  });

  describe('filterValidEvents', () => {
    it('should filter valid and invalid events', () => {
      const validEvent = generatePriceUpdateEvent(mockPriceChange, Date.now());
      const invalidEvent: any = {
        eventType: EventType.PRICE_UPDATE,
        timestamp: Date.now(),
        data: {},
      };

      const { valid, invalid } = filterValidEvents([validEvent, invalidEvent]);

      expect(valid).toHaveLength(1);
      expect(invalid).toHaveLength(1);
    });
  });

  describe('calculateConfidence', () => {
    it('should return high confidence for normal changes', () => {
      const confidence = calculateConfidence(mockTvlChange);
      expect(confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should reduce confidence for extreme changes', () => {
      const extremeChange: DetectedChange = {
        ...mockTvlChange,
        changePercent: 150,
      };
      const confidence = calculateConfidence(extremeChange);
      expect(confidence).toBeLessThan(0.8);
    });

    it('should reduce confidence for missing data', () => {
      const incompleteChange: DetectedChange = {
        ...mockTvlChange,
        protocolName: undefined,
      };
      const confidence = calculateConfidence(incompleteChange);
      expect(confidence).toBeLessThan(0.9);
    });
  });

  describe('generateTags', () => {
    it('should generate basic tags', () => {
      const tags = generateTags(mockTvlChange);
      expect(tags).toContain('tvl');
      expect(tags).toContain('uniswap-v3');
    });

    it('should add large-change tag', () => {
      const largeChange: DetectedChange = {
        ...mockTvlChange,
        changePercent: 15,
      };
      const tags = generateTags(largeChange);
      expect(tags).toContain('large-change');
    });

    it('should add extreme-change tag', () => {
      const extremeChange: DetectedChange = {
        ...mockTvlChange,
        changePercent: 60,
      };
      const tags = generateTags(extremeChange);
      expect(tags).toContain('extreme-change');
    });

    it('should include chain tag', () => {
      const tags = generateTags(mockPriceChange);
      expect(tags).toContain('ethereum');
    });
  });
});

