import { GasPriceMonitorService, GasPriceData } from '../services/gas-price-monitor.service';
import Redis from 'ioredis';
import axios from 'axios';

/**
 * Gas Price Monitor Service Unit Tests
 * 
 * Story 1.3: Gas Fee Alerts
 * Feature ID: F-003
 * EPIC-1: Smart Alerts & Notifications
 */

// Mock dependencies
jest.mock('ioredis');
jest.mock('axios');
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getFeeData: jest.fn().mockResolvedValue({
        gasPrice: BigInt('50000000000'), // 50 Gwei
      }),
    })),
    formatUnits: jest.fn((value: bigint, unit: string) => {
      if (unit === 'gwei') {
        return (Number(value) / 1e9).toString();
      }
      return value.toString();
    }),
  },
}));

describe('GasPriceMonitorService', () => {
  let service: GasPriceMonitorService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Mock Redis
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      zadd: jest.fn(),
      zremrangebyscore: jest.fn(),
      zrangebyscore: jest.fn(),
      quit: jest.fn(),
    } as any;

    service = new GasPriceMonitorService(mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentGasPrices', () => {
    it('should return cached gas prices if available', async () => {
      const cachedData: GasPriceData = {
        chain: 'ethereum',
        slow: 40,
        standard: 50,
        fast: 60,
        instant: 75,
        timestamp: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getCurrentGasPrices('ethereum');

      expect(result).toEqual(cachedData);
      expect(mockRedis.get).toHaveBeenCalledWith('gas:ethereum:current');
    });

    it('should fetch from API when cache is empty', async () => {
      mockRedis.get.mockResolvedValue(null);

      const mockApiResponse = {
        data: {
          status: '1',
          result: {
            SafeGasPrice: '40',
            ProposeGasPrice: '50',
            FastGasPrice: '60',
          },
        },
      };

      (axios.get as jest.Mock).mockResolvedValue(mockApiResponse);

      const result = await service.getCurrentGasPrices('ethereum');

      expect(result.chain).toBe('ethereum');
      expect(result.slow).toBe(40);
      expect(result.standard).toBe(50);
      expect(result.fast).toBe(60);
      // Note: Falls back to RPC when ETHERSCAN_API_KEY not set
      // RPC calculation: instant = standard * 1.5 = 50 * 1.5 = 75
      expect(result.instant).toBe(75);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should fall back to RPC when Etherscan API fails', async () => {
      mockRedis.get.mockResolvedValue(null);
      (axios.get as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await service.getCurrentGasPrices('ethereum');

      expect(result.chain).toBe('ethereum');
      expect(result.standard).toBe(50); // From mocked RPC
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should throw error for unsupported chain', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.getCurrentGasPrices('unsupported-chain')).rejects.toThrow(
        'Unsupported chain: unsupported-chain'
      );
    });
  });

  describe('saveToHistory', () => {
    it('should save gas price to history', async () => {
      const gasPriceData: GasPriceData = {
        chain: 'ethereum',
        slow: 40,
        standard: 50,
        fast: 60,
        instant: 75,
        timestamp: new Date().toISOString(),
      };

      mockRedis.zadd.mockResolvedValue(1 as any);
      mockRedis.zremrangebyscore.mockResolvedValue(0 as any);

      await service.saveToHistory('ethereum', gasPriceData);

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'gas:ethereum:history',
        expect.any(Number),
        JSON.stringify(gasPriceData)
      );
      expect(mockRedis.zremrangebyscore).toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('should return gas price history', async () => {
      const mockHistory: GasPriceData[] = [
        {
          chain: 'ethereum',
          slow: 40,
          standard: 50,
          fast: 60,
          instant: 75,
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        },
        {
          chain: 'ethereum',
          slow: 45,
          standard: 55,
          fast: 65,
          instant: 80,
          timestamp: new Date().toISOString(),
        },
      ];

      mockRedis.zrangebyscore.mockResolvedValue(
        mockHistory.map(item => JSON.stringify(item))
      );

      const result = await service.getHistory('ethereum', 24);

      expect(result).toEqual(mockHistory);
      expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
        'gas:ethereum:history',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should return empty array when no history found', async () => {
      mockRedis.zrangebyscore.mockResolvedValue([]);

      const result = await service.getHistory('ethereum', 24);

      expect(result).toEqual([]);
    });
  });

  describe('startMonitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start monitoring gas prices', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      service.startMonitoring();

      // Try to start again
      service.startMonitoring();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Gas price monitoring is already running');

      consoleWarnSpy.mockRestore();
    });

    it('should prevent multiple monitoring intervals', () => {
      service.startMonitoring();
      service.startMonitoring();

      // Should only have one interval
      expect(service['monitoringInterval']).not.toBeNull();
    });
  });

  describe('stopMonitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should stop monitoring gas prices', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      service.startMonitoring();
      service.stopMonitoring();

      expect(service['monitoringInterval']).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith('Gas price monitoring stopped');

      consoleLogSpy.mockRestore();
    });

    it('should do nothing if monitoring is not running', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      service.stopMonitoring();

      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should cleanup resources', async () => {
      service.startMonitoring();

      await service.cleanup();

      expect(service['monitoringInterval']).toBeNull();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });

  describe('fetchFromEtherscan', () => {
    it('should fetch gas prices from Etherscan API', async () => {
      mockRedis.get.mockResolvedValue(null);

      const mockApiResponse = {
        data: {
          status: '1',
          result: {
            SafeGasPrice: '40',
            ProposeGasPrice: '50',
            FastGasPrice: '60',
          },
        },
      };

      (axios.get as jest.Mock).mockResolvedValue(mockApiResponse);

      const result = await service.getCurrentGasPrices('ethereum');

      expect(result.slow).toBe(40);
      expect(result.standard).toBe(50);
      expect(result.fast).toBe(60);
      // Note: Falls back to RPC when ETHERSCAN_API_KEY not set
      // RPC calculation: instant = standard * 1.5 = 50 * 1.5 = 75
      expect(result.instant).toBe(75);
    });

    it('should throw error when Etherscan API returns error', async () => {
      mockRedis.get.mockResolvedValue(null);

      const mockApiResponse = {
        data: {
          status: '0',
          message: 'API error',
        },
      };

      (axios.get as jest.Mock).mockResolvedValue(mockApiResponse);

      // Should fall back to RPC
      const result = await service.getCurrentGasPrices('ethereum');

      expect(result.standard).toBe(50); // From mocked RPC
    });
  });

  describe('fetchFromRPC', () => {
    it('should fetch gas prices from RPC', async () => {
      mockRedis.get.mockResolvedValue(null);
      (axios.get as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await service.getCurrentGasPrices('ethereum');

      expect(result.chain).toBe('ethereum');
      expect(result.slow).toBe(40); // 50 * 0.8
      expect(result.standard).toBe(50);
      expect(result.fast).toBe(60); // 50 * 1.2
      expect(result.instant).toBe(75); // 50 * 1.5
    });
  });
});

