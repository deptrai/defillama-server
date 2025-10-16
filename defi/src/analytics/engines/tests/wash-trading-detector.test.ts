/**
 * Unit Tests for WashTradingDetector
 * Story: 3.2.2 - Suspicious Activity Detection
 */

import { WashTradingDetector, Trade, SelfTradeEvidence, CircularTradeEvidence, VolumeInflationEvidence, PriceManipulationEvidence } from '../wash-trading-detector';

describe('WashTradingDetector', () => {
  let detector: WashTradingDetector;

  beforeAll(() => {
    detector = WashTradingDetector.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WashTradingDetector.getInstance();
      const instance2 = WashTradingDetector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('findSelfTrades', () => {
    it('should detect self-trading when wallet buys and sells within 1 hour', () => {
      const now = new Date();
      const trades: Trade[] = [
        {
          tx_hash: '0x1',
          wallet_address: '0xaaa',
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: now,
          type: 'buy',
        },
        {
          tx_hash: '0x2',
          wallet_address: '0xaaa',
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: new Date(now.getTime() + 1800000), // 30 minutes later
          type: 'sell',
        },
      ];

      const selfTrades = detector.findSelfTrades(trades);
      expect(selfTrades.length).toBeGreaterThan(0);
    });

    it('should not detect self-trading when buy/sell are >1 hour apart', () => {
      const now = new Date();
      const trades: Trade[] = [
        {
          tx_hash: '0x1',
          wallet_address: '0xaaa',
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: now,
          type: 'buy',
        },
        {
          tx_hash: '0x2',
          wallet_address: '0xaaa',
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: new Date(now.getTime() + 7200000), // 2 hours later
          type: 'sell',
        },
      ];

      const selfTrades = detector.findSelfTrades(trades);
      expect(selfTrades.length).toBe(0);
    });

    it('should not detect self-trading when wallet only buys', () => {
      const now = new Date();
      const trades: Trade[] = [
        {
          tx_hash: '0x1',
          wallet_address: '0xaaa',
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: now,
          type: 'buy',
        },
        {
          tx_hash: '0x2',
          wallet_address: '0xaaa',
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: new Date(now.getTime() + 1800000),
          type: 'buy',
        },
      ];

      const selfTrades = detector.findSelfTrades(trades);
      expect(selfTrades.length).toBe(0);
    });

    it('should detect multiple self-trading pairs', () => {
      const now = new Date();
      const trades: Trade[] = [
        {
          tx_hash: '0x1',
          wallet_address: '0xaaa',
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: now,
          type: 'buy',
        },
        {
          tx_hash: '0x2',
          wallet_address: '0xaaa',
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: new Date(now.getTime() + 600000), // 10 minutes
          type: 'sell',
        },
        {
          tx_hash: '0x3',
          wallet_address: '0xaaa',
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: new Date(now.getTime() + 1200000), // 20 minutes
          type: 'buy',
        },
        {
          tx_hash: '0x4',
          wallet_address: '0xaaa',
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: new Date(now.getTime() + 1800000), // 30 minutes
          type: 'sell',
        },
      ];

      const selfTrades = detector.findSelfTrades(trades);
      expect(selfTrades.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('calculateSelfTradingConfidence', () => {
    it('should return high confidence for >100 trades', () => {
      const evidence: SelfTradeEvidence = {
        wallet_address: '0xaaa',
        trade_count: 150,
        timeframe: 3600,
        total_volume_usd: 1500000,
      };

      const confidence = detector.calculateSelfTradingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return medium confidence for 50-100 trades', () => {
      const evidence: SelfTradeEvidence = {
        wallet_address: '0xaaa',
        trade_count: 75,
        timeframe: 3600,
        total_volume_usd: 750000,
      };

      const confidence = detector.calculateSelfTradingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(70);
      expect(confidence).toBeLessThan(90);
    });

    it('should return lower confidence for 10-50 trades', () => {
      const evidence: SelfTradeEvidence = {
        wallet_address: '0xaaa',
        trade_count: 25,
        timeframe: 3600,
        total_volume_usd: 250000,
      };

      const confidence = detector.calculateSelfTradingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(60);
      expect(confidence).toBeLessThan(80);
    });

    it('should increase confidence for higher volume', () => {
      const evidence1: SelfTradeEvidence = {
        wallet_address: '0xaaa',
        trade_count: 50,
        timeframe: 3600,
        total_volume_usd: 1500000,
      };

      const evidence2: SelfTradeEvidence = {
        wallet_address: '0xaaa',
        trade_count: 50,
        timeframe: 3600,
        total_volume_usd: 100000,
      };

      const confidence1 = detector.calculateSelfTradingConfidence(evidence1);
      const confidence2 = detector.calculateSelfTradingConfidence(evidence2);

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it('should increase confidence for shorter timeframes', () => {
      const evidence1: SelfTradeEvidence = {
        wallet_address: '0xaaa',
        trade_count: 50,
        timeframe: 1200, // 20 minutes
        total_volume_usd: 500000,
      };

      const evidence2: SelfTradeEvidence = {
        wallet_address: '0xaaa',
        trade_count: 50,
        timeframe: 3600, // 60 minutes
        total_volume_usd: 500000,
      };

      const confidence1 = detector.calculateSelfTradingConfidence(evidence1);
      const confidence2 = detector.calculateSelfTradingConfidence(evidence2);

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it('should cap confidence at 100', () => {
      const evidence: SelfTradeEvidence = {
        wallet_address: '0xaaa',
        trade_count: 200,
        timeframe: 1200,
        total_volume_usd: 2000000,
      };

      const confidence = detector.calculateSelfTradingConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateCircularTradingConfidence', () => {
    it('should return high confidence for >20 cycles', () => {
      const evidence: CircularTradeEvidence = {
        pattern: 'A->B->C->A',
        wallet_addresses: ['0xaaa', '0xbbb', '0xccc'],
        cycle_count: 25,
        timeframe: 3600,
        total_volume_usd: 1000000,
      };

      const confidence = detector.calculateCircularTradingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(85);
    });

    it('should return medium confidence for 10-20 cycles', () => {
      const evidence: CircularTradeEvidence = {
        pattern: 'A->B->C->A',
        wallet_addresses: ['0xaaa', '0xbbb', '0xccc'],
        cycle_count: 15,
        timeframe: 3600,
        total_volume_usd: 500000,
      };

      const confidence = detector.calculateCircularTradingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(70);
      expect(confidence).toBeLessThan(90);
    });

    it('should return lower confidence for 5-10 cycles', () => {
      const evidence: CircularTradeEvidence = {
        pattern: 'A->B->C->A',
        wallet_addresses: ['0xaaa', '0xbbb', '0xccc'],
        cycle_count: 7,
        timeframe: 3600,
        total_volume_usd: 250000,
      };

      const confidence = detector.calculateCircularTradingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(60);
      expect(confidence).toBeLessThan(80);
    });

    it('should increase confidence for more wallets', () => {
      const evidence1: CircularTradeEvidence = {
        pattern: 'A->B->...->Z->A',
        wallet_addresses: Array(15).fill('0x').map((_, i) => `0x${i}`),
        cycle_count: 10,
        timeframe: 3600,
        total_volume_usd: 500000,
      };

      const evidence2: CircularTradeEvidence = {
        pattern: 'A->B->C->A',
        wallet_addresses: ['0xaaa', '0xbbb', '0xccc'],
        cycle_count: 10,
        timeframe: 3600,
        total_volume_usd: 500000,
      };

      const confidence1 = detector.calculateCircularTradingConfidence(evidence1);
      const confidence2 = detector.calculateCircularTradingConfidence(evidence2);

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it('should cap confidence at 100', () => {
      const evidence: CircularTradeEvidence = {
        pattern: 'A->B->...->Z->A',
        wallet_addresses: Array(20).fill('0x').map((_, i) => `0x${i}`),
        cycle_count: 30,
        timeframe: 1200,
        total_volume_usd: 2000000,
      };

      const confidence = detector.calculateCircularTradingConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateVolumeInflationConfidence', () => {
    it('should return high confidence for >10x inflation', () => {
      const evidence: VolumeInflationEvidence = {
        normal_volume_usd: 100000,
        current_volume_usd: 1500000,
        inflation_ratio: 15.0,
        timeframe: 3600,
        contributing_wallets: ['0xaaa', '0xbbb'],
        wallet_contribution_pct: 0.85,
      };

      const confidence = detector.calculateVolumeInflationConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return medium confidence for 5-10x inflation', () => {
      const evidence: VolumeInflationEvidence = {
        normal_volume_usd: 100000,
        current_volume_usd: 700000,
        inflation_ratio: 7.0,
        timeframe: 3600,
        contributing_wallets: ['0xaaa', '0xbbb'],
        wallet_contribution_pct: 0.75,
      };

      const confidence = detector.calculateVolumeInflationConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(75);
      expect(confidence).toBeLessThan(95);
    });

    it('should return lower confidence for 3-5x inflation', () => {
      const evidence: VolumeInflationEvidence = {
        normal_volume_usd: 100000,
        current_volume_usd: 400000,
        inflation_ratio: 4.0,
        timeframe: 3600,
        contributing_wallets: ['0xaaa', '0xbbb'],
        wallet_contribution_pct: 0.65,
      };

      const confidence = detector.calculateVolumeInflationConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(65);
      expect(confidence).toBeLessThan(85);
    });

    it('should increase confidence for higher wallet contribution', () => {
      const evidence1: VolumeInflationEvidence = {
        normal_volume_usd: 100000,
        current_volume_usd: 500000,
        inflation_ratio: 5.0,
        timeframe: 3600,
        contributing_wallets: ['0xaaa', '0xbbb'],
        wallet_contribution_pct: 0.9,
      };

      const evidence2: VolumeInflationEvidence = {
        normal_volume_usd: 100000,
        current_volume_usd: 500000,
        inflation_ratio: 5.0,
        timeframe: 3600,
        contributing_wallets: ['0xaaa', '0xbbb'],
        wallet_contribution_pct: 0.4,
      };

      const confidence1 = detector.calculateVolumeInflationConfidence(evidence1);
      const confidence2 = detector.calculateVolumeInflationConfidence(evidence2);

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it('should cap confidence at 100', () => {
      const evidence: VolumeInflationEvidence = {
        normal_volume_usd: 100000,
        current_volume_usd: 2000000,
        inflation_ratio: 20.0,
        timeframe: 1200,
        contributing_wallets: ['0xaaa', '0xbbb'],
        wallet_contribution_pct: 0.95,
      };

      const confidence = detector.calculateVolumeInflationConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculatePriceManipulationConfidence', () => {
    it('should return high confidence for >50 coordinated trades with price maintained', () => {
      const evidence: PriceManipulationEvidence = {
        coordinated_trade_count: 60,
        wallet_addresses: ['0xaaa', '0xbbb', '0xccc', '0xddd', '0xeee', '0xfff'],
        price_maintained: true,
        timeframe: 3600,
      };

      const confidence = detector.calculatePriceManipulationConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(85);
    });

    it('should return medium confidence for 20-50 coordinated trades', () => {
      const evidence: PriceManipulationEvidence = {
        coordinated_trade_count: 35,
        wallet_addresses: ['0xaaa', '0xbbb', '0xccc'],
        price_maintained: false,
        timeframe: 3600,
      };

      const confidence = detector.calculatePriceManipulationConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(65);
      expect(confidence).toBeLessThan(90);
    });

    it('should increase confidence when price is maintained', () => {
      const evidence1: PriceManipulationEvidence = {
        coordinated_trade_count: 30,
        wallet_addresses: ['0xaaa', '0xbbb'],
        price_maintained: true,
        timeframe: 3600,
      };

      const evidence2: PriceManipulationEvidence = {
        coordinated_trade_count: 30,
        wallet_addresses: ['0xaaa', '0xbbb'],
        price_maintained: false,
        timeframe: 3600,
      };

      const confidence1 = detector.calculatePriceManipulationConfidence(evidence1);
      const confidence2 = detector.calculatePriceManipulationConfidence(evidence2);

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it('should cap confidence at 100', () => {
      const evidence: PriceManipulationEvidence = {
        coordinated_trade_count: 100,
        wallet_addresses: Array(10).fill('0x').map((_, i) => `0x${i}`),
        price_maintained: true,
        timeframe: 1200,
      };

      const confidence = detector.calculatePriceManipulationConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });
});

