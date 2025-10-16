/**
 * Blockchain Data Service
 * Story: 3.2.2 - Suspicious Activity Detection - Enhancement 1
 * Phase: Blockchain Data Integration
 * 
 * Provides unified interface for blockchain data retrieval across multiple chains
 */

import { EtherscanService, EtherscanTransaction, EtherscanTokenTransfer, EtherscanContractEvent, WalletBalance } from './etherscan-service';

// ============================================================================
// Types
// ============================================================================

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: number;
  gas: number;
  gasPrice: number;
  gasUsed: number;
  timestamp: Date;
  blockNumber: number;
  isError: boolean;
  input: string;
}

export interface TokenTransfer {
  hash: string;
  from: string;
  to: string;
  value: number;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
  contractAddress: string;
  timestamp: Date;
  blockNumber: number;
}

export interface ContractEvent {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  timestamp: Date;
  gasPrice: number;
  gasUsed: number;
  transactionHash: string;
}

export interface WalletInfo {
  address: string;
  balance: number;
  transactionCount: number;
  creationTime: Date;
  lastActivity: Date;
}

export interface LiquidityPoolData {
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: number;
  reserve1: number;
  totalSupply: number;
  timestamp: Date;
}

export interface PriceData {
  timestamp: Date;
  price: number;
  volume: number;
}

// ============================================================================
// Blockchain Data Service
// ============================================================================

export class BlockchainDataService {
  private static instance: BlockchainDataService;
  private etherscanService: EtherscanService;

  private constructor() {
    this.etherscanService = EtherscanService.getInstance();
  }

  public static getInstance(): BlockchainDataService {
    if (!BlockchainDataService.instance) {
      BlockchainDataService.instance = new BlockchainDataService();
    }
    return BlockchainDataService.instance;
  }

  /**
   * Get transactions for a wallet
   */
  public async getWalletTransactions(
    address: string,
    chainId: string = 'ethereum',
    limit: number = 100
  ): Promise<Transaction[]> {
    if (chainId !== 'ethereum') {
      throw new Error(`Chain ${chainId} not supported yet`);
    }

    const etherscanTxs = await this.etherscanService.getTransactions(address, 0, 99999999, 1, limit);

    return etherscanTxs.map(tx => this.convertEtherscanTransaction(tx));
  }

  /**
   * Get token transfers for a wallet
   */
  public async getTokenTransfers(
    address: string,
    tokenAddress?: string,
    chainId: string = 'ethereum',
    limit: number = 100
  ): Promise<TokenTransfer[]> {
    if (chainId !== 'ethereum') {
      throw new Error(`Chain ${chainId} not supported yet`);
    }

    const etherscanTransfers = await this.etherscanService.getTokenTransfers(
      address,
      tokenAddress,
      0,
      99999999,
      1,
      limit
    );

    return etherscanTransfers.map(transfer => this.convertEtherscanTokenTransfer(transfer));
  }

  /**
   * Get contract events
   */
  public async getContractEvents(
    contractAddress: string,
    fromBlock: number,
    toBlock: number,
    chainId: string = 'ethereum',
    topic0?: string
  ): Promise<ContractEvent[]> {
    if (chainId !== 'ethereum') {
      throw new Error(`Chain ${chainId} not supported yet`);
    }

    const etherscanEvents = await this.etherscanService.getContractEvents(
      contractAddress,
      fromBlock,
      toBlock,
      topic0
    );

    return etherscanEvents.map(event => this.convertEtherscanEvent(event));
  }

  /**
   * Get wallet info
   */
  public async getWalletInfo(
    address: string,
    chainId: string = 'ethereum'
  ): Promise<WalletInfo> {
    if (chainId !== 'ethereum') {
      throw new Error(`Chain ${chainId} not supported yet`);
    }

    // Get balance
    const balanceData = await this.etherscanService.getBalance(address);

    // Get transactions to determine creation time and last activity
    const transactions = await this.getWalletTransactions(address, chainId, 1000);

    const creationTime = transactions.length > 0
      ? new Date(Math.min(...transactions.map(tx => tx.timestamp.getTime())))
      : new Date();

    const lastActivity = transactions.length > 0
      ? new Date(Math.max(...transactions.map(tx => tx.timestamp.getTime())))
      : new Date();

    return {
      address,
      balance: parseFloat(balanceData.balance) / 1e18, // Convert from wei to ETH
      transactionCount: transactions.length,
      creationTime,
      lastActivity,
    };
  }

