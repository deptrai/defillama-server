/**
 * Unit Tests: PriceFetcher Service
 * Enhancement 1: Real-time Price Fetching
 */

import { PriceFetcher } from '../price-fetcher';

// Mock fetch
global.fetch = jest.fn();

describe('PriceFetcher', () => {
  let priceFetcher: PriceFetcher;

  beforeEach(() => {
    priceFetcher = PriceFetcher.getInstance();
    priceFetcher.clearCache();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PriceFetcher.getInstance();
      const instance2 = PriceFetcher.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getPrice', () => {
    it('should fetch price for a single token', async () => {
      const mockResponse = {
        coins: {
          'ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
            price: 1.0,
            symbol: 'USDC',
            timestamp: Date.now(),
            confidence: 0.99,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const price = await priceFetcher.getPrice(
        'ethereum',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(price).toBe(1.0);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return null for token not found', async () => {
      const mockResponse = {
        coins: {},
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const price = await priceFetcher.getPrice('ethereum', '0xInvalidToken');

      expect(price).toBeNull();
    });

    it('should fetch price for native token', async () => {
      const mockResponse = {
        coins: {
          'ethereum:0x0000000000000000000000000000000000000000': {
            price: 1800.0,
            symbol: 'ETH',
            timestamp: Date.now(),
            confidence: 0.99,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const price = await priceFetcher.getPrice('ethereum', null);

      expect(price).toBe(1800.0);
    });
  });

  describe('getPrices', () => {
    it('should fetch prices for multiple tokens', async () => {
      const mockResponse = {
        coins: {
          'ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
            price: 1.0,
            symbol: 'USDC',
            timestamp: Date.now(),
            confidence: 0.99,
          },
          'ethereum:0x0000000000000000000000000000000000000000': {
            price: 1800.0,
            symbol: 'ETH',
            timestamp: Date.now(),
            confidence: 0.99,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const prices = await priceFetcher.getPrices([
        { chainId: 'ethereum', tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
        { chainId: 'ethereum', tokenAddress: null },
      ]);

      expect(prices['ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48']).toBe(1.0);
      expect(prices['ethereum:native']).toBe(1800.0);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use cache for subsequent requests', async () => {
      const mockResponse = {
        coins: {
          'ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
            price: 1.0,
            symbol: 'USDC',
            timestamp: Date.now(),
            confidence: 0.99,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // First call - should fetch from API
      const prices1 = await priceFetcher.getPrices([
        { chainId: 'ethereum', tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      ]);

      expect(prices1['ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48']).toBe(1.0);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const prices2 = await priceFetcher.getPrices([
        { chainId: 'ethereum', tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      ]);

      expect(prices2['ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48']).toBe(1.0);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, no new API call
    });

    it('should batch tokens into multiple API calls', async () => {
      // Create 60 tokens (should split into 2 batches of 50 and 10)
      const tokens = Array.from({ length: 60 }, (_, i) => ({
        chainId: 'ethereum',
        tokenAddress: `0x${i.toString().padStart(40, '0')}`,
      }));

      const mockResponse1 = {
        coins: Object.fromEntries(
          tokens.slice(0, 50).map((token) => [
            `ethereum:${token.tokenAddress}`,
            { price: 1.0, symbol: 'TOKEN', timestamp: Date.now(), confidence: 0.99 },
          ])
        ),
      };

      const mockResponse2 = {
        coins: Object.fromEntries(
          tokens.slice(50).map((token) => [
            `ethereum:${token.tokenAddress}`,
            { price: 1.0, symbol: 'TOKEN', timestamp: Date.now(), confidence: 0.99 },
          ])
        ),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      const prices = await priceFetcher.getPrices(tokens);

      expect(Object.keys(prices).length).toBe(60);
      expect(global.fetch).toHaveBeenCalledTimes(2); // 2 batches
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const mockResponse = {
        coins: {
          'ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
            price: 1.0,
            symbol: 'USDC',
            timestamp: Date.now(),
            confidence: 0.99,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // Fetch to populate cache
      await priceFetcher.getPrice('ethereum', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      priceFetcher.clearCache();

      // Fetch again - should call API again
      await priceFetcher.getPrice('ethereum', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return cache stats', async () => {
      const mockResponse = {
        coins: {
          'ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
            price: 1.0,
            symbol: 'USDC',
            timestamp: Date.now(),
            confidence: 0.99,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await priceFetcher.getPrice('ethereum', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');

      const stats = priceFetcher.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const price = await priceFetcher.getPrice('ethereum', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');

      expect(price).toBeNull();
    });

    it('should continue with other batches if one fails', async () => {
      const tokens = Array.from({ length: 60 }, (_, i) => ({
        chainId: 'ethereum',
        tokenAddress: `0x${i.toString().padStart(40, '0')}`,
      }));

      // First batch fails, second succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            coins: Object.fromEntries(
              tokens.slice(50).map((token) => [
                `ethereum:${token.tokenAddress}`,
                { price: 1.0, symbol: 'TOKEN', timestamp: Date.now(), confidence: 0.99 },
              ])
            ),
          }),
        });

      const prices = await priceFetcher.getPrices(tokens);

      // Should have prices from second batch only
      expect(Object.keys(prices).length).toBe(10);
    });
  });
});

