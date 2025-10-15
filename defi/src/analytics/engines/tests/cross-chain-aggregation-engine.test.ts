/**
 * Unit Tests: CrossChainAggregationEngine
 * Story: 2.2.3 - Cross-chain Portfolio Aggregation
 */

import { CrossChainAggregationEngine } from '../cross-chain-aggregation-engine';
import { query } from '../../db/connection';

// Mock the database connection
jest.mock('../../db/connection');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('CrossChainAggregationEngine', () => {
  let engine: CrossChainAggregationEngine;

  beforeEach(() => {
    engine = CrossChainAggregationEngine.getInstance();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CrossChainAggregationEngine.getInstance();
      const instance2 = CrossChainAggregationEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getPortfolio', () => {
    it('should return aggregated portfolio for user', async () => {
      const mockData = {
        user_id: 'user-001',
        wallet_addresses: {
          ethereum: ['0xWallet1'],
          polygon: ['0xWallet2'],
        },
        total_net_worth_usd: '100000.00',
        net_worth_change_24h: '2.5',
        net_worth_change_7d: '8.3',
        net_worth_change_30d: '15.7',
        total_assets: 10,
        total_chains: 2,
        total_wallets: 2,
        asset_breakdown: { ETH: 50000, USDC: 50000 },
        chain_breakdown: { ethereum: 60000, polygon: 40000 },
        category_breakdown: { native: 50000, stablecoins: 50000 },
        total_pnl_usd: '15000.00',
        total_roi: '0.176',
        last_updated: '2025-01-15T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockData] } as any);

      const result = await engine.getPortfolio('user-001');

      expect(result.userId).toBe('user-001');
      expect(result.totalNetWorthUsd).toBe(100000);
      expect(result.netWorthChange24h).toBe(2.5);
      expect(result.totalAssets).toBe(10);
      expect(result.totalChains).toBe(2);
      expect(result.assetBreakdown).toEqual({ ETH: 50000, USDC: 50000 });
      expect(result.chainBreakdown).toEqual({ ethereum: 60000, polygon: 40000 });
    });

    it('should throw error if portfolio not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await expect(engine.getPortfolio('nonexistent')).rejects.toThrow(
        'No cross-chain portfolio found for user nonexistent'
      );
    });
  });

  describe('getAssets', () => {
    it('should return all assets for user', async () => {
      // Mock portfolio query
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'portfolio-001' }],
      } as any);

      // Mock assets query
      const mockAssets = [
        {
          chain_id: 'ethereum',
          wallet_address: '0xWallet1',
          token_address: null,
          token_symbol: 'ETH',
          token_name: 'Ethereum',
          balance: '10.0',
          balance_usd: '18000.00',
          price_usd: '1800.00',
          category: 'native',
          is_native: true,
          is_wrapped: false,
          is_bridged: false,
          cost_basis_usd: '15000.00',
          unrealized_pnl: '3000.00',
          roi: '0.20',
        },
        {
          chain_id: 'polygon',
          wallet_address: '0xWallet2',
          token_address: '0xUSDC',
          token_symbol: 'USDC',
          token_name: 'USD Coin',
          balance: '10000.0',
          balance_usd: '10000.00',
          price_usd: '1.00',
          category: 'stablecoin',
          is_native: false,
          is_wrapped: false,
          is_bridged: true,
          cost_basis_usd: '10000.00',
          unrealized_pnl: '0.00',
          roi: '0.00',
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockAssets } as any);

      const result = await engine.getAssets('user-001');

      expect(result).toHaveLength(2);
      expect(result[0].chainId).toBe('ethereum');
      expect(result[0].tokenSymbol).toBe('ETH');
      expect(result[0].balanceUsd).toBe(18000);
      expect(result[0].isNative).toBe(true);
      expect(result[1].chainId).toBe('polygon');
      expect(result[1].isBridged).toBe(true);
    });

    it('should filter assets by chain', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'portfolio-001' }],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            chain_id: 'ethereum',
            wallet_address: '0xWallet1',
            token_address: null,
            token_symbol: 'ETH',
            token_name: 'Ethereum',
            balance: '10.0',
            balance_usd: '18000.00',
            price_usd: '1800.00',
            category: 'native',
            is_native: true,
            is_wrapped: false,
            is_bridged: false,
            cost_basis_usd: '15000.00',
            unrealized_pnl: '3000.00',
            roi: '0.20',
          },
        ],
      } as any);

      const result = await engine.getAssets('user-001', { chainId: 'ethereum' });

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe('ethereum');
    });

    it('should filter assets by category', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'portfolio-001' }],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            chain_id: 'polygon',
            wallet_address: '0xWallet2',
            token_address: '0xUSDC',
            token_symbol: 'USDC',
            token_name: 'USD Coin',
            balance: '10000.0',
            balance_usd: '10000.00',
            price_usd: '1.00',
            category: 'stablecoin',
            is_native: false,
            is_wrapped: false,
            is_bridged: true,
            cost_basis_usd: '10000.00',
            unrealized_pnl: '0.00',
            roi: '0.00',
          },
        ],
      } as any);

      const result = await engine.getAssets('user-001', { category: 'stablecoin' });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('stablecoin');
    });

    it('should filter assets by minimum value', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'portfolio-001' }],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            chain_id: 'ethereum',
            wallet_address: '0xWallet1',
            token_address: null,
            token_symbol: 'ETH',
            token_name: 'Ethereum',
            balance: '10.0',
            balance_usd: '18000.00',
            price_usd: '1800.00',
            category: 'native',
            is_native: true,
            is_wrapped: false,
            is_bridged: false,
            cost_basis_usd: '15000.00',
            unrealized_pnl: '3000.00',
            roi: '0.20',
          },
        ],
      } as any);

      const result = await engine.getAssets('user-001', { minValueUsd: 15000 });

      expect(result).toHaveLength(1);
      expect(result[0].balanceUsd).toBeGreaterThanOrEqual(15000);
    });
  });

  describe('getAssetBreakdown', () => {
    it('should return asset breakdown from portfolio', async () => {
      const mockData = {
        user_id: 'user-001',
        wallet_addresses: {},
        total_net_worth_usd: '100000.00',
        net_worth_change_24h: '0',
        net_worth_change_7d: '0',
        net_worth_change_30d: '0',
        total_assets: 10,
        total_chains: 2,
        total_wallets: 2,
        asset_breakdown: { ETH: 50000, USDC: 30000, UNI: 20000 },
        chain_breakdown: {},
        category_breakdown: {},
        total_pnl_usd: '0',
        total_roi: '0',
        last_updated: '2025-01-15T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockData] } as any);

      const result = await engine.getAssetBreakdown('user-001');

      expect(result).toEqual({ ETH: 50000, USDC: 30000, UNI: 20000 });
    });
  });

  describe('getChainBreakdown', () => {
    it('should return chain breakdown from portfolio', async () => {
      const mockData = {
        user_id: 'user-001',
        wallet_addresses: {},
        total_net_worth_usd: '100000.00',
        net_worth_change_24h: '0',
        net_worth_change_7d: '0',
        net_worth_change_30d: '0',
        total_assets: 10,
        total_chains: 2,
        total_wallets: 2,
        asset_breakdown: {},
        chain_breakdown: { ethereum: 60000, polygon: 40000 },
        category_breakdown: {},
        total_pnl_usd: '0',
        total_roi: '0',
        last_updated: '2025-01-15T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockData] } as any);

      const result = await engine.getChainBreakdown('user-001');

      expect(result).toEqual({ ethereum: 60000, polygon: 40000 });
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should return category breakdown from portfolio', async () => {
      const mockData = {
        user_id: 'user-001',
        wallet_addresses: {},
        total_net_worth_usd: '100000.00',
        net_worth_change_24h: '0',
        net_worth_change_7d: '0',
        net_worth_change_30d: '0',
        total_assets: 10,
        total_chains: 2,
        total_wallets: 2,
        asset_breakdown: {},
        chain_breakdown: {},
        category_breakdown: { defi: 40000, stablecoins: 30000, native: 30000 },
        total_pnl_usd: '0',
        total_roi: '0',
        last_updated: '2025-01-15T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockData] } as any);

      const result = await engine.getCategoryBreakdown('user-001');

      expect(result).toEqual({ defi: 40000, stablecoins: 30000, native: 30000 });
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should calculate performance metrics across all assets', async () => {
      // Mock portfolio query
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'portfolio-001' }],
      } as any);

      // Mock assets query
      const mockAssets = [
        {
          chain_id: 'ethereum',
          wallet_address: '0xWallet1',
          token_address: null,
          token_symbol: 'ETH',
          token_name: 'Ethereum',
          balance: '10.0',
          balance_usd: '18000.00',
          price_usd: '1800.00',
          category: 'native',
          is_native: true,
          is_wrapped: false,
          is_bridged: false,
          cost_basis_usd: '15000.00',
          unrealized_pnl: '3000.00',
          roi: '0.20',
        },
        {
          chain_id: 'polygon',
          wallet_address: '0xWallet2',
          token_address: '0xUSDC',
          token_symbol: 'USDC',
          token_name: 'USD Coin',
          balance: '10000.0',
          balance_usd: '10000.00',
          price_usd: '1.00',
          category: 'stablecoin',
          is_native: false,
          is_wrapped: false,
          is_bridged: true,
          cost_basis_usd: '10000.00',
          unrealized_pnl: '0.00',
          roi: '0.00',
        },
        {
          chain_id: 'arbitrum',
          wallet_address: '0xWallet3',
          token_address: '0xARB',
          token_symbol: 'ARB',
          token_name: 'Arbitrum',
          balance: '5000.0',
          balance_usd: '5000.00',
          price_usd: '1.00',
          category: 'native',
          is_native: false,
          is_wrapped: false,
          is_bridged: false,
          cost_basis_usd: '4000.00',
          unrealized_pnl: '1000.00',
          roi: '0.25',
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockAssets } as any);

      const result = await engine.getPerformanceMetrics('user-001');

      expect(result.totalPnl).toBe(4000); // 3000 + 0 + 1000
      expect(result.totalRoi).toBeCloseTo(0.1379, 4); // 4000 / 29000
      expect(result.pnlByChain).toEqual({
        ethereum: 3000,
        polygon: 0,
        arbitrum: 1000,
      });
      expect(result.pnlByToken).toEqual({
        ETH: 3000,
        USDC: 0,
        ARB: 1000,
      });
      expect(result.bestPerformers).toHaveLength(3);
      expect(result.bestPerformers[0].tokenSymbol).toBe('ARB'); // Highest ROI
      expect(result.worstPerformers).toHaveLength(3);
    });

    it('should handle zero cost basis', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'portfolio-001' }],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            chain_id: 'ethereum',
            wallet_address: '0xWallet1',
            token_address: null,
            token_symbol: 'ETH',
            token_name: 'Ethereum',
            balance: '10.0',
            balance_usd: '18000.00',
            price_usd: '1800.00',
            category: 'native',
            is_native: true,
            is_wrapped: false,
            is_bridged: false,
            cost_basis_usd: '0.00',
            unrealized_pnl: '18000.00',
            roi: '0.00',
          },
        ],
      } as any);

      const result = await engine.getPerformanceMetrics('user-001');

      expect(result.totalPnl).toBe(18000);
      expect(result.totalRoi).toBe(0); // Zero cost basis
    });
  });

  describe('getCrossChainTransactions', () => {
    it('should return mock transactions for user', async () => {
      // Mock portfolio query
      const mockPortfolio = {
        user_id: 'user-001',
        wallet_addresses: { ethereum: ['0xWallet1'] },
        total_net_worth_usd: '100000.00',
        net_worth_change_24h: '0',
        net_worth_change_7d: '0',
        net_worth_change_30d: '0',
        total_assets: 1,
        total_chains: 1,
        total_wallets: 1,
        asset_breakdown: {},
        chain_breakdown: {},
        category_breakdown: {},
        total_pnl_usd: '0',
        total_roi: '0',
        last_updated: '2025-01-15T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockPortfolio] } as any);

      // Mock assets query
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'portfolio-001' }],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            chain_id: 'ethereum',
            wallet_address: '0xWallet1',
            token_address: null,
            token_symbol: 'ETH',
            token_name: 'Ethereum',
            balance: '10.0',
            balance_usd: '18000.00',
            price_usd: '1800.00',
            category: 'native',
            is_native: true,
            is_wrapped: false,
            is_bridged: false,
            cost_basis_usd: '15000.00',
            unrealized_pnl: '3000.00',
            roi: '0.20',
          },
        ],
      } as any);

      const result = await engine.getCrossChainTransactions('user-001');

      expect(result.transactions.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.transactions[0]).toHaveProperty('chainId');
      expect(result.transactions[0]).toHaveProperty('txHash');
      expect(result.transactions[0]).toHaveProperty('type');
      expect(result.transactions[0]).toHaveProperty('tokenSymbol');
    });

    it('should filter transactions by chain', async () => {
      const mockPortfolio = {
        user_id: 'user-001',
        wallet_addresses: { ethereum: ['0xWallet1'], polygon: ['0xWallet2'] },
        total_net_worth_usd: '100000.00',
        net_worth_change_24h: '0',
        net_worth_change_7d: '0',
        net_worth_change_30d: '0',
        total_assets: 2,
        total_chains: 2,
        total_wallets: 2,
        asset_breakdown: {},
        chain_breakdown: {},
        category_breakdown: {},
        total_pnl_usd: '0',
        total_roi: '0',
        last_updated: '2025-01-15T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockPortfolio] } as any);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'portfolio-001' }],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            chain_id: 'ethereum',
            wallet_address: '0xWallet1',
            token_address: null,
            token_symbol: 'ETH',
            token_name: 'Ethereum',
            balance: '10.0',
            balance_usd: '18000.00',
            price_usd: '1800.00',
            category: 'native',
            is_native: true,
            is_wrapped: false,
            is_bridged: false,
            cost_basis_usd: '15000.00',
            unrealized_pnl: '3000.00',
            roi: '0.20',
          },
        ],
      } as any);

      const result = await engine.getCrossChainTransactions('user-001', {
        chainId: 'ethereum',
      });

      expect(result.transactions.every(tx => tx.chainId === 'ethereum')).toBe(true);
    });

    it('should paginate transactions', async () => {
      const mockPortfolio = {
        user_id: 'user-001',
        wallet_addresses: { ethereum: ['0xWallet1'] },
        total_net_worth_usd: '100000.00',
        net_worth_change_24h: '0',
        net_worth_change_7d: '0',
        net_worth_change_30d: '0',
        total_assets: 1,
        total_chains: 1,
        total_wallets: 1,
        asset_breakdown: {},
        chain_breakdown: {},
        category_breakdown: {},
        total_pnl_usd: '0',
        total_roi: '0',
        last_updated: '2025-01-15T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockPortfolio] } as any);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'portfolio-001' }],
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            chain_id: 'ethereum',
            wallet_address: '0xWallet1',
            token_address: null,
            token_symbol: 'ETH',
            token_name: 'Ethereum',
            balance: '10.0',
            balance_usd: '18000.00',
            price_usd: '1800.00',
            category: 'native',
            is_native: true,
            is_wrapped: false,
            is_bridged: false,
            cost_basis_usd: '15000.00',
            unrealized_pnl: '3000.00',
            roi: '0.20',
          },
        ],
      } as any);

      const result = await engine.getCrossChainTransactions('user-001', {
        limit: 5,
        offset: 0,
      });

      expect(result.transactions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('compareChainPerformance', () => {
    it('should compare performance across chains', async () => {
      // Mock portfolio query
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'portfolio-001' }],
      } as any);

      // Mock assets query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            chain_id: 'ethereum',
            wallet_address: '0xWallet1',
            token_address: null,
            token_symbol: 'ETH',
            token_name: 'Ethereum',
            balance: '10.0',
            balance_usd: '18000.00',
            price_usd: '1800.00',
            category: 'native',
            is_native: true,
            is_wrapped: false,
            is_bridged: false,
            cost_basis_usd: '15000.00',
            unrealized_pnl: '3000.00',
            roi: '0.20',
          },
          {
            chain_id: 'polygon',
            wallet_address: '0xWallet2',
            token_address: '0xUSDC',
            token_symbol: 'USDC',
            token_name: 'USD Coin',
            balance: '10000.0',
            balance_usd: '10000.00',
            price_usd: '1.00',
            category: 'stablecoin',
            is_native: false,
            is_wrapped: false,
            is_bridged: true,
            cost_basis_usd: '10000.00',
            unrealized_pnl: '0.00',
            roi: '0.00',
          },
        ],
      } as any);

      // Mock portfolio query for chain breakdown
      const mockPortfolio = {
        user_id: 'user-001',
        wallet_addresses: {},
        total_net_worth_usd: '28000.00',
        net_worth_change_24h: '0',
        net_worth_change_7d: '0',
        net_worth_change_30d: '0',
        total_assets: 2,
        total_chains: 2,
        total_wallets: 2,
        asset_breakdown: {},
        chain_breakdown: { ethereum: 18000, polygon: 10000 },
        category_breakdown: {},
        total_pnl_usd: '3000.00',
        total_roi: '0.12',
        last_updated: '2025-01-15T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockPortfolio] } as any);

      const result = await engine.compareChainPerformance('user-001');

      expect(result).toHaveLength(2);
      expect(result[0].chainId).toBe('ethereum');
      expect(result[0].valueUsd).toBe(18000);
      expect(result[0].pnl).toBe(3000);
      expect(result[0].roi).toBe(0.2);
      expect(result[0].assetCount).toBe(1);

      expect(result[1].chainId).toBe('polygon');
      expect(result[1].valueUsd).toBe(10000);
      expect(result[1].pnl).toBe(0);
      expect(result[1].roi).toBe(0);
      expect(result[1].assetCount).toBe(1);
    });
  });
});

