/**
 * Blockchain Data Service Integration Tests
 * Story: 3.2.2 - Suspicious Activity Detection - Enhancements
 * Phase 4: Testing & Documentation
 * 
 * Tests real blockchain data integration with Etherscan API.
 * Requires ETHERSCAN_API_KEY environment variable.
 */

import { BlockchainDataService } from '../blockchain-data-service';
import { EtherscanService } from '../etherscan-service';

describe('BlockchainDataService Integration Tests', () => {
  let service: BlockchainDataService;
  const hasApiKey = !!process.env.ETHERSCAN_API_KEY;

  beforeAll(() => {
    service = BlockchainDataService.getInstance();
  });

  describe('getWalletInfo', () => {
    it('should fetch real wallet info when API key is available', async () => {
      if (!hasApiKey) {
        console.log('Skipping test: ETHERSCAN_API_KEY not set');
        return;
      }

      // Use a known Ethereum address (Vitalik's address)
      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const walletInfo = await service.getWalletInfo(address, 'ethereum');

      expect(walletInfo).toBeDefined();
      expect(walletInfo.address).toBe(address.toLowerCase());
      expect(walletInfo.balance).toBeGreaterThanOrEqual(0);
      expect(walletInfo.transactionCount).toBeGreaterThan(0);
      expect(walletInfo.creationTime).toBeInstanceOf(Date);
      expect(walletInfo.lastActivity).toBeInstanceOf(Date);
    }, 30000); // 30 second timeout

    it('should handle invalid address gracefully', async () => {
      if (!hasApiKey) {
        console.log('Skipping test: ETHERSCAN_API_KEY not set');
        return;
      }

      const invalidAddress = '0xinvalid';
      
      await expect(async () => {
        await service.getWalletInfo(invalidAddress, 'ethereum');
      }).rejects.toThrow();
    }, 30000);
  });

  describe('getWalletTransactions', () => {
    it('should fetch real wallet transactions when API key is available', async () => {
      if (!hasApiKey) {
        console.log('Skipping test: ETHERSCAN_API_KEY not set');
        return;
      }

      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const transactions = await service.getWalletTransactions(address, 'ethereum', 10);

      expect(transactions).toBeDefined();
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions.length).toBeLessThanOrEqual(10);

      // Verify transaction structure
      const tx = transactions[0];
      expect(tx.hash).toBeDefined();
      expect(tx.from).toBeDefined();
      expect(tx.to).toBeDefined();
      expect(tx.value).toBeGreaterThanOrEqual(0);
      expect(tx.timestamp).toBeInstanceOf(Date);
      expect(tx.gasPrice).toBeGreaterThanOrEqual(0);
      expect(tx.gasUsed).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe('getTokenTransfers', () => {
    it('should fetch real token transfers when API key is available', async () => {
      if (!hasApiKey) {
        console.log('Skipping test: ETHERSCAN_API_KEY not set');
        return;
      }

      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const transfers = await service.getTokenTransfers(address, undefined, 'ethereum', 10);

      expect(transfers).toBeDefined();
      expect(Array.isArray(transfers)).toBe(true);

      if (transfers.length > 0) {
        const transfer = transfers[0];
        expect(transfer.hash).toBeDefined();
        expect(transfer.from).toBeDefined();
        expect(transfer.to).toBeDefined();
        expect(transfer.value).toBeGreaterThanOrEqual(0);
        expect(transfer.contractAddress).toBeDefined();
        expect(transfer.timestamp).toBeInstanceOf(Date);
      }
    }, 30000);
  });

  describe('getContractEvents', () => {
    it('should fetch real contract events when API key is available', async () => {
      if (!hasApiKey) {
        console.log('Skipping test: ETHERSCAN_API_KEY not set');
        return;
      }

      // Use USDT contract address
      const contractAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
      const currentBlock = 18000000;
      const fromBlock = currentBlock - 1000;

      const events = await service.getContractEvents(
        contractAddress,
        fromBlock,
        currentBlock,
        'ethereum'
      );

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);

      if (events.length > 0) {
        const event = events[0];
        expect(event.address).toBeDefined();
        expect(event.topics).toBeDefined();
        expect(Array.isArray(event.topics)).toBe(true);
        expect(event.data).toBeDefined();
        expect(event.blockNumber).toBeGreaterThanOrEqual(fromBlock);
        expect(event.blockNumber).toBeLessThanOrEqual(currentBlock);
      }
    }, 30000);
  });

  describe('getWalletInfos (batch)', () => {
    it('should fetch multiple wallet infos when API key is available', async () => {
      if (!hasApiKey) {
        console.log('Skipping test: ETHERSCAN_API_KEY not set');
        return;
      }

      const addresses = [
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // Vitalik
        '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', // Another address
      ];

      const walletInfos = await service.getWalletInfos(addresses, 'ethereum');

      expect(walletInfos).toBeDefined();
      expect(Array.isArray(walletInfos)).toBe(true);
      expect(walletInfos.length).toBe(addresses.length);

      for (let i = 0; i < walletInfos.length; i++) {
        const info = walletInfos[i];
        expect(info.address).toBe(addresses[i].toLowerCase());
        expect(info.balance).toBeGreaterThanOrEqual(0);
        expect(info.transactionCount).toBeGreaterThanOrEqual(0);
      }
    }, 60000); // 60 second timeout for batch operation
  });

  describe('Caching', () => {
    it('should cache wallet info and return cached data on second call', async () => {
      if (!hasApiKey) {
        console.log('Skipping test: ETHERSCAN_API_KEY not set');
        return;
      }

      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

      // First call - should fetch from API
      const start1 = Date.now();
      const info1 = await service.getWalletInfo(address, 'ethereum');
      const duration1 = Date.now() - start1;

      // Second call - should return from cache (much faster)
      const start2 = Date.now();
      const info2 = await service.getWalletInfo(address, 'ethereum');
      const duration2 = Date.now() - start2;

      expect(info1).toEqual(info2);
      expect(duration2).toBeLessThan(duration1 / 2); // Cache should be at least 2x faster
    }, 60000);
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits when making multiple requests', async () => {
      if (!hasApiKey) {
        console.log('Skipping test: ETHERSCAN_API_KEY not set');
        return;
      }

      const addresses = [
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      ];

      const start = Date.now();
      
      // Make multiple requests
      const promises = addresses.map(addr => 
        service.getWalletTransactions(addr, 'ethereum', 5)
      );
      
      await Promise.all(promises);
      
      const duration = Date.now() - start;

      // With rate limiting (5 req/sec), 3 requests should take at least 400ms
      expect(duration).toBeGreaterThanOrEqual(400);
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      if (!hasApiKey) {
        console.log('Skipping test: ETHERSCAN_API_KEY not set');
        return;
      }

      // Use invalid chain ID to trigger error
      await expect(async () => {
        await service.getWalletInfo('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 'invalid-chain');
      }).rejects.toThrow();
    }, 30000);
  });
});

describe('EtherscanService Integration Tests', () => {
  let service: EtherscanService;
  const hasApiKey = !!process.env.ETHERSCAN_API_KEY;

  beforeAll(() => {
    service = EtherscanService.getInstance();
  });

  describe('getBalance', () => {
    it('should fetch real balance when API key is available', async () => {
      if (!hasApiKey) {
        console.log('Skipping test: ETHERSCAN_API_KEY not set');
        return;
      }

      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const balanceData = await service.getBalance(address);

      expect(balanceData).toBeDefined();
      expect(balanceData.account).toBe(address);
      expect(balanceData.balance).toBeDefined();
      expect(typeof balanceData.balance).toBe('string');
    }, 30000);
  });

  describe('getBalances (batch)', () => {
    it('should fetch multiple balances when API key is available', async () => {
      if (!hasApiKey) {
        console.log('Skipping test: ETHERSCAN_API_KEY not set');
        return;
      }

      const addresses = [
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
      ];

      const balances = await service.getBalances(addresses);

      expect(balances).toBeDefined();
      expect(Array.isArray(balances)).toBe(true);
      expect(balances.length).toBe(addresses.length);

      for (const balance of balances) {
        expect(balance.account).toBeDefined();
        expect(balance.balance).toBeDefined();
        expect(typeof balance.balance).toBe('string');
      }
    }, 30000);
  });
});

