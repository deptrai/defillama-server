/**
 * Behavioral Analyzer Engine Tests
 * Story: 3.1.2 - Trade Pattern Analysis
 */

import { BehavioralAnalyzer } from '../behavioral-analyzer';
import { Trade } from '../trade-pattern-recognizer';

describe('BehavioralAnalyzer', () => {
  let analyzer: BehavioralAnalyzer;

  beforeAll(() => {
    analyzer = BehavioralAnalyzer.getInstance();
  });

  describe('analyzeTradingStyle', () => {
    it('should classify as scalp for <1 day holding period', () => {
      const trades = createTradesWithHoldingPeriod(0.5);
      const style = analyzer.analyzeTradingStyle(trades);
      expect(style).toBe('scalp');
    });

    it('should classify as day for 1-7 days holding period', () => {
      const trades = createTradesWithHoldingPeriod(3);
      const style = analyzer.analyzeTradingStyle(trades);
      expect(style).toBe('day');
    });

    it('should classify as swing for 7-30 days holding period', () => {
      const trades = createTradesWithHoldingPeriod(15);
      const style = analyzer.analyzeTradingStyle(trades);
      expect(style).toBe('swing');
    });

    it('should classify as position for >30 days holding period', () => {
      const trades = createTradesWithHoldingPeriod(45);
      const style = analyzer.analyzeTradingStyle(trades);
      expect(style).toBe('position');
    });
  });

  describe('analyzeRiskProfile', () => {
    it('should classify as conservative for low variance', () => {
      const trades = createTradesWithVariance(0.2);
      const profile = analyzer.analyzeRiskProfile(trades);
      expect(profile).toBe('conservative');
    });

    it('should classify as moderate for medium variance', () => {
      const trades = createTradesWithVariance(0.5);
      const profile = analyzer.analyzeRiskProfile(trades);
      expect(profile).toBe('moderate');
    });

    it('should classify as aggressive for high variance', () => {
      const trades = createTradesWithVariance(0.8);
      const profile = analyzer.analyzeRiskProfile(trades);
      expect(profile).toBe('aggressive');
    });
  });

  describe('analyzePreferredTokens', () => {
    it('should return top 10 tokens by trade count', () => {
      const trades = createTradesWithMultipleTokens();
      const tokens = analyzer.analyzePreferredTokens(trades);
      
      expect(tokens.length).toBeLessThanOrEqual(10);
      expect(tokens[0].tradeCount).toBeGreaterThanOrEqual(tokens[1]?.tradeCount || 0);
    });

    it('should aggregate trade count and volume per token', () => {
      const trades = [
        createTrade('WETH', 1000),
        createTrade('WETH', 2000),
        createTrade('DAI', 1500),
      ];
      const tokens = analyzer.analyzePreferredTokens(trades);
      
      const weth = tokens.find(t => t.tokenSymbol === 'WETH');
      expect(weth?.tradeCount).toBe(2);
      expect(weth?.totalVolume).toBe(3000);
    });
  });

  describe('analyzePreferredProtocols', () => {
    it('should return top 5 protocols by volume', () => {
      const trades = createTradesWithMultipleProtocols();
      const protocols = analyzer.analyzePreferredProtocols(trades);
      
      expect(protocols.length).toBeLessThanOrEqual(5);
      expect(protocols[0].totalVolume).toBeGreaterThanOrEqual(protocols[1]?.totalVolume || 0);
    });

    it('should aggregate trade count and volume per protocol', () => {
      const trades = [
        createTradeWithProtocol('uniswap', 1000),
        createTradeWithProtocol('uniswap', 2000),
        createTradeWithProtocol('aave', 1500),
      ];
      const protocols = analyzer.analyzePreferredProtocols(trades);
      
      const uniswap = protocols.find(p => p.protocolId === 'uniswap');
      expect(uniswap?.tradeCount).toBe(2);
      expect(uniswap?.totalVolume).toBe(3000);
    });
  });

  describe('analyzeTradeTiming', () => {
    it('should classify trades by ROI into timing categories', () => {
      const trades = [
        createTradeWithROI(15), // exit
        createTradeWithROI(8),  // late
        createTradeWithROI(3),  // mid
        createTradeWithROI(-2), // early
      ];
      const timing = analyzer.analyzeTradeTiming(trades);
      
      expect(timing.exitTrades).toBe(1);
      expect(timing.lateTrades).toBe(1);
      expect(timing.midTrades).toBe(1);
      expect(timing.earlyTrades).toBe(1);
    });
  });

  describe('analyzeTradeSizing', () => {
    it('should calculate avg, min, max trade sizes', () => {
      const trades = [
        createTrade('WETH', 1000),
        createTrade('WETH', 2000),
        createTrade('WETH', 3000),
      ];
      const sizing = analyzer.analyzeTradeSizing(trades);
      
      expect(sizing.avgTradeSize).toBe(2000);
      expect(sizing.minTradeSize).toBe(1000);
      expect(sizing.maxTradeSize).toBe(3000);
    });

    it('should calculate trade size variance', () => {
      const trades = [
        createTrade('WETH', 1000),
        createTrade('WETH', 5000),
      ];
      const sizing = analyzer.analyzeTradeSizing(trades);
      
      expect(sizing.tradeSizeVariance).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  function createTradesWithHoldingPeriod(days: number): Trade[] {
    const now = new Date();
    return [
      createTradeAtTime(new Date(now.getTime())),
      createTradeAtTime(new Date(now.getTime() + days * 24 * 60 * 60 * 1000)),
    ];
  }

  function createTradesWithVariance(targetVariance: number): Trade[] {
    const baseSize = 1000;
    const sizes = targetVariance < 0.3 
      ? [baseSize, baseSize * 1.1, baseSize * 0.9]
      : targetVariance < 0.7
      ? [baseSize, baseSize * 1.5, baseSize * 0.5]
      : [baseSize, baseSize * 3, baseSize * 0.3];
    
    return sizes.map(size => createTrade('WETH', size));
  }

  function createTradesWithMultipleTokens(): Trade[] {
    return [
      createTrade('WETH', 1000),
      createTrade('WETH', 2000),
      createTrade('DAI', 1500),
      createTrade('USDC', 1200),
      createTrade('USDT', 1800),
    ];
  }

  function createTradesWithMultipleProtocols(): Trade[] {
    return [
      createTradeWithProtocol('uniswap', 5000),
      createTradeWithProtocol('aave', 3000),
      createTradeWithProtocol('curve', 2000),
    ];
  }

  function createTrade(tokenSymbol: string, tradeSizeUsd: number): Trade {
    return {
      id: `trade-${Math.random()}`,
      walletId: 'wallet-1',
      txHash: `0x${Math.random().toString(16).substring(2)}`,
      timestamp: new Date(),
      tradeType: 'buy',
      tokenInAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      tokenInSymbol: 'USDC',
      tokenInAmount: tradeSizeUsd,
      tokenInValueUsd: tradeSizeUsd,
      tokenOutAddress: `0x${tokenSymbol.toLowerCase()}`,
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

  function createTradeAtTime(timestamp: Date): Trade {
    return {
      ...createTrade('WETH', 1000),
      timestamp,
    };
  }

  function createTradeWithProtocol(protocolId: string, tradeSizeUsd: number): Trade {
    return {
      ...createTrade('WETH', tradeSizeUsd),
      protocolId,
      protocolName: protocolId.charAt(0).toUpperCase() + protocolId.slice(1),
    };
  }

  function createTradeWithROI(roi: number): Trade {
    return {
      ...createTrade('WETH', 1000),
      roi,
    };
  }
});

