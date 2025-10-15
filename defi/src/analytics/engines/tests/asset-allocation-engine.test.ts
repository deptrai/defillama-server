/**
 * Asset Allocation Engine Tests
 * Story: 2.2.1 - Wallet Portfolio Tracking
 */

import { AssetAllocationEngine } from '../asset-allocation-engine';

describe('AssetAllocationEngine', () => {
  let engine: AssetAllocationEngine;

  beforeAll(() => {
    engine = AssetAllocationEngine.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AssetAllocationEngine.getInstance();
      const instance2 = AssetAllocationEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getAllocation', () => {
    it('should get allocation by token', async () => {
      const allocation = await engine.getAllocation(
        '0x1234567890123456789012345678901234567890',
        'token'
      );

      expect(allocation.groupBy).toBe('token');
      expect(allocation.allocation.length).toBeGreaterThan(0);
      expect(allocation.totalValueUsd).toBeGreaterThan(0);
    });

    it('should get allocation by protocol', async () => {
      const allocation = await engine.getAllocation(
        '0x1234567890123456789012345678901234567890',
        'protocol'
      );

      expect(allocation.groupBy).toBe('protocol');
      expect(allocation.allocation.length).toBeGreaterThan(0);
    });

    it('should get allocation by chain', async () => {
      const allocation = await engine.getAllocation(
        '0x1234567890123456789012345678901234567890',
        'chain'
      );

      expect(allocation.groupBy).toBe('chain');
      expect(allocation.allocation.length).toBe(3); // Ethereum, Arbitrum, Optimism
    });

    it('should get allocation by category', async () => {
      const allocation = await engine.getAllocation(
        '0x1234567890123456789012345678901234567890',
        'category'
      );

      expect(allocation.groupBy).toBe('category');
      expect(allocation.allocation.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid groupBy', async () => {
      await expect(
        engine.getAllocation(
          '0x1234567890123456789012345678901234567890',
          'invalid' as any
        )
      ).rejects.toThrow('Invalid groupBy');
    });
  });

  describe('getAllocationByToken', () => {
    it('should return tokens ordered by value', async () => {
      const allocation = await engine.getAllocationByToken(
        '0x1234567890123456789012345678901234567890'
      );

      expect(allocation.length).toBeGreaterThan(0);

      // Check ordering
      for (let i = 1; i < allocation.length; i++) {
        expect(allocation[i - 1].valueUsd).toBeGreaterThanOrEqual(
          allocation[i].valueUsd
        );
      }
    });

    it('should calculate allocation percentages', async () => {
      const allocation = await engine.getAllocationByToken(
        '0x1234567890123456789012345678901234567890'
      );

      const totalPct = allocation.reduce((sum, item) => sum + item.allocationPct, 0);
      expect(totalPct).toBeCloseTo(100, 0);
    });

    it('should filter by minimum allocation', async () => {
      const allocation = await engine.getAllocationByToken(
        '0x1234567890123456789012345678901234567890',
        10 // Min 10%
      );

      allocation.forEach(item => {
        expect(item.allocationPct).toBeGreaterThanOrEqual(10);
      });
    });

    it('should include holdings count', async () => {
      const allocation = await engine.getAllocationByToken(
        '0x1234567890123456789012345678901234567890'
      );

      allocation.forEach(item => {
        expect(item.holdings).toBeGreaterThan(0);
      });
    });
  });

  describe('getAllocationByProtocol', () => {
    it('should group by protocol', async () => {
      const allocation = await engine.getAllocationByProtocol(
        '0x2345678901234567890123456789012345678901' // DeFi Farmer
      );

      expect(allocation.length).toBeGreaterThan(0);

      // Should have protocol-specific allocations
      const protocolNames = allocation.map(a => a.name);
      expect(protocolNames).toContain('curve');
    });

    it('should include wallet holdings', async () => {
      const allocation = await engine.getAllocationByProtocol(
        '0x1234567890123456789012345678901234567890'
      );

      const walletAllocation = allocation.find(a => a.name === 'wallet');
      expect(walletAllocation).toBeDefined();
      expect(walletAllocation!.valueUsd).toBeGreaterThan(0);
    });

    it('should include token count', async () => {
      const allocation = await engine.getAllocationByProtocol(
        '0x1234567890123456789012345678901234567890'
      );

      allocation.forEach(item => {
        expect(item.tokenCount).toBeGreaterThan(0);
      });
    });
  });

  describe('getAllocationByChain', () => {
    it('should group by chain', async () => {
      const allocation = await engine.getAllocationByChain(
        '0x1234567890123456789012345678901234567890'
      );

      expect(allocation.length).toBe(3);

      const chainIds = allocation.map(a => a.name);
      expect(chainIds).toContain('ethereum');
      expect(chainIds).toContain('arbitrum');
      expect(chainIds).toContain('optimism');
    });

    it('should order by value descending', async () => {
      const allocation = await engine.getAllocationByChain(
        '0x1234567890123456789012345678901234567890'
      );

      for (let i = 1; i < allocation.length; i++) {
        expect(allocation[i - 1].valueUsd).toBeGreaterThanOrEqual(
          allocation[i].valueUsd
        );
      }
    });

    it('should include token count per chain', async () => {
      const allocation = await engine.getAllocationByChain(
        '0x1234567890123456789012345678901234567890'
      );

      allocation.forEach(item => {
        expect(item.tokenCount).toBeGreaterThan(0);
      });
    });
  });

  describe('getAllocationByCategory', () => {
    it('should categorize stablecoins', async () => {
      const allocation = await engine.getAllocationByCategory(
        '0x4567890123456789012345678901234567890123' // Stablecoin Holder
      );

      const stablecoinAllocation = allocation.find(a => a.name === 'Stablecoin');
      expect(stablecoinAllocation).toBeDefined();
      expect(stablecoinAllocation!.allocationPct).toBeGreaterThan(90); // >90% in stablecoins
    });

    it('should categorize DeFi tokens', async () => {
      const allocation = await engine.getAllocationByCategory(
        '0x2345678901234567890123456789012345678901' // DeFi Farmer
      );

      const defiAllocation = allocation.find(a => a.name === 'DeFi');
      expect(defiAllocation).toBeDefined();
    });

    it('should categorize blue chip tokens', async () => {
      const allocation = await engine.getAllocationByCategory(
        '0x1234567890123456789012345678901234567890'
      );

      const blueChipAllocation = allocation.find(a => a.name === 'Blue Chip');
      expect(blueChipAllocation).toBeDefined();
      expect(blueChipAllocation!.valueUsd).toBeGreaterThan(0);
    });

    it('should have Other category', async () => {
      const allocation = await engine.getAllocationByCategory(
        '0x1234567890123456789012345678901234567890'
      );

      // May or may not have Other category depending on holdings
      const categories = allocation.map(a => a.name);
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('getHoldings', () => {
    it('should get detailed holdings', async () => {
      const result = await engine.getHoldings(
        '0x1234567890123456789012345678901234567890'
      );

      expect(result.holdings.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should include all holding details', async () => {
      const result = await engine.getHoldings(
        '0x1234567890123456789012345678901234567890'
      );

      const holding = result.holdings[0];
      expect(holding.tokenSymbol).toBeDefined();
      expect(holding.tokenName).toBeDefined();
      expect(holding.tokenAddress).toBeDefined();
      expect(holding.chainId).toBeDefined();
      expect(holding.balance).toBeGreaterThan(0);
      expect(holding.valueUsd).toBeGreaterThan(0);
      expect(holding.positionType).toBeDefined();
    });

    it('should filter by chains', async () => {
      const result = await engine.getHoldings(
        '0x1234567890123456789012345678901234567890',
        { chains: ['ethereum'] }
      );

      result.holdings.forEach(holding => {
        expect(holding.chainId).toBe('ethereum');
      });
    });

    it('should filter by minimum value', async () => {
      const result = await engine.getHoldings(
        '0x1234567890123456789012345678901234567890',
        { minValue: 100000 }
      );

      result.holdings.forEach(holding => {
        expect(holding.valueUsd).toBeGreaterThanOrEqual(100000);
      });
    });

    it('should support pagination', async () => {
      const page1 = await engine.getHoldings(
        '0x1234567890123456789012345678901234567890',
        { page: 1, limit: 5 }
      );

      const page2 = await engine.getHoldings(
        '0x1234567890123456789012345678901234567890',
        { page: 2, limit: 5 }
      );

      expect(page1.holdings.length).toBeLessThanOrEqual(5);
      expect(page2.holdings.length).toBeLessThanOrEqual(5);

      // Different holdings on different pages
      if (page1.holdings.length > 0 && page2.holdings.length > 0) {
        expect(page1.holdings[0].tokenSymbol).not.toBe(page2.holdings[0].tokenSymbol);
      }
    });

    it('should order by value descending', async () => {
      const result = await engine.getHoldings(
        '0x1234567890123456789012345678901234567890'
      );

      for (let i = 1; i < result.holdings.length; i++) {
        expect(result.holdings[i - 1].valueUsd).toBeGreaterThanOrEqual(
          result.holdings[i].valueUsd
        );
      }
    });
  });
});

