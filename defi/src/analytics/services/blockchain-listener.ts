/**
 * Blockchain Listener Service
 * Real-time blockchain data ingestion for MEV detection
 * 
 * Features:
 * - Listen to new blocks on Ethereum mainnet
 * - Monitor pending transactions in mempool
 * - Detect MEV patterns in real-time
 * - Store opportunities in database
 * 
 * Integration:
 * - Uses ethers.js WebSocket provider
 * - Connects to Ethereum RPC endpoint
 * - Triggers MEV detection engines
 * - Stores results in PostgreSQL
 */

import { ethers } from 'ethers';
import { query } from '../db/connection';
import {
  SandwichDetector,
  FrontrunDetector,
  ArbitrageDetector,
  LiquidationDetector,
  BackrunDetector,
} from '../engines';

interface BlockchainListenerConfig {
  rpcUrl: string;
  chainId: string;
  enableMempool: boolean;
  enableBlocks: boolean;
  batchSize: number;
}

export class BlockchainListener {
  private static instance: BlockchainListener;
  private provider: ethers.WebSocketProvider | null = null;
  private config: BlockchainListenerConfig;
  private isRunning: boolean = false;
  private detectors: {
    sandwich: SandwichDetector;
    frontrun: FrontrunDetector;
    arbitrage: ArbitrageDetector;
    liquidation: LiquidationDetector;
    backrun: BackrunDetector;
  };

  private constructor(config: BlockchainListenerConfig) {
    this.config = config;
    this.detectors = {
      sandwich: SandwichDetector.getInstance(),
      frontrun: FrontrunDetector.getInstance(),
      arbitrage: ArbitrageDetector.getInstance(),
      liquidation: LiquidationDetector.getInstance(),
      backrun: BackrunDetector.getInstance(),
    };
  }

  public static getInstance(config?: BlockchainListenerConfig): BlockchainListener {
    if (!BlockchainListener.instance && config) {
      BlockchainListener.instance = new BlockchainListener(config);
    }
    return BlockchainListener.instance;
  }

  /**
   * Start listening to blockchain
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Blockchain listener already running');
      return;
    }

    try {
      // Connect to WebSocket provider
      this.provider = new ethers.WebSocketProvider(this.config.rpcUrl);
      await this.provider.ready;

      console.log(`✅ Connected to ${this.config.chainId} blockchain`);
      this.isRunning = true;

      // Start block listener
      if (this.config.enableBlocks) {
        this.startBlockListener();
      }

      // Start mempool listener
      if (this.config.enableMempool) {
        this.startMempoolListener();
      }

      console.log('🚀 Blockchain listener started successfully');
    } catch (error) {
      console.error('Failed to start blockchain listener:', error);
      throw error;
    }
  }

  /**
   * Stop listening to blockchain
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.provider) {
        await this.provider.destroy();
        this.provider = null;
      }

      this.isRunning = false;
      console.log('🛑 Blockchain listener stopped');
    } catch (error) {
      console.error('Error stopping blockchain listener:', error);
    }
  }

  /**
   * Listen to new blocks
   */
  private startBlockListener(): void {
    if (!this.provider) return;

    console.log('📦 Starting block listener...');

    this.provider.on('block', async (blockNumber: number) => {
      try {
        console.log(`📦 New block: ${blockNumber}`);
        await this.processBlock(blockNumber);
      } catch (error) {
        console.error(`Error processing block ${blockNumber}:`, error);
      }
    });
  }

  /**
   * Listen to pending transactions (mempool)
   */
  private startMempoolListener(): void {
    if (!this.provider) return;

    console.log('🔄 Starting mempool listener...');

    this.provider.on('pending', async (txHash: string) => {
      try {
        await this.processPendingTransaction(txHash);
      } catch (error) {
        // Mempool transactions can disappear quickly, ignore errors
        // console.error(`Error processing pending tx ${txHash}:`, error);
      }
    });
  }

