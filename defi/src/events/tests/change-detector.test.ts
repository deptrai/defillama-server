/**
 * Unit Tests for Change Detector
 */

import {
  detectChangeType,
  extractProtocolId,
  extractTokenId,
  calculateChangePercent,
  calculateChangeAbsolute,
  meetsThreshold,
  detectChanges,
  groupRecordsByPK,
  validateRecord,
  batchDetectChanges,
  getChangeSummary,
} from '../change-detector';
import {
  DynamoDBEventRecord,
  DEFAULT_THRESHOLD_CONFIG,
} from '../event-types';

describe('Change Detector', () => {
  describe('detectChangeType', () => {
    it('should detect TVL change type', () => {
      expect(detectChangeType('hourlyTvl#uniswap-v3')).toBe('tvl');
      expect(detectChangeType('dailyTvl#aave')).toBe('tvl');
    });

    it('should detect price change type', () => {
      expect(detectChangeType('coingecko#ethereum')).toBe('price');
      expect(detectChangeType('asset#ethereum:0x123')).toBe('price');
    });

    it('should default to protocol type', () => {
      expect(detectChangeType('protocol#something')).toBe('protocol');
    });
  });

  describe('extractProtocolId', () => {
    it('should extract protocol ID from hourly TVL PK', () => {
      expect(extractProtocolId('hourlyTvl#uniswap-v3')).toBe('uniswap-v3');
    });

    it('should extract protocol ID from daily TVL PK', () => {
      expect(extractProtocolId('dailyTvl#aave')).toBe('aave');
    });

    it('should return undefined for non-TVL PK', () => {
      expect(extractProtocolId('coingecko#ethereum')).toBeUndefined();
    });
  });

  describe('extractTokenId', () => {
    it('should extract token ID from coingecko PK', () => {
      expect(extractTokenId('coingecko#ethereum')).toBe('ethereum');
    });

    it('should extract token ID from asset PK', () => {
      expect(extractTokenId('asset#ethereum:0x123')).toBe('ethereum:0x123');
    });

    it('should return undefined for non-price PK', () => {
      expect(extractTokenId('hourlyTvl#uniswap-v3')).toBeUndefined();
    });
  });

  describe('calculateChangePercent', () => {
    it('should calculate positive change', () => {
      expect(calculateChangePercent(100, 110)).toBe(10);
    });

    it('should calculate negative change', () => {
      expect(calculateChangePercent(100, 90)).toBe(-10);
    });

    it('should handle zero old value', () => {
      expect(calculateChangePercent(0, 100)).toBe(100);
    });

    it('should handle zero new value', () => {
      expect(calculateChangePercent(100, 0)).toBe(-100);
    });
  });

  describe('calculateChangeAbsolute', () => {
    it('should calculate absolute change', () => {
      expect(calculateChangeAbsolute(100, 110)).toBe(10);
      expect(calculateChangeAbsolute(100, 90)).toBe(-10);
    });
  });

  describe('meetsThreshold', () => {
    it('should meet TVL threshold by percentage', () => {
      expect(meetsThreshold(2, 5000, 'tvl', DEFAULT_THRESHOLD_CONFIG)).toBe(true);
    });

    it('should meet TVL threshold by absolute value', () => {
      expect(meetsThreshold(0.5, 15000, 'tvl', DEFAULT_THRESHOLD_CONFIG)).toBe(true);
    });

    it('should not meet TVL threshold', () => {
      expect(meetsThreshold(0.5, 5000, 'tvl', DEFAULT_THRESHOLD_CONFIG)).toBe(false);
    });

    it('should meet price threshold by percentage', () => {
      expect(meetsThreshold(0.2, 0.005, 'price', DEFAULT_THRESHOLD_CONFIG)).toBe(true);
    });

    it('should meet price threshold by absolute value', () => {
      expect(meetsThreshold(0.05, 0.02, 'price', DEFAULT_THRESHOLD_CONFIG)).toBe(true);
    });

    it('should not meet price threshold', () => {
      expect(meetsThreshold(0.05, 0.005, 'price', DEFAULT_THRESHOLD_CONFIG)).toBe(false);
    });

    it('should always trigger for protocol changes', () => {
      expect(meetsThreshold(0, 0, 'protocol', DEFAULT_THRESHOLD_CONFIG)).toBe(true);
    });
  });

  describe('detectChanges', () => {
    it('should detect TVL changes', () => {
      const records: DynamoDBEventRecord[] = [
        {
          PK: 'hourlyTvl#uniswap-v3',
          SK: 1234567890,
          source: 'tvl-adapter',
          tvl: 1100000000,
          protocolName: 'Uniswap V3',
        },
      ];

      const previousValues = new Map([
        ['hourlyTvl#uniswap-v3', 1000000000],
      ]);

      const changes = detectChanges(records, previousValues);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('tvl');
      expect(changes[0].protocolId).toBe('uniswap-v3');
      expect(changes[0].oldValue).toBe(1000000000);
      expect(changes[0].newValue).toBe(1100000000);
      expect(changes[0].changePercent).toBe(10);
    });

    it('should detect price changes', () => {
      const records: DynamoDBEventRecord[] = [
        {
          PK: 'coingecko#ethereum',
          SK: 1234567890,
          source: 'price-adapter',
          price: 2750,
          symbol: 'ETH',
          decimals: 18,
        },
      ];

      const previousValues = new Map([
        ['coingecko#ethereum', 2500],
      ]);

      const changes = detectChanges(records, previousValues);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('price');
      expect(changes[0].tokenId).toBe('ethereum');
      expect(changes[0].oldValue).toBe(2500);
      expect(changes[0].newValue).toBe(2750);
      expect(changes[0].changePercent).toBe(10);
    });

    it('should skip changes below threshold', () => {
      const records: DynamoDBEventRecord[] = [
        {
          PK: 'hourlyTvl#uniswap-v3',
          SK: 1234567890,
          source: 'tvl-adapter',
          tvl: 1000005000, // 0.0005% change, $5,000 absolute (below both thresholds)
        },
      ];

      const previousValues = new Map([
        ['hourlyTvl#uniswap-v3', 1000000000],
      ]);

      const changes = detectChanges(records, previousValues);

      expect(changes).toHaveLength(0);
    });
  });

  describe('groupRecordsByPK', () => {
    it('should group records and keep latest', () => {
      const records: DynamoDBEventRecord[] = [
        {
          PK: 'hourlyTvl#uniswap-v3',
          SK: 1234567890,
          source: 'tvl-adapter',
          tvl: 1000000000,
        },
        {
          PK: 'hourlyTvl#uniswap-v3',
          SK: 1234567900,
          source: 'tvl-adapter',
          tvl: 1100000000,
        },
      ];

      const grouped = groupRecordsByPK(records);

      expect(grouped.size).toBe(1);
      expect(grouped.get('hourlyTvl#uniswap-v3')?.SK).toBe(1234567900);
      expect(grouped.get('hourlyTvl#uniswap-v3')?.tvl).toBe(1100000000);
    });
  });

  describe('validateRecord', () => {
    it('should validate valid TVL record', () => {
      const record: DynamoDBEventRecord = {
        PK: 'hourlyTvl#uniswap-v3',
        SK: 1234567890,
        source: 'tvl-adapter',
        tvl: 1000000000,
      };

      expect(validateRecord(record)).toBe(true);
    });

    it('should validate valid price record', () => {
      const record: DynamoDBEventRecord = {
        PK: 'coingecko#ethereum',
        SK: 1234567890,
        source: 'price-adapter',
        price: 2500,
      };

      expect(validateRecord(record)).toBe(true);
    });

    it('should reject record without PK', () => {
      const record: any = {
        SK: 1234567890,
        source: 'tvl-adapter',
        tvl: 1000000000,
      };

      expect(validateRecord(record)).toBe(false);
    });

    it('should reject TVL record without tvl field', () => {
      const record: DynamoDBEventRecord = {
        PK: 'hourlyTvl#uniswap-v3',
        SK: 1234567890,
        source: 'tvl-adapter',
      };

      expect(validateRecord(record)).toBe(false);
    });
  });

  describe('batchDetectChanges', () => {
    it('should batch detect changes with validation', () => {
      const records: DynamoDBEventRecord[] = [
        {
          PK: 'hourlyTvl#uniswap-v3',
          SK: 1234567890,
          source: 'tvl-adapter',
          tvl: 1100000000,
        },
        {
          PK: 'hourlyTvl#aave',
          SK: 1234567890,
          source: 'tvl-adapter',
          // Missing tvl field - invalid
        },
      ];

      const previousValues = new Map([
        ['hourlyTvl#uniswap-v3', 1000000000],
      ]);

      const result = batchDetectChanges(records, previousValues);

      expect(result.changes).toHaveLength(1);
      expect(result.invalidRecords).toHaveLength(1);
    });
  });

  describe('getChangeSummary', () => {
    it('should generate change summary', () => {
      const changes = [
        {
          type: 'tvl' as const,
          pk: 'hourlyTvl#uniswap-v3',
          oldValue: 1000000000,
          newValue: 1100000000,
          changePercent: 10,
          changeAbsolute: 100000000,
          timestamp: 1234567890,
          rawData: {},
        },
        {
          type: 'price' as const,
          pk: 'coingecko#ethereum',
          oldValue: 2500,
          newValue: 2750,
          changePercent: 10,
          changeAbsolute: 250,
          timestamp: 1234567890,
          rawData: {},
        },
      ];

      const summary = getChangeSummary(changes);

      expect(summary.totalChanges).toBe(2);
      expect(summary.tvlChanges).toBe(1);
      expect(summary.priceChanges).toBe(1);
      expect(summary.avgChangePercent).toBe(10);
      expect(summary.maxChangePercent).toBe(10);
      expect(summary.minChangePercent).toBe(10);
    });
  });
});

