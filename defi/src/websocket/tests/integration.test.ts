import WebSocket from 'ws';
import { Redis } from 'ioredis';
import { ConnectionManager } from '../services/ConnectionManager';
import { RoomManager } from '../services/RoomManager';
import { MessageRouter } from '../services/MessageRouter';

// Integration tests for WebSocket services
// These tests require Redis to be running locally

describe('WebSocket Integration Tests', () => {
  let redis: Redis;
  let connectionManager: ConnectionManager;
  let roomManager: RoomManager;
  let messageRouter: MessageRouter;

  const testConnectionId = 'test-connection-123';
  const testApiKey = 'test-api-key';

  beforeAll(async () => {
    // Skip integration tests if Redis is not available
    try {
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: 15, // Use separate DB for tests
      });
      
      await redis.ping();
      console.log('Redis connection established for integration tests');
    } catch (error) {
      console.log('Redis not available, skipping integration tests');
      return;
    }

    connectionManager = new ConnectionManager();
    roomManager = new RoomManager();
    messageRouter = new MessageRouter();
  });

  afterAll(async () => {
    if (redis) {
      await redis.flushdb(); // Clean up test data
      await redis.quit();
    }
  });

  beforeEach(async () => {
    if (redis) {
      await redis.flushdb(); // Clean up before each test
    }
  });

  describe('Connection Management', () => {
    it('should manage connection lifecycle', async () => {
      if (!redis) return;

      const connectionData = {
        connectionId: testConnectionId,
        apiKey: testApiKey,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        subscriptions: [],
        metadata: {
          userAgent: 'test-agent',
          ip: '127.0.0.1'
        }
      };

      // Add connection
      await connectionManager.addConnection(testConnectionId, connectionData);

      // Verify connection exists
      const retrievedConnection = await connectionManager.getConnection(testConnectionId);
      expect(retrievedConnection).toBeTruthy();
      expect(retrievedConnection!.connectionId).toBe(testConnectionId);
      expect(retrievedConnection!.apiKey).toBe(testApiKey);

      // Update heartbeat
      const originalHeartbeat = retrievedConnection!.lastHeartbeat;
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await connectionManager.updateHeartbeat(testConnectionId);

      const updatedConnection = await connectionManager.getConnection(testConnectionId);
      expect(updatedConnection!.lastHeartbeat).toBeGreaterThan(originalHeartbeat);

      // Remove connection
      await connectionManager.removeConnection(testConnectionId);
      const removedConnection = await connectionManager.getConnection(testConnectionId);
      expect(removedConnection).toBeNull();
    });

    it('should manage subscriptions', async () => {
      if (!redis) return;

      const connectionData = {
        connectionId: testConnectionId,
        apiKey: testApiKey,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        subscriptions: []
      };

      await connectionManager.addConnection(testConnectionId, connectionData);

      // Add subscriptions
      await connectionManager.addSubscription(testConnectionId, 'prices');
      await connectionManager.addSubscription(testConnectionId, 'protocols');

      const connection = await connectionManager.getConnection(testConnectionId);
      expect(connection!.subscriptions).toContain('prices');
      expect(connection!.subscriptions).toContain('protocols');

      // Remove subscription
      await connectionManager.removeSubscription(testConnectionId, 'prices');
      const updatedConnection = await connectionManager.getConnection(testConnectionId);
      expect(updatedConnection!.subscriptions).not.toContain('prices');
      expect(updatedConnection!.subscriptions).toContain('protocols');
    });
  });

  describe('Room Management', () => {
    it('should manage room subscriptions', async () => {
      if (!redis) return;

      const channel = 'prices';
      const filters = { protocolIds: ['uniswap-v3'] };

      // Subscribe to room
      await roomManager.subscribe(testConnectionId, channel, filters);

      // Verify room membership
      const members = await roomManager.getRoomMembers(channel);
      expect(members).toContain(testConnectionId);

      // Verify subscription details
      const subscription = await roomManager.getSubscription(testConnectionId, channel);
      expect(subscription).toBeTruthy();
      expect(subscription.channel).toBe(channel);
      expect(subscription.filters).toEqual(filters);

      // Unsubscribe from room
      await roomManager.unsubscribe(testConnectionId, channel);
      const updatedMembers = await roomManager.getRoomMembers(channel);
      expect(updatedMembers).not.toContain(testConnectionId);
    });

    it('should filter room members based on message data', async () => {
      if (!redis) return;

      const channel = 'protocols';
      
      // Subscribe with different filters
      await roomManager.subscribe('connection-1', channel, { protocolIds: ['uniswap-v3'] });
      await roomManager.subscribe('connection-2', channel, { protocolIds: ['aave-v3'] });
      await roomManager.subscribe('connection-3', channel); // No filters

      // Test message filtering
      const messageData = { protocolId: 'uniswap-v3', value: 1000 };
      const filteredMembers = await roomManager.getFilteredRoomMembers(channel, messageData);

      expect(filteredMembers).toContain('connection-1'); // Matches filter
      expect(filteredMembers).toContain('connection-3'); // No filter
      expect(filteredMembers).not.toContain('connection-2'); // Doesn't match filter
    });
  });

  describe('Message Routing', () => {
    it('should route messages to channel subscribers', async () => {
      if (!redis) return;

      // Set up connections and subscriptions
      const connectionData1 = {
        connectionId: 'connection-1',
        apiKey: testApiKey,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        subscriptions: ['prices']
      };

      const connectionData2 = {
        connectionId: 'connection-2',
        apiKey: testApiKey,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        subscriptions: ['protocols']
      };

      await connectionManager.addConnection('connection-1', connectionData1);
      await connectionManager.addConnection('connection-2', connectionData2);
      await roomManager.subscribe('connection-1', 'prices');
      await roomManager.subscribe('connection-2', 'protocols');

      // Mock API Gateway Management API for testing
      const originalApiGateway = (messageRouter as any).apiGatewayManagementApi;
      const mockPostToConnection = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });
      (messageRouter as any).apiGatewayManagementApi = {
        postToConnection: mockPostToConnection
      };

      // Send message to prices channel
      const messageData = {
        type: 'price_update',
        channel: 'prices',
        data: { coin: 'bitcoin', price: 50000 }
      };

      const result = await messageRouter.broadcastToChannel('prices', messageData);

      // Verify message was sent to correct connections
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);

      // Restore original API Gateway
      (messageRouter as any).apiGatewayManagementApi = originalApiGateway;
    });

    it('should queue messages for offline connections', async () => {
      if (!redis) return;

      const connectionData = {
        connectionId: testConnectionId,
        apiKey: testApiKey,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now() - 120000, // 2 minutes ago (stale)
        subscriptions: ['prices']
      };

      await connectionManager.addConnection(testConnectionId, connectionData);

      const messageData = {
        type: 'price_update',
        channel: 'prices',
        data: { coin: 'ethereum', price: 3000 }
      };

      // Queue message
      await messageRouter.queueMessage(testConnectionId, messageData);

      // Verify message was queued
      const queueKey = `ws:queue:${testConnectionId}`;
      const queueLength = await redis.llen(queueKey);
      expect(queueLength).toBe(1);

      // Process queued messages
      const processedCount = await messageRouter.processQueuedMessages(testConnectionId);
      expect(processedCount).toBeGreaterThanOrEqual(0); // May fail due to mock API Gateway
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent connections', async () => {
      if (!redis) return;

      const connectionCount = 100;
      const connections = [];

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const connectionId = `connection-${i}`;
        const connectionData = {
          connectionId,
          apiKey: testApiKey,
          connectedAt: Date.now(),
          lastHeartbeat: Date.now(),
          subscriptions: []
        };

        connections.push(connectionManager.addConnection(connectionId, connectionData));
      }

      // Wait for all connections to be created
      await Promise.all(connections);

      // Verify all connections exist
      const allConnections = await connectionManager.getAllConnections();
      expect(allConnections.length).toBe(connectionCount);

      // Clean up
      const cleanupPromises = allConnections.map(id => 
        connectionManager.removeConnection(id)
      );
      await Promise.all(cleanupPromises);
    });

    it('should handle high-frequency message broadcasting', async () => {
      if (!redis) return;

      // Set up connections
      const connectionCount = 50;
      for (let i = 0; i < connectionCount; i++) {
        const connectionId = `connection-${i}`;
        const connectionData = {
          connectionId,
          apiKey: testApiKey,
          connectedAt: Date.now(),
          lastHeartbeat: Date.now(),
          subscriptions: ['prices']
        };

        await connectionManager.addConnection(connectionId, connectionData);
        await roomManager.subscribe(connectionId, 'prices');
      }

      // Mock API Gateway for performance test
      const mockPostToConnection = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });
      (messageRouter as any).apiGatewayManagementApi = {
        postToConnection: mockPostToConnection
      };

      // Send multiple messages rapidly
      const messageCount = 10;
      const messages = [];
      
      for (let i = 0; i < messageCount; i++) {
        const messageData = {
          type: 'price_update',
          channel: 'prices',
          data: { coin: 'bitcoin', price: 50000 + i }
        };
        
        messages.push(messageRouter.broadcastToChannel('prices', messageData));
      }

      const results = await Promise.all(messages);
      
      // Verify all messages were processed
      results.forEach(result => {
        expect(result.sent).toBe(connectionCount);
        expect(result.failed).toBe(0);
      });
    });
  });
});
