/**
 * Trade Pattern Recognizer Engine Tests
 * Story: 3.1.2 - Trade Pattern Analysis
 */

import { TradePatternRecognizer, Trade, Pattern } from '../trade-pattern-recognizer';

describe('TradePatternRecognizer', () => {
  let recognizer: TradePatternRecognizer;

  beforeAll(() => {
    recognizer = TradePatternRecognizer.getInstance();
  });

  // ============================================================================
  // Accumulation Pattern Tests
  // ============================================================================

  describe('detectAccumulation', () => {
    it('should detect accumulation pattern with 3+ buys over 7+ days', () => {
      const trades: Trade[] = [
        createTrade('buy', new Date('2024-01-01'), 5000, 2.5, 'WETH'),
        createTrade('buy', new Date('2024-01-05'), 7500, 3.7, 'WETH'),
        createTrade('buy', new Date('2024-01-10'), 10000, 4.9, 'WETH'),
      ];

      const pattern = recognizer.detectAccumulation(trades);

      expect(pattern).not.toBeNull();
      expect(pattern?.type).toBe('accumulation');
      expect(pattern?.trades.length).toBe(3);
      expect(pattern?.confidence).toBeGreaterThan(50);
      expect(pattern?.durationHours).toBeGreaterThan(7 * 24);
    });

    it('should return null if less than 3 buy trades', () => {
      const trades: Trade[] = [
        createTrade('buy', new Date('2024-01-01'), 5000, 2.5, 'WETH'),
        createTrade('buy', new Date('2024-01-05'), 7500, 3.7, 'WETH'),
      ];

      const pattern = recognizer.detectAccumulation(trades);

      expect(pattern).toBeNull();
    });

    it('should return null if timespan is less than 7 days', () => {
      const trades: Trade[] = [
        createTrade('buy', new Date('2024-01-01'), 5000, 2.5, 'WETH'),
        createTrade('buy', new Date('2024-01-02'), 7500, 3.7, 'WETH'),
        createTrade('buy', new Date('2024-01-03'), 10000, 4.9, 'WETH'),
      ];

      const pattern = recognizer.detectAccumulation(trades);

      expect(pattern).toBeNull();
    });

    it('should return null if position growth is less than 50%', () => {
      const trades: Trade[] = [
        createTrade('buy', new Date('2024-01-01'), 5000, 10.0, 'WETH'),
        createTrade('buy', new Date('2024-01-05'), 7500, 10.5, 'WETH'),
        createTrade('buy', new Date('2024-01-10'), 10000, 11.0, 'WETH'),
      ];

      const pattern = recognizer.detectAccumulation(trades);

      expect(pattern).toBeNull();
    });
  });

  // ============================================================================
  // Distribution Pattern Tests
  // ============================================================================

  describe('detectDistribution', () => {
    it('should detect distribution pattern with 3+ sells over 7+ days', () => {
      const trades: Trade[] = [
        createTrade('sell', new Date('2024-01-01'), 8000, 100, 'AAVE'),
        createTrade('sell', new Date('2024-01-05'), 9600, 60, 'AAVE'),
        createTrade('sell', new Date('2024-01-10'), 11200, 30, 'AAVE'),
      ];

      const pattern = recognizer.detectDistribution(trades);

      expect(pattern).not.toBeNull();
      expect(pattern?.type).toBe('distribution');
      expect(pattern?.trades.length).toBe(3);
      expect(pattern?.confidence).toBeGreaterThan(50);
      expect(pattern?.durationHours).toBeGreaterThan(7 * 24);
    });

    it('should return null if less than 3 sell trades', () => {
      const trades: Trade[] = [
        createTrade('sell', new Date('2024-01-01'), 8000, 50, 'AAVE'),
        createTrade('sell', new Date('2024-01-05'), 9600, 60, 'AAVE'),
      ];

      const pattern = recognizer.detectDistribution(trades);

      expect(pattern).toBeNull();
    });

    it('should return null if timespan is less than 7 days', () => {
      const trades: Trade[] = [
        createTrade('sell', new Date('2024-01-01'), 8000, 50, 'AAVE'),
        createTrade('sell', new Date('2024-01-02'), 9600, 60, 'AAVE'),
        createTrade('sell', new Date('2024-01-03'), 11200, 70, 'AAVE'),
      ];

      const pattern = recognizer.detectDistribution(trades);

      expect(pattern).toBeNull();
    });

    it('should return null if position decrease is less than 50%', () => {
      const trades: Trade[] = [
        createTrade('sell', new Date('2024-01-01'), 8000, 100, 'AAVE'),
        createTrade('sell', new Date('2024-01-05'), 9600, 95, 'AAVE'),
        createTrade('sell', new Date('2024-01-10'), 11200, 90, 'AAVE'),
      ];

      const pattern = recognizer.detectDistribution(trades);

      expect(pattern).toBeNull();
    });
  });

  // ============================================================================
  // Rotation Pattern Tests
  // ============================================================================

  describe('detectRotation', () => {
    it('should detect rotation pattern with 2+ tokens in <24h', () => {
      const now = new Date();
      const trades: Trade[] = [
        createRotationTrade('swap', new Date(now.getTime()), 20000, 'WETH'),
        createRotationTrade('swap', new Date(now.getTime() + 3 * 60 * 60 * 1000), 20100, 'DAI'),
        createRotationTrade('swap', new Date(now.getTime() + 6 * 60 * 60 * 1000), 20050, 'USDT'),
      ];

      const pattern = recognizer.detectRotation(trades);

      expect(pattern).not.toBeNull();
      expect(pattern?.type).toBe('rotation');
      expect(pattern?.trades.length).toBe(3);
      expect(pattern?.confidence).toBeGreaterThan(50);
      expect(pattern?.durationHours).toBeLessThan(24);
    });

    it('should return null if less than 2 unique tokens', () => {
      const now = new Date();
      const trades: Trade[] = [
        createTrade('swap', new Date(now.getTime()), 20000, 9.8, 'WETH', 'USDC'),
        createTrade('swap', new Date(now.getTime() + 3 * 60 * 60 * 1000), 20000, 9.9, 'WETH', 'USDC'),
      ];

      const pattern = recognizer.detectRotation(trades);

      expect(pattern).toBeNull();
    });

    it('should return null if timespan is more than 24 hours', () => {
      const now = new Date();
      const trades: Trade[] = [
        createTrade('swap', new Date(now.getTime()), 20000, 9.8, 'WETH', 'USDC'),
        createTrade('swap', new Date(now.getTime() + 25 * 60 * 60 * 1000), 20000, 20100, 'DAI', 'WETH'),
      ];

      const pattern = recognizer.detectRotation(trades);

      expect(pattern).toBeNull();
    });

    it('should return null if value similarity is less than 80%', () => {
      const now = new Date();
      const trades: Trade[] = [
        createTrade('swap', new Date(now.getTime()), 20000, 9.8, 'WETH', 'USDC'),
        createTrade('swap', new Date(now.getTime() + 3 * 60 * 60 * 1000), 5000, 5100, 'DAI', 'WETH'),
      ];

      const pattern = recognizer.detectRotation(trades);

      expect(pattern).toBeNull();
    });
  });

  // ============================================================================
  // Arbitrage Pattern Tests
  // ============================================================================

  describe('detectArbitrage', () => {
    it('should detect arbitrage pattern with cross-DEX trades in <5min', () => {
      const now = new Date();
      const trades: Trade[] = [
        createTradeWithDex('buy', new Date(now.getTime()), 50000, 24.5, 'WETH', 'Uniswap', 0),
        createTradeWithDex('sell', new Date(now.getTime() + 1 * 60 * 1000), 50500, 24.5, 'WETH', 'Sushiswap', 500),
      ];

      const pattern = recognizer.detectArbitrage(trades);

      expect(pattern).not.toBeNull();
      expect(pattern?.type).toBe('arbitrage');
      expect(pattern?.trades.length).toBe(2);
      expect(pattern?.confidence).toBeGreaterThan(50);
      expect(pattern?.durationHours).toBeLessThan(5 / 60);
      expect(pattern?.realizedPnl).toBeGreaterThan(0);
    });

    it('should return null if less than 2 trades', () => {
      const now = new Date();
      const trades: Trade[] = [
        createTradeWithDex('buy', new Date(now.getTime()), 50000, 24.5, 'WETH', 'Uniswap', 0),
      ];

      const pattern = recognizer.detectArbitrage(trades);

      expect(pattern).toBeNull();
    });

    it('should return null if timespan is more than 5 minutes', () => {
      const now = new Date();
      const trades: Trade[] = [
        createTradeWithDex('buy', new Date(now.getTime()), 50000, 24.5, 'WETH', 'Uniswap', 0),
        createTradeWithDex('sell', new Date(now.getTime() + 6 * 60 * 1000), 50500, 24.5, 'WETH', 'Sushiswap', 500),
      ];

      const pattern = recognizer.detectArbitrage(trades);

      expect(pattern).toBeNull();
    });

    it('should return null if not cross-DEX', () => {
      const now = new Date();
      const trades: Trade[] = [
        createTradeWithDex('buy', new Date(now.getTime()), 50000, 24.5, 'WETH', 'Uniswap', 0),
        createTradeWithDex('sell', new Date(now.getTime() + 1 * 60 * 1000), 50500, 24.5, 'WETH', 'Uniswap', 500),
      ];

      const pattern = recognizer.detectArbitrage(trades);

      expect(pattern).toBeNull();
    });

    it('should return null if profit is zero or negative', () => {
      const now = new Date();
      const trades: Trade[] = [
        createTradeWithDex('buy', new Date(now.getTime()), 50000, 24.5, 'WETH', 'Uniswap', 0),
        createTradeWithDex('sell', new Date(now.getTime() + 1 * 60 * 1000), 49500, 24.5, 'WETH', 'Sushiswap', -500),
      ];

      const pattern = recognizer.detectArbitrage(trades);

      expect(pattern).toBeNull();
    });
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  function createTrade(
    type: 'buy' | 'sell' | 'swap',
    timestamp: Date,
    tradeSizeUsd: number,
    tokenAmount: number,
    tokenSymbol: string,
    tokenInSymbol: string = 'USDC'
  ): Trade {
    return {
      id: `trade-${Math.random()}`,
      walletId: 'wallet-1',
      txHash: `0x${Math.random().toString(16).substring(2)}`,
      timestamp,
      tradeType: type,
      tokenInAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      tokenInSymbol,
      tokenInAmount: type === 'sell' ? tokenAmount : tradeSizeUsd,
      tokenInValueUsd: tradeSizeUsd,
      tokenOutAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      tokenOutSymbol: tokenSymbol,
      tokenOutAmount: type === 'buy' ? tokenAmount : tradeSizeUsd,
      tokenOutValueUsd: tradeSizeUsd,
      protocolId: 'uniswap-v3',
      protocolName: 'Uniswap V3',
      dexName: 'Uniswap',
      tradeSizeUsd,
      realizedPnl: type === 'sell' ? tradeSizeUsd * 0.15 : 0,
      unrealizedPnl: type === 'buy' ? tradeSizeUsd * 0.05 : 0,
      roi: type === 'sell' ? 15.0 : 5.0,
    };
  }

  function createTradeWithDex(
    type: 'buy' | 'sell' | 'swap',
    timestamp: Date,
    tradeSizeUsd: number,
    tokenAmount: number,
    tokenSymbol: string,
    dexName: string,
    realizedPnl: number
  ): Trade {
    return {
      id: `trade-${Math.random()}`,
      walletId: 'wallet-1',
      txHash: `0x${Math.random().toString(16).substring(2)}`,
      timestamp,
      tradeType: type,
      tokenInAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      tokenInSymbol: 'USDC',
      tokenInAmount: type === 'sell' ? tokenAmount : tradeSizeUsd,
      tokenInValueUsd: tradeSizeUsd,
      tokenOutAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      tokenOutSymbol: tokenSymbol,
      tokenOutAmount: type === 'buy' ? tokenAmount : tradeSizeUsd,
      tokenOutValueUsd: tradeSizeUsd,
      protocolId: dexName.toLowerCase(),
      protocolName: dexName,
      dexName,
      tradeSizeUsd,
      realizedPnl,
      unrealizedPnl: 0,
      roi: (realizedPnl / tradeSizeUsd) * 100,
    };
  }

  function createRotationTrade(
    type: 'buy' | 'sell' | 'swap',
    timestamp: Date,
    tradeSizeUsd: number,
    tokenSymbol: string
  ): Trade {
    const tokenAddresses: Record<string, string> = {
      'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    };

    return {
      id: `trade-${Math.random()}`,
      walletId: 'wallet-1',
      txHash: `0x${Math.random().toString(16).substring(2)}`,
      timestamp,
      tradeType: type,
      tokenInAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      tokenInSymbol: 'USDC',
      tokenInAmount: tradeSizeUsd,
      tokenInValueUsd: tradeSizeUsd,
      tokenOutAddress: tokenAddresses[tokenSymbol] || '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      tokenOutSymbol: tokenSymbol,
      tokenOutAmount: tradeSizeUsd,
      tokenOutValueUsd: tradeSizeUsd,
      protocolId: 'uniswap-v3',
      protocolName: 'Uniswap V3',
      dexName: 'Uniswap',
      tradeSizeUsd,
      realizedPnl: 0,
      unrealizedPnl: 0,
      roi: 0,
    };
  }
});