  /**
   * Get multiple wallet infos
   */
  public async getWalletInfos(
    addresses: string[],
    chainId: string = 'ethereum'
  ): Promise<WalletInfo[]> {
    if (chainId !== 'ethereum') {
      throw new Error(`Chain ${chainId} not supported yet`);
    }

    // Get balances in batch
    const balances = await this.etherscanService.getBalances(addresses);

    // Get wallet info for each address
    const walletInfos = await Promise.all(
      addresses.map(async (address, index) => {
        // Get transactions to determine creation time and last activity
        const transactions = await this.getWalletTransactions(address, chainId, 100);

        const creationTime = transactions.length > 0
          ? new Date(Math.min(...transactions.map(tx => tx.timestamp.getTime())))
          : new Date();

        const lastActivity = transactions.length > 0
          ? new Date(Math.max(...transactions.map(tx => tx.timestamp.getTime())))
          : new Date();

        return {
          address,
          balance: parseFloat(balances[index].balance) / 1e18, // Convert from wei to ETH
          transactionCount: transactions.length,
          creationTime,
          lastActivity,
        };
      })
    );

    return walletInfos;
  }

  /**
   * Get liquidity pool data
   * NOTE: This requires integration with DEX-specific APIs or subgraphs
   * For now, this is a placeholder that returns mock data
   */
  public async getLiquidityPoolData(
    poolAddress: string,
    chainId: string = 'ethereum'
  ): Promise<LiquidityPoolData> {
    // TODO: Integrate with Uniswap/Sushiswap subgraph or DEX APIs
    console.warn('getLiquidityPoolData: Using mock implementation. Integrate with DEX APIs.');

    return {
      poolAddress,
      token0: '0x0000000000000000000000000000000000000000',
      token1: '0x0000000000000000000000000000000000000000',
      reserve0: 0,
      reserve1: 0,
      totalSupply: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Get price history
   * NOTE: This requires integration with price feed APIs (CoinGecko, CoinMarketCap, etc.)
   * For now, this is a placeholder that returns mock data
   */
  public async getPriceHistory(
    tokenAddress: string,
    fromTimestamp: number,
    toTimestamp: number,
    chainId: string = 'ethereum'
  ): Promise<PriceData[]> {
    // TODO: Integrate with CoinGecko or CoinMarketCap API
    console.warn('getPriceHistory: Using mock implementation. Integrate with price feed APIs.');

    return [];
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private convertEtherscanTransaction(tx: EtherscanTransaction): Transaction {
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: parseFloat(tx.value) / 1e18, // Convert from wei to ETH
      gas: parseInt(tx.gas),
      gasPrice: parseFloat(tx.gasPrice) / 1e9, // Convert from wei to gwei
      gasUsed: parseInt(tx.gasUsed),
      timestamp: new Date(parseInt(tx.timeStamp) * 1000),
      blockNumber: parseInt(tx.blockNumber),
      isError: tx.isError === '1',
      input: tx.input,
    };
  }

  private convertEtherscanTokenTransfer(transfer: EtherscanTokenTransfer): TokenTransfer {
    return {
      hash: transfer.hash,
      from: transfer.from,
      to: transfer.to,
      value: parseFloat(transfer.value) / Math.pow(10, parseInt(transfer.tokenDecimal)),
      tokenName: transfer.tokenName,
      tokenSymbol: transfer.tokenSymbol,
      tokenDecimal: parseInt(transfer.tokenDecimal),
      contractAddress: transfer.contractAddress,
      timestamp: new Date(parseInt(transfer.timeStamp) * 1000),
      blockNumber: parseInt(transfer.blockNumber),
    };
  }

  private convertEtherscanEvent(event: EtherscanContractEvent): ContractEvent {
    return {
      address: event.address,
      topics: event.topics,
      data: event.data,
      blockNumber: parseInt(event.blockNumber),
      timestamp: new Date(parseInt(event.timeStamp) * 1000),
      gasPrice: parseFloat(event.gasPrice) / 1e9, // Convert from wei to gwei
      gasUsed: parseInt(event.gasUsed),
      transactionHash: event.transactionHash,
    };
  }

  /**
   * Close connections
   */
  public async close(): Promise<void> {
    await this.etherscanService.close();
  }
}

