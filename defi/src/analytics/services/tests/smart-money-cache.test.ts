/**
 * Unit Tests: SmartMoneyCache
 * Story: 3.1.1 - Smart Money Identification (Enhancement 1)
 */

import { SmartMoneyCache } from '../smart-money-cache';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('SmartMoneyCache', () => {
  let cache: SmartMoneyCache;
  let mockRedis: jest.Mocked<Redis>;

  beforeAll(() => {
    // Create mock Redis instance
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Get cache instance (will reuse singleton with mocked Redis)
    cache = SmartMoneyCache.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SmartMoneyCache.getInstance();
      const instance2 = SmartMoneyCache.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getWalletList', () => {
    it('should return cached data if available', async () => {
      const mockData = {
        data: [
          {
            walletAddress: '0x1234',
            chainId: 'ethereum',
            smartMoneyScore: 85,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await cache.getWalletList({
        chains: ['ethereum'],
        minScore: 80,
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(mockData);
      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining('smart_money:wallets:list')
      );
    });

    it('should return null if cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cache.getWalletList({
        page: 1,
        limit: 20,
      });

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await cache.getWalletList({
        page: 1,
        limit: 20,
      });

      expect(result).toBeNull();
    });
  });

  describe('setWalletList', () => {
    it('should cache wallet list data', async () => {
      const mockData = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockRedis.setex.mockResolvedValue('OK');

      await cache.setWalletList(
        {
          page: 1,
          limit: 20,
        },
        mockData
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('smart_money:wallets:list'),
        5 * 60, // Default TTL
        JSON.stringify(mockData)
      );
    });

    it('should use custom TTL if provided', async () => {
      const mockData = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockRedis.setex.mockResolvedValue('OK');

      await cache.setWalletList(
        {
          page: 1,
          limit: 20,
        },
        mockData,
        { ttl: 600 }
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        600,
        expect.any(String)
      );
    });
  });

  describe('getWalletDetail', () => {
    it('should return cached wallet detail if available', async () => {
      const mockWallet = {
        walletAddress: '0x1234',
        chainId: 'ethereum',
        smartMoneyScore: 85,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockWallet));

      const result = await cache.getWalletDetail('0x1234');

      expect(result).toEqual(mockWallet);
      expect(mockRedis.get).toHaveBeenCalledWith(
        'smart_money:wallets:detail:0x1234'
      );
    });

    it('should return null if cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cache.getWalletDetail('0x1234');

      expect(result).toBeNull();
    });
  });

  describe('setWalletDetail', () => {
    it('should cache wallet detail data', async () => {
      const mockWallet = {
        walletAddress: '0x1234',
        chainId: 'ethereum',
        smartMoneyScore: 85,
      } as any;

      mockRedis.setex.mockResolvedValue('OK');

      await cache.setWalletDetail('0x1234', mockWallet);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'smart_money:wallets:detail:0x1234',
        10 * 60, // Default TTL
        JSON.stringify(mockWallet)
      );
    });
  });

  describe('invalidateWalletLists', () => {
    it('should delete all wallet list cache keys', async () => {
      const mockKeys = [
        'smart_money:wallets:list:key1',
        'smart_money:wallets:list:key2',
      ];

      mockRedis.keys.mockResolvedValue(mockKeys);
      mockRedis.del.mockResolvedValue(2);

      await cache.invalidateWalletLists();

      expect(mockRedis.keys).toHaveBeenCalledWith('smart_money:wallets:list:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...mockKeys);
    });

    it('should handle no keys to delete', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await cache.invalidateWalletLists();

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('invalidateWalletDetail', () => {
    it('should delete specific wallet detail cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      await cache.invalidateWalletDetail('0x1234');

      expect(mockRedis.del).toHaveBeenCalledWith(
        'smart_money:wallets:detail:0x1234'
      );
    });
  });

  describe('invalidateAll', () => {
    it('should delete all cache keys', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2']);
      mockRedis.del.mockResolvedValue(2);

      await cache.invalidateAll();

      expect(mockRedis.keys).toHaveBeenCalledTimes(3); // 3 patterns
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockRedis.keys
        .mockResolvedValueOnce(['list1', 'list2']) // wallet lists
        .mockResolvedValueOnce(['detail1']); // wallet details

      const stats = await cache.getCacheStats();

      expect(stats).toEqual({
        walletListKeys: 2,
        walletDetailKeys: 1,
        totalKeys: 3,
      });
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const stats = await cache.getCacheStats();

      expect(stats).toEqual({
        walletListKeys: 0,
        walletDetailKeys: 0,
        totalKeys: 0,
      });
    });
  });
});