  /**
   * Process a new block
   */
  private async processBlock(blockNumber: number): Promise<void> {
    if (!this.provider) return;

    try {
      // Get block with transactions
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block || !block.transactions) {
        return;
      }

      console.log(`Processing block ${blockNumber} with ${block.transactions.length} transactions`);

      // Detect MEV opportunities in this block
      const opportunities = await this.detectMEVInBlock(block);

      // Store opportunities in database
      if (opportunities.length > 0) {
        await this.storeOpportunities(opportunities);
        console.log(`✅ Found ${opportunities.length} MEV opportunities in block ${blockNumber}`);
      }
    } catch (error) {
      console.error(`Error processing block ${blockNumber}:`, error);
    }
  }

  /**
   * Process a pending transaction
   */
  private async processPendingTransaction(txHash: string): Promise<void> {
    if (!this.provider) return;

    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return;

      // Analyze transaction for MEV vulnerability
      // This is for real-time MEV protection analysis
      // console.log(`Pending tx: ${txHash}`);
    } catch (error) {
      // Ignore errors for pending transactions
    }
  }

  /**
   * Detect MEV opportunities in a block
   */
  private async detectMEVInBlock(block: ethers.Block): Promise<any[]> {
    const opportunities: any[] = [];

    try {
      // Run all detectors in parallel
      const [sandwich, frontrun, arbitrage, liquidation, backrun] = await Promise.all([
        this.detectors.sandwich.detectSandwichAttacks(this.config.chainId, block.number),
        this.detectors.frontrun.detectFrontrunning(this.config.chainId, block.number),
        this.detectors.arbitrage.detectArbitrage(this.config.chainId),
        this.detectors.liquidation.detectLiquidations(this.config.chainId),
        this.detectors.backrun.detectBackrunning(this.config.chainId, block.number),
      ]);

      // Collect all opportunities (with null checks)
      if (sandwich?.opportunities?.length > 0) {
        opportunities.push(...sandwich.opportunities);
      }
      if (frontrun?.opportunities?.length > 0) {
        opportunities.push(...frontrun.opportunities);
      }
      if (arbitrage?.opportunities?.length > 0) {
        opportunities.push(...arbitrage.opportunities);
      }
      if (liquidation?.opportunities?.length > 0) {
        opportunities.push(...liquidation.opportunities);
      }
      if (backrun?.opportunities?.length > 0) {
        opportunities.push(...backrun.opportunities);
      }
    } catch (error) {
      console.error('Error detecting MEV in block:', error);
    }

    return opportunities;
  }

  /**
   * Store MEV opportunities in database
   */
  private async storeOpportunities(opportunities: any[]): Promise<void> {
    try {
      for (const opp of opportunities) {
        await query(
          `
          INSERT INTO mev_opportunities (
            chain_id, block_number, opportunity_type, status,
            target_tx_hash, bot_address, protocol_id, token_address,
            estimated_profit_usd, actual_profit_usd, gas_cost_usd,
            detected_at, executed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (chain_id, block_number, target_tx_hash, opportunity_type) 
          DO UPDATE SET
            status = EXCLUDED.status,
            actual_profit_usd = EXCLUDED.actual_profit_usd,
            executed_at = EXCLUDED.executed_at
          `,
          [
            opp.chain_id,
            opp.block_number,
            opp.opportunity_type,
            opp.status || 'detected',
            opp.target_tx_hash,
            opp.bot_address,
            opp.protocol_id,
            opp.token_address,
            opp.estimated_profit_usd,
            opp.actual_profit_usd || null,
            opp.gas_cost_usd || null,
            opp.detected_at || new Date(),
            opp.executed_at || null,
          ]
        );
      }
    } catch (error) {
      console.error('Error storing opportunities:', error);
    }
  }

  /**
   * Get listener status
   */
  public getStatus(): {
    isRunning: boolean;
    chainId: string;
    enableMempool: boolean;
    enableBlocks: boolean;
  } {
    return {
      isRunning: this.isRunning,
      chainId: this.config.chainId,
      enableMempool: this.config.enableMempool,
      enableBlocks: this.config.enableBlocks,
    };
  }
}

// Export singleton instance factory
export const createBlockchainListener = (config: BlockchainListenerConfig) => {
  return BlockchainListener.getInstance(config);
};

