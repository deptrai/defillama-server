import { MessageRouter, MessageData } from '../services/MessageRouter';

// Mock Redis client
jest.mock('../utils/redis', () => ({
  getRedisClient: jest.fn(() => ({
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    on: jest.fn(),
    quit: jest.fn()
  }))
}));

// Mock AWS API Gateway Management API
const mockPostToConnection = jest.fn();
jest.mock('aws-sdk', () => ({
  ApiGatewayManagementApi: jest.fn(() => ({
    postToConnection: mockPostToConnection
  }))
}));

describe('MessageRouter', () => {
  let messageRouter: MessageRouter;

  beforeEach(() => {
    messageRouter = new MessageRouter();
    jest.clearAllMocks();
  });

  describe('routeMessage', () => {
    const mockMessage: MessageData = {
      type: 'price_update',
      channel: 'prices',
      data: {
        tokenId: 'ethereum',
        price: 2500.50,
        change24h: 5.2
      },
      timestamp: Date.now(),
      source: 'test'
    };

    it('should route price update message', async () => {
      const result = await messageRouter.routeMessage(mockMessage);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.routedTo).toContain('prices');
    });

    it('should handle TVL update message', async () => {
      const tvlMessage: MessageData = {
        type: 'tvl_update',
        channel: 'tvl',
        data: {
          protocolId: 'uniswap-v3',
          tvl: 5000000000,
          change24h: 2.1
        },
        timestamp: Date.now(),
        source: 'test'
      };

      const result = await messageRouter.routeMessage(tvlMessage);

      expect(result.success).toBe(true);
      expect(result.routedTo).toContain('tvl');
    });

    it('should handle protocol update message', async () => {
      const protocolMessage: MessageData = {
        type: 'protocol_update',
        channel: 'protocols',
        data: {
          protocolId: 'compound',
          name: 'Compound',
          category: 'Lending',
          tvl: 8000000000
        },
        timestamp: Date.now(),
        source: 'test'
      };

      const result = await messageRouter.routeMessage(protocolMessage);

      expect(result.success).toBe(true);
      expect(result.routedTo).toContain('protocols');
    });

    it('should handle alert message', async () => {
      const alertMessage: MessageData = {
        type: 'alert',
        channel: 'alerts',
        data: {
          alertId: 'alert-123',
          type: 'price_threshold',
          message: 'ETH price above $2500',
          severity: 'medium'
        },
        timestamp: Date.now(),
        source: 'test'
      };

      const result = await messageRouter.routeMessage(alertMessage);

      expect(result.success).toBe(true);
      expect(result.routedTo).toContain('alerts');
    });

    it('should handle liquidation message', async () => {
      const liquidationMessage: MessageData = {
        type: 'liquidation',
        channel: 'liquidations',
        data: {
          liquidationId: 'liq-456',
          protocol: 'compound',
          amount: 100000,
          collateral: 'ETH',
          debt: 'USDC'
        },
        timestamp: Date.now(),
        source: 'test'
      };

      const result = await messageRouter.routeMessage(liquidationMessage);

      expect(result.success).toBe(true);
      expect(result.routedTo).toContain('liquidations');
    });

    it('should handle governance message', async () => {
      const governanceMessage: MessageData = {
        type: 'governance',
        channel: 'governance',
        data: {
          proposalId: 'prop-789',
          protocol: 'uniswap',
          title: 'Fee Structure Update',
          status: 'active'
        },
        timestamp: Date.now(),
        source: 'test'
      };

      const result = await messageRouter.routeMessage(governanceMessage);

      expect(result.success).toBe(true);
      expect(result.routedTo).toContain('governance');
    });

    it('should handle emission message', async () => {
      const emissionMessage: MessageData = {
        type: 'emission',
        channel: 'emissions',
        data: {
          tokenId: 'uni',
          protocol: 'uniswap',
          emissionRate: 1000,
          totalEmissions: 1000000000
        },
        timestamp: Date.now(),
        source: 'test'
      };

      const result = await messageRouter.routeMessage(emissionMessage);

      expect(result.success).toBe(true);
      expect(result.routedTo).toContain('emissions');
    });

    it('should reject invalid message type', async () => {
      const invalidMessage = {
        ...mockMessage,
        type: 'invalid_type' as any
      };

      const result = await messageRouter.routeMessage(invalidMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown message type');
    });

    it('should reject message without required fields', async () => {
      const incompleteMessage = {
        type: 'price_update',
        // Missing channel and data
      } as MessageData;

      const result = await messageRouter.routeMessage(incompleteMessage);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('broadcastToConnections', () => {
    it('should broadcast message to multiple connections', async () => {
      const connections = ['conn1', 'conn2', 'conn3'];
      const message = { type: 'test', data: 'hello' };

      mockPostToConnection.mockImplementation(() => ({
        promise: () => Promise.resolve()
      }));

      const result = await messageRouter.broadcastToConnections(connections, message);

      expect(result.success).toBe(true);
      expect(result.sentTo).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockPostToConnection).toHaveBeenCalledTimes(3);
    });

    it('should handle connection failures gracefully', async () => {
      const connections = ['conn1', 'conn2', 'conn3'];
      const message = { type: 'test', data: 'hello' };

      mockPostToConnection
        .mockImplementationOnce(() => ({
          promise: () => Promise.resolve()
        }))
        .mockImplementationOnce(() => ({
          promise: () => Promise.reject(new Error('Connection gone'))
        }))
        .mockImplementationOnce(() => ({
          promise: () => Promise.resolve()
        }));

      const result = await messageRouter.broadcastToConnections(connections, message);

      expect(result.success).toBe(true);
      expect(result.sentTo).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle empty connections array', async () => {
      const result = await messageRouter.broadcastToConnections([], { type: 'test' });

      expect(result.success).toBe(true);
      expect(result.sentTo).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockPostToConnection).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return routing statistics', async () => {
      // Route some messages first
      const message: MessageData = {
        type: 'price_update',
        channel: 'prices',
        data: { tokenId: 'ethereum', price: 2500 },
        timestamp: Date.now(),
        source: 'test'
      };

      await messageRouter.routeMessage(message);
      await messageRouter.routeMessage(message);

      const stats = messageRouter.getStats();

      expect(stats.totalMessages).toBeGreaterThan(0);
      expect(stats.messagesByType).toBeDefined();
      expect(stats.messagesByChannel).toBeDefined();
      expect(stats.uptime).toBeGreaterThan(0);
    });
  });
});
