/**
 * Price Fetcher Service
 * Enhancement 1: Real-time Price Fetching for Cross-chain Portfolio
 * 
 * Fetches real-time token prices from DeFiLlama Coins API
 * Implements caching with 5-min TTL to reduce API calls
 */

interface TokenPrice {
  price: number;
  symbol: string;
  timestamp: number;
  confidence: number;
}

interface PriceResponse {
  coins: Record<string, TokenPrice>;
}

interface CachedPrice {
  price: number;
  symbol: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * PriceFetcher - Singleton service for fetching token prices
 */
export class PriceFetcher {
  private static instance: PriceFetcher;
  private cache: Map<string, CachedPrice> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly API_BASE_URL = 'https://coins.llama.fi/prices';
  private readonly BATCH_SIZE = 50; // Max tokens per API call

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): PriceFetcher {
    if (!PriceFetcher.instance) {
      PriceFetcher.instance = new PriceFetcher();
    }
    return PriceFetcher.instance;
  }

  /**
   * Get price for a single token
   * @param chainId - Chain ID (e.g., 'ethereum', 'polygon')
   * @param tokenAddress - Token contract address (null for native tokens)
   * @returns Price in USD or null if not found
   */
  public async getPrice(
    chainId: string,
    tokenAddress: string | null
  ): Promise<number | null> {
    const prices = await this.getPrices([{ chainId, tokenAddress }]);
    const key = this.buildTokenKey(chainId, tokenAddress);
    return prices[key] ?? null;
  }

  /**
   * Get prices for multiple tokens in batch
   * @param tokens - Array of {chainId, tokenAddress}
   * @returns Map of token key to price
   */
  public async getPrices(
    tokens: Array<{ chainId: string; tokenAddress: string | null }>
  ): Promise<Record<string, number>> {
    const now = Date.now();
    const result: Record<string, number> = {};
    const tokensToFetch: Array<{ chainId: string; tokenAddress: string | null }> = [];

    // Check cache first
    for (const token of tokens) {
      const key = this.buildTokenKey(token.chainId, token.tokenAddress);
      const cached = this.cache.get(key);

      if (cached && cached.expiresAt > now) {
        // Cache hit
        result[key] = cached.price;
      } else {
        // Cache miss or expired
        tokensToFetch.push(token);
      }
    }

    // Fetch missing prices from API
    if (tokensToFetch.length > 0) {
      const fetchedPrices = await this.fetchPricesFromAPI(tokensToFetch);
      Object.assign(result, fetchedPrices);
    }

    return result;
  }

  /**
   * Fetch prices from DeFiLlama Coins API
   */
  private async fetchPricesFromAPI(
    tokens: Array<{ chainId: string; tokenAddress: string | null }>
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    // Split into batches
    const batches = this.splitIntoBatches(tokens, this.BATCH_SIZE);

    // Fetch each batch
    for (const batch of batches) {
      try {
        const batchResult = await this.fetchBatch(batch);
        Object.assign(result, batchResult);
      } catch (error: any) {
        console.error('Error fetching price batch:', error.message);
        // Continue with next batch even if one fails
      }
    }

    return result;
  }

  /**
   * Fetch a single batch of prices
   */
  private async fetchBatch(
    tokens: Array<{ chainId: string; tokenAddress: string | null }>
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    // Build API query string
    const coinIds = tokens
      .map((token) => this.buildCoinId(token.chainId, token.tokenAddress))
      .join(',');

    const url = `${this.API_BASE_URL}/current/${coinIds}`;

    // Fetch from API
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data: PriceResponse = await response.json();

    // Process response and update cache
    const now = Date.now();
    for (const token of tokens) {
      const coinId = this.buildCoinId(token.chainId, token.tokenAddress);
      const priceData = data.coins[coinId];

      if (priceData && priceData.price) {
        const key = this.buildTokenKey(token.chainId, token.tokenAddress);
        result[key] = priceData.price;

        // Update cache
        this.cache.set(key, {
          price: priceData.price,
          symbol: priceData.symbol,
          timestamp: priceData.timestamp,
          expiresAt: now + this.CACHE_TTL,
        });
      }
    }

    return result;
  }

  /**
   * Build coin ID for DeFiLlama API (format: "chain:address")
   */
  private buildCoinId(chainId: string, tokenAddress: string | null): string {
    if (!tokenAddress) {
      // Native token - use chain-specific format
      const nativeTokenMap: Record<string, string> = {
        ethereum: 'ethereum:0x0000000000000000000000000000000000000000',
        polygon: 'polygon:0x0000000000000000000000000000000000001010',
        arbitrum: 'arbitrum:0x0000000000000000000000000000000000000000',
        optimism: 'optimism:0x0000000000000000000000000000000000000000',
        bsc: 'bsc:0x0000000000000000000000000000000000000000',
        avalanche: 'avax:0x0000000000000000000000000000000000000000',
      };
      return nativeTokenMap[chainId] || `${chainId}:0x0000000000000000000000000000000000000000`;
    }

    return `${chainId}:${tokenAddress}`;
  }

  /**
   * Build internal cache key
   */
  private buildTokenKey(chainId: string, tokenAddress: string | null): string {
    return `${chainId}:${tokenAddress || 'native'}`;
  }

  /**
   * Split array into batches
   */
  private splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Clear cache (for testing)
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats (for monitoring)
   */
  public getCacheStats(): { size: number; entries: number } {
    const now = Date.now();
    let validEntries = 0;

    for (const [, cached] of this.cache.entries()) {
      if (cached.expiresAt > now) {
        validEntries++;
      }
    }

    return {
      size: this.cache.size,
      entries: validEntries,
    };
  }
}

