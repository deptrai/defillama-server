import { RoomManager } from '../services/RoomManager';

// Mock Redis client
const mockRedis = {
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  hset: jest.fn(),
  hget: jest.fn(),
  hgetall: jest.fn(),
  hdel: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  scard: jest.fn(),
  sismember: jest.fn()
};

jest.mock('../utils/redis', () => ({
  getRedisClient: jest.fn(() => mockRedis)
}));

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
    jest.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should subscribe connection to room without filters', async () => {
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await roomManager.subscribe('conn123', 'prices');

      expect(mockRedis.sadd).toHaveBeenCalledWith('ws:room:prices', 'conn123');
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'ws:sub:conn123:prices',
        expect.objectContaining({
          connectionId: 'conn123',
          channel: 'prices'
        })
      );
    });

    it('should subscribe connection to room with filters', async () => {
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const filters = {
        protocolIds: ['uniswap-v3'],
        minValue: 1000
      };

      await roomManager.subscribe('conn123', 'prices', filters);

      expect(mockRedis.sadd).toHaveBeenCalledWith('ws:room:prices', 'conn123');
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'ws:sub:conn123:prices',
        expect.objectContaining({
          connectionId: 'conn123',
          channel: 'prices',
          filters: JSON.stringify(filters)
        })
      );
    });

    it('should handle subscription errors', async () => {
      mockRedis.sadd.mockRejectedValue(new Error('Redis error'));

      await expect(
        roomManager.subscribe('conn123', 'prices')
      ).rejects.toThrow('Redis error');
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe connection from room', async () => {
      mockRedis.srem.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);
      mockRedis.scard.mockResolvedValue(0);

      await roomManager.unsubscribe('conn123', 'prices');

      expect(mockRedis.srem).toHaveBeenCalledWith('ws:room:prices', 'conn123');
      expect(mockRedis.del).toHaveBeenCalledWith('ws:sub:conn123:prices');
      expect(mockRedis.scard).toHaveBeenCalledWith('ws:room:prices');
    });

    it('should handle unsubscription errors', async () => {
      mockRedis.srem.mockRejectedValue(new Error('Redis error'));

      await expect(
        roomManager.unsubscribe('conn123', 'prices')
      ).rejects.toThrow('Redis error');
    });
  });

  describe('getRoomMembers', () => {
    it('should return room members', async () => {
      const members = ['conn1', 'conn2', 'conn3'];
      mockRedis.smembers.mockResolvedValue(members);

      const result = await roomManager.getRoomMembers('prices');

      expect(result).toEqual(members);
      expect(mockRedis.smembers).toHaveBeenCalledWith('ws:room:prices');
    });

    it('should return empty array for non-existent room', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const result = await roomManager.getRoomMembers('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle Redis errors', async () => {
      mockRedis.smembers.mockRejectedValue(new Error('Redis error'));

      const result = await roomManager.getRoomMembers('prices');

      expect(result).toEqual([]);
    });
  });

  describe('getConnectionSubscriptions', () => {
    it('should return connection subscriptions with filters', async () => {
      mockRedis.smembers.mockResolvedValue(['prices', 'tvl']);
      mockRedis.hgetall
        .mockResolvedValueOnce({
          connectionId: 'conn123',
          channel: 'prices',
          filters: JSON.stringify({ protocolIds: ['uniswap-v3'] }),
          subscribedAt: '1234567890'
        })
        .mockResolvedValueOnce({
          connectionId: 'conn123',
          channel: 'tvl',
          filters: JSON.stringify({ minValue: 1000 }),
          subscribedAt: '1234567890'
        });

      const result = await roomManager.getConnectionSubscriptions('conn123');

      expect(result).toEqual({
        prices: { protocolIds: ['uniswap-v3'] },
        tvl: { minValue: 1000 }
      });
    });

    it('should return empty object for connection with no subscriptions', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const result = await roomManager.getConnectionSubscriptions('conn123');

      expect(result).toEqual({});
    });
  });

  describe('getFilteredMembers', () => {
    it('should return members matching protocol filter', async () => {
      const allMembers = ['conn1', 'conn2', 'conn3'];
      mockRedis.smembers.mockResolvedValue(allMembers);

      // Mock subscription filters
      mockRedis.hgetall
        .mockResolvedValueOnce({
          connectionId: 'conn1',
          channel: 'prices',
          filters: JSON.stringify({ protocolIds: ['uniswap-v3'] }),
          subscribedAt: '1234567890'
        })
        .mockResolvedValueOnce({
          connectionId: 'conn2',
          channel: 'prices',
          filters: JSON.stringify({ protocolIds: ['compound'] }),
          subscribedAt: '1234567890'
        })
        .mockResolvedValueOnce({
          connectionId: 'conn3',
          channel: 'prices',
          filters: JSON.stringify({ protocolIds: ['uniswap-v3'] }),
          subscribedAt: '1234567890'
        });

      const message = {
        type: 'price_update',
        data: { protocolId: 'uniswap-v3' }
      };

      const result = await roomManager.getFilteredMembers('prices', message);

      expect(result).toEqual(['conn1', 'conn3']);
    });

    it('should return members matching value filter', async () => {
      const allMembers = ['conn1', 'conn2'];
      mockRedis.smembers.mockResolvedValue(allMembers);

      mockRedis.hget
        .mockResolvedValueOnce(JSON.stringify({ minValue: 1000 }))  // conn1
        .mockResolvedValueOnce(JSON.stringify({ minValue: 5000 })); // conn2

      const message = {
        type: 'price_update',
        data: { price: 2500 }
      };

      const result = await roomManager.getFilteredMembers('prices', message);

      expect(result).toEqual(['conn1']); // Only conn1 has minValue <= 2500
    });

    it('should return all members when no filters match', async () => {
      const allMembers = ['conn1', 'conn2'];
      mockRedis.smembers.mockResolvedValue(allMembers);

      mockRedis.hget.mockResolvedValue(JSON.stringify({})); // No filters

      const message = {
        type: 'price_update',
        data: { price: 2500 }
      };

      const result = await roomManager.getFilteredMembers('prices', message);

      expect(result).toEqual(allMembers);
    });

    it('should handle filter parsing errors gracefully', async () => {
      const allMembers = ['conn1'];
      mockRedis.smembers.mockResolvedValue(allMembers);

      mockRedis.hget.mockResolvedValue('invalid-json'); // Invalid JSON

      const message = {
        type: 'price_update',
        data: { price: 2500 }
      };

      const result = await roomManager.getFilteredMembers('prices', message);

      expect(result).toEqual(['conn1']); // Should include connection despite filter error
    });
  });

  describe('cleanupConnection', () => {
    it('should remove connection from all rooms', async () => {
      // Mock getting subscription keys
      jest.spyOn(roomManager as any, 'getAllSubscriptionKeys')
        .mockResolvedValue(['prices', 'tvl', 'alerts']);

      mockRedis.srem.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      await roomManager.cleanupConnection('conn123');

      expect(mockRedis.srem).toHaveBeenCalledTimes(3);
      expect(mockRedis.srem).toHaveBeenCalledWith('ws:room:prices', 'conn123');
      expect(mockRedis.srem).toHaveBeenCalledWith('ws:room:tvl', 'conn123');
      expect(mockRedis.srem).toHaveBeenCalledWith('ws:room:alerts', 'conn123');
      expect(mockRedis.del).toHaveBeenCalledWith('ws:connection:conn123:subscriptions');
    });

    it('should handle cleanup errors gracefully', async () => {
      jest.spyOn(roomManager as any, 'getAllSubscriptionKeys')
        .mockResolvedValue(['prices']);

      mockRedis.srem.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(roomManager.cleanupConnection('conn123')).resolves.toBeUndefined();
    });
  });
});
