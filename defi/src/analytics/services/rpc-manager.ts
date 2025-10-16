/**
 * RPC Manager with Automatic Failover
 * Manages multiple RPC endpoints with automatic rotation on rate limits
 * 
 * Features:
 * - Multiple RPC endpoints per chain
 * - Automatic failover on rate limit errors
 * - Health monitoring and recovery
 * - Load balancing across endpoints
 * - Rate limit tracking
 * 
 * Usage:
 * ```typescript
 * const manager = RPCManager.getInstance();
 * const provider = await manager.getProvider('ethereum');
 * ```
 */

import { ethers } from 'ethers';

interface RPCEndpoint {
  url: string;
  priority: number; // Lower = higher priority
  isHealthy: boolean;
  lastError?: Date;
  errorCount: number;
  requestCount: number;
  lastUsed?: Date;
  rateLimitResetTime?: Date;
}

interface ChainRPCConfig {
  chainId: string;
  endpoints: RPCEndpoint[];
  currentIndex: number;
}

export class RPCManager {
  private static instance: RPCManager;
  private chains: Map<string, ChainRPCConfig> = new Map();
  private providers: Map<string, ethers.WebSocketProvider> = new Map();
  
  // Rate limit detection patterns
  private rateLimitErrors = [
    'rate limit',
    'too many requests',
    'exceeded',
    'throttle',
    '429',
    'internal error', // Infura free tier often returns this
  ];

  private constructor() {
    this.initializeChains();
  }

  public static getInstance(): RPCManager {
    if (!RPCManager.instance) {
      RPCManager.instance = new RPCManager();
    }
    return RPCManager.instance;
  }

  /**
   * Initialize chain configurations from environment
   */
  private initializeChains(): void {
    console.log('Initializing RPC Manager...');
    console.log(`ETHEREUM_RPC: ${process.env.ETHEREUM_RPC ? 'SET' : 'NOT SET'}`);

    // Ethereum
    const ethereumRPCs = this.parseRPCList(process.env.ETHEREUM_RPC || '');
    if (ethereumRPCs.length > 0) {
      this.chains.set('ethereum', {
        chainId: 'ethereum',
        endpoints: ethereumRPCs,
        currentIndex: 0,
      });
    }

    // Arbitrum
    const arbitrumRPCs = this.parseRPCList(process.env.ARBITRUM_RPC || '');
    if (arbitrumRPCs.length > 0) {
      this.chains.set('arbitrum', {
        chainId: 'arbitrum',
        endpoints: arbitrumRPCs,
        currentIndex: 0,
      });
    }

    // Optimism
    const optimismRPCs = this.parseRPCList(process.env.OPTIMISM_RPC || '');
    if (optimismRPCs.length > 0) {
      this.chains.set('optimism', {
        chainId: 'optimism',
        endpoints: optimismRPCs,
        currentIndex: 0,
      });
    }

    // BSC
    const bscRPCs = this.parseRPCList(process.env.BSC_RPC || '');
    if (bscRPCs.length > 0) {
      this.chains.set('bsc', {
        chainId: 'bsc',
        endpoints: bscRPCs,
        currentIndex: 0,
      });
    }

    // Polygon
    const polygonRPCs = this.parseRPCList(process.env.POLYGON_RPC || '');
    if (polygonRPCs.length > 0) {
      this.chains.set('polygon', {
        chainId: 'polygon',
        endpoints: polygonRPCs,
        currentIndex: 0,
      });
    }

    console.log(`✅ RPC Manager initialized with ${this.chains.size} chains`);
    for (const [chainId, config] of this.chains.entries()) {
      console.log(`   ${chainId}: ${config.endpoints.length} endpoints`);
    }
  }

  /**
   * Parse RPC list from environment variable
   * Supports comma-separated list: "url1,url2,url3"
   */
  private parseRPCList(rpcString: string): RPCEndpoint[] {
    if (!rpcString) return [];

    const urls = rpcString.split(',').map(url => url.trim()).filter(url => url.length > 0);
    
    return urls.map((url, index) => ({
      url: this.ensureWebSocket(url),
      priority: index, // First URL has highest priority
      isHealthy: true,
      errorCount: 0,
      requestCount: 0,
    }));
  }

  /**
   * Convert HTTP URL to WebSocket if needed
   */
  private ensureWebSocket(url: string): string {
    if (url.startsWith('http://')) {
      return url.replace('http://', 'ws://');
    }
    if (url.startsWith('https://')) {
      return url.replace('https://', 'wss://');
    }
    return url;
  }

