/**
 * Tests for HolderDistributionEngine
 * Story: 2.2.2 - Holder Distribution Analysis
 */

import { HolderDistributionEngine } from '../holder-distribution-engine';
import { query } from '../../db/connection';

jest.mock('../../db/connection');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('HolderDistributionEngine', () => {
  let engine: HolderDistributionEngine;

  beforeEach(() => {
    engine = HolderDistributionEngine.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = HolderDistributionEngine.getInstance();
      const instance2 = HolderDistributionEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getDistribution', () => {
    it('should return complete distribution data', async () => {
      // Mock total holders
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '53' }] } as any);

      // calculateConcentration calls:
      // 1. Mock balances for Gini
      mockQuery.mockResolvedValueOnce({
        rows: Array.from({ length: 53 }, (_, i) => ({
          balance: String(100 + i * 10),
          supply_percentage: String(0.1 + i * 0.01),
        })),
      } as any);

      // 2. Mock top 10
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '45.5' }] } as any);
      // 3. Mock top 50
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '78.2' }] } as any);
      // 4. Mock top 100
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '95.1' }] } as any);

      // getHolderTypeDistribution call:
      // 5. Mock holder types
      mockQuery.mockResolvedValueOnce({
        rows: [
          { holder_type: 'whale', count: '3', total_percentage: '9.5' },
          { holder_type: 'large', count: '5', total_percentage: '1.95' },
          { holder_type: 'medium', count: '10', total_percentage: '0.31' },
          { holder_type: 'small', count: '15', total_percentage: '0.03' },
          { holder_type: 'dust', count: '20', total_percentage: '0.001' },
        ],
      } as any);

      // getBalanceRangeDistribution calls:
      // 6-10. Mock balance ranges (5 ranges)
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({
          rows: [{ count: String(10 + i), total_balance: String(1000 + i * 100), total_percentage: String(5 + i) }],
        } as any);
      }

      const result = await engine.getDistribution('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');

      expect(result.tokenAddress).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
      expect(result.chainId).toBe('ethereum');
      expect(result.totalHolders).toBe(53);
      expect(result.concentration.giniCoefficient).toBeGreaterThanOrEqual(0);
      expect(result.concentration.giniCoefficient).toBeLessThanOrEqual(1);
      expect(result.concentration.concentrationScore).toBeGreaterThanOrEqual(0);
      expect(result.concentration.concentrationScore).toBeLessThanOrEqual(100);
      expect(result.holderTypes.whales.count).toBe(3);
      expect(result.distribution).toHaveLength(5);
    });

    it('should throw error when no holders found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      await expect(
        engine.getDistribution('0xInvalidToken')
      ).rejects.toThrow('No holders found');
    });

    it('should handle custom chain ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '0' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '0' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '0' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '0', total_balance: '0', total_percentage: '0' }] } as any);
      }

      const result = await engine.getDistribution('0xToken', 'polygon');
      expect(result.chainId).toBe('polygon');
    });
  });

  describe('Gini coefficient calculation', () => {
    it('should calculate Gini coefficient correctly for equal distribution', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] } as any);
      
      // Equal balances
      mockQuery.mockResolvedValueOnce({
        rows: [
          { balance: '100', supply_percentage: '20' },
          { balance: '100', supply_percentage: '20' },
          { balance: '100', supply_percentage: '20' },
          { balance: '100', supply_percentage: '20' },
          { balance: '100', supply_percentage: '20' },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '40' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '1', total_balance: '100', total_percentage: '20' }] } as any);
      }

      const result = await engine.getDistribution('0xToken');
      
      // Equal distribution should have Gini close to 0
      expect(result.concentration.giniCoefficient).toBeLessThan(0.1);
    });

    it('should calculate Gini coefficient correctly for unequal distribution', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] } as any);
      
      // Highly unequal balances
      mockQuery.mockResolvedValueOnce({
        rows: [
          { balance: '1', supply_percentage: '0.1' },
          { balance: '1', supply_percentage: '0.1' },
          { balance: '1', supply_percentage: '0.1' },
          { balance: '1', supply_percentage: '0.1' },
          { balance: '996', supply_percentage: '99.6' },
        ],
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '99.6' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '1', total_balance: '200', total_percentage: '20' }] } as any);
      }

      const result = await engine.getDistribution('0xToken');
      
      // Unequal distribution should have Gini close to 1
      expect(result.concentration.giniCoefficient).toBeGreaterThan(0.7);
    });
  });

  describe('getTopHolders', () => {
    it('should return top holders with correct ranking', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            wallet_address: '0xWhale1',
            balance: '1000000',
            balance_usd: '1000000',
            supply_percentage: '5.5',
            holder_type: 'whale',
            is_contract: false,
            is_exchange: false,
            first_seen: new Date('2023-01-01'),
            last_active: new Date('2024-01-01'),
            holding_period_days: 365,
            transaction_count: 50,
          },
          {
            wallet_address: '0xWhale2',
            balance: '500000',
            balance_usd: '500000',
            supply_percentage: '2.5',
            holder_type: 'whale',
            is_contract: false,
            is_exchange: true,
            first_seen: new Date('2023-06-01'),
            last_active: new Date('2024-01-01'),
            holding_period_days: 214,
            transaction_count: 100,
          },
        ],
      } as any);

      const result = await engine.getTopHolders('0xToken');

      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(1);
      expect(result[0].walletAddress).toBe('0xWhale1');
      expect(result[0].balance).toBe(1000000);
      expect(result[1].rank).toBe(2);
      expect(result[1].isExchange).toBe(true);
    });

    it('should exclude contracts when requested', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await engine.getTopHolders('0xToken', 'ethereum', { excludeContracts: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_contract = FALSE'),
        expect.any(Array)
      );
    });

    it('should exclude exchanges when requested', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await engine.getTopHolders('0xToken', 'ethereum', { excludeExchanges: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_exchange = FALSE'),
        expect.any(Array)
      );
    });

    it('should respect limit parameter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await engine.getTopHolders('0xToken', 'ethereum', { limit: 50 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([50])
      );
    });

    it('should use default limit of 100', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await engine.getTopHolders('0xToken');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([100])
      );
    });
  });

  describe('concentration metrics', () => {
    it('should calculate concentration score from Gini coefficient', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] } as any);
      mockQuery.mockResolvedValueOnce({
        rows: Array.from({ length: 10 }, (_, i) => ({
          balance: String(100 + i * 50),
          supply_percentage: String(1 + i * 0.5),
        })),
      } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '50' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '80' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '95' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '2', total_balance: '200', total_percentage: '10' }] } as any);
      }

      const result = await engine.getDistribution('0xToken');

      expect(result.concentration.concentrationScore).toBe(
        result.concentration.giniCoefficient * 100
      );
    });

    it('should calculate top holder percentages correctly', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '100' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '45.5' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '78.2' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '95.1' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '20', total_balance: '2000', total_percentage: '20' }] } as any);
      }

      const result = await engine.getDistribution('0xToken');

      expect(result.concentration.top10Percentage).toBe(45.5);
      expect(result.concentration.top50Percentage).toBe(78.2);
      expect(result.concentration.top100Percentage).toBe(95.1);
    });
  });

  describe('holder type distribution', () => {
    it('should categorize all holder types', async () => {
      // Total holders
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '53' }] } as any);

      // calculateConcentration: balances + 3 top N queries
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '0' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '0' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '0' }] } as any);

      // getHolderTypeDistribution
      mockQuery.mockResolvedValueOnce({
        rows: [
          { holder_type: 'whale', count: '3', total_percentage: '9.5' },
          { holder_type: 'large', count: '5', total_percentage: '1.95' },
          { holder_type: 'medium', count: '10', total_percentage: '0.31' },
          { holder_type: 'small', count: '15', total_percentage: '0.03' },
          { holder_type: 'dust', count: '20', total_percentage: '0.001' },
        ],
      } as any);

      // getBalanceRangeDistribution (5 ranges)
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '10', total_balance: '1000', total_percentage: '10' }] } as any);
      }

      const result = await engine.getDistribution('0xToken');

      expect(result.holderTypes.whales.count).toBe(3);
      expect(result.holderTypes.whales.percentage).toBe(9.5);
      expect(result.holderTypes.large.count).toBe(5);
      expect(result.holderTypes.medium.count).toBe(10);
      expect(result.holderTypes.small.count).toBe(15);
      expect(result.holderTypes.dust.count).toBe(20);
    });

    it('should handle missing holder types', async () => {
      // Total holders
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] } as any);

      // calculateConcentration: balances + 3 top N queries
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '0' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '0' }] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ total_percentage: '0' }] } as any);

      // getHolderTypeDistribution
      mockQuery.mockResolvedValueOnce({
        rows: [{ holder_type: 'whale', count: '3', total_percentage: '100' }],
      } as any);

      // getBalanceRangeDistribution (5 ranges)
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '0', total_balance: '0', total_percentage: '0' }] } as any);
      }

      const result = await engine.getDistribution('0xToken');

      expect(result.holderTypes.whales.count).toBe(3);
      expect(result.holderTypes.large.count).toBe(0);
      expect(result.holderTypes.medium.count).toBe(0);
      expect(result.holderTypes.small.count).toBe(0);
      expect(result.holderTypes.dust.count).toBe(0);
    });
  });
});

