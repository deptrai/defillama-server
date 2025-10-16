/**
 * Etherscan Service
 * Story: 3.2.2 - Suspicious Activity Detection - Enhancement 1
 * Phase: Blockchain Data Integration
 * 
 * Provides integration with Etherscan API for blockchain data retrieval
 */

import axios, { AxiosInstance } from 'axios';
import Redis from 'ioredis';

// ============================================================================
// Types
// ============================================================================

export interface EtherscanTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  timeStamp: string;
  blockNumber: string;
  isError: string;
  input: string;
}

export interface EtherscanTokenTransfer {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
  timeStamp: string;
  blockNumber: string;
}

export interface EtherscanContractEvent {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  timeStamp: string;
  gasPrice: string;
  gasUsed: string;
  logIndex: string;
  transactionHash: string;
  transactionIndex: string;
}

export interface WalletBalance {
  address: string;
  balance: string;
  timestamp: number;
}

export interface LiquidityData {
  protocol_id: string;
  pool_address: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  total_supply: string;
  timestamp: number;
}

// ============================================================================
// Etherscan Service
// ============================================================================

export class EtherscanService {
  private static instance: EtherscanService;
  private client: AxiosInstance;
  private redis: Redis;
  private apiKey: string;
  private baseUrl: string;
  private rateLimitDelay: number = 200; // 5 requests per second
  private lastRequestTime: number = 0;

  private constructor() {
    this.apiKey = process.env.ETHERSCAN_API_KEY || '';
    this.baseUrl = process.env.ETHERSCAN_BASE_URL || 'https://api.etherscan.io/api';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    // Initialize Redis for caching
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    });
  }

  public static getInstance(): EtherscanService {
    if (!EtherscanService.instance) {
      EtherscanService.instance = new EtherscanService();
    }
    return EtherscanService.instance;
  }

  /**
   * Rate limiting to avoid API limits
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get cached data or fetch from API
   */
  private async getCached<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300 // 5 minutes default
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from API
      const data = await fetchFn();

      // Store in cache
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data));

      return data;
    } catch (error) {
      console.error('Cache error:', error);
      // Fallback to direct fetch
      return await fetchFn();
    }
  }

  /**
   * Get normal transactions for an address
   */
  public async getTransactions(
    address: string,
    startBlock: number = 0,
    endBlock: number = 99999999,
    page: number = 1,
    offset: number = 100
  ): Promise<EtherscanTransaction[]> {
    const cacheKey = `etherscan:txs:${address}:${startBlock}:${endBlock}:${page}:${offset}`;

    return this.getCached(cacheKey, async () => {
      await this.rateLimit();

      const response = await this.client.get('', {
        params: {
          module: 'account',
          action: 'txlist',
          address,
          startblock: startBlock,
          endblock: endBlock,
          page,
          offset,
          sort: 'desc',
          apikey: this.apiKey,
        },
      });

      if (response.data.status !== '1') {
        throw new Error(`Etherscan API error: ${response.data.message}`);
      }

      return response.data.result;
    }, 300); // 5 minutes cache
  }

  /**
   * Get ERC20 token transfers for an address
   */
  public async getTokenTransfers(
    address: string,
    contractAddress?: string,
    startBlock: number = 0,
    endBlock: number = 99999999,
    page: number = 1,
    offset: number = 100
  ): Promise<EtherscanTokenTransfer[]> {
    const cacheKey = `etherscan:token-txs:${address}:${contractAddress || 'all'}:${startBlock}:${endBlock}:${page}:${offset}`;

    return this.getCached(cacheKey, async () => {
      await this.rateLimit();

      const params: any = {
        module: 'account',
        action: 'tokentx',
        address,
        startblock: startBlock,
        endblock: endBlock,
        page,
        offset,
        sort: 'desc',
        apikey: this.apiKey,
      };

      if (contractAddress) {
        params.contractaddress = contractAddress;
      }

      const response = await this.client.get('', { params });

      if (response.data.status !== '1') {
        throw new Error(`Etherscan API error: ${response.data.message}`);
      }

      return response.data.result;
    }, 300); // 5 minutes cache
  }

  /**
   * Get contract event logs
   */
  public async getContractEvents(
    contractAddress: string,
    fromBlock: number,
    toBlock: number,
    topic0?: string
  ): Promise<EtherscanContractEvent[]> {
    const cacheKey = `etherscan:events:${contractAddress}:${fromBlock}:${toBlock}:${topic0 || 'all'}`;

    return this.getCached(cacheKey, async () => {
      await this.rateLimit();

      const params: any = {
        module: 'logs',
        action: 'getLogs',
        address: contractAddress,
        fromBlock,
        toBlock,
        apikey: this.apiKey,
      };

      if (topic0) {
        params.topic0 = topic0;
      }

      const response = await this.client.get('', { params });

      if (response.data.status !== '1') {
        throw new Error(`Etherscan API error: ${response.data.message}`);
      }

      return response.data.result;
    }, 300); // 5 minutes cache
  }

  /**
   * Get wallet balance
   */
  public async getBalance(address: string): Promise<WalletBalance> {
    const cacheKey = `etherscan:balance:${address}`;

    return this.getCached(cacheKey, async () => {
      await this.rateLimit();

      const response = await this.client.get('', {
        params: {
          module: 'account',
          action: 'balance',
          address,
          tag: 'latest',
          apikey: this.apiKey,
        },
      });

      if (response.data.status !== '1') {
        throw new Error(`Etherscan API error: ${response.data.message}`);
      }

      return {
        address,
        balance: response.data.result,
        timestamp: Date.now(),
      };
    }, 60); // 1 minute cache
  }

  /**
   * Get multiple wallet balances
   */
  public async getBalances(addresses: string[]): Promise<WalletBalance[]> {
    // Etherscan supports up to 20 addresses per request
    const chunks = [];
    for (let i = 0; i < addresses.length; i += 20) {
      chunks.push(addresses.slice(i, i + 20));
    }

    const results: WalletBalance[] = [];
    for (const chunk of chunks) {
      const cacheKey = `etherscan:balances:${chunk.join(',')}`;

      const balances = await this.getCached(cacheKey, async () => {
        await this.rateLimit();

        const response = await this.client.get('', {
          params: {
            module: 'account',
            action: 'balancemulti',
            address: chunk.join(','),
            tag: 'latest',
            apikey: this.apiKey,
          },
        });

        if (response.data.status !== '1') {
          throw new Error(`Etherscan API error: ${response.data.message}`);
        }

        return response.data.result.map((item: any) => ({
          address: item.account,
          balance: item.balance,
          timestamp: Date.now(),
        }));
      }, 60); // 1 minute cache

      results.push(...balances);
    }

    return results;
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    await this.redis.quit();
  }
}