  /**
   * Get provider for a chain with automatic failover
   */
  public async getProvider(chainId: string): Promise<ethers.WebSocketProvider> {
    const config = this.chains.get(chainId);
    if (!config) {
      throw new Error(`No RPC configuration found for chain: ${chainId}`);
    }

    // Try to get existing provider
    const providerKey = `${chainId}-${config.currentIndex}`;
    let provider = this.providers.get(providerKey);

    // If provider exists and is connected, return it
    if (provider) {
      try {
        await provider.ready;
        return provider;
      } catch (error) {
        // Provider is not ready, try to reconnect or switch
        console.log(`Provider for ${chainId} not ready, switching endpoint...`);
        await this.switchEndpoint(chainId);
        return this.getProvider(chainId); // Recursive call with new endpoint
      }
    }

    // Create new provider
    const endpoint = config.endpoints[config.currentIndex];
    console.log(`Creating provider for ${chainId} using endpoint ${config.currentIndex + 1}/${config.endpoints.length}`);
    
    provider = new ethers.WebSocketProvider(endpoint.url);
    
    // Setup error handler
    provider.on('error', async (error: any) => {
      console.error(`Provider error for ${chainId}:`, error.message);
      
      // Check if it's a rate limit error
      if (this.isRateLimitError(error)) {
        console.log(`⚠️ Rate limit detected for ${chainId}, switching endpoint...`);
        await this.handleRateLimit(chainId);
      }
    });

    // Wait for provider to be ready
    try {
      await provider.ready;
      this.providers.set(providerKey, provider);
      endpoint.lastUsed = new Date();
      endpoint.requestCount++;
      return provider;
    } catch (error: any) {
      console.error(`Failed to connect to ${chainId} endpoint:`, error.message);
      
      // Mark endpoint as unhealthy
      endpoint.isHealthy = false;
      endpoint.lastError = new Date();
      endpoint.errorCount++;
      
      // Try next endpoint
      await this.switchEndpoint(chainId);
      return this.getProvider(chainId); // Recursive call
    }
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toString() || '';
    
    return this.rateLimitErrors.some(pattern => 
      errorMessage.includes(pattern.toLowerCase()) || errorCode.includes(pattern)
    );
  }

  /**
   * Handle rate limit by switching to next endpoint
   */
  private async handleRateLimit(chainId: string): Promise<void> {
    const config = this.chains.get(chainId);
    if (!config) return;

    const currentEndpoint = config.endpoints[config.currentIndex];
    currentEndpoint.isHealthy = false;
    currentEndpoint.rateLimitResetTime = new Date(Date.now() + 60000); // Reset after 1 minute
    currentEndpoint.errorCount++;

    console.log(`⚠️ Rate limit on ${chainId} endpoint ${config.currentIndex + 1}, switching...`);
    
    await this.switchEndpoint(chainId);
  }

  /**
   * Switch to next available endpoint
   */
  private async switchEndpoint(chainId: string): Promise<void> {
    const config = this.chains.get(chainId);
    if (!config) return;

    // Close current provider
    const currentProviderKey = `${chainId}-${config.currentIndex}`;
    const currentProvider = this.providers.get(currentProviderKey);
    if (currentProvider) {
      try {
        currentProvider.destroy();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.providers.delete(currentProviderKey);
    }

    // Find next healthy endpoint
    const startIndex = config.currentIndex;
    let attempts = 0;
    
    while (attempts < config.endpoints.length) {
      config.currentIndex = (config.currentIndex + 1) % config.endpoints.length;
      const endpoint = config.endpoints[config.currentIndex];
      
      // Check if endpoint is healthy or rate limit has reset
      if (endpoint.isHealthy || this.isRateLimitReset(endpoint)) {
        if (!endpoint.isHealthy && this.isRateLimitReset(endpoint)) {
          endpoint.isHealthy = true;
          endpoint.errorCount = 0;
          console.log(`✅ Endpoint ${config.currentIndex + 1} for ${chainId} recovered from rate limit`);
        }
        console.log(`Switched to endpoint ${config.currentIndex + 1}/${config.endpoints.length} for ${chainId}`);
        return;
      }
      
      attempts++;
    }

    // All endpoints are unhealthy, wait and retry with first endpoint
    console.error(`⚠️ All endpoints for ${chainId} are unhealthy, waiting 10 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 10000));
    config.currentIndex = 0;
    config.endpoints[0].isHealthy = true; // Force retry
  }

  /**
   * Check if rate limit has reset
   */
  private isRateLimitReset(endpoint: RPCEndpoint): boolean {
    if (!endpoint.rateLimitResetTime) return false;
    return Date.now() >= endpoint.rateLimitResetTime.getTime();
  }

  /**
   * Get status of all chains and endpoints
   */
  public getStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    for (const [chainId, config] of this.chains.entries()) {
      status[chainId] = {
        currentEndpoint: config.currentIndex + 1,
        totalEndpoints: config.endpoints.length,
        endpoints: config.endpoints.map((endpoint, index) => ({
          index: index + 1,
          url: this.maskUrl(endpoint.url),
          priority: endpoint.priority,
          isHealthy: endpoint.isHealthy,
          isCurrent: index === config.currentIndex,
          errorCount: endpoint.errorCount,
          requestCount: endpoint.requestCount,
          lastUsed: endpoint.lastUsed?.toISOString(),
          rateLimitResetTime: endpoint.rateLimitResetTime?.toISOString(),
        })),
      };
    }

    return status;
  }

  /**
   * Mask sensitive parts of URL
   */
  private maskUrl(url: string): string {
    return url.replace(/\/v3\/[^/]+/, '/v3/***');
  }

  /**
   * Cleanup all providers
   */
  public async cleanup(): Promise<void> {
    for (const provider of this.providers.values()) {
      try {
        provider.destroy();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    this.providers.clear();
  }
}

// Export singleton instance
export const rpcManager = RPCManager.getInstance();

