/**
 * MEV Data Ingestion Service
 * Orchestrates real-time MEV data collection from blockchain
 * 
 * Features:
 * - Manages multiple blockchain listeners
 * - Coordinates data ingestion across chains
 * - Handles errors and reconnections
 * - Provides health monitoring
 * 
 * Usage:
 * ```typescript
 * const service = MEVIngestionService.getInstance();
 * await service.start();
 * ```
 */

import { createBlockchainListener } from './blockchain-listener';
import dotenv from 'dotenv';

dotenv.config();

interface ChainConfig {
  chainId: string;
  rpcUrl: string;
  enableMempool: boolean;
  enableBlocks: boolean;
}

export class MEVIngestionService {
  private static instance: MEVIngestionService;
  private listeners: Map<string, any> = new Map();
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): MEVIngestionService {
    if (!MEVIngestionService.instance) {
      MEVIngestionService.instance = new MEVIngestionService();
    }
    return MEVIngestionService.instance;
  }

  /**
   * Start MEV data ingestion for all configured chains
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('MEV ingestion service already running');
      return;
    }

    console.log('🚀 Starting MEV Data Ingestion Service...');

    // Get chain configurations
    const chains = this.getChainConfigurations();

    // Start listeners for each chain
    for (const chain of chains) {
      try {
        await this.startChainListener(chain);
      } catch (error) {
        console.error(`Failed to start listener for ${chain.chainId}:`, error);
      }
    }

    this.isRunning = true;
    console.log('✅ MEV Data Ingestion Service started successfully');
  }

  /**
   * Stop MEV data ingestion
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping MEV Data Ingestion Service...');

    // Stop all listeners
    for (const [chainId, listener] of this.listeners.entries()) {
      try {
        await listener.stop();
        console.log(`Stopped listener for ${chainId}`);
      } catch (error) {
        console.error(`Error stopping listener for ${chainId}:`, error);
      }
    }

    this.listeners.clear();
    this.isRunning = false;
    console.log('✅ MEV Data Ingestion Service stopped');
  }

  /**
   * Start listener for a specific chain
   */
  private async startChainListener(config: ChainConfig): Promise<void> {
    console.log(`Starting listener for ${config.chainId}...`);

    const listener = createBlockchainListener({
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
      enableMempool: config.enableMempool,
      enableBlocks: config.enableBlocks,
      batchSize: 100,
    });

    await listener.start();
    this.listeners.set(config.chainId, listener);

    console.log(`✅ Listener started for ${config.chainId}`);
  }

  /**
   * Get chain configurations from environment
   */
  private getChainConfigurations(): ChainConfig[] {
    const chains: ChainConfig[] = [];

    // Ethereum mainnet (primary focus for MEV)
    if (process.env.ETHEREUM_RPC) {
      // Check if it's a WebSocket URL
      const rpcUrl = process.env.ETHEREUM_RPC;
      const wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      
      chains.push({
        chainId: 'ethereum',
        rpcUrl: wsUrl,
        enableMempool: true, // Enable mempool monitoring for Ethereum
        enableBlocks: true,
      });
    }

    // Arbitrum (L2 with MEV)
    if (process.env.ARBITRUM_RPC) {
      const rpcUrl = process.env.ARBITRUM_RPC;
      const wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      
      chains.push({
        chainId: 'arbitrum',
        rpcUrl: wsUrl,
        enableMempool: false, // L2s have different mempool behavior
        enableBlocks: true,
      });
    }

    // Optimism (L2 with MEV)
    if (process.env.OPTIMISM_RPC) {
      const rpcUrl = process.env.OPTIMISM_RPC;
      const wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      
      chains.push({
        chainId: 'optimism',
        rpcUrl: wsUrl,
        enableMempool: false,
        enableBlocks: true,
      });
    }

    // BSC (high MEV activity)
    if (process.env.BSC_RPC) {
      const rpcUrl = process.env.BSC_RPC;
      const wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      
      chains.push({
        chainId: 'bsc',
        rpcUrl: wsUrl,
        enableMempool: true,
        enableBlocks: true,
      });
    }

    // Polygon (high MEV activity)
    if (process.env.POLYGON_RPC) {
      const rpcUrl = process.env.POLYGON_RPC;
      const wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      
      chains.push({
        chainId: 'polygon',
        rpcUrl: wsUrl,
        enableMempool: true,
        enableBlocks: true,
      });
    }

    return chains;
  }

  /**
   * Get service status
   */
  public getStatus(): {
    isRunning: boolean;
    activeChains: string[];
    listenerStatuses: Record<string, any>;
  } {
    const listenerStatuses: Record<string, any> = {};

    for (const [chainId, listener] of this.listeners.entries()) {
      listenerStatuses[chainId] = listener.getStatus();
    }

    return {
      isRunning: this.isRunning,
      activeChains: Array.from(this.listeners.keys()),
      listenerStatuses,
    };
  }

  /**
   * Restart listener for a specific chain
   */
  public async restartChain(chainId: string): Promise<void> {
    const listener = this.listeners.get(chainId);
    if (!listener) {
      throw new Error(`No listener found for chain ${chainId}`);
    }

    console.log(`Restarting listener for ${chainId}...`);
    await listener.stop();
    
    const chains = this.getChainConfigurations();
    const config = chains.find(c => c.chainId === chainId);
    
    if (config) {
      await this.startChainListener(config);
      console.log(`✅ Listener restarted for ${chainId}`);
    }
  }
}

// Export singleton instance
export const mevIngestionService = MEVIngestionService.getInstance();

