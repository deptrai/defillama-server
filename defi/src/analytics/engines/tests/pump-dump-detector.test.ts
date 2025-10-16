/**
 * Unit Tests for PumpDumpDetector
 * Story: 3.2.2 - Suspicious Activity Detection
 */

import { PumpDumpDetector, Trade, PricePoint, CoordinatedBuyingEvidence, PriceSpikeEvidence, CoordinatedSellingEvidence, DumpEvidence } from '../pump-dump-detector';

describe('PumpDumpDetector', () => {
  let detector: PumpDumpDetector;

  beforeAll(() => {
    detector = PumpDumpDetector.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PumpDumpDetector.getInstance();
      const instance2 = PumpDumpDetector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('detectCoordinatedBuying', () => {
    it('should detect when >10 buys from different wallets in 5 min window', () => {
      const now = new Date();
      const trades: Trade[] = Array(15).fill(null).map((_, i) => ({
        tx_hash: `0x${i}`,
        wallet_address: `0xwallet${i}`,
        token_address: '0xtoken',
        amount: 1000,
        price: 1.0,
        timestamp: new Date(now.getTime() + i * 10000), // 10 seconds apart
        type: 'buy' as const,
      }));

      const result = detector.detectCoordinatedBuying(trades);
      expect(result).not.toBeNull();
      expect(result!.buy_count).toBeGreaterThanOrEqual(10);
    });

    it('should not detect when buys are spread over >5 min', () => {
      const now = new Date();
      const trades: Trade[] = Array(15).fill(null).map((_, i) => ({
        tx_hash: `0x${i}`,
        wallet_address: `0xwallet${i}`,
        token_address: '0xtoken',
        amount: 1000,
        price: 1.0,
        timestamp: new Date(now.getTime() + i * 400000), // 6.67 minutes apart
        type: 'buy' as const,
      }));

      const result = detector.detectCoordinatedBuying(trades);
      expect(result).toBeNull();
    });

    it('should not detect when <10 buys', () => {
      const now = new Date();
      const trades: Trade[] = Array(5).fill(null).map((_, i) => ({
        tx_hash: `0x${i}`,
        wallet_address: `0xwallet${i}`,
        token_address: '0xtoken',
        amount: 1000,
        price: 1.0,
        timestamp: new Date(now.getTime() + i * 10000),
        type: 'buy' as const,
      }));

      const result = detector.detectCoordinatedBuying(trades);
      expect(result).toBeNull();
    });

    it('should detect multiple coordinated buying windows', () => {
      const now = new Date();
      const trades: Trade[] = [
        ...Array(12).fill(null).map((_, i) => ({
          tx_hash: `0x${i}`,
          wallet_address: `0xwallet${i}`,
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: new Date(now.getTime() + i * 10000), // First window
          type: 'buy' as const,
        })),
        ...Array(15).fill(null).map((_, i) => ({
          tx_hash: `0x${i + 12}`,
          wallet_address: `0xwallet${i + 12}`,
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: new Date(now.getTime() + 600000 + i * 10000), // Second window (10 min later)
          type: 'buy' as const,
        })),
      ];

      const result = detector.detectCoordinatedBuying(trades);
      expect(result).not.toBeNull();
      expect(result!.buy_count).toBeGreaterThanOrEqual(10);
    });

    it('should handle edge case: exactly 10 buys', () => {
      const now = new Date();
      const trades: Trade[] = Array(10).fill(null).map((_, i) => ({
        tx_hash: `0x${i}`,
        wallet_address: `0xwallet${i}`,
        token_address: '0xtoken',
        amount: 1000,
        price: 1.0,
        timestamp: new Date(now.getTime() + i * 10000),
        type: 'buy' as const,
      }));

      const result = detector.detectCoordinatedBuying(trades);
      expect(result).not.toBeNull();
      expect(result!.buy_count).toBe(10);
    });
  });

  describe('detectPriceSpike', () => {
    it('should detect >50% price increase in <1 hour', () => {
      const now = new Date();
      const priceHistory: PricePoint[] = [
        { timestamp: now, price: 1.0, volume_usd: 100000 },
        { timestamp: new Date(now.getTime() + 1800000), price: 1.6, volume_usd: 150000 }, // 30 min, +60%
      ];

      const result = detector.detectPriceSpike(priceHistory);
      expect(result).not.toBeNull();
      expect(result!.percentage_increase).toBeGreaterThanOrEqual(0.5);
    });

    it('should not detect when increase is <50%', () => {
      const now = new Date();
      const priceHistory: PricePoint[] = [
        { timestamp: now, price: 1.0, volume_usd: 100000 },
        { timestamp: new Date(now.getTime() + 1800000), price: 1.4, volume_usd: 120000 }, // +40%
      ];

      const result = detector.detectPriceSpike(priceHistory);
      expect(result).toBeNull();
    });

    it('should not detect when timeframe is >1 hour', () => {
      const now = new Date();
      const priceHistory: PricePoint[] = [
        { timestamp: now, price: 1.0, volume_usd: 100000 },
        { timestamp: new Date(now.getTime() + 7200000), price: 1.6, volume_usd: 150000 }, // 2 hours, +60%
      ];

      const result = detector.detectPriceSpike(priceHistory);
      expect(result).toBeNull();
    });

    it('should detect multiple price spikes', () => {
      const now = new Date();
      const priceHistory: PricePoint[] = [
        { timestamp: now, price: 1.0, volume_usd: 100000 },
        { timestamp: new Date(now.getTime() + 1800000), price: 1.6, volume_usd: 150000 }, // First spike
        { timestamp: new Date(now.getTime() + 3600000), price: 1.5, volume_usd: 120000 },
        { timestamp: new Date(now.getTime() + 5400000), price: 2.3, volume_usd: 200000 }, // Second spike
      ];

      const result = detector.detectPriceSpike(priceHistory);
      expect(result).not.toBeNull();
      expect(result!.percentage_increase).toBeGreaterThanOrEqual(0.5);
    });

    it('should handle edge case: exactly 50% increase', () => {
      const now = new Date();
      const priceHistory: PricePoint[] = [
        { timestamp: now, price: 1.0, volume_usd: 100000 },
        { timestamp: new Date(now.getTime() + 1800000), price: 1.5, volume_usd: 130000 }, // Exactly +50%
      ];

      const result = detector.detectPriceSpike(priceHistory);
      expect(result).not.toBeNull();
      expect(result!.percentage_increase).toBeCloseTo(0.5, 2);
    });
  });

  describe('detectCoordinatedSelling', () => {
    it('should detect when >10 sells from different wallets in 5 min window', () => {
      const now = new Date();
      const trades: Trade[] = Array(15).fill(null).map((_, i) => ({
        tx_hash: `0x${i}`,
        wallet_address: `0xwallet${i}`,
        token_address: '0xtoken',
        amount: 1000,
        price: 1.0,
        timestamp: new Date(now.getTime() + i * 10000),
        type: 'sell' as const,
      }));

      const result = detector.detectCoordinatedSelling(trades);
      expect(result).not.toBeNull();
      expect(result!.sell_count).toBeGreaterThanOrEqual(10);
    });

    it('should not detect when sells are spread over >5 min', () => {
      const now = new Date();
      const trades: Trade[] = Array(15).fill(null).map((_, i) => ({
        tx_hash: `0x${i}`,
        wallet_address: `0xwallet${i}`,
        token_address: '0xtoken',
        amount: 1000,
        price: 1.0,
        timestamp: new Date(now.getTime() + i * 400000), // 6.67 minutes apart
        type: 'sell' as const,
      }));

      const result = detector.detectCoordinatedSelling(trades);
      expect(result).toBeNull();
    });

    it('should not detect when <10 sells', () => {
      const now = new Date();
      const trades: Trade[] = Array(5).fill(null).map((_, i) => ({
        tx_hash: `0x${i}`,
        wallet_address: `0xwallet${i}`,
        token_address: '0xtoken',
        amount: 1000,
        price: 1.0,
        timestamp: new Date(now.getTime() + i * 10000),
        type: 'sell' as const,
      }));

      const result = detector.detectCoordinatedSelling(trades);
      expect(result).toBeNull();
    });

    it('should detect multiple coordinated selling windows', () => {
      const now = new Date();
      const trades: Trade[] = [
        ...Array(12).fill(null).map((_, i) => ({
          tx_hash: `0x${i}`,
          wallet_address: `0xwallet${i}`,
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: new Date(now.getTime() + i * 10000),
          type: 'sell' as const,
        })),
        ...Array(15).fill(null).map((_, i) => ({
          tx_hash: `0x${i + 12}`,
          wallet_address: `0xwallet${i + 12}`,
          token_address: '0xtoken',
          amount: 1000,
          price: 1.0,
          timestamp: new Date(now.getTime() + 600000 + i * 10000),
          type: 'sell' as const,
        })),
      ];

      const result = detector.detectCoordinatedSelling(trades);
      expect(result).not.toBeNull();
      expect(result!.sell_count).toBeGreaterThanOrEqual(10);
    });

    it('should handle edge case: exactly 10 sells', () => {
      const now = new Date();
      const trades: Trade[] = Array(10).fill(null).map((_, i) => ({
        tx_hash: `0x${i}`,
        wallet_address: `0xwallet${i}`,
        token_address: '0xtoken',
        amount: 1000,
        price: 1.0,
        timestamp: new Date(now.getTime() + i * 10000),
        type: 'sell' as const,
      }));

      const result = detector.detectCoordinatedSelling(trades);
      expect(result).not.toBeNull();
      expect(result!.sell_count).toBe(10);
    });
  });

  describe('detectDump', () => {
    it('should detect >50% price drop in <2 hours after spike', () => {
      const now = new Date();
      const spikeTimestamp = new Date(now.getTime() + 1800000);
      const priceHistory: PricePoint[] = [
        { timestamp: now, price: 1.0, volume_usd: 100000 },
        { timestamp: spikeTimestamp, price: 2.0, volume_usd: 200000 }, // Spike
        { timestamp: new Date(spikeTimestamp.getTime() + 1800000), price: 0.9, volume_usd: 180000 }, // Dump: -55%
      ];

      const result = detector.detectDump(priceHistory, spikeTimestamp);
      expect(result).not.toBeNull();
      expect(result!.percentage_drop).toBeGreaterThanOrEqual(0.5);
    });

    it('should not detect when drop is <50%', () => {
      const now = new Date();
      const spikeTimestamp = new Date(now.getTime() + 1800000);
      const priceHistory: PricePoint[] = [
        { timestamp: now, price: 1.0, volume_usd: 100000 },
        { timestamp: spikeTimestamp, price: 2.0, volume_usd: 200000 },
        { timestamp: new Date(spikeTimestamp.getTime() + 1800000), price: 1.2, volume_usd: 150000 }, // -40%
      ];



  describe('calculateCoordinatedBuyingConfidence', () => {
    it('should return high confidence for >50 buys from >20 wallets', () => {
      const evidence: CoordinatedBuyingEvidence = {
        wallet_addresses: Array(25).fill('0x').map((_, i) => `0x${i}`),
        buy_count: 60,
        timeframe: 300,
        total_volume_usd: 500000,
        price_impact: 0.35,
      };

      const confidence = detector.calculateCoordinatedBuyingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return medium confidence for 30-50 buys from 10-20 wallets', () => {
      const evidence: CoordinatedBuyingEvidence = {
        wallet_addresses: Array(15).fill('0x').map((_, i) => `0x${i}`),
        buy_count: 40,
        timeframe: 300,
        total_volume_usd: 300000,
        price_impact: 0.15,
      };

      const confidence = detector.calculateCoordinatedBuyingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(70);
      expect(confidence).toBeLessThan(95);
    });

    it('should return lower confidence for 10-30 buys from 5-10 wallets', () => {
      const evidence: CoordinatedBuyingEvidence = {
        wallet_addresses: Array(7).fill('0x').map((_, i) => `0x${i}`),
        buy_count: 20,
        timeframe: 300,
        total_volume_usd: 150000,
        price_impact: 0.08,
      };

      const confidence = detector.calculateCoordinatedBuyingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(60);
      expect(confidence).toBeLessThan(85);
    });

    it('should increase confidence for higher price impact', () => {
      const evidence1: CoordinatedBuyingEvidence = {
        wallet_addresses: Array(10).fill('0x').map((_, i) => `0x${i}`),
        buy_count: 30,
        timeframe: 300,
        total_volume_usd: 300000,
        price_impact: 0.35,
      };

      const evidence2: CoordinatedBuyingEvidence = {
        wallet_addresses: Array(10).fill('0x').map((_, i) => `0x${i}`),
        buy_count: 30,
        timeframe: 300,
        total_volume_usd: 300000,
        price_impact: 0.05,
      };

      const confidence1 = detector.calculateCoordinatedBuyingConfidence(evidence1);
      const confidence2 = detector.calculateCoordinatedBuyingConfidence(evidence2);

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it('should cap confidence at 100', () => {
      const evidence: CoordinatedBuyingEvidence = {
        wallet_addresses: Array(30).fill('0x').map((_, i) => `0x${i}`),
        buy_count: 100,
        timeframe: 300,
        total_volume_usd: 1000000,
        price_impact: 0.5,
      };

      const confidence = detector.calculateCoordinatedBuyingConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculatePriceSpikeConfidence', () => {
    it('should return high confidence for >200% increase in <15 min with >10x volume', () => {
      const evidence: PriceSpikeEvidence = {
        start_price: 1.0,
        end_price: 3.5,
        percentage_increase: 2.5,
        timeframe: 600,
        volume_during_spike_usd: 1000000,
        volume_spike_ratio: 12.0,
      };

      const confidence = detector.calculatePriceSpikeConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return medium confidence for 100-200% increase', () => {
      const evidence: PriceSpikeEvidence = {
        start_price: 1.0,
        end_price: 2.2,
        percentage_increase: 1.2,
        timeframe: 1200,
        volume_during_spike_usd: 500000,
        volume_spike_ratio: 6.0,
      };

      const confidence = detector.calculatePriceSpikeConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(75);
      expect(confidence).toBeLessThan(95);
    });

    it('should return lower confidence for 50-100% increase', () => {
      const evidence: PriceSpikeEvidence = {
        start_price: 1.0,
        end_price: 1.7,
        percentage_increase: 0.7,
        timeframe: 2400,
        volume_during_spike_usd: 300000,
        volume_spike_ratio: 3.0,
      };

      const confidence = detector.calculatePriceSpikeConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(60);
      expect(confidence).toBeLessThan(85);
    });

    it('should increase confidence for shorter timeframes', () => {
      const evidence1: PriceSpikeEvidence = {
        start_price: 1.0,
        end_price: 2.0,
        percentage_increase: 1.0,
        timeframe: 600, // 10 minutes
        volume_during_spike_usd: 500000,
        volume_spike_ratio: 5.0,
      };

      const evidence2: PriceSpikeEvidence = {
        start_price: 1.0,
        end_price: 2.0,
        percentage_increase: 1.0,
        timeframe: 2400, // 40 minutes
        volume_during_spike_usd: 500000,
        volume_spike_ratio: 5.0,
      };

      const confidence1 = detector.calculatePriceSpikeConfidence(evidence1);
      const confidence2 = detector.calculatePriceSpikeConfidence(evidence2);

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it('should cap confidence at 100', () => {
      const evidence: PriceSpikeEvidence = {
        start_price: 1.0,
        end_price: 5.0,
        percentage_increase: 4.0,
        timeframe: 300,
        volume_during_spike_usd: 2000000,
        volume_spike_ratio: 20.0,
      };

      const confidence = detector.calculatePriceSpikeConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateCoordinatedSellingConfidence', () => {
    it('should return high confidence for >50 sells from >20 wallets', () => {
      const evidence: CoordinatedSellingEvidence = {
        wallet_addresses: Array(25).fill('0x').map((_, i) => `0x${i}`),
        sell_count: 60,
        timeframe: 300,
        total_volume_usd: 500000,
        price_impact: 0.35,
      };

      const confidence = detector.calculateCoordinatedSellingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return medium confidence for 30-50 sells from 10-20 wallets', () => {
      const evidence: CoordinatedSellingEvidence = {
        wallet_addresses: Array(15).fill('0x').map((_, i) => `0x${i}`),
        sell_count: 40,
        timeframe: 300,
        total_volume_usd: 300000,
        price_impact: 0.15,
      };

      const confidence = detector.calculateCoordinatedSellingConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(70);
      expect(confidence).toBeLessThan(95);
    });

    it('should cap confidence at 100', () => {
      const evidence: CoordinatedSellingEvidence = {
        wallet_addresses: Array(30).fill('0x').map((_, i) => `0x${i}`),
        sell_count: 100,
        timeframe: 300,
        total_volume_usd: 1000000,
        price_impact: 0.5,
      };

      const confidence = detector.calculateCoordinatedSellingConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateDumpConfidence', () => {
    it('should return high confidence for >90% drop in <30 min with >10x volume', () => {
      const evidence: DumpEvidence = {
        peak_price: 2.0,
        dump_price: 0.15,
        percentage_drop: 0.925,
        timeframe: 1200,
        volume_during_dump_usd: 1000000,
        volume_spike_ratio: 12.0,
      };

      const confidence = detector.calculateDumpConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(90);
    });

    it('should return medium confidence for 70-90% drop', () => {
      const evidence: DumpEvidence = {
        peak_price: 2.0,
        dump_price: 0.5,
        percentage_drop: 0.75,
        timeframe: 2400,
        volume_during_dump_usd: 500000,
        volume_spike_ratio: 6.0,
      };

      const confidence = detector.calculateDumpConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(75);
      expect(confidence).toBeLessThan(95);
    });

    it('should return lower confidence for 50-70% drop', () => {
      const evidence: DumpEvidence = {
        peak_price: 2.0,
        dump_price: 0.8,
        percentage_drop: 0.6,
        timeframe: 4800,
        volume_during_dump_usd: 300000,
        volume_spike_ratio: 3.0,
      };

      const confidence = detector.calculateDumpConfidence(evidence);
      expect(confidence).toBeGreaterThanOrEqual(60);
      expect(confidence).toBeLessThan(85);
    });

    it('should increase confidence for shorter timeframes', () => {
      const evidence1: DumpEvidence = {
        peak_price: 2.0,
        dump_price: 0.8,
        percentage_drop: 0.6,
        timeframe: 1200, // 20 minutes
        volume_during_dump_usd: 500000,
        volume_spike_ratio: 5.0,
      };

      const evidence2: DumpEvidence = {
        peak_price: 2.0,
        dump_price: 0.8,
        percentage_drop: 0.6,
        timeframe: 4800, // 80 minutes
        volume_during_dump_usd: 500000,
        volume_spike_ratio: 5.0,
      };

      const confidence1 = detector.calculateDumpConfidence(evidence1);
      const confidence2 = detector.calculateDumpConfidence(evidence2);

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it('should cap confidence at 100', () => {
      const evidence: DumpEvidence = {
        peak_price: 2.0,
        dump_price: 0.05,
        percentage_drop: 0.975,
        timeframe: 600,
        volume_during_dump_usd: 2000000,
        volume_spike_ratio: 20.0,
      };

      const confidence = detector.calculateDumpConfidence(evidence);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });
});

    it('should not detect when timeframe is >2 hours', () => {
      const now = new Date();
      const spikeTimestamp = new Date(now.getTime() + 1800000);
      const priceHistory: PricePoint[] = [
        { timestamp: now, price: 1.0, volume_usd: 100000 },
        { timestamp: spikeTimestamp, price: 2.0, volume_usd: 200000 },
        { timestamp: new Date(spikeTimestamp.getTime() + 10800000), price: 0.9, volume_usd: 180000 }, // 3 hours
      ];

      const result = detector.detectDump(priceHistory, spikeTimestamp);
      expect(result).toBeNull();
    });

    it('should not detect when no spike occurred', () => {
      const now = new Date();
      const nonExistentSpike = new Date(now.getTime() + 10000000);
      const priceHistory: PricePoint[] = [
        { timestamp: now, price: 1.0, volume_usd: 100000 },
        { timestamp: new Date(now.getTime() + 1800000), price: 0.5, volume_usd: 80000 },
      ];

      const result = detector.detectDump(priceHistory, nonExistentSpike);
      expect(result).toBeNull();
    });

    it('should handle edge case: exactly 50% drop', () => {
      const now = new Date();
      const spikeTimestamp = new Date(now.getTime() + 1800000);
      const priceHistory: PricePoint[] = [
        { timestamp: now, price: 1.0, volume_usd: 100000 },
        { timestamp: spikeTimestamp, price: 2.0, volume_usd: 200000 },
        { timestamp: new Date(spikeTimestamp.getTime() + 1800000), price: 1.0, volume_usd: 150000 }, // Exactly -50%
      ];

      const result = detector.detectDump(priceHistory, spikeTimestamp);
      expect(result).not.toBeNull();
      expect(result!.percentage_drop).toBeCloseTo(0.5, 2);
    });
  });
});

