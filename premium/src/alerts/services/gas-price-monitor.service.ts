import axios from 'axios';
import Redis from 'ioredis';
import { ethers } from 'ethers';
import { gasAlertTriggerService } from './gas-alert-trigger.service';

/**
 * Gas Price Monitor Service
 *
 * Monitors gas prices across multiple EVM chains
 * Provides real-time gas price data with caching
 *
 * Story 1.3.2: Monitor Gas Prices
 * Feature ID: F-003
 * EPIC-1: Smart Alerts & Notifications
 */

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '1'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Gas price data interface
export interface GasPriceData {
  chain: string;
  slow: number;       // Gwei
  standard: number;   // Gwei
  fast: number;       // Gwei
  instant: number;    // Gwei
  timestamp: string;
}

// Chain configuration
interface ChainConfig {
  name: string;
  rpcUrl: string;
  etherscanApiKey?: string;
  etherscanApiUrl?: string;
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com',
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    etherscanApiUrl: 'https://api.etherscan.io/api',
  },
  bsc: {
    name: 'BSC',
    rpcUrl: process.env.BSC_RPC || 'https://bsc-dataseed.binance.org',
    etherscanApiKey: process.env.BSCSCAN_API_KEY,
    etherscanApiUrl: 'https://api.bscscan.com/api',
  },
  polygon: {
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC || 'https://polygon-rpc.com',
    etherscanApiKey: process.env.POLYGONSCAN_API_KEY,
    etherscanApiUrl: 'https://api.polygonscan.com/api',
  },
  arbitrum: {
    name: 'Arbitrum',
    rpcUrl: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
    etherscanApiKey: process.env.ARBISCAN_API_KEY,
    etherscanApiUrl: 'https://api.arbiscan.io/api',
  },
  optimism: {
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC || 'https://mainnet.optimism.io',
    etherscanApiKey: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
    etherscanApiUrl: 'https://api-optimistic.etherscan.io/api',
  },
  avalanche: {
    name: 'Avalanche',
    rpcUrl: process.env.AVALANCHE_RPC || 'https://api.avax.network/ext/bc/C/rpc',
    etherscanApiKey: process.env.SNOWTRACE_API_KEY,
    etherscanApiUrl: 'https://api.snowtrace.io/api',
  },
  fantom: {
    name: 'Fantom',
    rpcUrl: process.env.FANTOM_RPC || 'https://rpc.ftm.tools',
    etherscanApiKey: process.env.FTMSCAN_API_KEY,
    etherscanApiUrl: 'https://api.ftmscan.com/api',
  },
  base: {
    name: 'Base',
    rpcUrl: process.env.BASE_RPC || 'https://mainnet.base.org',
    etherscanApiKey: process.env.BASESCAN_API_KEY,
    etherscanApiUrl: 'https://api.basescan.org/api',
  },
  linea: {
    name: 'Linea',
    rpcUrl: process.env.LINEA_RPC || 'https://rpc.linea.build',
  },
  scroll: {
    name: 'Scroll',
    rpcUrl: process.env.SCROLL_RPC || 'https://rpc.scroll.io',
  },
};

export class GasPriceMonitorService {
  private redis: Redis;
  private providers: Map<string, ethers.JsonRpcProvider>;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(redisClient?: Redis) {
    this.redis = redisClient || redis;
    this.providers = new Map();

    // Initialize providers for all chains
    for (const [chain, config] of Object.entries(CHAIN_CONFIGS)) {
      this.providers.set(chain, new ethers.JsonRpcProvider(config.rpcUrl));
    }
  }

  /**
   * Get current gas prices for a chain
   * 
   * @param chain - Chain name
   * @returns Gas price data
   */
  async getCurrentGasPrices(chain: string): Promise<GasPriceData> {
    // Check cache first
    const cached = await this.getFromCache(chain);
    if (cached) {
      return cached;
    }
    
    // Fetch from API/RPC
    const gasPrices = await this.fetchGasPrices(chain);
    
    // Cache for 10 seconds
    await this.saveToCache(chain, gasPrices, 10);
    
    return gasPrices;
  }

  /**
   * Fetch gas prices from API or RPC
   * 
   * @param chain - Chain name
   * @returns Gas price data
   */
  private async fetchGasPrices(chain: string): Promise<GasPriceData> {
    const config = CHAIN_CONFIGS[chain];
    if (!config) {
      throw new Error(`Unsupported chain: ${chain}`);
    }
    
    // Try Etherscan API first (if available)
    if (config.etherscanApiKey && config.etherscanApiUrl) {
      try {
        return await this.fetchFromEtherscan(chain, config);
      } catch (error) {
        console.warn(`Failed to fetch gas prices from Etherscan for ${chain}:`, error);
        // Fall back to RPC
      }
    }
    
    // Fall back to RPC
    return await this.fetchFromRPC(chain);
  }

