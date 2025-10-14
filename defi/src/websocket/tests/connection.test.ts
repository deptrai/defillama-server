import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { connectHandler } from '../handlers/connection';
import { ConnectionManager } from '../services/ConnectionManager';
import { RoomManager } from '../services/RoomManager';
import { checkApiKey } from '../../api-keys/checkApiKey';

// Mock dependencies
jest.mock('../services/ConnectionManager');
jest.mock('../services/RoomManager');
jest.mock('../../api-keys/checkApiKey');
jest.mock('../utils/redis');

const mockConnectionManager = new ConnectionManager() as jest.Mocked<ConnectionManager>;
const mockRoomManager = new RoomManager() as jest.Mocked<RoomManager>;
const mockCheckApiKey = checkApiKey as jest.MockedFunction<typeof checkApiKey>;

describe('WebSocket Connection Handler', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;
  let mockContext: Partial<Context>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContext = {
      requestId: 'test-request-id',
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'test-arn',
      memoryLimitInMB: '128',
      awsRequestId: 'test-aws-request-id',
      logGroupName: 'test-log-group',
      logStreamName: 'test-log-stream',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
      callbackWaitsForEmptyEventLoop: true
    };

    mockEvent = {
      requestContext: {
        connectionId: 'test-connection-id',
        eventType: 'CONNECT',
        requestId: 'test-request-id',
        stage: 'test',
        requestTimeEpoch: Date.now(),
        identity: {
          sourceIp: '127.0.0.1'
        }
      } as any,
      headers: {},
      queryStringParameters: {}
    };
  });

  describe('CONNECT event', () => {
    it('should successfully establish connection with valid API key', async () => {
      // Arrange
      mockEvent.queryStringParameters = { apiKey: 'valid-api-key' };
      mockCheckApiKey.mockResolvedValue(true);
      mockConnectionManager.addConnection.mockResolvedValue();

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockCheckApiKey).toHaveBeenCalledWith('valid-api-key');
      expect(mockConnectionManager.addConnection).toHaveBeenCalledWith(
        'test-connection-id',
        expect.objectContaining({
          connectionId: 'test-connection-id',
          apiKey: 'valid-api-key',
          subscriptions: []
        })
      );
    });

    it('should reject connection without API key', async () => {
      // Arrange
      mockEvent.queryStringParameters = {};

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({ error: 'API key required' });
      expect(mockConnectionManager.addConnection).not.toHaveBeenCalled();
    });

    it('should reject connection with invalid API key', async () => {
      // Arrange
      mockEvent.queryStringParameters = { apiKey: 'invalid-api-key' };
      mockCheckApiKey.mockResolvedValue(false);

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({ error: 'Invalid API key' });
      expect(mockConnectionManager.addConnection).not.toHaveBeenCalled();
    });

    it('should handle API key from Authorization header', async () => {
      // Arrange
      mockEvent.headers = { 'Authorization': 'Bearer valid-api-key' };
      mockCheckApiKey.mockResolvedValue(true);
      mockConnectionManager.addConnection.mockResolvedValue();

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockCheckApiKey).toHaveBeenCalledWith('valid-api-key');
    });
  });

  describe('DISCONNECT event', () => {
    beforeEach(() => {
      mockEvent.requestContext!.eventType = 'DISCONNECT';
    });

    it('should successfully handle disconnection', async () => {
      // Arrange
      mockConnectionManager.getConnection.mockResolvedValue({
        connectionId: 'test-connection-id',
        apiKey: 'test-api-key',
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        subscriptions: ['prices', 'protocols']
      });
      mockRoomManager.unsubscribe.mockResolvedValue();
      mockConnectionManager.removeConnection.mockResolvedValue();

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockRoomManager.unsubscribe).toHaveBeenCalledTimes(2);
      expect(mockRoomManager.unsubscribe).toHaveBeenCalledWith('test-connection-id', 'prices');
      expect(mockRoomManager.unsubscribe).toHaveBeenCalledWith('test-connection-id', 'protocols');
      expect(mockConnectionManager.removeConnection).toHaveBeenCalledWith('test-connection-id');
    });

    it('should handle disconnection when connection not found', async () => {
      // Arrange
      mockConnectionManager.getConnection.mockResolvedValue(null);
      mockConnectionManager.removeConnection.mockResolvedValue();

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockRoomManager.unsubscribe).not.toHaveBeenCalled();
      expect(mockConnectionManager.removeConnection).toHaveBeenCalledWith('test-connection-id');
    });
  });

  describe('MESSAGE event', () => {
    beforeEach(() => {
      mockEvent.requestContext!.eventType = 'MESSAGE';
      mockConnectionManager.updateHeartbeat.mockResolvedValue();
    });

    it('should handle ping message', async () => {
      // Arrange
      mockEvent.body = JSON.stringify({ type: 'ping' });

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockConnectionManager.updateHeartbeat).toHaveBeenCalledWith('test-connection-id');
    });

    it('should handle subscribe message', async () => {
      // Arrange
      mockEvent.body = JSON.stringify({
        type: 'subscribe',
        channels: ['prices', 'protocols'],
        filters: { protocolIds: ['uniswap-v3'] }
      });
      mockRoomManager.subscribe.mockResolvedValue();
      mockConnectionManager.addSubscription.mockResolvedValue();

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockRoomManager.subscribe).toHaveBeenCalledTimes(2);
      expect(mockRoomManager.subscribe).toHaveBeenCalledWith(
        'test-connection-id',
        'prices',
        { protocolIds: ['uniswap-v3'] }
      );
      expect(mockConnectionManager.addSubscription).toHaveBeenCalledTimes(2);
    });

    it('should handle unsubscribe message', async () => {
      // Arrange
      mockEvent.body = JSON.stringify({
        type: 'unsubscribe',
        channels: ['prices']
      });
      mockRoomManager.unsubscribe.mockResolvedValue();
      mockConnectionManager.removeSubscription.mockResolvedValue();

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockRoomManager.unsubscribe).toHaveBeenCalledWith('test-connection-id', 'prices');
      expect(mockConnectionManager.removeSubscription).toHaveBeenCalledWith('test-connection-id', 'prices');
    });

    it('should reject message without body', async () => {
      // Arrange
      mockEvent.body = null;

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ error: 'Message body required' });
    });

    it('should reject unknown message type', async () => {
      // Arrange
      mockEvent.body = JSON.stringify({ type: 'unknown' });

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ error: 'Unknown message type' });
    });
  });

  describe('Error handling', () => {
    it('should handle unknown event type', async () => {
      // Arrange
      mockEvent.requestContext!.eventType = 'UNKNOWN' as any;

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ error: 'Unknown event type' });
    });

    it('should handle connection manager errors', async () => {
      // Arrange
      mockEvent.queryStringParameters = { apiKey: 'valid-api-key' };
      mockCheckApiKey.mockResolvedValue(true);
      mockConnectionManager.addConnection.mockRejectedValue(new Error('Redis connection failed'));

      // Act
      const result = await connectHandler(mockEvent as APIGatewayProxyEvent, mockContext as Context, jest.fn());

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({ error: 'Connection failed' });
    });
  });
});
