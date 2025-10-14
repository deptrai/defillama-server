import { RoomManager } from '../services/RoomManager';

// Mock Redis client
const mockRedis = {
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  hset: jest.fn(),
  hgetall: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  scard: jest.fn(),
  sismember: jest.fn()
};

jest.mock('../utils/redis', () => ({
  getRedisClient: jest.fn(() => mockRedis)
}));

describe('RoomManager - Simple Tests', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
    jest.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should subscribe connection to room', async () => {
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await roomManager.subscribe('conn123', 'prices');

      expect(mockRedis.sadd).toHaveBeenCalled();
      expect(mockRedis.hset).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalled();
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

      expect(mockRedis.srem).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('getRoomMembers', () => {
    it('should return room members', async () => {
      const members = ['conn1', 'conn2', 'conn3'];
      mockRedis.smembers.mockResolvedValue(members);

      const result = await roomManager.getRoomMembers('prices');

      expect(result).toEqual(members);
    });

    it('should return empty array for non-existent room', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const result = await roomManager.getRoomMembers('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getFilteredMembers', () => {
    it('should return all members when no filters', async () => {
      mockRedis.smembers.mockResolvedValue(['conn1', 'conn2']);
      mockRedis.hgetall
        .mockResolvedValueOnce({
          connectionId: 'conn1',
          channel: 'prices',
          subscribedAt: '1234567890'
        })
        .mockResolvedValueOnce({
          connectionId: 'conn2',
          channel: 'prices',
          subscribedAt: '1234567890'
        });

      const message = {
        type: 'price_update',
        data: { price: 2500 }
      };

      const result = await roomManager.getFilteredMembers('prices', message);

      expect(result).toEqual(['conn1', 'conn2']);
    });

    it('should filter by protocol ID', async () => {
      mockRedis.smembers.mockResolvedValue(['conn1', 'conn2']);
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
        });

      const message = {
        type: 'price_update',
        data: { protocolId: 'uniswap-v3', price: 2500 }
      };

      const result = await roomManager.getFilteredMembers('prices', message);

      expect(result).toEqual(['conn1']);
    });
  });

  describe('cleanupConnection', () => {
    it('should clean up connection subscriptions', async () => {
      mockRedis.smembers.mockResolvedValue(['prices', 'tvl']);
      mockRedis.sismember.mockResolvedValue(1);
      mockRedis.srem.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);
      mockRedis.scard.mockResolvedValue(0);

      await roomManager.cleanupConnection('conn123');

      expect(mockRedis.sismember).toHaveBeenCalledTimes(2);
      expect(mockRedis.srem).toHaveBeenCalled();
    });
  });
});