  /**
   * Fetch gas prices from Etherscan API
   * 
   * @param chain - Chain name
   * @param config - Chain configuration
   * @returns Gas price data
   */
  private async fetchFromEtherscan(chain: string, config: ChainConfig): Promise<GasPriceData> {
    const response = await axios.get(config.etherscanApiUrl!, {
      params: {
        module: 'gastracker',
        action: 'gasoracle',
        apikey: config.etherscanApiKey,
      },
      timeout: 5000,
    });
    
    if (response.data.status !== '1') {
      throw new Error(`Etherscan API error: ${response.data.message}`);
    }
    
    const result = response.data.result;
    
    return {
      chain,
      slow: parseFloat(result.SafeGasPrice),
      standard: parseFloat(result.ProposeGasPrice),
      fast: parseFloat(result.FastGasPrice),
      instant: parseFloat(result.FastGasPrice) * 1.2, // Estimate instant as 20% higher than fast
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fetch gas prices from RPC
   * 
   * @param chain - Chain name
   * @returns Gas price data
   */
  private async fetchFromRPC(chain: string): Promise<GasPriceData> {
    const provider = this.providers.get(chain);
    if (!provider) {
      throw new Error(`No provider for chain: ${chain}`);
    }
    
    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    
    // Convert to Gwei
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Estimate different speeds (simple heuristic)
    return {
      chain,
      slow: gasPriceGwei * 0.8,      // 80% of current
      standard: gasPriceGwei,         // Current
      fast: gasPriceGwei * 1.2,       // 120% of current
      instant: gasPriceGwei * 1.5,    // 150% of current
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get gas prices from cache
   * 
   * @param chain - Chain name
   * @returns Cached gas price data or null
   */
  private async getFromCache(chain: string): Promise<GasPriceData | null> {
    const key = `gas:${chain}:current`;
    const cached = await this.redis.get(key);
    
    if (!cached) {
      return null;
    }
    
    return JSON.parse(cached);
  }

  /**
   * Save gas prices to cache
   * 
   * @param chain - Chain name
   * @param data - Gas price data
   * @param ttlSeconds - TTL in seconds
   */
  private async saveToCache(chain: string, data: GasPriceData, ttlSeconds: number): Promise<void> {
    const key = `gas:${chain}:current`;
    await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
  }

  /**
   * Save gas price to history
   * 
   * @param chain - Chain name
   * @param data - Gas price data
   */
  async saveToHistory(chain: string, data: GasPriceData): Promise<void> {
    const key = `gas:${chain}:history`;
    const timestamp = Date.now();
    
    // Add to sorted set (score = timestamp)
    await this.redis.zadd(key, timestamp, JSON.stringify(data));
    
    // Keep only last 7 days
    const sevenDaysAgo = timestamp - (7 * 24 * 60 * 60 * 1000);
    await this.redis.zremrangebyscore(key, '-inf', sevenDaysAgo);
  }

  /**
   * Get gas price history
   * 
   * @param chain - Chain name
   * @param hours - Number of hours to retrieve (default: 24)
   * @returns Gas price history
   */
  async getHistory(chain: string, hours: number = 24): Promise<GasPriceData[]> {
    const key = `gas:${chain}:history`;
    const now = Date.now();
    const startTime = now - (hours * 60 * 60 * 1000);
    
    // Get data from sorted set
    const data = await this.redis.zrangebyscore(key, startTime, now);
    
    return data.map(item => JSON.parse(item));
  }

  /**
   * Start monitoring gas prices
   *
   * Fetches gas prices every 10 seconds and saves to cache/history
   */
  startMonitoring(): void {
    // Prevent multiple monitoring intervals
    if (this.monitoringInterval) {
      console.warn('Gas price monitoring is already running');
      return;
    }

    this.monitoringInterval = setInterval(async () => {
      for (const chain of Object.keys(CHAIN_CONFIGS)) {
        try {
          const gasPrices = await this.fetchGasPrices(chain);
          await this.saveToCache(chain, gasPrices, 10);
          await this.saveToHistory(chain, gasPrices);

          // Check gas alerts for this chain
          await gasAlertTriggerService.checkAlerts(chain, gasPrices);
        } catch (error) {
          console.error(`Failed to monitor gas prices for ${chain}:`, error);
        }
      }
    }, 10000); // 10 seconds
  }

  /**
   * Stop monitoring gas prices
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Gas price monitoring stopped');
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopMonitoring();
    await this.redis.quit();
  }
}

// Export singleton instance
export const gasPriceMonitorService = new GasPriceMonitorService();

