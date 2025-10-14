/**
 * Story 1.1 Integration Test
 * Comprehensive test to verify all Story 1.1 requirements are implemented
 */

import { connectHandler, disconnectHandler, messageHandler } from '../handlers/connection-separate';
import { ConnectionManager } from '../services/ConnectionManager';
import { RoomManager } from '../services/RoomManager';
import { AuthService } from '../services/AuthService';
import { MessageRouter } from '../services/MessageRouter';

// Mock dependencies
jest.mock('../utils/redis');
jest.mock('../../api-keys/checkApiKey');
jest.mock('aws-sdk');

import { checkApiKey } from '../../api-keys/checkApiKey';
const mockCheckApiKey = checkApiKey as jest.MockedFunction<typeof checkApiKey>;

describe('Story 1.1: WebSocket Connection Manager Foundation - Integration Test', () => {
  let connectionManager: ConnectionManager;
  let roomManager: RoomManager;
  let authService: AuthService;
  let messageRouter: MessageRouter;

  beforeEach(() => {
    connectionManager = new ConnectionManager();
    roomManager = new RoomManager();
    authService = new AuthService();
    messageRouter = new MessageRouter();
    
    jest.clearAllMocks();
    authService.clearCache();
  });

  describe('AC1: WebSocket Connection Establishment', () => {
    it('should establish WebSocket connection with valid API key', async () => {
      mockCheckApiKey.mockResolvedValue(true);

      const event = {
        requestContext: {
          connectionId: 'test-connection-123',
          eventType: 'CONNECT',
          routeKey: '$connect'
        },
        queryStringParameters: {
          apiKey: 'valid-api-key-123'
        },
        headers: {
          'User-Agent': 'Test Client',
          'Origin': 'https://defillama.com'
        }
      } as any;

      const result = await connectHandler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toMatchObject({
        message: 'Connected successfully',
        connectionId: 'test-connection-123'
      });
    });

    it('should reject connection with invalid API key', async () => {
      mockCheckApiKey.mockResolvedValue(false);

      const event = {
        requestContext: {
          connectionId: 'test-connection-123'
        },
        queryStringParameters: {
          apiKey: 'invalid-key'
        }
      } as any;

      const result = await connectHandler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Invalid API key'
      });
    });

    it('should reject connection without API key', async () => {
      const event = {
        requestContext: {
          connectionId: 'test-connection-123'
        },
        queryStringParameters: {}
      } as any;

      const result = await connectHandler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'API key required'
      });
    });
  });

  describe('AC2: Connection State Management', () => {
    it('should store connection state in Redis', async () => {
      const connectionData = {
        connectionId: 'test-conn-123',
        apiKey: 'valid-key',
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        subscriptions: []
      };

      // Mock Redis operations
      const mockRedis = require('../utils/redis').getRedisClient();
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await connectionManager.addConnection('test-conn-123', connectionData);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'ws:connection:test-conn-123',
        expect.objectContaining({
          connectionId: 'test-conn-123',
          apiKey: 'valid-key'
        })
      );
      expect(mockRedis.sadd).toHaveBeenCalledWith('ws:connections', 'test-conn-123');
    });

    it('should update heartbeat timestamp', async () => {
      const mockRedis = require('../utils/redis').getRedisClient();
      mockRedis.hset.mockResolvedValue(1);

      await connectionManager.updateHeartbeat('test-conn-123');

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'ws:connection:test-conn-123',
        'lastHeartbeat',
        expect.any(String)
      );
    });
  });

  describe('AC3: Room-based Subscriptions', () => {
    it('should subscribe connection to room with filters', async () => {
      const mockRedis = require('../utils/redis').getRedisClient();
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);

      const filters = {
        protocolIds: ['uniswap-v3'],
        minValue: 1000
      };

      await roomManager.subscribe('test-conn-123', 'prices', filters);

      expect(mockRedis.sadd).toHaveBeenCalledWith('ws:room:prices', 'test-conn-123');
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'ws:connection:test-conn-123:subscriptions',
        'prices',
        JSON.stringify(filters)
      );
    });

    it('should handle subscription via WebSocket message', async () => {
      mockCheckApiKey.mockResolvedValue(true);
      
      const mockRedis = require('../utils/redis').getRedisClient();
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.sadd.mockResolvedValue(1);

      const event = {
        requestContext: {
          connectionId: 'test-conn-123'
        },
        body: JSON.stringify({
          type: 'subscribe',
          channel: 'prices',
          filters: {
            protocolIds: ['uniswap-v3']
          }
        })
      } as any;

      const result = await messageHandler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toMatchObject({
        type: 'subscribed',
        channel: 'prices'
      });
    });
  });

  describe('AC4: Message Broadcasting', () => {
    it('should route price update message', async () => {
      const messageData = {
        type: 'price_update' as const,
        channel: 'prices',
        data: {
          tokenId: 'ethereum',
          price: 2500.50,
          change24h: 5.2
        },
        timestamp: Date.now(),
        source: 'test'
      };

      const result = await messageRouter.routeMessage(messageData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.routedTo).toContain('prices');
    });

    it('should broadcast to filtered connections', async () => {
      const mockRedis = require('../utils/redis').getRedisClient();
      mockRedis.smembers.mockResolvedValue(['conn1', 'conn2']);
      mockRedis.hget
        .mockResolvedValueOnce(JSON.stringify({ protocolIds: ['uniswap-v3'] }))
        .mockResolvedValueOnce(JSON.stringify({ protocolIds: ['compound'] }));

      const message = {
        type: 'price_update',
        data: { protocolId: 'uniswap-v3' }
      };

      const filteredMembers = await roomManager.getFilteredMembers('prices', message);

      expect(filteredMembers).toEqual(['conn1']);
    });
  });

  describe('AC5: Connection Cleanup', () => {
    it('should clean up connection on disconnect', async () => {
      const mockRedis = require('../utils/redis').getRedisClient();
      mockRedis.hgetall.mockResolvedValue({
        connectionId: 'test-conn-123',
        subscriptions: JSON.stringify(['prices', 'tvl'])
      });
      mockRedis.srem.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      const event = {
        requestContext: {
          connectionId: 'test-conn-123'
        }
      } as any;

      const result = await disconnectHandler(event);

      expect(result.statusCode).toBe(200);
      expect(mockRedis.srem).toHaveBeenCalledWith('ws:connections', 'test-conn-123');
      expect(mockRedis.del).toHaveBeenCalledWith('ws:connection:test-conn-123');
    });
  });

  describe('AC6: Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      const mockRedis = require('../utils/redis').getRedisClient();
      mockRedis.hset.mockRejectedValue(new Error('Redis connection failed'));

      const connectionData = {
        connectionId: 'test-conn-123',
        apiKey: 'valid-key',
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        subscriptions: []
      };

      await expect(
        connectionManager.addConnection('test-conn-123', connectionData)
      ).rejects.toThrow('Redis connection failed');
    });

    it('should handle malformed WebSocket messages', async () => {
      const event = {
        requestContext: {
          connectionId: 'test-conn-123'
        },
        body: 'invalid-json'
      } as any;

      const result = await messageHandler(event);

      expect(result.statusCode).toBe(500);
    });
  });

  describe('Story 1.1 Completeness Check', () => {
    it('should have all required files and exports', () => {
      // Check handlers exist
      expect(connectHandler).toBeDefined();
      expect(disconnectHandler).toBeDefined();
      expect(messageHandler).toBeDefined();

      // Check services exist
      expect(ConnectionManager).toBeDefined();
      expect(RoomManager).toBeDefined();
      expect(AuthService).toBeDefined();
      expect(MessageRouter).toBeDefined();
    });

    it('should support all required message types', async () => {
      const messageTypes = [
        'price_update',
        'tvl_update', 
        'protocol_update',
        'alert',
        'liquidation',
        'governance',
        'emission'
      ];

      for (const type of messageTypes) {
        const messageData = {
          type: type as any,
          channel: 'test',
          data: { test: 'data' },
          timestamp: Date.now(),
          source: 'test'
        };

        const result = await messageRouter.routeMessage(messageData);
        expect(result.success).toBe(true);
      }
    });

    it('should support all required subscription filters', async () => {
      const filters = {
        protocolIds: ['uniswap-v3'],
        tokenIds: ['ethereum'],
        chains: ['ethereum'],
        userId: 'user123',
        minValue: 1000,
        maxValue: 10000
      };

      const mockRedis = require('../utils/redis').getRedisClient();
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);

      await roomManager.subscribe('test-conn', 'prices', filters);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'ws:connection:test-conn:subscriptions',
        'prices',
        JSON.stringify(filters)
      );
    });
  });
});
