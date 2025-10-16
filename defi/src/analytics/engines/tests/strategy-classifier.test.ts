/**
 * Strategy Classifier Engine Tests
 * Story: 3.1.3 - Performance Attribution
 */

import { StrategyClassifier } from '../strategy-classifier';

describe('StrategyClassifier', () => {
  let classifier: StrategyClassifier;

  beforeEach(() => {
    classifier = StrategyClassifier.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = StrategyClassifier.getInstance();
      const instance2 = StrategyClassifier.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('classifyStrategy', () => {
    it('should classify strategy correctly', async () => {
      const walletId = 'test-wallet-id';

      const attribution = await classifier.classifyStrategy(walletId);

      expect(attribution).toHaveProperty('walletId');
      expect(attribution).toHaveProperty('primaryStrategy');
      expect(attribution).toHaveProperty('secondaryStrategies');
      expect(attribution).toHaveProperty('consistencyScore');
      expect(attribution).toHaveProperty('strategyBreakdown');
    });

    it('should identify primary strategy', async () => {
      const walletId = 'test-wallet-id';

      const attribution = await classifier.classifyStrategy(walletId);

      expect(typeof attribution.primaryStrategy).toBe('string');
      expect([
        'accumulation',
        'distribution',
        'rotation',
        'arbitrage',
        'swing',
        'day',
        'position',
        'scalp',
      ]).toContain(attribution.primaryStrategy);
    });

    it('should identify secondary strategies', async () => {
      const walletId = 'test-wallet-id';

      const attribution = await classifier.classifyStrategy(walletId);

      expect(Array.isArray(attribution.secondaryStrategies)).toBe(true);
      expect(attribution.secondaryStrategies.length).toBeLessThanOrEqual(2);
    });

    it('should calculate consistency score', async () => {
      const walletId = 'test-wallet-id';

      const attribution = await classifier.classifyStrategy(walletId);

      expect(typeof attribution.consistencyScore).toBe('number');
      expect(attribution.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(attribution.consistencyScore).toBeLessThanOrEqual(100);
    });

    it('should provide strategy breakdown', async () => {
      const walletId = 'test-wallet-id';

      const attribution = await classifier.classifyStrategy(walletId);

      expect(attribution.strategyBreakdown instanceof Map).toBe(true);

      if (attribution.strategyBreakdown.size > 0) {
        const [strategy, effectiveness] = Array.from(
          attribution.strategyBreakdown.entries()
        )[0];

        expect(typeof strategy).toBe('string');
        expect(effectiveness).toHaveProperty('strategy');
        expect(effectiveness).toHaveProperty('pnl');
        expect(effectiveness).toHaveProperty('winRate');
        expect(effectiveness).toHaveProperty('tradeCount');
        expect(effectiveness).toHaveProperty('avgHoldingPeriod');
      }
    });
  });

  describe('calculateStrategyEffectiveness', () => {
    it('should calculate effectiveness for accumulation', async () => {
      const walletId = 'test-wallet-id';

      const effectiveness = await classifier.calculateStrategyEffectiveness(
        walletId,
        'accumulation'
      );

      expect(effectiveness.strategy).toBe('accumulation');
      expect(typeof effectiveness.pnl).toBe('number');
      expect(typeof effectiveness.winRate).toBe('number');
      expect(typeof effectiveness.tradeCount).toBe('number');
      expect(typeof effectiveness.avgHoldingPeriod).toBe('number');
    });

    it('should calculate effectiveness for distribution', async () => {
      const walletId = 'test-wallet-id';

      const effectiveness = await classifier.calculateStrategyEffectiveness(
        walletId,
        'distribution'
      );

      expect(effectiveness.strategy).toBe('distribution');
    });

    it('should calculate effectiveness for rotation', async () => {
      const walletId = 'test-wallet-id';

      const effectiveness = await classifier.calculateStrategyEffectiveness(
        walletId,
        'rotation'
      );

      expect(effectiveness.strategy).toBe('rotation');
    });

    it('should calculate effectiveness for arbitrage', async () => {
      const walletId = 'test-wallet-id';

      const effectiveness = await classifier.calculateStrategyEffectiveness(
        walletId,
        'arbitrage'
      );

      expect(effectiveness.strategy).toBe('arbitrage');
    });

    it('should calculate effectiveness for swing', async () => {
      const walletId = 'test-wallet-id';

      const effectiveness = await classifier.calculateStrategyEffectiveness(
        walletId,
        'swing'
      );

      expect(effectiveness.strategy).toBe('swing');
    });

    it('should calculate effectiveness for day', async () => {
      const walletId = 'test-wallet-id';

      const effectiveness = await classifier.calculateStrategyEffectiveness(
        walletId,
        'day'
      );

      expect(effectiveness.strategy).toBe('day');
    });

    it('should calculate effectiveness for position', async () => {
      const walletId = 'test-wallet-id';

      const effectiveness = await classifier.calculateStrategyEffectiveness(
        walletId,
        'position'
      );

      expect(effectiveness.strategy).toBe('position');
    });

    it('should calculate effectiveness for scalp', async () => {
      const walletId = 'test-wallet-id';

      const effectiveness = await classifier.calculateStrategyEffectiveness(
        walletId,
        'scalp'
      );

      expect(effectiveness.strategy).toBe('scalp');
    });

    it('should handle zero trades for strategy', async () => {
      const walletId = 'non-existent-wallet';

      const effectiveness = await classifier.calculateStrategyEffectiveness(
        walletId,
        'accumulation'
      );

      expect(effectiveness.pnl).toBe(0);
      expect(effectiveness.winRate).toBe(0);
      expect(effectiveness.tradeCount).toBe(0);
      expect(effectiveness.avgHoldingPeriod).toBe(0);
    });

    it('should include all required fields', async () => {
      const walletId = 'test-wallet-id';

      const effectiveness = await classifier.calculateStrategyEffectiveness(
        walletId,
        'swing'
      );

      expect(effectiveness).toHaveProperty('strategy');
      expect(effectiveness).toHaveProperty('pnl');
      expect(effectiveness).toHaveProperty('winRate');
      expect(effectiveness).toHaveProperty('tradeCount');
      expect(effectiveness).toHaveProperty('sharpeRatio');
      expect(effectiveness).toHaveProperty('avgHoldingPeriod');
    });
  });

  describe('Edge Cases', () => {
    it('should handle wallet with single strategy', async () => {
      const walletId = 'single-strategy-wallet';

      const attribution = await classifier.classifyStrategy(walletId);

      expect(attribution.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(attribution.consistencyScore).toBeLessThanOrEqual(100);
    });

    it('should handle wallet with mixed strategies', async () => {
      const walletId = 'mixed-strategy-wallet';

      const attribution = await classifier.classifyStrategy(walletId);

      expect(attribution.primaryStrategy).toBeDefined();
      expect(attribution.secondaryStrategies).toBeDefined();
    });

    it('should handle wallet with no trades', async () => {
      const walletId = 'no-trades-wallet';

      const attribution = await classifier.classifyStrategy(walletId);

      expect(attribution.primaryStrategy).toBe('swing'); // Default
      expect(attribution.secondaryStrategies).toEqual([]);
      expect(attribution.consistencyScore).toBe(0);
    });
  });
});

